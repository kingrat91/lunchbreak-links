import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=5';

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
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
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

function clock(iso) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return t;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + t;
}

/** Turns web addresses inside a chat message into clickable links. Everything else stays plain text. */
function linkify(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const raw = m[0].replace(/[.,!?;:)\]]+$/, '');
    const href = cleanUrl(raw);
    if (!href) continue;
    out.push(text.slice(last, m.index), h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, raw));
    last = m.index + raw.length;
  }
  out.push(text.slice(last));
  return out;
}

/** If Google sign-in was refused, the reason comes back in the page address. Read it, then tidy the address. */
function signInProblem() {
  const p = new URLSearchParams(location.hash.replace(/^#/, '') + '&' + location.search.replace(/^\?/, ''));
  const d = p.get('error_description') || p.get('error');
  if (!d) return '';
  history.replaceState(null, '', location.pathname);
  return /saving new user|not been invited|signups? not allowed/i.test(d)
    ? "That Google account isn't on the invite list. Ask the admin for an invitation, then try again."
    : "Sign-in didn't complete. Please try again.";
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
    messages: [
      { id: 1, body: 'Anyone up for a round of Skribbl at 13:00?', author: 'u2', created_at: at(0.08) },
      { id: 2, body: "I'm in 🙌", author: 'u1', created_at: at(0.07) },
      { id: 3, body: 'Me too. Also added a good one for the UX folks: https://lawsofux.com/', author: 'u3', created_at: at(0.05) },
    ],
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const pub = ({ email, ...p }) => p;
  const fail = (m) => { throw new Error(m); };

  return {
    preview: true,
    onAuth() {},
    async user() { return signedIn ? { id: 'u1' } : null; },
    async signIn() { signedIn = true; },
    async signOut() { signedIn = false; },
    async load() {
      return copy({ me: pub(db.profiles[0]), profiles: db.profiles.map(pub), categories: db.categories, links: db.links });
    },
    async loadMessages(before) {
      const all = db.messages.filter((m) => !before || m.id < before);
      return copy({ msgs: all.slice(-50), hasMore: all.length > 50 });
    },
    async sendMessage(body) {
      const m = { id: ++n, body, author: 'u1', created_at: new Date().toISOString() };
      db.messages.push(m);
      return copy(m);
    },
    async deleteMessage(mid) { db.messages = db.messages.filter((m) => m.id !== mid); },
    subscribeMessages() { return () => {}; },
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
    if (m.includes('failed to fetch')) return "Can't reach the server. Check your connection and try again.";
    return e?.message || 'Something went wrong.';
  };
  const ok = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };
  const uid = async () => (await sb.auth.getSession()).data.session?.user?.id || null;

  return {
    preview: false,
    onAuth(cb) { sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(cb, 0); }); },
    async user() { const u = await uid(); return u ? { id: u } : null; },
    async signIn() {
      ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }));
    },
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
    async loadMessages(before) {
      let q = sb.from('messages').select('id, body, author, created_at').order('id', { ascending: false }).limit(51);
      if (before) q = q.lt('id', before);
      const rows = ok(await q);
      return { msgs: rows.slice(0, 50).reverse(), hasMore: rows.length > 50 };
    },
    async sendMessage(body) {
      return ok(await sb.from('messages').insert({ body }).select('id, body, author, created_at').single());
    },
    async deleteMessage(id) { ok(await sb.from('messages').delete().eq('id', id)); },
    /** Live updates: calls onInsert / onDelete whenever anyone posts or deletes a message. */
    subscribeMessages(onInsert, onDelete) {
      const ch = sb.channel('chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => onInsert(p.new))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => onDelete(p.old.id))
        .subscribe();
      return () => sb.removeChannel(ch);
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
  mode: 'loading',           // loading | signin | removed | error | app
  view: 'links',             // links | admin
  me: null, profiles: [], categories: [], links: [],
  admin: { members: [], pending: [] },
  filter: 'all', q: '', error: '', signInError: '',
};

const byId = (list, id) => list.find((x) => x.id === id);
const canEdit = (l) => S.me && (S.me.is_admin || l.added_by === S.me.id);

async function refresh() {
  try {
    const user = await api.user();
    if (!user) {
      S.mode = 'signin'; S.me = null;
      chatStop();
      return render();
    }
    const d = await api.load();
    if (!d.me || !d.me.active) { S.mode = 'removed'; chatStop(); return render(); }
    Object.assign(S, { mode: 'app', me: d.me, profiles: d.profiles, categories: d.categories, links: d.links });
    if (S.filter !== 'all' && !byId(S.categories, S.filter)) S.filter = 'all';
    if (S.view === 'admin') {
      if (S.me.is_admin) S.admin = await api.adminData(); else S.view = 'links';
    }
    render();
    chatStart();
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
  const views = { signin: viewSignin, removed: viewRemoved, error: viewError, app: viewApp };
  $app.replaceChildren((views[S.mode] || (() => h('p', { class: 'loading' }, 'Loading…')))());
}

/* ---------- signed-out screens ---------- */

function brandMark() { return h('div', { class: 'brand-mark' }, icon('link')); }

function viewSignin() {
  const err = h('p', { class: 'err', role: 'alert' }, S.signInError);
  const btn = h('button', {
    class: 'btn primary', type: 'button',
    onclick: async () => {
      btn.disabled = true; err.textContent = ''; S.signInError = '';
      try { await api.signIn(); if (api.preview) { S.mode = 'loading'; await refresh(); } }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    },
  }, 'Continue with Google');

  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, 'Lunchbreak Links'),
    h('p', null, 'Games and useful finds, shared by the team.'),
    h('div', { class: 'stack' }, err, btn),
    h('p', { class: 'fine' }, api.preview
      ? 'Preview mode: no real sign-in happens.'
      : 'Invite-only. Sign in with the Google account you were invited with.')));
}

