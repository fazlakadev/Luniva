import nodemailer, { type Transporter } from "nodemailer";

export type ContactMessage = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function readEnv(name: string) {
  return (process.env[name] || "").trim();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function cleanLine(value: string, max = 160) {
  return value.replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function formatAddress(name: string, email: string) {
  const safeName = cleanLine(name, 80) || "لونيفا";
  return `"${safeName}" <${email}>`;
}

export function isMailConfigured() {
  return Boolean(
    readEnv("EMAIL_SERVER_HOST") &&
      readEnv("EMAIL_SERVER_USER") &&
      readEnv("EMAIL_SERVER_PASSWORD") &&
      readEnv("EMAIL_FROM"),
  );
}

export function isContactMailConfigured() {
  return isMailConfigured();
}

type MailTransport = {
  transporter: Transporter;
  from: string;
  senderName: string;
  logoUrl: string;
};

/** Builds the SMTP transport, throwing a clear (secret-free) error when it is not configured. */
function createTransport(): MailTransport {
  const host = readEnv("EMAIL_SERVER_HOST");
  const user = readEnv("EMAIL_SERVER_USER");
  const password = readEnv("EMAIL_SERVER_PASSWORD").replace(/\s+/g, "");
  const from = readEnv("EMAIL_FROM");

  if (!host || !user || !password || !from) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  const portValue = Number(readEnv("EMAIL_SERVER_PORT") || "587");
  const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : 587;

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    }),
    from,
    senderName: readEnv("EMAIL_SENDER_NAME") || "لونيفا",
    logoUrl: readEnv("EMAIL_LOGO_URL"),
  };
}

export type OtpMailPurpose = "login" | "email_current" | "email_new";

const OTP_COPY: Record<OtpMailPurpose, { subject: string; title: string; intro: string }> = {
  login: {
    subject: "رمز الدخول إلى لوحة إدارة لونيفا",
    title: "رمز التحقق للدخول",
    intro: "استخدمي الرمز التالي لإتمام تسجيل الدخول إلى لوحة إدارة لونيفا.",
  },
  email_current: {
    subject: "تأكيد تغيير بريد الإدارة · لونيفا",
    title: "تأكيد تغيير بريد الإدارة",
    intro: "طُلب تغيير بريد التحقق الخاص بالإدارة. استخدمي الرمز التالي لتفويض هذا التغيير.",
  },
  email_new: {
    subject: "تأكيد بريد الإدارة الجديد · لونيفا",
    title: "تأكيد البريد الجديد",
    intro: "استخدمي الرمز التالي لتأكيد ملكية هذا البريد الجديد قبل حفظه لبريد الإدارة.",
  },
};

/**
 * Sends a one-time verification code. Throws when SMTP is unavailable so callers
 * can block the action instead of silently weakening security.
 */
export async function sendOtpEmail(input: {
  to: string;
  code: string;
  purpose: OtpMailPurpose;
  expiryMinutes?: number;
}) {
  const { transporter, from, senderName, logoUrl } = createTransport();
  const copy = OTP_COPY[input.purpose];
  const expiry = Math.max(1, Math.round(input.expiryMinutes ?? 10));
  const recipient = cleanLine(input.to, 254);
  const code = input.code.replace(/\D/g, "").slice(0, 8);
  const submittedAt = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });

  const text = [
    copy.title,
    "",
    copy.intro,
    "",
    `الرمز: ${code}`,
    `صلاحية الرمز: ${expiry} دقائق`,
    `الوقت: ${submittedAt}`,
    "",
    "إذا لم تطلبي هذا الإجراء، تجاهلي هذه الرسالة ولا تشاركي الرمز مع أي شخص.",
  ].join("\n");

  const html = `
    <div dir="rtl" style="margin:0;padding:24px;background:#f9f5f3;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#2b2228;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 16px;text-align:right;">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(senderName)}" width="120" style="display:inline-block;max-width:120px;height:auto;border:0;" />` : `<span style="font-size:18px;font-weight:800;color:#8e445b;">${escapeHtml(senderName)}</span>`}
          </td>
        </tr>
        <tr>
          <td style="padding:30px;border:1px solid #eadcdf;border-radius:20px;background:#fffdfc;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#a95d73;">لونيفا · حماية الحساب</p>
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.5;color:#2b2228;">${escapeHtml(copy.title)}</h1>
            <p style="margin:0 auto 22px;max-width:380px;font-size:14px;line-height:1.9;color:#7d6c74;">${escapeHtml(copy.intro)}</p>
            <div style="margin:0 auto 18px;padding:18px 20px;border-radius:16px;background:#fdf7f5;border:1px solid #eadcdf;">
              <span dir="ltr" style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:12px;color:#8e445b;font-variant-numeric:tabular-nums;">${escapeHtml(code)}</span>
            </div>
            <p style="margin:0;font-size:12px;color:#9c8b92;">صلاحية الرمز ${expiry} دقائق · ${escapeHtml(submittedAt)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center;font-size:11px;line-height:1.8;color:#9c8b92;">
            إذا لم تطلبي هذا الإجراء، تجاهلي هذه الرسالة ولا تشاركي الرمز مع أي شخص.
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: formatAddress(senderName, from),
    to: recipient,
    subject: copy.subject,
    text,
    html,
  });
}

