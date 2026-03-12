"use client";

import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";
import type { TimelineNode } from "@/types/timeline";

interface MapNodeProps {
  node: TimelineNode;
  isSelected: boolean;
  onClick: () => void;
}

function createNodeIcon(isSelected: boolean): L.DivIcon {
  const size = isSelected ? 28 : 24;
  const borderColor = isSelected ? "#1a1200" : "#2a2010";
  const bgColor = isSelected ? "#ffd700" : "#e8d08c";
  const glowSize = isSelected ? 16 : 10;
  const glowColor = isSelected
    ? "rgba(255, 215, 0, 0.8)"
    : "rgba(201, 168, 76, 0.5)";

  return L.divIcon({
    className: "custom-node-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 2px solid ${borderColor};
        background: ${bgColor};
        box-shadow: 0 0 ${glowSize}px ${glowColor};
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        ${isSelected ? "transform: scale(1.2);" : ""}
      " class="node-circle"
         onmouseenter="this.style.transform='scale(1.3)'; this.style.boxShadow='0 0 20px rgba(255,215,0,0.9)';"
         onmouseleave="this.style.transform='${isSelected ? "scale(1.2)" : "scale(1)"}'; this.style.boxShadow='0 0 ${glowSize}px ${glowColor}';">
      </div>
    `,
  });
}

export function MapNode({ node, isSelected, onClick }: MapNodeProps) {
  const position = pixelToLatLng(node.coordinates);
  const icon = createNodeIcon(isSelected);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={500}
      aria-label={node.title}
    >
      <Tooltip
        direction="top"
        offset={[0, -12]}
        className="gothic-tooltip"
      >
        <div className="font-cinzel text-sm font-bold text-[#f0e6d2]">
          {node.title}
        </div>
      </Tooltip>
    </Marker>
  );
}
