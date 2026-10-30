// The confetti burst for a win at or under par, kept pure so it can be unit-tested. The pieces
// are the same every time (a fixed seed), fly up and out from the end station in world units,
// fall under gravity and fade out over CONFETTI_SECONDS. Drawing them is scene.drawConfetti.

export const CONFETTI_SECONDS = 1.6;
export const CONFETTI_PIECES = 28;
const GRAVITY = 5; // world units per second², gentle, so the pieces hang in the air a moment
const DRAG = 1.2; // per second, so pieces slow down and drift instead of arcing like stones

// One piece, `k` of the way (0–1) through the burst: where it is (world units), how far it has
// spun (radians), how visible it still is (0–1) and which of the three confetti colours it is.
export interface ConfettiPiece {
  x: number;
  y: number;
  spin: number;
  alpha: number;
  colour: 0 | 1 | 2;
}

interface Launch {
  vx: number;
  vy: number;
  spinRate: number;
  colour: 0 | 1 | 2;
}

// A tiny deterministic generator (a linear congruential one) so the burst looks the same on
// every win and in every test.
function launches(): Launch[] {
  let seed = 7;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const out: Launch[] = [];
  for (let i = 0; i < CONFETTI_PIECES; i++) {
    // Mostly upward, in a fan from about 25° either side of straight up to 65°.
    const side = i % 2 === 0 ? 1 : -1;
    const angle = Math.PI / 2 + side * (0.4 + next() * 0.75);
    const speed = 3.5 + next() * 3;
    out.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spinRate: (next() - 0.5) * 20,
      colour: (i % 3) as 0 | 1 | 2,
    });
  }
  return out;
}

const LAUNCHES = launches();

// Every piece `k` of the way through a burst from (x0, y0). Empty outside 0–1 (exclusive of 1),
// so a finished burst draws nothing.
export function confettiAt(x0: number, y0: number, k: number): ConfettiPiece[] {
  if (!(k >= 0 && k < 1)) return [];
  const t = k * CONFETTI_SECONDS;
  // Velocity v·e^(−DRAG·t): the distance travelled is v·(1 − e^(−DRAG·t))/DRAG.
  const travel = (1 - Math.exp(-DRAG * t)) / DRAG;
  const alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  return LAUNCHES.map((p) => ({
    x: x0 + p.vx * travel,
    y: y0 + p.vy * travel - 0.5 * GRAVITY * t * t,
    spin: p.spinRate * t,
    alpha,
    colour: p.colour,
  }));
}
