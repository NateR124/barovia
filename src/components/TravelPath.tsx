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
  /** How many paths share this same node pair */
  siblingCount: number;
  /** This path's index within its sibling group */
  siblingIndex: number;
}

/** Pixels of spacing between parallel sibling paths (in map-image pixels) */
const OFFSET_SPACING = 50;

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
 * Offset the interior of a polyline perpendicular to travel direction.
 * Start and end points stay anchored at node centers so lines still
 * visually connect to the circles, fanning out in the middle.
 */
function offsetPoints(
  points: L.LatLng[],
  siblingCount: number,
  siblingIndex: number
): L.LatLng[] {
  if (siblingCount <= 1) return points;

  const offsetAmount =
    (siblingIndex - (siblingCount - 1) / 2) * OFFSET_SPACING;

  // For a direct 2-point line (no waypoints), insert a synthetic midpoint
  // so there's something in the middle to offset.
  let pts = points;
  if (pts.length === 2) {
    const mid = L.latLng(
      (pts[0].lat + pts[1].lat) / 2,
      (pts[0].lng + pts[1].lng) / 2
    );
    pts = [pts[0], mid, pts[1]];
  }

  return pts.map((point, i) => {
    // Keep first and last points at the node centers (no offset)
    if (i === 0 || i === pts.length - 1) return point;

    // Compute the travel direction at this interior point
    const dx = pts[i + 1].lng - pts[i - 1].lng;
    const dy = pts[i + 1].lat - pts[i - 1].lat;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return point;

    // Perpendicular normal (rotate 90° counterclockwise)
    const nx = -dy / len;
    const ny = dx / len;

    return L.latLng(
      point.lat + ny * offsetAmount,
      point.lng + nx * offsetAmount
    );
  });
}

export function TravelPath({
  path,
  nodes,
  pathIndex,
  totalPaths,
  siblingCount,
  siblingIndex,
}: TravelPathProps) {
  const fromNode = nodes.find((n) => n.id === path.from);
  const toNode = nodes.find((n) => n.id === path.to);
  if (!fromNode || !toNode) return null;

  const color = getRainbowColor(pathIndex, totalPaths);

  const rawPoints = [
    pixelToLatLng(fromNode.coordinates),
    ...(path.waypoints ?? []).map((wp) => pixelToLatLng(wp)),
    pixelToLatLng(toNode.coordinates),
  ];

  // Offset sibling paths so they don't overlap
  const points = offsetPoints(rawPoints, siblingCount, siblingIndex);

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
      <Polyline
        positions={points}
        pathOptions={{
          color,
          weight: 3,
          opacity: 0.75,
          dashArray: "8, 12",
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
