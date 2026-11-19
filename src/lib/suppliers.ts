export type SupplierInput = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateSupplier(raw: unknown): SupplierInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = text(body.name, 160);
  const contactName = text(body.contactName, 120);
  const phone = text(body.phone, 32);
  const email = text(body.email, 160);
  const address = text(body.address, 500);
  const notes = text(body.notes, 1000);

  if (!name) throw new Error("أدخلي اسم المورد.");
  if (phone && phone.length > 32) throw new Error("رقم هاتف المورد غير صحيح.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("بريد المورد غير صحيح.");

  return { name, contactName, phone, email, address, notes };
}

export function supplierRef(value: unknown): string | null {
  return typeof value === "string" && value && isUuid(value) ? value : null;
}

export function supplyPrice(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100) / 100) : 0;
}
