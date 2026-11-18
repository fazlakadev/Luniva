import { headers } from "next/headers";
import { invoiceQrDataUrl } from "@/lib/invoice-view";

/** Builds an absolute URL for a public site path without any invoice-token logic. */
export async function getPublicUrl(pathname: string) {
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}${suffix}`;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim()
    || requestHeaders.get("host")
    || "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}${suffix}`;
}

/** Public catalog share data for an admin product or package detail page. */
export async function getCatalogShareData(kind: "product" | "package", id: string) {
  const segment = kind === "product" ? "products" : "packages";
  const url = await getPublicUrl(`/catalog/${segment}/${encodeURIComponent(id)}`);
  const qr = await invoiceQrDataUrl(url);
  return { url, qr };
}
