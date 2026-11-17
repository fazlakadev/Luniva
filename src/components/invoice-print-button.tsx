"use client";

import PrintButton from "@/components/print-button";

/**
 * The single invoice print action used by both the admin invoice page and the
 * customer-facing invoice view. Keeping it in one place guarantees the same
 * label, icon, accessibility text and print behaviour everywhere.
 */
export default function PrintInvoiceButton({ autoPrint = false }: { autoPrint?: boolean }) {
  return (
    <PrintButton
      label="طباعة الفاتورة"
      title="طباعة نسخة كاملة من الفاتورة"
      autoPrint={autoPrint}
      className="btn btn-primary"
      iconSize={16}
    />
  );
}
