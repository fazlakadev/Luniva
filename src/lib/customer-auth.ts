import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { db, ensureCustomersTable } from "@/lib/db";

const CUSTOMER_COOKIE = "luniva_customer_session";
const encoder = new TextEncoder();

export type CustomerSession = {
  customerId: string;
  fullName: string;
  phone: string;
  email: string | null;
  customerCode: string | null;
  imageUrl: string | null;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) {
    return encoder.encode(value);
  }
  const fallback = createHash("sha256")
    .update(`luniva-customer:${process.env.DATABASE_URL || "luniva-customer-fallback"}`)
    .digest("hex");
  return encoder.encode(fallback);
}

export async function hashCustomerPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyCustomerPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createCustomerSessionToken(payload: CustomerSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setCustomerSessionCookie(payload: CustomerSession) {
  const token = await createCustomerSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.customerId !== "string") return null;

    return {
      customerId: payload.customerId,
      fullName: String(payload.fullName || ""),
      phone: String(payload.phone || ""),
      email: typeof payload.email === "string" ? payload.email : null,
      customerCode: typeof payload.customerCode === "string" ? payload.customerCode : null,
      imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : null,
    };
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
}

/**
 * Finds or creates a customer from Google OAuth payload.
 */
export async function findOrCreateGoogleCustomer(data: {
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
}): Promise<CustomerSession> {
  await ensureCustomersTable();

  const normalizedEmail = data.email.toLowerCase().trim();

  // 1. Try to find by google_id
  let res = await db.query(
    "SELECT id, full_name, phone, email, customer_code, image_url FROM customers WHERE google_id = $1",
    [data.googleId],
  );

  if (res.rowCount && res.rows[0]) {
    const cust = res.rows[0];
    return {
      customerId: cust.id,
      fullName: cust.full_name,
      phone: cust.phone || "",
      email: cust.email || normalizedEmail,
      customerCode: cust.customer_code,
      imageUrl: cust.image_url || data.picture || null,
    };
  }

  // 2. Try to find by email
  res = await db.query(
    "SELECT id, full_name, phone, email, customer_code, image_url FROM customers WHERE LOWER(email) = $1",
    [normalizedEmail],
  );

  if (res.rowCount && res.rows[0]) {
    const cust = res.rows[0];
    await db.query(
      "UPDATE customers SET google_id = $1, image_url = COALESCE(image_url, $2), email_verified = true WHERE id = $3",
      [data.googleId, data.picture || null, cust.id],
    );
    return {
      customerId: cust.id,
      fullName: cust.full_name,
      phone: cust.phone || "",
      email: cust.email || normalizedEmail,
      customerCode: cust.customer_code,
      imageUrl: cust.image_url || data.picture || null,
    };
  }

  // 3. Create brand new customer
  const codeSeqRes = await db.query("SELECT nextval('customers_code_seq') AS next_code");
  const nextSeq = codeSeqRes.rows[0]?.next_code || Math.floor(1000 + Math.random() * 9000);
  const customerCode = `CUST-${nextSeq}`;

  const insertRes = await db.query(
    `INSERT INTO customers
      (full_name, phone, email, google_id, auth_provider, email_verified, customer_code, image_url)
     VALUES ($1, $2, $3, $4, 'google', true, $5, $6)
     RETURNING id, full_name, phone, email, customer_code, image_url`,
    [
      data.name.trim() || "عميلة جديدة",
      "", // Phone can be added upon checkout / inquiry
      normalizedEmail,
      data.googleId,
      customerCode,
      data.picture || null,
    ],
  );

  const newCust = insertRes.rows[0];
  return {
    customerId: newCust.id,
    fullName: newCust.full_name,
    phone: newCust.phone || "",
    email: newCust.email,
    customerCode: newCust.customer_code,
    imageUrl: newCust.image_url,
  };
}
