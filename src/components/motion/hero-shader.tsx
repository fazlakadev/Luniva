"use client";

import dynamic from "next/dynamic";

// WebGL only runs in the browser, so keep both Three.js and the renderer out of SSR.
// See node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md ("Skipping SSR").
const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((module) => module.ShaderAnimation),
  { ssr: false, loading: () => null },
);

export default function HeroShader() {
  return (
    <ShaderAnimation
      className="pointer-events-none absolute inset-0 z-0 opacity-60 mix-blend-multiply dark:opacity-25 dark:mix-blend-screen"
      base="#f9f5f3"
      rose="#a95d73"
      lavender="#6f5aa7"
      plum="#4f3040"
      speed={0.8}
    />
  );
}
