import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

/* ------------------------------------------------------------------ *
 *  Lunchbreak Links
 *  One small page: sign-in, link list, add/edit form, profile, admin.
 *  All text typed by members is inserted as plain text, never as HTML.
 * ------------------------------------------------------------------ */

const COLORS = ['#8b7cf6', '#f5a524', '#34c77b', '#f0527a', '#4c9df8', '#22c1d6', '#e879f9', '#a3a3ad'];
const EMOJIS = ['', '🦊', '🐼', '🐙', '🦉', '🐝', '🌵', '🍕', '🎮', '🎧', '🚀', '☕', '🍜', '🎲'];

const ICONS = {
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 5.4"/><path d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07l1.33-1.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
};

/* ---------- tiny DOM helpers ---------- */

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'vars') for (const [n, val] of Object.entries(v)) el.style.setProperty(n, val);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

function icon(name) {
  const s = h('span', { class: 'ic', 'aria-hidden': 'true' });
  s.innerHTML = ICONS[name]; // fixed strings from ICONS above, never user text
  return s;
}

function toast(msg, bad) {
  const t = h('div', { class: 'toast' + (bad ? ' bad' : '') }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3000);
}

const safeColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : COLORS[0]);

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

function avatar(p, size) {
  return h('span', { class: 'avatar' + (size ? ' ' + size : ''), vars: { '--c': safeColor(p?.avatar_color) }, 'aria-hidden': 'true' },
    p?.avatar_emoji || initials(p?.display_name));
}

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return days + ' days ago';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Accepts "example.com" or a full address. Returns a clean http(s) URL, or null. */
function cleanUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch { return null; }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/* ================================================================== *
 *  Data layer. Two interchangeable versions with the same methods:
 *  previewApi()  - sample data in memory, used until config.js is filled in
 *  supabaseApi() - the real shared database
 * ================================================================== */

