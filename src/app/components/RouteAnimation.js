"use client";

import { useEffect, useRef } from "react";

const ROUTE = "M62 179 C145 181 151 82 243 91 S351 221 444 194 S485 62 570 83 S672 107 730 65";
const DURATION = 5600;

export default function RouteAnimation() {
  const svgRef = useRef(null);
  const routeRef = useRef(null);
  const progressRef = useRef(null);
  const travelerRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    const route = routeRef.current;
    const progress = progressRef.current;
    const traveler = travelerRef.current;
    const pulse = pulseRef.current;
    if (!svg || !route || !progress || !traveler || !pulse) return;

    const length = route.getTotalLength(); // measured once
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let inView = true;

    const draw = (fraction, wave) => {
      const p = route.getPointAtLength(length * fraction);
      traveler.setAttribute("transform", `translate(${p.x} ${p.y - 9})`);
      progress.style.strokeDashoffset = String(1 - fraction); // pathLength=1 on this path
      pulse.setAttribute("r", String(34 + wave * 12));
      pulse.style.opacity = String(0.14 + (1 - wave) * 0.42);
    };

    const tick = (now) => {
      elapsed += last ? Math.min(now - last, 100) : 0; // clamp so tab-switch doesn't jump
      last = now;
      draw((elapsed % DURATION) / DURATION, (Math.sin(elapsed / 650) + 1) / 2);
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // single place that decides: animate, freeze, or pause
    const sync = () => {
      if (motion.matches) {
        stop();
        draw(1, 0.1);
      } else if (inView && !document.hidden) {
        if (!frame) {
          last = 0;
          frame = requestAnimationFrame(tick);
        }
      } else {
        stop();
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(svg);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    sync();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <svg ref={svgRef} className="h-full w-full overflow-visible" viewBox="0 0 800 250" role="img" aria-labelledby="route-title route-desc">
      <title id="route-title">A person follows a market lane to a shop</title>
      <desc id="route-desc">A person moves along a glowing curved path and reaches a shop location marker.</desc>

      {/* static glow (rasterised once, never re-filtered) */}
      <path d={ROUTE} className="fill-none stroke-[#D4FF3F]/25 [stroke-width:14] [stroke-linecap:round] [filter:blur(8px)]" />
      <path ref={routeRef} d={ROUTE} className="fill-none stroke-[#D4FF3F]/50 [stroke-width:3] [stroke-dasharray:3_12] [stroke-linecap:round]" />
      <path
        ref={progressRef}
        d={ROUTE}
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        className="fill-none stroke-[#D4FF3F] [stroke-width:4] [stroke-linecap:round]"
      />

      <g transform="translate(730 55)">
        <path d="M0-36c-18 0-32 14-32 32 0 24 32 61 32 61S32 20 32-4C32-22 18-36 0-36Z" className="fill-[#FF2DAB]" />
        <circle cy="-5" r="8" className="fill-[#0B0B0B]" />
        <circle ref={pulseRef} cy="-4" r="35" className="fill-none stroke-[#FF2DAB] [stroke-width:2]" />
        <path d="M-12 14h24v19h-24zM-16 14l4-9h24l4 9" className="fill-[#D4FF3F] stroke-[#0B0B0B] [stroke-width:2] [stroke-linejoin:round]" />
        <path d="M-3 33V21h7v12" className="fill-[#0B0B0B]" />
      </g>

      <g ref={travelerRef} transform="translate(62 170)">
        <ellipse cy="28" rx="15" ry="3" className="fill-black opacity-60" />
        <circle cy="-14" r="9" className="fill-[#FF2DAB] stroke-[#0B0B0B] [stroke-width:2]" />
        <path d="M-10 0Q-10-4-6-4H6Q10-4 10 0V20H-10Z" className="fill-[#FF2DAB]" />
        <path d="M-6 18v10M6 18v10" className="fill-none stroke-[#D4FF3F] [stroke-width:4] [stroke-linecap:round]" />
        <path d="M9 2h9v11H9z" className="fill-[#D4FF3F] stroke-[#0B0B0B] [stroke-width:1.5]" />
      </g>
    </svg>
  );
}