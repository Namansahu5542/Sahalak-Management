"use client";

import { useEffect, useRef, useState } from "react";

const stops = [
  { title: "Post the role", text: "Need a cashier for Saturday or extra hands for the season? Share the role, dates, hours, and pay in one clear listing.", shop: "Fresh Mart", icon: "🥬" },
  { title: "Meet nearby people", text: "Connect with workers who are already close to your market. They can see the details and decide if the shift works for them.", shop: "Footwear", icon: "👟" },
  { title: "Choose what fits", text: "Fill a short shift, arrange recurring help, or find someone for a longer role. Keep expectations clear from day one.", shop: "Sweets", icon: "🍬" },
  { title: "Show up with confidence", text: "Workers know where to go, when to arrive, and what the work involves. Businesses know who is joining the team.", shop: "Sarees", icon: "🥻" },
  { title: "Build trust over time", text: "Every completed shift helps local workers and businesses build a stronger working relationship.", shop: "Bags", icon: "👜" },
  { title: "Work close to home", text: "Find a nearby opportunity, understand the pay up front, and make flexible work part of your routine.", shop: "Mobiles", icon: "📱" },
];

export default function MarketJourney() {
  const sectionRef = useRef(null);
  const svgRef = useRef(null);
  const personRef = useRef(null);
  const bigRef = useRef(null);
  const [layout, setLayout] = useState({ height: 0, points: [] });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 100);
    };
    const build = () => {
      const width = section.clientWidth;
      const mobile = width < 620;
      const tablet = width < 900;
      const segment = mobile ? 300 : tablet ? 315 : 335;
      const half = Math.min(width * (mobile ? 0.34 : tablet ? 0.32 : 0.31), mobile ? 150 : 330);
      const left = width / 2 - half;
      const right = width / 2 + half;
      const points = [[width / 2, 118]];
      for (let i = 1; i <= stops.length; i += 1) points.push([i % 2 ? right : left, 118 + i * segment]);
      const endY = 118 + (stops.length + 0.88) * segment;
      points.push([width / 2, endY]);
      const height = endY + 40;
      setLayout({ height, points, endY, width, left, right, mobile, tablet });
      section.style.height = `${height}px`;
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(section);
    window.addEventListener("resize", onResize);
    return () => { observer.disconnect(); window.removeEventListener("resize", onResize); clearTimeout(resizeTimer); };
  }, []);

  useEffect(() => {
    if (!layout.points.length || !svgRef.current) return undefined;
    const d = `M${layout.points.map((point) => point.join(" ")).join(" L")}`;
    svgRef.current.setAttribute("width", layout.width);
    svgRef.current.setAttribute("height", layout.height);
    svgRef.current.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svgRef.current.innerHTML = `<path class="road-edge" d="${d}"/><path class="road-base" d="${d}"/><path class="road-line" d="${d}"/><path class="trail" d="${d}"/>`;
    const road = svgRef.current.querySelector(".road-base");
    const trail = svgRef.current.querySelector(".trail");
    const length = road.getTotalLength();
    trail.style.strokeDasharray = `${length} ${length}`;
    trail.style.strokeDashoffset = length;
    const cards = [...sectionRef.current.querySelectorAll(".journey-card")];
    const shops = [...sectionRef.current.querySelectorAll(".market-shop")];
    const { width, left, right, mobile, tablet, endY, height } = layout;
    document.querySelector("#market-gate").style.top = "54px";
    const shopWidth = mobile ? 92 : tablet ? 122 : 146;
    stops.forEach((_, i) => {
      const y = layout.points[i + 1][1];
      const onRight = (i + 1) % 2 === 1;
      const shop = shops[i];
      const shopLeft = onRight
        ? Math.min(width - shopWidth - 12, right + 42)
        : Math.max(12, left - 42 - shopWidth);
      shop.style.cssText += `;width:${shopWidth}px;left:${shopLeft}px;top:${y - (mobile ? 126 : 84)}px`;
      const card = cards[i];
      const cardWidth = mobile ? width - 36 : Math.min(370, width * 0.37);
      card.style.top = `${mobile ? y + 54 : y - 70}px`;
      card.style.left = `${mobile ? 18 : onRight ? Math.max(22, width * 0.045) : width - Math.max(22, width * 0.045) - cardWidth}px`;
    });
    const big = bigRef.current;
    const bigWidth = Math.min(430, width * 0.78);
    big.style.cssText += `;width:${bigWidth}px;left:${(width - bigWidth) / 2}px;top:${endY - 220}px`;
    sectionRef.current.querySelector(".journey-end").style.top = `${height - 28}px`;

    let raf = 0;
    let walkTimer;
    const yToLength = (y) => {
      let low = 0; let high = length;
      for (let i = 0; i < 24; i += 1) {
        const mid = (low + high) / 2;
        if (road.getPointAtLength(mid).y < y) low = mid; else high = mid;
      }
      return high;
    };
    const tick = () => {
      const sectionRect = sectionRef.current.getBoundingClientRect();
      const walkY = Math.min(Math.max(window.innerHeight * 0.52 - sectionRect.top, 118), endY);
      const currentLength = yToLength(walkY);
      const point = road.getPointAtLength(currentLength);
      const next = road.getPointAtLength(Math.min(currentLength + 7, length));
      const person = personRef.current;
      person.style.transform = `translate(${point.x - 22}px,${point.y - 70}px)`;
      person.firstElementChild.style.transform = next.x < point.x - 0.2 ? "scaleX(-1)" : "";
      trail.style.strokeDashoffset = length - currentLength;
      shops.forEach((shop, i) => shop.classList.toggle("lit", Math.abs(walkY - layout.points[i + 1][1]) < 105));
      cards.forEach((card, i) => card.classList.toggle("active", Math.abs(walkY - layout.points[i + 1][1]) < 155));
      const arrived = walkY >= endY - 3;
      person.classList.toggle("arrived", arrived);
      big.classList.toggle("open", arrived);
      person.classList.add("walking");
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => person.classList.remove("walking"), 160);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; tick(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); clearTimeout(walkTimer); };
  }, [layout]);

  return (
    <section className="journey" id="journey" ref={sectionRef} aria-label="How Sahalak connects market businesses and workers">
      <svg className="road-svg" ref={svgRef} aria-hidden="true" />
      <div id="market-gate" className="gate" aria-hidden="true"><span> MARKET</span><small>Local work starts here</small></div>
      {stops.map((stop, i) => (
        <article className="journey-card" key={stop.title}>
          <div className="card-index">{String(i + 1).padStart(2, "0")} / Sahalak</div>
          <h3>{stop.title}</h3><p>{stop.text}</p>
        </article>
      ))}
      {stops.map((stop) => <div className="market-shop" key={stop.shop} aria-hidden="true"><div className="shop-sign">{stop.shop}</div><div className="shop-awning" /><div className="shop-front"><span>{stop.icon}</span><span>{stop.icon}</span></div></div>)}
      <div className="big-shop" ref={bigRef} aria-hidden="true"><div className="big-sign">SAHALAK</div><div className="big-awning" /><div className="big-body"><span>🛍️</span><div className="big-door" /><span>🏪</span></div></div>
      <div className="walker" ref={personRef} aria-hidden="true"><svg viewBox="0 0 45 78"><ellipse cx="22" cy="75" rx="13" ry="3" fill="#000" opacity=".18"/><g className="limb leg-a"><rect x="14" y="48" width="7" height="24" rx="3.5" fill="#24437a"/></g><g className="limb leg-b"><rect x="24" y="48" width="7" height="24" rx="3.5" fill="#172d54"/></g><rect x="10" y="25" width="24" height="29" rx="10" fill="#d96573"/><g className="limb arm-a"><rect x="6" y="32" width="7" height="20" rx="3.5" fill="#d9a77e"/></g><g className="limb arm-b"><rect x="32" y="32" width="7" height="20" rx="3.5" fill="#d9a77e"/></g><circle cx="22" cy="15" r="10" fill="#efc39b"/><path d="M12 13a10 10 0 0 1 20 0c-5-4-15-4-20 0z" fill="#26352c"/></svg></div>
      <div className="journey-end"><span>✦</span> Find a good fit, close to home</div>
    </section>
  );
}