function previewApi() {
  const day = 864e5, now = Date.now();
  const at = (d) => new Date(now - d * day).toISOString();
  let n = 100;
  const id = () => 'p' + (++n);
  let signedIn = true;

  const db = {
    profiles: [
      { id: 'u1', email: 'ana@example.com', display_name: 'Ana', avatar_emoji: '🦊', avatar_color: '#8b7cf6', is_admin: true, active: true, created_at: at(40) },
      { id: 'u2', email: 'marko@example.com', display_name: 'Marko', avatar_emoji: '🎮', avatar_color: '#34c77b', is_admin: false, active: true, created_at: at(38) },
      { id: 'u3', email: 'jelena@example.com', display_name: 'Jelena', avatar_emoji: '', avatar_color: '#f5a524', is_admin: false, active: true, created_at: at(30) },
    ],
    invites: [
      { email: 'ana@example.com', created_at: at(40) }, { email: 'marko@example.com', created_at: at(38) },
      { email: 'jelena@example.com', created_at: at(30) }, { email: 'ivan@example.com', created_at: at(1) },
    ],
    categories: [
      { id: 'c1', name: 'Game', color: '#8b7cf6' },
      { id: 'c2', name: 'Work', color: '#f5a524' },
      { id: 'c3', name: 'Knowledge Sharing', color: '#34c77b' },
    ],
    links: [
      { id: 'l1', name: 'GeoGuessr', url: 'https://www.geoguessr.com/', category_id: 'c1', added_by: 'u2', created_at: at(0) },
      { id: 'l2', name: 'Laws of UX', url: 'https://lawsofux.com/', category_id: 'c3', added_by: 'u1', created_at: at(1) },
      { id: 'l3', name: 'Skribbl', url: 'https://skribbl.io/', category_id: 'c1', added_by: 'u3', created_at: at(3) },
      { id: 'l4', name: 'Can I use', url: 'https://caniuse.com/', category_id: 'c2', added_by: 'u2', created_at: at(5) },
      { id: 'l5', name: 'Gartic Phone', url: 'https://garticphone.com/', category_id: 'c1', added_by: 'u1', created_at: at(9) },
      { id: 'l6', name: 'MDN Web Docs', url: 'https://developer.mozilla.org/', category_id: 'c3', added_by: 'u3', created_at: at(14) },
    ],
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const pub = ({ email, ...p }) => p;
  const fail = (m) => { throw new Error(m); };

  return {
    preview: true,
    onAuth() {},
    async user() { return signedIn ? { id: 'u1' } : null; },
    async sendLink() {},
    async verifyCode() { signedIn = true; },
    async signOut() { signedIn = false; },
    async load() {
      return copy({ me: pub(db.profiles[0]), profiles: db.profiles.map(pub), categories: db.categories, links: db.links });
    },
    async addLink(l) { db.links.unshift({ id: id(), ...l, added_by: 'u1', created_at: new Date().toISOString() }); },
    async updateLink(lid, l) { Object.assign(db.links.find((x) => x.id === lid), l); },
    async deleteLink(lid) { db.links = db.links.filter((x) => x.id !== lid); },
    async updateProfile(p) { Object.assign(db.profiles[0], p); },
    async adminData() {
      const members = db.profiles.filter((p) => p.active);
      const joined = new Set(db.profiles.map((p) => p.email));
      return copy({ members, pending: db.invites.filter((i) => !joined.has(i.email)) });
    },
    async invite(email) {
      if (!db.invites.some((i) => i.email === email)) db.invites.push({ email, created_at: new Date().toISOString() });
      const p = db.profiles.find((x) => x.email === email);
      if (p) p.active = true;
    },
    async revokeInvite(email) { db.invites = db.invites.filter((i) => i.email !== email); },
    async removeMember(uid) {
      const p = db.profiles.find((x) => x.id === uid);
      p.active = false;
      db.invites = db.invites.filter((i) => i.email !== p.email);
    },
    async addCategory(c) {
      if (db.categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) fail('A category with that name already exists.');
      db.categories.push({ id: id(), ...c });
    },
    async updateCategory(cid, c) {
      if (db.categories.some((x) => x.id !== cid && x.name.toLowerCase() === c.name.toLowerCase())) fail('A category with that name already exists.');
      Object.assign(db.categories.find((x) => x.id === cid), c);
    },
    async deleteCategory(cid) {
      if (db.links.some((l) => l.category_id === cid)) fail('That category still has links. Move them first.');
      db.categories = db.categories.filter((x) => x.id !== cid);
    },
  };
}

async function supabaseApi() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  const friendly = (e) => {
    const m = (e?.message || '').toLowerCase();
    if (e?.code === '23505') return 'A category with that name already exists.';
    if (e?.code === '23503') return 'That category still has links. Move them first.';
    if (e?.code === '42501' || m.includes('row-level security')) return "You don't have permission to do that.";
    if (m.includes('database error saving new user') || m.includes('not been invited') || m.includes('signups not allowed'))
      return "That address isn't on the invite list. Ask the admin for an invitation.";
    if (m.includes('rate limit') || e?.status === 429) return 'Too many sign-in emails just now. Please try again in a few minutes.';
    if (m.includes('expired') || m.includes('invalid')) return 'That code is wrong or has expired. Request a new one.';
    if (m.includes('failed to fetch')) return "Can't reach the server. Check your connection and try again.";
    return e?.message || 'Something went wrong.';
  };
  const ok = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };
  const uid = async () => (await sb.auth.getSession()).data.session?.user?.id || null;

  return {
    preview: false,
    onAuth(cb) { sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(cb, 0); }); },
    async user() { const u = await uid(); return u ? { id: u } : null; },
    async sendLink(email) {
      ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }));
    },
    async verifyCode(email, token) { ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); },
    async signOut() { await sb.auth.signOut(); },
    async load() {
      const me = await uid();
      const [profiles, categories, links] = await Promise.all([
        sb.from('profiles').select('id, display_name, avatar_emoji, avatar_color, is_admin, active').then(ok),
        sb.from('categories').select('id, name, color').order('created_at').then(ok),
        sb.from('links').select('id, name, url, category_id, added_by, created_at').order('created_at', { ascending: false }).then(ok),
      ]);
      return { me: profiles.find((p) => p.id === me) || null, profiles, categories, links };
    },
    async addLink(l) { ok(await sb.from('links').insert(l)); },
    async updateLink(id, l) { ok(await sb.from('links').update(l).eq('id', id)); },
    async deleteLink(id) { ok(await sb.from('links').delete().eq('id', id)); },
    async updateProfile(p) { ok(await sb.from('profiles').update(p).eq('id', await uid())); },
    async adminData() {
      const [all, invites] = await Promise.all([
        sb.rpc('admin_members').then(ok),
        sb.from('invites').select('email, created_at').order('created_at').then(ok),
      ]);
      const joined = new Set(all.map((m) => (m.email || '').toLowerCase()));
      return { members: all.filter((m) => m.active), pending: invites.filter((i) => !joined.has(i.email)) };
    },
    async invite(email) { ok(await sb.rpc('invite_member', { p_email: email })); },
    async revokeInvite(email) { ok(await sb.from('invites').delete().eq('email', email)); },
    async removeMember(id) { ok(await sb.rpc('remove_member', { p_id: id })); },
    async addCategory(c) { ok(await sb.from('categories').insert(c)); },
    async updateCategory(id, c) { ok(await sb.from('categories').update(c).eq('id', id)); },
    async deleteCategory(id) { ok(await sb.from('categories').delete().eq('id', id)); },
  };
}

