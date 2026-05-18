import { useState, useRef, useEffect, useCallback } from "react";
import { storage, haptics, requestNotificationPermission, scheduleDeadlineNotification, cancelNotification, requestSpeechPermission, startListening, addKeyboardListeners, addBackButtonListener } from "./capacitor-adapters";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_COLORS = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#22d3ee","#60a5fa","#a78bfa","#f472b6","#e2e8f0"];
const PRIORITY_CONFIG = {
  high:   { label: "高", color: "#f87171", bg: "rgba(248,113,113,0.12)", order: 0 },
  medium: { label: "中", color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  order: 1 },
  low:    { label: "低", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  order: 2 },
  none:   { label: "－", color: "#444",    bg: "transparent",            order: 3 },
};
const DEFAULT_TAGS = [
  { id: "work",     label: "仕事", color: "#fbbf24" },
  { id: "personal", label: "個人", color: "#34d399" },
  { id: "urgent",   label: "急ぎ", color: "#f87171" },
];
const INITIAL_TODOS = [
  { id: 1, text: "プロジェクトの資料を整理する", done: false, tagId: "work",     priority: "high",   deadline: null, createdAt: Date.now()-3000, repeat: null, price: null, memo: null, storePrices: [] },
  { id: 2, text: "買い物リストを作る",           done: false, tagId: "personal", priority: "medium", deadline: null, createdAt: Date.now()-2000, repeat: null, price: null, memo: null, storePrices: [] },
  { id: 3, text: "メールを返信する",             done: true,  tagId: "urgent",   priority: "low",    deadline: null, createdAt: Date.now()-1000, repeat: null, price: null, memo: null, storePrices: [] },
];

// 食料品キーワード
const GROCERY_KEYWORDS = ['牛乳','卵','たまご','野菜','肉','魚','パン','豆腐','米','果物','チーズ','ヨーグルト','鶏肉','豚肉','牛肉','キャベツ','にんじん','トマト','玉ねぎ','じゃがいも','大根','ほうれん草','もやし','バナナ','りんご'];

const WEEKDAY_LABELS = ["日","月","火","水","木","金","土"];

const PRICE_OPTIONS = ["","10","20","30","50","80","100","150","200","250","300","400","500","700","1000","1500","2000","3000","5000","10000"];
const fmtPrice = p => !p ? "" : (p.includes("円") ? p : p + "円");

// 繰り返しラベル
const REPEAT_LABELS = {
  daily:           "毎日",
  days:            (d) => `${d}日ごと`,
  weekly:          "毎週",
  "weekly-days":   (wds) => `毎週${wds.map(d => WEEKDAY_LABELS[d]).join("・")}`,
  monthly:         "毎月",
  "monthly-fixed": (d) => `毎月${d}日`,
  yearly:          "毎年",
};

function getRepeatLabel(repeat) {
  if (!repeat) return null;
  const base = REPEAT_LABELS[repeat.type];
  if (typeof base === "function") {
    if (repeat.type === "weekly-days") return base(repeat.weekdays || [1]);
    return base(repeat.days || repeat.dayOfMonth || 1);
  }
  return base || repeat.type;
}

