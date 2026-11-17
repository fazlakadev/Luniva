"use client";

import { Expand, X } from "lucide-react";
import { useState } from "react";

export default function ZoomableImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={`group relative block overflow-hidden ${className}`} aria-label={`تكبير صورة ${alt}`}><img src={src} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 grid place-items-center bg-[#21151a]/0 text-white opacity-0 transition group-hover:bg-[#21151a]/35 group-hover:opacity-100"><Expand size={22} /></span></button>{open && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#120d10]/90 p-5 backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true"><button onClick={() => setOpen(false)} className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25" aria-label="إغلاق"><X size={21} /></button><img src={src} alt={alt} onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" /></div>}</>;
}
