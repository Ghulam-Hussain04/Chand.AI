"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  // 1) Initialize theme from localStorage in a lazy initializer
  //    This runs only on the client because this is a "use client" component.
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch (e) {
      // localStorage might throw in some edge cases; default to dark
    }
    return true; // default to dark
  });

  // 2) Mounted guard to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // 3) On first mount: ensure HTML classes reflect initial state
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    // ensure localStorage has a value
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
    setMounted(true); // safe: it's not syncing external state, only readiness
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // 4) Whenever isDark changes after mount, update the DOM + localStorage
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark, mounted]);

  // 5) Toggle handler — flips React state which triggers re-render (so UI slides)
  const toggleTheme = () => setIsDark((v) => !v);

  // 6) Avoid rendering until mounted to prevent hydration mismatch
  if (!mounted) return null;

  // 7) Use isDark to control the sliding position
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="
        relative w-14 h-8 rounded-full 
        overflow-hidden border border-border
        bg-[color:var(--secondary)] transition-all flex items-center
      "
    >
      {/* Track background */}
      <div
        className={`
          absolute inset-0 transition-colors duration-300
          ${isDark ? "bg-[#0E0E24]" : "bg-[#ECECFF]"}
        `}
      />

      {/* Sliding element (star or circle) */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 
          w-6 h-6 transition-transform duration-300 ease-in-out
          flex items-center justify-center
          ${isDark ? "translate-x-7" : "translate-x-1"}
        `}
      >
        {/* Simple star SVG (sharp shape, not round) */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isDark ? "#FFD700" : "#333"}
          aria-hidden
        >
          <path d="M12 2l2.39 6.91L22 9.75l-5 4.73L18.18 22 12 18.56 5.82 22 7 14.48l-5-4.73 7.61-.84z" />
        </svg>
      </div>
    </button>
  );
}
