import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateEmailParams {
  context: {
    recipientName?: string;
    recipientCompany?: string;
    recipientTitle?: string;
    recipientIndustry?: string;
    senderName: string;
    senderCompany: string;
    senderTitle?: string;
    product?: string;
    valueProposition?: string;
    cta?: string;
    previousEmails?: Array<{
      subject: string;
      body: string;
      direction: 'inbound' | 'outbound';
    }>;
  };
  style: 'formal' | 'casual' | 'friendly' | 'professional';
  length: 'short' | 'medium' | 'long';
  language: 'ru' | 'en';
  type: 'cold' | 'follow-up' | 'reply' | 'breakup';
  organizationContext?: {
    industry?: string;
    defaultTone?: string;
  };
  temperature?: number;
}

interface GenerateLinkedinParams {
  context: {
    recipientName: string;
    recipientCompany?: string;
    recipientTitle?: string;
    recipientHeadline?: string;
    senderName: string;
    senderCompany: string;
    commonConnections?: number;
    mutualInterests?: string[];
  };
  type: 'connection-note' | 'message' | 'inmail';
  language: 'ru' | 'en';
}

interface AnalyzeReplyParams {
  content: string;
  context?: {
    previousMessages?: Array<{
      content: string;
      direction: 'inbound' | 'outbound';
    }>;
    campaignGoal?: string;
  };
}

interface SequenceStep {
  channel: 'email' | 'linkedin';
  delayDays: number;
  delayHours?: number;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  linkedinMessage?: string;
}

class AIService {
  private defaultModel = 'gpt-4o';
  private claudeModel = 'claude-sonnet-4-20250514';
  
