const $ = id => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
async function load() {
  $('retry').hidden = true;
  try {
    if (!id) throw new Error('결과 링크를 확인해 주세요.');
    const response = await fetch(`/api/poems/${encodeURIComponent(id)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '시를 불러오지 못했습니다.');
    $('title').textContent = `${result.name}님의 몸의 시`;
    $('meta').textContent = result.emotions.join(' · ');
    $('poem').textContent = result.poem;
    $('status').textContent = '';
    $('copy').hidden = false;
    try {
      const draft = JSON.parse(sessionStorage.getItem('body-poem-draft-v1'));
      if (draft?.id === id) sessionStorage.removeItem('body-poem-draft-v1');
    } catch {}
  } catch (error) {
    $('status').textContent = error.message;
    $('retry').hidden = false;
  }
}
$('retry').onclick = load;
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('status').textContent = '결과 링크를 복사했습니다.'; }
  catch { $('status').textContent = '주소창의 링크를 복사해 보관해 주세요.'; }
};
load();
