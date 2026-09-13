"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackAnalyticsEvent("page_view");
  }, [pathname]);
  return null;
}

