(() => {
  const $ = id => document.getElementById(id);
  const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let today = dayKey(), records = [], participants = [], ready = false, busy = false, generation = 0;
  let drawing = false, shuffleTimer;
  $('date').value = today;
  const key = () => 'body-poem-draw-reset:' + $('date').value;
  let excluded = new Set();
  function loadReset() {
    try { const saved = JSON.parse(localStorage.getItem(key()) || '[]'); excluded = new Set(Array.isArray(saved) ? saved : []); }
    catch { excluded = new Set(); $('connection').textContent = '저장된 리셋 설정을 읽지 못했습니다.'; }
  }
  function render() {
    participants = records.filter(person => !excluded.has(person.id));
    const existing = new Map([...$('names').children].map(node => [node.dataset.id, node]));
    for (const person of participants) {
      let node = existing.get(person.id);
      if (!node) {
        node = document.createElement('li'); node.dataset.id = person.id;
        const name = document.createElement('span'); name.className = 'name';
        const code = document.createElement('span'); code.className = 'code';
        node.append(name, code); $('names').append(node);
      }
      node.children[0].textContent = person.name;
      node.children[1].textContent = '참여 번호 ' + person.id.slice(0, 8).toUpperCase();
      existing.delete(person.id);
    }
    existing.forEach(node => node.remove());
    $('count').textContent = participants.length + '편의 시';
    $('empty').hidden = participants.length > 0;
    $('empty').textContent = excluded.size ? '새로운 몸의 시를 기다리고 있습니다.' : '이 날짜에 완성된 시가 아직 없습니다. 첫 번째 몸의 시를 기다립니다.';
    $('draw').disabled = !ready || !participants.length || busy || drawing;
    $('reset').disabled = !ready || !participants.length || busy || drawing;
  }
  async function refresh() {
    if (busy || drawing || document.hidden) return;
    const currentDay = dayKey();
    if (currentDay !== today) {
      if ($('date').value === today) { $('date').value = currentDay; records = []; loadReset(); $('winner-dialog').close(); }
      today = currentDay;
    }
    if (!$('date').value) return;
    const token = generation, requestedDate = $('date').value;
    busy = true; render();
    try {
      const response = await fetch('/api/participants?date=' + encodeURIComponent(requestedDate), { cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      if (token !== generation) return;
      records = data.participants; ready = true;
      $('connection').textContent = '● 연결됨 · ' + new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' 갱신';
    } catch {
      if (token !== generation) return;
      ready = false; $('connection').textContent = '연결을 확인해 주세요 · 자동 재시도 중';
    } finally {
      busy = false; render();
      if (token !== generation) refresh();
    }
  }
  $('date').addEventListener('change', () => { generation++; records = []; ready = false; loadReset(); render(); refresh(); });
  $('draw').addEventListener('click', async () => {
    if (drawing || busy) return;
    const selectedDate = $('date').value;
    await refresh();
    if (!ready || busy || !participants.length || selectedDate !== $('date').value) return;
    // Rejection sampling keeps each saved poem equally likely.
    const n = participants.length, limit = Math.floor(4294967296 / n) * n, value = new Uint32Array(1);
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    const pool = participants.slice();
    const winner = pool[value[0] % n];
    const dialog = $('winner-dialog');
    const headline = dialog.querySelector('.eyebrow');
    const message = dialog.querySelector('.winner-content > p:last-of-type');
    const showPerson = person => {
      $('winner-name').textContent = person.name;
      $('winner-code').textContent = '참여 번호 ' + person.id.slice(0, 8).toUpperCase() + ' · ' + selectedDate;
    };
    drawing = true; $('date').disabled = true; render();
    dialog.classList.remove('revealed'); dialog.classList.add('shuffling');
    headline.textContent = '오늘의 다시 쓰일 몸은?';
    message.textContent = pool.length + '편의 시 속에서, 오늘 다시 쓰일 몸을 만나봅니다.';
    $('close-winner').textContent = '추첨 취소';
    dialog.showModal();
    const reveal = () => {
      showPerson(winner);
      dialog.classList.remove('shuffling'); dialog.classList.add('revealed');
      headline.textContent = '오늘의 다시 쓰일 몸은?';
      message.textContent = '당신의 몸이 남긴 시, 이제 다시 쓰입니다.';
      $('close-winner').textContent = '명단으로 돌아가기';
      drawing = false; $('date').disabled = false; render();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || pool.length === 1) { reveal(); return; }
    // Shuffle a display deck; the independently sampled final winner remains unbiased.
    let deck = [], tick = 0, previousId;
    const shuffle = () => {
      if (!drawing || !dialog.open) return;
      if (!deck.length) {
        deck = pool.slice();
        for (let i=deck.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
        if (deck[deck.length-1].id === previousId) [deck[0],deck[deck.length-1]]=[deck[deck.length-1],deck[0]];
      }
      const person=deck.pop(); previousId=person.id; showPerson(person);
      tick++;
      if (tick >= 24) { shuffleTimer=setTimeout(reveal,450); return; }
      shuffleTimer=setTimeout(shuffle,55+Math.pow(tick/24,3)*300);
    };
    shuffle();
  });
  $('close-winner').addEventListener('click', () => $('winner-dialog').close());
  $('winner-dialog').addEventListener('close', () => {
    clearTimeout(shuffleTimer); drawing = false; $('date').disabled = false;
    $('winner-dialog').classList.remove('shuffling', 'revealed'); render();
  });
  $('reset').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => {
    const next = new Set([...excluded, ...records.map(person => person.id)]);
    try { localStorage.setItem(key(), JSON.stringify([...next])); excluded = next; render(); }
    catch { $('connection').textContent = '리셋을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'; }
    $('reset-dialog').close();
  });
  addEventListener('storage', event => { if (event.key === key()) { loadReset(); render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  loadReset(); refresh(); setInterval(refresh, 10000);
})();
