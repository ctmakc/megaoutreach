import { FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { contacts } from '../../db/schema.js';
import { eq, and, desc, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';

const contactSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  companyWebsite: z.string().optional(),
  linkedinUrl: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

const contactRoutes: FastifyPluginAsync = async (app) => {
  // List contacts
  app.get('/', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const {
      page = 1,
      limit = 50,
      search,
      status,
      tags,
      company,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.query as any;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = eq(contacts.organizationId, organizationId);
    
    // Build search conditions
    if (search) {
      whereConditions = and(
        whereConditions,
        or(
          like(contacts.email, `%${search}%`),
          like(contacts.firstName, `%${search}%`),
          like(contacts.lastName, `%${search}%`),
          like(contacts.company, `%${search}%`)
        )
      ) as any;
    }
    
    if (status) {
      whereConditions = and(whereConditions, eq(contacts.status, status)) as any;
    }
    
    if (company) {
      whereConditions = and(whereConditions, like(contacts.company, `%${company}%`)) as any;
    }
    
    const [contactsList, countResult] = await Promise.all([
      db.query.contacts.findMany({
        where: whereConditions,
        limit,
        offset,
        orderBy: sortOrder === 'desc' ? [desc(contacts[sortBy as keyof typeof contacts])] : undefined,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(whereConditions),
    ]);
    
    return {
      data: contactsList,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].count),
        pages: Math.ceil(Number(countResult[0].count) / limit),
      },
    };
  });

  // Get single contact
  app.get('/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId)
      ),
    });
    
    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }
    
    return contact;
  });

  // Create contact
  app.post('/', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const data = contactSchema.parse(request.body);
    
    const [contact] = await db.insert(contacts).values({
      ...data,
      organizationId,
    }).returning();
    
    return contact;
  });

  // Update contact
  app.patch('/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const data = contactSchema.partial().parse(request.body);
    
    const [updated] = await db.update(contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      throw { statusCode: 404, message: 'Contact not found' };
    }
    
    return updated;
  });

  // Delete contact
  app.delete('/:id', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.delete(contacts)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId)
      ));
    
    return { success: true };
  });

  // Bulk delete
  app.post('/bulk-delete', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(request.body);
    
    await db.delete(contacts)
      .where(and(
        eq(contacts.organizationId, organizationId),
        sql`${contacts.id} = ANY(${ids})`
      ));
    
    return { deleted: ids.length };
  });

  // Import from CSV
  app.post('/import', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { organizationId } = request.user as any;
    const { csv, mapping } = z.object({
      csv: z.string(),
      mapping: z.record(z.string()),
    }).parse(request.body);
    
    // Parse CSV
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Map fields
    const contactsToInsert = records.map((record: any) => {
      const contact: any = { organizationId, source: 'csv_import' };
      
      for (const [csvField, dbField] of Object.entries(mapping)) {
        if (record[csvField] && dbField) {
          contact[dbField as string] = record[csvField];
        }
      }
      
      return contact;
    }).filter((c: any) => c.email || c.linkedinUrl); // Must have at least email or linkedin
    
    if (contactsToInsert.length === 0) {
      throw { statusCode: 400, message: 'No valid contacts found in CSV' };
    }
    
    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < contactsToInsert.length; i += batchSize) {
      const batch = contactsToInsert.slice(i, i + batchSize);
      await db.insert(contacts).values(batch).onConflictDoNothing();
      inserted += batch.length;
    }
    
    return { imported: inserted, total: records.length };
  });

  // Update tags
  app.patch('/:id/tags', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    const { tags: newTags, action } = z.object({
      tags: z.array(z.string()),
      action: z.enum(['add', 'remove', 'set']),
    }).parse(request.body);
    
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId)
      ),
    });
    
    if (!contact) {
      throw { statusCode: 404, message: 'Contact not found' };
    }
    
    let updatedTags: string[];
    const currentTags = (contact.tags as string[]) || [];
    
    switch (action) {
      case 'add':
        updatedTags = [...new Set([...currentTags, ...newTags])];
        break;
      case 'remove':
        updatedTags = currentTags.filter((t) => !newTags.includes(t));
        break;
      case 'set':
        updatedTags = newTags;
        break;
    }
    
    await db.update(contacts)
      .set({ tags: updatedTags, updatedAt: new Date() })
      .where(eq(contacts.id, id));
    
    return { tags: updatedTags };
  });

  // Unsubscribe contact
  app.post('/:id/unsubscribe', {
    preHandler: [app.authenticate],
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { organizationId } = request.user as any;
    
    await db.update(contacts)
      .set({
        isUnsubscribed: true,
        unsubscribedAt: new Date(),
        status: 'unsubscribed',
        updatedAt: new Date(),
      })
      .where(and(
        eq(contacts.id, id),
        eq(contacts.organizationId, organizationId)
      ));
    
    return { success: true };
  });
};

export default contactRoutes;