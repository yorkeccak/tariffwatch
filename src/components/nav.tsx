"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/compare", label: "Compare" },
];

export function Nav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setAtTop(currentScrollY < 20);
      if (currentScrollY < 20) {
        setVisible(true);
      } else if (currentScrollY < lastScrollY) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
      >
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-2 rounded-full transition-all duration-300",
            atTop && isHome
              ? "bg-transparent"
              : "bg-background/70 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/5"
          )}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          >
            <span className="font-serif text-sm">TariffWatch</span>
          </Link>

          {/* Divider */}
          <div className="w-px h-4 bg-border/40 mx-1" />

          {/* Nav Links */}
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3 py-1.5 text-sm rounded-full transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {pathname === item.href && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 bg-foreground/[0.06] rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-border/40 mx-1" />

          {/* Right actions */}
          <a
            href="https://github.com/valyuAI/tariffwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full"
          >
            GitHub
          </a>

          <a
            href="https://valyu.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 text-sm font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Valyu API
          </a>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}
