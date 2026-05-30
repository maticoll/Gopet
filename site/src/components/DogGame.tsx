"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CELL = 28;
const COLS = 18;
const ROWS = 14;
const W = CELL * COLS;
const H = CELL * ROWS;

const RATIONS = [
  { name: "Maxine Cachorros",     image: "/images/p01.jpg", color: "#E87010" },
  { name: "Maxine Adultos",       image: "/images/p02.jpg", color: "#C20808" },
  { name: "Maxine Senior",        image: "/images/p03.jpg", color: "#4E9A1A" },
  { name: "Maxine Razas Peq.",    image: "/images/p04.jpg", color: "#9A2A80" },
  { name: "Maxine Gatos",         image: "/images/p05.jpg", color: "#2878B8" },
  { name: "Maxine Gatos Cast.",   image: "/images/p06.jpg", color: "#C02888" },
  { name: "Lager Senior",         image: "/images/p07.jpg", color: "#223A88" },
  { name: "Lager Razas Peq.",     image: "/images/p08.jpg", color: "#008A80" },
  { name: "Lager Cachorros",      image: "/images/p09.jpg", color: "#6AAE18" },
  { name: "Lager Gatos",          image: "/images/p10.jpg", color: "#B81870" },
  { name: "Lager Gatos Cast.",    image: "/images/p11.jpg", color: "#702480" },
  { name: "Lager Adultos",        image: "/images/p12.jpg", color: "#D07010" },
];

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

function randCell(): Point {
  return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
}

function randRation(preloaded: HTMLImageElement[]) {
  const idx = Math.floor(Math.random() * RATIONS.length);
  return { ...RATIONS[idx], img: preloaded[idx] };
}

type Food = { pos: Point; name: string; color: string; img: HTMLImageElement };

