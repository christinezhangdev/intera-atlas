"use client";

import { CommandPalette } from "./CommandPalette";
import type { SearchHit } from "@/lib/search-hit";

export function Providers({
  searchIndex,
  children,
}: {
  searchIndex: SearchHit[];
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CommandPalette sites={searchIndex} />
    </>
  );
}
