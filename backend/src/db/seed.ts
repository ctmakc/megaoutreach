import 'dotenv/config';
import { db } from './index.js';
import { organizations, users, templates } from './schema.js';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create default organization
  const [org] = await db.insert(organizations).values({
    name: 'My Company',
    slug: 'my-company',
    plan: 'free',
    settings: {
      timezone: 'Europe/Moscow',
      dailyEmailLimit: 100,
      dailyLinkedinLimit: 50,
    },
  }).returning();

  console.log('✅ Created organization:', org.name);

  // Create default email templates
  const defaultTemplates = [
    {
      organizationId: org.id,
      name: 'Cold Outreach - Вендинг',
      description: 'Первое письмо для B2B вендинг продаж',
      channel: 'email' as const,
      category: 'cold_outreach',
      subject: '{{firstName}}, вендинг-автоматы для {{company}}',
      body: `Добрый день, {{firstName}}!

Меня зовут {{senderName}}, я представляю компанию {{senderCompany}}.

Заметил, что {{company}} работает в сфере {{industry}}. Многие компании вашего профиля успешно используют вендинг-автоматы для:

• Дополнительного дохода без затрат на персонал
• Повышения лояльности сотрудников и клиентов  
• Автоматизации продаж 24/7

Мы устанавливаем автоматы бесплатно и берём на себя всё обслуживание. Вам остаётся только выделить 1 кв.м. площади.

Можем коротко обсудить, подойдёт ли это для {{company}}?

С уважением,
{{senderName}}
{{senderPhone}}`,
      variables: ['firstName', 'company', 'industry', 'senderName', 'senderCompany', 'senderPhone'],
    },
    {
      organizationId: org.id,
      name: 'Follow-up #1',
      description: 'Первый follow-up через 3 дня',
      channel: 'email' as const,
      category: 'follow_up',
      subject: 'Re: {{firstName}}, вендинг-автоматы для {{company}}',
      body: `{{firstName}}, добрый день!

Писал вам ранее про установку вендинг-автоматов в {{company}}.

Понимаю, что много писем приходит, поэтому кратко:

→ Установка бесплатная
→ Обслуживание на нас
→ Вы получаете % от продаж или фикс

Если интересно — ответьте "да", подберу варианты под ваш офис.

{{senderName}}`,
      variables: ['firstName', 'company', 'senderName'],
    },
    {
      organizationId: org.id,
      name: 'Follow-up #2 - Breakup',
      description: 'Финальное письмо',
      channel: 'email' as const,
      category: 'follow_up',
      subject: 'Закрываю вопрос по {{company}}',
      body: `{{firstName}},

Похоже, сейчас не лучшее время для обсуждения вендинга.

Закрываю ваш контакт в базе. Если в будущем вопрос станет актуальным — просто ответьте на это письмо.

Удачи!
{{senderName}}`,
      variables: ['firstName', 'company', 'senderName'],
    },
    {
      organizationId: org.id,
      name: 'LinkedIn - Connection Request',
      description: 'Заявка на подключение в LinkedIn',
      channel: 'linkedin' as const,
      category: 'cold_outreach',
      subject: '',
      body: `Здравствуйте, {{firstName}}! Вижу, что вы в {{company}}. Работаю в сфере автоматизации продаж через вендинг. Буду рад обменяться опытом.`,
      variables: ['firstName', 'company'],
    },
    {
      organizationId: org.id,
      name: 'LinkedIn - First Message',
      description: 'Первое сообщение после коннекта',
      channel: 'linkedin' as const,
      category: 'cold_outreach',
      subject: '',
      body: `{{firstName}}, спасибо за контакт!

Коротко о себе — помогаю компаниям устанавливать вендинг-автоматы без инвестиций.

Если для {{company}} это может быть интересно — расскажу детали за 5 минут. Как смотрите?`,
      variables: ['firstName', 'company'],
    },
  ];

  await db.insert(templates).values(defaultTemplates);
  console.log('✅ Created', defaultTemplates.length, 'templates');

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Organization ID:', org.id);
  console.log('Organization Slug:', org.slug);

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});