/* ================================================================== *
 *  App state + rendering
 * ================================================================== */

const $app = document.getElementById('app');
let api;
const S = {
  mode: 'loading',           // loading | signin | sent | removed | error | app
  view: 'links',             // links | admin
  me: null, profiles: [], categories: [], links: [],
  admin: { members: [], pending: [] },
  filter: 'all', q: '', email: '', error: '',
};

const byId = (list, id) => list.find((x) => x.id === id);
const canEdit = (l) => S.me && (S.me.is_admin || l.added_by === S.me.id);

async function refresh() {
  try {
    const user = await api.user();
    if (!user) {
      if (S.mode !== 'sent') S.mode = 'signin';
      S.me = null;
      return render();
    }
    const d = await api.load();
    if (!d.me || !d.me.active) { S.mode = 'removed'; return render(); }
    Object.assign(S, { mode: 'app', me: d.me, profiles: d.profiles, categories: d.categories, links: d.links });
    if (S.filter !== 'all' && !byId(S.categories, S.filter)) S.filter = 'all';
    if (S.view === 'admin') {
      if (S.me.is_admin) S.admin = await api.adminData(); else S.view = 'links';
    }
    render();
  } catch (e) {
    S.mode = 'error'; S.error = e.message; render();
  }
}

/** Runs a change, then reloads. Shows a message if it fails. Returns true on success. */
async function act(fn, done) {
  try { await fn(); } catch (e) { toast(e.message, true); return false; }
  if (done) toast(done);
  await refresh();
  return true;
}

function render() {
  const views = { signin: viewSignin, sent: viewSent, removed: viewRemoved, error: viewError, app: viewApp };
  $app.replaceChildren((views[S.mode] || (() => h('p', { class: 'loading' }, 'Loading…')))());
}

/* ---------- signed-out screens ---------- */

function brandMark() { return h('div', { class: 'brand-mark' }, icon('link')); }

function viewSignin() {
  const err = h('p', { class: 'err', role: 'alert' });
  const email = h('input', { class: 'input', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@company.com', value: S.email });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, 'Send sign-in link');
  const form = h('form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const v = email.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err.textContent = 'Enter your email address.'; return; }
      btn.disabled = true; btn.textContent = 'Sending…'; err.textContent = '';
      try { await api.sendLink(v); S.email = v; S.mode = 'sent'; render(); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Send sign-in link'; }
    },
  }, h('label', { class: 'field' }, h('span', null, 'Email'), email), err, btn);

  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, 'Lunchbreak Links'),
    h('p', null, 'Games and useful finds, shared by the team.'),
    form,
    h('p', { class: 'fine' }, api.preview
      ? 'Preview mode: no email is sent. Any address works.'
      : 'Invite-only. No password needed: we email you a one-time sign-in link.')));
}

function viewSent() {
  const err = h('p', { class: 'err', role: 'alert' });
  const code = h('input', { class: 'input', inputMode: 'numeric', autocomplete: 'one-time-code', placeholder: 'Code from the email', maxLength: 10 });
  const form = h('form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const v = code.value.replace(/\D/g, '');
      if (v.length < 6) { err.textContent = 'Enter the code from the email.'; return; }
      try { await api.verifyCode(S.email, v); S.mode = 'loading'; await refresh(); }
      catch (ex) { err.textContent = ex.message; }
    },
  }, h('label', { class: 'field' }, h('span', null, 'Or enter the code instead'), code), err,
    h('button', { class: 'btn primary', type: 'submit' }, 'Sign in'),
    h('button', { class: 'btn ghost', type: 'button', onclick: () => { S.mode = 'signin'; render(); } }, 'Use a different email'));

  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, 'Check your inbox'),
    h('p', null, 'We sent a sign-in link to ', h('b', null, S.email), '. Open it on this device.'),
    form,
    api.preview && h('p', { class: 'fine' }, 'Preview mode: type any 6 digits.')));
}