// 繰り返しタスクの次回締め切りを計算
function calcNextDeadline(repeat, fromDate) {
  const d = new Date(fromDate || Date.now());
  switch (repeat.type) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "days":
      d.setDate(d.getDate() + (repeat.days || 1));
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "weekly-days": {
      const weekdays = (repeat.weekdays || [1]).slice().sort((a, b) => a - b);
      const curDay = d.getDay();
      const offsets = weekdays.map(wd => {
        const off = (wd - curDay + 7) % 7;
        return off === 0 ? 7 : off;
      });
      d.setDate(d.getDate() + Math.min(...offsets));
      break;
    }
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "monthly-fixed":
      d.setMonth(d.getMonth() + 1);
      d.setDate(repeat.dayOfMonth || 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

// ─── Theme Definitions ────────────────────────────────────────────────────────
const THEMES = [
  // ── 暗め ──
  { id: "dark",   label: "ダーク",     emoji: "🌑", isLight: false, bg: "#0f0f13", card: "#16161d", headerCard: "#1a1a24", text: "#f0f0f0", sub: "#888", subDim: "#444", border: "rgba(255,255,255,0.06)", inputBg: "#1e1e28", inputBorder: "rgba(255,255,255,0.07)", chipOff: "rgba(255,255,255,0.05)", chipOffText: "#888", calBg: "#1e1e2e", sidebarBg: "#13131a", sidebarBorder: "rgba(255,255,255,0.06)" },
  { id: "navy",   label: "ネイビー",   emoji: "🌊", isLight: false, bg: "#0a0e1a", card: "#111827", headerCard: "#161e30", text: "#e8eaf0", sub: "#7a8aaa", subDim: "#3a4560", border: "rgba(100,130,200,0.12)", inputBg: "#1a2338", inputBorder: "rgba(100,130,200,0.15)", chipOff: "rgba(100,130,200,0.08)", chipOffText: "#7a8aaa", calBg: "#1a2338", sidebarBg: "#0d1525", sidebarBorder: "rgba(100,130,200,0.12)" },
  { id: "forest", label: "フォレスト", emoji: "🌿", isLight: false, bg: "#0b130d", card: "#121a14", headerCard: "#172019", text: "#e0ede2", sub: "#6a9470", subDim: "#2a4030", border: "rgba(80,160,100,0.12)", inputBg: "#1a2a1c", inputBorder: "rgba(80,160,100,0.15)", chipOff: "rgba(80,160,100,0.08)", chipOffText: "#6a9470", calBg: "#1a2a1c", sidebarBg: "#0e1810", sidebarBorder: "rgba(80,160,100,0.12)" },
  // ── 明るめ ──
  { id: "light",  label: "ライト",     emoji: "☀️", isLight: true,  bg: "#f0f2f8", card: "#ffffff", headerCard: "#f8f9fc", text: "#1a1a2e", sub: "#666888", subDim: "#aaaacc", border: "rgba(0,0,0,0.07)", inputBg: "#f0f2f8", inputBorder: "rgba(0,0,0,0.1)", chipOff: "rgba(0,0,0,0.06)", chipOffText: "#666888", calBg: "#f0f2f8", sidebarBg: "#e8eaf4", sidebarBorder: "rgba(0,0,0,0.08)" },
  { id: "mint",   label: "ミント",     emoji: "🌱", isLight: true,  bg: "#f0faf4", card: "#ffffff", headerCard: "#f5fdf8", text: "#1a3028", sub: "#5a8070", subDim: "#aaccbb", border: "rgba(0,0,0,0.07)", inputBg: "#edf8f2", inputBorder: "rgba(0,0,0,0.09)", chipOff: "rgba(0,0,0,0.05)", chipOffText: "#5a8070", calBg: "#edf8f2", sidebarBg: "#e4f5ec", sidebarBorder: "rgba(0,0,0,0.07)" },
  { id: "peach",  label: "ピーチ",     emoji: "🍑", isLight: true,  bg: "#fff8f5", card: "#ffffff", headerCard: "#fff5f0", text: "#2a1810", sub: "#a07060", subDim: "#d4b0a0", border: "rgba(0,0,0,0.07)", inputBg: "#fff2ec", inputBorder: "rgba(0,0,0,0.09)", chipOff: "rgba(0,0,0,0.05)", chipOffText: "#a07060", calBg: "#fff2ec", sidebarBg: "#fde8e0", sidebarBorder: "rgba(0,0,0,0.07)" },
];

const getContrastText = (themeId) => (THEMES.find(th => th.id === themeId)?.isLight ? "#1a1a2e" : "#f0f0f0");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
};
const isTomorrow = (iso) => {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  const tom = new Date(n); tom.setDate(n.getDate() + 1);
  return d.getFullYear()===tom.getFullYear() && d.getMonth()===tom.getMonth() && d.getDate()===tom.getDate();
};
const isThisWeek = (iso) => {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  const weekLater = new Date(n); weekLater.setDate(n.getDate() + 7);
  return d >= n && d <= weekLater;
};
const isCreatedToday = (ts) => {
  const d = new Date(ts), n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
};
const isPast = (iso) => iso && new Date(iso) < new Date();

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIcon = ({ done }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {done && <polyline points="20 6 9 17 4 12" />}
  </svg>
);
const TrashIcon = ({ size=14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const EditIcon = ({ size=13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TagIcon = ({ size=13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const MicIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill={active?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);
const CalIcon = ({ size=14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const XIcon = ({ size=16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ChevronIcon = ({ dir="left" }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {dir==="left" ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
  </svg>
);
const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0010 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);
const RepeatIcon = ({ size=12 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
);

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ value, onChange, theme }) {
  const today = new Date();
  const initDate = value ? new Date(value) : today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selDate,   setSelDate]   = useState(value ? initDate.getDate() : null);
  const [selHour,   setSelHour]   = useState(value ? initDate.getHours() : 9);
  const [selMin,    setSelMin]    = useState(value ? initDate.getMinutes() : 0);
  const calRef = useRef(null);

  useEffect(() => {
    calRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const DAYS   = ["日","月","火","水","木","金","土"];
  const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); setSelDate(null); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); setSelDate(null); };

  const pick = (d) => { setSelDate(d); onChange(new Date(viewYear, viewMonth, d, selHour, selMin).toISOString()); };
  const updateTime = (h, m) => {
    setSelHour(h); setSelMin(m);
    if (selDate) onChange(new Date(viewYear, viewMonth, selDate, h, m).toISOString());
  };

  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const isSelDay   = (d) => selDate===d && viewYear===initDate.getFullYear() && viewMonth===initDate.getMonth();
  const isTodayDay = (d) => d===today.getDate() && viewMonth===today.getMonth() && viewYear===today.getFullYear();

  const t = theme;
  const isLight = t.isLight;

  return (
    <div ref={calRef} style={{ background: t.calBg, borderRadius:16, padding:"14px", border:`1px solid ${t.border}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={prevMonth} style={{ background: isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.06)", border:"none", borderRadius:8, color: t.sub, cursor:"pointer", padding:"5px 8px", display:"flex" }}><ChevronIcon dir="left"/></button>
        <span style={{ color: t.text, fontWeight:700, fontSize:14 }}>{viewYear}年 {MONTHS[viewMonth]}</span>
        <button onClick={nextMonth} style={{ background: isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.06)", border:"none", borderRadius:8, color: t.sub, cursor:"pointer", padding:"5px 8px", display:"flex" }}><ChevronIcon dir="right"/></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS.map((d,i)=>(
          <div key={d} style={{ textAlign:"center", fontSize:11, color: i===0?"#f87171":i===6?"#60a5fa": t.sub, padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((d,i)=>(
          <div key={i} onClick={d?()=>pick(d):undefined} style={{
            textAlign:"center", padding:"7px 2px", fontSize:13, borderRadius:8, cursor: d?"pointer":"default",
            background: d && isSelDay(d)   ? "linear-gradient(135deg,#7c6af7,#a78bfa)"
                      : d && isTodayDay(d) ? "rgba(124,106,247,0.2)"
                      : "transparent",
            color: d && isSelDay(d)   ? "#fff"
                 : d && isTodayDay(d) ? "#a78bfa"
                 : d                  ? t.text
                 : "transparent",
            fontWeight: d && (isSelDay(d)||isTodayDay(d)) ? 700 : 400,
          }}>{d||""}</div>
        ))}
      </div>
      <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <ClockIcon/>
        <span style={{ color: t.sub, fontSize:12 }}>時間:</span>
        <select value={selHour} onChange={e=>updateTime(Number(e.target.value),selMin)}
          style={{ background: isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.07)", border:`1px solid ${t.border}`, borderRadius:8, color: t.text, padding:"5px 8px", fontSize:13, outline:"none" }}>
          {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}</option>)}
        </select>
        <span style={{ color: t.sub }}>:</span>
        <select value={selMin} onChange={e=>updateTime(selHour,Number(e.target.value))}
          style={{ background: isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.07)", border:`1px solid ${t.border}`, borderRadius:8, color: t.text, padding:"5px 8px", fontSize:13, outline:"none" }}>
          {[0,5,10,15,20,25,30,35,40,45,50,55].map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
        </select>
        {selDate && <span style={{ fontSize:11, color:"#a78bfa", marginLeft:"auto" }}>✓ {viewMonth+1}/{selDate} {String(selHour).padStart(2,"0")}:{String(selMin).padStart(2,"0")}</span>}
      </div>
      <div style={{ marginTop:8, fontSize:11, color: t.subDim, textAlign:"center" }}>
        ↑ 日付を選んで時間を設定してください
      </div>
      {value && (
        <button onClick={()=>onChange(null)} style={{ marginTop:8, width:"100%", background:"rgba(248,113,113,0.1)", border:"none", borderRadius:10, color:"#f87171", fontSize:12, padding:"8px 0", cursor:"pointer" }}>
          締め切りを削除
        </button>
      )}
    </div>
  );
}

// ─── RepeatPicker ──────────────────────────────────────────────────────────────
function RepeatPicker({ value, onChange, theme }) {
  const t = theme;
  const types = [
    { key: "daily",         label: "毎日" },
    { key: "days",          label: "X日ごと" },
    { key: "weekly",        label: "毎週" },
    { key: "weekly-days",   label: "曜日指定" },
    { key: "monthly",       label: "毎月" },
    { key: "monthly-fixed", label: "毎月X日" },
    { key: "yearly",        label: "毎年" },
  ];

  const current = value?.type || null;
  const [daysVal,  setDaysVal]  = useState(String(value?.days || 2));
  const [domVal,   setDomVal]   = useState(String(value?.dayOfMonth || 1));
  const [weekdays, setWeekdays] = useState(value?.weekdays || [1]);

  const select = (key) => {
    if (current === key) { onChange(null); return; }
    if (key === "days")               onChange({ type: key, days: parseInt(daysVal,10) || 2 });
    else if (key === "monthly-fixed") onChange({ type: key, dayOfMonth: parseInt(domVal,10) || 1 });
    else if (key === "weekly-days")   onChange({ type: key, weekdays });
    else                              onChange({ type: key });
  };

  const toggleWeekday = (wd) => {
    const next = weekdays.includes(wd)
      ? weekdays.filter(d => d !== wd)
      : [...weekdays, wd].sort((a, b) => a - b);
    if (next.length === 0) return;
    setWeekdays(next);
    if (current === "weekly-days") onChange({ type: "weekly-days", weekdays: next });
  };

  const updateDays = (v) => {
    setDaysVal(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1 && current === "days") onChange({ type: "days", days: n });
  };
  const updateDom = (v) => {
    setDomVal(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1 && current === "monthly-fixed") onChange({ type: "monthly-fixed", dayOfMonth: n });
  };

  return (
    <div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
        {types.map(({ key, label }) => (
          <button key={key} onClick={() => select(key)} style={{
            background: current === key ? "rgba(124,106,247,0.2)" : t.chipOff,
            color: current === key ? "#a78bfa" : t.sub,
            border: current === key ? "1px solid rgba(124,106,247,0.4)" : "1px solid transparent",
            borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
        {value && (
          <button onClick={() => onChange(null)} style={{ background: "rgba(248,113,113,0.1)", border: "none", borderRadius: 8, color: "#f87171", padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>クリア</button>
        )}
      </div>
      {current === "days" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
          <span style={{ fontSize:12, color: t.sub }}>間隔:</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={daysVal}
            onChange={e => updateDays(e.target.value)}
            onBlur={e => { const n = parseInt(e.target.value,10); if (isNaN(n)||n<1) setDaysVal("1"); }}
            style={{ width:60, background: t.inputBg, border:`1px solid ${t.inputBorder}`, borderRadius:8, padding:"4px 8px", color: t.text, fontSize:13, outline:"none", textAlign:"center" }}/>
          <span style={{ fontSize:12, color: t.sub }}>日</span>
        </div>
      )}
      {current === "monthly-fixed" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
          <span style={{ fontSize:12, color: t.sub }}>日付:</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={domVal}
            onChange={e => updateDom(e.target.value)}
            onBlur={e => { const n = parseInt(e.target.value,10); if (isNaN(n)||n<1) setDomVal("1"); else if (n>31) setDomVal("31"); }}
            style={{ width:60, background: t.inputBg, border:`1px solid ${t.inputBorder}`, borderRadius:8, padding:"4px 8px", color: t.text, fontSize:13, outline:"none", textAlign:"center" }}/>
          <span style={{ fontSize:12, color: t.sub }}>日</span>
        </div>
      )}
      {current === "weekly-days" && (
        <div style={{ marginTop:6 }}>
          <div style={{ fontSize:11, color:t.sub, marginBottom:5 }}>繰り返す曜日を選択（複数可）:</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {WEEKDAY_LABELS.map((label, wd) => {
              const active = weekdays.includes(wd);
              return (
                <button key={wd} onClick={() => toggleWeekday(wd)} style={{
                  background: active ? "rgba(124,106,247,0.2)" : t.chipOff,
                  color: active ? "#a78bfa" : t.sub,
                  border: active ? "1px solid rgba(124,106,247,0.4)" : "1px solid transparent",
                  borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: active ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit", minWidth: 38, textAlign: "center",
                }}>{label}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tag Editor Modal ──────────────────────────────────────────────────────────
function TagEditorModal({ tags, onClose, onSave, theme }) {
  const [localTags, setLocalTags] = useState(tags.map(t=>({...t})));
  const [newLabel,  setNewLabel]  = useState("");
  const [newColor,  setNewColor]  = useState(PRESET_COLORS[6]);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const nid = useRef(Date.now());
  const t = theme;
  const addTag  = () => { if(!newLabel.trim()) return; setLocalTags(p=>[...p,{id:`tag_${nid.current++}`,label:newLabel.trim(),color:newColor}]); setNewLabel(""); };
  const startEdit = tag => { setEditingId(tag.id); setEditLabel(tag.label); setEditColor(tag.color); };
  const saveEdit  = () => { if(!editLabel.trim()) return; setLocalTags(p=>p.map(x=>x.id===editingId?{...x,label:editLabel.trim(),color:editColor}:x)); setEditingId(null); };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:t.card,borderRadius:20,width:"100%",maxWidth:360,boxShadow:"0 24px 64px rgba(0,0,0,0.7)",overflow:"hidden",border:`1px solid ${t.border}` }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"18px 20px 14px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,color:t.sub }}><TagIcon/><span style={{ fontSize:15,fontWeight:700,color:t.text }}>タグを管理</span></div>
          <button onClick={onClose} style={{ background:t.chipOff,border:"none",borderRadius:8,color:t.sub,padding:6,cursor:"pointer",display:"flex" }}><XIcon/></button>
        </div>
        <div style={{ maxHeight:260,overflowY:"auto",padding:"12px 16px" }}>
          {localTags.map(tag=>(
            <div key={tag.id} style={{ marginBottom:8 }}>
              {editingId===tag.id ? (
                <div style={{ background:t.inputBg,borderRadius:12,padding:12 }}>
                  <input autoFocus value={editLabel} onChange={e=>setEditLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveEdit()} style={{ width:"100%",background:t.chipOff,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:"7px 10px",color:t.text,fontSize:13,fontFamily:"inherit",marginBottom:10,outline:"none" }}/>
                  <div style={{ display:"flex",gap:8,overflowX:"auto",marginBottom:10,paddingBottom:4 }}>
                    {PRESET_COLORS.map(c=><div key={c} onClick={()=>setEditColor(c)} style={{ width:36,height:36,borderRadius:10,background:c,cursor:"pointer",border:editColor===c?"3px solid #fff":"3px solid transparent",flexShrink:0 }}/>)}
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={saveEdit} style={{ flex:1,background:"linear-gradient(135deg,#7c6af7,#a78bfa)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,padding:"8px 0",cursor:"pointer",fontFamily:"inherit" }}>保存</button>
                    <button onClick={()=>setEditingId(null)} style={{ flex:1,background:t.chipOff,border:"none",borderRadius:8,color:t.sub,fontSize:12,padding:"8px 0",cursor:"pointer",fontFamily:"inherit" }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex",alignItems:"center",gap:10,background:t.inputBg,borderRadius:10,padding:"10px 12px",border:`1px solid ${t.border}` }}>
                  <div style={{ width:10,height:10,borderRadius:3,background:tag.color,flexShrink:0 }}/>
                  <span style={{ flex:1,fontSize:13,color:t.text }}>{tag.label}</span>
                  <button onClick={()=>startEdit(tag)} style={{ background:"transparent",border:"none",cursor:"pointer",color:t.sub,padding:4,borderRadius:6,display:"flex" }}><EditIcon/></button>
                  <button onClick={()=>setLocalTags(p=>p.filter(x=>x.id!==tag.id))} style={{ background:"transparent",border:"none",cursor:"pointer",color:t.sub,padding:4,borderRadius:6,display:"flex" }}><TrashIcon size={13}/></button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px",borderTop:`1px solid ${t.border}` }}>
          <div style={{ display:"flex",gap:6,marginBottom:8 }}>
            <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="新しいタグ名…" style={{ flex:1,background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:9,padding:"8px 12px",color:t.text,fontSize:13,fontFamily:"inherit",outline:"none" }}/>
            <button onClick={addTag} style={{ background:"linear-gradient(135deg,#7c6af7,#a78bfa)",border:"none",borderRadius:9,color:"#fff",padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit" }}>＋</button>
          </div>
          <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4 }}>
            {PRESET_COLORS.map(c=><div key={c} onClick={()=>setNewColor(c)} style={{ width:36,height:36,borderRadius:10,background:c,cursor:"pointer",border:newColor===c?"3px solid #fff":"3px solid transparent",flexShrink:0 }}/>)}
          </div>
        </div>
        <div style={{ padding:"12px 16px 16px",display:"flex",gap:8 }}>
          <button onClick={()=>onSave(localTags)} style={{ flex:1,background:"linear-gradient(135deg,#7c6af7,#a78bfa)",border:"none",borderRadius:11,color:"#fff",fontSize:13,fontWeight:700,padding:"11px 0",cursor:"pointer",fontFamily:"inherit" }}>保存して閉じる</button>
          <button onClick={onClose} style={{ background:t.chipOff,border:"none",borderRadius:11,color:t.sub,fontSize:13,padding:"11px 16px",cursor:"pointer",fontFamily:"inherit" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ─── Todo Detail Modal ─────────────────────────────────────────────────────────
function TodoDetailModal({ todo, todos, tags, onClose, onSave, theme }) {
  const [text,          setText]          = useState(todo.text);
  const [tagId,         setTagId]         = useState(todo.tagId);
  const [priority,      setPriority]      = useState(todo.priority||"none");
  const [deadline,      setDeadline]      = useState(todo.deadline||null);
  const [showCal,       setShowCal]       = useState(false);
  const [repeat,        setRepeat]        = useState(todo.repeat || null);
  const [price,         setPrice]         = useState(todo.price ? todo.price.replace(/[^0-9]/g,'') : "");
  const [memo,          setMemo]          = useState(todo.memo || "");
  const [storePrices,   setStorePrices]   = useState(todo.storePrices || []);
  const [memoListening, setMemoListening] = useState(false);
  const [memoInterim,   setMemoInterim]   = useState("");
  const stopMemoVoice = useRef(null);
  const t = theme;

  const allStores = [...new Set((todos||[]).flatMap(td => (td.storePrices||[]).map(sp => sp.store).filter(Boolean)))];

  const inputSt = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`,
    borderRadius: 8, padding: "7px 10px", color: t.text, fontSize: 13,
    fontFamily: "inherit", outline: "none",
  };

  const handleSave = () => {
    onSave({ ...todo, text: text.trim()||todo.text, tagId, priority, deadline, repeat, price: price||null, memo: memo||null, storePrices });
  };

  const toggleMemoVoice = async () => {
    if (memoListening) {
      stopMemoVoice.current?.();
      setMemoListening(false);
      setMemoInterim("");
      return;
    }
    await haptics.light();
    setMemoListening(true);
    stopMemoVoice.current = startListening({
      onResult:  txt => { setMemo(prev => prev + txt); setMemoInterim(""); },
      onInterim: txt => setMemoInterim(txt),
      onEnd:     () => { setMemoListening(false); setMemoInterim(""); },
      onError:   () => { setMemoListening(false); setMemoInterim(""); },
    });
  };

  const saveBtnSt = { flex:1, background:"linear-gradient(135deg,#7c6af7,#a78bfa)", border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, padding:"12px 0", cursor:"pointer", fontFamily:"inherit" };
  const cancelBtnSt = { background:t.chipOff, border:"none", borderRadius:12, color:t.sub, fontSize:14, padding:"12px 16px", cursor:"pointer", fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:t.card,borderRadius:20,width:"100%",maxWidth:380,boxShadow:"0 24px 64px rgba(0,0,0,0.7)",border:`1px solid ${t.border}`,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>

        {/* Sticky header */}
        <div style={{ padding:"16px 20px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:t.text }}>タスクを編集</span>
          <button onClick={onClose} style={{ background:t.chipOff,border:"none",borderRadius:8,color:t.sub,padding:6,cursor:"pointer",display:"flex" }}><XIcon/></button>
        </div>

        {/* Top save row */}
        <div style={{ padding:"8px 20px",borderBottom:`1px solid ${t.border}`,display:"flex",gap:8,flexShrink:0 }}>
          <button onClick={handleSave} style={saveBtnSt}>保存</button>
          <button onClick={onClose} style={cancelBtnSt}>キャンセル</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 20px" }}>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} style={{ width:"100%",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:12,padding:"10px 14px",color:t.text,fontSize:14,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.6 }}/>

          {/* タグ */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11,color:t.sub,fontWeight:600,letterSpacing:1,marginBottom:6 }}>タグ</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {tags.map(tg=>(
                <button key={tg.id} onClick={()=>setTagId(tg.id)} style={{ background:tagId===tg.id?tg.color:t.chipOff,color:tagId===tg.id?"#111":t.sub,border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>{tg.label}</button>
              ))}
            </div>
          </div>

          {/* 優先度 */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11,color:t.sub,fontWeight:600,letterSpacing:1,marginBottom:6 }}>優先度</div>
            <div style={{ display:"flex",gap:6 }}>
              {Object.entries(PRIORITY_CONFIG).filter(([k])=>k!=="none").map(([k,v])=>(
                <button key={k} onClick={()=>setPriority(k)} style={{ flex:1,background:priority===k?v.bg:t.chipOff,color:priority===k?v.color:t.sub,border:priority===k?`1px solid ${v.color}40`:"1px solid transparent",borderRadius:9,padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{v.label}</button>
              ))}
              <button onClick={()=>setPriority("none")} style={{ flex:1,background:priority==="none"?t.inputBg:t.chipOff,color:priority==="none"?t.text:t.sub,border:priority==="none"?`1px solid ${t.inputBorder}`:"1px solid transparent",borderRadius:9,padding:"7px 0",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>なし</button>
            </div>
          </div>

          {/* 締め切り */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11,color:t.sub,fontWeight:600,letterSpacing:1,marginBottom:6 }}>締め切り</div>
            <button onClick={()=>setShowCal(v=>!v)} style={{ width:"100%",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:12,padding:"10px 14px",color:deadline?t.text:t.sub,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8 }}>
              <CalIcon/> {deadline ? fmtDate(deadline) : "日時を選択…"}
            </button>
            {showCal && <div style={{ marginTop:8 }}><MiniCalendar value={deadline} onChange={setDeadline} theme={t}/></div>}
          </div>

          {/* 繰り返し */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11,color:t.sub,fontWeight:600,letterSpacing:1,marginBottom:6 }}>🔁 繰り返し</div>
            <RepeatPicker value={repeat} onChange={setRepeat} theme={t}/>
          </div>

          {/* 価格・メモセクション */}
          <div style={{ marginTop:14,padding:"12px 14px",background:t.inputBg,borderRadius:12,border:`1px solid ${t.inputBorder}` }}>
            <div style={{ fontSize:11,color:"#a78bfa",fontWeight:700,letterSpacing:1,marginBottom:12 }}>💰 価格・メモ</div>

            {/* 目安価格 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11,color:t.sub,marginBottom:5 }}>目安価格</div>
              <div style={{ position:"relative",display:"inline-block" }}>
                <select value={price} onChange={e=>setPrice(e.target.value)}
                  style={{ ...inputSt,width:120,appearance:"none",WebkitAppearance:"none",paddingRight:28,cursor:"pointer" }}>
                  <option value="">なし</option>
                  {PRICE_OPTIONS.filter(p=>p).map(p=><option key={p} value={p}>{p}円</option>)}
                </select>
                <span style={{ position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:t.sub,fontSize:10 }}>▼</span>
              </div>
            </div>

            {/* 店舗別底値 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11,color:t.sub,marginBottom:6 }}>🏪 店舗別底値</div>
              <datalist id={`store-names-${todo.id}`}>
                {allStores.map(s=><option key={s} value={s}/>)}
              </datalist>
              {storePrices.map((sp, i) => (
                <div key={i} style={{ display:"flex",gap:5,marginBottom:5,alignItems:"center" }}>
                  <input value={sp.store} list={`store-names-${todo.id}`}
                    onChange={e=>setStorePrices(prev=>prev.map((x,j)=>j===i?{...x,store:e.target.value}:x))}
                    placeholder="店舗名"
                    style={{ ...inputSt,flex:1,minWidth:0 }}/>
                  <div style={{ position:"relative",flexShrink:0 }}>
                    <select value={sp.price}
                      onChange={e=>setStorePrices(prev=>prev.map((x,j)=>j===i?{...x,price:e.target.value}:x))}
                      style={{ ...inputSt,width:95,appearance:"none",WebkitAppearance:"none",paddingRight:24,cursor:"pointer" }}>
                      <option value="">なし</option>
                      {PRICE_OPTIONS.filter(p=>p).map(p=><option key={p} value={p}>{p}円</option>)}
                    </select>
                    <span style={{ position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:t.sub,fontSize:10 }}>▼</span>
                  </div>
                  <button onClick={()=>setStorePrices(prev=>prev.filter((_,j)=>j!==i))}
                    style={{ background:"rgba(248,113,113,0.15)",border:"none",borderRadius:8,color:"#f87171",padding:"0 10px",cursor:"pointer",fontFamily:"inherit",fontSize:14,flexShrink:0,height:36 }}>×</button>
                </div>
              ))}
              <button onClick={()=>setStorePrices(prev=>[...prev,{store:"",price:""}])}
                style={{ background:t.chipOff,border:"none",borderRadius:8,color:t.sub,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>＋ 店舗を追加</button>
            </div>

            {/* メモ */}
            <div>
              <div style={{ fontSize:11,color:t.sub,marginBottom:5 }}>📝 メモ</div>
              <div style={{ position:"relative" }}>
                <textarea value={memoListening && memoInterim ? memo + memoInterim : memo}
                  onChange={e=>{ if (!memoListening) setMemo(e.target.value); }} rows={2}
                  placeholder="買う際のメモ、ブランド指定など…"
                  style={{ ...inputSt,width:"100%",resize:"none",lineHeight:1.6,paddingRight:42 }}/>
                <button onClick={toggleMemoVoice} className={memoListening?"pulse":""}
                  style={{ position:"absolute",right:8,bottom:8,background:memoListening?"rgba(248,113,113,0.2)":t.chipOff,border:"none",borderRadius:7,color:memoListening?"#f87171":t.sub,padding:"5px 6px",display:"flex",alignItems:"center",cursor:"pointer" }}>
                  <MicIcon active={memoListening}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom save row */}
        <div style={{ padding:"12px 20px",borderTop:`1px solid ${t.border}`,display:"flex",gap:8,flexShrink:0 }}>
          <button onClick={handleSave} style={saveBtnSt}>保存</button>
          <button onClick={onClose} style={cancelBtnSt}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ─── Location Modal ────────────────────────────────────────────────────────────
function LocationModal({ lat, lng, onClose, theme }) {
  const t = theme;
  const links = [
    { label: "トクバイ（近くの特売）",    emoji: "💰", url: `https://tokubai.co.jp/?lat=${lat}&lng=${lng}` },
    { label: "Googleマップ スーパー検索", emoji: "🗺️", url: `https://www.google.com/maps/search/%E3%82%B9%E3%83%BC%E3%83%91%E3%83%BC/@${lat},${lng},14z` },
  ];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:t.card,borderRadius:20,width:"100%",maxWidth:340,boxShadow:"0 24px 64px rgba(0,0,0,0.7)",overflow:"hidden",border:`1px solid ${t.border}` }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"16px 16px 8px" }}>
          {links.map((link, i) => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex",alignItems:"center",gap:12,background:t.inputBg,borderRadius:12,padding:"16px 18px",marginBottom: i < links.length-1 ? 8 : 0,textDecoration:"none",border:`1px solid ${t.border}` }}>
              <span style={{ fontSize:24 }}>{link.emoji}</span>
              <span style={{ fontSize:14,color:t.text,fontWeight:600 }}>{link.label}</span>
              <span style={{ marginLeft:"auto",fontSize:12,color:t.sub }}>→</span>
            </a>
          ))}
        </div>
        <div style={{ padding:"8px 16px 16px" }}>
          <button onClick={onClose} style={{ width:"100%",background:t.chipOff,border:"none",borderRadius:12,color:t.sub,fontSize:14,padding:"12px 0",cursor:"pointer",fontFamily:"inherit" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ─── Assistant Character ───────────────────────────────────────────────────────
function Assistant({ todos, onDismiss, notification }) {
  const todayTodos = todos.filter(t => isToday(t.deadline));
  const allDoneToday = todayTodos.length > 0 && todayTodos.every(t => t.done);
  const msg = notification || (allDoneToday ? "今日の締め切りタスクを全部終わらせました！お疲れさまでした🎉" : null);
  if (!msg) return null;
  return (
    <div
      onClick={onDismiss}
      title="タップして閉じる"
      style={{ position:"fixed",bottom:24,right:16,zIndex:300,display:"flex",alignItems:"flex-end",gap:10,cursor:"pointer",animation:"bounceIn 0.5s cubic-bezier(.2,1.6,.4,1)" }}
    >
      <div style={{ background:"#1e1e2e",borderRadius:"18px 18px 4px 18px",padding:"12px 16px",maxWidth:220,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",border:"1px solid rgba(124,106,247,0.3)",userSelect:"none" }}>
        <p style={{ margin:0,fontSize:12,color:"#ccc",lineHeight:1.7 }}>{msg}</p>
        <p style={{ margin:"6px 0 0",fontSize:10,color:"rgba(124,106,247,0.6)" }}>タップして閉じる</p>
      </div>
      <div style={{ fontSize:36,userSelect:"none",filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.5))",flexShrink:0 }}>🐱</div>
      <style>{`@keyframes bounceIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Theme Switcher Bar ───────────────────────────────────────────────────────
function ThemeSwitcher({ currentThemeId, onChange, size=26 }) {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
      {THEMES.map(th => (
        <button
          key={th.id}
          onClick={() => onChange(th.id)}
          title={th.label}
          style={{
            width: size, height: size, borderRadius: "50%",
            background: th.bg,
            border: currentThemeId === th.id ? "2.5px solid #7c6af7" : "2px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            fontSize: Math.round(size * 0.5),
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: currentThemeId === th.id ? "0 0 0 2px rgba(124,106,247,0.35)" : "none",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          {th.emoji}
        </button>
      ))}
    </div>
  );
}

// ─── View Tabs (画面上部タブ) ──────────────────────────────────────────────────
function ViewTabs({ todos, currentView, onViewChange, theme }) {
  const t = theme;
  const isLight = t.isLight;

  const counts = {
    all:      todos.filter(td => !td.done).length,
    today:    todos.filter(td => isToday(td.deadline) && !td.done).length,
    tomorrow: todos.filter(td => isTomorrow(td.deadline) && !td.done).length,
    week:     todos.filter(td => isThisWeek(td.deadline) && !td.done).length,
  };

  const navItems = [
    { id: "all",      label: "すべて", emoji: "📋", count: counts.all },
    { id: "today",    label: "今日",           emoji: "📅", count: counts.today },
    { id: "tomorrow", label: "明日",           emoji: "🌅", count: counts.tomorrow },
    { id: "week",     label: "今週",           emoji: "📆", count: counts.week },
  ];

  return (
    <div style={{
      display: "flex",
      background: t.headerCard,
      borderBottom: `2px solid ${t.border}`,
      overflowX: "auto",
      scrollbarWidth: "none",
      WebkitOverflowScrolling: "touch",
    }}>
      {navItems.map(item => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              flex: "0 0 auto",
              padding: "11px 18px",
              background: isActive
                ? isLight ? "rgba(124,106,247,0.08)" : "rgba(124,106,247,0.14)"
                : "transparent",
              color: isActive ? "#a78bfa" : t.sub,
              border: "none",
              borderBottom: isActive ? "2.5px solid #7c6af7" : "2.5px solid transparent",
              marginBottom: "-2px",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 15 }}>{item.emoji}</span>
            <span>{item.label}</span>
            {item.count > 0 && (
              <span style={{
                background: isActive ? "#7c6af7" : isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.08)",
                color: isActive ? "#fff" : t.subDim,
                borderRadius: 10,
                padding: "1px 6px",
                fontSize: 11,
                fontWeight: 700,
                minWidth: 20,
                textAlign: "center",
              }}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function TodoApp() {
  const [themeId,     setThemeId]     = useState("dark");
  const [tags,        setTags]        = useState(DEFAULT_TAGS);
  const [todos,       setTodos]       = useState(INITIAL_TODOS);
  const [input,       setInput]       = useState("");
  const [selectedTag, setSelectedTag] = useState("personal");
  const [priority,    setPriority]    = useState("none");
  const [deadline,    setDeadline]    = useState(null);
  const [repeat,      setRepeat]      = useState(null);
  const [filter,      setFilter]      = useState("all");
  const [sortBy,      setSortBy]      = useState("created");
  const [showDone,    setShowDone]    = useState(true);
  const [animId,      setAnimId]      = useState(null);
  const [showTagEd,   setShowTagEd]   = useState(false);
  const [editTodo,    setEditTodo]    = useState(null);
  const [showCal,     setShowCal]     = useState(false);
  const [showRepeat,  setShowRepeat]  = useState(false);
  const [listening,   setListening]   = useState(false);
  const [interimText, setInterimText] = useState("");
  const [notification,setNotification]= useState(null);
  const [kbHeight,    setKbHeight]    = useState(0);
  const [loaded,      setLoaded]      = useState(false);
  // Tab view
  const [sideView,    setSideView]    = useState("all");
  // Location
  const [userLoc,     setUserLoc]     = useState(null);
  const [locLoading,  setLocLoading]  = useState(false);
  const [showLocModal,setShowLocModal]= useState(false);

  const inputRef    = useRef(null);
  const nextId      = useRef(10);
  const stopVoice   = useRef(null);
  const notifMap    = useRef({});
  const notifTimer  = useRef(null);
  const wasListening = useRef(false);

  const theme   = THEMES.find(t => t.id === themeId) || THEMES[0];
  const isLight = theme.isLight;
  const t       = theme;

  // ── Init: load persisted data + Capacitor setup ────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [sTheme, sTags, sTodos, sNextId, sSelTag] = await Promise.all([
        storage.get("themeId",  "dark"),
        storage.get("tags",     DEFAULT_TAGS),
        storage.get("todos",    INITIAL_TODOS),
        storage.get("nextId",   10),
        storage.get("selTag",   "personal"),
      ]);
      setThemeId(sTheme);
      setTags(sTags);
      setTodos(sTodos);
      nextId.current = sNextId;
      setSelectedTag(sSelTag);
      setLoaded(true);

      await requestNotificationPermission();
      await requestSpeechPermission();

      const removeKb = await addKeyboardListeners(
        h => setKbHeight(h),
        () => setKbHeight(0)
      );
      return removeKb;
    };

    let cleanup = () => {};
    init().then(fn => { if (fn) cleanup = fn; });
    return () => cleanup();
  }, []);

  // Back button (Android)
  useEffect(() => {
    let remove = () => {};
    addBackButtonListener(() => {
      if (showTagEd) { setShowTagEd(false); return; }
      if (editTodo)  { setEditTodo(null);   return; }
      if (showCal)   { setShowCal(false);   return; }
      inputRef.current?.blur();
    }).then(fn => { remove = fn; });
    return () => remove();
  }, [showTagEd, editTodo, showCal]);

  // ── Persist on change ─────────────────────────────────────────────────────
  useEffect(() => { if (loaded) storage.set("themeId", themeId); }, [themeId, loaded]);
  useEffect(() => { if (loaded) storage.set("tags",    tags);    }, [tags,    loaded]);
  useEffect(() => { if (loaded) { storage.set("todos", todos); storage.set("nextId", nextId.current); } }, [todos, loaded]);
  useEffect(() => { if (loaded) storage.set("selTag",  selectedTag); }, [selectedTag, loaded]);

  // ── Tag validity guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (!tags.find(tg => tg.id === selectedTag) && tags.length > 0) setSelectedTag(tags[0].id);
    if (filter !== "all" && !tags.find(tg => tg.id === filter)) setFilter("all");
  }, [tags]);

  // ── Native deadline notifications ─────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    todos.forEach(async todo => {
      if (!todo.done && todo.deadline) {
        if (notifMap.current[todo.id]) await cancelNotification(notifMap.current[todo.id]);
        await scheduleDeadlineNotification(todo, 30);
        notifMap.current[todo.id] = todo.id;
      }
    });
  }, [todos, loaded]);

  // ── In-app 30-min reminder ───────────────────────────────────────────────
  useEffect(() => {
    notifTimer.current = setInterval(() => {
      const now = new Date();
      todos.forEach(todo => {
        if (!todo.done && todo.deadline) {
          const diff = (new Date(todo.deadline) - now) / 60000;
          if (diff > 0 && diff <= 30)
            setNotification(`「${todo.text}」の締め切りまで約${Math.ceil(diff)}分です！⏰`);
        }
      });
    }, 60000);
    return () => clearInterval(notifTimer.current);
  }, [todos]);

  // ── Voice input (interim results for faster feedback) ─────────────────────
  const toggleVoice = useCallback(async () => {
    if (listening) {
      stopVoice.current?.();
      setListening(false);
      setInterimText("");
      return;
    }
    await haptics.light();
    setListening(true);
    stopVoice.current = startListening({
      onResult:  text => { setInput(prev => prev + text); setInterimText(""); },
      onInterim: text => setInterimText(text),
      onEnd:     () => { setListening(false); setInterimText(""); },
      onError:   e  => {
        setListening(false);
        setInterimText("");
        if (e === "unsupported")
          alert("このブラウザは音声入力に対応していません（ChromeかSafariをお使いください）");
      },
    });
  }, [listening]);

  // ── Keyboard control during voice input ──────────────────────────────────
  useEffect(() => {
    if (listening) {
      wasListening.current = true;
      inputRef.current?.blur();
    } else if (wasListening.current) {
      wasListening.current = false;
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [listening]);

  // ── Location ──────────────────────────────────────────────────────────────
  const handleLocationClick = useCallback(() => {
    if (userLoc) { setShowLocModal(true); return; }
    if (!navigator.geolocation) { alert("このブラウザは位置情報に対応していません"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        setShowLocModal(true);
      },
      (err) => {
        setLocLoading(false);
        alert("位置情報の取得に失敗しました: " + err.message);
      },
      { timeout: 10000 }
    );
  }, [userLoc]);

  const isGrocery = useCallback((text) => {
    return GROCERY_KEYWORDS.some(kw => text.includes(kw));
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addTodo = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedTag) return;
    await haptics.light();
    setTodos(prev => [{
      id: nextId.current++, text, done: false,
      tagId: selectedTag, priority, deadline, repeat, createdAt: Date.now(),
      price: null, memo: null, storePrices: [],
    }, ...prev]);
    setInput(""); setDeadline(null); setPriority("none"); setRepeat(null); setShowCal(false); setShowRepeat(false);
    inputRef.current?.focus();
  }, [input, selectedTag, priority, deadline, repeat]);

  const toggleTodo = async id => {
    const todo = todos.find(td => td.id === id);
    await (todo?.done ? haptics.light() : haptics.success());
    setAnimId(id); setTimeout(() => setAnimId(null), 400);

    // 繰り返しタスクを完了したとき次回分を追加
    if (todo && !todo.done && todo.repeat) {
      const nextDeadline = calcNextDeadline(todo.repeat, todo.deadline || Date.now());
      const nextTodo = {
        ...todo,
        id: nextId.current++,
        done: false,
        deadline: nextDeadline,
        createdAt: Date.now(),
      };
      setTodos(prev => [nextTodo, ...prev.map(td => td.id === id ? { ...td, done: true } : td)]);
    } else {
      setTodos(prev => prev.map(td => td.id === id ? { ...td, done: !td.done } : td));
    }
  };

  const deleteTodo = async id => {
    await haptics.medium();
    if (notifMap.current[id]) { await cancelNotification(notifMap.current[id]); delete notifMap.current[id]; }
    setTodos(prev => prev.filter(td => td.id !== id));
  };

  const saveEdit = async updated => {
    await haptics.success();
    setTodos(prev => prev.map(td => td.id === updated.id ? updated : td));
    setEditTodo(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getTag = id => tags.find(tg => tg.id === id);

  const applyViewFilter = (todoList) => {
    switch (sideView) {
      case "today":    return todoList.filter(td => isToday(td.deadline));
      case "tomorrow": return todoList.filter(td => isTomorrow(td.deadline));
      case "week":     return todoList.filter(td => isThisWeek(td.deadline));
      default:         return todoList;
    }
  };

  const filtered = applyViewFilter(todos)
    .filter(td => (filter === "all" || td.tagId === filter) && (showDone || !td.done))
    .sort((a, b) => {
      if (sortBy === "priority") return (PRIORITY_CONFIG[a.priority||"none"].order) - (PRIORITY_CONFIG[b.priority||"none"].order);
      if (sortBy === "deadline") {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return b.createdAt - a.createdAt;
    });

  const doneCount  = todos.filter(td => td.done).length;
  const totalCount = todos.length;
  const progress   = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100svh", background: t.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif",
      transition: "background 0.3s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .todo-item{transition:all 0.22s cubic-bezier(.4,0,.2,1);}
        @keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}
        .pop{animation:pop 0.35s cubic-bezier(.4,0,.2,1);}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .slide-in{animation:slideIn 0.22s ease forwards;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pulse{animation:pulse 1s ease-in-out infinite;}
        button{cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;}
        input,textarea,select{font-family:inherit;}
        input:focus,textarea:focus,select:focus{outline:none;}
      `}</style>

      {showTagEd && <TagEditorModal tags={tags} onClose={() => setShowTagEd(false)} onSave={tgs => { setTags(tgs); setShowTagEd(false); }} theme={t}/>}
      {editTodo  && <TodoDetailModal todo={editTodo} todos={todos} tags={tags} onClose={() => setEditTodo(null)} onSave={saveEdit} theme={t}/>}
      {showLocModal && userLoc && <LocationModal lat={userLoc.lat} lng={userLoc.lng} onClose={() => setShowLocModal(false)} theme={t}/>}
      <Assistant todos={todos} onDismiss={() => setNotification(null)} notification={notification}/>

      {/* Main content — full width, single column */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:"100svh", paddingBottom: kbHeight }}>

        {/* Header */}
        <div style={{ padding:"10px 16px 8px", background:t.headerCard, borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, zIndex:50 }}>
          {/* Row 1: app title + progress + location btn */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontSize:24, lineHeight:1 }}>🐱</span>
              <div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:t.sub, letterSpacing:3, marginBottom:1 }}>MY TASKS</div>
                <div style={{ lineHeight:1.1 }}>
                  <span style={{ fontSize:20, fontWeight:900, letterSpacing:-0.5, background:"linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", display:"inline" }}>それな！</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, letterSpacing:1, background:"linear-gradient(135deg,#7c6af7,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", display:"inline" }}>Todo</span>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4, flexShrink:0 }}>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:17, fontWeight:700, color:"#7c6af7" }}>{progress}<span style={{ fontSize:9,color:t.subDim }}>%</span></span>
              <span style={{ fontSize:11,color:t.sub }}>{doneCount}/{totalCount}</span>
            </div>
            <button onClick={handleLocationClick}
              title="周辺お買得情報"
              style={{ background: locLoading ? "rgba(124,106,247,0.2)" : "linear-gradient(135deg,#f97316,#fb923c)", border:"none", borderRadius:10, color:"#fff", padding:"6px 10px", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:4, flexShrink:0, boxShadow:"0 2px 8px rgba(249,115,22,0.4)" }}>
              {locLoading ? "⌛" : "🏷️"}<span style={{whiteSpace:"nowrap"}}>周辺お買得情報</span>
            </button>
          </div>
          {/* Row 2: theme switcher */}
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <ThemeSwitcher currentThemeId={themeId} onChange={setThemeId} size={22}/>
          </div>
        </div>

        {/* View Tabs */}
        <ViewTabs todos={todos} currentView={sideView} onViewChange={setSideView} theme={t}/>

        {/* Progress bar */}
        <div style={{ height:3, background:isLight?"rgba(0,0,0,0.06)":"#1e1e28" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#7c6af7,#a78bfa)", transition:"width 0.5s cubic-bezier(.4,0,.2,1)" }}/>
        </div>

        {/* Input area */}
        <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${t.border}`, background:t.card }}>
          <div style={{ position:"relative", display:"flex", gap:8, background:t.inputBg, borderRadius:14, padding:"4px 6px 4px 14px", border:`1px solid ${t.inputBorder}`, alignItems:"center" }}>
            <input ref={inputRef} readOnly={listening} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTodo()}
              placeholder={listening ? (interimText || "聞いています…") : "新しいタスクを入力…"} enterKeyHint="done"
              style={{ flex:1,background:"transparent",border:"none",color:t.text,fontSize:14,padding:"10px 0",minWidth:0 }}/>
            {interimText && (
              <span style={{ position:"absolute", bottom:"calc(100% + 4px)", left:14, fontSize:12, color:"#a78bfa", background:t.card, padding:"2px 8px", borderRadius:6, border:`1px solid rgba(124,106,247,0.3)`, pointerEvents:"none", whiteSpace:"nowrap", maxWidth:"80vw", overflow:"hidden", textOverflow:"ellipsis" }}>
                {interimText}
              </span>
            )}
            <button onClick={toggleVoice} className={listening?"pulse":""}
              style={{ background:listening?"rgba(248,113,113,0.2)":t.chipOff,border:"none",borderRadius:9,color:listening?"#f87171":t.sub,padding:"9px 10px",display:"flex",alignItems:"center",flexShrink:0 }}>
              <MicIcon active={listening}/>
            </button>
            <button onClick={()=>setShowCal(v=>!v)}
              style={{ background:deadline?"rgba(124,106,247,0.2)":t.chipOff,border:"none",borderRadius:9,color:deadline?"#a78bfa":t.sub,padding:"9px 10px",display:"flex",alignItems:"center",flexShrink:0 }}>
              <CalIcon size={15}/>
            </button>
            <button onClick={()=>setShowRepeat(v=>!v)}
              style={{ background:repeat?"rgba(124,106,247,0.2)":t.chipOff,border:"none",borderRadius:9,color:repeat?"#a78bfa":t.sub,padding:"9px 10px",display:"flex",alignItems:"center",flexShrink:0 }}
              title="繰り返し設定">
              <RepeatIcon size={15}/>
            </button>
            <button onClick={addTodo}
              style={{ background:"linear-gradient(135deg,#7c6af7,#a78bfa)",color:"#fff",border:"none",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:700,whiteSpace:"nowrap",flexShrink:0 }}>
              ＋ 追加
            </button>
          </div>

          {showCal && (
            <div style={{ marginTop:8 }}>
              <MiniCalendar value={deadline} onChange={v=>setDeadline(v)} theme={t}/>
              {deadline && (
                <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"rgba(124,106,247,0.1)",borderRadius:10 }}>
                  <CalIcon size={12}/><span style={{ fontSize:12,color:"#a78bfa" }}>締め切り: {fmtDate(deadline)}</span>
                  <button onClick={()=>setDeadline(null)} style={{ background:"transparent",border:"none",color:t.sub,marginLeft:"auto",display:"flex",padding:2 }}><XIcon size={12}/></button>
                </div>
              )}
            </div>
          )}

          {showRepeat && (
            <div style={{ marginTop:8, padding:"10px 12px", background:t.inputBg, borderRadius:12, border:`1px solid ${t.inputBorder}` }}>
              <div style={{ fontSize:11, color:t.sub, fontWeight:600, marginBottom:8 }}>🔁 繰り返し</div>
              <RepeatPicker value={repeat} onChange={setRepeat} theme={t}/>
              {repeat && (
                <div style={{ marginTop:6, fontSize:12, color:"#a78bfa" }}>🔁 {getRepeatLabel(repeat)}</div>
              )}
            </div>
          )}

          <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center" }}>
            {tags.map(tg=>(
              <button key={tg.id} onClick={()=>setSelectedTag(tg.id)}
                style={{ background:selectedTag===tg.id?tg.color:t.chipOff,color:selectedTag===tg.id?"#111":t.chipOffText,border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600 }}>{tg.label}</button>
            ))}
            <div style={{ width:"1px",height:16,background:t.border,margin:"0 2px" }}/>
            {["high","medium","low"].map(k=>{
              const v=PRIORITY_CONFIG[k];
              return <button key={k} onClick={()=>setPriority(priority===k?"none":k)}
                style={{ background:priority===k?v.bg:t.chipOff,color:priority===k?v.color:t.sub,border:priority===k?`1px solid ${v.color}50`:"1px solid transparent",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700 }}>{v.label}</button>;
            })}
            <button onClick={()=>setShowTagEd(true)}
              style={{ background:t.chipOff,color:t.sub,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,display:"flex",alignItems:"center",gap:4,marginLeft:"auto" }}>
              <TagIcon size={11}/> タグ管理
            </button>
          </div>
        </div>

        {/* Filter + Sort */}
        <div style={{ padding:"9px 12px",display:"flex",gap:5,alignItems:"center",borderBottom:`1px solid ${t.border}`,overflowX:"auto",background:t.card }}>
          {[{id:"all",label:"すべて"},...tags].map(tg=>(
            <button key={tg.id} onClick={()=>setFilter(tg.id)}
              style={{ background:filter===tg.id?"rgba(124,106,247,0.18)":"transparent",color:filter===tg.id?"#a78bfa":t.sub,border:filter===tg.id?"1px solid rgba(124,106,247,0.35)":"1px solid transparent",borderRadius:8,padding:"4px 11px",fontSize:12,fontWeight:500,whiteSpace:"nowrap" }}>{tg.label}</button>
          ))}
          <div style={{ marginLeft:"auto",display:"flex",gap:4,flexShrink:0 }}>
            {[{k:"created",l:"新着"},{k:"priority",l:"優先度"},{k:"deadline",l:"期限"}].map(({k,l})=>(
              <button key={k} onClick={()=>setSortBy(k)}
                style={{ background:sortBy===k?isLight?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.08)":"transparent",color:sortBy===k?t.text:t.subDim,border:"none",borderRadius:7,padding:"3px 8px",fontSize:11 }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Todo list */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px 16px 24px", background:t.card }}>
          {filtered.length===0 && <div style={{ textAlign:"center",color:t.subDim,fontSize:13,padding:"36px 0" }}>タスクがありません 🎉</div>}
          {filtered.map(todo=>{
            const tag    = getTag(todo.tagId);
            const color  = tag?.color ?? "#e2e8f0";
            const pConf  = PRIORITY_CONFIG[todo.priority||"none"];
            const overdue   = !todo.done && isPast(todo.deadline);
            const todayDue  = !todo.done && isToday(todo.deadline) && !overdue;
            const repeatLabel = getRepeatLabel(todo.repeat);
            const showGrocery = userLoc && isGrocery(todo.text);
            const hasPrice = todo.price || (todo.storePrices?.length > 0);
            return (
              <div key={todo.id} className={`todo-item slide-in${animId===todo.id?" pop":""}`} style={{
                display:"flex",alignItems:"flex-start",gap:10,
                padding:"11px 12px",borderRadius:14,marginBottom:6,
                background:overdue?"rgba(248,113,113,0.06)":todo.done?isLight?"rgba(0,0,0,0.02)":"rgba(255,255,255,0.02)":isLight?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.04)",
                border:`1px solid ${overdue?"rgba(248,113,113,0.2)":todayDue?"rgba(251,191,36,0.2)":t.border}`,
                opacity:todo.done?0.5:1,
              }}>
                <button onClick={()=>toggleTodo(todo.id)}
                  style={{ width:28,height:28,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:todo.done?"linear-gradient(135deg,#7c6af7,#a78bfa)":t.chipOff,color:todo.done?"#fff":t.sub,border:"none",marginTop:1 }}>
                  <CheckIcon done={todo.done}/>
                </button>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14,color:todo.done?t.sub:t.text,textDecoration:todo.done?"line-through":"none",wordBreak:"break-word",lineHeight:1.5 }}>{todo.text}</span>
                    {showGrocery && (
                      <span style={{ fontSize:10, background:"rgba(251,146,60,0.2)", color:"#fb923c", borderRadius:5, padding:"1px 6px", fontWeight:700, flexShrink:0 }}>🛒</span>
                    )}
                  </div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginTop:5,alignItems:"center" }}>
                    {tag && <span style={{ fontSize:10,fontWeight:600,color,background:`${color}18`,borderRadius:5,padding:"1px 7px" }}>{tag.label}</span>}
                    {todo.priority&&todo.priority!=="none"&&<span style={{ fontSize:10,fontWeight:700,color:pConf.color,background:pConf.bg,borderRadius:5,padding:"1px 7px" }}>{pConf.label}優先</span>}
                    {todo.deadline&&<span style={{ fontSize:10,color:overdue?"#f87171":todayDue?"#fbbf24":t.sub,display:"flex",alignItems:"center",gap:3 }}><ClockIcon/>{fmtDate(todo.deadline)}{overdue?" 期限切れ":todayDue?" 今日期限":""}</span>}
                    {repeatLabel && (
                      <span style={{ fontSize:10, color:"#a78bfa", display:"flex", alignItems:"center", gap:2 }}>
                        <RepeatIcon size={10}/> {repeatLabel}
                      </span>
                    )}
                    {todo.price && (
                      <span style={{ fontSize:10, background:"rgba(251,191,36,0.15)", color:"#fbbf24", borderRadius:5, padding:"1px 7px", fontWeight:600 }}>💰 {fmtPrice(todo.price)}</span>
                    )}
                  </div>
                  {todo.storePrices?.length > 0 && (
                    <div style={{ marginTop:4, display:"flex", flexWrap:"wrap", gap:6 }}>
                      {todo.storePrices.map((sp, i) => sp.store && (
                        <span key={i} style={{ fontSize:10, color:t.sub }}>🏪 {sp.store}{sp.price ? `: ${fmtPrice(sp.price)}` : ""}</span>
                      ))}
                    </div>
                  )}
                  {todo.memo && (
                    <div style={{ marginTop:4, fontSize:11, color:t.sub, fontStyle:"italic" }}>📝 {todo.memo}</div>
                  )}
                </div>
                <div style={{ display:"flex",gap:5,flexShrink:0,marginTop:1 }}>
                  <button onClick={()=>setEditTodo(todo)} style={{ background:t.chipOff,border:"none",color:t.sub,padding:"7px 8px",borderRadius:8,display:"flex",alignItems:"center" }}><EditIcon size={16}/></button>
                  <button onClick={()=>deleteTodo(todo.id)} style={{ background:"rgba(248,113,113,0.12)",border:"none",color:"#f87171",padding:"7px 8px",borderRadius:8,display:"flex",alignItems:"center" }}><TrashIcon size={16}/></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 16px 14px",borderTop:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:t.card }}>
          <span style={{ fontSize:11,color:t.subDim,fontFamily:"'Space Mono',monospace" }}>{todos.filter(td=>!td.done).length} tasks left</span>
          <div style={{ display:"flex",gap:4,alignItems:"center" }}>
            <button onClick={()=>setShowDone(v=>!v)} style={{ background:"transparent",border:"none",color:showDone?t.subDim:"#a78bfa",fontSize:11,padding:"3px 6px",borderRadius:6 }}>{showDone?"完了を隠す":"完了を表示"}</button>
            {doneCount>0&&<button onClick={async()=>{await haptics.medium();setTodos(p=>p.filter(td=>!td.done));}} style={{ background:"transparent",border:"none",color:t.subDim,fontSize:11,padding:"3px 6px",borderRadius:6 }} onMouseEnter={e=>e.target.style.color="#f87171"} onMouseLeave={e=>e.target.style.color=t.subDim}>完了済みを削除</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
