import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, writeBatch, serverTimestamp, increment, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/* ---------- 설정 ---------- */
const ADMINS = ["kyubum1231@gmail.com"];
const KAKAO = "https://open.kakao.com/o/sMAP4AVi";
const LEAGUES = ["미친인생","KB Keeper League 26-27","2026-2027 NBA Mania V1","2026-2027 NBA Mania V2","KB League 26-27","Winners NBA 26-27","M NBA FANTASY","2026-2027 NBA H2H League","KB Mini League","KB Concept League","하루에 10분씩 하는 느바 판타지","Come on Adam Silver"];
const RULE = { budget: 50000, minDays: 14, bonus: 20, part: 10, qpts: 20,
  tiers: [{ id: "b", name: "바로 써버리기~", pts: 2000, won: 2000, desc: "2,000원 상당 · 편의점·저가 커피" },
          { id: "s", name: "모았다가 한번에!", pts: 5000, won: 5000, desc: "5,000원 상당 · 커피 전문점" }] };
const NAME_RE = /^[A-Za-z][A-Za-z'.\-]*(\s+[A-Za-z][A-Za-z'.\-]*)+$/;
const F = {
  name: { re: NAME_RE, rule: "선수 영문 풀네임 (이름 성)", name: true },
  team: { re: /^[A-Za-z]{3}$/, rule: "팀 영문 약자 3글자" },
  pair: { re: /^[A-Za-z]{2,3}\s+[A-Za-z]{2,3}$/, rule: "두 팀 영문 약자, 띄어쓰기로 구분 (순서 상관없음)", pair: true },
  num: { re: /^\d{1,3}$/, rule: "숫자만 · 가장 가까운 사람이 정답", num: true } };
const CATS = ["선수", "팀", "경기", "숫자"];
const LV = { 1: "기본", 2: "중간", 3: "어려움" };
const BANK = {
  pts: { c: "선수", lv: 1, f: "name", q: "오늘의 득점 1위 선수는?", fx: "Victor Wembanyama" },
  ast: { c: "선수", lv: 1, f: "name", q: "오늘의 어시스트 1위 선수는?", fx: "James Harden" },
  reb: { c: "선수", lv: 1, f: "name", q: "오늘의 리바운드 1위 선수는?", fx: "Ivica Zubac" },
  tpm: { c: "선수", lv: 2, f: "name", q: "오늘의 3점슛 성공 1위 선수는?", fx: "Stephen Curry" },
  stl: { c: "선수", lv: 2, f: "name", q: "오늘의 스틸 1위 선수는?", fx: "Jalen Suggs" },
  blk: { c: "선수", lv: 2, f: "name", q: "오늘의 블록 1위 선수는?", fx: "Victor Wembanyama" },
  oreb: { c: "선수", lv: 2, f: "name", q: "오늘의 공격 리바운드 1위 선수는?", fx: "Evan Mobley" },
  fgm: { c: "선수", lv: 2, f: "name", q: "오늘의 야투 성공 1위 선수는?", fx: "Nikola Jokic" },
  min: { c: "선수", lv: 2, f: "name", q: "오늘 출전 시간이 가장 긴 선수는?", fx: "Deni Avdija" },
  ftm: { c: "선수", lv: 3, f: "name", q: "오늘의 자유투 성공 1위 선수는?", fx: "James Harden" },
  tov: { c: "선수", lv: 3, f: "name", q: "오늘 턴오버가 가장 많은 선수는?", fx: "James Harden" },
  pm: { c: "선수", lv: 3, f: "name", q: "오늘의 +/- 1위 선수는?", fx: "Evan Mobley" },
  bench: { c: "선수", lv: 3, f: "name", q: "오늘 벤치 출전 선수 중 득점 1위는?", fx: "Andrew Nembhard" },
  thi: { c: "팀", lv: 1, f: "team", q: "오늘 득점이 가장 많은 팀은?", fx: "OKC" },
  tlo: { c: "팀", lv: 1, f: "team", q: "오늘 득점이 가장 적은 팀은?", fx: "UTA" },
  t3: { c: "팀", lv: 2, f: "team", q: "오늘 3점슛 성공이 가장 많은 팀은?", fx: "BOS" },
  treb: { c: "팀", lv: 2, f: "team", q: "오늘 리바운드가 가장 많은 팀은?", fx: "CLE" },
  tast: { c: "팀", lv: 2, f: "team", q: "오늘 어시스트가 가장 많은 팀은?", fx: "DEN" },
  ttov: { c: "팀", lv: 3, f: "team", q: "오늘 턴오버가 가장 많은 팀은?", fx: "WAS" },
  bigw: { c: "팀", lv: 3, f: "team", q: "오늘 가장 큰 점수 차로 이긴 팀은?", fx: "OKC" },
  ghi: { c: "경기", lv: 1, f: "pair", q: "두 팀 득점 합이 가장 높은 경기는?", fx: "POR SAS" },
  glo: { c: "경기", lv: 2, f: "pair", q: "두 팀 득점 합이 가장 낮은 경기는?", fx: "CLE OKC" },
  gcl: { c: "경기", lv: 3, f: "pair", q: "점수 차가 가장 적은 경기는?", fx: "MIL BOS" },
  npts: { c: "숫자", lv: 3, f: "num", q: "오늘 득점 1위 선수는 몇 점을 넣을까?", fx: "38" },
  nast: { c: "숫자", lv: 3, f: "num", q: "오늘 어시스트 1위 선수의 어시스트 개수는?", fx: "13" },
  nreb: { c: "숫자", lv: 3, f: "num", q: "오늘 리바운드 1위 선수의 리바운드 개수는?", fx: "16" },
  nthi: { c: "숫자", lv: 3, f: "num", q: "오늘 득점 1위 팀의 득점은?", fx: "132" },
  ntlo: { c: "숫자", lv: 3, f: "num", q: "오늘 득점 꼴찌 팀의 득점은?", fx: "95" },
  nmar: { c: "숫자", lv: 3, f: "num", q: "오늘 가장 큰 점수 차는 몇 점?", fx: "24" },
  ngame: { c: "숫자", lv: 3, f: "num", q: "두 팀 득점 합이 가장 높은 경기의 합계 점수는?", fx: "251" } };
const DEFAULT_QS = ["pts", "ast", "ghi", "tlo", "reb"];
const buildQuiz = qd => ((qd && qd.qs && qd.qs.length === 5) ? qd.qs : DEFAULT_QS).map((k, i) => { const b = BANK[k] || BANK[DEFAULT_QS[i]]; return Object.assign({ id: i + 1, key: k, pts: RULE.qpts }, F[b.f], b); });
let QUIZ = buildQuiz(null);
const MAXP = RULE.qpts * 5 + RULE.bonus + RULE.part;
const DAY = 86400e3;