function viewRemoved() {
  return h('main', { class: 'center' }, h('div', { class: 'panel' },
    brandMark(),
    h('h1', null, 'No access'),
    h('p', null, "This account doesn't have access to Lunchbreak Links. If that's a mistake, ask the admin to invite you again."),
    h('button', { class: 'btn', onclick: async () => { await api.signOut(); refresh(); } }, 'Sign out')));
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
    h('button', { class: 'icon-btn chat-btn' + (chat.unread ? ' has-new' : ''), onclick: () => toggleChat(), 'aria-label': 'Chat', title: 'Chat' }, icon('chat')),
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
      h('h1', null, 'Take a break, ' + S.me.display_name.trim().split(/\s+/)[0] + '.'),
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
      S.categories.map((c) => h('option', { value: c.id, selected: link ? link.category_id === c.id : S.filter === c.id }, c.name)));
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
        h('button', { class: 'btn ghost left', type: 'button', onclick: async () => { close(); await api.signOut(); S.view = 'links'; refresh(); } }, 'Sign out'),
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
    `Open ${siteUrl} and click "Continue with Google", using this account: ${email}.`;

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
    h('p', null, 'Only invited Google accounts can sign in. Adding one does not send an email by itself: use "Email invite" to send it from your own mail.'),
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

/* ---------- chat ---------- *
 * One shared room in a slide-out panel. The panel lives outside the main
 * page area so it stays put while the rest of the page redraws.          */

const chat = { ready: false, open: false, unread: false, msgs: [], hasMore: false, el: null, list: null, input: null, stop: null };
const SEEN_KEY = 'lunchbreak-chat-seen';
const getSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const setSeen = (id) => { try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* private window: fine */ } };

async function chatStart() {
  if (chat.ready) return;
  chat.ready = true;
  chatBuild();
  chat.stop = api.subscribeMessages(chatAdd, chatRemove);
  await chatReload();
}

function chatStop() {
  if (!chat.ready) return;
  chat.stop?.();
  chat.el?.remove();
  document.body.classList.remove('chat-open');
  Object.assign(chat, { ready: false, open: false, unread: false, msgs: [], hasMore: false, el: null, list: null, input: null, stop: null });
}

async function chatReload() {
  try {
    const d = await api.loadMessages();
    chat.msgs = d.msgs; chat.hasMore = d.hasMore;
  } catch { return; }
  chatDraw(true);
}

function chatAdd(m) {
  if (!chat.ready || chat.msgs.some((x) => x.id === m.id)) return;
  chat.msgs.push(m);
  chat.msgs.sort((a, b) => a.id - b.id);
  if (!byId(S.profiles, m.author) && !document.querySelector('dialog[open]')) refresh(); // someone new: fetch their name
  chatDraw(m.author === S.me?.id);
}

function chatRemove(id) {
  if (!chat.ready) return;
  chat.msgs = chat.msgs.filter((x) => x.id !== id);
  chatDraw(false);
}

function chatBuild() {
  chat.list = h('div', { class: 'chat-list', role: 'log', 'aria-live': 'polite' });
  chat.input = h('textarea', { class: 'input chat-input', rows: 1, maxLength: 1000, placeholder: 'Write a message', 'aria-label': 'Message' });
  const send = async () => {
    const body = chat.input.value.trim();
    if (!body) return;
    chat.input.value = '';
    try { chatAdd(await api.sendMessage(body)); }
    catch (e) { chat.input.value = body; toast(e.message, true); }
  };
  chat.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') toggleChat(false);
  });
  chat.el = h('aside', { class: 'chat', 'aria-label': 'Chat', hidden: true },
    h('div', { class: 'chat-head' },
      h('h2', null, 'Chat'),
      h('button', { class: 'icon-btn', 'aria-label': 'Close chat', onclick: () => toggleChat(false) }, icon('close'))),
    chat.list,
    h('form', { class: 'chat-form', onsubmit: (e) => { e.preventDefault(); send(); } },
      chat.input,
      h('button', { class: 'btn primary chat-send', type: 'submit', 'aria-label': 'Send message' }, icon('send'))));
  document.body.append(chat.el);
}

