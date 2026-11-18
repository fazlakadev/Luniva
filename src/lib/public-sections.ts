export type PublicSection =
  | "home"
  | "products"
  | "packages"
  | "product"
  | "package"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "faq";

export type PublicNavKey = PublicSection | "support";

// The catalog menu should only light up on catalog pages, never on the combined home page.
export function isCatalogMenuActive(section: PublicSection) {
  return (
    section === "products" ||
    section === "packages" ||
    section === "product" ||
    section === "package"
  );
}

export function isSupportSection(section: PublicSection) {
  return section === "faq" || section === "privacy" || section === "terms";
}
