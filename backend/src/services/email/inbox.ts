export class InboxService {
  async fetchMessages(accountId: string) {
    // TODO: Fetch inbox messages using IMAP
    console.log('Fetching messages for account:', accountId);
    return [];
  }

  async markAsRead(messageId: string) {
    // TODO: Mark message as read
    console.log('Marking message as read:', messageId);
  }

  async reply(messageId: string, body: string) {
    // TODO: Reply to message
    console.log('Replying to message:', messageId);
  }
}