function viewRemoved() {
  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, 'No access'),
    h('p', null, "This account doesn't have access to Lunchbreak Links. If that's a mistake, ask the admin to invite you again."),
    h('button', { class: 'btn', onclick: async () => { await api.signOut(); S.mode = 'signin'; refresh(); } }, 'Sign out')));
}

function viewError() {
  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, "Couldn't load"),
    h('p', null, S.error || 'Something went wrong.'),
    h('button', { class: 'btn primary', onclick: () => { if (!api) return location.reload(); S.mode = 'loading'; render(); refresh(); } }, 'Try again')));
}

/* ---------- signed-in app ---------- */

function viewApp() {
  const go = async (view) => {
    S.view = view;
    if (view === 'admin') { try { S.admin = await api.adminData(); } catch (e) { toast(e.message, true); S.view = 'links'; } }
    render(); window.scrollTo(0, 0);
  };

  const nav = h('header', { class: 'nav' },
    h('button', { class: 'brand', onclick: () => go('links'), 'aria-label': 'Lunchbreak Links, home' }, brandMark(), h('span', null, 'Lunchbreak Links')),
    S.me.is_admin && h('nav', { class: 'tabs' },
      h('button', { class: 'tab' + (S.view === 'links' ? ' on' : ''), onclick: () => go('links') }, 'Links'),
      h('button', { class: 'tab' + (S.view === 'admin' ? ' on' : ''), onclick: () => go('admin') }, 'Admin')),
    h('button', { class: 'btn primary', onclick: () => linkDialog(), 'aria-label': 'Add link' }, icon('plus'), h('span', { class: 'label' }, 'Add link')),
    h('button', { class: 'avatar-btn', onclick: profileDialog, 'aria-label': 'Your profile' }, avatar(S.me)));

  return h('div', { class: 'wrap' },
    api.preview && h('div', { class: 'banner' }, 'Preview mode: this is sample data. Changes disappear when you reload the page.'),
    nav,
    S.view === 'admin' ? viewAdmin() : viewLinks());
}

function viewLinks() {
  const grid = h('div', { class: 'grid' });
  const count = (cid) => S.links.filter((l) => l.category_id === cid).length;

  const drawGrid = () => {
    const q = S.q.trim().toLowerCase();
    const shown = S.links.filter((l) => {
      if (S.filter !== 'all' && l.category_id !== S.filter) return false;
      if (!q) return true;
      const cat = byId(S.categories, l.category_id)?.name || '';
      return (l.name + ' ' + l.url + ' ' + cat).toLowerCase().includes(q);
    });
    if (!shown.length) {
      grid.replaceChildren(S.links.length
        ? h('div', { class: 'empty' }, h('h3', null, 'No links match'), 'Try another category or search.')
        : h('div', { class: 'empty' }, h('h3', null, 'Nothing here yet'), 'Be the first to share something.',
            h('div', null, h('button', { class: 'btn primary', onclick: () => linkDialog() }, icon('plus'), 'Add link'))));
      return;
    }
    grid.replaceChildren(...shown.map(linkCard));
  };

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' });
  const drawChips = () => {
    const chip = (id, label, n, color) => h('button', {
      class: 'chip' + (color ? '' : ' plain') + (S.filter === id ? ' on' : ''),
      vars: color ? { '--c': safeColor(color) } : null,
      'aria-pressed': String(S.filter === id),
      onclick: () => { S.filter = id; drawChips(); drawGrid(); },
    }, label, h('span', { class: 'n' }, n));
    chips.replaceChildren(chip('all', 'All', S.links.length), ...S.categories.map((c) => chip(c.id, c.name, count(c.id), c.color)));
  };

  drawChips(); drawGrid();
  const n = S.links.length;
  return h('main', null,
    h('section', { class: 'hero' },
      h('h1', null, 'Take a break, ' + S.me.display_name + '.'),
      h('p', null, n === 1 ? '1 link shared by the team.' : n + ' links shared by the team.'),
      h('label', { class: 'search' }, icon('search'),
        h('input', { type: 'search', placeholder: 'Search links', 'aria-label': 'Search links', value: S.q,
          oninput: (e) => { S.q = e.target.value; drawGrid(); } }))),
    chips, grid);
}

