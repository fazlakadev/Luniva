"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** A calm, tactile brand card: paper-thin layers and a soft pointer tilt. */
export default function BrandGlassCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType === "touch") return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
    card.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
    card.style.setProperty("--mx", `${x * 100}%`);
    card.style.setProperty("--my", `${y * 100}%`);
  }

  function reset() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  }

  return (
    <div className="luniva-3d-wrap mt-10">
      <div
        ref={cardRef}
        onPointerMove={move}
        onPointerLeave={reset}
        className="luniva-3d-card"
        aria-label="بطاقة هوية لونيفا"
      >
        <span aria-hidden="true" className="luniva-3d-card__aura" />
        <span aria-hidden="true" className="luniva-3d-card__weave" />
        <span aria-hidden="true" className="luniva-3d-card__edge" />

        <div className="relative z-10 grid min-w-0 gap-8 p-7 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="luniva-3d-card__seal">ل</span>
              <span className="luniva-3d-card__kicker">LUNIVA · ATELIER · 2026</span>
            </div>

            <h2 className="mt-5 max-w-xl text-[1.75rem] font-black leading-[1.3] tracking-tight text-white sm:text-[2.4rem]">
              قطعة من مصر،
              <span className="mt-1 block text-[color:var(--luniva-gold)]">
                بروح عصرية واضحة
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-[12px] leading-8 text-white/70 sm:text-[13px]">
              شركة ملابس نسائية مصرية تأسست عام 2026. نبني تجربة اختيار تجمع الذوق والوضوح: ألوان ومقاسات معلومة، وأسعار نهائية، وتفاصيل تكفي قبل أي قرار.
            </p>

            <div className="mt-6 grid max-w-lg grid-cols-3 gap-2">
              {[
                { value: "٢٠٢٦", label: "سنة التأسيس" },
                { value: "مصر", label: "الجذور" },
                { value: "١٠٠٪", label: "وضوح السعر" },
              ].map(({ value, label }) => (
                <div key={label} className="luniva-3d-card__stat">
                  <p className="text-[13px] font-black text-white sm:text-base">{value}</p>
                  <p className="mt-1 text-[9px] font-bold text-white/50">{label}</p>
                </div>
              ))}
            </div>

            <Link href="/catalog/products" className="luniva-3d-card__cta">
              <Sparkles size={14} />اكتشفي التشكيلة<ArrowLeft size={14} />
            </Link>
          </div>

          <div className="luniva-3d-card__showcase" aria-hidden="true">
            <span className="luniva-3d-card__panel luniva-3d-card__panel--back" />
            <span className="luniva-3d-card__panel luniva-3d-card__panel--mid" />
            <span className="luniva-3d-card__panel luniva-3d-card__panel--front">
              <span className="luniva-3d-card__monogram">ل</span>
              <span className="luniva-3d-card__brand">LUNIVA</span>
              <span className="luniva-3d-card__since">تأسست عام 2026</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
