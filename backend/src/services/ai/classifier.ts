export class AIClassifier {
  async classifyEmail(emailContent: string) {
    // TODO: Classify email (interested, not interested, etc.)
    console.log('Classifying email');
    return {
      category: 'interested',
      confidence: 0.85
    };
  }

  async detectIntent(message: string) {
    // TODO: Detect user intent
    console.log('Detecting intent');
    return 'question';
  }

  async extractEntities(text: string) {
    // TODO: Extract entities (company, person, date, etc.)
    console.log('Extracting entities');
    return [];
  }
}
