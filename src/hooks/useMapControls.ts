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
    map.panTo(latLng, {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.4,
    });
  }, []);

  return { mapRef, zoomIn, zoomOut, flyToNode };
}
