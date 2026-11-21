// Animated Threads background - vanilla JS (no external 3D libs)
// Draws multiple flowing lines on a 2D canvas to approximate the Threads effect.

function initThreadsOnElement(container, {
  color = [124, 192, 255], // base RGB color
  amplitude = 1.2,
  distance = 0.6,
  enableMouseInteraction = true,
} = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  let width = 0;
  let height = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  window.addEventListener('resize', resize);
  resize();

  const lineCount = 30;
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const p = i / (lineCount - 1 || 1);
    lines.push({
      baseY: p,
      speed: 0.15 + p * 0.3,
      phase: Math.random() * Math.PI * 2,
      freq: 1.5 + p * 2.0,
    });
  }

  let mouse = { x: 0.5, y: 0.5 };
  let targetMouse = { x: 0.5, y: 0.5 };

  function onMove(e) {
    const rect = container.getBoundingClientRect();
    targetMouse.x = (e.clientX - rect.left) / rect.width;
    targetMouse.y = (e.clientY - rect.top) / rect.height;
  }

  function onLeave() {
    targetMouse.x = 0.5;
    targetMouse.y = 0.5;
  }

  if (enableMouseInteraction) {
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
  }

  let lastTime = 0;
  function tick(time) {
    const dt = (time - lastTime) * 0.001 || 0;
    lastTime = time;

    // Smooth mouse
    const smooth = 0.08;
    mouse.x += (targetMouse.x - mouse.x) * smooth;
    mouse.y += (targetMouse.y - mouse.y) * smooth;

    ctx.clearRect(0, 0, width, height);

    const [r, g, b] = color;
    const ampPx = height * 0.12 * amplitude;
    const spacing = height * 0.8 * (0.3 + distance);

    lines.forEach((line, idx) => {
      const p = idx / (lineCount - 1 || 1);
      const baseY = height * 0.5 + (p - 0.5) * spacing;
      const localAmp = ampPx * (0.4 + p * 0.6) * (0.8 + mouse.y * 0.4);
      const phase = line.phase + time * 0.0007 * line.speed;

      const grad = ctx.createLinearGradient(0, baseY - localAmp, width, baseY + localAmp);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.9)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2 + (1 - p) * 2.0;
      ctx.beginPath();

      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * width;
        const wave = Math.sin(t * line.freq * Math.PI * 2 + phase);
        const subtle = Math.sin(t * 8 + phase * 1.7) * 0.25;
        const y = baseY + (wave + subtle) * localAmp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return () => {
    window.removeEventListener('resize', resize);
    if (enableMouseInteraction) {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    }
    if (canvas.parentNode === container) container.removeChild(canvas);
  };
}

// Auto-init on any .threads-container element
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.threads-container').forEach((el) => {
      if (el.dataset.threadsInit === '1') return;
      el.dataset.threadsInit = '1';
      initThreadsOnElement(el, {
        amplitude: 1.2,
        distance: 0.6,
        enableMouseInteraction: true,
      });
    });
  });
}
