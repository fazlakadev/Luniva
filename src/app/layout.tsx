import type { Metadata } from "next";
import Script from "next/script";
import "lenis/dist/lenis.css";
import RouteTransition from "@/components/motion/route-transition";
import SmoothScroll from "@/components/motion/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "لونيفا | إدارة العملاء",
  description: "نظام لونيفا لإدارة العملاء والمنتجات والبكدجات والفواتير والتحصيل.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <Script id="luniva-theme" strategy="beforeInteractive">{`try { document.documentElement.classList.toggle('dark', localStorage.getItem('luniva_theme') === 'dark'); } catch (_) {}`}</Script>
      </head>
      <body suppressHydrationWarning>
        <SmoothScroll>
          <RouteTransition>{children}</RouteTransition>
        </SmoothScroll>
      </body>
    </html>
  );
}
