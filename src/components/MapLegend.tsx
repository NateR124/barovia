"use client";

export function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        left: 48,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #d5c8a8, #c4b48a, #b8a87a, #c9bb98)",
          border: "2px solid #6b5c3e",
          borderRadius: 3,
          padding: "18px 22px",
          color: "#3a3020",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 248, 230, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.1)",
          fontFamily: "'Spectral', serif",
          fontSize: 14,
        }}
      >
        {/* Traveled path */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <svg width="48" height="20" viewBox="0 0 48 20">
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
          <span style={{ color: "#3a3020" }}>Traveled</span>
        </div>

        {/* Teleported path */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="48" height="20" viewBox="0 0 48 20">
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
          <span style={{ color: "#3a3020" }}>Teleported</span>
        </div>
      </div>
    </div>
  );
}
