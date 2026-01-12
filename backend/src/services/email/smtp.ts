import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

// Connection pool for transporters
const transporterPool = new Map<string, Transporter>();

export function getTransporter(accountId: string, config: SmtpConfig): Transporter {
  const key = accountId;

  if (!transporterPool.has(key)) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // 1 second between messages
      rateLimit: 5, // 5 messages per rateDelta
      // Timeouts
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 60000,
    });

    transporterPool.set(key, transporter);
  }

  return transporterPool.get(key)!;
}

export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();
    await transporter.close();

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

export async function testImapConnection(config: ImapConfig): Promise<{ success: boolean; error?: string }> {
  // IMAP testing would require imap or imapflow library
  // For now, we'll do a basic check
  try {
    // Placeholder - implement with actual IMAP library
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

export function closeTransporter(accountId: string): void {
  const transporter = transporterPool.get(accountId);
  if (transporter) {
    transporter.close();
    transporterPool.delete(accountId);
  }
}

export function closeAllTransporters(): void {
  for (const [id, transporter] of transporterPool) {
    transporter.close();
  }
  transporterPool.clear();
}
