"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Full-screen logo splash shown on every full page load. Visible ~2.5s, then
 * fades out over 0.5s and unmounts. Client navigations don't remount the root
 * layout, so this only appears on a real reload.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), 2500);
    const gone = setTimeout(() => setPhase("gone"), 3000);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/assassins.png"
        alt="Chassassins"
        width={640}
        height={640}
        priority
        className="h-auto w-[80vw] max-w-xl animate-pulse"
      />
    </div>
  );
}
