"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Site-wide motion controller.
 *
 * Reveals `[data-animate]` elements once as they enter the viewport and keeps
 * the sticky header's elevation in sync with the scroll position. Elements the
 * user has already scrolled past (anchor jumps, restored scroll positions) are
 * shown immediately without a transition so no region of the page is ever
 * blank. The hiding styles only apply while `html.js-motion` is present, which
 * an inline script sets before first paint — never on hash loads, without
 * JavaScript, in print, or under prefers-reduced-motion.
 */
export function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      root.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Same-page anchor links glide smoothly. This replaces CSS
    // `scroll-behavior: smooth`, which Next 16 would also apply to its own
    // scroll reset on route changes, turning every navigation into a long
    // rewind. Capture phase so this wins over next/link's hash handling.
    // The skip link keeps native instant-jump semantics for keyboard users.
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href*='#']") as
        | HTMLAnchorElement
        | null;
      if (!link || link.classList.contains("skip-link")) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search ||
        url.hash.length < 2
      ) {
        return;
      }
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      // Keep the router's history state intact while updating the fragment.
      window.history.pushState(window.history.state, "", url.hash);
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-animate]:not(.is-in)"),
    );
    if (elements.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-in", "instant"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.classList.add("is-in");
          } else if (entry.boundingClientRect.top < 0) {
            element.classList.add("is-in", "instant");
          } else {
            return;
          }
          observer.unobserve(element);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    // Observe two frames from now so the router's scroll reset (or restore)
    // has landed; otherwise elements are measured against the previous page's
    // scroll offset and reveal prematurely.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        elements.forEach((element) => observer.observe(element));
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
