(() => {
  const container = document.getElementById('keywords'), status = document.getElementById('keyword-status');
  let fetching = false, signature = '';
  async function refresh() {
    if (fetching || document.hidden) return;
    fetching = true;
    try {
      const response = await fetch('/api/latest-keywords', { cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('load');
      const { entry } = await response.json();
      const next = JSON.stringify(entry);
      if (next !== signature) {
        signature = next; container.replaceChildren();
        document.getElementById('participant-name').textContent = entry ? entry.name || '익명' : '응답 대기 중';
        for (const word of entry?.keywords || []) {
          const item = document.createElement('li'); item.textContent = word; container.append(item);
        }
      }
      status.textContent = entry ? '최근 저장된 설문 · ' + new Date(entry.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '새로운 몸의 이야기를 기다립니다.';
    } catch { status.textContent = '시트 연결을 확인하고 있습니다. 잠시 후 다시 갱신합니다.'; }
    finally { fetching = false; }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh(); setInterval(refresh, 10000);
})();