function linkCard(l) {
  const cat = byId(S.categories, l.category_id);
  const who = byId(S.profiles, l.added_by);
  return h('article', { class: 'card' },
    h('a', { class: 'card-link', href: cleanUrl(l.url) || '#', target: '_blank', rel: 'noopener noreferrer' },
      h('span', { class: 'chip', vars: { '--c': safeColor(cat?.color) } }, cat?.name || 'Uncategorised'),
      h('h3', null, l.name),
      h('span', { class: 'host' }, hostOf(l.url), icon('out'))),
    h('div', { class: 'card-foot' },
      avatar(who, 'sm'),
      h('span', { class: 'who' }, (who?.display_name || 'Former member') + ' · ' + ago(l.created_at)),
      canEdit(l) && h('div', { class: 'card-actions' },
        h('button', { class: 'icon-btn', 'aria-label': 'Edit ' + l.name, title: 'Edit', onclick: () => linkDialog(l) }, icon('edit')),
        h('button', { class: 'icon-btn', 'aria-label': 'Delete ' + l.name, title: 'Delete',
          onclick: () => confirmDialog('Delete this link?', '"' + l.name + '" will be removed for everyone.', 'Delete', () => act(() => api.deleteLink(l.id), 'Link deleted')) }, icon('trash')))));
}

/* ---------- dialogs ---------- */

function dialog(build) {
  const d = h('dialog', { class: 'dlg' });
  const close = () => d.close();
  d.append(h('div', { class: 'dlg-in' }, build(close)));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // click outside = cancel
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}

function confirmDialog(title, text, label, onYes) {
  dialog((close) => [
    h('h2', null, title),
    h('p', { class: 'sub' }, text),
    h('div', { class: 'dlg-actions' },
      h('button', { class: 'btn', onclick: close }, 'Cancel'),
      h('button', { class: 'btn danger', onclick: async () => { close(); await onYes(); } }, label)),
  ]);
}

function linkDialog(link) {
  if (!S.categories.length) { toast('There are no categories yet. Ask the admin to add one.', true); return; }
  dialog((close) => {
    const err = h('p', { class: 'err', role: 'alert' });
    const name = h('input', { class: 'input', maxLength: 80, placeholder: 'e.g. GeoGuessr', value: link?.name || '' });
    const url = h('input', { class: 'input', inputMode: 'url', maxLength: 2000, placeholder: 'https://…', value: link?.url || '' });
    const cat = h('select', { class: 'input' },
      !link && h('option', { value: '' }, 'Choose a category'),
      S.categories.map((c) => h('option', { value: c.id, selected: link?.category_id === c.id }, c.name)));
    const save = h('button', { class: 'btn primary', type: 'submit' }, 'Save');

    const form = h('form', {
      novalidate: true, class: 'dlg-in',
      onsubmit: async (e) => {
        e.preventDefault();
        const data = { name: name.value.trim(), url: cleanUrl(url.value), category_id: cat.value };
        if (!data.name) { err.textContent = 'Give the link a name.'; name.focus(); return; }
        if (!data.url) { err.textContent = 'Enter a web address, like https://example.com.'; url.focus(); return; }
        if (!data.category_id) { err.textContent = 'Choose a category.'; cat.focus(); return; }
        save.disabled = true;
        const done = await act(() => (link ? api.updateLink(link.id, data) : api.addLink(data)), link ? 'Link updated' : 'Link added');
        if (done) close(); else save.disabled = false;
      },
    },
      h('h2', null, link ? 'Edit link' : 'Add a link'),
      h('label', { class: 'field' }, h('span', null, 'Name'), name),
      h('label', { class: 'field' }, h('span', null, 'URL'), url),
      h('label', { class: 'field' }, h('span', null, 'Category'), cat),
      err,
      h('div', { class: 'dlg-actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'), save));
    form.style.padding = '0';
    return form;
  });
}

