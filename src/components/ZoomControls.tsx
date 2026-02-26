"use client";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="fixed top-4 left-4 z-[999] flex flex-col gap-1">
      <button
        onClick={onZoomIn}
        className="w-10 h-10 flex items-center justify-center
                   bg-[#1a1a1a]/90 border border-[#4a0e0e] rounded-md
                   text-[#c9a84c] hover:text-[#f0e6d2] hover:border-[#c9a84c]/60
                   transition-all text-xl font-bold backdrop-blur-sm"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="w-10 h-10 flex items-center justify-center
                   bg-[#1a1a1a]/90 border border-[#4a0e0e] rounded-md
                   text-[#c9a84c] hover:text-[#f0e6d2] hover:border-[#c9a84c]/60
                   transition-all text-xl font-bold backdrop-blur-sm"
        aria-label="Zoom out"
      >
        &minus;
      </button>
    </div>
  );
}
