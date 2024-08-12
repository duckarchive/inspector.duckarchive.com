"use client";
import { useCallback } from "react";

interface GAEvent {
  category: string;
  action: string;
  label: string;
  value: string;
}

const useGAEvent = () => {
  const event = useCallback(({ category, action, label, value }: GAEvent) => {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }, []);

  return event;
}

export default useGAEvent;
