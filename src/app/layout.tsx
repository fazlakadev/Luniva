import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luniva | إدارة العملاء",
  description: "نظام Luniva لإدارة علاقات العملاء",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <Script id="luniva-theme" strategy="beforeInteractive">{`try { document.documentElement.classList.toggle('dark', localStorage.getItem('luniva_theme') === 'dark'); } catch (_) {}`}</Script>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
