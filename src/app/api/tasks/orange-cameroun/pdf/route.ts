import { buildTransactionPdf, pdfFileName } from "@/lib/pdf";
import { saveCustomer } from "@/lib/customerStore";
import type { BuildPdfRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BuildPdfRequest;
    if (!body.selected || body.selected.length === 0) {
      return Response.json(
        { error: "Select at least one transaction." },
        { status: 400 },
      );
    }

    // Remember the customer name for next time, if one was provided.
    if (body.customerName?.trim() && body.selected[0]?.identifier) {
      await saveCustomer(body.selected[0].identifier, body.customerName).catch(
        () => undefined,
      );
    }

    const pdf = await buildTransactionPdf(body);
    const fileName = pdfFileName(body);

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not generate the PDF.";
    return Response.json({ error: message }, { status: 500 });
  }
}