/* 카카오톡 인앱 브라우저에서는 구글 로그인이 막혀서 외부 브라우저로 넘김 */
const UA = navigator.userAgent || "";
if (/KAKAOTALK/i.test(UA)) { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href); }
const IN_APP = /Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|DaumApps|everytimeApp|; wv\)/i.test(UA);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- 유틸 ---------- */
const fmt = n => Number(n || 0).toLocaleString("ko-KR");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const kst = d => new Date((d || new Date()).getTime() + 9 * 3600e3);
const pad = n => String(n).padStart(2, "0");
const dateKey = d => { const k = kst(d); return k.getUTCFullYear() + "-" + pad(k.getUTCMonth() + 1) + "-" + pad(k.getUTCDate()); };
const monthKey = d => dateKey(d).slice(0, 7);
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const dLabel = key => { if (!key) return ""; const [y, m, d] = key.split("-").map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return m + "월 " + d + "일(" + WD[w] + ")"; };
const toDate = t => t ? (t.toDate ? t.toDate() : new Date(t)) : null;
const hhmm = t => { const d = toDate(t); if (!d) return ""; const k = kst(d); return pad(k.getUTCHours()) + ":" + pad(k.getUTCMinutes()); };
const norm = s => String(s || "").toLowerCase().replace(/[\s_\-.·°º˚'"!@#~^*()\[\]]/g, "");
const qById = id => QUIZ.find(x => x.id === +id);
const deacc = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/ø/g, "o").replace(/Ø/g, "O").replace(/ł/g, "l").replace(/Ł/g, "L").replace(/ß/g, "ss");
const fmtOk = (q, a) => q.re.test(deacc(a).trim());
function canon(q, v) {
  v = deacc(v).trim().toLowerCase().replace(/\s+/g, " ");
  if (q.pair) return v.split(" ").sort().join(" ");
  if (q.num) return String(parseInt(v, 10));
  if (q.name) return v.replace(/['.]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").replace(/ (jr|sr|ii|iii|iv)$/, "").trim();
  return v;
}
function isRight(id, ans, keyStr) {
  const q = qById(id); if (!q || !fmtOk(q, ans)) return false; const a = canon(q, ans);
  return String(keyStr || "").split(",").some(k => k.trim() && canon(q, k) === a);
}
function lev(a, b) { const m = a.length, n = b.length, d = []; for (let i = 0; i <= m; i++) d[i] = [i]; for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function matchNick(league, nick) {
  const list = S.rosters[league] || []; if (!list.length) return { k: "no", t: "명단 미등록", mgr: "" };
  const nn = norm(nick); let best = null, bd = 99, bm = "", bt = "";
  list.forEach(e => [e.team, e.mgr].forEach(n => { if (!n) return; const dd = lev(nn, norm(n)); if (dd < bd) { bd = dd; best = n; bm = e.mgr || ""; bt = e.team || ""; } }));
  const who = bm ? " · 팀 " + bt + " / 매니저 " + bm : "";
  if (bd === 0) return { k: "ok", t: (best === nick ? "명단 일치" : "일치 · 표기 차이") + who, mgr: bm };
  const sim = 1 - bd / Math.max(nn.length, norm(best).length, 1);
  if (bd <= 2 && sim >= 0.6) return { k: "near", t: "유사 · " + best + "?" + who, mgr: bm };
  return { k: "no", t: "명단에 없음", mgr: "" };
}
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector('script[src="' + src + '"]')) return res(); const el = document.createElement("script"); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }

/* ---------- 상태 ---------- */
const S = { user: null, me: undefined, isAdmin: false, quiz: null, prev: null, ans: null, tab: "home", room: 0, admTab: "dash", rankTab: "pts", rankMonth: "",
  profiles: null, ledger: [], exchanges: [], chat: [], rosters: {}, waitUsers: [], waitEx: [], okEx: [], drafts: {}, keyDraft: {}, revealed: {}, busy: false, rosterSel: LEAGUES[0], pick: DEFAULT_QS.slice(), autoInfo: {}, autoMsg: "", members: null, memQ: "", memF: "all", allProfiles: [], rosterUpload: null };
let unsubMe = null, unsubAns = null, unsubChat = null;
const approved = () => !!(S.me && S.me.status === "ok");

/* ---------- 데이터 연결 ---------- */
getRedirectResult(auth).catch(() => {});
onAuthStateChanged(auth, u => {
  S.user = u; S.isAdmin = !!(u && ADMINS.includes(u.email)); S.me = u ? undefined : null;
  if (unsubMe) { unsubMe(); unsubMe = null; }
  if (u) {
    unsubMe = onSnapshot(doc(db, "users", u.uid), s => { S.me = s.exists() ? s.data() : null; render(true); }, () => { S.me = null; render(true); });
    if (S.isAdmin) { S.tab = "admin"; loadAdmin(); }
  }
  watchAnswers(); render();
});
onSnapshot(query(collection(db, "quizzes"), orderBy("date", "desc"), limit(2)), s => {
  const list = s.docs.map(d => d.data()); S.quiz = list[0] || null; S.prev = list[1] || null; QUIZ = buildQuiz(S.quiz); watchAnswers(); render(true);
});
function watchAnswers() {
  if (unsubAns) { unsubAns(); unsubAns = null; } S.ans = null;
  if (!S.user || !S.quiz) return;
  unsubAns = onSnapshot(doc(db, "answers", S.quiz.date + "_" + S.user.uid), s => { S.ans = s.exists() ? s.data() : null; render(true); }, () => {});
}
function watchChat() {
  if (unsubChat) { unsubChat(); unsubChat = null; } S.chat = [];
  if (!S.room || !S.quiz) return;
  unsubChat = onSnapshot(query(collection(db, "chats", S.quiz.date + "_" + S.room, "msgs"), orderBy("at", "asc"), limit(200)), s => {
    S.chat = s.docs.map(d => d.data()); if (S.tab === "chat") render(true); window.scrollTo(0, document.body.scrollHeight);
  }, () => { S.chat = []; render(true); });
}
async function loadWallet() {
  if (!S.user) return;
  try {
    const [l, e] = await Promise.all([getDocs(query(collection(db, "ledger"), where("uid", "==", S.user.uid), limit(200))),
                                      getDocs(query(collection(db, "exchanges"), where("uid", "==", S.user.uid), limit(100)))]);
    S.ledger = l.docs.map(d => d.data()).sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0));
    S.exchanges = e.docs.map(d => d.data()).sort((a, b) => (toDate(b.at) || 0) - (toDate(a.at) || 0));
  } catch (err) { console.warn(err); }
  render(true);
}
async function loadProfiles() {
  if (!S.user) return;
  try { const s = await getDocs(collection(db, "profiles")); S.profiles = s.docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { S.profiles = []; }
  render(true);
}
async function loadAdmin() {
  if (!S.isAdmin) return;
  try {
    const [u, x, ok, r, pf] = await Promise.all([
      getDocs(query(collection(db, "users"), where("status", "==", "wait"))),
      getDocs(query(collection(db, "exchanges"), where("status", "==", "wait"))),
      getDocs(query(collection(db, "exchanges"), where("status", "==", "ok"))),
      getDocs(collection(db, "rosters")), getDocs(collection(db, "profiles"))]);
    S.waitUsers = u.docs.map(d => ({ id: d.id, ...d.data() }));
    S.waitEx = x.docs.map(d => ({ id: d.id, ...d.data() }));
    S.okEx = ok.docs.map(d => d.data());
    S.rosters = {}; r.docs.forEach(d => { const v = d.data(); S.rosters[v.league] = v.teams || (v.nicks || []).map(n => ({ team: n, mgr: "" })); });
    S.allProfiles = pf.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { toast("관리자 데이터를 못 불러왔어요: " + (e.code || e.message)); }
  render(true);
}

/* ---------- 아이콘·탭 ---------- */
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5.5c3 3 3 10 0 13M18 5.5c-3 3-3 10 0 13"/></svg>',
  rank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-6h4v6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/></svg>',
  notice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9c1.5 1.5 1.5 4.5 0 6"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="8" r="4"/><path d="M3 20c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6"/></svg>' };
function tabsFor() {
  if (S.isAdmin) return [["admin", "운영"], ["home", "퀴즈"], ["chat", "채팅"], ["rank", "순위"], approved() ? ["wallet", "포인트"] : ["join", "가입"], ["notice", "공지"]];
  if (approved()) return [["home", "퀴즈"], ["rank", "순위"], ["chat", "채팅"], ["wallet", "포인트"], ["notice", "공지"]];
  return [["home", "퀴즈"], ["rank", "순위"], ["chat", "채팅"], ["join", S.user ? "가입" : "로그인"], ["notice", "공지"]];
}
function renderTabs() {
  const ts = tabsFor(); if (!ts.some(t => t[0] === S.tab)) S.tab = ts[0][0];
  const unsub = S.quiz && quizOpen() && approved() && QUIZ.some(q => !(S.ans && S.ans.sub && S.ans.sub[q.id]));
  document.getElementById("tabs").innerHTML = ts.map(t => {
    const dot = (t[0] === "home" && unsub) || (t[0] === "admin" && (S.waitUsers.length + S.waitEx.length) > 0);
    return '<button data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + ICON[t[0]] + '<span>' + t[1] + '</span>' + (dot ? '<i class="dot"></i>' : '') + '</button>'; }).join("");
  const hp = document.getElementById("hdr-pts");
  if (approved()) { hp.hidden = false; hp.innerHTML = '<span class="num">' + fmt(S.me.points) + '</span> P'; hp.dataset.go = "wallet"; }
  else if (!S.user) { hp.hidden = false; hp.textContent = "로그인"; hp.dataset.go = "join"; }
  else hp.hidden = true;
}

/* ---------- 공통 블록 ---------- */
const quizOpen = () => !!(S.quiz && toDate(S.quiz.deadline) > new Date());
const gradedCount = () => S.quiz ? Object.keys(S.quiz.graded || {}).length : 0;
function statusBanner() {
  if (S.user === null || (!S.user)) return '<div class="notice info"><p><b>구글 계정으로 시작해요</b>KB Leopards 리그원과 지인만 참여할 수 있어요. 로그인 후 가입 신청을 해주세요.</p></div><button class="btn pri" data-login>Google로 시작하기</button>';
  if (S.me === undefined) return '<p class="sub">불러오는 중…</p>';
  if (S.me === null) return '<div class="notice info"><p><b>가입 신청을 마쳐주세요</b>리그와 판타지 앱 닉네임을 알려주시면 운영자가 확인 후 승인해요.</p></div><button class="btn pri" data-go="join">가입 신청하기</button>';
  if (S.me && S.me.status === "wait") return '<div class="notice warn"><p><b>승인 대기 중</b>운영자가 리그 명단과 닉네임을 확인하고 있어요. 보통 하루 안에 처리돼요.</p></div>';
  if (S.me && S.me.status === "no") return '<div class="notice warn"><p><b>가입이 승인되지 않았어요</b>궁금한 점은 카톡으로 문의해 주세요.</p></div><a class="btn kakao" href="' + KAKAO + '" target="_blank" rel="noopener">카카오톡 문의하기</a>';
  return "";
}

/* ---------- HOME ---------- */
function hintHtml(q, v, editable) { const t = esc(q.rule); if (String(v || "").trim() && !fmtOk(q, v)) return '<b class="badfmt">형식이 달라요. 이대로 내면 오답 처리돼요 · ' + t + '</b>'; return '형식: ' + t + (editable ? ' · 마감 전까지 수정 가능' : ''); }
function earnedToday() { if (!S.ans) return 0; let p = (S.quiz && S.quiz.partPaid && S.ans.sub && QUIZ.every(x => S.ans.sub[x.id])) ? RULE.part : 0; if (!S.ans.res) return p; QUIZ.forEach(q => { if (S.ans.res[q.id]) p += q.pts; }); if (QUIZ.every(q => S.ans.res[q.id])) p += RULE.bonus; return p; }
function vHome() {
  const Q = S.quiz, banner = statusBanner();
  if (!Q) return '<section class="board"><div class="board-top"><span class="d">다음 퀴즈</span><span class="pill done">준비 중</span></div><div class="led">READY</div><div class="led-cap">다음 경기 퀴즈는 전날 밤 9시쯤 열려요 (한국시간)</div></section>' + banner;
  const open = quizOpen(), nG = gradedCount(), all = nG === QUIZ.length;
  let h = '<section class="board" aria-label="오늘의 퀴즈 전광판"><div class="board-top"><span class="d">' + dLabel(Q.date) + ' 경기 퀴즈</span>' +
    (all ? '<span class="pill done">결과 발표</span>' : open ? '<span class="pill live">참여 가능</span>' : '<span class="pill done">마감 · 채점 중</span>') + '</div>';
  if (all) h += '<div class="led">+' + earnedToday() + 'P</div><div class="led-cap">5문항 정답 확정 완료</div>';
  else if (open) h += '<div class="led" id="cd">--:--:--</div><div class="led-cap">첫 경기 ' + hhmm(Q.deadline) + ' 팁오프 전까지 문항별로 제출 (한국시간)</div>';
  else h += '<div class="led">' + nG + '/5</div><div class="led-cap">정답 확정된 문항 · 경기 끝나는 대로 채점해요</div>';
  if (Q.games && Q.games.length) h += '<div class="games">' + Q.games.map(g => '<div class="game"><span>' + esc(g.a) + ' <span class="t">vs</span> ' + esc(g.h) + '</span><span class="t">' + esc(g.t || "") + '</span></div>').join("") + '</div>';
  h += '</section><div class="rulebar"><span class="tag">5문항 다 내면 +' + RULE.part + 'P</span><span class="tag">정답 1개당 ' + RULE.qpts + 'P</span><span class="tag gold">5개 모두 정답 +' + RULE.bonus + 'P</span><span class="tag">하루 최대 ' + MAXP + 'P</span><span class="tag">오답 감점 없음</span></div>' + banner;
  const can = approved() && open;
  if (can) { const nS = QUIZ.filter(q => S.ans && S.ans.sub && S.ans.sub[q.id]).length; h += '<div class="notice info"><p><b>제출 ' + nS + ' / 5</b>푼 문항만 먼저 내도 돼요. 낸 문항의 채팅방이 바로 열려요.</p></div>'; }
  QUIZ.forEach((q, i) => {
    const subd = !!(S.ans && S.ans.sub && S.ans.sub[q.id]), saved = S.ans && S.ans.a ? (S.ans.a[q.id] || "") : "";
    const sel = S.drafts[q.id] != null ? S.drafts[q.id] : saved, graded = !!(Q.graded && Q.graded[q.id]);
    let foot = "";
    if (graded) { const ok = !!(S.ans && S.ans.res && S.ans.res[q.id]); foot = '<div class="res ' + (ok ? 'y' : 'n') + '"><span>' + (ok ? '정답 +' + q.pts + 'P' : (subd ? '오답' : '미제출')) + '</span><div>' + (subd ? '내 답 <b>' + esc(saved) + '</b><br>' : '') + '정답 <b>' + esc(String(Q.keys[q.id] || "").split(",")[0]) + '</b></div></div>'; }
    else if (can) { const dirty = subd && saved !== sel.trim(); foot = '<div class="q-act"><button class="btn sm ' + (subd && !dirty ? 'line' : 'pri') + '" data-sub="' + q.id + '"' + (sel.trim() ? '' : ' disabled') + '>' + (subd ? (dirty ? '수정 제출' : '제출 완료 ✓') : '제출') + '</button></div>'; }
    const room = S.isAdmin || (approved() && subd);
    h += '<article class="card q"><div class="q-head"><span class="q-no">' + (i + 1) + '</span><span class="q-pts">+' + q.pts + 'P</span></div><label class="q-text" for="a-' + q.id + '">' + esc(q.q) + ' <span class="fx">(예: ' + esc(q.fx) + ')</span></label>' +
      '<input class="ans" id="a-' + q.id + '" data-ans="' + q.id + '" value="' + esc(sel) + '" placeholder="' + esc(q.fx) + '" maxlength="40" autocomplete="off" spellcheck="false" enterkeyhint="done"' + (can && !graded ? '' : ' disabled') + '><span class="hint" id="h-' + q.id + '">' + hintHtml(q, sel, subd && can) + '</span>' + foot +
      '<button class="room-link' + (room ? '' : ' locked') + '" data-room="' + q.id + '"' + (room ? '' : ' disabled') + '>' + ICON.chat + '<span>' + (i + 1) + '번 채팅방</span><em>' + (room ? '입장' : '제출 후 입장') + '</em></button></article>';
  });
  if (S.prev && S.prev.graded && Object.keys(S.prev.graded).length) {
    h += '<section class="card"><div class="sect-h"><h3>지난 퀴즈 결과</h3><span class="sub">' + dLabel(S.prev.date) + '</span></div><div class="tbl-wrap"><table><thead><tr><th>문항</th><th>정답</th><th class="r">정답률</th></tr></thead><tbody>' +
      buildQuiz(S.prev).map((q, i) => { const st = (S.prev.stats || {})[q.id] || {}; const rate = st.sub ? Math.round(st.right / st.sub * 100) + "%" : "-";
        return '<tr><td>' + esc(q.q.replace(/^오늘(의)? /, "").replace(/\?$/, "")) + '</td><td><b>' + esc(String((S.prev.keys || {})[q.id] || "-").split(",")[0]) + '</b></td><td class="r num">' + rate + '</td></tr>'; }).join("") + '</tbody></table></div></section>';
  }
  return h;
}

/* ---------- RANK ---------- */
const mKey = mk => "k" + mk.replace("-", "");
const mLabel = mk => mk.slice(0, 4) + "년 " + Number(mk.slice(5)) + "월";
function vRank() {
  if (!S.user) return '<h2>순위</h2>' + statusBanner();
  if (S.profiles === null) { loadProfiles(); return '<h2>순위</h2><p class="sub">불러오는 중…</p>'; }
  const cur = monthKey(), months = new Set([cur]);
  S.profiles.forEach(p => Object.keys(p.m || {}).forEach(k => months.add(k.slice(1, 5) + "-" + k.slice(5))));
  const list = [...months].sort().reverse(); if (!S.rankMonth || !months.has(S.rankMonth)) S.rankMonth = cur;
  const k = mKey(S.rankMonth), byRight = S.rankTab === "right";
  const rows = S.profiles.map(p => ({ id: p.id, nick: p.nick, league: p.league, st: (p.m || {})[k] || {} })).filter(r => r.st.a || r.st.p)
    .sort((a, b) => byRight ? ((b.st.r || 0) - (a.st.r || 0) || (b.st.p || 0) - (a.st.p || 0)) : ((b.st.p || 0) - (a.st.p || 0) || (b.st.r || 0) - (a.st.r || 0)));
  let h = '<div class="sect-h"><h2>순위</h2><select id="rk-m" class="msel" aria-label="월 선택">' + list.map(m => '<option value="' + m + '"' + (m === S.rankMonth ? ' selected' : '') + '>' + mLabel(m) + '</option>').join("") + '</select></div>' +
    '<div class="seg" role="group"><button data-rt="pts" aria-pressed="' + !byRight + '">포인트 순위</button><button data-rt="right" aria-pressed="' + byRight + '">정답 횟수 순위</button></div>';
  h += rows.length ? '<section class="card" style="padding:8px 12px"><div class="rank-list">' + rows.slice(0, 50).map((r, i) => { const me = S.user && r.id === S.user.uid;
    return '<div class="rk' + (i < 3 ? ' top' : '') + (me ? ' me' : '') + '"><span class="n">' + (i + 1) + '</span><div class="who"><b>' + esc(r.nick) + (me ? ' (나)' : '') + '</b><small>' + esc(r.league) + ' · 제출 ' + (r.st.a || 0) + '문항</small></div><span class="p">' +
      (byRight ? fmt(r.st.r || 0) + '<small style="font-size:12px;color:var(--muted)"> 개</small>' : fmt(r.st.p || 0) + '<small style="font-size:12px;color:var(--muted)"> P</small>') + '</span></div>'; }).join("") + '</div></section>'
    : '<p class="empty">' + mLabel(S.rankMonth) + ' 첫 채점이 끝나면 순위가 나와요</p>';
  h += '<p class="sub">' + (byRight ? '그달 맞힌 문항 수 기준. 같으면 포인트가 높은 순.' : '그달 획득 포인트 기준. 교환해도 순위 점수는 줄지 않아요.') + '</p>';
  return h;
}

/* ---------- CHAT ---------- */
function canRoom(id) { return S.isAdmin || (approved() && S.ans && S.ans.sub && S.ans.sub[id]); }
function vChat() {
  if (!S.quiz) return '<h2>문항별 채팅방</h2><p class="empty">퀴즈가 열리면 채팅방도 열려요</p>';
  if (S.room && canRoom(S.room)) {
    const q = qById(S.room), i = QUIZ.indexOf(q), me = S.user && S.user.uid;
    let h = '<div class="room-top"><button class="btn line sm" data-room="0" aria-label="채팅방 목록">← 목록</button><div style="min-width:0"><b>' + (i + 1) + '번 채팅방</b><p class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(q.q) + '</p></div></div><div class="chat"><div class="sys">이 문항을 제출한 사람만 있어요 · 욕설·도배·광고 금지</div>';
    if (!S.chat.length) h += '<p class="empty">첫 메시지를 남겨보세요</p>';
    S.chat.forEach(c => { const mine = c.uid === me;
      h += '<div class="msg' + (mine ? ' mine' : '') + '"><span class="meta">' + (mine ? '나' : esc(c.nick) + '<em>' + esc(c.league) + '</em>') + ' · ' + hhmm(c.at) + '</span><div class="bub">' + esc(c.m) + '</div></div>'; });
    return h + '</div><div style="height:60px"></div>';
  }
  let h = '<div class="sect-h"><h2>문항별 채팅방</h2><span class="sub">' + dLabel(S.quiz.date) + '</span></div><p class="sub">채팅방은 문항마다 따로 있어요. 그 문항을 제출해야 들어갈 수 있어서, 아직 안 낸 사람에게 정답이 새지 않아요.</p>';
  QUIZ.forEach((q, i) => { const ok = canRoom(q.id);
    h += '<button class="card room' + (ok ? '' : ' locked') + '" data-room="' + q.id + '"' + (ok ? '' : ' disabled') + '><span class="q-no">' + (i + 1) + '</span><span class="rinfo"><b>' + esc(q.q) + '</b><small>' + (ok ? '들어가서 이야기 나누기' : '이 문항을 제출하면 열려요') + '</small></span><em>' + (ok ? '입장' : '잠김') + '</em></button>'; });
  return h + (approved() || S.isAdmin ? '' : statusBanner());
}
const composer = () => S.tab === "chat" && S.room && canRoom(S.room) ? '<form class="composer" id="cform"><div class="wrap"><input id="cin" maxlength="200" placeholder="메시지 입력" autocomplete="off" aria-label="메시지"><button>보내기</button></div></form>' : '';

/* ---------- WALLET ---------- */
function vWallet() {
  if (!approved()) return statusBanner();
  const mk = monthKey(), days = Math.floor((Date.now() - (toDate(S.me.createdAt) || new Date())) / DAY);
  const monthP = S.ledger.filter(l => toDate(l.at) && monthKey(toDate(l.at)) === mk && l.p > 0).reduce((t, l) => t + l.p, 0);
  const used = S.exchanges.filter(x => toDate(x.at) && monthKey(toDate(x.at)) === mk && x.status !== "no").length;
  const nxt = RULE.tiers.find(t => t.pts > S.me.points);
  let h = '<section class="wallet-hero"><span class="label" style="color:#CFC3EE">보유 포인트</span><div class="big">' + fmt(S.me.points) + '<small>P</small></div><div class="stats"><div class="stat"><span>이번 달 적립</span><b>' + fmt(monthP) + 'P</b></div><div class="stat"><span>이번 달 내 교환</span><b>' + used + '회</b></div></div>' +
    (nxt ? '<div class="gauge" aria-label="다음 교환까지"><i style="width:' + Math.min(100, S.me.points / nxt.pts * 100) + '%"></i></div><span style="font-size:12px;color:#CFC3EE">「' + nxt.name + '」(' + fmt(nxt.won) + '원)까지 ' + fmt(nxt.pts - S.me.points) + 'P 남았어요</span>' : '<span style="font-size:12px;color:#CFC3EE">모든 교환이 가능해요</span>') + '</section><h3>기프티콘 교환</h3>';
  RULE.tiers.forEach(t => {
    let why = ""; if (days < RULE.minDays) why = "가입 " + RULE.minDays + "일 후부터 교환 가능"; else if (S.me.points < t.pts) why = fmt(t.pts - S.me.points) + "P 더 모으면 교환 가능";
    h += '<article class="card tier"><div class="badge ' + t.id + '">' + fmt(t.pts) + '<br>P</div><div class="info"><b>' + t.name + '</b><span>' + t.desc + '</span></div><div class="act"><button class="btn ' + (why ? 'line' : 'gold') + '" data-tier="' + t.id + '"' + (why ? ' disabled' : '') + '>' + (why || '교환 신청하기') + '</button></div></article>';
  });
  h += '<section class="card"><h3 style="margin-bottom:10px">교환 조건</h3><ul class="cond">' + cond(true, "운영자 승인이 끝난 회원") + cond(days >= RULE.minDays, "가입 후 " + RULE.minDays + "일 경과 (현재 " + days + "일)") + cond(true, "교환 횟수 제한 없음 · 모은 만큼 교환") + '</ul><p class="sub" style="margin-top:10px">포인트는 유효기간 없이 계속 쌓여요.</p></section>';
  h += '<section class="card"><h3>교환 내역</h3><div class="hist">' + (S.exchanges.length ? S.exchanges.map(x => '<div class="h"><div><b class="num">' + esc(x.code) + '</b><small>' + (x.tier === "s" ? "모았다가 한번에!" : "바로 써버리기~") + ' · ' + fmt(x.won) + '원 상당</small></div><span class="st ' + x.status + '">' + ({ wait: "발송 대기", ok: "발송 완료", no: "반려 · 환불" })[x.status] + '</span></div>').join("") : '<p class="empty">아직 교환 내역이 없어요</p>') + '</div></section>';
  h += '<section class="card"><h3>적립 내역</h3><div class="hist">' + (S.ledger.length ? S.ledger.slice(0, 40).map(l => '<div class="h"><div>' + esc(l.t) + '</div><b class="num" style="color:var(--' + (l.p >= 0 ? 'good' : 'bad') + ')">' + (l.p >= 0 ? '+' : '') + fmt(l.p) + 'P</b></div>').join("") : '<p class="empty">첫 정답이 확정되면 여기에 쌓여요</p>') + '</div></section>';
  return h;
}
const cond = (ok, t) => '<li><i class="' + (ok ? 'y' : 'n') + '">' + (ok ? '✓' : '✕') + '</i><span>' + t + '</span></li>';

/* ---------- NOTICE ---------- */
const NOTICES = [
  { pin: 1, t: "운영자 안내 말씀", b: '<p>「NBA 오늘의 퀴즈는?」은 KB Leopards와 함께 판타지 리그를 하는 분들과 NBA를 더 재미있게 보고 싶어서, 운영자 개인이 비영리로 만든 사이트입니다.</p><p>운영자는 전문 개발자가 아니어서 사이트 오류나 설정 실수가 생길 수 있습니다. 문제가 생기면 최대한 빨리 바로잡겠습니다. 처리에 시간이 조금 걸리더라도 너그러운 양해 부탁드립니다.</p><p><b>다만 포인트 적립·차감·교환 기록만큼은 빠짐없이 철저하게 관리하겠습니다.</b> 오류로 포인트가 잘못 반영된 경우에도 기록을 확인해 정확히 바로잡아 드립니다.</p><p>함께해 주셔서 감사합니다.</p>' },
  { t: "참여 방법과 하루 일정", b: '<dl class="kv"><dt>밤 9시쯤</dt><dd>다음 날 경기 퀴즈 공개 (한국시간)</dd><dt>첫 경기 전</dt><dd>문항마다 따로 답을 적어 제출. 마감 전까지 수정 가능</dd><dt>제출 후</dt><dd>그 문항의 채팅방 입장 가능 (문항마다 채팅방이 따로 있어요)</dd><dt>경기 종료 후</dt><dd>운영자가 공식 기록으로 문항별 정답 확정, 포인트 바로 지급</dd></dl><p class="sub">경기가 없는 날은 퀴즈가 쉬어요.</p>' },
  { t: "포인트 규정", b: '<ul><li>그날 5문항을 모두 제출하면 참여 포인트 +' + RULE.part + 'P (맞든 틀리든)</li><li>정답 1개당 ' + RULE.qpts + 'P, 모든 문항 같아요</li><li>문항마다 따로 제출하고, 문항마다 따로 채점해요</li><li>5문항 모두 정답이면 보너스 +' + RULE.bonus + 'P (하루 최대 ' + MAXP + 'P)</li><li>오답·미제출 감점 없음</li><li><b>답은 문제 옆 괄호의 형식 그대로 영어로 적어주세요. 형식이 다르면 오답 처리돼요</b></li><li>선수: 영문 풀네임, 이름 성 순서 (예: Victor Wembanyama) · 팀: 영문 약자 (예: UTA) · 경기: 두 팀 약자 띄어쓰기 (예: POR SAS) · 숫자: 아라비아 숫자만 (예: 38)</li><li>숫자 문제는 실제 기록과 가장 가까운 사람이 정답이에요. 차이가 같으면 모두 정답</li><li>문제 유형은 날마다 바뀌어요. 경기가 적은 날은 조금 어려운 문제가 나올 수 있어요</li><li>대소문자, 마침표·아포스트로피(De&#39;Aaron = DeAaron), 하이픈(Gilgeous-Alexander), Jr.·III 같은 접미사 유무는 구분하지 않아요. 철자가 틀리거나 성만 적으면 오답이에요</li><li>공동 1위는 해당 선수 모두 정답 처리</li><li>경기 취소·연기로 정답을 정할 수 없는 문항은 전원 정답 처리</li><li>기록 정정이 있어도 정답 확정 시점의 공식 기록 기준</li><li>운영 상황에 따라 문항 포인트는 조정될 수 있어요. 바뀌면 미리 공지하고, 이미 쌓인 포인트는 그대로 유지돼요</li></ul>' },
  { t: "기프티콘 교환 규정", b: '<dl class="kv"><dt>바로 써버리기~</dt><dd>2,000P → 2,000원 상당</dd><dt>모았다가 한번에!</dt><dd>5,000P → 5,000원 상당</dd><dt>횟수</dt><dd>제한 없음. 모은 포인트만큼 교환할 수 있어요</dd><dt>적립 한도</dt><dd>하루 최대 130P라, 한 달 매일 참여해서 전부 맞혀도 최대 4,030P예요</dd><dt>조건</dt><dd>승인 회원 · 가입 14일 경과</dd></dl><p><b>교환 절차</b></p><ul><li>포인트 탭에서 교환 신청 → 교환 코드 발급 (포인트 바로 차감)</li><li>카톡 문의방에 닉네임과 교환 코드 전송</li><li>운영자가 코드 확인 후 기프티콘 발송</li><li>반려 시 포인트 전액 환불</li></ul><p class="sub">운영 상황에 따라 교환 기준 포인트와 기프티콘 종류는 조정될 수 있어요. 바뀌면 미리 공지하고, 이미 쌓인 포인트는 그대로 유지돼요.</p>' },
  { t: "가입 · 중복 가입 규정", b: '<ul><li>구글 계정으로 로그인한 뒤 가입 신청해요</li><li>KB Leopards와 같은 리그를 하는 리그원, 리그원이 초대한 지인만 가입할 수 있어요</li><li>리그원은 판타지 앱 안의 닉네임을 그대로 적어주세요. 운영자가 리그 명단과 대조해 승인해요</li><li>지인은 초대한 리그원의 리그와 닉네임을 적어주세요</li><li>1인 1계정. 여러 리그에 있어도 계정은 하나만</li><li>한 연락처로는 한 계정만 가입할 수 있어요</li><li>중복·부정 참여가 확인되면 포인트가 회수되고 이용이 제한돼요</li></ul>' },
  { t: "개인정보 안내", b: '<dl class="kv"><dt>수집 항목</dt><dd>이름, 연락처, 리그, 닉네임, 구글 계정 이메일</dd><dt>이용 목적</dt><dd>가입 확인, 중복 가입 방지, 기프티콘 발송</dd><dt>보관</dt><dd>탈퇴 요청 시 즉시 삭제</dd><dt>공개 범위</dt><dd>다른 참여자에게는 닉네임과 리그만 보여요</dd></dl>' },
  { t: "자주 묻는 질문", b: '<p><b>참가비가 있나요?</b><br>없어요. 기프티콘은 운영자가 사비로 준비합니다.</p><p><b>포인트에 유효기간이 있나요?</b><br>없어요. 모은 포인트는 언제든 교환할 수 있어요.</p><p><b>카카오톡에서 링크를 열었는데 로그인이 안 돼요.</b><br>카톡 안의 브라우저에서는 구글 로그인이 막혀 있어요. 크롬이나 삼성 인터넷으로 열어주세요.</p><p><b>정답이 이상해요.</b><br>카톡 문의방에 문항 번호와 근거 기록을 보내주세요. 확인 후 바로잡아 드려요.</p>' }];
function vNotice() {
  return '<h2>공지사항</h2>' + NOTICES.map((n, i) => '<details' + (i === 0 ? ' open' : '') + '><summary><span class="nt' + (n.pin ? ' pin' : '') + '">' + (n.pin ? '필독' : '공지') + '</span>' + n.t + '</summary><div class="nbody">' + n.b + '</div></details>').join("") +
    '<section class="card contact"><h3>문의 · 포인트 교환</h3><p class="sub">사이트 문의와 기프티콘 교환은 카카오톡 1:1 오픈채팅으로 받아요.</p><p class="sub">운영을 응원하고 싶으시면 후원도 여기로 문의해 주세요.</p><a class="btn kakao" href="' + KAKAO + '" target="_blank" rel="noopener">카카오톡 문의하기</a><div class="qr"><div id="qrbox" aria-label="오픈채팅 QR"></div><div><p class="sub" style="margin-bottom:6px">PC에서는 휴대폰으로 QR을 찍어주세요</p><span class="url">' + KAKAO + '</span></div></div></section>' +
    (S.user ? '<section class="card"><p class="sub">' + esc(S.user.email) + ' 로 로그인 중</p><button class="btn line" data-logout style="margin-top:10px">로그아웃</button></section>' : '');
}

/* ---------- JOIN ---------- */
let J = { type: "리그원", err: {} };
function vJoin() {
  if (!S.user) return '<h2>로그인</h2>' + (IN_APP ? '<div class="notice warn"><p><b>앱 안 브라우저에서는 구글 로그인이 막혀요</b>오른쪽 위 메뉴에서 "다른 브라우저로 열기"를 눌러 크롬이나 삼성 인터넷으로 열어주세요.</p></div>' : '') + statusBanner();
  if (S.me) return statusBanner() || '<p class="sub">가입이 완료됐어요.</p>';
  if (S.me === undefined) return '<p class="sub">불러오는 중…</p>';
  const e = J.err, opts = LEAGUES.map(l => '<option>' + esc(l) + '</option>').join("");
  const f = (id, label, inner, help) => '<div class="field' + (e[id] ? ' bad' : '') + '"><label for="' + id + '">' + label + '</label>' + inner + (help ? '<span class="help">' + help + '</span>' : '') + (e[id] ? '<span class="err">' + e[id] + '</span>' : '') + '</div>';
  let h = '<h2>가입 신청</h2><p class="sub">' + esc(S.user.email) + ' 계정으로 신청해요. KB Leopards 리그원과 리그원이 초대한 지인만 가입할 수 있어요.</p><form class="form card" id="jform" novalidate>' +
    '<div class="field"><label>구분</label><div class="typesel"><button type="button" data-jt="리그원" aria-pressed="' + (J.type === "리그원") + '"><b>리그원</b><span>KB Leopards와 같은 리그</span></button><button type="button" data-jt="지인" aria-pressed="' + (J.type === "지인") + '"><b>지인</b><span>리그원이 초대</span></button></div></div>' +
    f("j-name", "이름", '<input id="j-name" autocomplete="name" placeholder="홍길동" maxlength="20">', "기프티콘 발송 확인용이에요. 다른 사람에게 안 보여요") +
    f("j-phone", "연락처", '<input id="j-phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" maxlength="13">', "한 연락처당 한 계정만 가입할 수 있어요");
  if (J.type === "리그원") h += f("j-league", "리그 선택", '<select id="j-league"><option value="">리그를 골라주세요</option>' + opts + '</select>', "여러 리그에 있으면 하나만 골라주세요") +
    f("j-nick", "판타지 앱 닉네임", '<input id="j-nick" placeholder="앱에 보이는 그대로" maxlength="20">', "야후 판타지의 팀 이름이나 매니저 이름을 그대로 적어주세요. 특수문자가 있으면 비슷하게 적어도 운영자가 확인해요");
  else h += '<div class="inv"><span class="label">초대한 리그원</span>' + f("j-league", "리그원의 리그", '<select id="j-league"><option value="">리그를 골라주세요</option>' + opts + '</select>') + f("j-inv", "리그원 닉네임", '<input id="j-inv" placeholder="초대한 사람의 판타지 앱 닉네임" maxlength="20">') + '</div>' +
    f("j-nick", "내 닉네임", '<input id="j-nick" maxlength="12" placeholder="사이트에서 쓸 닉네임">', "순위표와 채팅에 보여요");
  h += '<label class="check' + (e.agree ? ' bad' : '') + '"><input type="checkbox" id="j-agree"><span>이름·연락처를 가입 확인과 기프티콘 발송에만 쓰는 데 동의해요. 탈퇴하면 바로 삭제돼요.' + (e.agree ? '<br><b style="color:var(--bad)">동의가 필요해요</b>' : '') + '</span></label>' +
    '<button class="btn pri" type="submit"' + (S.busy ? ' disabled' : '') + '>가입 신청하기</button></form>';
  return h;
}

/* ---------- ADMIN ---------- */
function pickerHtml() {
  return '<div class="field"><label>문제 고르기 <span class="sub" style="display:inline">' + S.pick.length + '/5 · 고른 순서대로 1~5번</span></label>' + CATS.map(c => '<div class="pick-cat"><span class="label">' + c + '</span><div class="pick">' +
    Object.keys(BANK).filter(k => BANK[k].c === c).map(k => { const b = BANK[k], n = S.pick.indexOf(k) + 1;
      return '<button type="button" class="pk lv' + b.lv + '" data-pick="' + k + '" aria-pressed="' + (n > 0) + '">' + (n ? '<em>' + n + '</em>' : '') + '<span>' + esc(b.q.replace(/^오늘(의)? /, "").replace(/\?$/, "")) + '</span><small>' + LV[b.lv] + '</small></button>'; }).join("") + '</div></div>').join("") +
    '<span class="help">숫자 문제는 가장 가까운 사람이 정답이에요 (차이가 같으면 모두 정답)</span></div>';
}
function vAdmin() {
  if (!S.isAdmin) return "";
  const tabs = [["dash", "현황", 0], ["quiz", "퀴즈·채점", 0], ["apps", "가입 승인", S.waitUsers.length], ["ex", "교환 처리", S.waitEx.length], ["members", "회원", 0], ["roster", "리그 명단", 0]];
  let h = '<div class="sect-h"><h2>운영자 화면</h2><button class="btn line sm" data-reload>새로고침</button></div><div class="atabs">' + tabs.map(t => '<button data-at="' + t[0] + '" aria-pressed="' + (S.admTab === t[0]) + '">' + t[1] + (t[2] ? '<em>' + t[2] + '</em>' : '') + '</button>').join("") + '</div>';
  const mk = monthKey(), sp = S.okEx.filter(x => toDate(x.at) && monthKey(toDate(x.at)) === mk).reduce((a, x) => a + x.won, 0);
  if (S.admTab === "dash") {
    h += '<div class="tiles"><div class="tile"><span>가입 승인 대기</span><b>' + S.waitUsers.length + '</b></div><div class="tile"><span>교환 발송 대기</span><b>' + S.waitEx.length + '</b></div><div class="tile"><span>이번 달 지출</span><b>' + fmt(sp) + '</b><span>원 / 기준 ' + fmt(RULE.budget) + '</span></div><div class="tile"><span>기준까지 여유</span><b>' + fmt(RULE.budget - sp) + '</b><span>원 · 운영자만 보여요</span></div></div>';
    h += '<section class="card"><h3>예산 시뮬레이터</h3><p class="sub" style="margin:4px 0 12px">인원과 정답률을 넣으면 한 달 예상 지출을 계산해요. 예산은 운영자만 보고, 참여자 화면에는 나오지 않아요.</p><div class="sim"><div class="field"><label for="s-n">활성 인원</label><input id="s-n" type="number" inputmode="numeric" value="50" min="1"></div><div class="field"><label for="s-a">평균 정답률 %</label><input id="s-a" type="number" inputmode="numeric" value="30" min="0" max="100"></div><div class="field"><label for="s-r">참여율 %</label><input id="s-r" type="number" inputmode="numeric" value="70" min="0" max="100"></div></div><div id="simout" style="margin-top:12px"></div></section>';
    h += '<section class="card"><h3>제도 설정값</h3><dl class="kv" style="margin-top:10px"><dt>교환 단가</dt><dd>1P = 1원 (바로 써버리기~ 2,000P · 모았다가 한번에! 5,000P)</dd><dt>하루 최대</dt><dd>' + MAXP + 'P</dd><dt>포인트</dt><dd>참여 10P · 정답 20P · 전부 정답 +20P</dd><dt>한 달 최대</dt><dd>28경기일 3,640P ~ 31경기일 4,030P (매일 참여·전부 정답 가정)</dd><dt>만점자 한 달</dt><dd>2,000P 교환 최대 2회 (3회는 불가)</dd><dt>설계 기준</dt><dd>활성 50명 · 정답률 30% · 참여율 70% · 28경기일 → 월 약 39,300원</dd><dt>교환 가능</dt><dd>가입 14일 후</dd></dl></section>';
  }
  if (S.admTab === "quiz") {
    const nd = new Date(Date.now() + (kst().getUTCHours() >= 12 ? DAY : 0));
    h += '<section class="card form"><h3>새 퀴즈 열기</h3><p class="sub">경기 날짜(한국시간)와 첫 경기 시작 시간을 넣으면 그 시간에 자동 마감돼요. 같은 날짜로 다시 열면 덮어써요.</p>' +
      '<div class="sim"><div class="field"><label for="qz-d">경기 날짜</label><input id="qz-d" type="date" value="' + dateKey(nd) + '"></div><div class="field"><label for="qz-t">첫 경기 시간</label><input id="qz-t" type="time" value="08:00"></div></div>' +
      '<div class="field"><label for="qz-g">경기 목록 (선택)</label><textarea id="qz-g" placeholder="CLE ORL 08:00&#10;POR SAS 08:30"></textarea><span class="help">한 줄에 "원정 홈 시간". 비워도 돼요</span></div>' + pickerHtml() + '<button class="btn pri" id="qz-open"' + (S.busy || S.pick.length !== 5 ? ' disabled' : '') + '>' + (S.pick.length === 5 ? '퀴즈 열기' : '문제 5개를 골라주세요 (' + S.pick.length + '/5)') + '</button></section>';
    if (S.quiz) {
      h += '<div class="sect-h"><h3>' + dLabel(S.quiz.date) + ' 채점</h3><span class="sub">마감 ' + hhmm(S.quiz.deadline) + (quizOpen() ? ' · 진행 중' : ' · 마감됨') + '</span></div><p class="sub">경기가 모두 끝나면 <b>정답 자동 채우기</b>를 누르세요. 박스스코어로 계산해서 칸을 채워줘요. 확인 후 문항마다 <b>확정</b>을 누르면 포인트가 나가요. 자동 채우기가 안 되면 문제 형식대로 직접 적으면 돼요 (공동 1위는 쉼표로).</p>' +
        (QUIZ.every(q => S.quiz.graded && S.quiz.graded[q.id]) ? '' : '<button class="btn pri" id="auto-fill"' + (quizOpen() || S.busy ? ' disabled' : '') + '>' + (quizOpen() ? '마감 후 자동 채우기 가능' : S.busy ? '기록 불러오는 중…' : '정답 자동 채우기') + '</button>') + (S.autoMsg ? '<div class="notice ok"><p>' + esc(S.autoMsg) + '</p></div>' : '');
      QUIZ.forEach((q, i) => { const g = S.quiz.graded && S.quiz.graded[q.id], st = (S.quiz.stats || {})[q.id] || {}, v = g ? S.quiz.keys[q.id] : (S.keyDraft[q.id] || "");
        h += '<article class="card q"><div class="q-head"><span class="q-no">' + (i + 1) + '</span>' + (g ? '<span class="st ok">확정</span>' : '<span class="st wait">미확정</span>') + '<span class="q-pts">+' + q.pts + 'P</span></div><label class="q-text" for="k-' + q.id + '">' + esc(q.q) + ' <span class="fx">(예: ' + esc(q.fx) + ')</span></label>' +
          '<input class="ans" id="k-' + q.id + '" data-keyin="' + q.id + '" value="' + esc(v) + '" placeholder="' + esc(q.fx) + (q.num ? ' (실제 기록 숫자)' : ', 공동 1위면 쉼표로') + '" autocomplete="off" spellcheck="false"' + (g ? ' disabled' : '') + '>' + (!g && S.autoInfo[q.id] ? '<span class="hint">자동 계산: ' + esc(S.autoInfo[q.id]) + '</span>' : '') +
          (g ? '<div class="res y"><span>확정</span><div>제출 ' + (st.sub || 0) + '명 · 정답 ' + (st.right || 0) + '명' + (q.num && st.gap != null ? ' · 가장 가까운 차이 ' + st.gap : '') + '</div></div>' : '<button class="btn gold sm" data-grade="' + q.id + '"' + (v.trim() && !quizOpen() && !S.busy ? '' : ' disabled') + '>' + (quizOpen() ? '마감 후 확정할 수 있어요' : '이 문항 정답 확정 · 포인트 지급') + '</button>') + '</article>'; });
    }
  }
  if (S.admTab === "apps") {
    if (!S.waitUsers.length) h += '<p class="empty">승인 대기 중인 가입 신청이 없어요</p>';
    S.waitUsers.forEach(a => { const m = a.type === "리그원" ? matchNick(a.league, a.nick) : matchNick(a.league, a.invNick), rev = S.revealed[a.id];
      const phone = rev ? a.phone : String(a.phone).replace(/(\d{3})-(\d{2})\d{1,2}-(\d{2})\d{2}/, "$1-$2**-$3**");
      let warn = "";
      if (m.mgr) {
        if (a.type === "리그원") {
          const dup = S.allProfiles.filter(p => p.mgr === m.mgr), dupW = S.waitUsers.filter(o => o.id !== a.id && o.type === "리그원" && matchNick(o.league, o.nick).mgr === m.mgr);
          if (dup.length) warn += '<div class="notice warn"><p><b>동일인 의심</b>매니저 「' + esc(m.mgr) + '」가 이미 「' + esc(dup[0].nick) + '」(' + esc(dup[0].league) + ')으로 가입돼 있어요</p></div>';
          if (dupW.length) warn += '<div class="notice warn"><p><b>대기 중 중복</b>같은 매니저의 신청이 하나 더 있어요: 「' + esc(dupW[0].nick) + '」</p></div>';
        } else {
          const n = S.allProfiles.filter(p => p.invMgr === m.mgr).length + S.waitUsers.filter(o => o.type === "지인" && matchNick(o.league, o.invNick).mgr === m.mgr).length;
          warn += '<div class="notice info"><p>이 리그원(매니저 「' + esc(m.mgr) + '」)이 초대한 지인: 이 신청 포함 ' + n + '명</p></div>';
        }
      }
      h += '<article class="card app"><div class="app-h"><b>' + esc(a.nick) + ' <span class="sub" style="display:inline">· ' + esc(a.type) + '</span></b><span class="match ' + m.k + '">' + esc(m.t) + '</span></div>' + warn +
        '<dl class="kv"><dt>이름</dt><dd>' + esc(a.name) + '</dd><dt>연락처</dt><dd><button class="mask" data-rev="' + a.id + '">' + esc(phone) + '</button></dd><dt>리그</dt><dd>' + esc(a.league) + '</dd>' + (a.type === "지인" ? '<dt>초대 리그원</dt><dd>' + esc(a.invNick) + '</dd>' : '') + '<dt>구글</dt><dd style="word-break:break-all">' + esc(a.email) + '</dd><dt>신청</dt><dd>' + dLabel(dateKey(toDate(a.createdAt) || new Date())) + ' ' + hhmm(a.createdAt) + '</dd></dl>' +
        '<div class="row"><button class="btn line sm" data-app="' + a.id + '" data-st="no">반려</button><button class="btn pri sm" data-app="' + a.id + '" data-st="ok">승인</button></div></article>'; });
    h += '<p class="sub">닉네임은 띄어쓰기·특수문자를 빼고 리그 명단과 비교해요. 유사 판정은 직접 확인 후 승인하세요.</p>';
  }
  if (S.admTab === "ex") {
    h += '<form class="row" id="xfind"><div class="field" style="flex:2"><input id="xcode" placeholder="카톡으로 받은 코드 (EX-0000-XXXX)" autocomplete="off" aria-label="교환 코드"></div><button class="btn pri sm" style="min-height:50px">조회</button></form><div id="xres"></div>';
    h += '<h3>처리 대기</h3>' + (S.waitEx.length ? S.waitEx.map(exCard).join("") : '<p class="empty">대기 중인 교환이 없어요</p>');
  }
  if (S.admTab === "members") {
    if (!S.members) { loadMembers(); h += '<p class="sub">불러오는 중…</p>'; }
    else {
      const qq = (S.memQ || "").trim().toLowerCase(), f = S.memF || "all";
      const list = S.members.filter(u => (f === "all" || u.status === f) && (!qq || [u.nick, u.name, u.league, u.email, u.phone].join(" ").toLowerCase().includes(qq)))
        .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0));
      const cnt = k => S.members.filter(u => k === "all" || u.status === k).length;
      h += '<div class="tiles"><div class="tile"><span>전체</span><b>' + cnt("all") + '</b></div><div class="tile"><span>승인</span><b>' + cnt("ok") + '</b></div><div class="tile"><span>대기</span><b>' + cnt("wait") + '</b></div><div class="tile"><span>보유 포인트 합계</span><b>' + fmt(S.members.reduce((t, u) => t + (u.points || 0), 0)) + '</b><span>P · 1P = 1원</span></div></div>';
      h += '<div class="field"><input id="mem-q" value="' + esc(S.memQ || "") + '" placeholder="닉네임·이름·리그·연락처 검색" autocomplete="off" aria-label="회원 검색"></div><div class="atabs">' +
        [["all", "전체"], ["ok", "승인"], ["wait", "대기"], ["no", "반려"]].map(t => '<button data-mf="' + t[0] + '" aria-pressed="' + (f === t[0]) + '">' + t[1] + ' ' + cnt(t[0]) + '</button>').join("") + '</div>';
      h += list.length ? '<section class="card" style="padding:4px 14px"><div class="hist">' + list.map(u => { const rev = S.revealed[u.id];
        return '<div class="h mem"><div style="min-width:0"><b>' + esc(u.nick) + '</b> <span class="st ' + ({ ok: "ok", wait: "wait", no: "no" })[u.status] + '">' + ({ ok: "승인", wait: "대기", no: "반려" })[u.status] + '</span>' +
          '<small>' + esc(u.type) + ' · ' + esc(u.league) + (u.type === "지인" ? ' · 초대 ' + esc(u.invNick) : '') + '</small><small>' + esc(u.name) + ' · <button class="mask" data-rev="' + u.id + '">' + esc(rev ? u.phone : String(u.phone).replace(/(\d{3})-(\d{2})\d{1,2}-(\d{2})\d{2}/, "$1-$2**-$3**")) + '</button> · 가입 ' + dLabel(dateKey(toDate(u.createdAt) || new Date())) + '</small><small style="word-break:break-all">' + esc(u.email) + '</small></div>' +
          '<b class="num">' + fmt(u.points) + 'P</b></div>'; }).join("") + '</div></section>' : '<p class="empty">조건에 맞는 회원이 없어요</p>';
    }
  }
  if (S.admTab === "roster") {
    const lg = S.rosterSel, up = S.rosterUpload;
    h += '<section class="card form"><h3>엑셀로 한 번에 등록</h3><p class="sub">리그별 시트에 팀명·매니저 표시명이 있는 엑셀을 올리면 12개 리그가 한 번에 등록돼요. 저장하면 기존 명단을 덮어써요.</p><input type="file" id="rs-file" accept=".xlsx">';
    if (up) { const keys = Object.keys(up); h += '<div class="hist">' + keys.map(l => '<div class="h"><span>' + esc(l) + '</span><span class="st ok">' + up[l].length + '팀</span></div>').join("") + '</div>' + (keys.length ? '<button class="btn pri" id="rs-up-save">' + keys.length + '개 리그 명단 저장</button>' : '<div class="notice warn"><p>리그 이름과 같은 시트를 찾지 못했어요</p></div>'); }
    h += '</section>';
    h += '<section class="card form"><h3>직접 수정</h3><div class="field"><label for="rs-l">리그</label><select id="rs-l">' + LEAGUES.map(l => '<option' + (l === lg ? ' selected' : '') + '>' + esc(l) + '</option>').join("") + '</select></div><div class="field"><label for="rs-t">팀명 / 매니저 (한 줄에 한 팀)</label><textarea id="rs-t" placeholder="KB Leopards / 규범">' + esc((S.rosters[lg] || []).map(e => e.mgr ? e.team + " / " + e.mgr : e.team).join("\n")) + '</textarea><span class="help">가입 신청 닉네임을 팀명과 매니저 이름 둘 다와 대조해요</span></div><button class="btn line" id="rs-save">이 리그만 저장</button></section>';
    h += '<section class="card"><h3>등록 현황</h3><div class="hist">' + LEAGUES.map(l => { const c = (S.rosters[l] || []).length; return '<div class="h"><span>' + esc(l) + '</span><span class="st ' + (c ? 'ok' : 'wait') + '">' + (c ? c + '팀' : '미등록') + '</span></div>'; }).join("") + '</div></section>';
  }

  return h;
}
function exCard(x) { return '<article class="card app"><div class="app-h"><b class="num" style="font-size:18px">' + esc(x.code) + '</b><span class="st ' + x.status + '">' + ({ wait: "발송 대기", ok: "발송 완료", no: "반려" })[x.status] + '</span></div><dl class="kv"><dt>닉네임</dt><dd>' + esc(x.nick) + '</dd><dt>교환</dt><dd>' + (x.tier === "s" ? "모았다가 한번에!" : "바로 써버리기~") + ' · ' + fmt(x.won) + '원 상당 (' + fmt(x.pts) + 'P)</dd><dt>신청</dt><dd>' + dLabel(dateKey(toDate(x.at) || new Date())) + ' ' + hhmm(x.at) + '</dd></dl>' + (x.status === "wait" ? '<div class="row"><button class="btn line sm" data-x="' + esc(x.code) + '" data-xs="no">반려 · 환불</button><button class="btn pri sm" data-x="' + esc(x.code) + '" data-xs="ok">발송 완료</button></div>' : '') + '</article>'; }
function simCalc() {
  const ni = document.getElementById("s-n"), ai = document.getElementById("s-a"), ri = document.getElementById("s-r"); if (!ni) return;
  const n = +ni.value || 0, a = Math.min(100, Math.max(0, +ai.value || 0)) / 100, r = Math.min(100, Math.max(0, +ri.value || 0)) / 100;
  const day = RULE.part + RULE.qpts * 5 * a + RULE.bonus * Math.pow(a, 5), per = day * 28 * r, won = Math.round(per * n / 100) * 100, maxN = per > 0 ? Math.floor(RULE.budget / per) : 0;
  document.getElementById("simout").innerHTML = '<dl class="kv"><dt>참여한 날 평균</dt><dd class="num">' + day.toFixed(1) + 'P</dd><dt>1인 월 평균</dt><dd class="num">' + fmt(Math.round(per)) + 'P</dd><dt>월 예상 지출</dt><dd class="num"><b>' + fmt(won) + '원</b></dd><dt>5만 원 안 최대 인원</dt><dd class="num">' + fmt(maxN) + '명</dd></dl>' + (won > RULE.budget ? '<div class="notice warn" style="margin-top:10px"><p>5만 원을 넘어요. 다음 달 포인트를 낮추거나 교환 기준을 올리세요.</p></div>' : '<div class="notice ok" style="margin-top:10px"><p>5만 원 안이에요. 여유 ' + fmt(RULE.budget - won) + '원</p></div>');
}

/* ---------- 동작 ---------- */
async function login() {
  if (IN_APP) toast("앱 안 브라우저에서는 막힐 수 있어요. 크롬·삼성 인터넷으로 열어주세요");
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e.code)) { try { await signInWithRedirect(auth, p); } catch (e2) { toast("로그인 실패: " + (e2.code || e2.message)); } }
    else if (e.code !== "auth/popup-closed-by-user") toast(e.code === "auth/unauthorized-domain" ? "아직 이 주소에서 로그인이 허용되지 않았어요 (운영자 설정 필요)" : "로그인 실패: " + (e.code || e.message));
  }
}
async function submitAnswer(id) {
  const v = String(S.drafts[id] != null ? S.drafts[id] : "").trim(); if (!v || !S.quiz) return;
  const first = !(S.ans && S.ans.sub && S.ans.sub[id]);
  try {
    await setDoc(doc(db, "answers", S.quiz.date + "_" + S.user.uid), { uid: S.user.uid, date: S.quiz.date, a: { [id]: v }, sub: { [id]: serverTimestamp() } }, { merge: true });
    delete S.drafts[id]; toast(first ? "제출했어요 · " + id + "번 채팅방이 열렸어요" : "수정한 답으로 다시 제출했어요");
  } catch (e) { toast(quizOpen() ? "제출 실패: " + (e.code || e.message) : "마감돼서 제출할 수 없어요"); }
}
async function sendChat(m) {
  try { await setDoc(doc(collection(db, "chats", S.quiz.date + "_" + S.room, "msgs")), { uid: S.user.uid, nick: S.isAdmin && !approved() ? "운영자" : S.me.nick, league: S.isAdmin && !approved() ? "운영" : S.me.league, m, at: serverTimestamp() }); }
  catch (e) { toast("전송 실패: " + (e.code || e.message)); }
}
async function joinSubmit() {
  const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; }, err = {};
  const name = g("j-name"), phone = g("j-phone"), league = g("j-league"), nick = g("j-nick"), inv = g("j-inv");
  if (name.length < 2) err["j-name"] = "이름을 적어주세요";
  if (!/^01\d-\d{3,4}-\d{4}$/.test(phone)) err["j-phone"] = "010-0000-0000 형식으로 적어주세요";
  if (!league) err["j-league"] = "리그를 골라주세요";
  if (!nick) err["j-nick"] = "닉네임을 적어주세요";
  if (J.type === "지인" && !inv) err["j-inv"] = "초대한 리그원 닉네임을 적어주세요";
  if (!document.getElementById("j-agree").checked) err.agree = 1;
  J.err = err; const keep = { "j-name": name, "j-phone": phone, "j-league": league, "j-nick": nick, "j-inv": inv };
  const restore = () => Object.keys(keep).forEach(k => { const e = document.getElementById(k); if (e) e.value = keep[k]; });
  if (Object.keys(err).length) { render(true); restore(); return; }
  S.busy = true; render(true); restore();
  try {
    const b = writeBatch(db);
    b.set(doc(db, "phones", phone), { uid: S.user.uid });
    b.set(doc(db, "users", S.user.uid), { name, phone, type: J.type, league, nick, invNick: J.type === "지인" ? inv : "", email: S.user.email || "", status: "wait", points: 0, createdAt: serverTimestamp() });
    await b.commit(); J = { type: "리그원", err: {} }; toast("가입 신청 완료 · 승인되면 바로 참여할 수 있어요"); S.tab = "home";
  } catch (e) { J.err = { "j-phone": e.code === "permission-denied" ? "이미 가입된 연락처이거나 신청할 수 없는 상태예요. 카톡으로 문의해 주세요" : "신청 실패: " + (e.code || e.message) }; }
  S.busy = false; render(true); restore();
}
async function doExchange(id) {
  const t = RULE.tiers.find(x => x.id === id); if (!t || S.me.points < t.pts) { closeSheet(); toast("포인트가 부족해요"); return; }
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let c = ""; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  const code = "EX-" + dateKey().slice(5).replace("-", "") + "-" + c;
  try {
    const b = writeBatch(db);
    b.set(doc(db, "exchanges", code), { code, uid: S.user.uid, nick: S.me.nick, tier: id, pts: t.pts, won: t.won, status: "wait", at: serverTimestamp() });
    b.update(doc(db, "users", S.user.uid), { points: S.me.points - t.pts, lastEx: code });
    await b.commit();
  } catch (e) { closeSheet(); toast("교환 신청 실패: " + (e.code || e.message)); return; }
  sheet('<h2>교환 코드가 발급됐어요</h2><div class="code" id="the-code">' + code + '</div><button class="btn line" id="copy-code" data-c="' + code + '">코드 복사</button><ol class="steps"><li>위 코드를 복사해요</li><li>카톡 문의방을 열어요</li><li>닉네임 <b>' + esc(S.me.nick) + '</b> + 코드를 보내요</li><li>운영자가 확인하면 기프티콘이 와요</li></ol><a class="btn kakao" href="' + KAKAO + '" target="_blank" rel="noopener">카카오톡 문의방 열기</a><button class="btn line" data-close>닫기</button>');
  loadWallet();
}
async function openQuiz() {
  const d = document.getElementById("qz-d").value, t = document.getElementById("qz-t").value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(t)) { toast("날짜와 시간을 확인해 주세요"); return; }
  const [y, m, dd] = d.split("-").map(Number), [hh, mi] = t.split(":").map(Number);
  const deadline = Timestamp.fromDate(new Date(Date.UTC(y, m - 1, dd, hh - 9, mi)));
  const games = document.getElementById("qz-g").value.split("\n").map(s => s.trim().split(/\s+/)).filter(p => p.length >= 2).map(p => ({ a: p[0].toUpperCase(), h: p[1].toUpperCase(), t: p[2] || "" }));
  if (S.pick.length !== 5) { toast("문제 5개를 골라주세요"); return; }
  S.busy = true; render(true);
  try { await setDoc(doc(db, "quizzes", d), { date: d, deadline, games, qs: S.pick.slice(), keys: {}, graded: {}, stats: {} }); toast(dLabel(d) + " 퀴즈를 열었어요"); S.autoInfo = {}; S.autoMsg = ""; S.keyDraft = {}; }
  catch (e) { toast("실패: " + (e.code || e.message)); }
  S.busy = false; render(true);
}
async function commitOps(ops) { for (let i = 0; i < ops.length; i += 400) { const b = writeBatch(db); ops.slice(i, i + 400).forEach(o => o(b)); await b.commit(); } }
async function grade(id) {
  id = +id; const q = qById(id), key = String(S.keyDraft[id] || "").trim(), Q = S.quiz; if (!key || !Q) return;
  if (key.split(",").some(k => k.trim() && !fmtOk(q, k))) { toast("정답이 문제 형식과 달라요: " + q.rule); return; }
  if (q.num && key.includes(",")) { toast("숫자 문제는 정답 숫자 하나만 적어주세요"); return; }
  S.busy = true; render(true);
  try {
    const [as, ps] = await Promise.all([getDocs(query(collection(db, "answers"), where("date", "==", Q.date))), getDocs(collection(db, "profiles"))]);
    const prof = {}; ps.docs.forEach(d => prof[d.id] = d.data());
    const mk = monthKey(), label = dLabel(Q.date), ops = []; let nSub = 0, nRight = 0; const resAll = {};
    const mk2 = mKey(Q.date.slice(0, 7));
    const bump = (uid, pts, right, ans) => { if (!prof[uid]) return; ops.push(b => b.update(doc(db, "profiles", uid), { ["m." + mk2 + ".p"]: increment(pts), ["m." + mk2 + ".r"]: increment(right), ["m." + mk2 + ".a"]: increment(ans) })); };
    let best = Infinity;
    if (q.num) as.docs.forEach(d => { const a = d.data(); if (a.sub && a.sub[id] && fmtOk(q, a.a && a.a[id])) best = Math.min(best, Math.abs(parseInt(a.a[id], 10) - parseInt(key, 10))); });
    as.docs.forEach(d => { const a = d.data(); resAll[a.uid] = Object.assign({}, a.res || {});
      if (!(a.sub && a.sub[id])) return; nSub++; const ok = q.num ? (fmtOk(q, a.a && a.a[id]) && Math.abs(parseInt(a.a[id], 10) - parseInt(key, 10)) === best) : isRight(id, a.a && a.a[id], key); if (ok) nRight++; resAll[a.uid][id] = ok;
      ops.push(b => b.update(d.ref, { ["res." + id]: ok }));
      if (ok) { ops.push(b => b.update(doc(db, "users", a.uid), { points: increment(q.pts) })); ops.push(b => b.set(doc(collection(db, "ledger")), { uid: a.uid, p: q.pts, t: label + " " + id + "번 정답", at: serverTimestamp() })); }
      bump(a.uid, ok ? q.pts : 0, ok ? 1 : 0, 1); });
    if (!Q.partPaid) { as.docs.forEach(d => { const a = d.data(); if (!a.sub || QUIZ.some(x => !a.sub[x.id])) return;
      ops.push(b => b.update(doc(db, "users", a.uid), { points: increment(RULE.part) })); ops.push(b => b.set(doc(collection(db, "ledger")), { uid: a.uid, p: RULE.part, t: label + " 참여", at: serverTimestamp() })); bump(a.uid, RULE.part, 0, 0); });
      ops.push(b => b.update(doc(db, "quizzes", Q.date), { partPaid: true })); }
    const graded = Object.assign({}, Q.graded || {}, { [id]: true });
    if (QUIZ.every(x => graded[x.id])) Object.keys(resAll).forEach(uid => { if (QUIZ.every(x => resAll[uid][x.id] === true)) {
      ops.push(b => b.update(doc(db, "users", uid), { points: increment(RULE.bonus) })); ops.push(b => b.set(doc(collection(db, "ledger")), { uid, p: RULE.bonus, t: label + " 전문항 정답 보너스", at: serverTimestamp() })); bump(uid, RULE.bonus, 0, 0); } });
    ops.push(b => b.update(doc(db, "quizzes", Q.date), { ["keys." + id]: key, ["graded." + id]: true, ["stats." + id]: q.num ? { sub: nSub, right: nRight, gap: best === Infinity ? null : best } : { sub: nSub, right: nRight } }));
    await commitOps(ops); delete S.keyDraft[id]; delete S.autoInfo[id]; toast(id + "번 확정 · 정답 " + nRight + "명 / 제출 " + nSub + "명");
  } catch (e) { toast("채점 실패: " + (e.code || e.message)); }
  S.busy = false; S.profiles = null; render(true);
}
async function approve(uid, st) {
  const a = S.waitUsers.find(x => x.id === uid); if (!a) return;
  try {
    const b = writeBatch(db); b.update(doc(db, "users", uid), { status: st, decidedAt: serverTimestamp() });
    const mm = a.type === "리그원" ? matchNick(a.league, a.nick) : matchNick(a.league, a.invNick);
    if (st === "ok") b.set(doc(db, "profiles", uid), { nick: a.nick, league: a.league, m: {}, mgr: a.type === "리그원" ? mm.mgr : "", invMgr: a.type === "지인" ? mm.mgr : "" });
    else b.delete(doc(db, "phones", a.phone));
    await b.commit(); toast(a.nick + (st === "ok" ? " 승인" : " 반려")); loadAdmin();
  } catch (e) { toast("실패: " + (e.code || e.message)); }
}
async function settleEx(code, st) {
  const x = S.waitEx.find(e => e.code === code) || (S.found && S.found.code === code ? S.found : null); if (!x) return;
  try {
    const b = writeBatch(db); b.update(doc(db, "exchanges", code), { status: st, doneAt: serverTimestamp() });
    if (st === "no") { b.update(doc(db, "users", x.uid), { points: increment(x.pts) }); b.set(doc(collection(db, "ledger")), { uid: x.uid, p: x.pts, t: "교환 반려 환불 (" + code + ")", at: serverTimestamp() }); }
    await b.commit(); toast(st === "ok" ? "발송 완료 처리" : "반려 · " + fmt(x.pts) + "P 환불"); S.found = null; loadAdmin();
  } catch (e) { toast("실패: " + (e.code || e.message)); }
}

