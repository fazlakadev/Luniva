"use client";

import { useState } from "react";
import { AtSign, Globe, MessageCircle, Phone, Sparkles, X } from "lucide-react";

type SocialRailProps = {
  email?: string;
  phone?: string;
};

/** Gooey left-middle social card for public client pages. Collapses to a small tab when closed. */
export default function SocialRail({ email = "", phone = "" }: SocialRailProps) {
  const [open, setOpen] = useState(false);

  const phoneDigits = phone.replace(/[^\d]/g, "");
  const links = [
    { label: "راسلينا عبر البريد", href: email ? `mailto:${email}` : "/contact", icon: AtSign },
    { label: "اتصلي بنا", href: phoneDigits ? `tel:+${phoneDigits}` : "/contact", icon: Phone },
    {
      label: "تواصل عبر واتساب",
      href: phoneDigits ? `https://wa.me/${phoneDigits}` : "/contact",
      icon: MessageCircle,
    },
    { label: "صفحة تواصل لونيفا", href: "/contact", icon: Globe },
  ];

  return (
    <div className={`luniva-social ${open ? "is-open" : ""} print:hidden`}>
      <div className="luniva-social__panel" id="luniva-social-card">
        <aside className="luniva-social__card" aria-hidden={!open}>
          <span className="luniva-social__aura" aria-hidden="true" />
          <p className="luniva-social__title">تواصلي معنا</p>
          <div className="luniva-social__links">
            {links.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                title={label}
                tabIndex={open ? 0 : -1}
                className="luniva-social__link"
              >
                <Icon size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="luniva-social__footer">لونيفا · كل يوم</p>
        </aside>
      </div>
      <button
        type="button"
        className="luniva-social__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="luniva-social-card"
        aria-label={open ? "إخفاء وسائل التواصل" : "إظهار وسائل التواصل"}
        title={open ? "إخفاء وسائل التواصل" : "إظهار وسائل التواصل"}
      >
        {open ? <X size={16} /> : <Sparkles size={16} />}
      </button>
    </div>
  );
}
