"use client";

import { Polyline } from "react-leaflet";
import { pixelToLatLng } from "@/lib/coordinates";
import type { PathSegment, TimelineNode } from "@/types/timeline";

interface TravelPathProps {
  path: PathSegment;
  nodes: TimelineNode[];
}

const PATH_STYLES: Record<string, { color: string; opacity: number }> = {
  normal: { color: "#8b0000", opacity: 0.6 },
  dangerous: { color: "#ff2200", opacity: 0.7 },
  stealthy: { color: "#4a6741", opacity: 0.4 },
};

export function TravelPath({ path, nodes }: TravelPathProps) {
  const fromNode = nodes.find((n) => n.id === path.from);
  const toNode = nodes.find((n) => n.id === path.to);
  if (!fromNode || !toNode) return null;

  const points = [
    pixelToLatLng(fromNode.coordinates),
    ...(path.waypoints ?? []).map((wp) => pixelToLatLng(wp)),
    pixelToLatLng(toNode.coordinates),
  ];

  const style = PATH_STYLES[path.style ?? "normal"];

  return (
    <Polyline
      positions={points}
      pathOptions={{
        color: style.color,
        weight: 3,
        opacity: style.opacity,
        dashArray: "8, 12",
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}
