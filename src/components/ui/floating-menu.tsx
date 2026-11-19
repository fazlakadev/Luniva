"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export interface MenuItem {
  label: string;
  /** Internal route — navigated to with next/navigation. */
  href?: string;
  /** Kept for callers that prefer a custom action. */
  onClick?: () => void;
  /** Overrides the path-derived active state. */
  active?: boolean;
}

interface FloatingMenuProps {
  items?: MenuItem[];
}

function MenuButton({
  label,
  onSelect,
  isOpen,
  active,
  index,
  reduced,
}: {
  label: string;
  onSelect?: () => void;
  isOpen: boolean;
  active: boolean;
  index: number;
  reduced: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const animatingRef = useRef(false);
  const pendingLeaveRef = useRef(false);
  // Arabic glyphs must stay in one element to join correctly; Latin labels
  // keep the supplied per-letter cascade.
  const chars = /[\u0600-\u06FF]/.test(label) ? [label] : label.split("");
  const lockDuration = 30 * chars.length + 300;

  const handleEnter = useCallback(() => {
    pendingLeaveRef.current = false;
    if (hovered) return;
    setHovered(true);
    animatingRef.current = true;
    setTimeout(() => {
      animatingRef.current = false;
      if (pendingLeaveRef.current) {
        pendingLeaveRef.current = false;
        setHovered(false);
      }
    }, lockDuration);
  }, [hovered, lockDuration]);

  const handleLeave = useCallback(() => {
    if (animatingRef.current) {
      pendingLeaveRef.current = true;
    } else {
      setHovered(false);
    }
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className="text-[#f7f1ed] text-[24px] uppercase leading-none overflow-hidden"
      style={{
        fontFamily: "'Trobika', 'Bebas Neue', sans-serif",
        letterSpacing: "-0.03em",
        height: "1em",
        color: active ? "#FFE862" : "#f7f1ed",
      }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{
        duration: reduced ? 0 : 0.4,
        delay: reduced ? 0 : isOpen ? 0.4 + 0.08 * index : 0,
        ease,
      }}
    >
      <div className="flex justify-center" aria-hidden="true">
        {chars.map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="inline-block overflow-hidden"
            style={{ height: "1em" }}
          >
            <span
              className="flex flex-col"
              style={{
                transitionProperty: "transform",
                transitionDuration: hovered && !reduced ? "800ms" : "0ms",
                transitionDelay: hovered && !reduced ? `${30 * i}ms` : "0ms",
                transform: hovered && !reduced ? "translateY(-50%)" : "translateY(0%)",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <span
                className="block"
                style={{ height: "1em", lineHeight: "1em" }}
              >
                {char}
              </span>
              <span
                className="block"
                style={{ height: "1em", lineHeight: "1em" }}
              >
                {char}
              </span>
            </span>
          </span>
        ))}
      </div>
    </motion.button>
  );
}

export default function FloatingMenu({ items }: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() || "/";
  const reduced = !!useReducedMotion();

  const menuItems: MenuItem[] = items ?? [
    { label: "Home", href: "/" },
    { label: "Works", href: "/catalog/products" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (item: MenuItem) => {
    if (item.active !== undefined) return item.active;
    const href = item.href;
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navigate = (item: MenuItem) => {
    setIsOpen(false);
    if (item.href) router.push(item.href);
    else item.onClick?.();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <motion.div
      ref={containerRef}
      dir="rtl"
      className="fixed left-1/2 z-[100] md:hidden"
      style={{
        x: "-50%",
        bottom: "calc(2.5rem + env(safe-area-inset-bottom))",
        pointerEvents: "auto",
      }}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.4, ease }}
    >
      <motion.div
        className="relative overflow-hidden flex flex-col"
        style={{
          fontFamily: "'Aeonik TRIAL', 'Inter', sans-serif",
          letterSpacing: "-0.02em",
          cursor: isOpen ? "default" : "pointer",
        }}
        animate={{
          width: isOpen ? 280 : 150,
          height: isOpen ? 300 : 48,
          borderRadius: isOpen ? 32 : 72,
          scale: 1,
        }}
        whileHover={isOpen || reduced ? undefined : { scale: 1.05 }}
        transition={{
          duration: reduced ? 0 : 0.8,
          ease,
          height: { duration: reduced ? 0 : isOpen ? 0.8 : 0.15 },
          scale: { duration: reduced ? 0 : 0.25, ease },
        }}
      >
        {/* Yellow background layer */}
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundColor: isOpen ? "#FFE862" : "#FFE862",
            borderColor: isOpen ? "#FFE862" : "#d1bb3b",
          }}
          transition={{ duration: reduced ? 0 : isOpen ? 0.1 : 0.3, ease }}
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: "inherit",
          }}
        />

        {/* Dark circle expanding from bottom */}
        <motion.div
          className="absolute left-1/2 bg-[#242424]"
          style={{
            width: "200%",
            height: "200%",
            borderRadius: "50%",
            x: "-50%",
          }}
          animate={{ bottom: isOpen ? "-20%" : "-200%" }}
          transition={{
            duration: reduced ? 0 : 0.8,
            ease,
            delay: reduced ? 0 : isOpen ? 0.1 : 0,
          }}
        />

        {/* Menu items */}
        <div
          className="relative z-10 flex flex-col gap-6 items-center justify-center"
          style={{
            pointerEvents: isOpen ? "auto" : "none",
            opacity: isOpen ? 1 : 0,
            flex: isOpen ? 1 : 0,
            overflow: "hidden",
          }}
        >
          {menuItems.map((item, idx) => (
            <MenuButton
              key={item.label}
              label={item.label}
              onSelect={() => navigate(item)}
              isOpen={isOpen}
              active={isActive(item)}
              index={idx}
              reduced={reduced}
            />
          ))}
        </div>

        {/* Bottom bar: Menu + hamburger */}
        <motion.button
          type="button"
          aria-label={isOpen ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل"}
          aria-expanded={isOpen}
          className="relative z-10 flex w-full shrink-0 cursor-pointer appearance-none items-center justify-between border-0 bg-transparent"
          onClick={() => setIsOpen((value) => !value)}
          animate={{
            paddingLeft: isOpen ? 24 : 20,
            paddingRight: isOpen ? 24 : 20,
            paddingBottom: isOpen ? 24 : 0,
            height: 48,
          }}
          transition={{ duration: reduced ? 0 : 0.8, ease }}
          style={{ alignItems: "center" }}
        >
          <motion.span
            className="text-[14px] md:text-[20px] leading-none"
            animate={{ color: isOpen ? "#f7f1ed" : "#242424" }}
            transition={{ duration: reduced ? 0 : 0.3, ease }}
          >
            Menu
          </motion.span>

          <div className="relative w-[24px] h-[24px] flex items-center justify-center">
            <motion.span
              className="absolute block w-[18px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -3,
                backgroundColor: isOpen ? "#f7f1ed" : "#242424",
              }}
              transition={{ duration: reduced ? 0 : 0.4, ease }}
            />
            <motion.span
              className="absolute block w-[18px] h-[2px] rounded-full"
              animate={{
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 3,
                backgroundColor: isOpen ? "#f7f1ed" : "#242424",
              }}
              transition={{ duration: reduced ? 0 : 0.4, ease }}
            />
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
