import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { templates } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const templateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: z.enum(['email', 'linkedin', 'multi']),
  category: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const templateRoutes: FastifyPluginAsync = async (app) => {
  // List templates
  app.get('/', {
    preHandler: [authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { channel, category } = request.query as any;
    
    let whereConditions = eq(templates.organizationId, organizationId);
    
    if (channel) {
      whereConditions = and(whereConditions, eq(templates.channel, channel)) as any;
    }
    
    if (category) {
      whereConditions = and(whereConditions, eq(templates.category, category)) as any;
    }
    
    const allTemplates = await db.query.templates.findMany({
      where: whereConditions,
      orderBy: [desc(templates.createdAt)],
    });
    
    return allTemplates;
  });

  // Get single template
  app.get('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const template = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, id),
        eq(templates.organizationId, organizationId)
      ),
    });
    
    if (!template) {
      throw { statusCode: 404, message: 'Template not found' };
    }
    
    return template;
  });

  // Create template
  app.post('/', {
    preHandler: [authenticate],
  }, async (request) => {
    const { userId, organizationId } = request.user as any;
    const data = templateSchema.parse(request.body);
    
    // Extract variables from body
    const variableMatches = data.body.match(/\{\{(\w+)\}\}/g) || [];
    const variables = [...new Set(variableMatches.map((v) => v.replace(/\{\{|\}\}/g, '')))];
    
    const [template] = await db.insert(templates).values({
      ...data,
      variables,
      organizationId,
      createdById: userId,
    }).returning();
    
    return template;
  });

  // Update template
  app.patch('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = templateSchema.partial().parse(request.body);
    
    // Re-extract variables if body changed
    let variables;
    if (data.body) {
      const variableMatches = data.body.match(/\{\{(\w+)\}\}/g) || [];
      variables = [...new Set(variableMatches.map((v) => v.replace(/\{\{|\}\}/g, '')))];
    }
    
    const [updated] = await db.update(templates)
      .set({ ...data, variables, updatedAt: new Date() })
      .where(and(
        eq(templates.id, id),
        eq(templates.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      throw { statusCode: 404, message: 'Template not found' };
    }
    
    return updated;
  });

  // Delete template
  app.delete('/:id', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.delete(templates)
      .where(and(
        eq(templates.id, id),
        eq(templates.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Duplicate template
  app.post('/:id/duplicate', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { userId, organizationId } = request.user as any;
    
    const original = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, id),
        eq(templates.organizationId, organizationId)
      ),
    });
    
    if (!original) {
      throw { statusCode: 404, message: 'Template not found' };
    }
    
    const [copy] = await db.insert(templates).values({
      name: `${original.name} (copy)`,
      description: original.description,
      channel: original.channel,
      category: original.category,
      subject: original.subject,
      body: original.body,
      variables: original.variables,
      organizationId,
      createdById: userId,
    }).returning();
    
    return copy;
  });

  // Preview template with variables
  app.post('/:id/preview', {
    preHandler: [authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { variables = {} } = z.object({
      variables: z.record(z.string()).optional(),
    }).parse(request.body);
    
    const template = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, id),
        eq(templates.organizationId, organizationId)
      ),
    });
    
    if (!template) {
      throw { statusCode: 404, message: 'Template not found' };
    }
    
    // Replace variables
    let previewSubject = template.subject || '';
    let previewBody = template.body;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    }
    
    // Highlight unreplaced variables
    previewSubject = previewSubject.replace(/\{\{(\w+)\}\}/g, '<span style="color:red">{{$1}}</span>');
    previewBody = previewBody.replace(/\{\{(\w+)\}\}/g, '<span style="color:red">{{$1}}</span>');
    
    return {
      subject: previewSubject,
      body: previewBody,
    };
  });
};

export default templateRoutes;