function pickers(state, withEmoji) {
  const box = h('div', null);
  const draw = () => {
    box.replaceChildren(
      withEmoji && h('div', { class: 'field' }, h('span', null, 'Avatar'),
        h('div', { class: 'emojis' }, EMOJIS.map((e) => h('button', {
          type: 'button', class: 'emoji' + (state.avatar_emoji === e ? ' on' : ''), 'aria-label': e ? 'Emoji ' + e : 'Use initials',
          onclick: () => { state.avatar_emoji = e; draw(); },
        }, e || 'Aa')))),
      h('div', { class: 'field' }, h('span', null, 'Colour'),
        h('div', { class: 'swatches' }, COLORS.map((c) => h('button', {
          type: 'button', class: 'swatch' + (state.avatar_color === c ? ' on' : ''), vars: { '--c': c }, 'aria-label': 'Colour ' + c,
          onclick: () => { state.avatar_color = c; draw(); },
        })))));
    state.onchange?.();
  };
  draw();
  return box;
}

function profileDialog() {
  dialog((close) => {
    const st = { display_name: S.me.display_name, avatar_emoji: S.me.avatar_emoji || '', avatar_color: safeColor(S.me.avatar_color) };
    const err = h('p', { class: 'err', role: 'alert' });
    const name = h('input', { class: 'input', maxLength: 40, value: st.display_name, oninput: (e) => { st.display_name = e.target.value; st.onchange(); } });
    const head = h('div', { class: 'profile-head' });
    st.onchange = () => head.replaceChildren(avatar(st, 'lg'), h('div', null, h('h2', null, 'Your profile'), h('p', { class: 'sub' }, S.me.is_admin ? 'Admin' : 'Member')));
    const pick = pickers(st, true);
    const save = h('button', { class: 'btn primary', type: 'submit' }, 'Save');
    const form = h('form', {
      novalidate: true, class: 'dlg-in',
      onsubmit: async (e) => {
        e.preventDefault();
        const display_name = name.value.trim();
        if (!display_name) { err.textContent = 'Enter a name.'; return; }
        save.disabled = true;
        const done = await act(() => api.updateProfile({ display_name, avatar_emoji: st.avatar_emoji, avatar_color: st.avatar_color }), 'Profile saved');
        if (done) close(); else save.disabled = false;
      },
    },
      head,
      h('label', { class: 'field' }, h('span', null, 'Display name'), name),
      pick, err,
      h('div', { class: 'dlg-actions' },
        h('button', { class: 'btn ghost left', type: 'button', onclick: async () => { close(); await api.signOut(); S.mode = 'signin'; S.view = 'links'; refresh(); } }, 'Sign out'),
        h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'), save));
    form.style.padding = '0';
    return form;
  });
}

function categoryDialog(cat) {
  dialog((close) => {
    const used = new Set(S.categories.map((c) => c.color));
    const st = { avatar_color: safeColor(cat?.color || COLORS.find((c) => !used.has(c))) };
    const err = h('p', { class: 'err', role: 'alert' });
    const name = h('input', { class: 'input', maxLength: 30, placeholder: 'e.g. Inspiration', value: cat?.name || '' });
    const save = h('button', { class: 'btn primary', type: 'submit' }, 'Save');
    const form = h('form', {
      novalidate: true, class: 'dlg-in',
      onsubmit: async (e) => {
        e.preventDefault();
        const data = { name: name.value.trim(), color: st.avatar_color };
        if (!data.name) { err.textContent = 'Give the category a name.'; return; }
        save.disabled = true;
        const done = await act(() => (cat ? api.updateCategory(cat.id, data) : api.addCategory(data)), cat ? 'Category updated' : 'Category added');
        if (done) close(); else save.disabled = false;
      },
    },
      h('h2', null, cat ? 'Edit category' : 'New category'),
      h('label', { class: 'field' }, h('span', null, 'Name'), name),
      pickers(st, false), err,
      h('div', { class: 'dlg-actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'), save));
    form.style.padding = '0';
    return form;
  });
}

/* ---------- admin ---------- */

function viewAdmin() {
  const siteUrl = location.origin + location.pathname;
  const inviteText = (email) =>
    `Hi! You're invited to Lunchbreak Links, our little page for sharing games and useful links.\n\n` +
    `Open ${siteUrl} and sign in with this email address (${email}). There's no password: you'll get a one-time sign-in link by email.`;

  /* Members */
  const members = h('section', { class: 'section' },
    h('h2', null, 'Members'),
    h('p', null, 'People who can see and add links.'),
    h('div', { class: 'rows' }, S.admin.members.map((m) => h('div', { class: 'row' },
      avatar(m),
      h('div', { class: 'main' }, h('b', null, m.display_name), h('small', null, m.email)),
      m.is_admin && h('span', { class: 'badge' }, 'Admin'),
      m.id !== S.me.id && h('button', { class: 'btn small danger',
        onclick: () => confirmDialog('Remove ' + m.display_name + '?', 'They lose access straight away. Links they added stay on the site.', 'Remove',
          () => act(() => api.removeMember(m.id), 'Member removed')) }, 'Remove')))));

  /* Invitations */
  const email = h('input', { class: 'input', type: 'email', placeholder: 'colleague@company.com', 'aria-label': 'Email to invite' });
  const invite = h('section', { class: 'section' },
    h('h2', null, 'Invitations'),
    h('p', null, 'Only invited addresses can sign in. Adding one does not send an email by itself: use "Email invite" to send it from your own mail.'),
    h('form', { class: 'inline-form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        const v = email.value.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { toast('Enter a valid email address.', true); return; }
        await act(() => api.invite(v), 'Invitation added');
      } }, email, h('button', { class: 'btn primary', type: 'submit' }, 'Invite')),
    h('div', { class: 'rows' }, S.admin.pending.length
      ? S.admin.pending.map((i) => h('div', { class: 'row' },
          h('div', { class: 'main' }, h('b', null, i.email), h('small', null, 'Invited ' + ago(i.created_at) + ' · not signed in yet')),
          h('div', { class: 'acts' },
            h('a', { class: 'btn small', href: 'mailto:' + i.email + '?subject=' + encodeURIComponent('Your invite to Lunchbreak Links') + '&body=' + encodeURIComponent(inviteText(i.email)) }, 'Email invite'),
            h('button', { class: 'btn small', onclick: async () => {
              try { await navigator.clipboard.writeText(inviteText(i.email)); toast('Invite text copied'); } catch { toast("Couldn't copy. Use Email invite instead.", true); }
            } }, 'Copy'),
            h('button', { class: 'btn small danger', onclick: () => act(() => api.revokeInvite(i.email), 'Invitation revoked') }, 'Revoke'))))
      : h('div', { class: 'none' }, 'No pending invitations.')));

  /* Categories */
  const cats = h('section', { class: 'section' },
    h('h2', null, 'Categories'),
    h('p', null, 'Every link belongs to one category. A category can be deleted once it has no links.'),
    h('div', { class: 'rows' }, S.categories.map((c) => {
      const n = S.links.filter((l) => l.category_id === c.id).length;
      return h('div', { class: 'row' },
        h('div', { class: 'main' }, h('span', { class: 'chip', vars: { '--c': safeColor(c.color) } }, c.name), h('small', null, n === 1 ? '1 link' : n + ' links')),
        h('div', { class: 'acts' },
          h('button', { class: 'btn small', onclick: () => categoryDialog(c) }, 'Edit'),
          h('button', { class: 'btn small danger', disabled: n > 0, title: n > 0 ? 'Move or delete its links first' : null,
            onclick: () => confirmDialog('Delete "' + c.name + '"?', 'The category will be removed for everyone.', 'Delete', () => act(() => api.deleteCategory(c.id), 'Category deleted')) }, 'Delete')));
    })),
    h('div', null, h('button', { class: 'btn small', onclick: () => categoryDialog() }, icon('plus'), 'New category')));
  cats.lastChild.style.marginTop = '12px';

  return h('main', null,
    h('div', { class: 'page-head' }, h('h1', null, 'Admin'), h('p', null, 'Manage who is in, and how links are organised.')),
    h('div', { class: 'sections' }, members, invite, cats));
}

/* ---------- start ---------- */

async function start() {
  try {
    api = SUPABASE_URL && SUPABASE_KEY ? await supabaseApi() : previewApi();
  } catch {
    S.mode = 'error'; S.error = "Can't reach the server. Check your connection and try again."; return render();
  }
  api.onAuth(() => { if (!document.querySelector('dialog[open]')) refresh(); });
  // Pick up other people's changes when you come back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.mode === 'app' && !document.querySelector('dialog[open]') && document.activeElement?.tagName !== 'INPUT') refresh();
  });
  await refresh();
}

start();
