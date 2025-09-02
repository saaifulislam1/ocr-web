// components/HydrationFix.tsx
"use client";

import { useEffect } from "react";

export default function HydrationFix() {
  useEffect(() => {
    // Remove the cz-shortcut-listen attribute after hydration
    document.body.removeAttribute("cz-shortcut-listen");
  }, []);

  return null;
}
