"use client";

import { useState } from "react";
import { AtSign, Globe, MessageCircle, Phone, X } from "lucide-react";

type SocialRailProps = {
  email?: string;
  phone?: string;
};

/** Floating bottom-corner contact button for public client pages. Never blocks the screen center. */
export default function SocialRail({ email = "", phone = "" }: SocialRailProps) {
  const [open, setOpen] = useState(false);

  const phoneDigits = phone.replace(/[^\d]/g, "");
  const links = [
    {
      label: "تواصل عبر واتساب",
      href: phoneDigits ? `https://wa.me/${phoneDigits}` : "/contact",
      icon: MessageCircle,
      accent: "#25D366",
      bg: "rgba(37, 211, 102, 0.15)",
    },
    {
      label: "اتصلي بنا",
      href: phoneDigits ? `tel:+${phoneDigits}` : "/contact",
      icon: Phone,
      accent: "var(--brand-soft)",
      bg: "rgba(255, 255, 255, 0.12)",
    },
    {
      label: "راسلينا بالبريد",
      href: email ? `mailto:${email}` : "/contact",
      icon: AtSign,
      accent: "var(--lav)",
      bg: "rgba(255, 255, 255, 0.12)",
    },
    {
      label: "صفحة تواصل لونيفا",
      href: "/contact",
      icon: Globe,
      accent: "var(--brand)",
      bg: "rgba(255, 255, 255, 0.12)",
    },
  ];

  return (
    <div className={`luniva-social ${open ? "is-open" : ""} print:hidden`} dir="rtl">
      <div className="luniva-social__panel" id="luniva-social-card">
        <aside className="luniva-social__card" aria-hidden={!open}>
          <span className="luniva-social__aura" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <p className="luniva-social__title">تواصلي مع لونيفا</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-6 w-6 place-items-center rounded-full text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={13} />
            </button>
          </div>
          <p className="text-[10px] text-white/70 mt-1">نحن هنا للإجابة على كل استفساراتك</p>
          <div className="luniva-social__links">
            {links.map(({ label, href, icon: Icon, accent, bg }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                title={label}
                tabIndex={open ? 0 : -1}
                className="luniva-social__link"
                style={{ background: bg }}
              >
                <Icon size={16} aria-hidden="true" style={{ color: accent }} />
                <span className="text-[10px] font-bold text-white/90 truncate">{label}</span>
              </a>
            ))}
          </div>
          <p className="luniva-social__footer">لونيفا · دعم مباشر</p>
        </aside>
      </div>
      <button
        type="button"
        className="luniva-social__toggle group"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="luniva-social-card"
        aria-label={open ? "إغلاق نافذة التواصل" : "تواصل معنا"}
        title={open ? "إغلاق نافذة التواصل" : "تواصل معنا"}
      >
        <span className="luniva-social__toggle-icon">
          {open ? <X size={18} /> : <MessageCircle size={20} />}
        </span>
        <span className="luniva-social__toggle-label">
          {open ? "إغلاق" : "تواصل معنا"}
        </span>
      </button>
    </div>
  );
}
