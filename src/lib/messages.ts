import { db, ensureContactMessagesTable } from "@/lib/db";
import { sendCustomerReplyEmail } from "@/lib/mail";

export type ContactMessageRecord = {
  id: string;
  customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "unread" | "replied" | "archived";
  reply_message: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
};

export async function listContactMessages(status?: string): Promise<ContactMessageRecord[]> {
  await ensureContactMessagesTable();

  let query = `
    SELECT
      id, customer_id, name, email, phone, subject, message, status,
      reply_message, replied_at::text, replied_by, created_at::text
    FROM contact_messages
  `;

  const params: any[] = [];
  if (status && status !== "all") {
    params.push(status);
    query += " WHERE status = $1";
  }

  query += " ORDER BY created_at DESC";

  const res = await db.query(query, params);
  return res.rows;
}

export async function getContactMessage(id: string): Promise<ContactMessageRecord | null> {
  await ensureContactMessagesTable();
  const res = await db.query(
    `SELECT
      id, customer_id, name, email, phone, subject, message, status,
      reply_message, replied_at::text, replied_by, created_at::text
     FROM contact_messages
     WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function replyToContactMessage(
  id: string,
  replyMessage: string,
  repliedBy: string = "فريق لونيفا",
) {
  await ensureContactMessagesTable();
  const msg = await getContactMessage(id);
  if (!msg) throw new Error("الرسالة غير موجودة.");

  // 1. Send Email to Customer
  if (msg.email) {
    await sendCustomerReplyEmail({
      to: msg.email,
      customerName: msg.name,
      subject: msg.subject || "الرد على استفسارك",
      replyMessage,
      originalMessage: msg.message,
    });
  }

  // 2. Update record in DB
  const updateRes = await db.query(
    `UPDATE contact_messages
     SET status = 'replied', reply_message = $1, replied_at = NOW(), replied_by = $2
     WHERE id = $3
     RETURNING *`,
    [replyMessage.trim(), repliedBy, id],
  );

  return updateRes.rows[0];
}
