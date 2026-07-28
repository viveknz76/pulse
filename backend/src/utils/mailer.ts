import sgMail from "@sendgrid/mail";

export class MailerNotConfiguredError extends Error {
  constructor() {
    super("SendGrid is not configured (missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL)");
    this.name = "MailerNotConfiguredError";
  }
}

let configured = false;

function ensureConfigured(): string {
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!configured) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey || !from) throw new MailerNotConfiguredError();
    sgMail.setApiKey(apiKey);
    configured = true;
  }
  if (!from) throw new MailerNotConfiguredError();
  return from;
}

export async function sendCheckInSummaryEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from = ensureConfigured();
  await sgMail.send({ to: opts.to, from, subject: opts.subject, text: opts.text });
}
