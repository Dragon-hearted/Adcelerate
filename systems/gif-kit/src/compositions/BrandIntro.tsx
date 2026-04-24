import React from "react";
import { interpolate, Sequence, useCurrentFrame } from "remotion";
import { COLORS, theme } from "../../../../design-system/adapters/remotion";

// Scene 1: frames 0-59 — wordmark fade-in on paper background
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: 800,
        height: 800,
        background: theme.paper.bgDeepest,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: "'Archivo Black', 'Inter', sans-serif",
          fontSize: 72,
          fontWeight: 900,
          color: theme.paper.accent,
          letterSpacing: "-2px",
        }}
      >
        Adcelerate
      </span>
    </div>
  );
};

// Scene 2: frames 60-119 — hub-and-spoke on midnight-purple
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const glow = interpolate(frame, [0, 30, 60], [0.4, 1, 0.4], { extrapolateRight: "clamp" });

  const satellites = [
    { angle: 45, label: "Reach" },
    { angle: 135, label: "Convert" },
    { angle: 225, label: "Retain" },
    { angle: 315, label: "Grow" },
  ];

  return (
    <div
      style={{
        width: 800,
        height: 800,
        background: COLORS.bgDeepest,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Satellite spokes */}
      {satellites.map(({ angle, label }) => {
        const rad = (angle * Math.PI) / 180;
        const x = 400 + Math.cos(rad) * 220;
        const y = 400 + Math.sin(rad) * 220;
        return (
          <React.Fragment key={label}>
            {/* Dashed line */}
            <svg
              style={{ position: "absolute", inset: 0, width: 800, height: 800, overflow: "visible" }}
            >
              <line
                x1={400} y1={400} x2={x} y2={y}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={glow * 0.7}
              />
            </svg>
            {/* Satellite node */}
            <div
              style={{
                position: "absolute",
                left: x - 34,
                top: y - 34,
                width: 68,
                height: 68,
                borderRadius: "50%",
                border: `2px solid ${COLORS.accent}`,
                background: COLORS.bgMid,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 ${12 * glow}px ${COLORS.accent}55`,
              }}
            >
              <span style={{ fontSize: 11, color: COLORS.textSecondary, fontFamily: "'Inter', sans-serif" }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Center hub */}
      <div
        style={{
          position: "absolute",
          left: 400 - 52,
          top: 400 - 52,
          width: 104,
          height: 104,
          borderRadius: "50%",
          background: COLORS.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${24 * glow}px ${COLORS.accent}99`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
          Brand
        </span>
      </div>
    </div>
  );
};

export const BrandIntro: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={60}>
      <Scene1 />
    </Sequence>
    <Sequence from={60} durationInFrames={60}>
      <Scene2 />
    </Sequence>
  </>
);
