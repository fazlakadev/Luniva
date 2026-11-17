"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrintInvoiceButton({ autoPrint = false }: { autoPrint?: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <button type="button" onClick={() => window.print()} disabled={!ready} className="btn btn-primary">
      <Printer size={16} />طباعة الفاتورة
    </button>
  );
}
