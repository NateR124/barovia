"use client";

import { useRef, useEffect } from "react";
import type { TimelineNode } from "@/types/timeline";

interface TimelineScrubberProps {
  nodes: TimelineNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export function TimelineScrubber({
  nodes,
  selectedNodeId,
  onSelectNode,
}: TimelineScrubberProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to selected node
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedNodeId]);

  if (!nodes.length) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] bg-[#1a1a1a]/90 backdrop-blur-sm border-t border-[#4a0e0e]/60">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 px-4 py-3 overflow-x-auto scrollbar-hide"
      >
        {nodes.map((node, i) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <div key={node.id} className="flex items-center shrink-0">
              <button
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onSelectNode(node.id)}
                className={`
                  flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all
                  ${
                    isSelected
                      ? "bg-[#4a0e0e]/80 border border-[#c9a84c]/60"
                      : "hover:bg-[#4a0e0e]/40 border border-transparent"
                  }
                `}
                aria-label={`Go to ${node.title}`}
              >
                <div
                  className={`
                    w-3 h-3 rounded-full transition-all
                    ${
                      isSelected
                        ? "bg-[#c9a84c] shadow-[0_0_8px_rgba(201,168,76,0.6)]"
                        : "bg-[#8b7355] hover:bg-[#c9a84c]"
                    }
                  `}
                />
                <span
                  className={`
                    text-[10px] font-spectral whitespace-nowrap
                    ${isSelected ? "text-[#f0e6d2]" : "text-[#8b7355]"}
                  `}
                >
                  {node.title.length > 10 ? node.title.slice(0, 10) + "…" : node.title}
                </span>
              </button>

              {/* Connecting line between dots */}
              {i < nodes.length - 1 && (
                <div className="w-4 h-px bg-[#4a0e0e] shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
