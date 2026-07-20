// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { C, MONO } from "@/lib/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .·";

export function FlapChar({ target, delay, dark }) {
  const reduced = useReducedMotion();
  const [ch, setCh] = useState(" ");
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (reduced) { setCh(target); setSettled(true); return; }
    let cancelled = false;
    let step = 0;
    const spins = 4 + Math.floor(Math.random() * 4);
    const timer = setTimeout(function spin() {
      if (cancelled) return;
      if (step < spins) {
        setCh(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
        step++;
        setTimeout(spin, 45);
      } else {
        setCh(target);
        setSettled(true);
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [target, delay, reduced]);
  return (
    <span
      style={{
        display: "inline-block",
        width: "1.15ch",
        textAlign: "center",
        fontFamily: MONO,
        background: dark ? C.darkPanel : C.ink,
        color: settled ? (dark ? C.warmWhite : C.paper) : (dark ? C.indigoGlow : C.paperDeep),
        borderRadius: 2,
        margin: "0 1px",
        boxShadow: dark ? "inset 0 -1px 0 rgba(133,131,240,0.25)" : "inset 0 -2px 0 rgba(0,0,0,0.45)",
        transition: "color 120ms",
      }}
    >
      {ch === " " ? " " : ch}
    </span>
  );
}
