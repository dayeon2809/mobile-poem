(() => {
  const shell = document.querySelector('.shell');
  let frame;
  function fit() {
    shell.style.zoom = '1';
    shell.style.width = Math.min(1040, document.documentElement.clientWidth) + 'px';
    const desktop = matchMedia('(min-width:801px)').matches;
    const top = desktop ? parseFloat(getComputedStyle(document.body, '::before').height) || 0 : 0;
    shell.style.marginTop = '0px';
    const available = Math.max(100, (visualViewport?.height || innerHeight) - top - 8);
    const scale = Math.min(1, available / shell.getBoundingClientRect().height);
    shell.style.zoom = String(scale);
    shell.style.marginTop = top / scale + 'px';
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); }
  new MutationObserver(schedule).observe(shell, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  addEventListener('resize', schedule);
  visualViewport?.addEventListener('resize', schedule);
  document.querySelector('.poster').addEventListener('load', schedule);
  document.fonts.ready.then(schedule);
  schedule();
})();
