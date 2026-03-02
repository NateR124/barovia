"use client";

import { Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";
import type { PathSegment, TimelineNode } from "@/types/timeline";

interface TravelPathProps {
  path: PathSegment;
  nodes: TimelineNode[];
  /** This path's index in the journey order (0-based) */
  pathIndex: number;
  /** Total number of paths */
  totalPaths: number;
}

/**
 * Map a journey index to a rainbow color: red (first) -> violet (last).
 * Uses HSL with hue from 0 (red) to 270 (violet).
 */
function getRainbowColor(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const hue = t * 270;
  return `hsl(${hue}, 85%, 55%)`;
}

/**
 * Get the midpoint between two LatLng points.
 */
function getMidpoint(a: L.LatLng, b: L.LatLng): L.LatLng {
  return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
}

/**
 * Compute the screen-space angle (in degrees) from point A to point B.
 * 0° = right, 90° = down (screen coords), etc.
 */
function getScreenAngle(a: L.LatLng, b: L.LatLng): number {
  const dx = b.lng - a.lng;
  const dy = -(b.lat - a.lat);
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Create a small arrow DivIcon pointing in the given screen angle.
 */
function createArrowIcon(angle: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<svg width="16" height="16" viewBox="0 0 16 16"
                style="transform: rotate(${angle}deg); filter: drop-shadow(0 0 2px rgba(0,0,0,0.6));">
             <polygon points="2,3 14,8 2,13" fill="${color}" opacity="0.9" />
           </svg>`,
  });
}

/**
 * Create a sparkle/star DivIcon for teleportation paths.
 */
function createSparkleIcon(index: number, color: string): L.DivIcon {
  const delay = (index * 0.4) % 2;
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div class="teleport-star" style="animation-delay: ${delay}s;">
             <svg width="20" height="20" viewBox="0 0 20 20">
               <path d="M10 0 L12 7 L20 10 L12 13 L10 20 L8 13 L0 10 L8 7 Z"
                     fill="${color}" opacity="0.9"
                     filter="drop-shadow(0 0 3px ${color})"/>
             </svg>
           </div>`,
  });
}

/**
 * Distribute points evenly along a straight line between two LatLng positions.
 */
function getEvenlySpacedPoints(
  from: L.LatLng,
  to: L.LatLng,
  count: number
): L.LatLng[] {
  const points: L.LatLng[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    points.push(
      L.latLng(
        from.lat + (to.lat - from.lat) * t,
        from.lng + (to.lng - from.lng) * t
      )
    );
  }
  return points;
}

export function TravelPath({
  path,
  nodes,
  pathIndex,
  totalPaths,
}: TravelPathProps) {
  const fromNode = nodes.find((n) => n.id === path.from);
  const toNode = nodes.find((n) => n.id === path.to);
  if (!fromNode || !toNode) return null;

  const isTeleport = path.style === "teleport";
  const color = getRainbowColor(pathIndex, totalPaths);

  if (isTeleport) {
    const from = pixelToLatLng(fromNode.coordinates);
    const to = pixelToLatLng(toNode.coordinates);
    const sparklePoints = getEvenlySpacedPoints(from, to, 6);

    return (
      <>
        <Polyline
          positions={[from, to]}
          pathOptions={{
            color: "#000000",
            weight: 5,
            opacity: 0.3,
            lineCap: "round",
          }}
        />
        <Polyline
          positions={[from, to]}
          pathOptions={{
            color,
            weight: 3,
            opacity: 0.7,
            dashArray: "4, 12",
            lineCap: "round",
          }}
        />
        {sparklePoints.map((pos, i) => (
          <Marker
            key={i}
            position={pos}
            icon={createSparkleIcon(i, color)}
            interactive={false}
          />
        ))}
      </>
    );
  }

  const points = [
    pixelToLatLng(fromNode.coordinates),
    ...(path.waypoints ?? []).map((wp) => pixelToLatLng(wp)),
    pixelToLatLng(toNode.coordinates),
  ];

  // Place an arrow at the midpoint of each segment
  const arrows: { position: L.LatLng; angle: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    arrows.push({
      position: getMidpoint(a, b),
      angle: getScreenAngle(a, b),
    });
  }

  return (
    <>
      {/* Black outline behind the colored line */}
      <Polyline
        positions={points}
        pathOptions={{
          color: "#000000",
          weight: 7,
          opacity: 0.5,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      {/* Colored line on top */}
      <Polyline
        positions={points}
        pathOptions={{
          color,
          weight: 5,
          opacity: 0.85,
          dashArray: "10, 14",
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      {arrows.map((arrow, i) => (
        <Marker
          key={i}
          position={arrow.position}
          icon={createArrowIcon(arrow.angle, color)}
          interactive={false}
        />
      ))}
    </>
  );
}
