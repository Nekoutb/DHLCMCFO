import { defaultRecipient, isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";

/** Lightweight config the client needs to render the email step. */
export async function GET() {
  return Response.json({
    emailConfigured: isEmailConfigured(),
    defaultRecipient: defaultRecipient(),
  });
}
