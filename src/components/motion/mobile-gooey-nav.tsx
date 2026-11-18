"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Gift, Home, Mail, Package } from "lucide-react";

// Client-only WebGL navigation; the component falls back to CSS when WebGL2
// is unavailable or reduced motion is requested.
const GooeyNav = dynamic(() => import("@/components/ui/gooey-nav"), {
  ssr: false,
  loading: () => null,
});

const ITEMS = [
  { label: "الرئيسية", href: "/", icon: <Home size={16} /> },
  { label: "المنتجات", href: "/catalog/products", icon: <Package size={16} /> },
  { label: "البكدجات", href: "/catalog/packages", icon: <Gift size={16} /> },
  { label: "تواصل", href: "/contact", icon: <Mail size={16} /> },
];

function activeIndexFor(pathname: string) {
  if (pathname.startsWith("/catalog/products")) return 1;
  if (pathname.startsWith("/catalog/packages")) return 2;
  if (pathname.startsWith("/contact")) return 3;
  return 0;
}

export default function MobileGooeyNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const activeIndex = activeIndexFor(pathname);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto">
        <GooeyNav
          items={ITEMS}
          activeIndex={activeIndex}
          onChange={(index, item) => {
            if (index !== activeIndex) router.push(item.href);
          }}
          theme="dark"
          color="#a95d73"
          activeTextColor="#fff7fa"
          colors={["#e7a3b6", "#c5b4f1", "#f4c2cf"]}
          size="sm"
          frame
          particleCount={12}
          spread={44}
          animationTime={560}
          timeVariance={240}
          gooeyness={0.45}
          wobble={0.45}
          hoverEffect
        />
      </div>
    </div>
  );
}