  async generateEmail(params: GenerateEmailParams): Promise<{
    subject: string;
    bodyHtml: string;
    bodyText: string;
  }> {
    const { context, style, length, language, type, temperature = 0.7 } = params;
    
    const lengthGuide = {
      short: '50-100 слов',
      medium: '100-200 слов',
      long: '200-350 слов',
    };
    
    const styleGuide = {
      formal: 'формальный, деловой тон',
      casual: 'неформальный, дружелюбный тон',
      friendly: 'теплый, располагающий тон',
      professional: 'профессиональный, но не сухой тон',
    };
    
    const typeGuide = {
      cold: 'первое холодное письмо потенциальному клиенту',
      'follow-up': 'follow-up письмо после предыдущего контакта',
      reply: 'ответ на входящее сообщение',
      breakup: 'финальное письмо в цепочке (breakup email)',
    };
    
    const systemPrompt = language === 'ru' ? `
Ты — эксперт по написанию B2B email-рассылок с высокой конверсией.

Правила:
1. Пиши на русском языке
2. Используй ${styleGuide[style]}
3. Длина письма: ${lengthGuide[length]}
4. Тип письма: ${typeGuide[type]}
5. Не используй шаблонные фразы типа "Надеюсь это письмо найдет вас в добром здравии"
6. Начинай письмо с чего-то персонализированного или интересного
7. Делай четкий call-to-action в конце
8. Избегай спам-слов: бесплатно, скидка, срочно, уникальное предложение
9. Пиши от первого лица единственного числа
10. Не используй восклицательные знаки чрезмерно

Формат ответа (JSON):
{
  "subject": "Тема письма",
  "bodyHtml": "<p>HTML версия письма</p>",
  "bodyText": "Текстовая версия письма"
}
` : `
You are an expert at writing high-converting B2B emails.

Rules:
1. Write in English
2. Use ${styleGuide[style]} tone
3. Email length: ${lengthGuide[length]}
4. Email type: ${typeGuide[type]}
5. Avoid cliché phrases like "I hope this email finds you well"
6. Start with something personalized or interesting
7. Include a clear call-to-action at the end
8. Avoid spam words: free, discount, urgent, limited offer
9. Write in first person singular
10. Don't overuse exclamation marks

Response format (JSON):
{
  "subject": "Email subject line",
  "bodyHtml": "<p>HTML version of email</p>",
  "bodyText": "Plain text version of email"
}
`;

    const userPrompt = language === 'ru' ? `
Напиши ${typeGuide[type]} со следующими данными:

Получатель:
- Имя: ${context.recipientName || 'не указано'}
- Компания: ${context.recipientCompany || 'не указано'}
- Должность: ${context.recipientTitle || 'не указано'}
${context.recipientIndustry ? `- Индустрия: ${context.recipientIndustry}` : ''}

Отправитель:
- Имя: ${context.senderName}
- Компания: ${context.senderCompany}
${context.senderTitle ? `- Должность: ${context.senderTitle}` : ''}

${context.product ? `Продукт/Услуга: ${context.product}` : ''}
${context.valueProposition ? `Ценностное предложение: ${context.valueProposition}` : ''}
${context.cta ? `Желаемое действие: ${context.cta}` : ''}

${context.previousEmails?.length ? `
Предыдущая переписка:
${context.previousEmails.map(e => `[${e.direction === 'outbound' ? 'Мы' : 'Они'}]: ${e.subject}\n${e.body}`).join('\n\n')}
` : ''}
` : `
Write a ${typeGuide[type]} with the following data:

Recipient:
- Name: ${context.recipientName || 'not specified'}
- Company: ${context.recipientCompany || 'not specified'}
- Title: ${context.recipientTitle || 'not specified'}
${context.recipientIndustry ? `- Industry: ${context.recipientIndustry}` : ''}

Sender:
- Name: ${context.senderName}
- Company: ${context.senderCompany}
${context.senderTitle ? `- Title: ${context.senderTitle}` : ''}

${context.product ? `Product/Service: ${context.product}` : ''}
${context.valueProposition ? `Value proposition: ${context.valueProposition}` : ''}
${context.cta ? `Desired action: ${context.cta}` : ''}

${context.previousEmails?.length ? `
Previous correspondence:
${context.previousEmails.map(e => `[${e.direction === 'outbound' ? 'We' : 'They'}]: ${e.subject}\n${e.body}`).join('\n\n')}
` : ''}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: { type: 'json_object' },
      });
      
      const content = response.choices[0].message.content;
      return JSON.parse(content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to generate email');
      throw error;
    }
  }
  
  async generateLinkedinMessage(params: GenerateLinkedinParams): Promise<{
    message: string;
  }> {
    const { context, type, language } = params;
    
    const maxLength = type === 'connection-note' ? 300 : type === 'message' ? 2000 : 1900;
    
    const systemPrompt = language === 'ru' ? `
Ты — эксперт по написанию эффективных LinkedIn-сообщений.

Правила:
1. Максимальная длина: ${maxLength} символов
2. Пиши естественно, как человек, а не как маркетолог
3. Персонализируй сообщение под получателя
4. Избегай явных продаж в первом сообщении
5. Создай ощущение ценности для получателя
${type === 'connection-note' ? '6. Это короткое сообщение к запросу на подключение - будь кратким и дружелюбным' : ''}

Верни только текст сообщения, без JSON обёртки.
` : `
You are an expert at writing effective LinkedIn messages.

Rules:
1. Maximum length: ${maxLength} characters
2. Write naturally, like a human, not a marketer
3. Personalize the message for the recipient
4. Avoid obvious sales pitch in the first message
5. Create a sense of value for the recipient
${type === 'connection-note' ? '6. This is a short connection request note - be brief and friendly' : ''}

Return only the message text, without JSON wrapper.
`;

    const userPrompt = language === 'ru' ? `
Напиши ${type === 'connection-note' ? 'короткое сообщение к запросу на подключение' : 'LinkedIn сообщение'}:

Получатель:
- Имя: ${context.recipientName}
${context.recipientCompany ? `- Компания: ${context.recipientCompany}` : ''}
${context.recipientTitle ? `- Должность: ${context.recipientTitle}` : ''}
${context.recipientHeadline ? `- Заголовок профиля: ${context.recipientHeadline}` : ''}

Отправитель:
- Имя: ${context.senderName}
- Компания: ${context.senderCompany}

${context.commonConnections ? `Общих контактов: ${context.commonConnections}` : ''}
${context.mutualInterests?.length ? `Общие интересы: ${context.mutualInterests.join(', ')}` : ''}
` : `
Write a ${type === 'connection-note' ? 'short connection request note' : 'LinkedIn message'}:

Recipient:
- Name: ${context.recipientName}
${context.recipientCompany ? `- Company: ${context.recipientCompany}` : ''}
${context.recipientTitle ? `- Title: ${context.recipientTitle}` : ''}
${context.recipientHeadline ? `- Profile headline: ${context.recipientHeadline}` : ''}

Sender:
- Name: ${context.senderName}
- Company: ${context.senderCompany}

${context.commonConnections ? `Common connections: ${context.commonConnections}` : ''}
${context.mutualInterests?.length ? `Mutual interests: ${context.mutualInterests.join(', ')}` : ''}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });
      
      let message = response.choices[0].message.content?.trim() || '';
      
      // Ensure message fits within limit
      if (message.length > maxLength) {
        message = message.substring(0, maxLength - 3) + '...';
      }
      
      return { message };
      
    } catch (error) {
      logger.error({ error }, 'Failed to generate LinkedIn message');
      throw error;
    }
  }
  
  async generateConnectionNote(params: {
    recipientName: string;
    recipientTitle?: string;
    recipientCompany?: string;
    senderName: string;
    senderCompany: string;
    reason?: string;
    language: 'ru' | 'en';
  }): Promise<{ note: string }> {
    const result = await this.generateLinkedinMessage({
      context: {
        recipientName: params.recipientName,
        recipientTitle: params.recipientTitle,
        recipientCompany: params.recipientCompany,
        senderName: params.senderName,
        senderCompany: params.senderCompany,
      },
      type: 'connection-note',
      language: params.language,
    });
    
    return { note: result.message };
  }
  
  async analyzeReply(params: AnalyzeReplyParams): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: 'interested' | 'not-interested' | 'needs-info' | 'meeting' | 'referral' | 'unsubscribe' | 'out-of-office' | 'other';
    confidence: number;
    summary: string;
    suggestedAction: string;
    extractedInfo?: {
      meetingTime?: string;
      referralContact?: string;
      questions?: string[];
    };
  }> {
    const systemPrompt = `
You are an expert at analyzing B2B email and LinkedIn message replies.

Analyze the incoming message and return a JSON object with:
1. sentiment: positive, neutral, or negative
2. intent: interested, not-interested, needs-info, meeting, referral, unsubscribe, out-of-office, or other
3. confidence: 0-1 score for your analysis confidence
4. summary: brief summary of the message in Russian
5. suggestedAction: recommended next action in Russian
6. extractedInfo: any extracted meeting times, referral contacts, or questions

Response format:
{
  "sentiment": "positive",
  "intent": "meeting",
  "confidence": 0.95,
  "summary": "Заинтересован во встрече на следующей неделе",
  "suggestedAction": "Предложить конкретные слоты на следующую неделю",
  "extractedInfo": {
    "meetingTime": "следующая неделя",
    "questions": ["Какова стоимость?"]
  }
}
`;

    const userPrompt = `
Analyze this reply:

${params.content}

${params.context?.previousMessages?.length ? `
Previous messages in thread:
${params.context.previousMessages.map(m => `[${m.direction}]: ${m.content}`).join('\n\n')}
` : ''}

${params.context?.campaignGoal ? `Campaign goal: ${params.context.campaignGoal}` : ''}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to analyze reply');
      throw error;
    }
  }
  
  async suggestReply(params: {
    incomingMessage: string;
    context: {
      previousMessages?: Array<{ content: string; direction: 'inbound' | 'outbound' }>;
      senderName: string;
      senderCompany: string;
      recipientName?: string;
      campaignGoal?: string;
      product?: string;
    };
    tone: 'formal' | 'casual' | 'friendly';
    language: 'ru' | 'en';
  }): Promise<{
    suggestions: Array<{
      subject?: string;
      body: string;
      strategy: string;
    }>;
  }> {
    const systemPrompt = params.language === 'ru' ? `
Ты — эксперт по продажам, помогающий составить ответ на входящее сообщение.

Создай 3 варианта ответа с разными стратегиями:
1. Прямой ответ с движением к цели
2. Эмпатичный ответ с фокусом на потребности клиента
3. Креативный/нестандартный подход

Для каждого варианта укажи:
- body: текст ответа
- strategy: краткое описание стратегии

Формат JSON:
{
  "suggestions": [
    {"body": "...", "strategy": "..."},
    {"body": "...", "strategy": "..."},
    {"body": "...", "strategy": "..."}
  ]
}
` : `
You are a sales expert helping to compose a reply to an incoming message.

Create 3 reply variants with different strategies:
1. Direct response moving towards the goal
2. Empathetic response focusing on client needs
3. Creative/unconventional approach

For each variant provide:
- body: reply text
- strategy: brief strategy description

JSON format:
{
  "suggestions": [
    {"body": "...", "strategy": "..."},
    {"body": "...", "strategy": "..."},
    {"body": "...", "strategy": "..."}
  ]
}
`;

    const userPrompt = `
Incoming message to reply to:
${params.incomingMessage}

Context:
- Sender: ${params.context.senderName} from ${params.context.senderCompany}
${params.context.recipientName ? `- Recipient: ${params.context.recipientName}` : ''}
${params.context.product ? `- Product: ${params.context.product}` : ''}
${params.context.campaignGoal ? `- Goal: ${params.context.campaignGoal}` : ''}

Tone: ${params.tone}

${params.context.previousMessages?.length ? `
Previous messages:
${params.context.previousMessages.map(m => `[${m.direction}]: ${m.content}`).join('\n\n')}
` : ''}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{"suggestions":[]}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to suggest reply');
      throw error;
    }
  }
  
  async improveText(params: {
    text: string;
    type: 'email-subject' | 'email-body' | 'linkedin-message' | 'linkedin-note';
    goal?: string;
    language: 'ru' | 'en';
  }): Promise<{
    improved: string;
    changes: string[];
  }> {
    const typeGuides: Record<string, string> = {
      'email-subject': 'тему email-письма (макс 60 символов)',
      'email-body': 'текст email-письма',
      'linkedin-message': 'LinkedIn сообщение',
      'linkedin-note': 'заметку к запросу на подключение в LinkedIn (макс 300 символов)',
    };
    
    const systemPrompt = params.language === 'ru' ? `
Ты — эксперт по копирайтингу для B2B продаж.

Улучши ${typeGuides[params.type]}.

Правила:
1. Сохрани основной смысл
2. Сделай текст более убедительным
3. Убери лишние слова
4. Добавь персонализацию если возможно
5. Используй активный залог
6. Избегай спам-слов

Верни JSON:
{
  "improved": "улучшенный текст",
  "changes": ["описание изменения 1", "описание изменения 2"]
}
` : `
You are a B2B sales copywriting expert.

Improve the ${typeGuides[params.type]}.

Rules:
1. Keep the main meaning
2. Make the text more persuasive
3. Remove unnecessary words
4. Add personalization if possible
5. Use active voice
6. Avoid spam words

Return JSON:
{
  "improved": "improved text",
  "changes": ["change description 1", "change description 2"]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Text to improve:\n${params.text}\n\n${params.goal ? `Goal: ${params.goal}` : ''}` },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to improve text');
      throw error;
    }
  }
  
  async generateSubjectLines(params: {
    emailBody: string;
    context: {
      recipientName?: string;
      recipientCompany?: string;
      senderCompany: string;
      product?: string;
    };
    count: number;
    style?: 'curiosity' | 'benefit' | 'question' | 'personalized' | 'urgent';
    language: 'ru' | 'en';
  }): Promise<string[]> {
    const systemPrompt = params.language === 'ru' ? `
Ты — эксперт по email-маркетингу.

Создай ${params.count} вариантов тем для email-письма.

Правила:
1. Максимум 60 символов каждая тема
2. Каждая тема должна быть уникальной по подходу
3. Избегай спам-слов (бесплатно, скидка, срочно)
4. Темы должны вызывать желание открыть письмо
5. Не используй CAPS LOCK
${params.style ? `6. Фокусируйся на стиле: ${params.style}` : ''}

Верни JSON массив строк: ["тема 1", "тема 2", ...]
` : `
You are an email marketing expert.

Create ${params.count} subject line variants for an email.

Rules:
1. Maximum 60 characters each
2. Each subject should be unique in approach
3. Avoid spam words (free, discount, urgent)
4. Subjects should make people want to open the email
5. Don't use ALL CAPS
${params.style ? `6. Focus on style: ${params.style}` : ''}

Return a JSON array of strings: ["subject 1", "subject 2", ...]
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Email body:\n${params.emailBody}\n\nRecipient: ${params.context.recipientName || 'Unknown'} at ${params.context.recipientCompany || 'Unknown'}\nSender company: ${params.context.senderCompany}\n${params.context.product ? `Product: ${params.context.product}` : ''}` },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      });
      
      const result = JSON.parse(response.choices[0].message.content || '[]');
      return Array.isArray(result) ? result : result.subjects || [];
      
    } catch (error) {
      logger.error({ error }, 'Failed to generate subject lines');
      throw error;
    }
  }
  
  async scoreEmail(params: {
    subject: string;
    body: string;
    type: 'cold' | 'follow-up' | 'reply';
  }): Promise<{
    overallScore: number;
    scores: {
      clarity: number;
      personalization: number;
      callToAction: number;
      spamRisk: number;
      length: number;
      tone: number;
    };
    suggestions: string[];
  }> {
    const systemPrompt = `
You are an email quality expert. Score the email on a scale of 1-10 for each criterion.

Return JSON:
{
  "overallScore": 7.5,
  "scores": {
    "clarity": 8,
    "personalization": 6,
    "callToAction": 7,
    "spamRisk": 9,
    "length": 8,
    "tone": 7
  },
  "suggestions": [
    "Suggestion for improvement 1 in Russian",
    "Suggestion for improvement 2 in Russian"
  ]
}

Higher spamRisk score means LOWER spam risk (good).
Provide suggestions in Russian.
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Email type: ${params.type}\n\nSubject: ${params.subject}\n\nBody:\n${params.body}` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to score email');
      throw error;
    }
  }
  
  async generateSequence(params: {
    context: {
      targetAudience: string;
      product: string;
      valueProposition: string;
      senderName: string;
      senderCompany: string;
      senderTitle?: string;
      goal: 'meeting' | 'demo' | 'trial' | 'purchase' | 'awareness';
      industry?: string;
    };
    steps: number;
    channels: Array<'email' | 'linkedin'>;
    language: 'ru' | 'en';
  }): Promise<{
    steps: SequenceStep[];
    strategy: string;
  }> {
    const goalDescriptions: Record<string, string> = {
      meeting: 'назначение встречи/звонка',
      demo: 'демонстрация продукта',
      trial: 'бесплатный пробный период',
      purchase: 'покупка',
      awareness: 'повышение узнаваемости',
    };
    
    const systemPrompt = params.language === 'ru' ? `
Ты — эксперт по outbound-продажам и email-маркетингу.

Создай ${params.steps}-шаговую последовательность для достижения цели: ${goalDescriptions[params.context.goal]}.

Доступные каналы: ${params.channels.join(', ')}

Правила:
1. Первый шаг всегда на день 0
2. Между шагами должно быть 2-5 дней
3. Каждый шаг должен добавлять ценность
4. Последний шаг — "breakup" письмо
5. Используй разные углы подхода в каждом письме
6. Если LinkedIn доступен, чередуй каналы

Формат JSON:
{
  "steps": [
    {
      "channel": "email",
      "delayDays": 0,
      "subject": "Тема",
      "bodyHtml": "<p>HTML тело</p>",
      "bodyText": "Текстовое тело"
    },
    {
      "channel": "linkedin",
      "delayDays": 3,
      "linkedinMessage": "Сообщение LinkedIn"
    }
  ],
  "strategy": "Описание общей стратегии последовательности"
}
` : `
You are an outbound sales and email marketing expert.

Create a ${params.steps}-step sequence to achieve the goal: ${goalDescriptions[params.context.goal]}.

Available channels: ${params.channels.join(', ')}

Rules:
1. First step is always on day 0
2. 2-5 days between steps
3. Each step should add value
4. Last step is a "breakup" email
5. Use different angles in each email
6. If LinkedIn is available, alternate channels

JSON format:
{
  "steps": [
    {
      "channel": "email",
      "delayDays": 0,
      "subject": "Subject",
      "bodyHtml": "<p>HTML body</p>",
      "bodyText": "Text body"
    },
    {
      "channel": "linkedin",
      "delayDays": 3,
      "linkedinMessage": "LinkedIn message"
    }
  ],
  "strategy": "Description of the overall sequence strategy"
}
`;

    const userPrompt = `
Create a sequence with the following context:

Target audience: ${params.context.targetAudience}
${params.context.industry ? `Industry: ${params.context.industry}` : ''}
Product: ${params.context.product}
Value proposition: ${params.context.valueProposition}
Goal: ${goalDescriptions[params.context.goal]}

Sender:
- Name: ${params.context.senderName}
- Company: ${params.context.senderCompany}
${params.context.senderTitle ? `- Title: ${params.context.senderTitle}` : ''}
`;

    try {
      // Use Claude for longer, more creative content
      const message = await anthropic.messages.create({
        model: this.claudeModel,
        max_tokens: 4000,
        messages: [
          { role: 'user', content: systemPrompt + '\n\n' + userPrompt },
        ],
      });
      
      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse sequence from AI response');
      
    } catch (error) {
      logger.error({ error }, 'Failed to generate sequence');
      throw error;
    }
  }
  
  async personalizeTemplate(params: {
    template: string;
    contact: Record<string, any>;
  }): Promise<{
    personalized: string;
    usedVariables: string[];
  }> {
    const systemPrompt = `
You are an expert at personalizing email templates for B2B outreach.

Given a template with {{variable}} placeholders and contact data, personalize the template.

If data is missing for a variable:
1. Try to infer from available data
2. Use a natural fallback that doesn't look templated
3. Never leave {{variable}} placeholders in output

Also add subtle personalization based on available context (company, role, industry, etc.)

Return JSON:
{
  "personalized": "The personalized text",
  "usedVariables": ["firstName", "company"]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Template:\n${params.template}\n\nContact data:\n${JSON.stringify(params.contact, null, 2)}` },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to personalize template');
      throw error;
    }
  }
  
  async extractFromWebsite(url: string): Promise<{
    companyName?: string;
    description?: string;
    industry?: string;
    products?: string[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    socialLinks?: Record<string, string>;
  }> {
    // This would ideally use a web scraping service
    // For now, return a placeholder
    return {
      companyName: undefined,
      description: undefined,
    };
  }
  
  async researchCompany(params: {
    companyName: string;
    domain?: string;
    linkedinUrl?: string;
  }): Promise<{
    summary: string;
    industry?: string;
    size?: string;
    founded?: string;
    headquarters?: string;
    recentNews?: string[];
    competitors?: string[];
    talkingPoints?: string[];
  }> {
    const systemPrompt = `
You are a B2B sales researcher. Based on the company name and any provided information, 
provide a research summary that would help a sales person personalize their outreach.

If you don't have specific information, provide reasonable inferences or state "Unknown".

Return JSON:
{
  "summary": "Brief company summary in Russian",
  "industry": "Industry",
  "size": "Company size estimate",
  "founded": "Year founded if known",
  "headquarters": "HQ location",
  "recentNews": ["Recent news item 1", "Recent news item 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "talkingPoints": ["Potential talking point 1 in Russian", "Potential talking point 2 in Russian"]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Research company:\nName: ${params.companyName}\n${params.domain ? `Domain: ${params.domain}` : ''}\n${params.linkedinUrl ? `LinkedIn: ${params.linkedinUrl}` : ''}` },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
      
    } catch (error) {
      logger.error({ error }, 'Failed to research company');
      throw error;
    }
  }
}

export const aiService = new AIService();