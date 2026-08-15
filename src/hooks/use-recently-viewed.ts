import { loadRecentlyViewed, subscribeRecentlyViewed } from "@/lib/recently-viewed";
import type { StrainProfile } from "@/lib/strain-profile";
import { useEffect, useState } from "react";

export function useRecentlyViewed(): StrainProfile[] {
  const [items, setItems] = useState<StrainProfile[]>(loadRecentlyViewed);
  useEffect(() => subscribeRecentlyViewed(setItems), []);
  return items;
}
