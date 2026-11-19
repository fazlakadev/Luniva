import { db, ensureInvoiceTables } from "@/lib/db";

/** The verification mailbox that receives admin login codes. */
export const DEFAULT_ADMIN_EMAIL = "fazlaka.dev@gmail.com";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lower-case, trimmed, and validated. Returns `null` when the address is unusable. */
export function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** The current admin verification email, with the project default as fallback. */
export async function getAdminEmail(): Promise<string> {
  await ensureInvoiceTables();
  const result = await db.query("SELECT value FROM app_settings WHERE key = 'admin_email'");
  const stored = normalizeEmail(result.rows[0]?.value);
  return stored ?? DEFAULT_ADMIN_EMAIL;
}

/**
 * Saves the admin verification email in `app_settings` and mirrors it onto the
 * admin user row. Callers must verify ownership of both the old and new address
 * before invoking this.
 */
export async function setAdminEmail(email: string, userId?: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("INVALID_EMAIL");

  await ensureInvoiceTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (userId) {
      const taken = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
        [normalized, userId],
      );
      if (taken.rowCount) {
        const conflict = new Error("EMAIL_TAKEN");
        conflict.name = "EmailTaken";
        throw conflict;
      }
      await client.query("UPDATE users SET email = $1 WHERE id = $2", [normalized, userId]);
    }
    await client.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('admin_email', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(normalized)],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return normalized;
}

/** `faz•••@gmail.com` — safe to show in the UI without revealing the full address. */
export function maskEmail(email: string): string {
  const [name, domain] = String(email ?? "").split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}
