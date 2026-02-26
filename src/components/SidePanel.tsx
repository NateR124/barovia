"use client";

import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { TimelineNode } from "@/types/timeline";

interface SidePanelProps {
  node: TimelineNode | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

const TAG_ICONS: Record<string, string> = {
  combat: "\u{1F5E1}\uFE0F",
  rp: "\u{1F3AD}",
  boss: "\u{1F480}",
  death: "\u{1F571}\uFE0F",
  dungeon: "\u{1F5DD}\uFE0F",
  treasure: "\u{1F48E}",
  ally: "\u{1F91D}",
  mystery: "\u{1F50D}",
  travel: "\u{1F6B6}",
};

export function SidePanel({
  node,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: SidePanelProps) {
  return (
    <AnimatePresence mode="wait">
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-[1000] md:pointer-events-auto pointer-events-none"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key={node.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[420px] z-[1001]
                       bg-[#1a1a1a]/95 backdrop-blur-sm border-l border-[#4a0e0e]
                       flex flex-col overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center
                         text-[#c9a84c] hover:text-[#f0e6d2] transition-colors text-xl"
              aria-label="Close panel"
            >
              &times;
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pt-2">
              {/* Hero image */}
              <div className="relative h-56 w-full bg-[#2c1810] overflow-hidden">
                <img
                  src={node.thumbnail}
                  alt={node.title}
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
              </div>

              {/* Content below hero */}
              <div style={{ padding: "0 24px 32px 24px" }}>
                {/* Header */}
                <div style={{ marginTop: "-48px", position: "relative", zIndex: 10 }}>
                  <h2 className="font-cinzel text-2xl text-[#f0e6d2] font-bold leading-tight">
                    {node.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    {node.subtitle && (
                      <span className="text-[#c9a84c] font-spectral">
                        {node.subtitle}
                      </span>
                    )}
                    {node.date && (
                      <span className="text-[#8b7355] font-spectral">
                        {node.date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {node.tags && node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2" style={{ marginTop: "16px" }}>
                    {node.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full
                                   bg-[#4a0e0e]/60 border border-[#8b0000]/40
                                   text-[#f0e6d2] text-xs font-spectral capitalize"
                        style={{ padding: "4px 10px" }}
                      >
                        {TAG_ICONS[tag] && <span>{TAG_ICONS[tag]}</span>}
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div style={{ marginTop: "24px" }}>
                  <p className="text-[#d4c5a9] font-spectral leading-relaxed">
                    {node.summary}
                  </p>
                </div>

                {/* Details (markdown) */}
                {node.details && (
                  <div style={{ marginTop: "24px" }} className="prose-gothic">
                    <ReactMarkdown>{node.details}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#4a0e0e]/60 bg-[#1a1a1a]">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-1 text-sm font-spectral text-[#c9a84c]
                           hover:text-[#f0e6d2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>&larr;</span> Previous
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-1 text-sm font-spectral text-[#c9a84c]
                           hover:text-[#f0e6d2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <span>&rarr;</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
