import { LEVEL_COUNT, buildLevel, rectsOverlap, updateEnemies, touchEnemies } from "./level.js";
import { createPlayer, updatePlayer } from "./player.js";
import { VIEW_W, VIEW_H, render } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const stage = document.getElementById("stage");

const keys = new Set();
const hold = { left: false, right: false, jump: false };
let jumpEdge = false;
let jumpLock = false;
let last = performance.now();
let audio;

const LEAF_COLORS = ["#d5ee8a", "#b7d96a", "#e7c56b", "#8fbf72", "#e0a06a"];

const state = {
  mode: "title",
  levelIndex: 0,
  level: null,
  player: null,
  lives: 3,
  camera: { x: 0, y: 40 },
  particles: [],
  time: 0,
  shake: 0,
  flash: 0,
  bannerT: 0,
  dyingT: 0,
  dyingTo: "respawn",
  clearT: 0,
  leafT: 0,
};

function boot() {
  state.level = buildLevel(0);
  state.player = createPlayer(state.level.spawn);
  fit();
  requestAnimationFrame(frame);
}

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, state);
  requestAnimationFrame(frame);
}

function update(dt) {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 28);
  state.flash = Math.max(0, state.flash - dt * 1.6);
  state.bannerT = Math.max(0, state.bannerT - dt);
  updateParticles(dt);
  spawnDrift(dt);

  if (jumpLock && !jumpHeld()) jumpLock = false;

  if (state.mode === "title") {
    updateEnemies(state.level, dt);
    const max = Math.max(0, state.level.width - VIEW_W);
    state.camera.x += dt * 26;
    if (state.camera.x > max) state.camera.x = 0;
    state.camera.y += (40 - state.camera.y) * Math.min(1, dt * 2);
    return;
  }

  if (state.mode === "over" || state.mode === "win") return;

  if (state.mode === "clear") {
    state.clearT -= dt;
    if (state.clearT <= 0) advance();
    return;
  }

  const playing = state.mode === "play";
  const input = playing ? readInput() : { left: false, right: false, jump: false, jumpEdge: false, locked: true };
  const events = updatePlayer(state.player, input, state.level, dt);
  if (events.jump) tone(480, 0.07, "triangle", 0.05);
  if (events.double) {
    tone(720, 0.09, "triangle", 0.06);
    burst(state.player.x + 13, state.player.y + 16, 10, "leaf");
  }
  if (events.land) burst(state.player.x + 13, state.player.y + state.player.h, events.hard ? 7 : 4, "dust");
  if (Math.abs(state.player.vx) > 40 || !state.player.onGround) {
    maybeTrail(dt);
  }

  updateEnemies(state.level, dt);

  if (playing) {
    const hit = touchEnemies(state.player, state.level, events.prevBottom, events.travelVy);
    if (hit.stomped.length) {
      const e = hit.stomped[hit.stomped.length - 1];
      state.player.y = e.y - state.player.h;
      state.player.vy = -560;
      state.player.onGround = false;
      state.player.coyote = 0;
      state.player.air = 1;
      state.player.squash = 0.7;
      state.shake = Math.max(state.shake, 5);
      tone(190, 0.06, "square", 0.04);
      burst(e.x + e.w / 2, e.y, 8, "dust");
    } else if (hit.hurt) {
      const e = hit.hurt;
      const dir = state.player.x + state.player.w / 2 < e.x + e.w / 2 ? -1 : 1;
      state.player.vx = dir * 280;
      state.player.vy = -340;
      state.player.onGround = false;
      damage("hit");
    }

    for (const m of state.level.motes) {
      if (m.got) continue;
      const dx = state.player.x + state.player.w / 2 - m.x;
      const dy = state.player.y + state.player.h / 2 - m.y;
      if (dx * dx + dy * dy < 28 * 28) {
        m.got = true;
        tone(880, 0.06, "sine", 0.04);
        setTimeout(() => tone(1180, 0.08, "sine", 0.035), 50);
        burst(m.x, m.y, 8, "spark");
      }
    }

    if (rectsOverlap(state.player, state.level.shrine)) {
      state.mode = "clear";
      state.clearT = 0.85;
      state.shake = 4;
      chime();
      burst(state.level.shrine.x + 18, state.level.shrine.y + 20, 16, "spark");
    } else if (state.player.y + state.player.h > state.level.height + 6) {
      damage("pit");
    }
  }

  if (state.mode === "dying") {
    state.dyingT -= dt;
    if (state.dyingT <= 0) {
      if (state.dyingTo === "over") {
        state.mode = "over";
        showOverlay("over");
      } else {
        reloadLevel();
        state.player.invuln = 0.9;
        state.mode = "play";
      }
    }
  }

  followCamera(dt);
}

function damage(kind) {
  if (state.mode !== "play") return;
  if (kind === "hit" && state.player.invuln > 0) return;
  state.lives -= 1;
  state.shake = kind === "pit" ? 7 : 10;
  state.flash = 1;
  tone(140, 0.16, "sawtooth", 0.04);
  if (state.lives <= 0) {
    state.mode = "dying";
    state.dyingTo = "over";
    state.dyingT = 0.9;
    state.player.invuln = 2;
    return;
  }
  if (kind === "pit") {
    state.mode = "dying";
    state.dyingTo = "respawn";
    state.dyingT = 0.65;
    return;
  }
  state.player.invuln = 1.35;
}

function advance() {
  if (state.levelIndex + 1 >= LEVEL_COUNT) {
    state.mode = "win";
    showOverlay("win");
    return;
  }
  state.levelIndex += 1;
  reloadLevel();
  state.mode = "play";
}