function toggleChat(force) {
  if (!chat.ready) return;
  chat.open = force ?? !chat.open;
  chat.el.hidden = !chat.open;
  document.body.classList.toggle('chat-open', chat.open);
  if (chat.open) { chatDraw(true); chat.input.focus(); }
}

function chatDraw(toBottom) {
  if (!chat.list) return;
  const el = chat.list;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

  const row = (m) => {
    const who = byId(S.profiles, m.author);
    return h('div', { class: 'msg' },
      avatar(who, 'md'),
      h('div', { class: 'msg-main' },
        h('div', { class: 'msg-meta' }, h('b', null, who?.display_name || 'Member'), h('time', { dateTime: m.created_at }, clock(m.created_at))),
        h('p', { class: 'msg-body' }, linkify(m.body))),
      (m.author === S.me?.id || S.me?.is_admin) && h('button', { class: 'icon-btn msg-del', 'aria-label': 'Delete message', title: 'Delete',
        onclick: () => confirmDialog('Delete this message?', 'It will be removed for everyone.', 'Delete', async () => {
          try { await api.deleteMessage(m.id); chatRemove(m.id); } catch (e) { toast(e.message, true); }
        }) }, icon('trash')));
  };

  const more =
    chat.hasMore && h('button', { class: 'btn small ghost chat-more', onclick: async () => {
      try {
        const before = el.scrollHeight;
        const d = await api.loadMessages(chat.msgs[0].id);
        chat.msgs = [...d.msgs, ...chat.msgs]; chat.hasMore = d.hasMore;
        chatDraw(false);
        el.scrollTop = el.scrollHeight - before;
      } catch (e) { toast(e.message, true); }
    } }, 'Load earlier messages');
  const rows = chat.msgs.length ? chat.msgs.map(row) : [h('p', { class: 'chat-empty' }, 'No messages yet. Say hi.')];
  el.replaceChildren(...(more ? [more] : []), ...rows);

  if (toBottom || nearBottom) el.scrollTop = el.scrollHeight;

  // Unread dot on the chat button
  const last = chat.msgs[chat.msgs.length - 1];
  if (chat.open) { if (last) setSeen(last.id); chat.unread = false; }
  else chat.unread = !!last && last.id > getSeen() && last.author !== S.me?.id;
  document.querySelector('.chat-btn')?.classList.toggle('has-new', chat.unread);
}

/* ---------- background typewriter ---------- */
// Quietly types a line at random spots behind the page, then lets it fade.
// Purely decorative: hidden from screen readers, never clickable, and it stays
// still for people who have asked their device for less motion.

const TYPED_LINE = 'All work and no play makes Jack a dull boy';

function backgroundTyping() {
  const layer = document.getElementById('bg');
  if (!layer) return;
  const rand = (a, b) => a + Math.random() * (b - a);
  // Pick a spot that is not on top of a line that is already showing.
  const place = (el) => {
    const taken = [...layer.children].map((c) => parseFloat(c.style.top));
    let top = rand(4, 86);
    for (let n = 0; n < 12 && taken.some((t) => Math.abs(t - top) < 16); n++) top = rand(4, 86);
    el.style.left = rand(2, 68) + '%';
    el.style.top = top + '%';
    el.style.fontSize = rand(13, 16) + 'px';
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'tw';
      el.textContent = TYPED_LINE;
      place(el);
      layer.append(el);
    }
    return;
  }

  const MAX = 3;
  let live = 0;
  function spawn() {
    if (document.hidden || live >= MAX) return;
    live++;
    const el = document.createElement('div');
    el.className = 'tw typing';
    place(el);
    layer.append(el);
    const text = Array(1 + Math.floor(rand(0, 3))).fill(TYPED_LINE).join('\n');
    let i = 0;
    (function key() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) return setTimeout(key, text[i - 1] === '\n' ? 500 : rand(45, 130));
      el.classList.remove('typing');
      setTimeout(() => el.classList.add('gone'), 5000);
      setTimeout(() => { el.remove(); live--; }, 8000);
    })();
  }
  spawn();
  setInterval(spawn, 3500);
}

/* ---------- start ---------- */

async function start() {
  S.signInError = signInProblem();
  try {
    api = SUPABASE_URL && SUPABASE_KEY ? await supabaseApi() : previewApi();
  } catch {
    S.mode = 'error'; S.error = "Can't reach the server. Check your connection and try again."; return render();
  }
  api.onAuth(() => { if (!document.querySelector('dialog[open]')) refresh(); });
  // Pick up other people's changes when you come back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.mode === 'app' && !document.querySelector('dialog[open]') && document.activeElement?.tagName !== 'INPUT') { refresh(); if (chat.ready) chatReload(); }
  });
  await refresh();
}

backgroundTyping();
start();
