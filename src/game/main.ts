const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('missing #game canvas');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2d canvas not supported');

function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth: w, clientHeight: h } = canvas;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#2b2b2b';
  ctx.font = `bold ${Math.max(24, Math.min(w, h) / 10)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Coaster Golf', w / 2, h / 2);
}

draw(canvas, ctx);
window.addEventListener('resize', () => draw(canvas, ctx));