function reloadLevel() {
  state.level = buildLevel(state.levelIndex);
  state.player = createPlayer(state.level.spawn);
  state.bannerT = 2.5;
  state.particles = state.particles.filter((p) => p.space === "screen");
  snapCamera();
}

function newGame() {
  state.lives = 3;
  state.levelIndex = 0;
  state.mode = "play";
  jumpLock = true;
  reloadLevel();
  showOverlay("hidden");
  document.body.dataset.playing = "1";
  ensureAudio();
}

function followCamera(dt) {
  const d = desiredCamera();
  const k = Math.min(1, dt * 5);
  state.camera.x += (d.x - state.camera.x) * k;
  state.camera.y += (d.y - state.camera.y) * k;
}

function snapCamera() {
  const d = desiredCamera();
  state.camera.x = d.x;
  state.camera.y = d.y;
}

function desiredCamera() {
  const p = state.player;
  let x = p.x + p.w / 2 - VIEW_W / 2;
  let y = p.y + p.h / 2 - VIEW_H * 0.58;
  const maxX = Math.max(0, state.level.width - VIEW_W);
  const maxY = Math.max(0, state.level.height - VIEW_H + 80);
  x = clamp(x, 0, maxX);
  y = clamp(y, 0, maxY);
  return { x, y };
}

function readInput() {
  const edge = jumpEdge;
  jumpEdge = false;
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA") || hold.left,
    right: keys.has("ArrowRight") || keys.has("KeyD") || hold.right,
    jump: jumpHeld(),
    jumpEdge: edge || false,
    locked: jumpLock,
  };
}

function jumpHeld() {
  return (
    keys.has("Space") ||
    keys.has("KeyZ") ||
    keys.has("ArrowUp") ||
    keys.has("KeyW") ||
    hold.jump
  );
}

function spawnDrift(dt) {
  state.leafT -= dt;
  if (state.leafT > 0) return;
  state.leafT = 0.45 + Math.random() * 0.6;
  state.particles.push({
    space: "screen",
    kind: "leaf",
    x: Math.random() * VIEW_W,
    y: -10,
    vx: -16 + Math.random() * 28,
    vy: 18 + Math.random() * 20,
    g: 0,
    life: 6,
    max: 6,
    rot: Math.random() * 6,
    vr: -1 + Math.random() * 2,
    size: 4 + Math.random() * 3,
    color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
  });
}

function maybeTrail(dt) {
  if (Math.random() > dt * 18) return;
  state.particles.push({
    space: "world",
    kind: "spark",
    x: state.player.x + state.player.w / 2,
    y: state.player.y + state.player.h * 0.55,
    vx: -state.player.vx * 0.15 + (Math.random() - 0.5) * 20,
    vy: Math.random() * 10,
    g: -10,
    life: 0.35,
    max: 0.35,
    size: 2.4,
    color: "rgba(220, 255, 210, 0.9)",
    rot: 0,
    vr: 0,
  });
}

function burst(x, y, count, kind) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const speed = kind === "spark" ? 40 + Math.random() * 70 : 30 + Math.random() * 80;
    state.particles.push({
      space: "world",
      kind,
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - (kind === "leaf" ? 20 : 0),
      g: kind === "spark" ? 20 : 180,
      life: 0.45 + Math.random() * 0.35,
      max: 0.8,
      rot: Math.random() * 6,
      vr: -3 + Math.random() * 6,
      size: kind === "dust" ? 3 : 4 + Math.random() * 2,
      color: kind === "spark" ? "#fff1c2" : LEAF_COLORS[i % LEAF_COLORS.length],
    });
  }
  if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.g || 0) * dt;
    p.rot += (p.vr || 0) * dt;
  }
  state.particles = state.particles.filter((p) => {
    if (p.life <= 0) return false;
    if (p.space === "screen" && p.y > VIEW_H + 30) return false;
    return true;
  });
}

function showOverlay(mode) {
  overlay.dataset.mode = mode;
  document.body.dataset.playing = mode === "hidden" ? "1" : "0";
}

function activateMenu() {
  if (state.mode === "title" || state.mode === "over" || state.mode === "win") newGame();
}

window.addEventListener("keydown", (e) => {
  const jumpKey = e.code === "Space" || e.code === "KeyZ" || e.code === "ArrowUp" || e.code === "KeyW";
  if (!keys.has(e.code) && jumpKey) jumpEdge = true;
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Enter" || (e.code === "Space" && state.mode !== "play" && state.mode !== "dying" && state.mode !== "clear")) {
    activateMenu();
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("blur", () => {
  keys.clear();
  hold.left = hold.right = hold.jump = false;
});

window.addEventListener("resize", fit);

document.getElementById("start").addEventListener("click", activateMenu);
document.getElementById("retry").addEventListener("click", activateMenu);
document.getElementById("again").addEventListener("click", activateMenu);

for (const btn of document.querySelectorAll("#touch button")) {
  const name = btn.dataset.hold;
  const down = (e) => {
    e.preventDefault();
    hold[name] = true;
    if (name === "jump") jumpEdge = true;
  };
  const up = () => {
    hold[name] = false;
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointerleave", up);
  btn.addEventListener("pointercancel", up);
}

function ensureAudio() {
  if (audio) {
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audio = new Ctx();
  return audio;
}

function tone(freq, dur, type, gain) {
  const ac = ensureAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function chime() {
  tone(523, 0.12, "sine", 0.05);
  setTimeout(() => tone(659, 0.12, "sine", 0.045), 90);
  setTimeout(() => tone(784, 0.2, "sine", 0.04), 180);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

boot();
