const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../app-core');
const { questions } = require('../public/questions.json');

function payload() {
  return { id: randomUUID(), name: '참여자', emotions: ['평온'], answers: questions.map(q => q.options[0] || '') };
}
async function fixture(t, makePoem = async data => `${data.name}의 시`) {
  const records = new Map();
  let saves = 0;
  const app = createApp({ store: { get: async id => records.get(id), save: async record => { saves++; records.set(record.id, record); } }, makePoem });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, records, get saves() { return saves; }, post: data => fetch(`${base}/api/poems`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }) };
}

test('participants get separate durable result IDs and only their own poem', async t => {
  const f = await fixture(t);
  const first = payload();
  const second = { ...payload(), name: '두번째' };
  for (const data of [first, second]) {
    const response = await f.post(data);
    assert.equal(response.status, 200);
    const { resultUrl } = await response.json();
    assert.equal(resultUrl, `/poem.html?id=${data.id}`);
    const read = await fetch(`${f.base}/api/poems/${data.id}`);
    assert.equal(read.headers.get('cache-control'), 'no-store');
    const result = await read.json();
    assert.equal(result.poem, `${data.name}의 시`);
    assert.equal(result.answers, undefined);
  }
  assert.equal(f.saves, 2);
});

test('concurrent double submit and later retry reuse the saved result', async t => {
  let generations = 0;
  const f = await fixture(t, async () => {
    generations++;
    await new Promise(resolve => setTimeout(resolve, 30));
    return '한 편의 시';
  });
  const data = payload();
  const responses = await Promise.all([f.post(data), f.post(data)]);
  for (const response of responses) assert.equal(response.status, 200);
  assert.equal((await f.post(data)).status, 200);
  assert.equal(generations, 1);
  assert.equal(f.saves, 1);
});

test('invalid and incomplete survey data is rejected before generation', async t => {
  let generations = 0;
  const f = await fixture(t, async () => { generations++; return '시'; });
  for (const data of [{}, { ...payload(), emotions: ['가짜'] }, { ...payload(), answers: [] }, { ...payload(), id: '../secret' }]) {
    assert.equal((await f.post(data)).status, 400);
  }
  assert.equal(generations, 0);
  assert.equal(f.saves, 0);
});

test('generation failure allows retry with the same ID', async t => {
  let fail = true;
  const f = await fixture(t, async () => { if (fail) throw new Error('upstream failure'); return '다시 쓴 시'; });
  const data = payload();
  assert.equal((await f.post(data)).status, 502);
  assert.equal(f.saves, 0);
  fail = false;
  assert.equal((await f.post(data)).status, 200);
  assert.equal(f.saves, 1);
});

test('unknown results and private server files are not exposed', async t => {
  const f = await fixture(t);
  for (const url of [`/api/poems/${randomUUID()}`, '/api/poems/1', '/.env', '/server.js']) {
    assert.equal((await fetch(f.base + url)).status, 404);
  }
  for (const url of ['/', '/poem.html', '/questions.json', '/style.css']) {
    assert.equal((await fetch(f.base + url)).status, 200);
  }
});
