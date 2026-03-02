"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { IMAGE_BOUNDS, MAP_WIDTH, MAP_HEIGHT } from "@/lib/coordinates";
import { MapNode } from "./MapNode";
import { TravelPath } from "./TravelPath";
import { ZoomControls } from "./ZoomControls";
import { useTimeline } from "@/hooks/useTimeline";
import { useMapControls } from "@/hooks/useMapControls";
import { SidePanel } from "./SidePanel";
import { PartyMarker } from "./PartyMarker";
import type { Map as LeafletMap } from "leaflet";

function MapRefSetter({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function CoordinatePicker() {
  const map = useMap();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") !== "true") return;

    const handler = (e: L.LeafletMouseEvent) => {
      const x = Math.round(e.latlng.lng);
      const y = Math.round(MAP_HEIGHT - e.latlng.lat);
      console.log(`[${x}, ${y}]`);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map]);

  return null;
}

export function TimelineMap() {
  const {
    data,
    loading,
    sortedNodes,
    selectedNode,
    selectNode,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    latestLocationId,
  } = useTimeline();

  const { mapRef, zoomIn, zoomOut, flyToNode } = useMapControls();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  useEffect(() => {
    if (selectedNode) {
      flyToNode(selectedNode.coordinates);
    }
  }, [selectedNode, flyToNode]);

  if (isMobile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d0d0d]">
        <img
          src="/images/mobile/mobile.png"
          alt="Curse of Strahd"
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-[#c9a84c] font-cinzel text-2xl animate-pulse">
          Entering Barovia...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-red-500 font-cinzel text-xl">
          Failed to load timeline data
        </div>
      </div>
    );
  }

  const center = L.latLng(MAP_HEIGHT / 2, MAP_WIDTH / 2);

  return (
    <div className="h-screen w-screen relative overflow-hidden mist-bg">
      <MapContainer
        center={center}
        zoom={-1}
        minZoom={-2}
        maxZoom={2}
        crs={L.CRS.Simple}
        maxBounds={IMAGE_BOUNDS}
        maxBoundsViscosity={1.0}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={120}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full bg-[#1a1a1a]"
      >
        <MapRefSetter mapRef={mapRef} />
        <CoordinatePicker />
        <ImageOverlay url="/images/map/barovia-map.png" bounds={IMAGE_BOUNDS} />

        {data.paths.map((path, i) => (
          <TravelPath
            key={i}
            path={path}
            nodes={data.nodes}
            pathIndex={i}
            totalPaths={data.paths.length}
          />
        ))}

        {sortedNodes.map((node) => (
          <MapNode
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            onClick={() => selectNode(node.id)}
          />
        ))}

        {latestLocationId && (
          <PartyMarker nodeId={latestLocationId} nodes={sortedNodes} />
        )}
      </MapContainer>

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <SidePanel
        node={selectedNode}
        onClose={() => selectNode(null)}
        onNext={goToNext}
        onPrevious={goToPrevious}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
      />

    </div>
  );
}
