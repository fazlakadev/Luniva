"use client";

// TurningPortraitHero · Built with Systra Tools: https://systra.tools
// Adapted for Luniva: Arabic copy, brand colours and internal links.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Gift, Package, Ruler, ShieldCheck } from "lucide-react";

/* A hero in which the person follows the mouse. She does not stand on one
   picture but on 122 frames of a turn: the horizontal mouse position says
   which of them is on screen. Move left and she turns with you, stop and she
   breathes slowly around the last position.

   That is the whole section, and deliberately only that. A hero where the
   picture, the cards, the button and the background all move at once has no
   idea, only effects.

   Drawn onto a canvas and not as a stack of <img>. That is not taste, it is
   the difference between calm and flickering: two half transparent images on
   top of each other both let the ground through, so the surface darkens
   between two frames and brightens again on every whole number. While moving
   that pulses. On the canvas the lower frame lies opaque and only the upper
   one is added with its share, and there is no in between.

   Loading runs in two passes: every sixth frame first, then the gaps. Until a
   frame is there the nearest loaded one stands in, which reads as a slightly
   coarser turn and never as a hole. The middle frame comes first and carries
   the first look. No loading bar in front of it: a hero you only see after
   the load is not a hero, it is a black surface with a percentage on it.

   The number in the proof counts up once when the section comes into view.
   Under reduced motion one frame stands, the number is there at once, and the
   pointer turns nothing. */

const ANZAHL = 122;
const PFAD = "/sequences/turn-to-cursor/";
/** First pass: every sixth frame. */
const SCHRITT = 6;
/** The frames are 1280 by 720. */
const BILD_B = 1280;
const BILD_H = 720;
const MITTE = Math.floor((ANZAHL - 1) / 2);
const GRUND = "#241820";

/* One grotesque for the whole section. It carries everything from the headline
   down to the smallest line in the strip; the difference between the levels
   comes from size and weight alone, which is what a variable face is for. The
   mono of the labels stays beside it as the one accent. Falls back to the
   system font while the file is not there. */
const GROTESK = '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif';

const EASE = [0.16, 1, 0.3, 1] as const;
const AKZENT = "#e7a3b6";

/* How far the mouse drives the turn. Below one, so there is travel left at
   the edges of the section and the turn does not hit its end. */
const SPANNE = 0.84;
/* Lag per frame. Without it the turn sticks to the pointer and feels like a
   slider, not like a head turning. */
const NACHLAUF = 0.055;
/* After this much stillness the breathing starts. */
const RUHE_MS = 3600;

const quelle = (i: number) => `${PFAD}f_${String(i + 1).padStart(4, "0")}.webp`;

const KARTEN = [
  {
    icon: Package,
    label: "التشكيلة",
    titel: "منتجات مُنتقاة",
    text: "قطع يومية وخيارات للمناسبات في مكان واحد.",
    wert: "✓",
  },
  {
    icon: Ruler,
    label: "المقاسات",
    titel: "كل مقاس واضح",
    text: "تعرفي اللون والمقاس قبل أن تختاري.",
    wert: "S–XL",
  },
  {
    icon: ShieldCheck,
    label: "الأسعار",
    titel: "بعد الخصم",
    text: "السعر النهائي ظاهر بلا خطوات إضافية.",
    wert: "%",
  },
];

/** The nearest frame that has already arrived. While the second pass is
    still running a neighbour stands in rather than leaving a hole. */
function naechstesDa(liste: (HTMLImageElement | undefined)[], i: number) {
  for (let d = 0; d < ANZAHL; d += 1) {
    if (liste[i - d]) return liste[i - d];
    if (liste[i + d]) return liste[i + d];
  }
  return undefined;
}

/** Drawn opaque and filling the frame: a picture is never stretched, only
    cropped. */
function deckend(
  ctx: CanvasRenderingContext2D,
  c: HTMLCanvasElement,
  bild: HTMLImageElement,
  alpha: number,
) {
  const verhaeltnis = BILD_B / BILD_H;
  const flaeche = c.width / c.height;
  const bw = verhaeltnis > flaeche ? c.height * verhaeltnis : c.width;
  const bh = verhaeltnis > flaeche ? c.height : c.width / verhaeltnis;
  ctx.globalAlpha = alpha;
  ctx.drawImage(bild, (c.width - bw) / 2, (c.height - bh) / 2, bw, bh);
}

