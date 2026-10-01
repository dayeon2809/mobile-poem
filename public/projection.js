// Projection positioning: Alt+Down/Up adjusts the upper blank area by 5%.
(() => {
  const requested = new URLSearchParams(location.search).get('top');
  let top = requested !== null && Number.isFinite(Number(requested)) ? Math.max(0, Math.min(40, Number(requested))) : 15;
  const apply = () => document.documentElement.style.setProperty('--projection-top', top + 'svh');
  apply();
  addEventListener('keydown', event => {
    if (!event.altKey || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    top = Math.max(0, Math.min(40, top + (event.key === 'ArrowDown' ? 5 : -5)));
    apply();
  });
})();