async function saveRosters(map) {
  try {
    const b = writeBatch(db);
    Object.keys(map).forEach(l => { const teams = map[l], nicks = [...new Set(teams.flatMap(e => [e.team, e.mgr]).filter(Boolean))];
      b.set(doc(db, "rosters", "L" + LEAGUES.indexOf(l)), { league: l, teams, nicks }); S.rosters[l] = teams; });
    await b.commit(); render(true);
  } catch (e) { toast("저장 실패: " + (e.code || e.message)); throw e; }
}
async function parseRosterFile(file) {
  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" }), out = {};
    wb.SheetNames.forEach(name => {
      const lg = LEAGUES.find(l => l.trim() === String(name).trim()); if (!lg) return;
      const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
      const hi = rows.findIndex(r => r.some(c => String(c).trim() === "팀 ID")); if (hi < 0) return;
      const tc = rows[hi].findIndex(c => String(c).trim() === "팀명"), mc = rows[hi].findIndex(c => String(c).trim() === "매니저 표시명"); if (tc < 0) return;
      const teams = []; for (let i = hi + 1; i < rows.length; i++) { const t = String(rows[i][tc] || "").trim(); if (!t) continue; teams.push({ team: t, mgr: mc >= 0 ? String(rows[i][mc] || "").trim() : "" }); }
      if (teams.length) out[lg] = teams;
    });
    S.rosterUpload = out; render(true);
  } catch (e) { toast("엑셀을 읽지 못했어요: " + (e.message || e)); }
}

