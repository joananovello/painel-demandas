import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Users, Building2, BookOpen, Heart, Zap, Plus, Trash2, Check, Clock, AlertTriangle, X, Settings, CalendarClock, CircleDot, Repeat, PauseCircle, PlayCircle, FileText, Printer, Copy, Download, Link2, Key, Eye, EyeOff, ExternalLink, StickyNote, Pencil, ListChecks, LogOut } from "lucide-react";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const KEY = "novello-dashboard-v1";

const URG = {
  alta: { label: "Alta", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", lb: "border-l-red-400", rank: 3 },
  media: { label: "Média", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", lb: "border-l-amber-400", rank: 2 },
  baixa: { label: "Baixa", dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", lb: "border-l-green-400", rank: 1 },
};

const SCOPE = { semana: "Semana", mes: "Mês", pontual: "Pontual" };
const REC = { none: "Não repete", daily: "Diária", weekly: "Semanal", biweekly: "Quinzenal", monthly: "Mensal" };

const AREAS = {
  cliente: { label: "Clientes", icon: Users },
  acohub: { label: "Acohub", icon: Building2 },
  novello: { label: "@novellonaestante", icon: BookOpen },
  pessoal: { label: "Pessoal", icon: Heart },
  freela: { label: "Freelas", icon: Zap },
};

const TABS = [
  { id: "hoje", label: "Hoje", icon: CalendarClock },
  { id: "cliente", label: "Clientes", icon: Users },
  { id: "acohub", label: "Acohub", icon: Building2 },
  { id: "novello", label: "@novellonaestante", icon: BookOpen },
  { id: "pessoal", label: "Pessoal", icon: Heart },
  { id: "freela", label: "Freelas", icon: Zap },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "relatorio", label: "Relatório", icon: FileText },
];

const pad = (n) => String(n).padStart(2, "0");
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const TODAY = toKey(today0());
const fmtBR = (k) => { if (!k) return ""; const [y, m, d] = k.split("-"); return `${d}/${m}`; };
const uid = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();
const localDay = (iso) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; d.setHours(0, 0, 0, 0); return toKey(d); };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const monthName = (k) => (k ? cap(fromKey(k).toLocaleDateString("pt-BR", { month: "long" })) : "");
const daysSince = (iso) => { if (!iso) return 0; const d = new Date(iso); d.setHours(0, 0, 0, 0); return Math.floor((today0() - d) / 86400000); };
const href = (u) => (!u ? "#" : /^https?:\/\//i.test(u) ? u : `https://${u}`);
const advanceDate = (key, rec) => {
  const d = fromKey(key);
  if (rec === "daily") d.setDate(d.getDate() + 1);
  else if (rec === "weekly") d.setDate(d.getDate() + 7);
  else if (rec === "biweekly") d.setDate(d.getDate() + 14);
  else if (rec === "monthly") d.setMonth(d.getMonth() + 1);
  return toKey(d);
};
const dlExtra = (t) => (t.deadline && !t.done ? <span className="text-xs text-slate-400 whitespace-nowrap">{fmtBR(t.deadline)}</span> : null);

const emptyData = { settings: { workHours: 8, stuckDays: 7 }, clients: [], tasks: [], meetings: [] };
const migTasks = (ts) => (ts || []).map((t) => ({ status: "ativa", recurrence: "none", createdAt: nowISO(), statusSince: nowISO(), ...t, subtasks: (t.subtasks || []).map((s) => ({ estTime: 0, ...s })), notes: t.notes || "", doneDate: t.doneDate || (t.done ? (localDay(t.completedAt) || TODAY) : null) }));
const migClients = (cs) => (cs || []).map((c) => ({ links: [], creds: [], notes: "", ...c }));

function collectUnits(tasks) {
  const units = [];
  for (const t of tasks) {
    if (t.done || t.status === "espera") continue;
    const allSubs = t.subtasks || [];
    const schSubs = allSubs.filter((s) => !s.done && s.deadline && (s.estTime || 0) > 0);
    if (allSubs.length > 0 && schSubs.length > 0) {
      for (const s of schSubs) units.push({ id: `${t.id}::${s.id}`, taskId: t.id, subId: s.id, deadline: s.deadline, estTime: s.estTime, urgency: t.urgency });
    } else if (t.deadline && (t.estTime || 0) > 0) {
      units.push({ id: t.id, taskId: t.id, subId: null, deadline: t.deadline, estTime: t.estTime, urgency: t.urgency });
    }
  }
  return units;
}

function buildSchedule(tasks, meetings, workHours) {
  const meetingHours = {};
  meetings.forEach((m) => { meetingHours[m.date] = (meetingHours[m.date] || 0) + (m.durationMin || 0) / 60; });

  const units = collectUnits(tasks);
  const perUnitToday = {};
  if (units.length) {
    const maxKey = units.reduce((mx, u) => (u.deadline > mx ? u.deadline : mx), TODAY);
    const days = [];
    let cur = fromKey(TODAY);
    const end = fromKey(maxKey);
    while (cur <= end) { days.push(toKey(cur)); cur.setDate(cur.getDate() + 1); }
    const remaining = days.map((k) => Math.max(0, workHours - (meetingHours[k] || 0)));
    const sorted = [...units].sort((a, b) => a.deadline.localeCompare(b.deadline) || URG[b.urgency].rank - URG[a.urgency].rank);
    for (const u of sorted) {
      let need = u.estTime;
      let dlIdx = days.indexOf(u.deadline);
      if (dlIdx === -1) dlIdx = 0;
      let i = dlIdx;
      while (need > 0 && i >= 0) {
        const give = Math.min(remaining[i], need);
        remaining[i] -= give; need -= give;
        if (i === 0) perUnitToday[u.id] = (perUnitToday[u.id] || 0) + give;
        i--;
      }
      if (need > 0) perUnitToday[u.id] = (perUnitToday[u.id] || 0) + need;
    }
  }
  return { perUnitToday, meetingHours, units };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-violet-600">Carregando...</div>;
  if (!session) return <Login />;
  return <Painel session={session} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr("E-mail ou senha incorretos.");
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-violet-900 mb-1">Painel de Demandas</h1>
        <p className="text-xs text-violet-500 mb-4">Entre para acessar</p>
        <label className="block text-sm font-medium mb-1">E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1">Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3" />
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button onClick={submit} disabled={busy} className="w-full bg-violet-600 text-white rounded-lg py-2 font-medium hover:bg-violet-700 disabled:opacity-60">{busy ? "Entrando..." : "Entrar"}</button>
      </div>
    </div>
  );
}

function Painel({ session }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hoje");
  const [showSettings, setShowSettings] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: row } = await supabase.from("painel").select("data").eq("user_id", session.user.id).maybeSingle();
        if (row && row.data) {
          const p = row.data;
          p.tasks = migTasks(p.tasks);
          p.clients = migClients(p.clients);
          p.settings = { workHours: 8, stuckDays: 7, ...(p.settings || {}) };
          setData({ ...emptyData, ...p });
        }
      } catch (e) {}
      loaded.current = true;
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("painel").upsert({ user_id: session.user.id, data, updated_at: new Date().toISOString() }).then(() => {});
    }, 800);
  }, [data]);

  const logout = () => supabase.auth.signOut();

  const sched = useMemo(() => buildSchedule(data.tasks, data.meetings, data.settings.workHours), [data]);

  const addTask = (t) => setData((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), done: false, status: "ativa", recurrence: "none", notes: "", subtasks: [], createdAt: nowISO(), statusSince: nowISO(), ...t }] }));
  const editTask = (id, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const editSubtask = (taskId, subId, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, ...patch } : s)) } : t)) }));
  const toggleTask = (id) => setData((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return d;
    const becomingDone = !t.done;
    let tasks = d.tasks.map((x) => (x.id === id ? { ...x, done: becomingDone, completedAt: becomingDone ? nowISO() : null, doneDate: becomingDone ? TODAY : null } : x));
    if (becomingDone && t.recurrence && t.recurrence !== "none
