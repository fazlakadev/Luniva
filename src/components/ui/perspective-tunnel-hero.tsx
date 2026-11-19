"use client";

// PerspectiveTunnelHero · adapted for the About page.
// Nine local frames from the turning-portrait sequence fly through a 3D
// corridor. Wheel and drag nudge the tunnel only while the pointer is inside
// the hero, and nothing ever calls preventDefault: the page keeps scrolling.
import Link from "next/link";
import {
    motion,
    useTransform,
    useReducedMotion,
    useMotionValue,
    useSpring,
    type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Spread across the 122 available frames (1280×720). */
const FRAME_NUMBERS = [1, 16, 31, 46, 61, 76, 91, 106, 122];
const FRAME_LABELS = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

const IMAGES = FRAME_NUMBERS.map((frame, i) => ({
    src: `/sequences/turn-to-cursor/f_${String(frame).padStart(4, "0")}.webp`,
    title: `لحظة ${FRAME_LABELS[i]}`,
}));

interface TunnelCardData {
    item: { src: string; title: string };
    angleCos: number;
    angleSin: number;
    radiusFactorX: number;
    radiusFactorY: number;
    rotationZ: number;
    index: number;
}

const TUNNEL_CARDS: TunnelCardData[] = IMAGES.map((item, i) => {
    const goldenAngle = i * 137.5 * (Math.PI / 180);
    const radiusFactorX = 0.26 + (i % 3) * 0.07;
    const radiusFactorY = 0.3 + (i % 2) * 0.08;

    return {
        item,
        angleCos: Math.cos(goldenAngle),
        angleSin: Math.sin(goldenAngle),
        radiusFactorX,
        radiusFactorY,
        rotationZ: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
        index: i,
    };
});

const SPRING_CONFIG = { stiffness: 60, damping: 25, mass: 0.5 };
const PARALLAX_SPRING = { stiffness: 60, damping: 25, mass: 0.5 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface StageDimensions {
    width: number;
    height: number;
    isMobile: boolean;
}

/** Pointer parallax is scoped to the hero, never to the whole window. */
function useCameraParallax(containerRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const x = useSpring(rawX, PARALLAX_SPRING);
    const y = useSpring(rawY, PARALLAX_SPRING);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        if (!enabled) {
            rawX.set(0);
            rawY.set(0);
            return;
        }

        const onMove = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            rawX.set(((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2);
            rawY.set(((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2);
        };
        const reset = () => {
            rawX.set(0);
            rawY.set(0);
        };

        el.addEventListener("pointermove", onMove, { passive: true });
        el.addEventListener("pointerleave", reset);
        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", reset);
        };
    }, [containerRef, enabled, rawX, rawY]);

    return { x, y };
}

interface TunnelCardProps {
    card: TunnelCardData;
    progress: MotionValue<number>;
    pointer: { x: MotionValue<number>; y: MotionValue<number> };
    total: number;
    stage: StageDimensions;
}

function TunnelCard({ card, progress, pointer, total, stage }: TunnelCardProps) {
    const staggerSpan = 0.55;
    const start = (card.index / total) * (1 - staggerSpan);
    const end = start + staggerSpan;

    const localProgress = useTransform(progress, [start, end], [0, 1]);

    const farZ = stage.isMobile ? -900 : -1400;
    const nearZ = stage.isMobile ? 260 : 420;
    const z = useTransform(localProgress, [0, 1], [farZ, nearZ]);
    const opacity = useTransform(localProgress, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);

    // The source frames are 16:9, so keep them close to that shape.
    const cardWidth = stage.isMobile
        ? Math.max(116, Math.min(172, stage.width * 0.44))
        : Math.max(168, Math.min(264, stage.width * 0.18));

    const baseX = card.angleCos * (stage.width * card.radiusFactorX);
    const baseY = card.angleSin * (stage.height * card.radiusFactorY);
    const panStrength = stage.isMobile ? 18 : 42;

    const transform = useTransform(
        [z, pointer.x, pointer.y],
        ([currZ, px, py]: number[]) => {
            const offsetX = baseX - px * panStrength;
            const offsetY = baseY - py * panStrength;
            return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${card.rotationZ}deg)`;
        },
    );

    return (
        <motion.div
            style={{ width: cardWidth, transform, opacity, zIndex: card.index + 1 }}
            className="pointer-events-auto absolute left-1/2 top-1/2 aspect-[16/10] select-none will-change-transform"
        >
            <div
                className="relative h-full w-full overflow-hidden rounded-xl transition-transform duration-500 hover:scale-[1.04] motion-reduce:transition-none"
                style={{
                    background: "var(--plum)",
                    boxShadow:
                        "0 0 0 1px color-mix(in srgb, var(--lav) 40%, transparent), 0 22px 52px -18px color-mix(in srgb, var(--plum) 60%, transparent)",
                }}
            >
                <img
                    src={card.item.src}
                    alt={card.item.title}
                    draggable={false}
                    className="h-full w-full object-cover"
                />
                <div
                    className="absolute inset-0 flex items-end p-2.5"
                    style={{
                        background:
                            "linear-gradient(to top, color-mix(in srgb, var(--plum) 90%, transparent), transparent 72%)",
                    }}
                >
                    <span className="text-[10px] font-black text-white drop-shadow-sm">
                        {card.item.title}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default function PerspectiveTunnelHero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();

    const [stage, setStage] = useState<StageDimensions>({
        width: 960,
        height: 480,
        isMobile: false,
    });

    // The tunnel starts part-way in so the first frames are already visible.
    const rawProgress = useMotionValue(0.18);
    const hasInteracted = useRef(false);
    const drag = useRef({ active: false, startY: 0, startProgress: 0.18 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => {
            const rect = el.getBoundingClientRect();
            setStage({
                width: rect.width,
                height: rect.height,
                isMobile: rect.width < 768,
            });
        };

        update();
        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(update);
            observer.observe(el);
            return () => observer.disconnect();
        }
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Wheel advances the corridor, but never cancels the browser scroll.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || reduce) return;

        const onWheel = (e: WheelEvent) => {
            hasInteracted.current = true;
            rawProgress.set(clamp01(rawProgress.get() + e.deltaY * 0.0009));
        };

        el.addEventListener("wheel", onWheel, { passive: true });
        return () => el.removeEventListener("wheel", onWheel);
    }, [reduce, rawProgress]);

    // Touch / pen / mouse drag fallback. Again: no preventDefault anywhere.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || reduce) return;

        const onDown = (e: PointerEvent) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            if ((e.target as HTMLElement | null)?.closest("a, button")) return;
            drag.current = {
                active: true,
                startY: e.clientY,
                startProgress: rawProgress.get(),
            };
            hasInteracted.current = true;
        };
        const onMove = (e: PointerEvent) => {
            if (!drag.current.active) return;
            const delta = (drag.current.startY - e.clientY) / Math.max(1, stage.height * 0.85);
            rawProgress.set(clamp01(drag.current.startProgress + delta));
        };
        const onUp = () => {
            drag.current.active = false;
        };

        el.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        return () => {
            el.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, [reduce, rawProgress, stage.height]);

    // A very slow idle drift until the visitor takes over. Disabled entirely
    // for reduced motion, along with the pointer spring and drag/wheel input.
    useEffect(() => {
        if (reduce) return;

        let frame = 0;
        let last = performance.now();
        let direction = 1;

        const step = (now: number) => {
            const elapsed = Math.min(64, now - last);
            last = now;
            if (!hasInteracted.current) {
                const next = rawProgress.get() + (direction * elapsed) / 18000;
                if (next >= 1) {
                    direction = -1;
                    rawProgress.set(1);
                } else if (next <= 0) {
                    direction = 1;
                    rawProgress.set(0);
                } else {
                    rawProgress.set(next);
                }
            }
            frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [reduce, rawProgress]);

    const smoothProgress = useSpring(rawProgress, {
        stiffness: 80,
        damping: 30,
        restDelta: 0.0001,
    });
    const progress = reduce ? rawProgress : smoothProgress;
    const pointer = useCameraParallax(containerRef, !reduce);

    const titleScale = useTransform(progress, [0, 0.5, 1], [0.88, 1, 1.12]);
    const titleOpacity = useTransform(progress, [0, 0.08, 0.86, 1], [0.4, 1, 1, 0.25]);
    const promptOpacity = useTransform(progress, [0, 0.05, 0.88, 1], [1, 1, 1, 0]);

    return (
        <div
            ref={containerRef}
            dir="rtl"
            className="relative h-[70svh] min-h-[26rem] max-h-[46rem] w-full overflow-hidden rounded-[1.75rem] border sm:rounded-[2.25rem]"
            style={{
                borderColor: "color-mix(in srgb, var(--lav) 28%, transparent)",
                background:
                    "linear-gradient(160deg, color-mix(in srgb, var(--plum) 12%, var(--surface)), color-mix(in srgb, var(--lav) 16%, var(--bg)))",
                color: "var(--ink)",
                perspective: stage.isMobile ? "900px" : "1200px",
                transformStyle: "preserve-3d",
            }}
        >
            {/* Brand-toned grid and glow. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--lav) 34%, transparent) 1px, transparent 0)",
                    backgroundSize: "28px 28px",
                    maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 58%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 58%, transparent 100%)",
                }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(circle at center, color-mix(in srgb, var(--brand) 20%, transparent) 0%, transparent 70%)",
                }}
            />

            {/* Depth guides. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute h-[42vmin] w-[42vmin] rounded-full border"
                style={{ borderColor: "color-mix(in srgb, var(--brand) 22%, transparent)" }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute h-[64vmin] w-[64vmin] rounded-full border border-dashed"
                style={{ borderColor: "color-mix(in srgb, var(--lav) 30%, transparent)" }}
            />

            {/* Arabic copy sits above the cards; only the links catch clicks. */}
            <motion.div
                style={reduce ? { opacity: 1, scale: 1 } : { scale: titleScale, opacity: titleOpacity }}
                className="pointer-events-none relative z-30 flex h-full items-center justify-center px-4 text-center"
            >
                <div
                    className="max-w-[34rem] rounded-[1.5rem] px-5 py-5 sm:px-8 sm:py-6"
                    style={{
                        background: "color-mix(in srgb, var(--surface) 78%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--lav) 36%, transparent)",
                        boxShadow: "var(--shadow-md)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                    }}
                >
                    <p
                        className="text-[10px] font-black tracking-[0.16em] sm:text-xs"
                        style={{ color: "var(--brand-strong)" }}
                    >
                        لونيفا · رحلة في العمق
                    </p>
                    <h2
                        className="mt-3 text-[2rem] font-black leading-[1.15] sm:text-[3rem] lg:text-[3.5rem]"
                        style={{
                            backgroundImage:
                                "linear-gradient(180deg, var(--plum) 0%, var(--brand-strong) 58%, var(--lav-strong) 100%)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            color: "transparent",
                        }}
                    >
                        جمال يتجدد
                        <span className="mt-1 block">خطوة أقرب للأناقة</span>
                    </h2>
                    <p
                        className="mx-auto mt-4 max-w-[38ch] text-[11px] font-bold leading-7 sm:text-[13px]"
                        style={{ color: "var(--ink)" }}
                    >
                        من تفصيلة إلى تفصيلة، نأخذك في رحلة قصيرة داخل عالم لونيفا؛ حيث يلتقي اللون بالحركة، وتتحول كل لحظة إلى إلهام لاختيارك القادم.
                    </p>
                    <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-2">
                        <Link href="/catalog/products" className="btn btn-primary px-3.5 py-2 text-[11px]">
                            تصفّح المنتجات
                        </Link>
                        <Link href="/contact" className="btn btn-outline px-3.5 py-2 text-[11px]">
                            تواصل معنا
                        </Link>
                    </div>
                </div>
            </motion.div>

            <motion.div
                style={reduce ? undefined : { opacity: promptOpacity }}
                className="pointer-events-none absolute bottom-4 z-20 flex flex-col items-center gap-1.5 text-[9px] font-black tracking-[0.14em] sm:bottom-6 sm:text-[10px]"
            >
                <span style={{ color: "var(--brand-strong)" }}>
                    {reduce ? "اكتشفي تشكيلتنا" : "مرّري أو اسحبي للاستكشاف"}
                </span>
                <span
                    aria-hidden="true"
                    className="h-5 w-px"
                    style={{ background: "linear-gradient(to bottom, var(--brand), transparent)" }}
                />
            </motion.div>

            {/* 3D Z-space plane. */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
            >
                {TUNNEL_CARDS.map((card, i) => (
                    <TunnelCard
                        key={i}
                        card={card}
                        progress={progress}
                        pointer={pointer}
                        total={TUNNEL_CARDS.length}
                        stage={stage}
                    />
                ))}
            </div>
        </div>
    );
}