async function loadMembers() {
  try { const u = await getDocs(collection(db, "users")); S.members = u.docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (e) { S.members = []; toast("회원 목록을 못 불러왔어요: " + (e.code || e.message)); }
  render(true);
}
const ESPN_AB = { GS: "GSW", NY: "NYK", SA: "SAS", NO: "NOP", UTAH: "UTA", WSH: "WAS", PHO: "PHX", BRK: "BKN" };
const tAb = a => ESPN_AB[a] || a;
async function getJson(url) { const r = await fetch(url); if (!r.ok) throw new Error("기록 사이트 응답 " + r.status); return r.json(); }
async function autoFill() {
  const Q = S.quiz; if (!Q) return;
  const [y, m, d] = Q.date.split("-").map(Number), us = new Date(Date.UTC(y, m - 1, d) - DAY);
  const ymd = us.getUTCFullYear() + pad(us.getUTCMonth() + 1) + pad(us.getUTCDate());
  S.busy = true; S.autoMsg = ""; render(true);
  try {
    const sb = await getJson("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=" + ymd);
    const want = (Q.games || []).map(g => [g.a, g.h].sort().join(" ")), games = []; let notDone = 0;
    (sb.events || []).forEach(ev => { const comp = ev.competitions[0], teams = comp.competitors.map(c => ({ ab: tAb(c.team.abbreviation), score: +c.score }));
      if (want.length && !want.includes(teams.map(t => t.ab).sort().join(" "))) return;
      if (!(comp.status && comp.status.type && comp.status.type.completed)) { notDone++; return; }
      games.push({ id: ev.id, teams }); });
    if (notDone) throw new Error("아직 안 끝난 경기가 " + notDone + "개 있어요");
    if (!games.length) throw new Error("이 날짜 경기 기록을 찾지 못했어요");
    if (want.length && games.length < want.length) throw new Error("퀴즈 경기 " + want.length + "개 중 " + games.length + "개만 찾았어요");
    const players = [], ts = {};
    for (const g of games) {
      const sm = await getJson("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=" + g.id);
      ((sm.boxscore && sm.boxscore.players) || []).forEach(tp => {
        const ab = tAb(tp.team.abbreviation), st = tp.statistics[0], L = (st.labels || []).map(x => String(x).toUpperCase());
        ts[ab] = ts[ab] || { tpm: 0, reb: 0, ast: 0, tov: 0 };
        (st.athletes || []).forEach(a => { if (a.didNotPlay || !a.stats || !a.stats.length) return;
          const v = n => { const i = L.indexOf(n); return i < 0 ? "0" : a.stats[i]; }, num = x => parseFloat(String(x).split("-")[0]) || 0;
          const p = { name: deacc(a.athlete.displayName), team: ab, starter: !!a.starter, min: num(v("MIN")), pts: num(v("PTS")), ast: num(v("AST")), reb: num(v("REB")), oreb: num(v("OREB")),
            stl: num(v("STL")), blk: num(v("BLK")), tov: num(v("TO")), fgm: num(v("FG")), ftm: num(v("FT")), tpm: num(v("3PT")), pm: parseFloat(String(v("+/-")).replace("+", "")) || 0 };
          players.push(p); const t = ts[ab]; t.tpm += p.tpm; t.reb += p.reb; t.ast += p.ast; t.tov += p.tov; });
      });
    }
    if (!players.length) throw new Error("선수 기록을 읽지 못했어요");
    const top = (arr, f, dir) => { let b = null; arr.forEach(x => { const v = f(x); if (b === null || v * dir > b * dir) b = v; }); return { v: b, xs: arr.filter(x => f(x) === b) }; };
    const uniq = a => [...new Set(a)];
    const P = (f, unit, flt) => { const r = top(flt ? players.filter(flt) : players, f, 1); return { k: uniq(r.xs.map(x => x.name)).join(", "), i: r.v + unit + (r.xs.length > 1 ? " · 공동 " + r.xs.length + "명" : "") }; };
    const TM = []; games.forEach(g => g.teams.forEach(t => TM.push(Object.assign({ ab: t.ab, score: t.score }, ts[t.ab] || {}))));
    const T = (f, unit, dir) => { const r = top(TM, f, dir || 1); return { k: uniq(r.xs.map(x => x.ab)).join(", "), i: r.v + unit + (r.xs.length > 1 ? " · 공동 " + r.xs.length + "팀" : "") }; };
    const GM = games.map(g => { const [a, b] = g.teams; return { pair: a.ab + " " + b.ab, total: a.score + b.score, margin: Math.abs(a.score - b.score), win: a.score > b.score ? a.ab : b.ab }; });
    const Gx = (f, unit, dir) => { const r = top(GM, f, dir || 1); return { k: r.xs.map(x => x.pair).join(", "), i: r.v + unit + (r.xs.length > 1 ? " · 공동 " + r.xs.length + "경기" : "") }; };
    const N = (r) => ({ k: String(r.v), i: "실제 기록 " + r.v });
    const C = {
      pts: () => P(x => x.pts, "점"), ast: () => P(x => x.ast, "개"), reb: () => P(x => x.reb, "개"), tpm: () => P(x => x.tpm, "개"), stl: () => P(x => x.stl, "개"), blk: () => P(x => x.blk, "개"),
      oreb: () => P(x => x.oreb, "개"), fgm: () => P(x => x.fgm, "개"), min: () => P(x => x.min, "분"), ftm: () => P(x => x.ftm, "개"), tov: () => P(x => x.tov, "개"), pm: () => P(x => x.pm, ""),
      bench: () => P(x => x.pts, "점", x => !x.starter),
      thi: () => T(x => x.score, "점"), tlo: () => T(x => x.score, "점", -1), t3: () => T(x => x.tpm, "개"), treb: () => T(x => x.reb, "개"), tast: () => T(x => x.ast, "개"), ttov: () => T(x => x.tov, "개"),
      bigw: () => { const r = top(GM, x => x.margin, 1); return { k: uniq(r.xs.map(x => x.win)).join(", "), i: r.v + "점 차" }; },
      ghi: () => Gx(x => x.total, "점"), glo: () => Gx(x => x.total, "점", -1), gcl: () => Gx(x => x.margin, "점 차", -1),
      npts: () => N(top(players, x => x.pts, 1)), nast: () => N(top(players, x => x.ast, 1)), nreb: () => N(top(players, x => x.reb, 1)),
      nthi: () => N(top(TM, x => x.score, 1)), ntlo: () => N(top(TM, x => x.score, -1)), nmar: () => N(top(GM, x => x.margin, 1)), ngame: () => N(top(GM, x => x.total, 1)) };
    let n = 0;
    QUIZ.forEach(q => { if (Q.graded && Q.graded[q.id]) return; const f = C[q.key]; if (!f) return; const r = f(); S.keyDraft[q.id] = r.k; S.autoInfo[q.id] = r.i; n++; });
    S.autoMsg = games.length + "경기 · 선수 " + players.length + "명 기록으로 " + n + "문항을 채웠어요. 확인 후 확정을 눌러주세요.";
  } catch (e) { toast("자동 채우기 실패: " + (e.message || e) + " · 직접 입력해 주세요"); }
  S.busy = false; render(true);
}

/* ---------- 시트·토스트 ---------- */
function sheet(html) { document.getElementById("layer").innerHTML = '<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>'; }
function closeSheet() { document.getElementById("layer").innerHTML = ""; }
function askSheet() { sheet('<h2>문의 · 교환 · 후원</h2><p class="sub">아래 내용 모두 카카오톡 1:1 오픈채팅 하나로 받아요.</p><dl class="kv"><dt>사이트 문의</dt><dd>오류, 정답 이의, 가입 관련</dd><dt>포인트 교환</dt><dd>닉네임과 교환 코드를 같이 보내주세요</dd><dt>후원</dt><dd>운영을 응원하고 싶으시면 후원도 여기로 문의해 주세요. 보내주신 마음은 기프티콘과 운영에 소중히 쓰겠습니다</dd></dl><a class="btn kakao" href="' + KAKAO + '" target="_blank" rel="noopener">카카오톡 문의하기</a><span class="url" style="text-align:center">' + KAKAO + '</span><button class="btn line" data-close>닫기</button>'); }
function confirmTier(id) { const t = RULE.tiers.find(x => x.id === id);
  sheet('<h2>' + t.name + '</h2><dl class="kv"><dt>사용 포인트</dt><dd class="num">' + fmt(t.pts) + 'P</dd><dt>받는 것</dt><dd>' + t.desc + '</dd><dt>교환 후 잔액</dt><dd class="num">' + fmt(S.me.points - t.pts) + 'P</dd></dl><div class="notice info"><p>신청하면 포인트가 바로 차감되고 교환 코드가 나와요. 반려되면 전액 환불돼요.</p></div><div class="row"><button class="btn line" data-close>취소</button><button class="btn gold" id="do-ex" data-t="' + id + '">교환 신청</button></div>'); }
let toastT; function toast(m) { document.querySelectorAll(".toast").forEach(e => e.remove()); const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.textContent = m; document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 2800); }
function copy(text) { try { navigator.clipboard.writeText(text).then(() => toast("복사했어요"), selectCode); } catch (e) { selectCode(); } }
function selectCode() { const el = document.getElementById("the-code"); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("코드를 길게 눌러 복사하세요"); }

