export const TILE = 48;
export const PLAYER_W = 26;
export const PLAYER_H = 36;
export const ENEMY_W = 34;
export const ENEMY_H = 26;

const LEVELS = [
  {
    name: "First Light",
    hint: "Hold jump, then jump again in the air to climb.",
    w: 56,
    h: 13,
    stone: [
      [0, 9, 14, 2],
      [17, 9, 39, 2],
      [36, 5, 1, 6],
      [37, 5, 19, 3],
    ],
    logs: [],
    p: [2, 8],
    shrine: [50, 4],
    enemies: [[22, 8]],
    motes: [
      [15, 7],
      [44, 4],
    ],
  },
  {
    name: "Mossbridge",
    hint: "The high path is the only way across the mist.",
    w: 78,
    h: 14,
    stone: [
      [0, 10, 16, 2],
      [16, 6, 1, 6],
      [17, 6, 17, 3],
      [52, 8, 26, 3],
    ],
    logs: [[37, 6, 12, 1]],
    p: [2, 9],
    shrine: [72, 7],
    enemies: [
      [11, 9],
      [24, 5],
      [42, 5],
      [60, 7],
    ],
    motes: [
      [20, 4],
      [44, 4],
      [68, 6],
    ],
  },
  {
    name: "Lantern Leap",
    hint: "A full second jump carries the wide mist.",
    w: 86,
    h: 14,
    stone: [
      [0, 10, 9, 2],
      [30, 10, 10, 2],
      [40, 6, 1, 6],
      [41, 6, 15, 3],
      [61, 6, 25, 3],
    ],
    logs: [
      [12, 10, 6, 1],
      [21, 10, 6, 1],
    ],
    p: [2, 9],
    shrine: [78, 5],
    enemies: [
      [14, 9],
      [23, 9],
      [46, 5],
    ],
    motes: [
      [15, 8],
      [34, 8],
      [50, 4],
      [58, 4],
      [70, 4],
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function blank(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function stamp(grid, rects, value) {
  for (const [x, y, w, h] of rects) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        grid[y + j][x + i] = value;
      }
    }
  }
}

export function levelName(index) {
  return LEVELS[index].name;
}

export function buildLevel(index) {
  const def = LEVELS[index];
  const grid = blank(def.w, def.h);
  stamp(grid, def.stone, 1);
  stamp(grid, def.logs, 2);

  const spawn = {
    x: def.p[0] * TILE + 10,
    y: (def.p[1] + 1) * TILE - PLAYER_H - 0.1,
  };

  const enemies = def.enemies.map(([tx, ty], i) => ({
    x: tx * TILE + (TILE - ENEMY_W) / 2,
    y: (ty + 1) * TILE - ENEMY_H - 0.1,
    w: ENEMY_W,
    h: ENEMY_H,
    vx: (i % 2 === 0 ? 1 : -1) * (62 + (i % 3) * 14),
    anim: i * 1.7,
    dead: false,
    deadT: 0,
    squash: 0,
    gone: false,
    hue: 0.15 * i,
  }));

  const motes = def.motes.map(([tx, ty], i) => ({
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
    got: false,
    phase: i * 1.3 + tx * 0.2,
  }));

  const shrine = {
    x: def.shrine[0] * TILE + 6,
    y: (def.shrine[1] + 1) * TILE - 82,
    w: 36,
    h: 82,
  };

  const decor = [];
  for (let ty = 0; ty < def.h; ty++) {
    for (let tx = 0; tx < def.w; tx++) {
      if (!grid[ty][tx]) continue;
      if (ty > 0 && grid[ty - 1][tx]) continue;
      const n = hash(tx + index * 19, ty + 3);
      if (n < 0.8) continue;
      decor.push({
        x: tx * TILE + 8 + n * 28,
        y: ty * TILE,
        kind: n > 0.96 ? "shroom" : "fern",
        n,
      });
    }
  }

  const fireflies = [];
  for (let i = 0; i < 42; i++) {
    const n = hash(i + 4, index + 11);
    const n2 = hash(index + 2, i + 9);
    fireflies.push({
      x: n * def.w * TILE,
      y: n2 * def.h * TILE * 0.85,
      phase: n * Math.PI * 2,
      drift: 10 + n2 * 18,
    });
  }

  const level = {
    index,
    name: def.name,
    hint: def.hint,
    w: def.w,
    h: def.h,
    width: def.w * TILE,
    height: def.h * TILE,
    grid,
    spawn,
    enemies,
    motes,
    shrine,
    decor,
    fireflies,
  };

  assertFloor(level, spawn.x + PLAYER_W / 2, spawn.y + PLAYER_H, "spawn");
  for (const e of enemies) assertFloor(level, e.x + e.w / 2, e.y + e.h, "enemy");
  assertFloor(level, shrine.x + shrine.w / 2, shrine.y + shrine.h, "shrine");
  return level;
}

function assertFloor(level, x, feet, label) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor((feet + 1) / TILE);
  if (!solidAt(level, tx, ty)) {
    throw new Error(`Level ${level.index} ${label} has no floor at ${tx},${ty}`);
  }
}

export function solidAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) return false;
  return level.grid[ty][tx] !== 0;
}

export function tileKind(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) return 0;
  return level.grid[ty][tx];
}

export function solidAtPoint(level, x, y) {
  return solidAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function tilesOverlapping(level, x, y, w, h) {
  const x0 = Math.floor(x / TILE);
  const y0 = Math.floor(y / TILE);
  const x1 = Math.floor((x + w - 0.01) / TILE);
  const y1 = Math.floor((y + h - 0.01) / TILE);
  const hits = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const kind = tileKind(level, tx, ty);
      if (!kind) continue;
      hits.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE, kind, tx, ty });
    }
  }
  return hits;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function updateEnemies(level, dt) {
  for (const e of level.enemies) {
    if (e.dead) {
      e.deadT -= dt;
      e.squash = Math.min(1, e.squash + dt * 7);
      if (e.deadT <= 0) e.gone = true;
      continue;
    }
    e.anim += dt;
    const dir = Math.sign(e.vx) || 1;
    const speed = Math.abs(e.vx);
    const next = e.x + dir * speed * dt;
    const front = dir > 0 ? next + e.w + 1 : next - 1;
    const wall =
      solidAtPoint(level, front, e.y + 6) || solidAtPoint(level, front, e.y + e.h - 4);
    const aheadX = e.x + e.w / 2 + dir * (e.w * 0.55 + 8);
    const floor = solidAtPoint(level, aheadX, e.y + e.h + 4);
    if (wall || !floor) e.vx = -dir * speed;
    else e.x = next;
  }
  level.enemies = level.enemies.filter((e) => !e.gone);
}

export function touchEnemies(player, level, prevBottom, travelVy) {
  const stomped = [];
  let hurt = null;
  const currBottom = player.y + player.h;

  for (const e of level.enemies) {
    if (e.dead) continue;
    const horiz = player.x < e.x + e.w - 4 && player.x + player.w > e.x + 4;
    const fromAbove = travelVy > 40 && prevBottom <= e.y + 14 && currBottom >= e.y - 2;
    if (horiz && fromAbove) {
      e.dead = true;
      e.deadT = 0.22;
      stomped.push(e);
      continue;
    }
    if (!hurt && player.invuln <= 0 && rectsOverlap(player, e)) hurt = e;
  }
  return { stomped, hurt };
}
