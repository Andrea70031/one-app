// Run with Node 24+: node --test tests/one-ai-regression.test.cjs
// Network, model and database are mocked: these tests never spend credit or create real sites.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const root = path.join(__dirname, '..');
const edgeSource = stripTypeScriptTypes(fs.readFileSync(path.join(root, 'supabase/functions/one-ai/index.ts'), 'utf8'))
  .replace(/^import .*;\s*$/gm, '').replace('export default', 'globalThis.edge =');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const answer = 'Checklist sopralluogo\n' + Array.from({length: 15}, (_, i) => `${i + 1}. Verificare misure, accessibilità e condizioni del vano prima della posa.`).join('\n');
const result = { summary: answer, intent: 'Preparare checklist', memory_title: 'Checklist sopralluogo', memory_summary: 'Checklist in 15 punti', extracted: [], actions: [], walkthrough: null };

async function callEdge({ status = 200, payload, key = 'test-only', user = 'test-user', body = {}, networkError } = {}) {
  const writes = [], requests = [];
  const context = vm.createContext({ Response, Request, AbortSignal, structuredClone,
    Deno: {env: {get: () => key}}, console: {error() {}},
    withSupabase: (options, fn) => { assert.equal(options.auth, 'user'); return fn; },
    fetch: async (url, options) => {
      requests.push({url, body: JSON.parse(options.body)});
      if (networkError) throw new Error('Network unavailable');
      return Response.json(payload ?? {status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify(result)}]}]}, {status});
    }
  });
  vm.runInContext(edgeSource, context);
  const supabase = {from(table) {
    const q = {select() {return q}, eq() {return q}, order() {return q}, limit() {return q}, single() {return q},
      insert(data) {writes.push({table, data}); return Promise.resolve({error: null})},
      then(resolve) {return Promise.resolve({data: [], error: null}).then(resolve)}};
    return q;
  }};
  const response = await context.edge.fetch(new Request('https://example.test/one-ai', {method: 'POST', body: JSON.stringify({text: 'Preparami una checklist', ...body})}), {userClaims: {id: user}, supabase});
  return {status: response.status, body: await response.json(), writes, requests};
}

test('complete checklist is returned and stored in ai_messages without truncation', async () => {
  const r = await callEdge();
  assert.equal(r.status, 200); assert.equal(r.body.result.summary, answer);
  assert.equal(r.writes.find(x => x.data.role === 'assistant').data.content, answer);
  assert.match(r.requests[0].body.instructions, /checklist completa/);
});

test('create_site is offered only to a client that supports its confirmation form', async () => {
  const legacy = await callEdge();
  const current = await callEdge({body: {supported_actions: ['create_site']}});
  const kinds = r => r.requests[0].body.text.format.schema.properties.actions.items.properties.kind.enum;
  assert.equal(kinds(legacy).includes('create_site'), false);
  assert.equal(kinds(current).includes('create_site'), true);
  assert.match(current.requests[0].body.instructions, /site_job_number/);
  assert.equal(current.writes.some(x => x.table === 'sites'), false);
});

for (const [name, options, code] of [
  ['missing key', {key: ''}, 'missing_api_key'],
  ['invalid key', {status: 401, payload: {error: {code: 'invalid_api_key'}}}, 'invalid_api_key'],
  ['permissions', {status: 403}, 'permission_denied'],
  ['quota', {status: 429, payload: {error: {code: 'insufficient_quota'}}}, 'insufficient_quota'],
  ['rate limit', {status: 429}, 'rate_limit'],
  ['model access', {status: 404, payload: {error: {code: 'model_not_found'}}}, 'model_not_found'],
  ['truncated JSON', {payload: {status: 'incomplete', output_text: '{'}}, 'incomplete_response'],
  ['malformed JSON', {payload: {status: 'completed', output_text: '{'}}, 'invalid_response'],
  ['empty result', {payload: {status: 'completed', output_text: '{}'}}, 'invalid_response'],
  ['refusal', {payload: {status: 'completed', output: [{content: [{type: 'refusal', refusal: 'Cannot comply'}]}]}}, 'request_refused'],
  ['network failure', {networkError: true}, 'ai_unreachable'],
]) test(`${name} reports an error instead of a fake successful AI response`, async () => {
  const r = await callEdge(options);
  assert.ok(r.status >= 400); assert.equal(r.body.error, code);
  assert.equal(r.body.result, undefined);
  assert.equal(r.writes.some(x => x.data.role === 'assistant'), false);
  assert.ok(!JSON.stringify(r.body).includes('test-only'));
});

test('handler requires a user before accessing data or calling OpenAI', async () => {
  const r = await callEdge({user: null});
  assert.equal(r.status, 401); assert.equal(r.requests.length, 0); assert.equal(r.writes.length, 0);
});

function loadFunctions(names, globals = {}) {
  const context = vm.createContext(globals);
  for (const name of names) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(appSource);
    assert.ok(match, `missing function ${name}`);
    const rest = appSource.slice(match.index);
    const next = /\n(?:(?:async )?function |for\(let)/.exec(rest);
    vm.runInContext(next ? rest.slice(0, next.index) : rest, context);
  }
  return context;
}
function element() {return {children: [], style: {}, classList: {remove() {}, add() {}}, appendChild(child) {this.children.push(child)}}}