document.addEventListener("click", ev => {
  const b = ev.target.closest("button,a"); if (!b) { if (ev.target.id === "scrim") closeSheet(); return; }
  if (b.dataset.tab) { S.tab = b.dataset.tab; if (S.tab === "chat") { S.room = 0; watchChat(); } if (S.tab === "wallet") loadWallet(); if (S.tab === "rank") S.profiles = null; if (S.tab === "admin") loadAdmin(); render(); return; }
  if (b.dataset.go) { S.tab = b.dataset.go; if (S.tab === "wallet") loadWallet(); render(); return; }
  if (b.hasAttribute("data-login")) { login(); return; }
  if (b.hasAttribute("data-logout")) { signOut(auth); S.tab = "home"; return; }
  if (b.id === "hdr-ask") { askSheet(); return; }
  if (b.hasAttribute("data-close")) { closeSheet(); return; }
  if (b.dataset.sub) { submitAnswer(b.dataset.sub); return; }
  if (b.dataset.room !== undefined) { S.room = +b.dataset.room; S.tab = "chat"; watchChat(); render(); return; }
  if (b.dataset.rt) { S.rankTab = b.dataset.rt; render(true); return; }
  if (b.dataset.tier) { confirmTier(b.dataset.tier); return; }
  if (b.id === "do-ex") { b.disabled = true; doExchange(b.dataset.t); return; }
  if (b.id === "copy-code") { copy(b.dataset.c); return; }
  if (b.dataset.jt) { J.type = b.dataset.jt; J.err = {}; render(true); return; }
  if (b.dataset.at) { S.admTab = b.dataset.at; render(); return; }
  if (b.hasAttribute("data-reload")) { S.members = null; loadAdmin(); return; }
  if (b.dataset.rev) { S.revealed[b.dataset.rev] = !S.revealed[b.dataset.rev]; render(true); return; }
  if (b.dataset.app) { b.disabled = true; approve(b.dataset.app, b.dataset.st); return; }
  if (b.dataset.grade) { grade(b.dataset.grade); return; }
  if (b.id === "qz-open") { openQuiz(); return; }
  if (b.id === "auto-fill") { autoFill(); return; }
  if (b.dataset.mf) { S.memF = b.dataset.mf; render(true); return; }
  if (b.dataset.pick) { const k = b.dataset.pick, i = S.pick.indexOf(k); if (i >= 0) S.pick.splice(i, 1); else if (S.pick.length < 5) S.pick.push(k); else { toast("5문제까지 고를 수 있어요. 하나를 먼저 빼주세요"); return; }
    const keep = ["qz-d", "qz-t", "qz-g"].map(id => { const e = document.getElementById(id); return e ? e.value : ""; }); render(true); ["qz-d", "qz-t", "qz-g"].forEach((id, n) => { const e = document.getElementById(id); if (e) e.value = keep[n]; }); return; }
  if (b.dataset.x) { b.disabled = true; settleEx(b.dataset.x, b.dataset.xs); return; }
  if (b.id === "rs-save") { const l = document.getElementById("rs-l").value, teams = document.getElementById("rs-t").value.split("\n").map(x => x.trim()).filter(Boolean).map(x => { const p = x.split(" / "); return { team: p[0].trim(), mgr: (p[1] || "").trim() }; });
    saveRosters({ [l]: teams }).then(() => toast(l + " 명단 " + teams.length + "팀 저장")); return; }
  if (b.id === "rs-up-save") { b.disabled = true; saveRosters(S.rosterUpload).then(() => { toast(Object.keys(S.rosterUpload).length + "개 리그 명단 저장 완료"); S.rosterUpload = null; render(true); }); return; }
});
document.addEventListener("change", ev => { if (ev.target.id === "rs-file" && ev.target.files[0]) { parseRosterFile(ev.target.files[0]); return; } if (ev.target.id === "rk-m") { S.rankMonth = ev.target.value; render(true); return; } if (ev.target.id === "rs-l") { S.rosterSel = ev.target.value; render(true); } });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.ans) { ev.preventDefault(); const bt = document.querySelector('[data-sub="' + ev.target.dataset.ans + '"]'); if (bt && !bt.disabled) bt.click(); } });
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.dataset.ans) { const id = t.dataset.ans; S.drafts[id] = t.value; const bt = document.querySelector('[data-sub="' + id + '"]');
    if (bt) { const v = t.value.trim(), subd = !!(S.ans && S.ans.sub && S.ans.sub[id]), saved = S.ans && S.ans.a ? (S.ans.a[id] || "") : "", dirty = subd && saved !== v; bt.disabled = !v; bt.className = "btn sm " + (subd && !dirty ? "line" : "pri"); bt.textContent = subd ? (dirty ? "수정 제출" : "제출 완료 ✓") : "제출"; }
    const hh = document.getElementById("h-" + id); if (hh) hh.innerHTML = hintHtml(qById(id), t.value, S.ans && S.ans.sub && S.ans.sub[id]); }
  if (t.dataset.keyin) { const k = t.dataset.keyin; S.keyDraft[k] = t.value; const gb = document.querySelector('[data-grade="' + k + '"]'); if (gb && !quizOpen()) gb.disabled = !t.value.trim(); }
  if (t.id === "j-phone") { const d = t.value.replace(/\D/g, "").slice(0, 11); t.value = d.length > 7 ? d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7) : d.length > 3 ? d.slice(0, 3) + "-" + d.slice(3) : d; }
  if (t.id === "s-n" || t.id === "s-a" || t.id === "s-r") simCalc();
  if (t.id === "mem-q") { S.memQ = t.value; render(true); }
});
document.addEventListener("submit", ev => {
  ev.preventDefault();
  if (ev.target.id === "cform") { const i = document.getElementById("cin"), m = i.value.trim(); if (!m) return; i.value = ""; sendChat(m); return; }
  if (ev.target.id === "jform") { joinSubmit(); return; }
  if (ev.target.id === "xfind") { const c = document.getElementById("xcode").value.trim().toUpperCase();
    getDocs(query(collection(db, "exchanges"), where("code", "==", c))).then(s => { const x = s.docs[0] && s.docs[0].data(); S.found = x || null;
      document.getElementById("xres").innerHTML = x ? '<div class="notice ok"><p><b>코드 일치</b>아래 내역과 카톡 닉네임이 같은지 확인하세요</p></div>' + exCard(x) : '<div class="notice warn"><p><b>일치하는 코드가 없어요</b>대소문자와 하이픈을 확인해 달라고 안내해 주세요</p></div>'; }, e => toast("조회 실패: " + (e.code || e.message))); }
});

