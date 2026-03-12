"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { pixelToLatLng } from "@/lib/coordinates";

interface PartyMarkerProps {
  coordinates: [number, number];
  facingLeft: boolean;
  imageSrc?: string;
  label?: string;
  size?: number;
}

function createGroupIcon(
  facingLeft: boolean,
  imageSrc: string,
  size: number,
  cssClass: string,
): L.DivIcon {
  return L.divIcon({
    className: "custom-node-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="${cssClass}" style="
        width: ${size}px;
        height: ${size}px;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.9)) drop-shadow(0 0 2px rgba(0,0,0,0.9)) drop-shadow(0 0 1px rgba(0,0,0,1)) drop-shadow(0 4px 8px rgba(0,0,0,0.6));
        transform: scaleX(${facingLeft ? 1 : -1});
      ">
        <img
          src="${imageSrc}"
          alt="Group location"
          style="width: 100%; height: 100%; object-fit: contain;"
        />
      </div>
    `,
  });
}

export function PartyMarker({
  coordinates,
  facingLeft,
  imageSrc = "/images/characters/Party.png",
  label = "The Party",
  size = 380,
}: PartyMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const animFrameRef = useRef<number>(0);
  const [displayPos, setDisplayPos] = useState<[number, number]>(coordinates);
  const prevCoordsRef = useRef<[number, number]>(coordinates);

  // Animate position changes
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) {
      setDisplayPos(coordinates);
      prevCoordsRef.current = coordinates;
      return;
    }

    const startLatLng = marker.getLatLng();
    const endLatLng = pixelToLatLng(coordinates);

    if (
      prevCoordsRef.current[0] === coordinates[0] &&
      prevCoordsRef.current[1] === coordinates[1]
    ) {
      return;
    }
    prevCoordsRef.current = coordinates;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const duration = 500;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * ease;
      const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * ease;
      marker!.setLatLng([lat, lng]);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPos(coordinates);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [coordinates[0], coordinates[1]]);

  // Update icon when facing or image changes
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setIcon(createGroupIcon(facingLeft, imageSrc, size, "party-icon"));
    }
  }, [facingLeft, imageSrc, size]);

  const position = pixelToLatLng(displayPos);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={createGroupIcon(facingLeft, imageSrc, size, "party-icon")}
      interactive={false}
      zIndexOffset={1000}
    >
      <Tooltip direction="top" offset={[0, -size / 2]} className="gothic-tooltip">
        <div className="font-cinzel text-sm font-bold text-[#f0e6d2]">
          {label}
        </div>
      </Tooltip>
    </Marker>
  );
}
