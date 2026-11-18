"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** A compact, Luniva-toned search field for the public header. */
export default function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/catalog/products?q=${encodeURIComponent(trimmed)}` : "/catalog/products");
  }

  return (
    <form onSubmit={submit} role="search" className="header-search group" aria-label="البحث في كتالوج لونيفا">
      <span aria-hidden="true" className="header-search__glow" />
      <span aria-hidden="true" className="header-search__edge" />
      <Search aria-hidden="true" className="header-search__icon" size={15} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        name="q"
        placeholder="ابحثي في لونيفا..."
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
