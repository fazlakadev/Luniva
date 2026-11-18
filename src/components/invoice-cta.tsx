import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type InvoiceCtaProps = {
  href: string;
  label?: string;
  variant?: "hero" | "compact" | "mini";
  className?: string;
  ariaLabel?: string;
};

/** Branded "new transaction" call-to-action used for every invoice creation entry point. */
export default function InvoiceCta({
  href,
  label = "فاتورة جديدة",
  variant = "compact",
  className = "",
  ariaLabel,
}: InvoiceCtaProps) {
  return (
    <Link
      href={href}
      className={`txn-cta txn-cta--${variant} ${className}`.trim()}
      aria-label={ariaLabel || label}
    >
      <span className="txn-cta__art" aria-hidden="true">
        <span className="txn-cta__card">
          <span className="txn-cta__card-line" />
          <span className="txn-cta__dots" />
        </span>
        <span className="txn-cta__post">
          <span className="txn-cta__post-line" />
          <span className="txn-cta__screen">$</span>
          <span className="txn-cta__numbers" />
          <span className="txn-cta__numbers-2" />
        </span>
      </span>
      <span className="txn-cta__label">{label}</span>
      <ArrowLeft size={variant === "mini" ? 14 : 16} className="txn-cta__arrow" aria-hidden="true" />
    </Link>
  );
}
