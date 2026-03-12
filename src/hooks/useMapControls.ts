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

    // Offset the target to the left to account for the right-side journey panel
    // (~280px wide). This keeps the node visually centered in the open map area.
    const panelWidth = 280;
    const targetPoint = map.latLngToContainerPoint(latLng);
    const offsetPoint = targetPoint.add([panelWidth / 2, 0]);
    const offsetLatLng = map.containerPointToLatLng(offsetPoint);

    map.panTo(offsetLatLng, {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.4,
    });
  }, []);

  return { mapRef, zoomIn, zoomOut, flyToNode };
}
