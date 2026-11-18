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

export function isCatalogSection(section: PublicSection) {
  return (
    section === "home" ||
    section === "products" ||
    section === "packages" ||
    section === "product" ||
    section === "package"
  );
}

export function isSupportSection(section: PublicSection) {
  return section === "faq" || section === "privacy" || section === "terms";
}
