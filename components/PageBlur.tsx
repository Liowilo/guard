"use client";

import { useEffect, useState } from "react";
import GradualBlur from "./GradualBlur";

export default function PageBlur() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const footer = document.getElementById("page-footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <GradualBlur
      target="page"
      position="bottom"
      height="8rem"
      strength={2}
      divCount={6}
      curve="bezier"
      exponential
      opacity={1}
    />
  );
}