export async function sendContactEmail(input: ContactMessage) {
  const host = readEnv("EMAIL_SERVER_HOST");
  const user = readEnv("EMAIL_SERVER_USER");
  const password = readEnv("EMAIL_SERVER_PASSWORD").replace(/\s+/g, "");
  const from = readEnv("EMAIL_FROM");

  if (!host || !user || !password || !from) {
    throw new Error("Contact email settings are incomplete.");
  }

  const portValue = Number(readEnv("EMAIL_SERVER_PORT") || "587");
  const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : 587;
  const recipient = readEnv("RECEIVER_EMAIL") || readEnv("EMAIL_USER") || from;
  const senderName = readEnv("EMAIL_SENDER_NAME") || "Fazlaka";
  const logoUrl = readEnv("EMAIL_LOGO_URL");
  const submittedAt = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });

  const name = cleanLine(input.name, 80);
  const email = cleanLine(input.email, 120);
  const phone = cleanLine(input.phone, 40) || "—";
  const subject = cleanLine(input.subject, 140) || "استفسار جديد";
  const message = input.message.trim().slice(0, 3000);

  const text = [
    `رسالة جديدة من موقع لونيفا`,
    `الاسم: ${name}`,
    `البريد الإلكتروني: ${email}`,
    `رقم الهاتف: ${phone}`,
    `الموضوع: ${subject}`,
    `التاريخ: ${submittedAt}`,
    "",
    "الرسالة:",
    message,
  ].join("\n");

  const html = `
    <div dir="rtl" style="margin:0;padding:24px;background:#f9f5f3;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#2b2228;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 16px;text-align:right;">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(senderName)}" width="120" style="display:inline-block;max-width:120px;height:auto;border:0;" />` : `<span style="font-size:18px;font-weight:800;color:#8e445b;">${escapeHtml(senderName)}</span>`}
          </td>
        </tr>
        <tr>
          <td style="padding:28px;border:1px solid #eadcdf;border-radius:20px;background:#fffdfc;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.12em;color:#a95d73;">لونيفا · تواصل العملاء</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.4;color:#2b2228;">رسالة جديدة من الموقع</h1>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;line-height:1.9;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;color:#7d6c74;font-weight:700;">الاسم</td><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;font-weight:800;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;color:#7d6c74;font-weight:700;">البريد الإلكتروني</td><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;font-weight:800;direction:ltr;text-align:right;">${escapeHtml(email)}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;color:#7d6c74;font-weight:700;">رقم الهاتف</td><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;font-weight:800;direction:ltr;text-align:right;">${escapeHtml(phone)}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;color:#7d6c74;font-weight:700;">الموضوع</td><td style="padding:8px 0;border-bottom:1px solid #f3ebe8;font-weight:800;">${escapeHtml(subject)}</td></tr>
              <tr><td style="padding:8px 0;color:#7d6c74;font-weight:700;">التاريخ</td><td style="padding:8px 0;font-weight:800;">${escapeHtml(submittedAt)}</td></tr>
            </table>
            <div style="margin-top:22px;padding:18px;border-radius:14px;background:#fdf7f5;border:1px solid #eadcdf;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#8e445b;">نص الرسالة</p>
              <p style="margin:0;font-size:14px;line-height:2;white-space:pre-wrap;color:#51434b;">${escapeHtml(message)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center;font-size:11px;color:#9c8b92;">
            أُرسلت هذه الرسالة عبر نموذج التواصل في موقع لونيفا. للرد، استخدم خيار الرد على هذه الرسالة.
          </td>
        </tr>
      </table>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: formatAddress(senderName, from),
    to: recipient,
    replyTo: formatAddress(name, email),
    subject: `رسالة من موقع لونيفا: ${subject}`,
    text,
    html,
  });
}
