"use client";

import { useState, useEffect, useCallback } from "react";
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

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  // Reset to first image when the images array changes (new node)
  useEffect(() => {
    setCurrent(0);
  }, [images]);

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c + 1) % images.length);
    },
    [images.length]
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrent((c) => (c - 1 + images.length) % images.length);
    },
    [images.length]
  );

  return (
    <div className="relative w-full" style={{ height: "320px" }}>
      <AnimatePresence mode="wait">
        <motion.img
          key={images[current]}
          src={images[current]}
          alt=""
          className="absolute inset-0 w-full h-full object-contain bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          {/* Prev / Next buttons */}
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9
                       flex items-center justify-center rounded-full
                       bg-black/50 text-[#c9a84c] hover:text-[#f0e6d2]
                       hover:bg-black/70 transition-all text-lg"
            aria-label="Previous image"
          >
            &lsaquo;
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9
                       flex items-center justify-center rounded-full
                       bg-black/50 text-[#c9a84c] hover:text-[#f0e6d2]
                       hover:bg-black/70 transition-all text-lg"
            aria-label="Next image"
          >
            &rsaquo;
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
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
    </div>
  );
}

export function SidePanel({
  node,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: SidePanelProps) {
  // Build the image list: use images array if available, else fall back to thumbnail
  const images = node?.images?.length ? node.images : node ? [node.thumbnail] : [];

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
            className="fixed inset-0 bg-black/60 z-[1000]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[1001] flex flex-col overflow-hidden
                       bg-[#1a1a1a]/95 backdrop-blur-sm border border-[#4a0e0e]
                       rounded-lg shadow-2xl"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(720px, 90vw)",
              maxHeight: "85vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                         rounded-full bg-black/40 text-[#c9a84c] hover:text-[#f0e6d2]
                         hover:bg-black/60 transition-all text-lg"
              aria-label="Close panel"
            >
              &times;
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Image carousel */}
              <ImageCarousel images={images} />

              {/* Text content */}
              <div style={{ padding: "24px 32px 32px 32px" }}>
                <h2 className="font-cinzel text-2xl text-[#f0e6d2] font-bold leading-tight">
                  {node.title}
                </h2>

                <div style={{ marginTop: "16px" }}>
                  <p className="text-[#d4c5a9] font-spectral leading-relaxed text-base">
                    {node.summary}
                  </p>
                </div>

                {node.details && (
                  <div style={{ marginTop: "20px" }} className="prose-gothic">
                    <ReactMarkdown>{node.details}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation footer */}
            <div
              className="flex items-center justify-between border-t border-[#4a0e0e]/60 bg-[#1a1a1a]"
              style={{ padding: "12px 32px" }}
            >
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
