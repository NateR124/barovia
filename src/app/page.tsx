"use client";

import dynamic from "next/dynamic";

// Leaflet requires window/document, so we must disable SSR
const TimelineMap = dynamic(
  () => import("@/components/TimelineMap").then((mod) => mod.TimelineMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-[#c9a84c] font-cinzel text-2xl animate-pulse">
          Entering Barovia...
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <TimelineMap />;
}