/** Counts up once, as soon as the section is in view. */
function Hochzaehler({ bis, aktiv }: { bis: number; aktiv: boolean }) {
  const reduce = useReducedMotion();
  const [wert, setWert] = useState(0);

  useEffect(() => {
    if (!aktiv) return;
    if (reduce) {
      // The reduced-motion path sets the final value once when the section enters view.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWert(bis);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const dauer = 1350;
    const tick = (jetzt: number) => {
      const p = Math.min(1, (jetzt - start) / dauer);
      setWert(Math.round(bis * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [aktiv, bis, reduce]);

  return <>{wert.toLocaleString("en-GB")}</>;
}

export function TurningPortraitHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const imBild = useInView(ref, { once: true, amount: 0.35 });

  const leinwand = useRef<HTMLCanvasElement>(null);
  const bilder = useRef<(HTMLImageElement | undefined)[]>([]);
  const stand = useRef(MITTE);
  const ziel = useRef(MITTE);
  const mitteRuhe = useRef(MITTE);
  const letzteBewegung = useRef(0);
  /** Does the turn follow the pointer yet? Only once the coarse grid is in. */
  const folgt = useRef(false);
  /** Last pointer position, as a fraction of the width. Null until there is one. */
  const zeigerX = useRef<number | null>(null);

  /* The angle of the arrow in the button. It points at the pointer wherever
     that is: the button looks back, just like the person. */
  const winkel = useMotionValue(-35);

  /** Points the turn at a fraction of the section width. */
  const setzeZiel = useCallback((x: number) => {
    ziel.current = MITTE + (x - 0.5) * (ANZAHL - 1) * SPANNE;
    mitteRuhe.current = ziel.current;
    letzteBewegung.current = performance.now();
  }, []);

  /* Only refs inside, so it is stable. Without useCallback every effect
     would hang on a function that is rebuilt on each render. */
  const zeichne = useCallback((f: number) => {
    const c = leinwand.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;

    const kasten = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(kasten.width * dpr);
    const h = Math.round(kasten.height * dpr);
    if (w > 0 && h > 0 && (c.width !== w || c.height !== h)) {
      c.width = w;
      c.height = h;
    }

    const wert = Math.max(0, Math.min(ANZAHL - 1, f));
    const unten = Math.floor(wert);
    const oben = Math.min(ANZAHL - 1, unten + 1);
    const anteil = wert - unten;

    ctx.globalAlpha = 1;
    ctx.fillStyle = GRUND;
    ctx.fillRect(0, 0, c.width, c.height);

    /* The lower frame lies opaque, the upper one is added with its share.
       That is exactly why a canvas: with two half transparent <img> the
       ground would come through both and the surface would darken in between,
       brightening again on every whole number. While moving that pulses. */
    const a = naechstesDa(bilder.current, unten);
    if (a) deckend(ctx, c, a, 1);
    const b = naechstesDa(bilder.current, oben);
    if (b && b !== a && anteil > 0.001) deckend(ctx, c, b, anteil);
    ctx.globalAlpha = 1;
  }, []);

  // Loading: the middle frame first, then every sixth, then the gaps.
  useEffect(() => {
    let lebt = true;
    const hole = (i: number) =>
      new Promise<void>((fertig) => {
        if (bilder.current[i]) return fertig();
        const im = new Image();
        im.decoding = "async";
        im.onload = () => {
          if (lebt) {
            bilder.current[i] = im;
            zeichne(stand.current);
          }
          fertig();
        };
        im.onerror = () => fertig();
        im.src = quelle(i);
      });

    const reihe = async (liste: number[], gleichzeitig: number) => {
      for (let i = 0; i < liste.length && lebt; i += gleichzeitig) {
        await Promise.all(liste.slice(i, i + gleichzeitig).map(hole));
      }
    };

    (async () => {
      await hole(MITTE);
      const grob: number[] = [];
      for (let i = 0; i < ANZAHL; i += SCHRITT) grob.push(i);
      await reihe(grob, 6);
      /* From here the coarse grid is in and the turn may follow the pointer.
         Before that every move would be a jump from one loaded frame to the
         next: measured, after one second not a single frame had arrived,
         after three seconds 109 of 122. Anyone moving the mouse straight away
         used to get that coarse version. Now the figure holds its middle
         until the grid is there, and the turn eases in afterwards, because
         the lag catches up in small steps anyway. */
      folgt.current = true;
      if (zeigerX.current !== null) setzeZiel(zeigerX.current);
      if (reduce) return;
      const rest = Array.from({ length: ANZAHL }, (_, i) => i).filter((i) => !bilder.current[i]);
      await reihe(rest, 8);
    })();

    return () => {
      lebt = false;
    };
  }, [reduce, zeichne, setzeZiel]);

  useEffect(() => {
    const c = leinwand.current;
    if (!c) return;
    const beobachter = new ResizeObserver(() => zeichne(stand.current));
    beobachter.observe(c);
    return () => beobachter.disconnect();
  }, [zeichne]);

  useEffect(() => {
    if (reduce) {
      zeichne(MITTE);
      return;
    }
    let frame = 0;
    const lauf = (t: number) => {
      // With no pointer the turn breathes slowly around its last position.
      // While the grid loads the same applies: the figure holds its middle
      // instead of following the pointer. None of that is visible until
      // enough frames are there, before that there is only one to draw.
      if (!folgt.current || (letzteBewegung.current && t - letzteBewegung.current > RUHE_MS)) {
        ziel.current = mitteRuhe.current + Math.sin(t * 0.00043) * 5;
      }
      const z = Math.max(0, Math.min(ANZAHL - 1, ziel.current));
      const naechster = stand.current + (z - stand.current) * NACHLAUF;
      if (Math.abs(naechster - stand.current) > 0.0005) {
        stand.current = naechster;
        zeichne(naechster);
      }
      frame = requestAnimationFrame(lauf);
    };
    frame = requestAnimationFrame(lauf);
    return () => cancelAnimationFrame(frame);
  }, [reduce, zeichne]);

  const bewegen = (e: ReactPointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const k = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - k.left) / k.width));
    /* While the coarse grid is still loading the position is only
       remembered. It is applied once the grid is in: someone who moves the
       mouse and then leaves it there should not have to move again. */
    zeigerX.current = x;
    if (folgt.current) setzeZiel(x);

    const knopf = ref.current.querySelector<HTMLElement>("[data-orbit]");
    if (knopf) {
      const r = knopf.getBoundingClientRect();
      winkel.set(
        (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) /
          Math.PI,
      );
    }
  };

  const auftritt = (verzug: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.3 : 0.9, delay: reduce ? 0 : verzug, ease: EASE },
  });

  /* The headline lines come out from under an edge. The clip sits on the
     line's own wrapper, not on the h1: a filter or a mask on the h1 would
     lock the order of the layers inside it. */
  const zeile = (verzug: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { y: "105%", opacity: 0, filter: "blur(5px)" },
          animate: { y: "0%", opacity: 1, filter: "blur(0px)" },
          transition: { duration: 1.05, delay: verzug, ease: EASE },
        };

  return (
    <section
      ref={ref}
      onPointerMove={bewegen}
      dir="rtl"
      className="relative isolate flex h-[100svh] min-h-0 w-full flex-col overflow-hidden bg-[var(--plum)] text-[#fff7fa]"
      style={{ fontFamily: GROTESK }}
    >
      <canvas ref={leinwand} aria-hidden className="absolute inset-0 z-0 h-full w-full" />
      <p className="sr-only">بورتريه متحرك لقطع لونيفا، يتغيّر اتجاهه مع حركة المؤشر.</p>

      {/* The colour step keeps the Arabic copy readable on the right while
          leaving the portrait bright on the left. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(270deg, rgba(20,12,17,.9) 0%, rgba(20,12,17,.66) 25%, rgba(20,12,17,.22) 50%, rgba(20,12,17,.05) 70%, rgba(20,12,17,.34) 100%), linear-gradient(180deg, rgba(0,0,0,.26), transparent 34%, rgba(0,0,0,.08) 66%, rgba(0,0,0,.5))",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{ boxShadow: "inset 0 0 170px 42px rgba(0,0,0,.28)" }}
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col px-5 pb-5 pt-24 sm:px-8 sm:pt-28 md:pb-7">
        <div className="flex flex-1 items-center gap-8 py-3 lg:grid lg:grid-cols-[minmax(0,640px)_1fr_minmax(260px,320px)]">
          <div className="min-w-0 max-w-[94vw] md:max-w-[620px]">
            <motion.p
              className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[.02em] text-white/60 md:text-[12px]"
              {...auftritt(0.22)}
            >
              <span className="text-white/90">لونيفا</span>
              <span aria-hidden>·</span>
              <span>شركة ملابس نسائية مصرية</span>
              <span aria-hidden>·</span>
              <span>تأسست عام 2026</span>
            </motion.p>

            <h1 className="m-0 max-w-[640px] text-right text-[clamp(30px,4.4vw,60px)] font-semibold leading-[1.28] tracking-[-.015em]">
              <span className="block overflow-hidden pb-[.16em]">
                <motion.span className="block" {...zeile(0.3)}>
                  قطع تليق بك
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[.16em]">
                <motion.span className="block" {...zeile(0.39)}>
                  وتظل في بالك
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[.16em]">
                <motion.span className="block text-white/75" {...zeile(0.48)}>
                  بعد أول نظرة
                </motion.span>
              </span>
            </h1>

            <motion.p
              className="mt-4 max-w-[440px] text-right text-[12px] leading-[1.8] text-white/65 md:text-[14px]"
              {...auftritt(0.64)}
            >
              حرّكي المؤشر لتري القطعة من زاوية أخرى، وتعرفي الألوان والمقاسات والتفاصيل الكاملة قبل أن تقرري.
            </motion.p>

            <motion.div
              className="mt-5 grid grid-cols-[76px_1fr] items-center gap-4 md:mt-6 md:grid-cols-[104px_1fr] md:gap-6"
              {...auftritt(0.78)}
            >
              <Link
                href="/catalog/products"
                data-orbit
                aria-label="تصفّح منتجات لونيفا"
                className="group relative grid h-[76px] w-[76px] place-items-center md:h-[104px] md:w-[104px]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-6 rounded-full opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-125 group-hover:opacity-100 motion-reduce:transition-none"
                  style={{ background: `radial-gradient(circle, ${AKZENT}33, transparent 68%)` }}
                />
                <svg
                  viewBox="0 0 118 118"
                  aria-hidden
                  className={`absolute inset-0 h-full w-full ${reduce ? "" : "motion-safe:animate-[spin_21s_linear_infinite] group-hover:motion-safe:animate-[spin_10s_linear_infinite]"}`}
                >
                  <defs>
                    <path id="luniva-ring" d="M59,59 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
                  </defs>
                  <text
                    fill="rgba(255,255,255,.8)"
                    style={{ fontSize: "8.2px", fontWeight: 600, letterSpacing: "1.1px" }}
                  >
                    <textPath href="#luniva-ring" startOffset="0%">
                      LUNIVA · CATALOG · 2026 ·
                    </textPath>
                  </text>
                </svg>
                <motion.span
                  aria-hidden
                  className="grid h-[33px] w-[33px] place-items-center"
                  style={{ rotate: reduce ? 145 : winkel }}
                >
                  <ArrowLeft className="h-6 w-6" strokeWidth={1.6} />
                </motion.span>
              </Link>

              <div className="min-w-0">
                <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <strong className="text-[21px] leading-none font-semibold tracking-[-.02em] md:text-[26px]">
                    <Hochzaehler bis={2026} aktiv={imBild} />
                  </strong>
                  <em className="text-[11px] not-italic text-white/50">سنة التأسيس</em>
                </span>
                <p className="mt-2 max-w-[260px] text-[11px] leading-[1.7] text-white/50 md:text-[12px]">
                  <b className="font-semibold text-white/80">تفاصيل واضحة في كل قطعة.</b>
                  <br />
                  عرض صادق، وأسعار نهائية، وتفاصيل تكفي قبل الطلب.
                </p>
              </div>
            </motion.div>

            <motion.div className="mt-6 flex flex-wrap gap-2" {...auftritt(0.86)}>
              <Link href="/catalog/products" className="btn btn-primary px-4 py-2.5 text-[11px]">
                <Package size={14} />تصفّح المنتجات <ArrowLeft size={14} />
              </Link>
              <Link
                href="/catalog/packages"
                className="btn px-4 py-2.5 text-[11px] border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <Gift size={14} />البكدجات
              </Link>
            </motion.div>
          </div>

          <div aria-hidden className="hidden lg:block" />

          <motion.aside
            className="hidden w-full max-w-[320px] flex-col gap-3 justify-self-end lg:flex"
            aria-label="ما يميّز لونيفا"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0.3 : 0.95, delay: reduce ? 0 : 0.6, ease: EASE }}
          >
            {KARTEN.map(({ icon: Icon, label, titel, text, wert }) => (
              <article
                key={label}
                className="min-h-[118px] rounded-[16px] border border-white/10 bg-white/[0.06] p-[17px] backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-x-[6px] motion-reduce:transition-none"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/45">{label}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/10 text-white/80">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                </span>
                <span className="mt-4 grid grid-cols-[1fr_auto] items-end gap-5">
                  <span>
                    <span className="block text-[15px] font-semibold">{titel}</span>
                    <span className="mt-1 block text-[11px] leading-[1.5] text-white/45">{text}</span>
                  </span>
                  <span className="text-[20px] leading-[.9] font-semibold text-white/90">{wert}</span>
                </span>
              </article>
            ))}
          </motion.aside>
        </div>

        <motion.footer
          className="hidden items-end justify-between gap-4 px-2 text-[11px] leading-[1.6] text-white/45 md:flex"
          {...auftritt(1)}
        >
          <span>لونيفا · شركة ملابس نسائية مصرية</span>
          <span className="text-left">
            <b className="font-semibold text-white/75">عرض واضح وأسعار نهائية.</b> كل التفاصيل قبل أن تقرري.
          </span>
        </motion.footer>
      </div>
    </section>
  );
}

export default TurningPortraitHero;
