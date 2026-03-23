"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";

const ALLIES_SIZE = 200;

// Van Richten's Tower coordinates
const ALLIES_LOCATION: [number, number] = [379, 288];

const alliesIcon = L.divIcon({
  className: "custom-node-marker",
  iconSize: [ALLIES_SIZE, ALLIES_SIZE],
  iconAnchor: [ALLIES_SIZE / 2, ALLIES_SIZE / 2],
  html: `
    <div class="allies-icon" style="
      width: ${ALLIES_SIZE}px;
      height: ${ALLIES_SIZE}px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7));
    ">
      <img
        src="/images/characters/Allies.webp"
        alt="Allies location"
        style="width: 100%; height: 100%; object-fit: contain;"
      />
    </div>
  `,
});

export function AlliesMarker() {
  const position = pixelToLatLng(ALLIES_LOCATION);

  return (
    <Marker position={position} icon={alliesIcon} interactive={false} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -ALLIES_SIZE / 2]} className="gothic-tooltip">
        <div className="font-cinzel text-sm font-bold text-[#f0e6d2]">
          The Allies
        </div>
      </Tooltip>
    </Marker>
  );
}
