import { tilesOverlapping } from "./level.js";

export const GRAVITY = 1750;
export const JUMP_V = 720;
export const JUMP_V2 = 980;
export const MOVE_SPEED = 250;

const ACCEL = 2000;
const AIR_ACCEL = 1700;
const FRICTION = 1700;
const AIR_FRICTION = 220;
const MAX_FALL = 980;
const COYOTE = 0.12;
const BUFFER = 0.13;

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    w: 26,
    h: 36,
    vx: 0,
    vy: 0,
    onGround: false,
    air: 1,
    coyote: COYOTE,
    buf: 0,
    facing: 1,
    squash: 0,
    stretch: 0,
    invuln: 0,
  };
}

export function updatePlayer(p, input, level, dt) {
  const events = { jump: false, double: false, land: false, hard: false };

  p.invuln = Math.max(0, p.invuln - dt);
  p.squash = Math.max(0, p.squash - dt * 3.4);
  p.stretch = Math.max(0, p.stretch - dt * 3.1);

  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  if (dir !== 0) p.facing = dir;

  const accel = p.onGround ? ACCEL : AIR_ACCEL;
  if (dir !== 0) p.vx += dir * accel * dt;
  else {
    const fr = (p.onGround ? FRICTION : AIR_FRICTION) * dt;
    if (Math.abs(p.vx) <= fr) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * fr;
  }
  if (p.vx > MOVE_SPEED) p.vx = MOVE_SPEED;
  if (p.vx < -MOVE_SPEED) p.vx = -MOVE_SPEED;

  if (!input.locked) {
    if (input.jumpEdge) p.buf = BUFFER;
    else p.buf = Math.max(0, p.buf - dt);

    const canGround = p.onGround || p.coyote > 0;
    if (p.buf > 0 && (canGround || p.air > 0)) {
      if (canGround) {
        p.vy = -JUMP_V;
        p.onGround = false;
        p.coyote = 0;
        p.stretch = 1;
        events.jump = true;
      } else {
        p.vy = -JUMP_V2;
        p.air -= 1;
        p.stretch = 1;
        events.double = true;
      }
      p.buf = 0;
    }
  } else {
    p.buf = 0;
  }

  let gravity = GRAVITY;
  if (!input.jump && p.vy < 0) gravity *= 1.85;
  p.vy = Math.min(MAX_FALL, p.vy + gravity * dt);
  const travelVy = p.vy;
  const prevBottom = p.y + p.h;

  p.x += p.vx * dt;
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  if (p.x + p.w > level.width) {
    p.x = level.width - p.w;
    p.vx = 0;
  }
  resolveX(p, level);

  p.y += p.vy * dt;
  const yHit = resolveY(p, level);
  const supported =
    yHit === "floor" ||
    (p.vy >= 0 && tilesOverlapping(level, p.x + 4, p.y + p.h, p.w - 8, 3).length > 0);

  events.travelVy = travelVy;
  events.prevBottom = prevBottom;

  if (supported && travelVy >= 0 && p.vy >= 0) {
    if (!p.onGround) {
      events.land = true;
      events.hard = travelVy > 280;
      if (travelVy > 160) p.squash = Math.min(1, travelVy / 700);
    }
    p.onGround = true;
    p.air = 1;
    p.coyote = COYOTE;
    p.vy = 0;
  } else {
    if (yHit === "ceil") p.vy = Math.max(0, p.vy);
    if (p.onGround) p.onGround = false;
    else p.coyote -= dt;
  }

  return events;
}

function resolveX(p, level) {
  for (let i = 0; i < 3; i++) {
    const hits = tilesOverlapping(level, p.x, p.y, p.w, p.h);
    if (!hits.length) return;
    if (p.vx > 0) {
      let edge = Infinity;
      for (const t of hits) edge = Math.min(edge, t.x);
      p.x = edge - p.w;
      p.vx = 0;
    } else if (p.vx < 0) {
      let edge = -Infinity;
      for (const t of hits) edge = Math.max(edge, t.x + t.w);
      p.x = edge;
      p.vx = 0;
    } else {
      const t = hits[0];
      const penLeft = p.x + p.w - t.x;
      const penRight = t.x + t.w - p.x;
      if (penLeft < penRight) p.x -= penLeft;
      else p.x += penRight;
    }
  }
}

function resolveY(p, level) {
  const hits = tilesOverlapping(level, p.x, p.y, p.w, p.h);
  if (!hits.length) return null;
  if (p.vy > 0) {
    let edge = Infinity;
    for (const t of hits) edge = Math.min(edge, t.y);
    p.y = edge - p.h;
    p.vy = 0;
    return "floor";
  }
  if (p.vy < 0) {
    let edge = -Infinity;
    for (const t of hits) edge = Math.max(edge, t.y + t.h);
    p.y = edge;
    p.vy = 0;
    return "ceil";
  }
  const t = hits[0];
  p.y = t.y - p.h;
  return "floor";
}
