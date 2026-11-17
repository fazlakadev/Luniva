import { db, ensureInvoiceTables } from "@/lib/db";

export type CompanySettings = {
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyAddress: string;
  taxNumber: string;
  receiptFooter: string;
  paymentTermsDays: number;
};

export const defaultSettings: CompanySettings = {
  companyName: "Luniva",
  companyTagline: "لإدارة المنتجات والبكدجات والفواتير",
  companyPhone: "",
  companyAddress: "",
  taxNumber: "",
  receiptFooter: "شكرًا لتعاملك معنا",
  paymentTermsDays: 7,
};

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function getSettings(): Promise<CompanySettings> {
  await ensureInvoiceTables();
  const result = await db.query("SELECT key, value FROM app_settings");
  const values = new Map(result.rows.map((row) => [String(row.key), row.value]));
  const terms = Number(values.get("payment_terms_days"));
  return {
    companyName: asText(values.get("company_name")) || defaultSettings.companyName,
    companyTagline: asText(values.get("company_tagline")) || defaultSettings.companyTagline,
    companyPhone: asText(values.get("company_phone")),
    companyAddress: asText(values.get("company_address")),
    taxNumber: asText(values.get("tax_number")),
    receiptFooter: asText(values.get("receipt_footer")) || defaultSettings.receiptFooter,
    paymentTermsDays: Number.isFinite(terms) && terms >= 0 && terms <= 365 ? Math.trunc(terms) : defaultSettings.paymentTermsDays,
  };
}

export function normalizeSettingsPayload(raw: unknown): CompanySettings {
  const body = (raw ?? {}) as Record<string, unknown>;
  const terms = Number(body.paymentTermsDays);
  return {
    companyName: asText(body.companyName).slice(0, 120) || defaultSettings.companyName,
    companyTagline: asText(body.companyTagline).slice(0, 160),
    companyPhone: asText(body.companyPhone).slice(0, 60),
    companyAddress: asText(body.companyAddress).slice(0, 300),
    taxNumber: asText(body.taxNumber).slice(0, 60),
    receiptFooter: asText(body.receiptFooter).slice(0, 200) || defaultSettings.receiptFooter,
    paymentTermsDays: Number.isFinite(terms) ? Math.min(365, Math.max(0, Math.trunc(terms))) : defaultSettings.paymentTermsDays,
  };
}

export async function saveSettings(input: CompanySettings): Promise<CompanySettings> {
  await ensureInvoiceTables();
  const entries: Array<[string, unknown]> = [
    ["company_name", input.companyName],
    ["company_tagline", input.companyTagline],
    ["company_phone", input.companyPhone],
    ["company_address", input.companyAddress],
    ["tax_number", input.taxNumber],
    ["receipt_footer", input.receiptFooter],
    ["payment_terms_days", input.paymentTermsDays],
  ];
  for (const [key, value] of entries) {
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)],
    );
  }
  return input;
}
