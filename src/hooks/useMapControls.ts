"use client";

import { useCallback, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";

export function useMapControls() {
  const mapRef = useRef<LeafletMap | null>(null);

  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const flyToNode = useCallback((coordinates: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    const latLng = pixelToLatLng(coordinates);
    map.flyTo(latLng, Math.max(map.getZoom(), 0), {
      duration: 0.8,
    });
  }, []);

  return { mapRef, zoomIn, zoomOut, flyToNode };
}
