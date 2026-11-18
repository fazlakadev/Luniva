"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/** A tactile glass card that tilts toward the pointer without disturbing the layout. */
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
    card.style.setProperty("--rx", `${(0.5 - y) * 9}deg`);
    card.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
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
        aria-label="بطاقة لونيفا"
      >
        <span aria-hidden="true" className="luniva-3d-card__aura" />
        <span aria-hidden="true" className="luniva-3d-card__grid" />
        <span aria-hidden="true" className="luniva-3d-card__shine" />
        <span aria-hidden="true" className="luniva-3d-card__edge" />

        <div className="relative z-10 grid min-w-0 gap-7 p-6 sm:p-9 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.18em] text-[#f4c2cf]">LUNIVA · IDENTITY</p>
            <h2 className="mt-3 max-w-xl text-[1.7rem] font-black leading-[1.35] text-white sm:text-[2.35rem]">
              قطعة من مصر،
              <span className="mt-1 block bg-gradient-to-l from-[#ffd9e4] via-[#e7a3b6] to-[#c5b4f1] bg-clip-text text-transparent">
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
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur-md">
                  <p className="text-[13px] font-black text-white sm:text-base">{value}</p>
                  <p className="mt-1 text-[9px] font-bold text-white/50">{label}</p>
                </div>
              ))}
            </div>

            <Link href="/catalog/products" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-black text-[#6b3548] transition hover:bg-white/90">
              <Sparkles size={14} />اكتشفي التشكيلة<ArrowLeft size={14} />
            </Link>
          </div>

          <div className="relative mx-auto grid h-[190px] w-[190px] place-items-center sm:h-[230px] sm:w-[230px]">
            <span aria-hidden="true" className="luniva-3d-card__orbit luniva-3d-card__orbit--one" />
            <span aria-hidden="true" className="luniva-3d-card__orbit luniva-3d-card__orbit--two" />
            <span className="relative grid h-[112px] w-[112px] place-items-center rounded-[2rem] border border-white/20 bg-white/10 text-center shadow-[0_20px_60px_rgba(92,36,58,0.35)] backdrop-blur-xl sm:h-[132px] sm:w-[132px]">
              <span>
                <span className="block text-[10px] font-black tracking-[0.2em] text-white/60">LUNIVA</span>
                <span className="mt-1 block text-[11px] font-black text-white">لونيفا</span>
                <span className="mt-1 block text-[8px] font-bold text-white/50">تأسست عام 2026</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
