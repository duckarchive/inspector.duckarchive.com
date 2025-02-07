"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sendGTMEvent } from "@next/third-parties/google";

const PageViewTracker: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() || "");
    sendGTMEvent({ event: "page_view", page: url });
  }, [pathname, searchParams]);

  return null;
};

export default PageViewTracker;
