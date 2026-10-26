// 결혼식 하객 접수 앱 — index.html, admin.html 공용 코드
var ROOT = 'wedding';
var DEFAULT_GROUPS = ['교회', '직장', '친척', '친구', '지인', '기타'];
var DEFAULT_SETTINGS = { title: '', quickAmounts: [30000, 50000, 100000, 200000, 300000, 500000, 1000000], defaultTickets: 1 };

var _db, _me, _isMaster = false;
var _refs = [];
var groups = {}, guests = {}, settings = {};

function $(id) { return document.getElementById(id); }
function show(id) {
  ['setupScreen', 'loginScreen', 'deniedScreen', 'appScreen'].forEach(function (s) { if ($(s)) $(s).classList.toggle('hidden', s !== id); });
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function lc(s) { return String(s || '').toLowerCase(); }
function emailKey(e) { return lc(e).split('.').join(','); }
function won(n) { return (Number(n) || 0).toLocaleString('ko-KR') + '원'; }
function manwon(n) {
  n = Number(n) || 0;
  if (n === 0) return '0';
  if (n % 10000 === 0) return (n / 10000).toLocaleString('ko-KR') + '만원';
  return won(n);
}
function hm(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
}
function groupName(gid) { return groups[gid] ? groups[gid].name : '미분류'; }
function sortedGroups() {
  return Object.keys(groups).map(function (k) { return { id: k, name: groups[k].name, order: groups[k].order || 0 }; })
    .sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name, 'ko'); });
}
function guestArr() {
  return Object.keys(guests).map(function (k) { var g = guests[k]; g.id = k; return g; });
}
function byName(a, b) { return String(a.name).localeCompare(String(b.name), 'ko'); }

// 설정값 (DB 값이 없으면 기본값)
function appTitle() { return settings.title || (typeof APP_TITLE !== 'undefined' && APP_TITLE) || '결혼식 하객 접수'; }
function quickAmounts() {
  var q = settings.quickAmounts;
  if (q && typeof q === 'object') q = Object.keys(q).map(function (k) { return q[k]; });
  return (q && q.length) ? q.map(Number).filter(function (n) { return n > 0; }) : DEFAULT_SETTINGS.quickAmounts;
}
function defaultTickets() { return settings.defaultTickets != null ? Number(settings.defaultTickets) : DEFAULT_SETTINGS.defaultTickets; }
function applyTitle() {
  document.querySelectorAll('.app-title').forEach(function (el) { el.textContent = appTitle() + (el.getAttribute('data-suffix') || ''); });
  document.title = appTitle() + (document.body.getAttribute('data-title-suffix') || '');
}

/* ---------- 로그인 ---------- */
// opts.masterOnly: 마스터만 들어올 수 있는 페이지
// opts.onStart(): 접근이 확인된 뒤 호출
function initApp(opts) {
  applyTitle();
  if (/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent) && $('inappNotice')) $('inappNotice').classList.remove('hidden');
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey) { show('setupScreen'); return; }
  firebase.initializeApp(FIREBASE_CONFIG);
  _db = firebase.database();
  firebase.auth().onAuthStateChanged(function (u) {
    detachAll();
    if (!u) { show('loginScreen'); return; }
    _me = u;
    _isMaster = lc(u.email) === lc(MASTER_EMAIL);
    function deny() { $('deniedEmail').textContent = u.email; show('deniedScreen'); }
    if (opts.masterOnly && !_isMaster) { deny(); return; }
    _db.ref(ROOT + '/data/groups').once('value').then(function () {
      show('appScreen');
      opts.onStart();
    }).catch(deny);
  });
}

function signIn() {
  var p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  firebase.auth().signInWithPopup(p).catch(function (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      firebase.auth().signInWithRedirect(p);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      alert('로그인에 실패했습니다.\n' + e.message);
    }
  });
}

function listen(path, cb) {
  var r = _db.ref(path);
  r.on('value', cb, function (e) { console.error(path, e); });
  _refs.push(r);
}
function detachAll() {
  _refs.forEach(function (r) { r.off(); });
  _refs = []; groups = {}; guests = {}; settings = {};
}

function seedGroups() {
  var up = {};
  DEFAULT_GROUPS.forEach(function (n, i) { up[_db.ref().push().key] = { name: n, order: i + 1 }; });
  return _db.ref(ROOT + '/data/groups').update(up);
}
