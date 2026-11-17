import type { MetadataRoute } from "next";

// The whole system is private. Public invoice links are signed and must never
// be discovered by crawlers; they are only shared directly with the customer.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
