export class ConditionEvaluator {
  async evaluate(condition: any, context: any) {
    // TODO: Evaluate condition
    const { type, operator, value } = condition;

    switch (type) {
      case 'email_opened':
        return context.emailOpened === true;
      case 'email_clicked':
        return context.emailClicked === true;
      case 'replied':
        return context.replied === true;
      case 'wait_time':
        return this.evaluateWaitTime(value, context.lastActionAt);
      default:
        return false;
    }
  }

  private evaluateWaitTime(hours: number, lastActionAt: Date) {
    // TODO: Evaluate wait time condition
    const now = new Date();
    const diff = now.getTime() - lastActionAt.getTime();
    return diff >= hours * 60 * 60 * 1000;
  }
}
