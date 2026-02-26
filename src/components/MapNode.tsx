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

function createNodeIcon(node: TimelineNode, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 52 : 44;
  const borderColor = isSelected ? "#c9a84c" : "#8b7355";
  const glowColor = isSelected
    ? "rgba(201, 168, 76, 0.6)"
    : "rgba(201, 168, 76, 0.3)";

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
        box-shadow: 0 0 ${isSelected ? 16 : 8}px ${glowColor}, inset 0 0 4px rgba(0,0,0,0.5);
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        background: #1a1a1a;
        ${isSelected ? "transform: scale(1.1);" : ""}
      " class="node-circle"
         onmouseenter="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 20px rgba(201,168,76,0.7), inset 0 0 4px rgba(0,0,0,0.5)';"
         onmouseleave="this.style.transform='${isSelected ? "scale(1.1)" : "scale(1)"}'; this.style.boxShadow='0 0 ${isSelected ? 16 : 8}px ${glowColor}, inset 0 0 4px rgba(0,0,0,0.5)';">
        <img
          src="${node.thumbnail}"
          alt="${node.title}"
          style="width: 100%; height: 100%; object-fit: cover;"
          onerror="this.style.display='none'; this.parentElement.innerHTML += '<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px;color:#c9a84c;\\'>&#9876;</div>'"
        />
      </div>
    `,
  });
}

export function MapNode({ node, isSelected, onClick }: MapNodeProps) {
  const position = pixelToLatLng(node.coordinates);
  const icon = createNodeIcon(node, isSelected);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: onClick }}
      aria-label={node.title}
    >
      <Tooltip
        direction="top"
        offset={[0, -28]}
        className="gothic-tooltip"
      >
        <div className="font-cinzel text-sm font-bold text-[#f0e6d2]">
          {node.title}
        </div>
        {node.subtitle && (
          <div className="font-spectral text-xs text-[#c9a84c]">
            {node.subtitle}
          </div>
        )}
      </Tooltip>
    </Marker>
  );
}
