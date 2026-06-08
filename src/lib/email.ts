import nodemailer from "nodemailer";

// -----------------------------------------------------------------------------
// Email delivery via SMTP (nodemailer).
//
// Configure with environment variables (see .env.example). If SMTP is not
// configured, isEmailConfigured() returns false and the UI falls back to
// downloading the PDF so the user can attach it manually.
// -----------------------------------------------------------------------------

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export function defaultRecipient(): string {
  return process.env.ORANGE_PDF_RECIPIENT ?? "";
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 uses implicit TLS; 587 uses STARTTLS.
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  pdf: Uint8Array;
  pdfFileName: string;
}

export async function sendTransactionEmail(args: SendArgs): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured on the server.");
  }
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: args.to,
    subject: args.subject,
    text: args.text,
    attachments: [
      {
        filename: args.pdfFileName,
        content: Buffer.from(args.pdf),
        contentType: "application/pdf",
      },
    ],
  });
}
