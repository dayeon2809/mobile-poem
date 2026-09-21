// Port of drawStars / Particle from the exhibition sketch; decoration only.
(() => {
  const canvas = document.getElementById('space');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let width, height, stars = [], particles = [], frame, lastTime = 0;
  const random = (min, max) => min + Math.random() * (max - min);
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: 200 }, () => ({ x: random(0, width), y: random(0, height), size: random(1, 3), speed: random(.2, 1), brightness: random(100, 255) / 255 }));
    if (reducedMotion.matches) paint(0);
  }
  function paint(delta) {
    ctx.fillStyle = 'rgb(10, 5, 20)'; ctx.fillRect(0, 0, width, height);
    for (const star of stars) {
      ctx.fillStyle = `rgba(200,220,255,${star.brightness})`;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2); ctx.fill();
      star.x += (star.x - width / 2) / 500 * star.speed * delta;
      star.y += (star.y - height / 2) / 500 * star.speed * delta;
      if (star.x < 0 || star.x > width || star.y < 0 || star.y > height) {
        star.x = width / 2 + random(-100, 100); star.y = height / 2 + random(-100, 100);
      }
    }
    for (const particle of particles) {
      ctx.fillStyle = `rgba(100,150,255,${Math.max(0, particle.alpha)})`;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2); ctx.fill();
      particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.alpha -= .02 * delta;
    }
    particles = particles.filter(p => p.alpha > 0);
  }
  function tick(time) {
    paint(lastTime ? Math.min((time - lastTime) / 16.67, 3) : 1);
    lastTime = time; frame = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(frame); lastTime = 0;
    if (reducedMotion.matches || document.hidden) { particles = []; paint(0); }
    else frame = requestAnimationFrame(tick);
  }
  addEventListener('resize', resize);
  addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    particles.push({ x: event.clientX, y: event.clientY, vx: random(-1, 1), vy: random(-1, 1), alpha: 1, size: random(3, 8) });
    if (particles.length > 80) particles.shift();
  }, { passive: true });
  document.addEventListener('visibilitychange', restart);
  reducedMotion.addEventListener('change', restart);
  resize(); restart();
})();
