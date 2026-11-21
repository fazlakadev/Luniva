import { db, ensureInvoiceTables } from "@/lib/db";
import { isMailConfigured, sendNewsletterMail } from "@/lib/mail";

let readyPromise: Promise<void> | null = null;

export async function ensureNewsletterTables() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await ensureInvoiceTables();
    await db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(254) UNIQUE NOT NULL,
        source VARCHAR(60) NOT NULL DEFAULT 'storefront',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS newsletter_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject VARCHAR(254) NOT NULL,
        preview_text VARCHAR(254),
        content TEXT NOT NULL,
        recipients_count INT NOT NULL DEFAULT 0,
        sent_by VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (email);
      CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_idx ON newsletter_subscribers (created_at DESC);
      CREATE INDEX IF NOT EXISTS newsletter_campaigns_created_idx ON newsletter_campaigns (created_at DESC);
    `);
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });
  return readyPromise;
}

export type SubscriberRow = {
  id: string;
  email: string;
  source: string;
  status: string;
  created_at: string;
};

export type CampaignRow = {
  id: string;
  subject: string;
  preview_text: string | null;
  content: string;
  recipients_count: number;
  sent_by: string | null;
  created_at: string;
};

export async function subscribeNewsletter(email: string, source = "storefront") {
  await ensureNewsletterTables();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    throw new Error("يرجى إدخال بريد إلكتروني صالح.");
  }

  const result = await db.query(
    `INSERT INTO newsletter_subscribers (email, source, status, created_at)
     VALUES ($1, $2, 'active', NOW())
     ON CONFLICT (email) DO UPDATE SET status = 'active'
     RETURNING id, email, created_at`,
    [cleanEmail, source],
  );

  return result.rows[0];
}

export async function getNewsletterSubscribers(search?: string): Promise<SubscriberRow[]> {
  await ensureNewsletterTables();
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    const res = await db.query(
      `SELECT id, email, source, status, created_at
         FROM newsletter_subscribers
        WHERE LOWER(email) LIKE $1
        ORDER BY created_at DESC`,
      [q],
    );
    return res.rows;
  }

  const res = await db.query(
    `SELECT id, email, source, status, created_at
       FROM newsletter_subscribers
      ORDER BY created_at DESC`,
  );
  return res.rows;
}

export async function getNewsletterCampaigns(): Promise<CampaignRow[]> {
  await ensureNewsletterTables();
  const res = await db.query(
    `SELECT id, subject, preview_text, content, recipients_count, sent_by, created_at
       FROM newsletter_campaigns
      ORDER BY created_at DESC
      LIMIT 50`,
  );
  return res.rows;
}

export async function deleteNewsletterSubscriber(id: string) {
  await ensureNewsletterTables();
  await db.query("DELETE FROM newsletter_subscribers WHERE id = $1::uuid", [id]);
}

export async function sendNewsletterCampaign(input: {
  subject: string;
  previewText?: string;
  content: string;
  sentBy?: string;
}) {
  await ensureNewsletterTables();
  const { subject, previewText, content, sentBy } = input;
  if (!subject.trim()) throw new Error("عنوان الحملة البريدية مطلوب.");
  if (!content.trim()) throw new Error("محتوى الحملة البريدية مطلوب.");

  // Fetch all active subscribers
  const subs = await db.query(
    "SELECT email FROM newsletter_subscribers WHERE status = 'active'",
  );
  const emails = subs.rows.map((r) => r.email);

  if (emails.length === 0) {
    throw new Error("لا يوجد مشتركون نشطون في النشرة البريدية حتى الآن.");
  }

  if (isMailConfigured()) {
    // Branded HTML Newsletter
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #faf7f5; margin: 0; padding: 24px; color: #1e1b18; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #ebd9d2; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .header { background: linear-gradient(135deg, #7c2d3a, #9e3d4c); padding: 36px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 8px 0 0 0; font-size: 13px; opacity: 0.9; }
    .body-content { padding: 32px 28px; font-size: 15px; color: #332d29; }
    .footer { background: #fdfbf9; padding: 24px; text-align: center; font-size: 11px; color: #8a7e78; border-top: 1px solid #ebd9d2; }
    .coupon-badge { display: inline-block; background: #fbebee; border: 1px dashed #7c2d3a; color: #7c2d3a; padding: 10px 20px; border-radius: 12px; font-weight: 800; margin: 20px 0; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LUNIVA FASHION</h1>
      <p>النشرة البريدية الحصرية لأزياء وتصاميم لونيفا</p>
    </div>
    <div class="body-content">
      <h2 style="color: #7c2d3a; font-size: 19px; margin-top: 0;">${subject}</h2>
      ${previewText ? `<p style="color: #6b635e; font-weight: bold; margin-bottom: 20px;">${previewText}</p>` : ""}
      <div style="white-space: pre-line; line-height: 1.8;">${content}</div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} لونيفا لتصميم وتصنيع الأزياء النسائية — جميع الحقوق محفوظة.</p>
      <p>وصلتكِ هذه الرسالة لاشتراككِ في نادي عميلات لونيفا.</p>
    </div>
  </div>
</body>
</html>`;

    // Send emails in batches
    for (const to of emails) {
      try {
        await sendNewsletterMail({
          to,
          subject: `${subject} · لونيفا`,
          html,
          text: `${subject}\n\n${content}`,
        });
      } catch (err) {
        console.error(`Failed to send newsletter to ${to}:`, err);
      }
    }
  }

  // Record campaign
  const insRes = await db.query(
    `INSERT INTO newsletter_campaigns (subject, preview_text, content, recipients_count, sent_by, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, created_at`,
    [subject.trim(), previewText?.trim() || null, content.trim(), emails.length, sentBy || "الإدارة"],
  );

  return { ok: true, campaignId: insRes.rows[0].id, count: emails.length };
}
