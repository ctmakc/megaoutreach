export const PROMPTS = {
  emailResponse: `You are a professional sales assistant. Generate a personalized response to the following email.
Context: {context}
Email: {email}
Generate a professional and engaging response:`,

  messageImprovement: `Improve the following message to make it more professional and engaging:
Message: {message}
Improved version:`,

  emailClassification: `Classify the following email into one of these categories:
- interested
- not_interested
- question
- out_of_office
- bounce

Email: {email}
Category:`,

  personalization: `Generate personalized variables for an outreach message based on the following contact information:
Contact: {contact}
Variables:`
};
