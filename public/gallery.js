const container = document.getElementById('poem-container');
const status = document.getElementById('status');
let snapshot = '';
let running = false;
function element(tag, className, text) {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
async function refresh() {
  if (running || document.hidden) return;
  running = true;
  try {
    const response = await fetch('/api/poems');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '시를 불러오지 못했습니다.');
    const next = JSON.stringify(data.poems);
    if (next !== snapshot) {
      const cards = data.poems.map(item => {
        const card = element('article', 'poem-card');
        const date = new Date(item.timestamp);
        card.append(element('div', 'timestamp', Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})),
          element('h2', 'author', `${item.name}님의 몸의 시`), element('div', 'poem', item.poem));
        const link = element('a', 'result-link');
        link.href = `/poem.html?id=${encodeURIComponent(item.id)}`;
        const qr = element('img', 'qrcode');
        qr.src = `/api/qr/${encodeURIComponent(item.id)}`; qr.alt = `${item.name}님의 시 열기 QR 코드`;
        qr.width = 160; qr.height = 160;
        link.append(qr, element('span', '', 'QR을 스캔하거나 눌러 시 열기'));
        card.append(link); return card;
      });
      container.replaceChildren(...cards); snapshot = next;
    }
    status.textContent = data.poems.length ? '최근 10편 · 15초마다 자동 갱신' : '아직 완성된 시가 없습니다. 첫 번째 이야기를 남겨주세요.';
  } catch (error) { status.textContent = `${error.message} 잠시 후 다시 확인합니다.`; }
  finally { running = false; }
}
document.getElementById('refresh').onclick = refresh;
document.addEventListener('visibilitychange', refresh);
setInterval(refresh, 15000);
refresh();
