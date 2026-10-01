const $ = id => document.getElementById(id);
let config;
let step = 0;
let busy = false;
const draftKey = 'body-poem-draft-v1';
let draft;
function newDraft() {
  return { id: crypto.randomUUID(), name: '', emotions: [], answers: Array(config.questions.length).fill('') };
}
function save() { try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch {} }
function showStep() {
  const isEmotion = step === 0;
  const question = config.questions[step - 1];
  const isText = !isEmotion && question.isTextInput;
  $('step').textContent = `${step + 1} / ${config.questions.length + 1}`;
  $('progress').max = config.questions.length + 1;
  $('progress').value = step + 1;
  $('question').textContent = isEmotion ? '오늘, 당신의 하루는 어떤 기분인가요?' : question.question;
  $('hint').textContent = isEmotion ? '지금 느껴지는 감정을 모두 골라주세요.' : isText ? '떠오르는 말이 없다면 비워 두어도 괜찮아요.' : '가장 가까운 답을 하나 골라주세요.';
  $('options').replaceChildren();
  $('options').classList.toggle('emotions', isEmotion);
  $('options').hidden = isText;
  $('answer').hidden = !isText;
  $('text-label').hidden = !isText;
  $('status').textContent = '';
  $('answer').value = isText ? draft.answers[step - 1] : '';
  for (const label of isEmotion ? config.emotions : question.options) {
    const button = document.createElement('button');
    button.className = 'option';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(isEmotion ? draft.emotions.includes(label) : draft.answers[step - 1] === label));
    button.onclick = () => {
      if (isEmotion) draft.emotions = draft.emotions.includes(label) ? draft.emotions.filter(e => e !== label) : [...draft.emotions, label];
      else draft.answers[step - 1] = label;
      save();
      for (const item of $('options').children) item.setAttribute('aria-pressed', String(isEmotion ? draft.emotions.includes(item.textContent) : draft.answers[step - 1] === item.textContent));
      updateNext();
    };
    $('options').append(button);
  }
  $('next').textContent = step === config.questions.length ? '나의 시 만들기' : '다음';
  updateNext();
  $('question').focus();
}
function updateNext() {
  $('selected').textContent = draft.emotions.length ? `선택한 감정: ${draft.emotions.join(', ')}` : '';
  $('next').disabled = busy || (step === 0 ? !draft.emotions.length : !config.questions[step - 1].isTextInput && !draft.answers[step - 1]);
}
$('answer').oninput = () => { draft.answers[step - 1] = $('answer').value; save(); };
$('start').onclick = () => {
  draft.name = $('name').value.trim(); save();
  $('welcome').hidden = true; $('survey').hidden = false; step = 0; showStep();
};
$('back').onclick = () => {
  if (busy) return;
  if (step === 0) { $('survey').hidden = true; $('welcome').hidden = false; $('start').focus(); }
  else { step--; showStep(); }
};
$('next').onclick = async () => {
  if (busy || $('next').disabled) return;
  if (step < config.questions.length) { step++; showStep(); return; }
  busy = true; updateNext(); $('back').disabled = true; $('answer').disabled = true;
  $('status').textContent = '당신의 응답으로 시를 쓰고 저장하고 있어요. 잠시 기다려 주세요.';
  $('survey').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/poems', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '제출하지 못했습니다. 다시 시도해 주세요.');
    // Keep the same ID until the result page is loaded, so network retries reuse the result.
    location.assign(result.resultUrl);
  } catch (error) {
    $('status').textContent = error.message === 'Failed to fetch' ? '네트워크 연결을 확인한 뒤 다시 시도해 주세요.' : error.message;
    busy = false; $('back').disabled = false; $('answer').disabled = false; updateNext();
    $('survey').removeAttribute('aria-busy');
  }
};
(async () => {
  try {
    const response = await fetch('/questions.json');
    if (!response.ok) throw new Error('질문을 불러오지 못했습니다. 새로고침해 주세요.');
    config = await response.json();
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey));
      if (saved && typeof saved.id === 'string' && typeof saved.name === 'string' && Array.isArray(saved.emotions) && Array.isArray(saved.answers) && saved.answers.length === config.questions.length) draft = saved;
    } catch {}
    if (!draft) draft = newDraft();
    $('name').value = draft.name;
    $('start').textContent = '감정의 문 열기'; $('start').disabled = false;
  } catch { $('load-error').textContent = '화면을 준비하지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요. 공개 접속에는 HTTPS 주소가 필요합니다.'; }
})();