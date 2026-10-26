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

/* ---------- 확인 창 (브라우저 기본 알림창 대신) ---------- */
// okLabel 이 null 이면 확인 버튼만 있는 안내 창
function ask(title, msg, okLabel, danger) {
  if (!$('dlgBg')) {
    var el = document.createElement('div');
    el.id = 'dlgBg'; el.className = 'dlg-bg hidden';
    el.innerHTML = '<div class="dlg"><h3 id="dlgTitle"></h3><p id="dlgMsg"></p><div class="btns">' +
      '<button class="b" id="dlgCancel">취소</button><button class="b pri" id="dlgOk">확인</button></div></div>';
    document.body.appendChild(el);
  }
  return new Promise(function (resolve) {
    $('dlgTitle').textContent = title;
    $('dlgMsg').textContent = msg || '';
    $('dlgOk').textContent = okLabel || '확인';
    $('dlgOk').className = 'b ' + (danger ? 'red' : 'pri');
    $('dlgCancel').classList.toggle('hidden', okLabel === null);
    $('dlgBg').classList.remove('hidden');
    function done(v) { $('dlgBg').classList.add('hidden'); resolve(v); }
    $('dlgOk').onclick = function () { done(true); };
    $('dlgCancel').onclick = function () { done(false); };
    $('dlgBg').onclick = function (e) { if (e.target === $('dlgBg')) done(false); };
  });
}
function notice(title, msg) { return ask(title, msg, null); }

/* ---------- 선택 칸 (휴대폰 기본 선택 창 대신 앱 디자인의 선택 창) ---------- */
// 원래 <select>는 숨겨 두고 값 저장용으로 그대로 사용 — 기존 코드의 .value / onchange 가 그대로 동작
var _selValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
function prettySelect(sel) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'input pick' + (sel.classList.contains('grow') ? ' grow' : '');
  btn.style.cssText = sel.style.cssText;
  sel.parentNode.insertBefore(btn, sel);
  sel.classList.add('hidden');
  function sync() { var o = sel.options[sel.selectedIndex]; btn.textContent = o ? o.text : ''; }
  Object.defineProperty(sel, 'value', {
    get: function () { return _selValue.get.call(sel); },
    set: function (v) { _selValue.set.call(sel, v); sync(); }
  });
  new MutationObserver(sync).observe(sel, { childList: true });
  btn.onclick = function () { openPicker(sel, sync); };
  sync();
}
function openPicker(sel, sync) {
  if (!$('pickBg')) {
    var el = document.createElement('div');
    el.id = 'pickBg'; el.className = 'pick-bg hidden';
    el.innerHTML = '<div class="pick-sheet"><h3 id="pickTitle"></h3><ul id="pickList"></ul></div>';
    el.onclick = function (e) { if (e.target === el) el.classList.add('hidden'); };
    document.body.appendChild(el);
  }
  $('pickTitle').textContent = sel.getAttribute('data-title') || '선택';
  var cur = _selValue.get.call(sel);
  $('pickList').innerHTML = Array.prototype.map.call(sel.options, function (o, i) {
    return '<li data-i="' + i + '" class="' + (o.value === cur ? 'on' : '') + '"><span>' + esc(o.text) + '</span>' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></li>';
  }).join('');
  Array.prototype.forEach.call($('pickList').children, function (li) {
    li.onclick = function () {
      _selValue.set.call(sel, sel.options[+li.getAttribute('data-i')].value);
      sync();
      $('pickBg').classList.add('hidden');
      sel.dispatchEvent(new Event('change'));
    };
  });
  $('pickBg').classList.remove('hidden');
  var on = $('pickList').querySelector('.on');
  if (on) on.scrollIntoView({ block: 'center' });
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
      notice('로그인에 실패했습니다', e.message);
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

// 그룹 순서를 정해진 순서로 한 번만 맞춤 (마스터 접속 시). 완료 표시는 data/meta 에 남겨 다시 실행되지 않음
var GROUP_ORDER_V1 = ['CGN', '온누리교회', '숭덕교회', '직장', '친척', '친구', '지인'];
function applyGroupOrderOnce() {
  if (!_isMaster) return;
  var base = ROOT + '/data';
  _db.ref(base + '/meta/groupOrderV1').once('value').then(function (done) {
    if (done.val()) return;
    return _db.ref(base + '/groups').once('value').then(function (s) {
      var gs = s.val() || {};
      var ids = Object.keys(gs);
      if (!ids.length) return;
      function rank(id) {
        var n = String(gs[id].name || '').trim();
        var i = GROUP_ORDER_V1.indexOf(n);
        if (i >= 0) return i;
        return n === '기타' ? 2000 : 1000 + (gs[id].order || 0);
      }
      ids.sort(function (a, b) { return rank(a) - rank(b); });
      var up = { 'meta/groupOrderV1': true };
      ids.forEach(function (id, i) { up['groups/' + id + '/order'] = i + 1; });
      return _db.ref(base).update(up);
    });
  }).catch(function (e) { console.error('group order', e); });
}

function seedGroups() {
  var up = {};
  DEFAULT_GROUPS.forEach(function (n, i) { up[_db.ref().push().key] = { name: n, order: i + 1 }; });
  return _db.ref(ROOT + '/data/groups').update(up);
}
