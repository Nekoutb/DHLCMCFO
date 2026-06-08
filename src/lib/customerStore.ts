import { promises as fs } from "fs";
import path from "path";
import type { CustomerRecord } from "./types";

// -----------------------------------------------------------------------------
// Simple file-backed customer registry.
//
// Maps a transaction identifier (e.g. a phone number) to a customer name so the
// system can recognise the customer automatically next time. This is a JSON
// file on disk — intentionally lightweight for the draft. Swapping it for a
// database later only requires changing this module.
// -----------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const STORE_FILE = path.join(DATA_DIR, "customers.json");

type StoreShape = Record<string, CustomerRecord>;

/** Normalise an identifier so "+237 6 99..." and "237699..." match. */
export function normalizeIdentifier(raw: string): string {
  return raw.replace(/[\s\-().]/g, "").toLowerCase().trim();
}

async function readStore(): Promise<StoreShape> {
  try {
    const text = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(text) as StoreShape;
  } catch {
    return {};
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

/** Return the remembered customer name for an identifier, or null. */
export async function lookupCustomer(
  identifier: string | null | undefined,
): Promise<string | null> {
  if (!identifier) return null;
  const store = await readStore();
  return store[normalizeIdentifier(identifier)]?.name ?? null;
}

/** Remember (or update) a customer name for an identifier. */
export async function saveCustomer(
  identifier: string,
  name: string,
): Promise<CustomerRecord> {
  const key = normalizeIdentifier(identifier);
  if (!key) throw new Error("A customer identifier is required.");
  if (!name.trim()) throw new Error("A customer name is required.");

  const store = await readStore();
  const record: CustomerRecord = {
    identifier,
    name: name.trim(),
    updatedAt: new Date().toISOString(),
  };
  store[key] = record;
  await writeStore(store);
  return record;
}

/** List every remembered customer. */
export async function getAllCustomers(): Promise<CustomerRecord[]> {
  const store = await readStore();
  return Object.values(store).sort((a, b) => a.name.localeCompare(b.name));
}
