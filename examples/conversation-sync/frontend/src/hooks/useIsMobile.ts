import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true when window width is below the mobile breakpoint (768px).
 * Listens to window resize. Initialises from current viewport width.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
}

export { MOBILE_BREAKPOINT };
