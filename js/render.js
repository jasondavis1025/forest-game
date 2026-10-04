import { TILE, tileKind } from "./level.js";

export const VIEW_W = 960;
export const VIEW_H = 540;

const PALETTES = [
  {
    top: "#16303a",
    mid: "#3e6a56",
    horizon: "#f0c48a",
    glow: "#ffe7b8",
    hill: "#1c3b32",
    hill2: "#142e28",
    tree: "#10241e",
    tree2: "#1a3a30",
    mist: "rgba(186, 228, 206, 0.22)",
  },
  {
    top: "#1a2438",
    mid: "#3a5560",
    horizon: "#e7a3c4",
    glow: "#ffd6e8",
    hill: "#1a3040",
    hill2: "#142430",
    tree: "#101c28",
    tree2: "#1a3044",
    mist: "rgba(186, 214, 228, 0.2)",
  },
  {
    top: "#141820",
    mid: "#2a3e48",
    horizon: "#f0b56a",
    glow: "#ffe1a8",
    hill: "#18242c",
    hill2: "#10181e",
    tree: "#0e1614",
    tree2: "#1a2c28",
    mist: "rgba(210, 196, 160, 0.18)",
  },
];

export function render(ctx, state) {
  const palette = PALETTES[state.level.index] || PALETTES[0];
  drawSky(ctx, state, palette);

  ctx.save();
  if (state.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackdrop(ctx, state, palette);

  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawPitMist(ctx, state, palette);
  drawTiles(ctx, state);
  drawGapVeil(ctx, state);
  drawDecor(ctx, state);
  drawShrine(ctx, state);
  drawMotes(ctx, state);
  drawEnemies(ctx, state);
  if (state.player) drawPlayer(ctx, state);
  drawWorldParticles(ctx, state);
  ctx.restore();

  drawScreenLeaves(ctx, state);
  ctx.restore();

  drawVignette(ctx, state);
  if (state.mode === "play" || state.mode === "dying" || state.mode === "clear") {
    drawHud(ctx, state);
  }
}

function drawSky(ctx, state, palette) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, palette.top);
  g.addColorStop(0.45, palette.mid);
  g.addColorStop(0.78, palette.horizon);
  g.addColorStop(1, "#6d8f78");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const sunX = VIEW_W * 0.72 - state.camera.x * 0.02;
  const sunY = 168;
  const sun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
  sun.addColorStop(0, "rgba(255, 236, 196, 0.95)");
  sun.addColorStop(0.35, hexAlpha(palette.glow, 0.45));
  sun.addColorStop(1, "rgba(255, 220, 170, 0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#fff4d2";
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(-0.5 + i * 0.22 + Math.sin(state.time * 0.15 + i) * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(520, -36);
    ctx.lineTo(540, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBackdrop(ctx, state, palette) {
  const horizon = 292;
  drawHill(ctx, state.camera.x * 0.12, horizon + 36, palette.hill2, 90, 0.012);
  drawTreeLine(ctx, state, horizon + 8, 0.18, 210, palette.tree, 150, 0);
  drawHill(ctx, state.camera.x * 0.28, horizon + 58, palette.hill, 70, 0.02);
  drawTreeLine(ctx, state, horizon + 24, 0.38, 150, palette.tree2, 118, 1);

  ctx.save();
  ctx.globalAlpha = 0.18;
  const mist = ctx.createLinearGradient(0, horizon + 20, 0, VIEW_H);
  mist.addColorStop(0, "rgba(255,255,255,0)");
  mist.addColorStop(0.4, palette.mist);
  mist.addColorStop(1, "rgba(8, 16, 14, 0.15)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, horizon, VIEW_W, VIEW_H - horizon);
  ctx.restore();
}

function drawHill(ctx, scroll, y, color, amp, freq) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 8) {
    const h = Math.sin((x + scroll) * freq) * amp + Math.sin((x + scroll) * freq * 2.3) * amp * 0.25;
    ctx.lineTo(x, y + h);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawTreeLine(ctx, state, groundY, parallax, span, color, height, variant) {
  const off = mod(state.camera.x * parallax, span);
  for (let i = -1; i < VIEW_W / span + 2; i++) {
    const x = i * span - off;
    const n = ((i * 17 + variant * 13 + state.level.index * 3) % 7) + 2;
    drawCanopy(ctx, x + span * 0.5, groundY, height + (n % 4) * 16, color, variant + n);
  }
}

function drawCanopy(ctx, x, groundY, h, color, seed) {
  ctx.fillStyle = color;
  const trunkW = 10 + (seed % 5);
  ctx.fillRect(x - trunkW / 2, groundY - h * 0.45, trunkW, h * 0.5);
  ctx.beginPath();
  ctx.ellipse(x, groundY - h * 0.62, h * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(x - h * 0.16, groundY - h * 0.78, h * 0.26, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + h * 0.18, groundY - h * 0.7, h * 0.22, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPitMist(ctx, state, palette) {
  const level = state.level;
  const top = level.height - TILE * 3.2;
  const g = ctx.createLinearGradient(0, top, 0, level.height + 80);
  g.addColorStop(0, "rgba(180, 230, 210, 0)");
  g.addColorStop(0.35, palette.mist);
  g.addColorStop(1, "rgba(232, 255, 244, 0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(0, top, level.width, level.height - top + 80);

  ctx.save();
  for (let i = 0; i < 8; i++) {
    const y = top + 30 + i * 22 + Math.sin(state.time * 0.7 + i) * 8;
    ctx.globalAlpha = 0.05 + (i % 3) * 0.02;
    ctx.fillStyle = "#e7fff4";
    ctx.beginPath();
    const wave = Math.sin(state.time * 0.4 + i) * 40;
    ctx.ellipse(level.width * (0.1 + i * 0.11) + wave, y, 180, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTiles(ctx, state) {
  const level = state.level;
  const x0 = Math.max(0, Math.floor(state.camera.x / TILE) - 1);
  const x1 = Math.min(level.w - 1, Math.floor((state.camera.x + VIEW_W) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(state.camera.y / TILE) - 1);
  const y1 = Math.min(level.h - 1, Math.floor((state.camera.y + VIEW_H) / TILE) + 2);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const kind = tileKind(level, tx, ty);
      if (!kind) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      const surface = !tileKind(level, tx, ty - 1);
      const leftOpen = !tileKind(level, tx - 1, ty);
      const rightOpen = !tileKind(level, tx + 1, ty);
      if (kind === 2) drawLog(ctx, x, y, tx, ty, surface);
      else drawStone(ctx, x, y, tx, ty, surface, leftOpen, rightOpen);
      if (!tileKind(level, tx, ty + 1)) drawVine(ctx, x, y, tx, ty);
    }
  }
}

function drawStone(ctx, x, y, tx, ty, surface, leftOpen, rightOpen) {
  const n = fract(tx * 12.3 + ty * 4.7);
  if (!surface) {
    ctx.fillStyle = "#22362e";
    ctx.fillRect(x, y, TILE + 0.5, TILE + 0.5);
    if (n > 0.92) {
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fillRect(x + 12, y + 18, 12, 2);
    }
    edgeShade(ctx, x, y, leftOpen, rightOpen);
    return;
  }

  ctx.fillStyle = "#2c4638";
  ctx.fillRect(x, y + 12, TILE + 0.5, TILE - 11);
  ctx.fillStyle = "#4d8a52";
  roundRect(ctx, x - 1, y + 1, TILE + 2, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#9dcc78";
  ctx.fillRect(x + 7, y + 5, 16 + ((n * 14) | 0), 3);
  ctx.fillStyle = "#e4f6c4";
  ctx.fillRect(x + 9, y + 4, 7, 2);
  edgeShade(ctx, x, y + 12, leftOpen, rightOpen);
  void ty;
}

function edgeShade(ctx, x, y, leftOpen, rightOpen) {
  if (leftOpen) {
    ctx.fillStyle = "#14241c";
    ctx.fillRect(x, y, 5, TILE);
  }
  if (rightOpen) {
    ctx.fillStyle = "#101c16";
    ctx.fillRect(x + TILE - 5, y, 5, TILE);
  }
}

function drawGapVeil(ctx, state) {
  const level = state.level;
  const x0 = Math.max(0, Math.floor(state.camera.x / TILE) - 1);
  const x1 = Math.min(level.w - 1, Math.floor((state.camera.x + VIEW_W) / TILE) + 1);
  for (let tx = x0; tx <= x1; tx++) {
    let top = -1;
    for (let ty = 0; ty < level.h; ty++) {
      if (tileKind(level, tx, ty) || tileKind(level, tx - 1, ty) || tileKind(level, tx + 1, ty)) {
        top = ty;
        break;
      }
    }
    if (top < 0) continue;
    let ty = top;
    while (ty < level.h && tileKind(level, tx, ty)) ty++;
    if (ty >= level.h) continue;
    const y = ty * TILE;
    const h = (level.h - ty) * TILE + 80;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(226, 255, 236, 0.02)");
    g.addColorStop(0.25, "rgba(186, 236, 214, 0.22)");
    g.addColorStop(1, "rgba(244, 255, 248, 0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(tx * TILE, y, TILE + 0.5, h);
    const wy = y + 24 + ((state.time * 36 + tx * 23) % Math.max(20, h - 30));
    ctx.fillStyle = "rgba(255, 252, 230, 0.45)";
    ctx.beginPath();
    ctx.ellipse(tx * TILE + 24, wy, 7, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLog(ctx, x, y, tx, ty, surface) {
  ctx.fillStyle = "#5a3b24";
  roundRect(ctx, x + 1, y + 12, 46, 26, 12);
  ctx.fill();
  ctx.fillStyle = "#7a5434";
  ctx.fillRect(x + 4, y + 18, 40, 4);
  ctx.fillStyle = "#3e2918";
  ctx.fillRect(x + 4, y + 28, 40, 3);
  ctx.fillStyle = "#c4a07a";
  ctx.beginPath();
  ctx.arc(x + 8, y + 25, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4a2e";
  ctx.beginPath();
  ctx.arc(x + 8, y + 25, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (surface) {
    ctx.fillStyle = "#4e7d4a";
    ctx.beginPath();
    ctx.ellipse(x + 26, y + 13, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b7d98a";
    ctx.fillRect(x + 16, y + 11, 12, 2);
  }
  void ty;
}

function drawVine(ctx, x, y, tx, ty) {
  const n = fract(tx * 3.1 + ty * 9.4);
  if (n < 0.45) return;
  const len = 10 + n * 26;
  ctx.strokeStyle = "rgba(70, 120, 72, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 12 + n * 20, y + TILE - 2);
  ctx.quadraticCurveTo(x + 20, y + TILE + len * 0.6, x + 14 + n * 16, y + TILE + len);
  ctx.stroke();
  ctx.fillStyle = "#6ea36a";
  ctx.beginPath();
  ctx.ellipse(x + 14 + n * 16, y + TILE + len, 5, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawDecor(ctx, state) {
  for (const d of state.level.decor) {
    if (d.x < state.camera.x - 40 || d.x > state.camera.x + VIEW_W + 40) continue;
    if (d.kind === "shroom") drawShroom(ctx, d);
    else drawFern(ctx, d);
  }
}

function drawFern(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.strokeStyle = "#2f6a3c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-2, -10, 1, -16);
  ctx.stroke();
  ctx.fillStyle = "#7fbf6a";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-6 + i * 5, -6 - i * 3, 6, 2.4, -0.6 + i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShroom(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.fillStyle = "#efe6d4";
  roundRect(ctx, -2, -8, 4, 8, 1);
  ctx.fill();
  ctx.fillStyle = d.n > 0.98 ? "#e07a62" : "#d8c56a";
  ctx.beginPath();
  ctx.ellipse(0, -9, 8, 5, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(-2, -11, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShrine(ctx, state) {
  const s = state.level.shrine;
  const t = state.time;
  const pulse = 0.65 + Math.sin(t * 2.2) * 0.35;
  const cx = s.x + s.w / 2;
  const base = s.y + s.h;

  const glow = ctx.createRadialGradient(cx, base - 48, 4, cx, base - 40, 70);
  glow.addColorStop(0, `rgba(255, 226, 160, ${0.35 * pulse})`);
  glow.addColorStop(1, "rgba(255, 220, 150, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, base - 46, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 214, 150, ${0.08 + pulse * 0.06})`;
  ctx.fillRect(cx - 8, base - 250, 16, 190);

  ctx.fillStyle = "#3e4a46";
  roundRect(ctx, s.x, base - 58, 8, 58, 3);
  ctx.fill();
  roundRect(ctx, s.x + s.w - 8, base - 58, 8, 58, 3);
  ctx.fill();
  ctx.fillStyle = "#55645c";
  roundRect(ctx, s.x - 2, base - 64, s.w + 4, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#d7c48a";
  ctx.fillRect(s.x + 4, base - 61, s.w - 8, 2);

  ctx.fillStyle = "#6b5a3a";
  ctx.fillRect(cx - 1.5, base - 52, 3, 16);
  const flame = ctx.createRadialGradient(cx, base - 58, 2, cx, base - 56, 14);
  flame.addColorStop(0, "#fff6d0");
  flame.addColorStop(0.45, "#ffc46a");
  flame.addColorStop(1, "rgba(255, 160, 70, 0)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.ellipse(cx, base - 60 + Math.sin(t * 6) * 1.2, 7, 12 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(120, 90, 50, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, base - 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMotes(ctx, state) {
  for (const m of state.level.motes) {
    if (m.got) continue;
    const y = m.y + Math.sin(state.time * 2.4 + m.phase) * 5;
    const glow = ctx.createRadialGradient(m.x, y, 1, m.x, y, 16);
    glow.addColorStop(0, "rgba(255, 236, 180, 0.9)");
    glow.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e4";
    ctx.beginPath();
    ctx.arc(m.x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 236, 190, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(m.x, y, 8 + Math.sin(state.time * 3 + m.phase) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.level.enemies) {
    drawBeetle(ctx, e, state.time);
  }
}

function drawBeetle(ctx, e, time) {
  const cx = e.x + e.w / 2;
  const feet = e.y + e.h;
  const squash = e.squash || 0;
  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(1 + squash * 0.35, 1 - squash * 0.72);
  if (e.dead) ctx.globalAlpha = Math.max(0, e.deadT / 0.22);

  ctx.fillStyle = "rgba(10, 16, 12, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const step = Math.sin(e.anim * 10);
  ctx.strokeStyle = "#1a1422";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ox = side * (6 + i * 4);
      const lift = side * step * (i === 1 ? 3 : -2);
      ctx.beginPath();
      ctx.moveTo(ox, -8);
      ctx.lineTo(ox + side * 4, -2 + lift);
      ctx.stroke();
    }
  }

  const body = ctx.createLinearGradient(0, -26, 0, -4);
  body.addColorStop(0, "#6d5a8e");
  body.addColorStop(0.45, "#3c3158");
  body.addColorStop(1, "#241c30");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -12, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(-3, -16, 6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();

  const dir = Math.sign(e.vx) || 1;
  ctx.fillStyle = "#f2d48a";
  ctx.beginPath();
  ctx.arc(dir * 8, -13, 2.3, 0, Math.PI * 2);
  ctx.arc(dir * 3, -12, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.arc(dir * 8.6, -13, 1, 0, Math.PI * 2);
  ctx.arc(dir * 3.6, -12, 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#c8b6e0";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.quadraticCurveTo(-10, -28 - Math.sin(time * 3 + e.anim) * 2, -6, -24);
  ctx.moveTo(4, -20);
  ctx.quadraticCurveTo(10, -28 - Math.cos(time * 3 + e.anim) * 2, 6, -24);
  ctx.stroke();

  ctx.restore();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;

  const cx = p.x + p.w / 2;
  const feet = p.y + p.h;
  const bob = p.onGround && Math.abs(p.vx) < 20 ? Math.sin(state.time * 2.4) * 1.6 : 0;
  const dist = groundDistance(state.level, p);
  const shadowA = Math.max(0.08, 0.32 - dist / 280);
  const shadowR = 10 + Math.min(18, dist / 18);

  ctx.fillStyle = `rgba(8, 16, 12, ${shadowA})`;
  ctx.beginPath();
  ctx.ellipse(cx, feet + 1, shadowR, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, feet + bob);
  ctx.scale(p.facing * (1 + p.squash * 0.16), 1 - p.squash * 0.2 + p.stretch * 0.08);

  const glow = ctx.createRadialGradient(0, -20, 2, 0, -18, 28);
  glow.addColorStop(0, "rgba(230, 255, 210, 0.55)");
  glow.addColorStop(1, "rgba(180, 255, 190, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -20, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9ee6b8";
  ctx.beginPath();
  ctx.ellipse(0, -16, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9fff0";
  ctx.beginPath();
  ctx.ellipse(-1, -14, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const sway = Math.sin(state.time * 3 + Math.abs(p.vx) * 0.02) * 0.3;
  drawLeaf(ctx, -7, -28, -0.8 + sway, "#d5ee8a");
  drawLeaf(ctx, 0, -32, sway * 0.4, "#f3ffc4");
  drawLeaf(ctx, 7, -28, 0.8 - sway, "#b7d96a");

  ctx.fillStyle = "#1c2a22";
  ctx.beginPath();
  ctx.ellipse(-4, -18, 1.7, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(3.5, -18, 1.7, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-3.4, -18.8, 0.6, 0, Math.PI * 2);
  ctx.arc(4.1, -18.8, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawLeaf(ctx, x, y, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 100, 40, 0.45)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.restore();
}

function groundDistance(level, p) {
  const tx = Math.floor((p.x + p.w / 2) / TILE);
  const start = Math.floor((p.y + p.h) / TILE);
  for (let ty = start; ty < level.h; ty++) {
    if (tileKind(level, tx, ty)) return ty * TILE - (p.y + p.h);
  }
  return 420;
}

function drawWorldParticles(ctx, state) {
  for (const f of state.level.fireflies) {
    const x = f.x + Math.sin(state.time * 0.6 + f.phase) * f.drift;
    const y = f.y + Math.cos(state.time * 0.45 + f.phase) * 10;
    const a = 0.35 + Math.sin(state.time * 3 + f.phase) * 0.25;
    ctx.fillStyle = `rgba(255, 236, 170, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  drawParticleList(ctx, state.particles.filter((p) => p.space !== "screen"));
}

function drawScreenLeaves(ctx, state) {
  drawParticleList(ctx, state.particles.filter((p) => p.space === "screen"));
}

function drawParticleList(ctx, list) {
  for (const p of list) {
    const a = Math.max(0, p.life / p.max);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot || 0);
    if (p.kind === "leaf") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "dust") {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -1, p.size * 2, 2);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawVignette(ctx, state) {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(4, 8, 8, 0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 92, 80, ${state.flash * 0.18})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawHud(ctx, state) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.font = "600 22px Fraunces, Georgia, serif";
  ctx.fillStyle = "#f6f1df";
  ctx.textAlign = "center";
  ctx.fillText(state.level.name, VIEW_W / 2, 36);

  const pipY = 58;
  for (let i = 0; i < 3; i++) {
    const x = VIEW_W / 2 - 22 + i * 22;
    ctx.beginPath();
    ctx.arc(x, pipY, 4, 0, Math.PI * 2);
    ctx.fillStyle = i <= state.level.index ? "#f0c48a" : "rgba(246, 241, 223, 0.25)";
    ctx.fill();
  }

  for (let i = 0; i < 3; i++) {
    drawLifePip(ctx, 28 + i * 28, 32, i < state.lives);
  }

  const got = state.level.motes.filter((m) => m.got).length;
  const total = state.level.motes.length;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(8, 14, 12, 0.45)";
  roundRect(ctx, VIEW_W - 118, 12, 92, 30, 15);
  ctx.fill();
  ctx.shadowBlur = 8;
  ctx.textAlign = "right";
  ctx.font = "500 18px Outfit, system-ui, sans-serif";
  ctx.fillStyle = "#fff6d4";
  ctx.beginPath();
  ctx.arc(VIEW_W - 96, 27, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6f1df";
  ctx.fillText(`${got}/${total}`, VIEW_W - 28, 33);

  if (state.bannerT > 0) {
    const a = Math.min(1, state.bannerT);
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.font = "600 42px Fraunces, Georgia, serif";
    ctx.fillStyle = "#f6f1df";
    ctx.fillText(state.level.name, VIEW_W / 2, VIEW_H * 0.28);
    if (state.level.hint) {
      ctx.font = "400 18px Outfit, system-ui, sans-serif";
      ctx.fillStyle = "#e7f5c8";
      ctx.fillText(state.level.hint, VIEW_W / 2, VIEW_H * 0.28 + 32);
    }
  }
  ctx.restore();
}

function drawLifePip(ctx, x, y, lit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = lit ? 1 : 0.28;
  ctx.fillStyle = lit ? "#b6f3c8" : "#d5d0c4";
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit ? "#e7ffb0" : "#eee8dc";
  ctx.beginPath();
  ctx.ellipse(0, -6, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function fract(n) {
  return n - Math.floor(n);
}
