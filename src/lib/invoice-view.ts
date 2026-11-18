import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { db, ensureInvoiceTables } from "@/lib/db";

/**
 * Public invoice links are bearer URLs, so they are built from an invoice id
 * plus an HMAC of a per-invoice random nonce. The nonce alone (stored in the
 * database) cannot produce a valid link without SESSION_SECRET, and rotating
 * the nonce instantly invalidates any previously shared link.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function viewSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return `${value}:invoice-view:v1`;
}

export function newViewNonce() {
  return randomBytes(24).toString("hex");
}

function macFor(invoiceId: string, nonce: string) {
  return createHmac("sha256", viewSecret()).update(`${invoiceId}.${nonce}`).digest("base64url");
}

export function buildInvoiceViewToken(invoiceId: string, nonce: string) {
  return `${invoiceId}.${macFor(invoiceId, nonce)}`;
}

export async function getInvoiceViewToken(invoiceId: string) {
  await ensureInvoiceTables();
  const result = await db.query("SELECT view_nonce FROM invoices WHERE id = $1", [invoiceId]);
  const nonce = result.rows[0]?.view_nonce;
  if (typeof nonce !== "string" || !nonce) return null;
  return buildInvoiceViewToken(invoiceId, nonce);
}

export async function rotateInvoiceViewToken(invoiceId: string) {
  await ensureInvoiceTables();
  const nonce = newViewNonce();
  const result = await db.query(
    "UPDATE invoices SET view_nonce = $1 WHERE id = $2 RETURNING id",
    [nonce, invoiceId],
  );
  if (!result.rowCount) return null;
  return buildInvoiceViewToken(invoiceId, nonce);
}

export async function verifyInvoiceViewToken(token: string) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [invoiceId, providedMac] = parts;
  if (!UUID.test(invoiceId) || !/^[A-Za-z0-9_-]{43}$/.test(providedMac)) return null;

  await ensureInvoiceTables();
  const result = await db.query("SELECT view_nonce FROM invoices WHERE id = $1", [invoiceId]);
  const nonce = result.rows[0]?.view_nonce;
  if (typeof nonce !== "string" || !nonce) return null;

  const expected = Buffer.from(macFor(invoiceId, nonce));
  const provided = Buffer.from(providedMac);
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;
  return invoiceId;
}

export async function getPublicInvoiceUrl(invoiceId: string) {
  const token = await getInvoiceViewToken(invoiceId);
  if (!token) return null;
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}/view/${token}`;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim()
    || requestHeaders.get("host")
    || "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}/view/${token}`;
}

export async function invoiceQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: { dark: "#a95d73", light: "#ffffff" },
  });
}

/** Used only for public-facing display; never reveal the full phone number. */
export function maskPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}

export function tokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}
