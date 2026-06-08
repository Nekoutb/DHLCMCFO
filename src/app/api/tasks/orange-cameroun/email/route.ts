import { buildTransactionPdf, pdfFileName } from "@/lib/pdf";
import { saveCustomer } from "@/lib/customerStore";
import { isEmailConfigured, sendTransactionEmail } from "@/lib/email";
import type { SendEmailRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailRequest;

    if (!body.selected || body.selected.length === 0) {
      return Response.json(
        { error: "Select at least one transaction." },
        { status: 400 },
      );
    }
    if (!body.recipient?.trim()) {
      return Response.json(
        { error: "A recipient email address is required." },
        { status: 400 },
      );
    }
    if (!isEmailConfigured()) {
      // Not an error the user can fix — let the client fall back to download.
      return Response.json(
        {
          ok: false,
          configured: false,
          message:
            "Email is not configured on the server. Download the PDF and send it manually, or ask an administrator to set the SMTP environment variables.",
        },
        { status: 200 },
      );
    }

    if (body.customerName?.trim() && body.selected[0]?.identifier) {
      await saveCustomer(body.selected[0].identifier, body.customerName).catch(
        () => undefined,
      );
    }

    const pdf = await buildTransactionPdf(body);
    const fileName = pdfFileName(body);
    const subject =
      body.subject?.trim() ||
      `Orange Cameroun transaction${body.customerName ? ` — ${body.customerName.trim()}` : ""}`;
    const text =
      body.message?.trim() ||
      `Please find attached the Orange Cameroun mobile-money transaction document.\n\nSource file: ${body.fileName}`;

    await sendTransactionEmail({
      to: body.recipient.trim(),
      subject,
      text,
      pdf,
      pdfFileName: fileName,
    });

    return Response.json({ ok: true, configured: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not send the email.";
    return Response.json({ ok: false, configured: true, error: message }, { status: 500 });
  }
}
