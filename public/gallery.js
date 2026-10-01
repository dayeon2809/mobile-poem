const container = document.getElementById('poem-container');
const statusText = document.getElementById('status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let running = false, paused = reducedMotion.matches, hovering = false, focused = false;
let pauseUntil = 0, lastFrame = 0, direction = 1, travel = 0;
const cards = new Map();
function element(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function createCard(item) {
  const card = element('article', 'poem-card'); card.dataset.id = item.id;
  card.append(element('div', 'timestamp'), element('h2', 'author'), element('div', 'poem'));
  const link = element('a', 'result-link');
  link.href = `/poem.html?id=${encodeURIComponent(item.id)}`;
  link.textContent = '시 열기';
  card.append(link); return card;
}
function updateCards(items) {
  // Keep the same visible card in place when a newer poem is inserted before it.
  const edge = container.getBoundingClientRect().left;
  const anchor = [...container.children].find(card => card.getBoundingClientRect().right > edge + 30);
  const anchorX = anchor?.getBoundingClientRect().left;
  const remaining = new Set(items.map(item => item.id));
  for (const [id, card] of cards) if (!remaining.has(id)) { card.remove(); cards.delete(id); }
  items.forEach((item, index) => {
    let card = cards.get(item.id);
    if (!card) { card = createCard(item); cards.set(item.id, card); }
    const date = new Date(item.timestamp);
    const values = { '.timestamp': Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}), '.author': `${item.name}님의 몸의 시`, '.poem': item.poem };
    for (const [selector, value] of Object.entries(values)) {
      const node = card.querySelector(selector);
      if (node.textContent !== value) node.textContent = value;
    }
    if (container.children[index] !== card) container.insertBefore(card, container.children[index] || null);
  });
  if (anchor?.isConnected) container.scrollLeft += anchor.getBoundingClientRect().left - anchorX;
}
async function refresh() {
  if (running || document.hidden) return;
  running = true;
  try {
    const response = await fetch('/api/poems', {cache:'no-store', signal: AbortSignal.timeout(25000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '시를 불러오지 못했습니다.');
    updateCards(data.poems);
    statusText.textContent = data.poems.length ? `최근 ${data.poems.length}편 · 15초마다 시트 갱신` : '아직 완성된 시가 없습니다.';
  } catch (error) { statusText.textContent = '갱신하지 못했습니다. 표시 중인 시를 유지하며 다시 연결합니다.'; }
  finally { running = false; }
}
function pauseUI() {
  document.body.classList.toggle('paused', paused);
  document.getElementById('motion').textContent = paused ? '움직임 재생' : '움직임 멈춤';
  document.getElementById('motion').setAttribute('aria-pressed', String(paused));
}
function animate(time) {
  const delta = lastFrame ? Math.min(time - lastFrame, 50) : 0;
  lastFrame = time;
  const max = container.scrollWidth - container.clientWidth;
  if (!paused && !hovering && !focused && !document.hidden && Date.now() > pauseUntil && max > 1) {
    travel += delta * .012;
    const pixels = Math.floor(travel);
    container.scrollLeft += direction * pixels;
    travel -= pixels;
    if (pixels > 0 && direction > 0 && container.scrollLeft >= max - 1) { direction = -1; pauseUntil = Date.now() + 3000; }
    if (pixels > 0 && direction < 0 && container.scrollLeft <= 1) { direction = 1; pauseUntil = Date.now() + 3000; }
  }
  requestAnimationFrame(animate);
}
container.addEventListener('pointerenter', e => { if(e.pointerType === 'mouse') hovering = true; });
container.addEventListener('pointerleave', () => { hovering = false; });
container.addEventListener('focusin', () => { focused = true; });
container.addEventListener('focusout', e => { focused = container.contains(e.relatedTarget); });
for (const event of ['wheel','pointerdown','touchstart','keydown']) container.addEventListener(event, () => {pauseUntil = Date.now() + 10000;}, {passive:true});
function move(direction) { pauseUntil = Date.now() + 10000; container.scrollBy({left:direction * container.clientWidth, behavior:reducedMotion.matches ? 'instant' : 'smooth'}); }
document.getElementById('previous').onclick = () => move(-1);
document.getElementById('next').onclick = () => move(1);
document.getElementById('motion').onclick = () => {paused = !paused; pauseUI();};
reducedMotion.addEventListener('change', () => {paused = reducedMotion.matches; pauseUI();});
document.getElementById('refresh').onclick = refresh;
document.addEventListener('visibilitychange', () => {lastFrame = 0; refresh();});
setInterval(refresh, 15000);
pauseUI(); refresh(); requestAnimationFrame(animate);
