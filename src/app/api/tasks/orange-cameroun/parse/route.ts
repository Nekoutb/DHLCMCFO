import { parseWorkbook } from "@/lib/excel";
import { lookupCustomer } from "@/lib/customerStore";

// exceljs needs the Node.js runtime (not edge).
export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file was uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "File is too large (max 12 MB)." },
        { status: 413 },
      );
    }

    const headerRowRaw = form.get("headerRow");
    const identifierColumnRaw = form.get("identifierColumn");
    const sheetNameRaw = form.get("sheetName");

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseWorkbook(buffer, file.name, {
      headerRowIndex:
        typeof headerRowRaw === "string" && headerRowRaw
          ? Number(headerRowRaw)
          : undefined,
      identifierColumn:
        typeof identifierColumnRaw === "string" && identifierColumnRaw
          ? identifierColumnRaw
          : undefined,
      sheetName:
        typeof sheetNameRaw === "string" && sheetNameRaw ? sheetNameRaw : undefined,
    });

    // Annotate each transaction with any remembered customer name.
    await Promise.all(
      result.transactions.map(async (t) => {
        t.knownCustomerName = await lookupCustomer(t.identifier);
      }),
    );

    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read the file.";
    return Response.json({ error: message }, { status: 422 });
  }
}
