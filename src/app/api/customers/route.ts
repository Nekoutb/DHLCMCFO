import { getAllCustomers, saveCustomer } from "@/lib/customerStore";

export const runtime = "nodejs";

export async function GET() {
  const customers = await getAllCustomers();
  return Response.json({ customers });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier?: string; name?: string };
    if (!body.identifier?.trim() || !body.name?.trim()) {
      return Response.json(
        { error: "Both an identifier and a name are required." },
        { status: 400 },
      );
    }
    const record = await saveCustomer(body.identifier, body.name);
    return Response.json({ ok: true, record });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save the customer.";
    return Response.json({ error: message }, { status: 500 });
  }
}
