// @ts-nocheck
"use client";

import { FlapChar } from "@/components/flap/flap-char";

export function FlapLine({ text, size = 28, dark = false, stagger = 22 }) {
  return (
    <div style={{ fontSize: size, lineHeight: 1.25, letterSpacing: "0.02em", whiteSpace: "nowrap" }} aria-label={text}>
      {text.toUpperCase().split("").map((c, i) => (
        <FlapChar key={i + "-" + c} target={c} delay={i * stagger} dark={dark} />
      ))}
    </div>
  );
}
