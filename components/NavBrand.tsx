"use client";

export default function NavBrand() {
  return (
    <span className="flex items-baseline leading-none select-none">
      <span className="text-[15px] font-bold tracking-tight text-white">
        Guard
      </span>
      <span
        style={{
          backgroundImage:
            "linear-gradient(to right, #6EE7B7, #34D399, #22C55E, #6EE7B7)",
          backgroundSize: "300% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          animation: "navGradient 8s ease-in-out infinite",
          fontSize: "15px",
          fontWeight: "800",
          letterSpacing: "-0.02em",
        }}
      >
        IA
      </span>
    </span>
  );
}
