"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sendGTMEvent } from "@next/third-parties/google";

const _PageViewTracker: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams?.toString() || "");
    sendGTMEvent({ event: "page_view", page: url });
  }, [pathname, searchParams]);

  return null;
};

const PageViewTracker: React.FC = () => {
  return (
    <Suspense>
      <_PageViewTracker />
    </Suspense>
  );
}

export default PageViewTracker;
