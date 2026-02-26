"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TimelineNode } from "@/types/timeline";

interface SidePanelProps {
  node: TimelineNode | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function SidePanel({
  node,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: SidePanelProps) {
  const images = node?.images?.length ? node.images : node ? [node.thumbnail] : [];
  const [current, setCurrent] = useState(0);

  // Reset to first image when the node changes
  useEffect(() => {
    setCurrent(0);
  }, [node?.id]);

  const goPrevImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c - 1 + images.length) % images.length);
    },
    [images.length]
  );

  const goNextImage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c + 1) % images.length);
    },
    [images.length]
  );

  return (
    <AnimatePresence mode="wait">
      {node && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            padding: "40px",
          }}
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
                       rounded-full bg-black/60 text-[#c9a84c] hover:text-[#f0e6d2]
                       hover:bg-black/80 transition-all text-xl"
            aria-label="Close"
          >
            &times;
          </button>

          {/* Image */}
          <motion.div
            key={node.id + "-" + current}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center justify-center"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[current]}
              alt={node.title}
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "6px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </motion.div>

          {/* Carousel controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrevImage}
                className="absolute z-10 flex items-center justify-center rounded-full
                           bg-black/70 text-[#c9a84c] hover:text-[#f0e6d2]
                           hover:bg-black/90 transition-all"
                style={{
                  left: "clamp(12px, 8vw, 80px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "56px",
                  height: "56px",
                  fontSize: "32px",
                  lineHeight: 1,
                }}
                aria-label="Previous image"
              >
                &lsaquo;
              </button>
              <button
                onClick={goNextImage}
                className="absolute z-10 flex items-center justify-center rounded-full
                           bg-black/70 text-[#c9a84c] hover:text-[#f0e6d2]
                           hover:bg-black/90 transition-all"
                style={{
                  right: "clamp(12px, 8vw, 80px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "56px",
                  height: "56px",
                  fontSize: "32px",
                  lineHeight: 1,
                }}
                aria-label="Next image"
              >
                &rsaquo;
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrent(idx);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === current
                        ? "bg-[#c9a84c] scale-125"
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Image ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Node navigation (previous/next node) */}
          <div
            className="absolute bottom-6 right-6 flex gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1 text-sm font-spectral text-[#c9a84c]
                         hover:text-[#f0e6d2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                         bg-black/60 rounded-full"
              style={{ padding: "6px 14px" }}
            >
              <span>&larr;</span> Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1 text-sm font-spectral text-[#c9a84c]
                         hover:text-[#f0e6d2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                         bg-black/60 rounded-full"
              style={{ padding: "6px 14px" }}
            >
              Next <span>&rarr;</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
