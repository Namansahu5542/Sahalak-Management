"use client";

import { useEffect, useRef } from "react";

const PATH = "M62 179 C145 181 151 82 243 91 S351 221 444 194 S485 62 570 83 S672 107 730 65";
const DURATION = 5600;

export default function SignupRouteAnimation() {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const progressRef = useRef(null);
  const travelerRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    const progress = progressRef.current;
    const traveler = travelerRef.current;
    if (!path || !progress || !traveler) return;

    const length = path.getTotalLength();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let inView = true;

    const draw = (fraction) => {
      const point = path.getPointAtLength(length * fraction);
      traveler.setAttribute("transform", `translate(${point.x} ${point.y - 9})`);
      progress.style.strokeDashoffset = String(1 - fraction);
    };
    const tick = (time) => {
      elapsed += previousTime ? Math.min(time - previousTime, 100) : 0;
      previousTime = time;
      draw((elapsed % DURATION) / DURATION);
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => {
      if (reducedMotion.matches) {
        stop();
        draw(1);
      } else if (inView && !document.hidden) {
        if (!frame) {
          previousTime = 0;
          frame = requestAnimationFrame(tick);
        }
      } else stop();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(svgRef.current);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    sync();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <svg ref={svgRef} className="h-full w-full overflow-visible" viewBox="0 0 800 250" role="img" aria-labelledby="signup-route-title signup-route-desc">
      <title id="signup-route-title">A worker finds a shop in the market</title>
      <desc id="signup-route-desc">A person follows a warm amber route to a highlighted shop.</desc>
      <path d={PATH} className="fill-none stroke-[#B99D73]/20 [stroke-width:16] [stroke-linecap:round] [filter:blur(8px)]" />
      <path ref={pathRef} d={PATH} className="fill-none stroke-[#6C5636] [stroke-width:3] [stroke-dasharray:3_12] [stroke-linecap:round]" />
      <path ref={progressRef} d={PATH} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} className="fill-none stroke-[#B99D73] [stroke-width:4] [stroke-linecap:round]" />
      <g transform="translate(730 55)">
        <path d="M0-36c-18 0-32 14-32 32 0 24 32 61 32 61S32 20 32-4C32-22 18-36 0-36Z" className="fill-[#B99D73]" />
        <circle cy="-5" r="8" className="fill-[#090907]" />
        <circle cy="-4" r="35" className="fill-none stroke-[#B99D73]/50 [stroke-width:2]" />
        <path d="M-12 14h24v19h-24zM-16 14l4-9h24l4 9" className="fill-[#6C5636] stroke-[#090907] [stroke-width:2] [stroke-linejoin:round]" />
        <path d="M-3 33V21h7v12" className="fill-[#090907]" />
      </g>
      <g ref={travelerRef} transform="translate(62 170)">
        <ellipse cy="28" rx="15" ry="3" className="fill-black/60" />
        <circle cy="-14" r="9" className="fill-[#B99D73] stroke-[#090907] [stroke-width:2]" />
        <path d="M-10 0Q-10-4-6-4H6Q10-4 10 0V20H-10Z" className="fill-[#6C5636]" />
        <path d="M-6 18v10M6 18v10" className="fill-none stroke-[#B99D73] [stroke-width:4] [stroke-linecap:round]" />
        <path d="M9 2h9v11H9z" className="fill-[#B99D73] stroke-[#090907] [stroke-width:1.5]" />
      </g>
    </svg>
  );
}
