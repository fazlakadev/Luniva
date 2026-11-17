"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrintButton({
  label = "طباعة",
  autoPrint = false,
  className = "btn btn-primary",
  title,
  iconSize = 16,
}: {
  label?: string;
  autoPrint?: boolean;
  className?: string;
  title?: string;
  iconSize?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={!ready}
      className={`print-hidden ${className}`}
      aria-label={label}
      title={title || label}
      data-print-button=""
    >
      <Printer size={iconSize} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
