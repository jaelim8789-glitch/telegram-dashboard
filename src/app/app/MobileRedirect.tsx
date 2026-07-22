"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MobileRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      const redirectKey = "telemon-mobile-redirect";
      try {
        if (!sessionStorage.getItem(redirectKey)) {
          sessionStorage.setItem(redirectKey, "1");
          router.replace("/app/mobile");
        }
      } catch {
        router.replace("/app/mobile");
      }
    }
  }, [router]);

  return null;
}