test('render checklist as safe multiline text; no automatic Recall save or none buttons', () => {
  const target = element(); let saved = 0, copied;
  const c = loadFunctions(['showAIResult'], {session: {}, document: {createElement: element}, resultTarget: () => target,
    saveMemory() {saved++}, confirmAndExecuteAction() {}, executeAction(a) {copied = a.payload.text}, addActivity() {}});
  c.showAIResult({...result, actions: [{kind: 'none', label: 'Non disponibile'}]});
  assert.equal(target.children[0].textContent, answer);
  assert.match(target.children[0].style.cssText, /white-space:pre-wrap/);
  assert.equal(saved, 0);
  const buttons = target.children.at(-1).children;
  assert.equal(buttons.some(b => b.textContent === 'Non disponibile'), false);
  buttons.find(b => b.textContent === 'Copia risposta').onclick(); assert.equal(copied, answer);
  buttons.find(b => b.textContent === 'Salva in Recall').onclick(); assert.equal(saved, 1);
  c.showAIResult({...result, summary: '<img src=x onerror=alert(1)>'});
  assert.equal(target.children.at(3).textContent, '<img src=x onerror=alert(1)>');
});

test('Recall stores the full generated answer, separate from the short preview', async () => {
  let write;
  const c = loadFunctions(['saveMemory'], {session: {}, userId: () => 'owner', selectedSiteId: null,
    cloudRequest: async (url, options) => {write = options.body}, toast() {}, loadCloudMemories: async () => {}});
  await c.saveMemory(result);
  assert.equal(write.payload.answer, answer); assert.equal(write.summary, result.memory_summary);
});

test('new site form works with no existing sites and escapes proposed values', () => {
  const escapeHtml = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const c = loadFunctions(['operationFields'], {sitesCache: [], escapeHtml});
  const html = c.operationFields({kind: 'create_site', payload: {site_job_number: '2618', site_name: 'Bottega Veneta S.p.a. <script>'}}, '');
  assert.match(html, /name="job_number"[^>]*required[^>]*value="2618"/);
  assert.match(html, /Bottega Veneta S.p.a. &lt;script&gt;/);
  assert.ok(!html.includes('<select'));
});

function siteContext({existing = [], reject = false} = {}) {
  const calls = [];
  const c = loadFunctions(['saveNewSite'], {session: {}, sitesCache: [], userId: () => 'signed-in-owner',
    cloudRequest: async (url, options) => {calls.push({url, options}); if (!options) return existing; if (reject) throw new Error('Permission denied'); return [{id: 'new-site', ...options.body}];},
    logAction: async () => {}, addActivity: async () => {}, loadWorkspaces: async () => {}, loadToday: async () => {}, toast() {}});
  return {c, calls};
}
test('confirmed site creation uses the authenticated owner and returns the saved site', async () => {
  const {c, calls} = siteContext();
  const label = await c.saveNewSite({job_number: ' 2618 ', name: ' Bottega Veneta S.p.a. ', created_by: 'untrusted-owner'});
  assert.match(label, /2618/); assert.equal(calls.length, 2);
  assert.equal(calls[1].options.body.created_by, 'signed-in-owner');
  assert.equal(calls[1].options.body.job_number, '2618');
  assert.equal(calls[1].options.body.progress, 0);
  assert.equal(c.sitesCache[0].id, 'new-site');
});
test('site creation rejects missing fields, duplicate job number and permission failure', async () => {
  const empty = siteContext(); await assert.rejects(empty.c.saveNewSite({job_number: '', name: 'Test'})); assert.equal(empty.calls.length, 0);
  const duplicate = siteContext({existing: [{id: 'old-site'}]}); await assert.rejects(duplicate.c.saveNewSite({job_number: '2618', name: 'Test'})); assert.equal(duplicate.calls.length, 1);
  const denied = siteContext({reject: true}); await assert.rejects(denied.c.saveNewSite({job_number: '2618', name: 'Test'}), /Permission denied/); assert.equal(denied.c.sitesCache.length, 0);
});

test('opening the create_site review never saves until the user submits', async () => {
  const elements = new Map(); let saves = 0;
  const $ = id => {if (!elements.has(id)) elements.set(id, element()); return elements.get(id)};
  const c = loadFunctions(['openOperationReview'], {$, session: {}, sitesCache: [], selectedSiteId: null,
    normalizeAction: a => a, ensureSitesCache: async () => [], closeDrawer() {}, workspaceActionTitle: () => 'Nuovo cantiere',
    escapeHtml: s => s, operationFields: () => '<input name="job_number">', toast() {},
    saveWorkspaceOperation: async () => {saves++}, setTimeout() {}, closeSheet() {},
    FormData: class {entries() {return [['job_number','2618'],['name','Bottega Veneta S.p.a.']][Symbol.iterator]()}}});
  $('sheet').setAttribute = () => {};
  await c.openOperationReview({kind: 'create_site', payload: {site_job_number: '2618'}});
  assert.equal(saves, 0); assert.equal(typeof $('operationForm').onsubmit, 'function');
  await $('operationForm').onsubmit({preventDefault() {}, currentTarget: {querySelector: () => ({disabled: false})}});
  assert.equal(saves, 1);
});