/* ---------- 렌더 ---------- */
function tick() { const el = document.getElementById("cd"); if (!el || !S.quiz) return; const s = Math.max(0, Math.floor((toDate(S.quiz.deadline) - Date.now()) / 1000));
  if (s === 0 && el.dataset.z !== "1") { el.dataset.z = "1"; render(true); return; }
  el.textContent = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); }
setInterval(tick, 1000);
function render(keepScroll) {
  renderTabs();
  if (document.activeElement && document.activeElement.matches && document.activeElement.matches("input,textarea,select") && keepScroll && !["cin"].includes(document.activeElement.id)) {
    const id = document.activeElement.id; const y0 = window.scrollY; doRender(); const el = id && document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } window.scrollTo(0, y0); return;
  }
  const y = window.scrollY; doRender();
  if (S.tab === "chat" && S.room) window.scrollTo(0, document.body.scrollHeight); else if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
function doRender() {
  const v = { home: vHome, rank: vRank, chat: vChat, wallet: vWallet, notice: vNotice, join: vJoin, admin: vAdmin }[S.tab] || vHome;
  document.getElementById("view").innerHTML = v() + composer();
  if (S.tab === "admin" && S.admTab === "dash") simCalc();
  if (S.tab === "notice" && window.QRCode) { try { new QRCode(document.getElementById("qrbox"), { text: KAKAO, width: 96, height: 96, colorDark: "#1C1133", colorLight: "#ffffff" }); } catch (e) {} }
  tick();
}
render();
