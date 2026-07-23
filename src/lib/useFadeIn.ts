"use client";

import { useEffect } from "react";

/**
 * Registers an IntersectionObserver on all [data-fade] elements.
 * When a [data-fade] element scrolls into view, the class
 * "animate-reveal" is added so the CSS reveal animation plays.
 * Also adds scale and blur transitions for a premium feel.
 */
export function useFadeIn() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-fade]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            // Also add a refine class for scale/blur animation
            entry.target.classList.add("animate-page-enter");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}