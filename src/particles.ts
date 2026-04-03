export class Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  life: number;
  readonly decay: number;
  readonly hue: number;
  readonly sat: number;
  readonly lit: number;

  constructor(x: number, y: number, hue: number, sat: number, lit: number, maxSize: number) {
    const a = Math.random() * Math.PI * 2;
    const v = 0.8 + Math.random() * 3.5;
    this.x   = x;
    this.y   = y;
    this.vx  = Math.cos(a) * v;
    this.vy  = Math.sin(a) * v;
    this.r   = maxSize * (0.12 + Math.random() * 0.22);
    this.life  = 1;
    this.decay = 0.038 + Math.random() * 0.02;
    this.hue = hue;
    this.sat = sat;
    this.lit = lit + 18;
  }

  step(): void {
    this.x    += this.vx;
    this.y    += this.vy;
    this.vx   *= 0.9;
    this.vy   *= 0.9;
    this.life -= this.decay;
  }

  get dead(): boolean { return this.life <= 0; }
}
