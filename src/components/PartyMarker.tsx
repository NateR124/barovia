"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";
import type { TimelineNode } from "@/types/timeline";

interface PartyMarkerProps {
  nodeId: string;
  nodes: TimelineNode[];
}

const PARTY_SIZE = 220;

const partyIcon = L.divIcon({
  className: "custom-node-marker",
  iconSize: [PARTY_SIZE, PARTY_SIZE],
  iconAnchor: [PARTY_SIZE / 2, PARTY_SIZE / 2],
  html: `
    <div class="party-icon" style="
      width: ${PARTY_SIZE}px;
      height: ${PARTY_SIZE}px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7));
    ">
      <img
        src="/images/characters/Party.png"
        alt="Party location"
        style="width: 100%; height: 100%; object-fit: contain;"
      />
    </div>
  `,
});

export function PartyMarker({ nodeId, nodes }: PartyMarkerProps) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const position = pixelToLatLng(node.coordinates);

  return (
    <Marker position={position} icon={partyIcon} interactive={false} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -PARTY_SIZE / 2]} className="gothic-tooltip">
        <div className="font-cinzel text-sm font-bold text-[#f0e6d2]">
          The Party
        </div>
      </Tooltip>
    </Marker>
  );
}