export default function DogGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesReady, setImagesReady] = useState(false);

  // Preload all bag images
  useEffect(() => {
    let loaded = 0;
    const imgs = RATIONS.map((r) => {
      const img = new Image();
      img.src = r.image;
      img.onload = () => { loaded++; if (loaded === RATIONS.length) setImagesReady(true); };
      img.onerror = () => { loaded++; if (loaded === RATIONS.length) setImagesReady(true); };
      return img;
    });
    imagesRef.current = imgs;
  }, []);

  const stateRef = useRef({
    snake: [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }] as Point[],
    dir: { x: 1, y: 0 } as Dir,
    nextDir: { x: 1, y: 0 } as Dir,
    food: null as Food | null,
    score: 0,
    eaten: null as string | null,
    eatenTimer: 0,
    eatenColor: "#E87010",
    running: false,
    dead: false,
  });

  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");
  const [eaten, setEaten] = useState<{ name: string; color: string } | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);
  const TICK = 120;

  const makeFood = useCallback((snake: Point[]): Food => {
    let pos;
    do { pos = randCell(); }
    while (snake.some(s => s.x === pos.x && s.y === pos.y));
    const r = randRation(imagesRef.current);
    return { pos, name: r.name, color: r.color, img: r.img };
  }, []);

  const reset = useCallback(() => {
    const snake = [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }];
    const s = stateRef.current;
    s.snake = snake;
    s.dir = { x: 1, y: 0 };
    s.nextDir = { x: 1, y: 0 };
    s.food = makeFood(snake);
    s.score = 0;
    s.eaten = null;
    s.eatenTimer = 0;
    s.dead = false;
    s.running = true;
    setScore(0);
    setEaten(null);
    setPhase("playing");
  }, [makeFood]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // BG
    ctx.fillStyle = "#FFF8F0";
    ctx.fillRect(0, 0, W, H);

    // Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(61,32,16,0.028)" : "rgba(61,32,16,0.048)";
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }

    // Food — bolsita
    if (s.food) {
      const { pos: fp, img: fi, color: fc } = s.food;
      const fx = fp.x * CELL;
      const fy = fp.y * CELL;
      const pad = 2;

      // Glow
      ctx.save();
      ctx.shadowColor = fc;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(fx + pad, fy + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.restore();

      // White bg card
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(fx + pad, fy + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.clip();
      if (fi && fi.complete && fi.naturalWidth > 0) {
        ctx.drawImage(fi, fx + pad, fy + pad, CELL - pad * 2, CELL - pad * 2);
      } else {
        ctx.fillStyle = fc;
        ctx.fillRect(fx + pad, fy + pad, CELL - pad * 2, CELL - pad * 2);
      }
      ctx.restore();

      // Color border
      ctx.strokeStyle = fc;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(fx + pad, fy + pad, CELL - pad * 2, CELL - pad * 2, 5);
      ctx.stroke();
    }

    // Snake body — rounded segments with gradient
    for (let i = s.snake.length - 1; i >= 1; i--) {
      const seg = s.snake[i];
      const t = i / s.snake.length;
      const alpha = Math.max(0.3, 1 - t * 0.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.dead ? "#AAA" : "#8B5E3C";
      const r = CELL * 0.34;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + CELL / 2 - r, seg.y * CELL + CELL / 2 - r, r * 2, r * 2, r * 0.55);
      ctx.fill();
      // Shine
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(seg.x * CELL + CELL / 2 - r * 0.2, seg.y * CELL + CELL / 2 - r * 0.2, r * 0.55, r * 0.35, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Dog head ──
    const head = s.snake[0];
    const hx = head.x * CELL + CELL / 2;
    const hy = head.y * CELL + CELL / 2;
    const d = s.dir;
    const perp = { x: -d.y, y: d.x };
    const R = CELL * 0.46;

    ctx.save();

    // Ear shadow
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 4;

    // Ears
    const earColor = s.dead ? "#999" : "#A0622A";
    ctx.fillStyle = earColor;
    for (const side of [1, -1]) {
      const ex = hx + perp.x * R * 0.75 * side + d.x * R * 0.25;
      const ey = hy + perp.y * R * 0.75 * side + d.y * R * 0.25;
      ctx.beginPath();
      ctx.ellipse(ex, ey, R * 0.38, R * 0.52, Math.atan2(perp.y * side + d.y * 0.3, perp.x * side + d.x * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Head circle
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(hx, hy, R, 0, Math.PI * 2);

    // Fur gradient
    const grad = ctx.createRadialGradient(hx - d.x * R * 0.2, hy - d.y * R * 0.2, R * 0.1, hx, hy, R);
    if (s.dead) {
      grad.addColorStop(0, "#CCC");
      grad.addColorStop(1, "#999");
    } else {
      grad.addColorStop(0, "#DFA060");
      grad.addColorStop(1, "#B06020");
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();

    // Snout
    const snoutX = hx + d.x * R * 0.38;
    const snoutY = hy + d.y * R * 0.38;
    ctx.fillStyle = s.dead ? "#BBB" : "#C8905A";
    ctx.beginPath();
    ctx.ellipse(snoutX, snoutY, R * 0.42, R * 0.30, Math.atan2(d.y, d.x), 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = s.dead ? "#888" : "#4A2010";
    const noseX = snoutX + d.x * R * 0.22;
    const noseY = snoutY + d.y * R * 0.22;
    ctx.beginPath();
    ctx.ellipse(noseX, noseY, R * 0.18, R * 0.12, Math.atan2(d.y, d.x), 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    if (!s.dead) {
      ctx.fillStyle = "#1A0800";
      for (const side of [1, -1]) {
        const eyeX = hx + perp.x * R * 0.35 * side + d.x * R * 0.1;
        const eyeY = hy + perp.y * R * 0.35 * side + d.y * R * 0.1;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, R * 0.14, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(eyeX + R * 0.06, eyeY - R * 0.06, R * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1A0800";
      }
    } else {
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1.8;
      for (const side of [1, -1]) {
        const eyeX = hx + perp.x * R * 0.35 * side + d.x * R * 0.1;
        const eyeY = hy + perp.y * R * 0.35 * side + d.y * R * 0.1;
        const er = R * 0.13;
        ctx.beginPath();
        ctx.moveTo(eyeX - er, eyeY - er); ctx.lineTo(eyeX + er, eyeY + er);
        ctx.moveTo(eyeX + er, eyeY - er); ctx.lineTo(eyeX - er, eyeY + er);
        ctx.stroke();
      }
    }

    // Eaten popup
    if (s.eaten && s.eatenTimer > 0) {
      const alpha = Math.min(1, s.eatenTimer / 15);
      const yOff = (1 - s.eatenTimer / 40) * -18;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      // Pill bg
      const txt = `+1 ${s.eaten}`;
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = s.eatenColor;
      ctx.beginPath();
      ctx.roundRect(hx - tw / 2 - 5, hy - CELL - 4 + yOff, tw + 10, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(txt, hx, hy - CELL + yOff + 12);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  // Game loop
  const loop = useCallback((ts: number) => {
    const s = stateRef.current;
    if (!s.running) return;

    if (ts - lastTickRef.current >= TICK) {
      lastTickRef.current = ts;
      s.dir = s.nextDir;

      const head = s.snake[0];
      const nx = head.x + s.dir.x;
      const ny = head.y + s.dir.y;

      // Wall collision
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        s.dead = true;
        s.running = false;
        draw();
        setPhase("dead");
        return;
      }

      // Self collision
      if (s.snake.some(seg => seg.x === nx && seg.y === ny)) {
        s.dead = true;
        s.running = false;
        draw();
        setPhase("dead");
        return;
      }

      const newHead = { x: nx, y: ny };
      s.snake.unshift(newHead);

      // Eat food
      if (s.food && nx === s.food.pos.x && ny === s.food.pos.y) {
        s.score += 1;
        s.eaten = s.food.name;
        s.eatenColor = s.food.color;
        s.eatenTimer = 40;
        setScore(s.score);
        setEaten({ name: s.food.name, color: s.food.color });
        setTimeout(() => setEaten(null), 900);
        s.food = makeFood(s.snake);
      } else {
        s.snake.pop();
      }

      if (s.eatenTimer > 0) s.eatenTimer--;
    }

    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, makeFood]);

  useEffect(() => {
    if (phase === "playing") {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [phase, loop]);

  // Draw idle frame once images are ready
  useEffect(() => { if (imagesReady) draw(); }, [imagesReady, draw]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
      if (phase === "idle" || phase === "dead") {
        if (e.key === " " || e.key === "Enter") { reset(); return; }
      }
      if (!s.running) return;
      if (e.key === "ArrowUp"    && s.dir.y === 0) s.nextDir = { x: 0, y: -1 };
      if (e.key === "ArrowDown"  && s.dir.y === 0) s.nextDir = { x: 0, y:  1 };
      if (e.key === "ArrowLeft"  && s.dir.x === 0) s.nextDir = { x:-1, y:  0 };
      if (e.key === "ArrowRight" && s.dir.x === 0) s.nextDir = { x: 1, y:  0 };
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, reset]);

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { if (phase !== "playing") reset(); return; }
    if (phase !== "playing") { reset(); return; }
    const s = stateRef.current;
    if (!s.running) { reset(); return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && s.dir.x === 0) s.nextDir = { x: 1, y: 0 };
      if (dx < 0 && s.dir.x === 0) s.nextDir = { x:-1, y: 0 };
    } else {
      if (dy > 0 && s.dir.y === 0) s.nextDir = { x: 0, y:  1 };
      if (dy < 0 && s.dir.y === 0) s.nextDir = { x: 0, y: -1 };
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none w-full">
      {/* Score + eaten toast */}
      <div className="flex items-center gap-5 h-8">
        <div className="font-heading font-black text-2xl" style={{ color:"#3D2010" }}>
          🦴 {score}
        </div>
        {eaten && (
          <div className="text-xs font-bold px-3 py-1 rounded-full text-white transition-all"
               style={{ backgroundColor: eaten.color }}>
            {eaten.name}!
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden"
           style={{ border:"2px solid #E8C8A8", boxShadow:"0 8px 40px rgba(61,32,16,0.14)", maxWidth:"100%" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display:"block", maxWidth:"100%", touchAction:"none" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />

        {/* Overlay */}
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
               style={{ backgroundColor:"rgba(255,248,240,0.93)", backdropFilter:"blur(6px)" }}>
            {phase === "idle" && (
              <>
                <div className="text-6xl">🐶</div>
                <h3 className="font-heading font-black text-2xl text-center" style={{ color:"#3D2010" }}>
                  ¡Hora de comer!
                </h3>
                <p className="text-sm text-center max-w-[200px]" style={{ color:"#9C7050" }}>
                  Come todas las bolsas de ración que puedas
                </p>
                <button onClick={reset}
                  className="px-7 py-3 rounded-full font-heading font-bold text-white text-sm cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor:"#E87010" }}>
                  Jugar 🎮
                </button>
                <p className="text-xs" style={{ color:"#C4A080" }}>← → ↑ ↓ · deslizá · no toques las paredes</p>
              </>
            )}
            {phase === "dead" && (
              <>
                <div className="text-5xl">😵</div>
                <h3 className="font-heading font-black text-2xl" style={{ color:"#C20808" }}>
                  ¡Ay, perdiste!
                </h3>
                <p className="font-heading font-bold text-lg" style={{ color:"#3D2010" }}>
                  🦴 {score} {score === 1 ? "ración" : "raciones"}
                </p>
                <button onClick={reset}
                  className="px-7 py-3 rounded-full font-heading font-bold text-white text-sm cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor:"#E87010" }}>
                  Reintentar 🔄
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
