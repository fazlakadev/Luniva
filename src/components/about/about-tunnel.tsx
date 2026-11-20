"use client";

import dynamic from "next/dynamic";

// The tunnel relies on browser motion values and pointer/rAF listeners, so it
// is loaded on the client only. Per Next.js docs, `ssr: false` must live in a
// Client Component (see dist/docs/01-app/02-guides/lazy-loading.md).
const PerspectiveTunnelHero = dynamic(
    () => import("@/components/ui/perspective-tunnel-hero"),
    {
        ssr: false,
        loading: () => (
            <div
                aria-hidden="true"
                className="h-[100svh] min-h-screen w-full"
                style={{
                    background:
                        "linear-gradient(160deg, color-mix(in srgb, var(--plum) 12%, var(--surface)), color-mix(in srgb, var(--lav) 16%, var(--bg)))",
                }}
            />
        ),
    },
);

export default function AboutTunnel() {
    return <PerspectiveTunnelHero />;
}
