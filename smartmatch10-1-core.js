/* SmartMatch 10.1 TEST. Pure, isolated logic; no production storage or globals. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SM101 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '10.1.1-test', SCHEMA = 'tillsyno-smartmatch-10.1';
  const normalize = s => String(s || '').normalize('NFC').trim().toLocaleUpperCase('sv-SE').replace(/\s+/g, ' ');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function box(x, y, w, h) {
    if (![x, y, w, h].every(Number.isFinite)) throw Error('Ogiltiga koordinater.');
    const x0 = clamp(Math.min(x, x + w), 0, 1), y0 = clamp(Math.min(y, y + h), 0, 1);
    return {x: x0, y: y0, w: clamp(Math.max(x, x + w), 0, 1) - x0, h: clamp(Math.max(y, y + h), 0, 1) - y0};
  }
  const inside = (a, b) => a.x + a.w / 2 >= b.x && a.x + a.w / 2 <= b.x + b.w && a.y + a.h / 2 >= b.y && a.y + a.h / 2 <= b.y + b.h;
  function union(items) {
    const x = Math.min(...items.map(i => i.x)), y = Math.min(...items.map(i => i.y));
    return {x, y, w: Math.max(...items.map(i => i.x + i.w)) - x, h: Math.max(...items.map(i => i.y + i.h)) - y};
  }
  function lines(items) {
    const groups = [];
    for (const item of items.filter(i => String(i.text || '').trim()).sort((a, b) => a.y - b.y || a.x - b.x)) {
      let group = groups.find(g => Math.abs(g.cy - (item.y + item.h / 2)) < Math.min(g.h, item.h) * .45);
      if (!group) { group = {cy: item.y + item.h / 2, h: item.h, items: []}; groups.push(group); }
      group.items.push(item);
    }
    return groups.flatMap(g => {
      const parts = [], sorted = g.items.sort((a, b) => a.x - b.x);
      let run = [];
      for (const it of sorted) {
        // Do not join adjacent table columns/door symbols into one code.
        if (run.length && it.x - (run.at(-1).x + run.at(-1).w) > Math.max(it.h, run.at(-1).h) * 1.5) { parts.push(run); run = []; }
        run.push(it);
      }
      if (run.length) parts.push(run);
      return parts.map(p => ({...union(p), text: p.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim(), parts: p}));
    }).sort((a, b) => a.y - b.y || a.x - b.x);
  }
  function readRegion(items, area) { return lines(items.filter(i => inside(i, area))).map(i => i.text).join('\n'); }
  function codeFrom(text, prefix) {
    const s = String(text || '').normalize('NFC').trim().replace(/\s+/g, ' '), p = String(prefix || '').normalize('NFC').trim();
    if (!p) return s;
    if (!normalize(s).startsWith(normalize(p))) return '';
    const rest = s.slice(p.length);
    // Prefix must end at a boundary: GS must not strip GS10.
    if (rest && !/^[\s:–-]/u.test(rest)) return '';
    return rest.replace(/^[\s:–-]+/u, '').trim();
  }
  function pages(value, count) {
    if (!Number.isInteger(count) || count < 1) throw Error('PDF saknar sidor.');
    if (!String(value || '').trim()) return Array.from({length: count}, (_, i) => i + 1);
    const result = new Set();
    for (const part of String(value).split(',')) {
      const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw Error('Ange sidor som 1, 3-8.');
      const a = Number(m[1]), b = Number(m[2] || m[1]);
      if (a < 1 || b < a || b > count) throw Error('Sidintervallet ligger utanför PDF:en.');
      for (let i = a; i <= b; i++) result.add(i);
    }
    return [...result].sort((a, b) => a - b);
  }
  function key(docId, page, r) { return [docId, page, Math.round(r.x * 10000), Math.round(r.y * 10000)].join(':'); }
  function matches(code, cards) { const n = normalize(code); return n ? cards.filter(c => !c.removed && normalize(c.code) === n) : []; }
  function candidates(items, codes) {
    const keys = new Set(codes.map(normalize).filter(Boolean)), out = [], seen = new Set();
    for (const line of lines(items)) {
      const p = line.parts;
      for (let i = 0; i < p.length; i++) {
        for (let j = i; j < Math.min(p.length, i + 12); j++) {
          const text = p.slice(i, j + 1).map(x => x.text).join(' ');
          if (text.length > 100) break;
          if (keys.has(normalize(text))) {
            const r = union(p.slice(i, j + 1)), k = key('', 0, r);
            if (!seen.has(k)) { out.push({...r, text}); seen.add(k); }
          }
        }
      }
    }
    return out;
  }
  function merge(existing, incoming) {
    // Existing IDs include manually corrected and removed cards. Rescanning must not resurrect them.
    const seen = new Set(existing.map(x => x.id));
    return existing.concat(incoming.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; }));
  }
  function changeCard(project, id, patch) {
    const card = project.cards.find(c => c.id === id);
    if (!card) throw Error('Dörrkortet finns inte.');
    const old = normalize(card.code);
    for (const name of ['code', 'notes', 'removed']) if (Object.hasOwn(patch, name)) card[name] = patch[name];
    card.manual = true; project.approved = false;
    if (old !== normalize(card.code) || card.removed) {
      for (const s of project.stamps.filter(s => s.cardId === id)) { s.confirmed = false; if (card.removed) s.cardId = ''; }
    }
    return card;
  }
  function approve(project) {
    const cards = project.cards.filter(c => !c.removed);
    if (!cards.length || cards.some(c => !normalize(c.code))) throw Error('Alla kvarvarande kort behöver en beteckning.');
    project.approved = true;
  }
  function visualScore(a, b) {
    if (!a || !b || a.length !== 768 || b.length !== 768) return 0;
    // -1 marks printed text. Compare only surrounding shape and background.
    let expected = 0, actual = 0, covered = 0, supported = 0;
    const nearby = (sig, x, y) => {
      for (let yy = Math.max(0, y - 1); yy <= Math.min(23, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(31, x + 1); xx++)
          if (sig[yy * 32 + xx] > .16) return true;
      return false;
    };
    for (let i = 0; i < 768; i++) {
      if (a[i] < 0 || b[i] < 0) continue;
      const x = i % 32, y = Math.floor(i / 32);
      if (a[i] > .16) { expected++; if (nearby(b, x, y)) covered++; }
      if (b[i] > .16) { actual++; if (nearby(a, x, y)) supported++; }
    }
    if (expected < 12 || actual < 12) return 0; // A word on white paper is not a stamp template.
    const recall = covered / expected, precision = supported / actual;
    return 2 * recall * precision / (recall + precision || 1);
  }
  function validate(p) {
    const fail = () => { throw Error('Projektfilen är skadad eller har ett annat format.'); };
    const str = (v, n) => typeof v === 'string' && v.length <= n;
    const rect = r => r && ['x','y','w','h'].every(k => Number.isFinite(r[k])) && r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= 1.00001 && r.y + r.h <= 1.00001;
    if (!p || p.schema !== SCHEMA || p.schemaVersion !== 1 || !str(p.name, 200) || typeof p.approved !== 'boolean') fail();
    if (!Array.isArray(p.docs) || p.docs.length > 100 || !Array.isArray(p.cards) || p.cards.length > 10000 || !Array.isArray(p.stamps) || p.stamps.length > 50000) fail();
    const ids = new Map();
    for (const d of p.docs) {
      if (!/^[a-f0-9]{64}$/.test(d.id) || d.id !== d.sha256 || !str(d.name, 500) || !Number.isInteger(d.pages) || d.pages < 1 || d.pages > 20000 || ids.has(d.id)) fail();
      ids.set(d.id, d);
    }
    const validateRecord = r => {
      if (!r || !str(r.id, 300) || !ids.has(r.docId) || !Number.isInteger(r.page) || r.page < 1 || r.page > ids.get(r.docId).pages || !rect(r.box) || !str(r.code, 200)) fail();
      if (r.notes !== undefined && !str(r.notes, 50000)) fail();
    };
    if (!Array.isArray(p.templates) || p.templates.length > p.docs.length) fail();
    const templateIds = new Set();
    for (const t of p.templates) {
      if (!t || !ids.has(t.docId) || templateIds.has(t.docId) || !Number.isInteger(t.page) || t.page < 1 || t.page > ids.get(t.docId).pages || !str(t.prefix, 100) || !t.areas || typeof t.areas !== 'object' || Array.isArray(t.areas)) fail();
      templateIds.add(t.docId);
      for (const [k, r] of Object.entries(t.areas)) if (!['code','card','content'].includes(k) || !rect(r)) fail();
    }
    const cardIds = new Set(), stampIds = new Set();
    for (const c of p.cards) { validateRecord(c); if (c.removed !== undefined && typeof c.removed !== 'boolean') fail(); if (cardIds.has(c.id)) fail(); cardIds.add(c.id); }
    for (const s of p.stamps) {
      validateRecord(s); if (typeof s.confirmed !== 'boolean' || (s.removed !== undefined && typeof s.removed !== 'boolean')) fail(); if (stampIds.has(s.id)) fail(); stampIds.add(s.id);
      if (s.cardId && !cardIds.has(s.cardId)) fail();
      if (s.confirmed && (!s.cardId || p.cards.find(c => c.id === s.cardId).removed)) fail();
    }
    if (p.approved && (!p.cards.some(c => !c.removed) || p.cards.some(c => !c.removed && !normalize(c.code)))) fail();
    // Reject objects that might become prototype pollution if future code merges them.
    const serialized = JSON.stringify(p);
    if (serialized.length > 25000000 || /"(?:__proto__|prototype|constructor)"\s*:/.test(serialized)) fail();
    return p;
  }
  function project(name = 'Nytt projekt') { return {schema: SCHEMA, schemaVersion: 1, version: VERSION, name, approved: false, docs: [], cards: [], stamps: [], templates: []}; }
  return {VERSION, SCHEMA, normalize, clamp, box, inside, union, lines, readRegion, codeFrom, pages, key, matches, candidates, merge, changeCard, approve, visualScore, validate, project};
});
