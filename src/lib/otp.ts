import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { db, ensureInvoiceTables } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mail";

export type OtpPurpose = "login" | "email_current" | "email_new";

const TTL_MS: Record<OtpPurpose, number> = {
  login: 10 * 60 * 1000,
  email_current: 10 * 60 * 1000,
  email_new: 15 * 60 * 1000,
};

export const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 25 * 1000;
const MAX_RESENDS = 5;

let tableReady: Promise<void> | null = null;
let lastCleanup = 0;

export function isOtpPurpose(value: unknown): value is OtpPurpose {
  return value === "login" || value === "email_current" || value === "email_new";
}

function hashCode(code: string, salt: string) {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

/** Creates the one-time-code table once per process. */
export function ensureOtpTable() {
  if (tableReady) return tableReady;
  tableReady = (async () => {
    await ensureInvoiceTables();
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_otp (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purpose VARCHAR(24) NOT NULL,
        email VARCHAR(254) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        token VARCHAR(64) NOT NULL,
        user_id UUID,
        pending_email VARCHAR(254),
        remember BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        resend_count INTEGER NOT NULL DEFAULT 0,
        last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await Promise.all([
      db.query("CREATE INDEX IF NOT EXISTS auth_otp_lookup_idx ON auth_otp (id, purpose)"),
      db.query("CREATE INDEX IF NOT EXISTS auth_otp_user_idx ON auth_otp (user_id, purpose)"),
      db.query("CREATE INDEX IF NOT EXISTS auth_otp_created_idx ON auth_otp (created_at DESC)"),
    ]);
    // Housekeeping: stale challenges have no value once they expire.
    if (Date.now() - lastCleanup > 60 * 60 * 1000) {
      lastCleanup = Date.now();
      await db.query("DELETE FROM auth_otp WHERE created_at < NOW() - INTERVAL '2 days'");
    }
  })().catch((error) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

export type GeneratedOtp = {
  code: string;
  salt: string;
  token: string;
  codeHash: string;
  expiresAt: Date;
};

/** Six digits, a per-challenge salt and an opaque token used to look the challenge up. */
export function generateOtp(purpose: OtpPurpose): GeneratedOtp {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("hex");
  return {
    code,
    salt,
    token,
    codeHash: hashCode(code, salt),
    expiresAt: new Date(Date.now() + TTL_MS[purpose]),
  };
}

export type SaveOtpInput = {
  purpose: OtpPurpose;
  email: string;
  otp: GeneratedOtp;
  userId?: string | null;
  pendingEmail?: string | null;
  remember?: boolean;
};

/** Stores a challenge after its email was sent successfully. */
export async function saveOtpChallenge(input: SaveOtpInput): Promise<{ id: string; token: string }> {
  await ensureOtpTable();
  const { purpose, email, otp } = input;
  const userId = input.userId ?? null;

  // Only one open challenge per purpose/account at a time.
  await db.query(
    `UPDATE auth_otp SET consumed_at = NOW()
      WHERE purpose = $1 AND consumed_at IS NULL
        AND (($2::text IS NOT NULL AND user_id = $2::uuid) OR ($2::text IS NULL AND email = $3))`,
    [purpose, userId, email],
  );

  const result = await db.query(
    `INSERT INTO auth_otp
       (purpose, email, code_hash, salt, token, user_id, pending_email, remember, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      purpose,
      email,
      otp.codeHash,
      otp.salt,
      otp.token,
      userId,
      input.pendingEmail ?? null,
      input.remember === true,
      otp.expiresAt,
    ],
  );

  return { id: String(result.rows[0].id), token: otp.token };
}

export type OtpVerifyResult =
  | { ok: true; userId: string | null; email: string; pendingEmail: string | null; remember: boolean }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Checks a code, records the attempt, and consumes the challenge on success. */
export async function verifyOtpChallenge(input: {
  id: string;
  token: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<OtpVerifyResult> {
  if (!input.id || !UUID_REGEX.test(input.id)) {
    return { ok: false, reason: "invalid" };
  }
  await ensureOtpTable();
  const result = await db.query(
    `SELECT id, purpose, email, code_hash, salt, token, user_id, pending_email, remember,
            expires_at, attempts, consumed_at
       FROM auth_otp
      WHERE id = $1 AND purpose = $2`,
    [input.id, input.purpose],
  );
  const row = result.rows[0];
  if (!row || row.consumed_at) return { ok: false, reason: "expired" };

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.query("UPDATE auth_otp SET consumed_at = NOW() WHERE id = $1", [row.id]);
    return { ok: false, reason: "expired" };
  }

  if (typeof row.token !== "string" || row.token.length !== input.token.length) {
    return { ok: false, reason: "invalid" };
  }
  const tokenMatch = timingSafeEqual(Buffer.from(row.token), Buffer.from(input.token));
  if (!tokenMatch) return { ok: false, reason: "invalid" };

  if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) {
    await db.query("UPDATE auth_otp SET consumed_at = NOW() WHERE id = $1", [row.id]);
    return { ok: false, reason: "locked" };
  }

  const expected = Buffer.from(String(row.code_hash), "hex");
  const actual = Buffer.from(hashCode(input.code, String(row.salt)), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    const attempts = Number(row.attempts) + 1;
    await db.query(
      `UPDATE auth_otp
          SET attempts = $2,
              consumed_at = CASE WHEN $2 >= $3 THEN NOW() ELSE consumed_at END
        WHERE id = $1`,
      [row.id, attempts, OTP_MAX_ATTEMPTS],
    );
    return { ok: false, reason: attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  await db.query("UPDATE auth_otp SET consumed_at = NOW() WHERE id = $1", [row.id]);
  return {
    ok: true,
    userId: row.user_id ? String(row.user_id) : null,
    email: String(row.email),
    pendingEmail: row.pending_email ? String(row.pending_email) : null,
    remember: row.remember === true,
  };
}

export type OtpRefreshResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "expired" | "invalid" | "rate" };

/** Issues a fresh code for an existing challenge and re-sends it. */
export async function refreshOtpChallenge(input: {
  id: string;
  token: string;
  purpose: OtpPurpose;
  userId?: string;
}): Promise<OtpRefreshResult> {
  await ensureOtpTable();
  const result = await db.query(
    `SELECT id, email, token, expires_at, resend_count, last_sent_at, consumed_at
       FROM auth_otp
      WHERE id = $1 AND purpose = $2 AND ($3::text IS NULL OR user_id = $3::uuid)`,
    [input.id, input.purpose, input.userId ?? null],
  );
  const row = result.rows[0];
  if (!row || row.consumed_at) return { ok: false, reason: "expired" };

  if (typeof row.token !== "string" || row.token.length !== input.token.length) {
    return { ok: false, reason: "invalid" };
  }
  if (!timingSafeEqual(Buffer.from(row.token), Buffer.from(input.token))) {
    return { ok: false, reason: "invalid" };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, reason: "expired" };
  if (Date.now() - new Date(row.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "rate" };
  }
  if (Number(row.resend_count) >= MAX_RESENDS) return { ok: false, reason: "rate" };

  const otp = generateOtp(input.purpose);
  // Deliver first: if SMTP fails the previous code must keep working and the
  // cooldown must not start, otherwise the account is locked out for 25s.
  await sendOtpEmail({ to: String(row.email), code: otp.code, purpose: input.purpose });

  await db.query(
    `UPDATE auth_otp
        SET code_hash = $2, salt = $3, expires_at = $4, attempts = 0,
            resend_count = resend_count + 1, last_sent_at = NOW()
      WHERE id = $1`,
    [row.id, otp.codeHash, otp.salt, otp.expiresAt],
  );

  return { ok: true, expiresAt: otp.expiresAt };
}

/** Invalidates every open challenge for an account and purpose. */
export async function clearOtpChallenges(userId: string, purpose: OtpPurpose) {
  await ensureOtpTable();
  await db.query(
    "UPDATE auth_otp SET consumed_at = NOW() WHERE user_id = $1::uuid AND purpose = $2 AND consumed_at IS NULL",
    [userId, purpose],
  );
}
