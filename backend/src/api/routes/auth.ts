// @ts-nocheck
import { FastifyPluginAsync } from 'fastify';
import { google } from 'googleapis';
import { db } from '../../db/index.js';
import { users, organizations } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
);

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Google OAuth - Initiate
  fastify.get('/google', async (request, reply) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      prompt: 'consent',
    });

    return reply.redirect(url);
  });

  // Google OAuth - Callback
  fastify.get('/google/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };

    if (!code) {
      return reply.status(400).send({ error: 'No authorization code provided' });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile.email) {
        return reply.status(400).send({ error: 'Email not provided by Google' });
      }

      // Find or create user
      let [user] = await db.select().from(users).where(eq(users.email, profile.email));

      if (!user) {
        // Create organization for new user
        const orgSlug = profile.email.split('@')[0] + '-org';
        const [org] = await db
          .insert(organizations)
          .values({
            name: `${profile.name}'s Organization`,
            slug: orgSlug,
            plan: 'free',
          })
          .returning();

        // Create user
        [user] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name || undefined,
            avatarUrl: profile.picture || undefined,
            googleId: profile.id,
            googleRefreshToken: tokens.refresh_token || undefined,
            organizationId: org.id,
            role: 'owner',
            lastLoginAt: new Date(),
          })
          .returning();
      } else {
        // Update existing user
        [user] = await db
          .update(users)
          .set({
            name: profile.name || user.name,
            avatarUrl: profile.picture || user.avatarUrl,
            googleId: profile.id,
            googleRefreshToken: tokens.refresh_token || user.googleRefreshToken,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
      }

      // Generate JWT
      const token = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
        },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      fastify.log.error('Google OAuth error:', error);
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user.userId;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        organizationId: users.organizationId,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return user;
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { message: 'Logged out successfully' };
  });
};

export default authRoutes;
