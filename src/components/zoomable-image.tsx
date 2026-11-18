"use client";

import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ZoomableImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  images?: string[];
  initialIndex?: number;
  fit?: "cover" | "contain";
  placeholder?: ReactNode;
  showHint?: boolean;
};

/** A premium image viewer: hover hint, gallery navigation, zoom and full a11y. */
export default function ZoomableImage({
  src,
  alt,
  className = "",
  images,
  initialIndex = 0,
  fit = "cover",
  placeholder,
  showHint = true,
}: ZoomableImageProps) {
  const gallery = images?.length ? images : src ? [src] : [];
  const count = gallery.length;
  const safeInitial = count ? Math.min(Math.max(initialIndex, 0), count - 1) : 0;

  const [view, setView] = useState({ source: safeInitial, index: safeInitial });
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // When the parent changes the selected image, follow it without an effect-driven render.
  const index = view.source === safeInitial ? view.index : safeInitial;
  const setIndex = useCallback(
    (next: number) => setView({ source: safeInitial, index: next }),
    [safeInitial],
  );

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (direction: number) => {
      if (count < 2) return;
      setIndex((index + direction + count) % count);
      setZoomed(false);
    },
    [count, index, setIndex],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") go(1);
      if (event.key === "ArrowRight") go(-1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, close, go]);

  const current = gallery[index];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!count) return;
          setZoomed(false);
          setOpen(true);
        }}
        disabled={!count && !placeholder}
        className={`group relative block overflow-hidden ${className}`}
        aria-label={`فتح معرض صور ${alt}`}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={alt}
            loading="lazy"
            className={`h-full w-full transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none ${
              fit === "contain" ? "object-contain" : "object-cover"
            }`}
          />
        ) : (
          placeholder ?? (
            <span
              className="grid h-full w-full place-items-center text-xs font-black"
              style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))", color: "var(--brand-strong)" }}
            >
              لا توجد صورة
            </span>
          )
        )}
        {count > 0 && showHint && (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-white opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none"
            style={{ background: "color-mix(in srgb, var(--plum) 42%, transparent)" }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-white/15 backdrop-blur-sm">
              <Expand size={20} />
            </span>
          </span>
        )}
      </button>

      {open && count > 0 && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`معرض صور ${alt}`}
          onClick={close}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{ background: "color-mix(in srgb, var(--plum) 94%, #0d090c)", color: "#fff" }}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-black sm:text-sm">{alt}</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/55">
                {count > 1 ? `انقر على الصورة للتكبير · ${index + 1} من ${formatCount(count)}` : "انقر على الصورة للتكبير"}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="إغلاق المعرض"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 motion-reduce:transition-none"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-2 sm:px-16">
            {count > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                aria-label="الصورة السابقة"
                className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 motion-reduce:transition-none sm:right-5"
              >
                <ArrowRight size={20} />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={alt}
              onClick={(event) => {
                event.stopPropagation();
                setZoomed((value) => !value);
              }}
              className={`max-h-full max-w-full rounded-2xl object-contain shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${
                zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
            {count > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                aria-label="الصورة التالية"
                className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 motion-reduce:transition-none sm:left-5"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>

          {count > 1 && (
            <div
              className="no-scrollbar flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-4"
              onClick={(event) => event.stopPropagation()}
            >
              {gallery.map((item, itemIndex) => (
                <button
                  key={`${item}-${itemIndex}`}
                  type="button"
                  onClick={() => {
                    setIndex(itemIndex);
                    setZoomed(false);
                  }}
                  aria-label={`عرض الصورة ${itemIndex + 1}`}
                  aria-current={itemIndex === index}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition motion-reduce:transition-none"
                  style={{
                    borderColor: itemIndex === index ? "var(--brand)" : "rgba(255,255,255,.2)",
                    opacity: itemIndex === index ? 1 : 0.6,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("ar-EG");
}
