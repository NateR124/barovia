"use client";

import { useEffect, useState, useMemo } from "react";
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
import { JourneyList, buildJourneyEntries } from "./JourneyList";
import { MistBackground } from "./MistBackground";
import type { GroupManifest } from "@/types/timeline";
import type { Map as LeafletMap } from "leaflet";

interface ManifestData {
  [groupName: string]: GroupManifest;
}

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
  } = useTimeline();

  const { mapRef, zoomIn, zoomOut, flyToNode } = useMapControls();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load group manifest
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  useEffect(() => {
    fetch("/images/characters/generated/manifest.json")
      .then((res) => res.ok ? res.json() : null)
      .then(setManifest)
      .catch(() => setManifest(null));
  }, []);

  // Journey step selection — defaults to last step
  const journeyEntries = useMemo(() => {
    if (!data) return [];
    return buildJourneyEntries(data.paths, data.nodes, data.campaign.startingLevel);
  }, [data]);

  const [selectedStep, setSelectedStep] = useState(-1);

  // Initialize to last step once data loads
  useEffect(() => {
    if (journeyEntries.length > 0 && selectedStep === -1) {
      setSelectedStep(journeyEntries.length - 1);
    }
  }, [journeyEntries.length]);

  // Determine party position and facing from selected step
  const partyCoordinates = useMemo(() => {
    if (selectedStep < 0 || selectedStep >= journeyEntries.length) return null;
    return journeyEntries[selectedStep].coordinates;
  }, [selectedStep, journeyEntries]);

  const partyFacingLeft = useMemo(() => {
    if (selectedStep <= 0 || selectedStep >= journeyEntries.length) return true;
    const prev = journeyEntries[selectedStep - 1].coordinates;
    const curr = journeyEntries[selectedStep].coordinates;
    return prev[0] >= curr[0];
  }, [selectedStep, journeyEntries]);

  // Get the party image for the current step from manifest
  const partyImageSrc = useMemo(() => {
    if (!manifest?.party) return "/images/characters/Party.png";
    const entry = manifest.party[String(selectedStep)] as { image: string | null; location: string | null } | undefined;
    return entry?.image || "/images/characters/Party.png";
  }, [manifest, selectedStep]);

  // Get allies info for the current step
  const alliesInfoRaw = useMemo(() => {
    if (!manifest?.allies) return null;
    const entry = manifest.allies[String(selectedStep)] as { image: string | null; location: string | null } | undefined;
    if (!entry?.location) return null;

    const node = data?.nodes.find((n) => n.id === entry.location);
    if (!node) return null;

    return {
      image: entry.image || "/images/characters/Allies.png",
      coordinates: node.coordinates,
      nodeId: node.id,
    };
  }, [manifest, selectedStep, data]);

  // When party and allies share the same node, offset them and face each other
  const CO_LOCATE_OFFSET = 80; // pixels to spread apart

  const coLocated = useMemo(() => {
    if (!alliesInfoRaw) return false;
    const partyNodeId = journeyEntries[selectedStep]?.nodeId;
    return partyNodeId === alliesInfoRaw.nodeId;
  }, [alliesInfoRaw, selectedStep, journeyEntries]);

  const adjustedPartyCoordinates = useMemo(() => {
    if (!partyCoordinates || !alliesInfoRaw) return partyCoordinates;
    const partyNodeId = journeyEntries[selectedStep]?.nodeId;
    if (partyNodeId === alliesInfoRaw.nodeId) {
      return [partyCoordinates[0] - CO_LOCATE_OFFSET, partyCoordinates[1]] as [number, number];
    }
    return partyCoordinates;
  }, [partyCoordinates, alliesInfoRaw, selectedStep, journeyEntries]);

  const alliesInfo = useMemo(() => {
    if (!alliesInfoRaw || !partyCoordinates) return alliesInfoRaw;
    const partyNodeId = journeyEntries[selectedStep]?.nodeId;
    if (partyNodeId === alliesInfoRaw.nodeId) {
      return {
        ...alliesInfoRaw,
        coordinates: [alliesInfoRaw.coordinates[0] + CO_LOCATE_OFFSET, alliesInfoRaw.coordinates[1]] as [number, number],
      };
    }
    return alliesInfoRaw;
  }, [alliesInfoRaw, partyCoordinates, selectedStep, journeyEntries]);

  // Determine which paths and nodes are visible at the selected step
  const visiblePathCount = useMemo(() => {
    return Math.max(0, selectedStep);
  }, [selectedStep]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i <= selectedStep && i < journeyEntries.length; i++) {
      ids.add(journeyEntries[i].nodeId);
    }
    return ids;
  }, [selectedStep, journeyEntries]);

  useEffect(() => {
    if (selectedNode) {
      flyToNode(selectedNode.coordinates);
    }
  }, [selectedNode, flyToNode]);

  // Pan to party location when step changes
  useEffect(() => {
    if (partyCoordinates) {
      flyToNode(partyCoordinates);
    }
  }, [selectedStep]);

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
    <div className="h-screen w-screen relative overflow-hidden" style={{ background: "#0d0d0d" }}>
      <MistBackground />
      <MapContainer
        center={center}
        zoom={-1}
        minZoom={-2}
        maxZoom={2}
        crs={L.CRS.Simple}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={120}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <MapRefSetter mapRef={mapRef} />
        <CoordinatePicker />
        <ImageOverlay url="/images/map/barovia-map.png" bounds={IMAGE_BOUNDS} />

        {data.paths.slice(0, visiblePathCount).map((path, i) => (
          <TravelPath
            key={i}
            path={path}
            nodes={data.nodes}
            pathIndex={i}
            totalPaths={data.paths.length}
          />
        ))}

        {sortedNodes
          .filter((node) => visibleNodeIds.has(node.id))
          .map((node) => (
            <MapNode
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              onClick={() => selectNode(node.id)}
            />
          ))}

        {adjustedPartyCoordinates && (
          <PartyMarker
            coordinates={adjustedPartyCoordinates}
            facingLeft={coLocated ? false : partyFacingLeft}
            imageSrc={partyImageSrc}
            label="The Party"
          />
        )}

        {alliesInfo && (
          <PartyMarker
            coordinates={alliesInfo.coordinates}
            facingLeft={true}
            imageSrc={alliesInfo.image}
            label="The Allies"
            size={300}
          />
        )}
      </MapContainer>

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <JourneyList
        paths={data.paths}
        nodes={data.nodes}
        startingLevel={data.campaign.startingLevel}
        selectedStep={selectedStep}
        onSelectStep={setSelectedStep}
      />

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
