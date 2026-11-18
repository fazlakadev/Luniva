"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The WebGL shader is client-only; keep it out of SSR just like the hero
// shader before it. See node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md.
const MoltenMetal = dynamic(() => import("@/components/ui/molten-metal"), {
  ssr: false,
  loading: () => null,
});

/** A barely-there molten layer behind the homepage only. */
export default function HomeAtmosphere() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  if (!animate) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 15% 25%, var(--brand-soft), transparent 38%), radial-gradient(circle at 85% 70%, var(--lav-soft), transparent 42%)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden opacity-[0.16] mix-blend-soft-light dark:opacity-[0.12] dark:mix-blend-screen"
    >
      <MoltenMetal
        colors={["#a95d73", "#6f5aa7"]}
        coreColor="#f4c2cf"
        backgroundColor="transparent"
        speed={0.3}
        scale={5}
        detail={2}
        glow={1.5}
        thickness={1}
        haze={0.65}
        brightness={1.15}
        colorMode="molten"
        rotation={0}
        drift={0.18}
        grain={0.02}
        opacity={0.9}
        intro
        mouseInteraction={false}
        flareOnClick={false}
        dpr={1.5}
      />
    </div>
  );
}
