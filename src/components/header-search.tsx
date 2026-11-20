"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** A compact, Luniva-toned search field for the public header and mobile drawer. */
export default function HeaderSearch({
  fullWidth = false,
  className = "",
  placeholder = "ابحثي في لونيفا...",
  onSearch,
}: {
  fullWidth?: boolean;
  className?: string;
  placeholder?: string;
  onSearch?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    onSearch?.();
    router.push(trimmed ? `/catalog/products?q=${encodeURIComponent(trimmed)}` : "/catalog/products");
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`header-search group ${fullWidth ? "!w-full !max-w-none" : ""} ${className}`.trim()}
      aria-label="البحث في كتالوج لونيفا"
    >
      <span aria-hidden="true" className="header-search__glow" />
      <span aria-hidden="true" className="header-search__edge" />
      <Search aria-hidden="true" className="header-search__icon" size={15} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        name="q"
        placeholder={placeholder}
        aria-label="ابحثي في المنتجات والبكدجات"
        className="header-search__input"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="مسح البحث"
          className="header-search__clear"
        >
          <X size={13} />
        </button>
      )}
    </form>
  );
}
