"use client";

import { useEffect, useRef, useState } from "react";
import type { PathSegment, TimelineNode } from "@/types/timeline";

export interface JourneyEntry {
  title: string;
  isTeleport: boolean;
  level?: number;
  color: string;
  nodeId: string;
  coordinates: [number, number];
}

interface JourneyListProps {
  paths: PathSegment[];
  nodes: TimelineNode[];
  startingLevel?: number;
  selectedStep: number;
  onSelectStep: (step: number) => void;
}

function getRainbowColor(index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  const hue = t * 270;
  return `hsl(${hue}, 85%, 55%)`;
}

function TravelIcon({ color }: { color: string }) {
  return (
    <svg width="36" height="12" viewBox="0 0 36 12" style={{ flexShrink: 0 }}>
      <path
        d="M2 9 Q10 1, 20 6 Q28 10, 35 6"
        fill="none"
        stroke="#000"
        strokeWidth="3"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M2 9 Q10 1, 20 6 Q28 10, 35 6"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeleportIcon({ color }: { color: string }) {
  return (
    <svg width="36" height="12" viewBox="0 0 36 12" style={{ flexShrink: 0 }}>
      <line
        x1="2" y1="6" x2="35" y2="6"
        stroke="#000"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="2" y1="6" x2="35" y2="6"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="2 5"
        strokeLinecap="round"
      />
      {[11, 18, 25].map((x, i) => (
        <path
          key={i}
          d={`M${x} 2 L${x + 0.5} 4 L${x + 2} 6 L${x + 0.5} 8 L${x} 10 L${x - 0.5} 8 L${x - 2} 6 L${x - 0.5} 4 Z`}
          fill={color}
          opacity="0.8"
          className="legend-sparkle"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}

function Legend() {
  return (
    <div style={{ borderTop: "1px solid #a89870", paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
        <svg width="48" height="20" viewBox="0 0 48 20" style={{ flexShrink: 0 }}>
          <path
            d="M4 16 Q12 2, 24 10 Q36 18, 44 4"
            fill="none"
            stroke="#000"
            strokeWidth="4"
            strokeOpacity="0.5"
            strokeLinecap="round"
          />
          <path
            d="M4 16 Q12 2, 24 10 Q36 18, 44 4"
            fill="none"
            stroke="hsl(135, 85%, 55%)"
            strokeWidth="2.5"
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
          <polygon points="40,3 44,4 40,7" fill="hsl(135, 85%, 55%)" opacity="0.9" />
          <circle cx="4" cy="16" r="3" fill="#e8d08c" stroke="#2a2010" strokeWidth="1.5" />
          <circle cx="44" cy="4" r="3" fill="#e8d08c" stroke="#2a2010" strokeWidth="1.5" />
        </svg>
        <span>Traveled</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="48" height="20" viewBox="0 0 48 20" style={{ flexShrink: 0 }}>
          <line
            x1="4" y1="10" x2="44" y2="10"
            stroke="#000"
            strokeWidth="3"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />
          <line
            x1="4" y1="10" x2="44" y2="10"
            stroke="hsl(200, 85%, 55%)"
            strokeWidth="1.5"
            strokeDasharray="2 6"
            strokeLinecap="round"
          />
          {[12, 24, 36].map((x, i) => (
            <g key={i}>
              <path
                d={`M${x} 4 L${x + 1} 8 L${x + 4} 10 L${x + 1} 12 L${x} 16 L${x - 1} 12 L${x - 4} 10 L${x - 1} 8 Z`}
                fill="hsl(200, 85%, 55%)"
                opacity="0.9"
                className="legend-sparkle"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            </g>
          ))}
          <circle cx="4" cy="10" r="3" fill="#e8d08c" stroke="#2a2010" strokeWidth="1.5" />
          <circle cx="44" cy="10" r="3" fill="#e8d08c" stroke="#2a2010" strokeWidth="1.5" />
        </svg>
        <span>Teleported</span>
      </div>
    </div>
  );
}

export function buildJourneyEntries(
  paths: PathSegment[],
  nodes: TimelineNode[],
  startingLevel?: number,
): JourneyEntry[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const totalPaths = paths.length;
  const entries: JourneyEntry[] = [];

  if (paths.length > 0) {
    const firstNode = nodeMap.get(paths[0].from);
    if (firstNode) {
      entries.push({
        title: firstNode.title,
        isTeleport: false,
        level: startingLevel ?? 1,
        color: getRainbowColor(0, totalPaths),
        nodeId: firstNode.id,
        coordinates: firstNode.coordinates,
      });
    }
  }

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const toNode = nodeMap.get(path.to);
    if (toNode) {
      entries.push({
        title: toNode.title,
        isTeleport: path.style === "teleport",
        level: path.partyLevel,
        color: getRainbowColor(i, totalPaths),
        nodeId: toNode.id,
        coordinates: toNode.coordinates,
      });
    }
  }

  return entries;
}

export function JourneyList({ paths, nodes, startingLevel, selectedStep, onSelectStep }: JourneyListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const entries = buildJourneyEntries(paths, nodes, startingLevel);
  const [collapsed, setCollapsed] = useState(false);

  // Scroll to bottom on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {/* Sliding container — button travels with the panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          pointerEvents: "auto",
          transition: "transform 0.35s ease",
          transform: collapsed ? "translateX(calc(100% - 30px))" : "translateX(0)",
        }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "linear-gradient(145deg, #d5c8a8, #b8a87a)",
            border: "2px solid #6b5c3e",
            borderRight: "none",
            borderRadius: "3px 0 0 3px",
            padding: "12px 6px",
            cursor: "pointer",
            color: "#3a3020",
            fontFamily: "'Spectral', serif",
            fontSize: 16,
            lineHeight: 1,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          title={collapsed ? "Show journey log" : "Hide journey log"}
        >
          {collapsed ? "\u25C0" : "\u25B6"}
        </button>

        <div>
          <div
            ref={scrollRef}
            className="scrollbar-hide"
            style={{
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "0 20px 0 0",
            }}
          >
            <div
              style={{
                background: "linear-gradient(145deg, #d5c8a8, #c4b48a, #b8a87a, #c9bb98)",
                border: "2px solid #6b5c3e",
                borderRight: "none",
                borderRadius: "3px 0 0 3px",
                padding: "22px 26px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 248, 230, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.1)",
                fontFamily: "'Spectral', serif",
                fontSize: 14,
                color: "#3a3020",
              }}
            >
              {entries.map((entry, i) => {
                const isSelected = i === selectedStep;
                const isDimmed = i > selectedStep;

                return (
                  <div
                    key={i}
                    onClick={() => onSelectStep(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 0",
                      cursor: "pointer",
                      opacity: isDimmed ? 0.35 : 1,
                      fontWeight: isSelected ? 700 : 400,
                      transition: "opacity 0.3s ease",
                    }}
                  >
                    {entry.isTeleport ? (
                      <TeleportIcon color={entry.color} />
                    ) : (
                      <TravelIcon color={entry.color} />
                    )}
                    <span style={{ whiteSpace: "nowrap" }}>
                      {entry.title}
                      {entry.level != null && (
                        <span style={{ opacity: 0.55, fontSize: 12, marginLeft: 4, fontWeight: 400 }}>
                          (lv {entry.level})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}

              <Legend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
