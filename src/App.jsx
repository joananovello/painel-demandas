import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Users, Building2, BookOpen, Heart, Zap, Plus, Trash2, Check, Clock, AlertTriangle, X, Settings, CalendarClock, CircleDot, Repeat, PauseCircle, PlayCircle, FileText, Printer, Copy, Download, Link2, Key, Eye, EyeOff, ExternalLink, StickyNote, Pencil, ListChecks, LogOut, GripVertical, Star } from "lucide-react";

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
const weekOfMonth = (key) => {
  const d = fromKey(key || TODAY);
  return Math.min(5, Math.ceil(d.getDate() / 7));
};
const TODAY_WEEK = weekOfMonth(TODAY);
const dlExtra = (t) => (t.deadline && !t.done ? <span className="text-xs text-slate-400 whitespace-nowrap">{fmtBR(t.deadline)}</span> : null);

const emptyData = { settings: { workHours: 8, stuckDays: 7 }, clients: [], tasks: [], meetings: [], priorities: [] };
const migTasks = (ts) => (ts || []).map((t) => ({
  status: "ativa", recurrence: "none", createdAt: nowISO(), statusSince: nowISO(), ...t,
  subtasks: (t.subtasks || []).map((s) => ({ estTime: 0, workDate: null, externalOwner: false, ownerName: "", ...s })),
  notes: t.notes || "",
  doneDate: t.doneDate || (t.done ? (localDay(t.completedAt) || TODAY) : null),
  workDate: t.workDate || null,
  externalOwner: t.externalOwner || false,
  ownerName: t.ownerName || "",
}));
const migClients = (cs) => (cs || []).map((c) => ({ links: [], creds: [], notes: "", socialMonths: [], ...c }));

const POST_TIPOS = ["Arte única", "Carrossel", "Reels", "Stories", "BTS", "WhatsApp", "Artigo LinkedIn", "Outro"];
const POST_STATUS = {
  em_copy: { label: "Em copy", bg: "bg-slate-100", text: "text-slate-600" },
  add_conteudo: { label: "Add conteúdo", bg: "bg-zinc-100", text: "text-zinc-600" },
  criar_arte: { label: "Criar arte", bg: "bg-purple-100", text: "text-purple-700" },
  gravar: { label: "Gravar", bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  editar: { label: "Editar", bg: "bg-indigo-100", text: "text-indigo-700" },
  alteracao: { label: "Alteração", bg: "bg-orange-100", text: "text-orange-700" },
  aprovacao: { label: "Aprovação", bg: "bg-amber-100", text: "text-amber-700" },
  programado: { label: "Programado", bg: "bg-blue-100", text: "text-blue-700" },
  postado: { label: "Postado", bg: "bg-green-100", text: "text-green-700" },
  cancelado: { label: "Cancelado", bg: "bg-red-100", text: "text-red-600" },
};
const POST_STATUS_DEFAULT = "em_copy";

// Ordem do fluxo de produção. O tempo restante de um post é a soma das etapas daqui pra frente.
const STAGE_ORDER = ["em_copy", "add_conteudo", "criar_arte", "gravar", "editar", "alteracao", "aprovacao", "programado"];
const STAGE_DONE = ["postado", "cancelado"];

// Horas de cada etapa, por tipo de post. 0 = essa etapa não se aplica a esse tipo.
const STAGE_HOURS = {
  "Arte única":      { em_copy: 0.5,  add_conteudo: 0.25, criar_arte: 1,    gravar: 0,   editar: 0,   alteracao: 0.5,  aprovacao: 0.25, programado: 0.25 },
  "Carrossel":       { em_copy: 0.75, add_conteudo: 0.25, criar_arte: 1.5,  gravar: 0,   editar: 0,   alteracao: 0.5,  aprovacao: 0.25, programado: 0.25 },
  "Reels":           { em_copy: 0.5,  add_conteudo: 0.25, criar_arte: 0,    gravar: 1,   editar: 1.5, alteracao: 0.5,  aprovacao: 0.25, programado: 0.25 },
  "Stories":         { em_copy: 0.25, add_conteudo: 0.25, criar_arte: 0.5,  gravar: 0.25, editar: 0.25, alteracao: 0.25, aprovacao: 0,   programado: 0.25 },
  "BTS":             { em_copy: 0,    add_conteudo: 0.25, criar_arte: 0,    gravar: 0.5, editar: 0.5, alteracao: 0.25, aprovacao: 0,    programado: 0.25 },
  "WhatsApp":        { em_copy: 0.5,  add_conteudo: 0.25, criar_arte: 0.5,  gravar: 0,   editar: 0,   alteracao: 0.25, aprovacao: 0.25, programado: 0.25 },
  "Artigo LinkedIn": { em_copy: 2,    add_conteudo: 0.5,  criar_arte: 0.25, gravar: 0,   editar: 0,   alteracao: 0.5,  aprovacao: 0.25, programado: 0.25 },
  "Outro":           { em_copy: 0.5,  add_conteudo: 0.25, criar_arte: 0.75, gravar: 0,   editar: 0,   alteracao: 0.5,  aprovacao: 0.25, programado: 0.25 },
};

// Quanto ainda falta de trabalho num post, dado o tipo e o status atual.
function postRemainingHours(post) {
  if (!post || post.externalOwner) return 0;
  if (STAGE_DONE.includes(post.status)) return 0;
  if (typeof post.estTime === "number" && post.estTime > 0) return post.estTime; // override manual
  const tabela = STAGE_HOURS[post.tipo] || STAGE_HOURS["Outro"];
  const i = STAGE_ORDER.indexOf(post.status);
  if (i === -1) return 0;
  return STAGE_ORDER.slice(i).reduce((s, st) => s + (tabela[st] || 0), 0);
}

// Interpreta uma linha colada: extrai data (dd/mm ou dd/mm/aaaa), tipo (se houver) e descrição.
// Aceita separadores: | , TAB, ou a data solta no início da linha.
function parsePostLine(raw) {
  let linha = raw.trim();
  if (!linha) return null;

  // Quebra por | ou TAB, se houver
  let partes = linha.includes("|") ? linha.split("|") : (linha.includes("\t") ? linha.split("\t") : null);
  if (partes) partes = partes.map((p) => p.trim()).filter((p) => p.length > 0);

  let dateStr = "", resto = "";
  const reData = /^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/;

  if (partes && partes.length > 1) {
    const m = partes[0].match(reData);
    if (m) { dateStr = partes[0]; resto = partes.slice(1).join(" - "); }
    else { resto = partes.join(" - "); }
  } else {
    // Data solta no início: "05/07 Carrossel de dicas"
    const m = linha.match(/^(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)\s+(.*)$/);
    if (m) { dateStr = m[1]; resto = m[2]; }
    else { resto = linha; }
  }

  // Converte a data
  let date = "";
  if (dateStr) {
    const m = dateStr.match(reData);
    if (m) {
      const dia = Number(m[1]);
      const mes = Number(m[2]);
      let ano = m[3] ? Number(m[3]) : new Date().getFullYear();
      if (ano < 100) ano += 2000;
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) date = `${ano}-${pad(mes)}-${pad(dia)}`;
    }
  }

  // Detecta o tipo, se a primeira palavra do resto for um tipo conhecido
  let tipo = "Arte única";
  const tokens = resto.split(/\s+|-\s/);
  const primeiro = (tokens[0] || "").replace(/[-:]/g, "").trim();
  const achado = POST_TIPOS.find((tp) => tp.toLowerCase() === primeiro.toLowerCase() || tp.toLowerCase().startsWith(primeiro.toLowerCase()) && primeiro.length > 3);
  if (achado && resto.length > primeiro.length) {
    tipo = achado;
    resto = resto.slice(resto.toLowerCase().indexOf(primeiro.toLowerCase()) + primeiro.length).replace(/^[\s\-:|]+/, "");
  }

  return { date, tipo, desc: resto.trim() };
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const ALLDAY_HOURS = 1;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) { resolve(); return; }
    const existing = document.getElementById("gsi-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.id = "gsi-script";
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar Google"));
    document.head.appendChild(s);
  });
}

async function fetchGoogleEvents(token) {
  const now = new Date();
  const end = new Date(); end.setDate(end.getDate() + 30);
  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erro ao buscar eventos");
  const json = await res.json();
  return (json.items || []).map((ev) => {
    const allDay = !ev.start?.dateTime;
    let date, start = "", durationMin = ALLDAY_HOURS * 60;
    if (allDay) {
      date = ev.start.date;
    } else {
      const sd = new Date(ev.start.dateTime);
      const ed = new Date(ev.end.dateTime);
      date = toKey(sd);
      start = `${pad(sd.getHours())}:${pad(sd.getMinutes())}`;
      durationMin = Math.max(0, Math.round((ed - sd) / 60000));
    }
    return { id: `g_${ev.id}`, title: ev.summary || "(sem título)", date, start, durationMin, allDay, google: true };
  }).filter((e) => e.date);
}

function collectUnits(tasks) {
  const units = [];
  for (const t of tasks) {
    if (t.done || t.status === "espera" || t.externalOwner) continue;
    const allSubs = t.subtasks || [];
    const schSubs = allSubs.filter((s) => !s.done && !s.externalOwner && s.deadline && (s.estTime || 0) > 0);
    if (allSubs.length > 0 && schSubs.length > 0) {
      for (const s of schSubs) units.push({ id: `${t.id}::${s.id}`, taskId: t.id, subId: s.id, deadline: s.deadline, estTime: s.estTime, urgency: t.urgency, workDate: s.workDate || null });
    } else if (t.deadline && (t.estTime || 0) > 0) {
      units.push({ id: t.id, taskId: t.id, subId: null, deadline: t.deadline, estTime: t.estTime, urgency: t.urgency, workDate: t.workDate || null });
    }
  }
  return units;
}

function collectPostUnits(clients) {
  const units = [];
  for (const c of clients || []) {
    for (const m of c.socialMonths || []) {
      if (m.done) continue;
      for (const p of m.posts || []) {
        const horas = postRemainingHours(p);
        if (!p.date || horas <= 0) continue;
        units.push({
          id: `post::${c.id}::${m.id}::${p.id}`,
          kind: "post",
          clientId: c.id, monthId: m.id, postId: p.id,
          deadline: p.date, estTime: horas, urgency: "media",
          workDate: p.workDate || null,
          post: p, clientName: c.name, monthName: m.name,
        });
      }
    }
  }
  return units;
}

function buildSchedule(tasks, meetings, workHours, clients = []) {
  const meetingHours = {};
  meetings.forEach((m) => { meetingHours[m.date] = (meetingHours[m.date] || 0) + (m.durationMin || 0) / 60; });
  const capOf = (k) => Math.max(0, workHours - (meetingHours[k] || 0));

  const units = [...collectUnits(tasks), ...collectPostUnits(clients)];
  const perUnitToday = {};
  const perDayHours = {};

  // 1) Itens com dia planejado manualmente: ficam inteiros naquele dia
  const manual = units.filter((u) => u.workDate);
  for (const u of manual) {
    const day = u.workDate < TODAY ? TODAY : u.workDate;
    perDayHours[day] = (perDayHours[day] || 0) + u.estTime;
    if (day === TODAY) perUnitToday[u.id] = (perUnitToday[u.id] || 0) + u.estTime;
  }

  // 2) Itens sem dia planejado: distribuídos automaticamente
  const auto = units.filter((u) => !u.workDate && u.deadline && u.estTime > 0);
  if (auto.length) {
    const maxKey = auto.reduce((mx, u) => (u.deadline > mx ? u.deadline : mx), TODAY);
    const days = [];
    let cur = fromKey(TODAY);
    const end = fromKey(maxKey);
    while (cur <= end) { days.push(toKey(cur)); cur.setDate(cur.getDate() + 1); }
    const remaining = days.map((k) => Math.max(0, capOf(k) - (perDayHours[k] || 0)));
    const sorted = [...auto].sort((a, b) => a.deadline.localeCompare(b.deadline) || URG[b.urgency].rank - URG[a.urgency].rank);
    for (const u of sorted) {
      let need = u.estTime;
      let dlIdx = days.indexOf(u.deadline);
      if (dlIdx === -1) dlIdx = 0;
      let i = dlIdx;
      while (need > 0 && i >= 0) {
        const give = Math.min(remaining[i], need);
        if (give > 0) { remaining[i] -= give; need -= give; perDayHours[days[i]] = (perDayHours[days[i]] || 0) + give; if (i === 0) perUnitToday[u.id] = (perUnitToday[u.id] || 0) + give; }
        i--;
      }
      if (need > 0) { perDayHours[TODAY] = (perDayHours[TODAY] || 0) + need; perUnitToday[u.id] = (perUnitToday[u.id] || 0) + need; }
    }
  }
  return { perUnitToday, perDayHours, meetingHours, units };
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
  const [googleEvents, setGoogleEvents] = useState([]);
  const [googleStatus, setGoogleStatus] = useState("idle"); // idle | connecting | connected | error
  const [googleMsg, setGoogleMsg] = useState("");
  const tokenClientRef = useRef(null);
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  const connectGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) { setGoogleStatus("error"); setGoogleMsg("Client ID do Google não configurado."); return; }
    setGoogleStatus("connecting"); setGoogleMsg("");
    try {
      await loadGoogleScript();
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: async (resp) => {
          if (resp.error) { setGoogleStatus("error"); setGoogleMsg("Permissão negada ou cancelada."); return; }
          try {
            const events = await fetchGoogleEvents(resp.access_token);
            setGoogleEvents(events);
            setGoogleStatus("connected");
            setGoogleMsg(`${events.length} eventos carregados.`);
          } catch (e) { setGoogleStatus("error"); setGoogleMsg("Erro ao buscar eventos da agenda."); }
        },
      });
      tokenClientRef.current.requestAccessToken();
    } catch (e) { setGoogleStatus("error"); setGoogleMsg("Não foi possível carregar o Google."); }
  };
  const disconnectGoogle = () => { setGoogleEvents([]); setGoogleStatus("idle"); setGoogleMsg(""); };

  const importGoogleEvents = () => {
    if (!googleEvents.length) return;
    setData((d) => {
      const meetings = [...d.meetings];
      let novos = 0, atualizados = 0;
      for (const ev of googleEvents) {
        const idx = meetings.findIndex((m) => m.googleId === ev.id);
        const payload = { title: ev.title, date: ev.date, start: ev.start, durationMin: ev.durationMin, googleId: ev.id, allDay: ev.allDay };
        if (idx === -1) { meetings.push({ id: uid(), ...payload }); novos++; }
        else {
          const cur = meetings[idx];
          if (cur.title !== ev.title || cur.date !== ev.date || cur.start !== ev.start || cur.durationMin !== ev.durationMin) {
            meetings[idx] = { ...cur, ...payload }; atualizados++;
          }
        }
      }
      setGoogleMsg(`Importados: ${novos} novos, ${atualizados} atualizados.`);
      return { ...d, meetings };
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: row } = await supabase.from("painel").select("data").eq("user_id", session.user.id).maybeSingle();
        if (row && row.data) {
          const p = row.data;
          p.tasks = migTasks(p.tasks);
          p.clients = migClients(p.clients);
          p.settings = { workHours: 8, stuckDays: 7, ...(p.settings || {}) };
          p.priorities = Array.isArray(p.priorities) ? p.priorities : [];
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

  const sched = useMemo(() => buildSchedule(data.tasks, data.meetings, data.settings.workHours, data.clients), [data]);

  const addTask = (t) => setData((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), done: false, status: "ativa", recurrence: "none", notes: "", subtasks: [], createdAt: nowISO(), statusSince: nowISO(), workDate: null, externalOwner: false, ownerName: "", ...t }] }));
  const editTask = (id, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const editSubtask = (taskId, subId, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, ...patch } : s)) } : t)) }));
  const toggleTask = (id) => setData((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return d;
    const becomingDone = !t.done;
    let tasks = d.tasks.map((x) => (x.id === id ? { ...x, done: becomingDone, completedAt: becomingDone ? nowISO() : null, doneDate: becomingDone ? TODAY : null } : x));
    if (becomingDone && t.recurrence && t.recurrence !== "none") {
      const base = t.deadline || TODAY;
      const next = advanceDate(base, t.recurrence);
      tasks = [...tasks, { ...t, id: uid(), done: false, status: "ativa", deadline: next, workDate: null, createdAt: nowISO(), statusSince: nowISO(), completedAt: null, doneDate: null, subtasks: (t.subtasks || []).map((s) => ({ ...s, id: uid(), done: false, doneDate: null, workDate: null })) }];
    }
    return { ...d, tasks };
  });
  const toggleSubtask = (taskId, subId) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done: !s.done, doneDate: !s.done ? TODAY : null } : s)) } : t)) }));
  const setStatus = (id, status) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status, statusSince: nowISO() } : t)) }));
  const delTask = (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  const addClient = (name) => setData((d) => ({ ...d, clients: [...d.clients, { id: uid(), name, links: [], creds: [], notes: "", socialMonths: [] }] }));
  const delClient = (id) => setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id), tasks: d.tasks.filter((t) => t.clientId !== id) }));
  const updateClient = (id, patch) => setData((d) => ({ ...d, clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const updatePostField = (clientId, monthId, postId, patch) => setData((d) => ({
    ...d,
    clients: d.clients.map((c) => c.id !== clientId ? c : {
      ...c,
      socialMonths: (c.socialMonths || []).map((m) => m.id !== monthId ? m : {
        ...m,
        posts: (m.posts || []).map((p) => p.id === postId ? { ...p, ...patch } : p),
      }),
    }),
  }));
  const addMeeting = (m) => setData((d) => ({ ...d, meetings: [...d.meetings, { id: uid(), ...m }] }));
  const editMeeting = (id, patch) => setData((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const delMeeting = (id) => setData((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
  const setSetting = (k, v) => setData((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const togglePriority = (id) => setData((d) => {
    const cur = d.priorities || [];
    if (cur.includes(id)) return { ...d, priorities: cur.filter((x) => x !== id) };
    if (cur.length >= 3) return { ...d, priorities: [...cur.slice(1), id] };
    return { ...d, priorities: [...cur, id] };
  });

  // Modelo: cria a demanda macro de social media (planejamento + análise) e o mês de posts vinculado.
  const criarModeloSocial = (clientId, nomeMes, refDate) => {
    const base = fromKey(refDate || TODAY);
    const ano = base.getFullYear(), mes = base.getMonth();
    const inicio = toKey(new Date(ano, mes, 1));
    const fim = toKey(new Date(ano, mes + 1, 0));
    const taskId = uid();
    const monthId = uid();
    const novaTask = {
      id: taskId, title: `Social media ${nomeMes}`, area: "cliente", clientId,
      scope: "mes", deadline: fim, estTime: 0, urgency: "media", recurrence: "none",
      done: false, status: "ativa", notes: "", createdAt: nowISO(), statusSince: nowISO(),
      workDate: null, externalOwner: false, ownerName: "",
      subtasks: [
        { id: uid(), title: "Planejamento do mês", deadline: inicio, estTime: 3, week: 1, done: false, workDate: null, externalOwner: false, ownerName: "" },
        { id: uid(), title: "Análise de dados do mês", deadline: fim, estTime: 2, week: 5, done: false, workDate: null, externalOwner: false, ownerName: "" },
      ],
    };
    setData((d) => ({
      ...d,
      tasks: [...d.tasks, novaTask],
      clients: d.clients.map((c) => c.id !== clientId ? c : {
        ...c,
        socialMonths: [...(c.socialMonths || []), { id: monthId, name: nomeMes, taskId, done: false, posts: [] }],
      }),
    }));
  };
  const restoreData = (p) => setData({ ...emptyData, ...p, tasks: migTasks(p.tasks), clients: migClients(p.clients), settings: { workHours: 8, stuckDays: 7, ...(p.settings || {}) } });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-violet-600">Carregando seus dados...</div>;
  const sd = data.settings.stuckDays;
  const detailTask = detailId ? data.tasks.find((t) => t.id === detailId) : null;
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const dataExt = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-violet-50 text-slate-800">
      <style>{`@media print { .no-print{display:none !important;} body{background:#fff;} }`}</style>
      <div className="flex">
        <aside className="no-print sticky top-0 h-screen w-16 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-1">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center mb-3 shrink-0 font-bold text-lg">P</div>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
                className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-violet-50 hover:text-violet-600"}`}>
                <Icon size={20} />
                <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">{t.label}</span>
              </button>
            );
          })}
          <div className="mt-auto flex flex-col items-center gap-1">
            <button onClick={() => setShowSettings(true)} title="Configurações" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:bg-violet-50 hover:text-violet-600"><Settings size={20} /></button>
            <button onClick={logout} title="Sair" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:bg-violet-50 hover:text-violet-600"><LogOut size={20} /></button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto p-4 md:p-6">
            <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-violet-900">{saudacao}, Joana! 👋</h1>
                <p className="text-sm text-violet-500 capitalize">{dataExt}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center gap-3">
                <Clock size={18} className="text-violet-500" />
                <div>
                  <p className="text-sm font-bold text-slate-700">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-xs text-slate-400 capitalize">{new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</p>
                </div>
              </div>
            </header>

            {tab === "hoje" && <Hoje data={data} sched={sched} toggleTask={toggleTask} toggleSubtask={toggleSubtask} editTask={editTask} editSubtask={editSubtask} setStatus={setStatus} onOpen={setDetailId} togglePriority={togglePriority} updatePostField={updatePostField} onGoClient={() => setTab("cliente")} />}
            {tab === "agenda" && <Agenda data={data} addMeeting={addMeeting} editMeeting={editMeeting} delMeeting={delMeeting} googleEvents={googleEvents} googleStatus={googleStatus} googleMsg={googleMsg} onConnectGoogle={connectGoogle} onDisconnectGoogle={disconnectGoogle} onImportGoogle={importGoogleEvents} />}
            {tab === "relatorio" && <Relatorio data={data} onRestore={restoreData} />}
            {tab === "cliente" && <Clientes data={data} addTask={addTask} toggleTask={toggleTask} delTask={delTask} setStatus={setStatus} addClient={addClient} delClient={delClient} updateClient={updateClient} stuckDays={sd} onOpen={setDetailId} onCriarModeloSocial={criarModeloSocial} />}
            {["acohub", "novello", "pessoal", "freela"].includes(tab) && (
              <AreaView area={tab} data={data} addTask={addTask} toggleTask={toggleTask} delTask={delTask} setStatus={setStatus} stuckDays={sd} onOpen={setDetailId} />
            )}
          </div>
        </main>
      </div>

      {detailTask && (
        <TaskDetail task={detailTask} data={data} onEdit={editTask} onToggle={toggleTask} onSetStatus={setStatus} onDelete={(id) => { delTask(id); setDetailId(null); }} onClose={() => setDetailId(null)} />
      )}

      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title="Configurações">
          <label className="block text-sm font-medium mb-1">Horas úteis por dia</label>
          <input type="number" min="1" max="16" step="0.5" value={data.settings.workHours}
            onChange={(e) => setSetting("workHours", Number(e.target.value) || 8)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4" />
          <label className="block text-sm font-medium mb-1">Avisar "parada" após quantos dias</label>
          <input type="number" min="1" max="60" value={data.settings.stuckDays}
            onChange={(e) => setSetting("stuckDays", Number(e.target.value) || 7)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          <p className="text-xs text-slate-500 mt-2">Demandas em espera ou sem prazo ganham um aviso laranja depois desse tempo paradas.</p>
        </Modal>
      )}
    </div>
  );
}

function subProgress(t) {
  const subs = t.subtasks || [];
  if (!subs.length) return null;
  return `${subs.filter((s) => s.done).length}/${subs.length}`;
}

function Card({ t, data, onToggle, onStatus, onOpen, onSetDoneDate, stuckDays, todayHours, draggable, onDragStart, onTogglePriority, isPriority }) {
  const u = URG[t.urgency];
  const client = t.clientId ? data.clients.find((c) => c.id === t.clientId) : null;
  const tag = t.area === "cliente" ? (client ? client.name : "Cliente") : AREAS[t.area].label;
  const recurring = t.recurrence && t.recurrence !== "none";
  const stuck = !t.done && stuckDays && (t.status === "espera" || !t.deadline) && daysSince(t.statusSince) >= stuckDays;
  const overdue = !t.done && t.deadline && t.deadline < TODAY;
  const latePlan = t.workDate && t.deadline && t.workDate > t.deadline;
  const prog = subProgress(t);
  return (
    <div
      draggable={draggable || undefined}
      onDragStart={onDragStart}
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${u.lb} p-2 mb-2 ${draggable ? "cursor-move" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        {draggable && <GripVertical size={12} className="text-slate-300 mt-0.5 shrink-0" />}
        {onToggle && (
          <button onClick={() => onToggle(t.id)} className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${t.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>
            {t.done && <Check size={11} />}
          </button>
        )}
        <p onClick={() => onOpen && onOpen(t.id)} className={`text-sm flex-1 leading-snug cursor-pointer hover:text-violet-700 ${t.done ? "line-through text-slate-400" : ""}`}>
          {recurring && <Repeat size={11} className="inline text-violet-400 mr-0.5" />}{t.title}
        </p>
        {onTogglePriority && !t.done && (
          <button onClick={() => onTogglePriority(t.id)} title={isPriority ? "Remover das prioridades" : "Marcar como prioridade"} className="shrink-0 mt-0.5">
            <Star size={14} className={isPriority ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
        <span className="text-xs text-slate-400">{tag}</span>
        {t.externalOwner && <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">cobrar: {t.ownerName || "externo"}</span>}
        {!t.externalOwner && todayHours > 0 && <span className="text-xs font-semibold text-violet-700">{todayHours.toFixed(1)}h hoje</span>}
        {t.deadline && <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-slate-400"}`}>{overdue ? "vencida " : "entrega "}{fmtBR(t.deadline)}</span>}
        {prog && <span className="text-xs text-violet-500 flex items-center gap-0.5"><ListChecks size={10} />{prog}</span>}
        {(t.notes || "").trim() && <StickyNote size={10} className="text-slate-300" />}
        {latePlan && <span className="text-xs text-red-500">planejado após prazo</span>}
        {stuck && <span className="text-xs px-1 rounded bg-orange-100 text-orange-700 flex items-center gap-0.5"><AlertTriangle size={9} />{daysSince(t.statusSince)}d</span>}
      </div>
      {t.done && onSetDoneDate && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-slate-400">feito em</span>
          <input type="date" value={t.doneDate || ""} onChange={(e) => onSetDoneDate(t.id, e.target.value || null)} className="text-xs border border-slate-200 rounded px-1 py-0.5" />
        </div>
      )}
      {onStatus && !t.done && (
        <div className="flex justify-end mt-1">
          <button onClick={() => onStatus(t.id, t.status === "espera" ? "ativa" : "espera")} className="text-slate-300 hover:text-violet-600" title={t.status === "espera" ? "Reativar" : "Mover para espera"}>
            {t.status === "espera" ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}

function SubtaskCard({ task, sub, data, onToggleSub, onOpen, onSetSubDoneDate, todayHours, draggable, onDragStart, onTogglePriority, isPriority }) {
  const u = URG[task.urgency];
  const client = task.clientId ? data.clients.find((c) => c.id === task.clientId) : null;
  const tag = task.area === "cliente" ? (client ? client.name : "Cliente") : AREAS[task.area].label;
  const overdue = !sub.done && sub.deadline && sub.deadline < TODAY;
  const latePlan = sub.workDate && sub.deadline && sub.workDate > sub.deadline;
  return (
    <div
      draggable={draggable || undefined}
      onDragStart={onDragStart}
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${u.lb} p-2 mb-2 ${draggable ? "cursor-move" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        {draggable && <GripVertical size={12} className="text-slate-300 mt-0.5 shrink-0" />}
        <button onClick={() => onToggleSub(task.id, sub.id)} className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${sub.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>
          {sub.done && <Check size={11} />}
        </button>
        <div className="flex-1 min-w-0">
          <p onClick={() => onOpen && onOpen(task.id)} className={`text-sm leading-snug cursor-pointer hover:text-violet-700 ${sub.done ? "line-through text-slate-400" : ""}`}>{sub.title}</p>
          <p className="text-xs text-slate-400 truncate">{tag} • {task.title}</p>
        </div>
        {onTogglePriority && !sub.done && (
          <button onClick={() => onTogglePriority(task.id)} title={isPriority ? "Remover das prioridades" : "Marcar como prioridade"} className="shrink-0 mt-0.5">
            <Star size={14} className={isPriority ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs">
        {sub.externalOwner && <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">cobrar: {sub.ownerName || "externo"}</span>}
        {!sub.externalOwner && todayHours > 0 && <span className="font-semibold text-violet-700">{todayHours.toFixed(1)}h hoje</span>}
        {sub.deadline && <span className={overdue ? "text-red-600 font-medium" : "text-slate-400"}>{overdue ? "vencida " : "entrega "}{fmtBR(sub.deadline)}</span>}
        {sub.estTime > 0 && <span className="text-slate-300">{sub.estTime}h</span>}
        {latePlan && <span className="text-red-500">planejado após prazo</span>}
        <span className="text-violet-400 flex items-center gap-0.5"><ListChecks size={10} />subtarefa</span>
      </div>
      {sub.done && onSetSubDoneDate && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-slate-400">feito em</span>
          <input type="date" value={sub.doneDate || ""} onChange={(e) => onSetSubDoneDate(task.id, sub.id, e.target.value || null)} className="text-xs border border-slate-200 rounded px-1 py-0.5" />
        </div>
      )}
    </div>
  );
}

function PostCard({ un, onAdvance, onOpenClient, todayHours, draggable, onDragStart, onTogglePriority, isPriority }) {
  const p = un.post;
  const st = POST_STATUS[p.status] || {};
  const overdue = p.date && p.date < TODAY;
  const latePlan = p.workDate && p.date && p.workDate > p.date;
  const i = STAGE_ORDER.indexOf(p.status);
  const proximo = i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : "postado";
  return (
    <div draggable={draggable || undefined} onDragStart={onDragStart} className={`bg-white rounded-lg border border-slate-200 border-l-4 border-l-pink-400 p-2 mb-2 ${draggable ? "cursor-move" : ""}`}>
      <div className="flex items-start gap-1.5">
        {draggable && <GripVertical size={12} className="text-slate-300 mt-0.5 shrink-0" />}
        <button onClick={() => onAdvance(un, proximo)} title={`Avançar para ${POST_STATUS[proximo]?.label || "Postado"}`} className="shrink-0 w-4 h-4 mt-0.5 rounded border border-slate-300 flex items-center justify-center hover:border-pink-500 hover:bg-pink-50">
          <Check size={11} className="text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p onClick={() => onOpenClient && onOpenClient(un.clientId)} className="text-sm leading-snug cursor-pointer hover:text-pink-700">{p.desc || "(sem descrição)"}</p>
          <p className="text-xs text-slate-400 truncate">{un.clientName} • {p.tipo}</p>
        </div>
        {onTogglePriority && (
          <button onClick={() => onTogglePriority(un.id)} title={isPriority ? "Remover das prioridades" : "Marcar como prioridade"} className="shrink-0 mt-0.5">
            <Star size={14} className={isPriority ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs">
        <span className={`px-1.5 py-0.5 rounded font-medium ${st.bg} ${st.text}`}>{st.label}</span>
        {todayHours > 0 && <span className="font-semibold text-violet-700">{todayHours.toFixed(1)}h hoje</span>}
        {p.date && <span className={overdue ? "text-red-600 font-medium" : "text-slate-400"}>{overdue ? "atrasado " : "sai "}{fmtBR(p.date)}</span>}
        <span className="text-slate-300">restam {un.estTime}h</span>
        {latePlan && <span className="text-red-500">após a data</span>}
        <span className="text-pink-400 flex items-center gap-0.5"><ListChecks size={10} />post</span>
      </div>
    </div>
  );
}

function KColumn({ title, count, accent, today, hours, over, onDragOver, onDrop, children }) {
  return (
    <div
      className={`w-60 shrink-0 rounded-xl p-2 ${today ? "bg-violet-50 ring-2 ring-violet-300" : "bg-slate-100"}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className={`text-xs font-bold uppercase tracking-wide ${accent || "text-slate-600"}`}>{title}</span>
        <span className="text-xs flex items-center gap-1.5">
          {hours != null && hours > 0 && (
            <span className={over ? "text-red-600 font-semibold" : "text-slate-400"}>{hours.toFixed(1)}h</span>
          )}
          <span className="text-slate-400">{count}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

function Hoje({ data, sched, toggleTask, toggleSubtask, editTask, editSubtask, setStatus, onOpen, togglePriority, updatePostField, onGoClient }) {
  const wh = data.settings.workHours;
  const sd = data.settings.stuckDays;
  const tasks = data.tasks;
  const priorities = data.priorities || [];
  const meetHours = sched.meetingHours[TODAY] || 0;
  const setDoneDate = (id, v) => editTask(id, { doneDate: v });
  const setSubDoneDate = (tid, sid, v) => editSubtask(tid, sid, { doneDate: v });
  const capForDay = (k) => Math.max(0, wh - (sched.meetingHours[k] || 0));

  const dragRef = useRef(null);
  const [showProxima, setShowProxima] = useState(false);
  const [showMes, setShowMes] = useState(false);
  const startDrag = (e, kind, taskId, subId, un) => {
    dragRef.current = { kind, taskId, subId, un };
    try { e.dataTransfer.setData("text/plain", "drag"); e.dataTransfer.effectAllowed = "move"; } catch (_) {}
  };
  const dropDay = (dayKey) => {
    const it = dragRef.current;
    dragRef.current = null;
    if (!it) return;
    if (it.kind === "task") editTask(it.taskId, { workDate: dayKey });
    else if (it.kind === "sub") editSubtask(it.taskId, it.subId, { workDate: dayKey });
    else if (it.kind === "post") updatePostField(it.un.clientId, it.un.monthId, it.un.postId, { workDate: dayKey });
  };

  const avancarPost = (un, novoStatus) => updatePostField(un.clientId, un.monthId, un.postId, { status: novoStatus });

  const findSub = (taskId, subId) => { const t = tasks.find((x) => x.id === taskId); return { task: t, sub: t ? (t.subtasks || []).find((s) => s.id === subId) : null }; };

  const todoUnits = sched.units
    .filter((un) => (sched.perUnitToday[un.id] || 0) > 0 || (un.deadline && un.deadline <= TODAY) || (un.workDate && un.workDate <= TODAY))
    .map((un) => {
      if (un.kind === "post") return { ...un, hoje: sched.perUnitToday[un.id] || 0 };
      const r = findSub(un.taskId, un.subId);
      return { ...un, task: r.task, sub: r.sub, hoje: sched.perUnitToday[un.id] || 0 };
    })
    .filter((un) => un.kind === "post" || un.task)
    .sort((a, b) => {
      const da = a.deadline || "9"; const db = b.deadline || "9";
      const ov = (da < TODAY ? 0 : 1) - (db < TODAY ? 0 : 1);
      if (ov !== 0) return ov;
      return URG[b.urgency].rank - URG[a.urgency].rank || da.localeCompare(db);
    });

  const esperaT = tasks.filter((t) => !t.done && t.status === "espera" && t.deadline && t.deadline <= TODAY);

  const feitoTasks = tasks.filter((t) => t.done && t.doneDate === TODAY).map((t) => ({ kind: "task", t }));
  const feitoSubs = tasks.flatMap((t) => (t.subtasks || []).filter((s) => s.done && s.doneDate === TODAY).map((s) => ({ kind: "sub", task: t, sub: s })));
  const feito = [...feitoTasks, ...feitoSubs];

  const committed = (sched.perDayHours[TODAY] || 0) + meetHours;
  const pct = Math.min(100, Math.round((committed / wh) * 100));
  const over = committed > wh + 0.01;

  // Foco do dia: % de tarefas/subtarefas concluídas hoje vs total relevante de hoje
  const feitoCount = feito.length;
  const totalHoje = todoUnits.length + feitoCount;
  const focoPct = totalHoje > 0 ? Math.round((feitoCount / totalHoje) * 100) : 0;

  // Prioridades: tarefas marcadas que ainda não foram concluídas
  const priorityTasks = priorities.map((id) => {
    if (String(id).startsWith("post::")) {
      const u = sched.units.find((x) => x.id === id);
      if (!u || postRemainingHours(u.post) <= 0) return null;
      return { id, title: `${u.post.desc || "(post)"} · ${u.clientName}`, isPost: true };
    }
    const t = tasks.find((x) => x.id === id);
    return t && !t.done ? t : null;
  }).filter(Boolean);

  const diaSemana = new Date().getDay(); // 0=dom, 5=sex, 6=sáb
  const ehFimDeSemana = diaSemana === 5 || diaSemana === 6 || diaSemana === 0;

  const ws = today0();
  ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const dayOf = (x) => x.workDate || x.deadline;

  const postUnits = sched.units.filter((u) => u.kind === "post");
  const week = labels.map((lb, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const key = toKey(d);
    return {
      key, label: lb, num: d.getDate(),
      tasks: tasks.filter((t) => !t.done && dayOf(t) === key).sort((a, b) => URG[b.urgency].rank - URG[a.urgency].rank),
      subs: tasks.flatMap((t) => (t.subtasks || []).filter((s) => !s.done && dayOf(s) === key).map((s) => ({ task: t, sub: s }))),
      posts: postUnits.filter((u) => (u.workDate || u.deadline) === key),
      meetings: data.meetings.filter((m) => m.date === key).sort((a, b) => (a.start || "").localeCompare(b.start || "")),
    };
  });

  return (
    <div className="space-y-5">
      <Dashboard data={data} sched={sched} onOpen={onOpen} onGoClient={onGoClient} />

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Carga do dia <span className="font-normal text-slate-400">· capacidade ideal {wh}h</span></span>
          <span className={`text-base font-bold ${over ? "text-red-600" : "text-violet-700"}`}>{committed.toFixed(1)}h / {wh}h</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${over ? "bg-gradient-to-r from-violet-500 to-red-500" : "bg-gradient-to-r from-violet-500 to-violet-400"}`} style={{ width: `${pct}%` }} />
        </div>
        {over && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> Seu dia está cheio. Que tal renegociar prazos ou delegar algumas tarefas?</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2"><CircleDot size={15} className="text-violet-500" /> Prioridades de hoje <span className="text-xs font-normal text-slate-400">({priorityTasks.length}/3)</span></h3>
          {priorityTasks.length === 0 ? (
            <p className="text-xs text-slate-400">Clique na estrela de qualquer cartão para marcar até 3 prioridades.</p>
          ) : (
            <div className="space-y-1.5">
              {priorityTasks.map((t, i) => (
                <div key={t.id} className="flex items-start gap-2 group">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <button onClick={() => t.isPost ? onGoClient() : onOpen(t.id)} className="text-sm text-slate-600 text-left hover:text-violet-700 leading-snug flex-1">{t.title}</button>
                  <button onClick={() => togglePriority(t.id)} title="Remover das prioridades" className="shrink-0 text-slate-300 hover:text-red-500 mt-0.5"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl p-4 text-white flex flex-col justify-center">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Zap size={15} /> Foco do dia</h3>
          <p className="text-xs text-violet-100 mb-3">Menos distração, mais direção.</p>
          <div className="w-full h-2.5 bg-white/25 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${focoPct}%` }} />
          </div>
          <p className="text-xs text-violet-100">{focoPct}% do dia concluído. {focoPct >= 100 ? "Arrasou! 🚀" : "Vamos juntas! 🚀"}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2"><CalendarClock size={18} className="text-violet-500" /> Suas tarefas de hoje</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <KColumn title="A fazer" count={todoUnits.length} accent="text-violet-700" today>
            {todoUnits.length === 0 ? <p className="text-xs text-slate-400 px-1">Nada travado para hoje.</p> :
              todoUnits.map((un) => un.kind === "post"
                ? <PostCard key={un.id} un={un} onAdvance={avancarPost} onOpenClient={onGoClient} todayHours={un.hoje} onTogglePriority={togglePriority} isPriority={priorities.includes(un.id)} />
                : un.sub
                  ? <SubtaskCard key={un.id} task={un.task} sub={un.sub} data={data} onToggleSub={toggleSubtask} onOpen={onOpen} todayHours={un.hoje} onTogglePriority={togglePriority} isPriority={priorities.includes(un.taskId)} />
                  : <Card key={un.id} t={un.task} data={data} onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen} stuckDays={sd} todayHours={un.hoje} onTogglePriority={togglePriority} isPriority={priorities.includes(un.task.id)} />)}
          </KColumn>
          <KColumn title="Em espera" count={esperaT.length} accent="text-slate-500">
            {esperaT.length === 0 ? <p className="text-xs text-slate-400 px-1">Vazio.</p> :
              esperaT.map((t) => <Card key={t.id} t={t} data={data} onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen} stuckDays={sd} />)}
          </KColumn>
          <KColumn title="Feito hoje" count={feito.length} accent="text-green-600">
            {feito.length === 0 ? <p className="text-xs text-slate-400 px-1">Nada concluído ainda.</p> :
              feito.map((it) => it.kind === "task"
                ? <Card key={it.t.id} t={it.t} data={data} onToggle={toggleTask} onOpen={onOpen} onSetDoneDate={setDoneDate} stuckDays={sd} />
                : <SubtaskCard key={it.sub.id} task={it.task} sub={it.sub} data={data} onToggleSub={toggleSubtask} onOpen={onOpen} onSetSubDoneDate={setSubDoneDate} />)}
          </KColumn>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Calendar size={18} className="text-violet-500" /> Semana
          <span className="text-xs font-normal text-slate-400">(arraste para o dia que vai fazer)</span>
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {week.map((d) => {
            const dh = sched.perDayHours[d.key] || 0;
            const cp = capForDay(d.key);
            return (
              <KColumn
                key={d.key}
                title={`${d.label} ${d.num}`}
                count={d.tasks.length + d.subs.length + d.meetings.length + d.posts.length}
                today={d.key === TODAY}
                hours={dh}
                over={dh > cp + 0.01}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); dropDay(d.key); }}
              >
                {d.meetings.map((m) => <MeetingCard key={m.id} m={m} />)}
                {d.posts.map((un) => (
                  <PostCard key={un.id} un={un} onAdvance={avancarPost} onOpenClient={onGoClient} draggable onDragStart={(e) => startDrag(e, "post", null, null, un)} todayHours={d.key === TODAY ? (sched.perUnitToday[un.id] || 0) : 0} onTogglePriority={togglePriority} isPriority={priorities.includes(un.id)} />
                ))}
                {d.subs.map(({ task, sub }) => (
                  <SubtaskCard
                    key={sub.id} task={task} sub={sub} data={data}
                    onToggleSub={toggleSubtask} onOpen={onOpen}
                    draggable
                    onDragStart={(e) => startDrag(e, "sub", task.id, sub.id)}
                    todayHours={d.key === TODAY ? (sched.perUnitToday[`${task.id}::${sub.id}`] || 0) : 0}
                    onTogglePriority={togglePriority} isPriority={priorities.includes(task.id)}
                  />
                ))}
                {d.tasks.map((t) => (
                  <Card
                    key={t.id} t={t} data={data}
                    onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen}
                    draggable
                    onDragStart={(e) => startDrag(e, "task", t.id, null)}
                    stuckDays={sd}
                    onTogglePriority={togglePriority} isPriority={priorities.includes(t.id)}
                  />
                ))}
                {d.tasks.length === 0 && d.subs.length === 0 && d.meetings.length === 0 && d.posts.length === 0 && (
                  <p className="text-xs text-slate-300 px-1">solte aqui</p>
                )}
              </KColumn>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <button onClick={() => setShowProxima(!showProxima)} className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border text-sm font-semibold transition-colors ${ehFimDeSemana ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:bg-violet-50"}`}>
            <span className="flex items-center gap-2"><Calendar size={16} /> {ehFimDeSemana ? "Hora de planejar! Ver próxima semana" : "Ver próxima semana"}</span>
            <span>{showProxima ? "−" : "+"}</span>
          </button>
          {showProxima && <div className="mt-2"><ProximaSemana data={data} sched={sched} onOpen={onOpen} /></div>}
        </div>

        <div>
          <button onClick={() => setShowMes(!showMes)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 border bg-white text-slate-700 border-slate-200 hover:bg-violet-50 text-sm font-semibold transition-colors">
            <span className="flex items-center gap-2"><CalendarClock size={16} /> Ver mês</span>
            <span>{showMes ? "−" : "+"}</span>
          </button>
          {showMes && <div className="mt-2"><CalendarioMes data={data} sched={sched} /></div>}
        </div>
      </div>
    </div>
  );
}

function ProximaSemana({ data, sched, onOpen }) {
  const ws = today0();
  ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7) + 7); // segunda da próxima semana
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const wh = data.settings.workHours;
  const tasks = data.tasks;
  const dayOf = (x) => x.workDate || x.deadline;

  const dias = labels.map((lb, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const key = toKey(d);
    const dTasks = tasks.filter((t) => !t.done && dayOf(t) === key);
    const dSubs = tasks.flatMap((t) => (t.subtasks || []).filter((s) => !s.done && dayOf(s) === key).map((s) => ({ task: t, sub: s })));
    const meets = data.meetings.filter((m) => m.date === key);
    const horas = (sched.perDayHours[key] || 0) + (sched.meetingHours[key] || 0);
    return { key, label: lb, num: d.getDate(), dTasks, dSubs, meets, horas };
  });

  const totalItens = dias.reduce((n, d) => n + d.dTasks.length + d.dSubs.length + d.meets.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      {totalItens === 0 ? (
        <p className="text-sm text-slate-400">Nada agendado para a próxima semana ainda. Semana livre para planejar! 🎉</p>
      ) : (
        <div className="space-y-2">
          {dias.map((d) => {
            const vazio = d.dTasks.length === 0 && d.dSubs.length === 0 && d.meets.length === 0;
            if (vazio) return null;
            const over = d.horas > wh + 0.01;
            return (
              <div key={d.key} className="border border-slate-100 rounded-xl p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700">{d.label} {d.num}</span>
                  {d.horas > 0 && <span className={`text-xs font-semibold ${over ? "text-red-600" : "text-violet-700"}`}>{d.horas.toFixed(1)}h{over ? " · cheio" : ""}</span>}
                </div>
                {d.meets.map((m, i) => (
                  <p key={`m${i}`} className="text-xs text-blue-600 flex items-center gap-1"><Calendar size={11} />{m.allDay ? "dia" : (m.start || "")} {m.title}</p>
                ))}
                {d.dTasks.map((t) => (
                  <p key={t.id} onClick={() => onOpen(t.id)} className="text-xs text-slate-600 cursor-pointer hover:text-violet-700 flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${URG[t.urgency].dot}`} />{t.title}</p>
                ))}
                {d.dSubs.map(({ task, sub }) => (
                  <p key={sub.id} onClick={() => onOpen(task.id)} className="text-xs text-slate-500 cursor-pointer hover:text-violet-700 flex items-center gap-1"><ListChecks size={10} className="text-violet-400" />{sub.title}</p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarioMes({ data, sched }) {
  const [offset, setOffset] = useState(0);
  const base = fromKey(TODAY);
  const ref = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const wh = data.settings.workHours;
  const tasks = data.tasks;
  const dayOf = (x) => x.workDate || x.deadline;

  const primeiroDia = new Date(ano, mes, 1);
  const startOffset = (primeiroDia.getDay() + 6) % 7; // segunda = 0
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < startOffset; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(new Date(ano, mes, d));
  while (celulas.length % 7 !== 0) celulas.push(null);

  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  const mesLabel = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setOffset(offset - 1)} className="text-slate-400 hover:text-violet-600 text-sm px-2">‹</button>
        <span className="text-sm font-semibold text-slate-700 capitalize">{mesLabel}</span>
        <button onClick={() => setOffset(offset + 1)} className="text-slate-400 hover:text-violet-600 text-sm px-2">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {labels.map((l, i) => <div key={i} className="text-center text-xs font-semibold text-slate-400 pb-1">{l}</div>)}
        {celulas.map((cel, i) => {
          if (!cel) return <div key={i} />;
          const key = toKey(cel);
          const isToday = key === TODAY;
          const nTasks = tasks.filter((t) => !t.done && dayOf(t) === key).length + tasks.reduce((n, t) => n + (t.subtasks || []).filter((s) => !s.done && dayOf(s) === key).length, 0);
          const nMeets = data.meetings.filter((m) => m.date === key).length;
          const horas = (sched.perDayHours[key] || 0) + (sched.meetingHours[key] || 0);
          const over = horas > wh + 0.01;
          return (
            <div key={i} className={`min-h-[58px] rounded-lg border p-1 ${isToday ? "border-violet-400 bg-violet-50" : "border-slate-100"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isToday ? "font-bold text-violet-700" : "text-slate-500"}`}>{cel.getDate()}</span>
                {horas > 0 && <span className={`text-[10px] font-semibold ${over ? "text-red-600" : "text-violet-600"}`}>{horas.toFixed(0)}h</span>}
              </div>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {nMeets > 0 && <span className="flex items-center gap-0.5 text-[10px] text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{nMeets}</span>}
                {nTasks > 0 && <span className="flex items-center gap-0.5 text-[10px] text-violet-600"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />{nTasks}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> reuniões</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> demandas</span>
        <span className="flex items-center gap-1"><span className="text-violet-600 font-semibold">Xh</span> carga prevista</span>
      </div>
    </div>
  );
}

function Dashboard({ data, sched, onOpen, onGoClient }) {
  const [period, setPeriod] = useState("semana");
  const [openBox, setOpenBox] = useState(null);
  const ws = today0();
  ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const wsK = toKey(ws), weK = toKey(we);
  const md = fromKey(TODAY);
  const monthEnd = toKey(new Date(md.getFullYear(), md.getMonth() + 1, 0));
  const ym = TODAY.slice(0, 7);
  const inPeriod = (k) => { if (!k) return false; return period === "semana" ? (k >= wsK && k <= weK) : k.slice(0, 7) === ym; };
  const periodEnd = period === "semana" ? weK : monthEnd;

  const tasks = data.tasks;
  const clientes = data.clients.length;
  const listPendentes = tasks.filter((t) => !t.done && t.status !== "espera");
  const listAtrasadas = tasks.filter((t) => !t.done && t.deadline && t.deadline < TODAY);
  const listEspera = tasks.filter((t) => !t.done && t.status === "espera");
  const listProximas = tasks.filter((t) => !t.done && t.deadline && t.deadline >= TODAY && t.deadline <= periodEnd);
  const concluidas = tasks.filter((t) => t.done && inPeriod(t.doneDate)).length + tasks.reduce((n, t) => n + (t.subtasks || []).filter((s) => s.done && inPeriod(s.doneDate)).length, 0);

  // Posts atrasados também entram na lista de atrasadas
  const postsAtrasados = (sched?.units || []).filter((u) => u.kind === "post" && u.deadline && u.deadline < TODAY);
  const sufixo = period === "semana" ? "esta semana" : "este mês";

  const boxes = [
    { key: "clientes", label: "Clientes", sub: "ativos", value: clientes, icon: Users, color: "text-violet-600", bg: "bg-violet-100", nav: true },
    { key: "pendentes", label: "Pendentes", sub: "no total", value: listPendentes.length, icon: Clock, color: "text-slate-500", bg: "bg-slate-100", list: listPendentes },
    { key: "concluidas", label: "Concluídas", sub: sufixo, value: concluidas, icon: Check, color: "text-green-600", bg: "bg-green-100" },
    { key: "atrasadas", label: "Atrasadas", sub: "atenção", value: listAtrasadas.length + postsAtrasados.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", list: listAtrasadas, posts: postsAtrasados },
    { key: "espera", label: "Em espera", sub: "aguardando", value: listEspera.length, icon: PauseCircle, color: "text-amber-600", bg: "bg-amber-100", list: listEspera },
    { key: "vencer", label: "A vencer", sub: sufixo, value: listProximas.length, icon: Calendar, color: "text-blue-600", bg: "bg-blue-100", list: listProximas },
  ];

  const ativa = boxes.find((b) => b.key === openBox);

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <div className="flex gap-1">
          <button onClick={() => setPeriod("semana")} className={`text-xs px-3 py-1 rounded-full border ${period === "semana" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Semana</button>
          <button onClick={() => setPeriod("mes")} className={`text-xs px-3 py-1 rounded-full border ${period === "mes" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Mês</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {boxes.map((b) => {
          const Icon = b.icon;
          const clicavel = b.nav || (b.list && b.list.length > 0) || (b.posts && b.posts.length > 0);
          const aberto = openBox === b.key;
          return (
            <button
              key={b.key}
              onClick={() => { if (b.nav) onGoClient(); else if (clicavel) setOpenBox(aberto ? null : b.key); }}
              disabled={!clicavel}
              className={`text-left bg-white rounded-2xl border p-4 transition-all ${aberto ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"} ${clicavel ? "hover:border-violet-300 cursor-pointer" : "cursor-default"}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${b.bg} ${b.color}`}><Icon size={18} /></div>
              <p className="text-2xl font-bold leading-none text-slate-800">{b.value}</p>
              <p className="text-sm font-medium text-slate-600 mt-1">{b.label}</p>
              <p className="text-xs text-slate-400">{b.sub}</p>
            </button>
          );
        })}
      </div>

      {ativa && (ativa.list?.length > 0 || ativa.posts?.length > 0) && (
        <div className="mt-3 bg-white rounded-2xl border border-violet-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700">{ativa.label}</p>
            <button onClick={() => setOpenBox(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          {(ativa.list || []).map((t) => {
            const cli = t.clientId ? data.clients.find((c) => c.id === t.clientId) : null;
            const tag = t.area === "cliente" ? (cli ? cli.name : "Cliente") : AREAS[t.area].label;
            const atrasada = t.deadline && t.deadline < TODAY;
            return (
              <div key={t.id} onClick={() => onOpen(t.id)} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-violet-50 rounded px-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${URG[t.urgency].dot}`} />
                <span className="text-sm flex-1 truncate">{t.title}</span>
                <span className="text-xs text-slate-400">{tag}</span>
                {t.deadline && <span className={`text-xs ${atrasada ? "text-red-600 font-medium" : "text-slate-400"}`}>{fmtBR(t.deadline)}</span>}
              </div>
            );
          })}
          {(ativa.posts || []).map((u) => (
            <div key={u.id} onClick={() => onGoClient()} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-pink-50 rounded px-1">
              <span className="w-2 h-2 rounded-full shrink-0 bg-pink-400" />
              <span className="text-sm flex-1 truncate">{u.post.desc || "(sem descrição)"}</span>
              <span className="text-xs text-slate-400">{u.clientName} • {u.post.tipo}</span>
              <span className="text-xs text-red-600 font-medium">{fmtBR(u.deadline)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingCard({ m }) {
  const isGoogle = m.google;
  return (
    <div className={`rounded-lg border p-2 mb-2 ${isGoogle ? "bg-blue-50 border-blue-200" : "bg-violet-100 border-violet-200"}`}>
      <div className={`flex items-center gap-1 ${isGoogle ? "text-blue-800" : "text-violet-800"}`}>
        <Calendar size={12} /><span className="text-xs font-mono font-semibold">{m.allDay ? "dia" : (m.start || "--:--")}</span>
        <span className={`text-xs ml-auto ${isGoogle ? "text-blue-500" : "text-violet-500"}`}>{m.allDay ? "Google" : `${Math.round(m.durationMin)}min`}</span>
      </div>
      <p className={`text-sm mt-0.5 ${isGoogle ? "text-blue-900" : "text-violet-900"}`}>{m.title}{isGoogle && !m.allDay && <span className="text-xs text-blue-400 ml-1">· Google</span>}</p>
    </div>
  );
}

function TaskRow({ t, data, extra, overdue, muted, onToggle, onDelete, onStatus, onOpen, stuckDays }) {
  const u = URG[t.urgency];
  const client = t.clientId ? data.clients.find((c) => c.id === t.clientId) : null;
  const tag = t.area === "cliente" ? (client ? client.name : "Cliente") : AREAS[t.area].label;
  const recurring = t.recurrence && t.recurrence !== "none";
  const stuck = !t.done && stuckDays && (t.status === "espera" || !t.deadline) && daysSince(t.statusSince) >= stuckDays;
  const prog = subProgress(t);
  return (
    <div className={`flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 ${muted ? "opacity-70" : ""}`}>
      {onToggle && (
        <button onClick={() => onToggle(t.id)} className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center ${t.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>
          {t.done && <Check size={13} />}
        </button>
      )}
      <span className={`shrink-0 w-2 h-2 rounded-full ${u.dot}`} />
      <div className="flex-1 min-w-0">
        <p onClick={() => onOpen && onOpen(t.id)} className={`text-sm truncate flex items-center gap-1 ${onOpen ? "cursor-pointer hover:text-violet-700" : ""} ${t.done ? "line-through text-slate-400" : ""}`}>
          {recurring && <Repeat size={12} className="text-violet-400 shrink-0" />}
          <span className="truncate">{t.title}</span>
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${u.bg} ${u.text}`}>{u.label}</span>
          <span className="text-xs text-slate-400">{tag}</span>
          {t.scope && <span className="text-xs text-slate-300">{SCOPE[t.scope]}</span>}
          {prog && <span className="text-xs text-violet-500 flex items-center gap-0.5"><ListChecks size={11} />{prog}</span>}
          {recurring && <span className="text-xs text-violet-400">{REC[t.recurrence]}</span>}
          {overdue && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">vencida {fmtBR(t.deadline)}</span>}
          {stuck && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium flex items-center gap-0.5"><AlertTriangle size={10} /> parada {daysSince(t.statusSince)}d</span>}
        </div>
      </div>
      {extra}
      {onOpen && <button onClick={() => onOpen(t.id)} className="shrink-0 text-slate-300 hover:text-violet-600" title="Abrir / editar"><Pencil size={14} /></button>}
      {onStatus && !t.done && (
        <button onClick={() => onStatus(t.id, t.status === "espera" ? "ativa" : "espera")} title={t.status === "espera" ? "Reativar" : "Mover para espera"} className="shrink-0 text-slate-300 hover:text-violet-600">
          {t.status === "espera" ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </button>
      )}
      {onDelete && <button onClick={() => onDelete(t.id)} className="shrink-0 text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>}
    </div>
  );
}

function TaskGroups({ tasks, data, onToggle, onDelete, onStatus, onOpen, stuckDays, groupByScope }) {
  const [showDone, setShowDone] = useState(false);
  const active = tasks.filter((t) => !t.done && t.status !== "espera");
  const espera = tasks.filter((t) => !t.done && t.status === "espera");
  const done = tasks.filter((t) => t.done);
  const sortFn = (a, b) => URG[b.urgency].rank - URG[a.urgency].rank || (a.deadline || "9").localeCompare(b.deadline || "9");
  const row = (t) => <TaskRow key={t.id} t={t} data={data} stuckDays={stuckDays} onToggle={onToggle} onDelete={onDelete} onStatus={onStatus} onOpen={onOpen} overdue={!t.done && t.deadline && t.deadline < TODAY} extra={dlExtra(t)} />;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Ativas ({active.length})</p>
        {active.length === 0 ? <p className="text-sm text-slate-400">Nada ativo agora.</p> :
          groupByScope ? ["semana", "mes", "pontual"].map((sc) => {
            const list = active.filter((t) => t.scope === sc).sort(sortFn);
            if (!list.length) return null;
            return <div key={sc} className="mb-1"><p className="text-xs text-slate-400 mt-1">{SCOPE[sc]}{sc === "mes" ? " (macro)" : ""}</p>{list.map(row)}</div>;
          }) : [...active].sort(sortFn).map(row)}
      </div>

      {espera.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1"><PauseCircle size={13} /> Em espera ({espera.length})</p>
          {[...espera].sort(sortFn).map(row)}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(!showDone)} className="text-xs text-slate-400 hover:text-slate-600">{showDone ? "Ocultar" : "Ver"} concluídas ({done.length})</button>
          {showDone && [...done].reverse().map(row)}
        </div>
      )}
    </div>
  );
}

function TaskFields({ t, clients, onChange, allowArea }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {allowArea && (
        <select value={t.area} onChange={(e) => onChange({ area: e.target.value, clientId: e.target.value === "cliente" ? (clients[0]?.id || null) : null })} className="border border-slate-300 rounded-lg px-2 py-2 text-sm col-span-2">
          {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      )}
      {t.area === "cliente" && (
        <select value={t.clientId || ""} onChange={(e) => onChange({ clientId: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <select value={t.scope} onChange={(e) => onChange({ scope: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
        {Object.entries(SCOPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <div className="flex flex-col col-span-2">
        <label className="text-xs text-slate-500 mb-0.5">Prazo de entrega (quando precisa estar pronto)</label>
        <input type="date" value={t.deadline || ""} onChange={(e) => onChange({ deadline: e.target.value || null })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 mb-0.5">Tempo (h)</label>
        <input type="number" min="0" step="0.5" value={t.estTime} onChange={(e) => onChange({ estTime: Number(e.target.value) || 0 })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
      </div>
      <select value={t.urgency} onChange={(e) => onChange({ urgency: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
        {Object.entries(URG).map(([k, v]) => <option key={k} value={k}>Urgência: {v.label}</option>)}
      </select>
      <select value={t.recurrence} onChange={(e) => onChange({ recurrence: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-2 text-sm col-span-2">
        {Object.entries(REC).map(([k, v]) => <option key={k} value={k}>Recorrência: {v}</option>)}
      </select>
    </div>
  );
}

function TaskForm({ area, clients, onAdd, onClose }) {
  const [t, setT] = useState({ title: "", area, clientId: area === "cliente" ? (clients[0]?.id || null) : null, scope: area === "cliente" ? "semana" : "pontual", deadline: TODAY, estTime: 1, urgency: "media", recurrence: "none" });
  const ch = (patch) => setT((p) => ({ ...p, ...patch }));
  const submit = () => { if (!t.title.trim()) return; onAdd({ ...t, title: t.title.trim(), deadline: t.deadline || null }); onClose(); };

  return (
    <div className="bg-violet-50 rounded-lg p-3 space-y-2 border border-violet-200">
      <input autoFocus value={t.title} onChange={(e) => ch({ title: e.target.value })} placeholder="O que precisa ser feito?" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      <TaskFields t={t} clients={clients} onChange={ch} allowArea={false} />
      <p className="text-xs text-slate-400">Use recorrência para social media. Demandas "do mês" são macro: abra a demanda depois para criar subtarefas por semana, cada uma com prazo e tempo.</p>
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 bg-violet-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-violet-700">Adicionar</button>
        <button onClick={onClose} className="px-4 bg-white border border-slate-300 rounded-lg py-2 text-sm">Cancelar</button>
      </div>
    </div>
  );
}

function TaskDetail({ task, data, onEdit, onToggle, onSetStatus, onDelete, onClose }) {
  const t = task;
  const isMonthly = t.scope === "mes";
  const subs = t.subtasks || [];
  const hasSchedulableSubs = subs.some((s) => s.deadline && (s.estTime || 0) > 0);
  const [stitle, setStitle] = useState("");
  const [sdate, setSdate] = useState(TODAY);
  const [stime, setStime] = useState("1");
  const [sweek, setSweek] = useState(TODAY_WEEK);

  const setSubs = (arr) => onEdit(t.id, { subtasks: arr });
  const addSub = () => {
    if (!stitle.trim()) return;
    setSubs([...subs, { id: uid(), title: stitle.trim(), deadline: sdate || null, estTime: Number(stime) || 0, week: isMonthly ? Number(sweek) : null, done: false, workDate: null, externalOwner: false, ownerName: "" }]);
    setStitle(""); setSdate(TODAY); setStime("1"); setSweek(TODAY_WEEK);
  };
  const upSub = (id, patch) => setSubs(subs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const delSub = (id) => setSubs(subs.filter((s) => s.id !== id));
  const toggleS = (s) => upSub(s.id, { done: !s.done, doneDate: !s.done ? TODAY : null });

  const monthOf = (s) => (s.deadline ? s.deadline.slice(0, 7) : "");
  const groupsMap = {};
  subs.forEach((s) => { const k = `${monthOf(s)}|${s.week || 1}`; (groupsMap[k] = groupsMap[k] || []).push(s); });
  const orderedKeys = Object.keys(groupsMap).sort((a, b) => {
    const [ma, wa] = a.split("|"); const [mb, wb] = b.split("|");
    if (ma !== mb) { if (!ma) return 1; if (!mb) return -1; return ma.localeCompare(mb); }
    return Number(wa) - Number(wb);
  });
  const groupLabel = (key) => {
    const list = groupsMap[key];
    const withDl = list.find((s) => s.deadline);
    const ml = withDl ? monthName(withDl.deadline) : "Sem data";
    return `${ml} • Semana ${pad(Number(key.split("|")[1]))}`;
  };

  const SubRow = (s) => (
    <div key={s.id} className="py-1 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1.5">
        <button onClick={() => toggleS(s)} className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${s.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>{s.done && <Check size={11} />}</button>
        <input value={s.title} onChange={(e) => upSub(s.id, { title: e.target.value })} className={`flex-1 min-w-0 text-sm border-b border-transparent focus:border-slate-300 outline-none ${s.done ? "line-through text-slate-400" : ""}`} />
        <input type="date" value={s.deadline || ""} onChange={(e) => upSub(s.id, { deadline: e.target.value || null })} className="text-xs border border-slate-200 rounded px-1 py-0.5 w-24 shrink-0" />
        <input type="number" min="0" step="0.5" value={s.estTime || ""} onChange={(e) => upSub(s.id, { estTime: Number(e.target.value) || 0 })} placeholder="h" className="text-xs border border-slate-200 rounded px-1 py-0.5 w-10 shrink-0" />
        <button onClick={() => delSub(s.id)} className="text-slate-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
      </div>
      <div className="flex items-center gap-2 mt-1 pl-6">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={!!s.externalOwner} onChange={(e) => upSub(s.id, { externalOwner: e.target.checked, ownerName: e.target.checked ? (s.ownerName || "") : "" })} className="w-3.5 h-3.5 accent-sky-500" />
          <span className="text-xs text-slate-500">Responsável externo</span>
        </label>
        {s.externalOwner && (
          <input value={s.ownerName || ""} onChange={(e) => upSub(s.id, { ownerName: e.target.value })} placeholder="Nome" className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-xs" />
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-md my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">Editar demanda</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <input value={t.title} onChange={(e) => onEdit(t.id, { title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium mb-2" />

        <div className="flex gap-1 mb-3">
          {[
            { key: "andamento", label: "Em andamento", ativo: !t.done && t.status !== "espera", on: "bg-violet-600 text-white border-violet-600" },
            { key: "espera", label: "Em espera", ativo: !t.done && t.status === "espera", on: "bg-amber-500 text-white border-amber-500" },
            { key: "concluida", label: "Concluída", ativo: t.done, on: "bg-green-600 text-white border-green-600" },
          ].map((op) => (
            <button
              key={op.key}
              onClick={() => {
                if (op.key === "concluida") { if (!t.done) onToggle(t.id); }
                else if (op.key === "espera") { if (t.done) onToggle(t.id); onSetStatus(t.id, "espera"); }
                else { if (t.done) onToggle(t.id); onSetStatus(t.id, "ativa"); }
              }}
              className={`flex-1 text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors ${op.ativo ? op.on : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
            >
              {op.label}
            </button>
          ))}
        </div>

        <TaskFields t={t} clients={data.clients} onChange={(patch) => onEdit(t.id, patch)} allowArea={true} />
        {hasSchedulableSubs && <p className="text-xs text-violet-500 mt-1">Esta demanda tem subtarefas com prazo, então o cálculo do dia agenda as subtarefas (o tempo da demanda mãe é ignorado).</p>}

        <div className="mt-3 flex flex-col gap-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={!!t.externalOwner} onChange={(e) => onEdit(t.id, { externalOwner: e.target.checked, ownerName: e.target.checked ? (t.ownerName || "") : "" })} className="w-4 h-4 accent-sky-500" />
            <span className="text-sm text-slate-600">Responsável externo (só preciso cobrar)</span>
          </label>
          {t.externalOwner && (
            <input value={t.ownerName || ""} onChange={(e) => onEdit(t.id, { ownerName: e.target.value })} placeholder="Nome de quem vai fazer" className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
          )}
          {t.externalOwner && <p className="text-xs text-sky-600">Esta demanda não conta nas suas horas do dia ou da semana.</p>}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">Dia planejado para fazer</span>
          <input type="date" value={t.workDate || ""} onChange={(e) => onEdit(t.id, { workDate: e.target.value || null })} className="text-xs border border-slate-300 rounded px-2 py-1" />
          {t.workDate && <button onClick={() => onEdit(t.id, { workDate: null })} className="text-xs text-slate-400 hover:text-red-500">limpar</button>}
        </div>

        {t.done && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Concluída em</span>
            <input type="date" value={t.doneDate || ""} onChange={(e) => onEdit(t.id, { doneDate: e.target.value || null })} className="text-xs border border-slate-300 rounded px-2 py-1" />
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><StickyNote size={13} /> Anotações</p>
          <textarea value={t.notes || ""} onChange={(e) => onEdit(t.id, { notes: e.target.value })} placeholder="Briefing, referências, observações..." className="w-full h-20 border border-slate-300 rounded-lg p-2 text-sm" />
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><ListChecks size={13} /> Subtarefas {subProgress(t) && <span className="text-slate-400 normal-case">({subProgress(t)})</span>}</p>
          {isMonthly && <p className="text-xs text-slate-400 mb-2">Demanda macro do mês. Organize por semana. Coloque prazo e tempo para entrar no cálculo do dia.</p>}

          {isMonthly ? (
            orderedKeys.length === 0 ? <p className="text-sm text-slate-400">Nenhuma subtarefa ainda.</p> :
              orderedKeys.map((k) => (
                <div key={k} className="mb-2">
                  <p className="text-xs font-semibold text-slate-500">{groupLabel(k)}</p>
                  {groupsMap[k].map(SubRow)}
                </div>
              ))
          ) : (
            subs.length === 0 ? <p className="text-sm text-slate-400">Nenhuma subtarefa ainda.</p> : subs.map(SubRow)
          )}

          <div className="mt-2 bg-violet-50 rounded-lg p-2 space-y-1.5 border border-violet-100">
            <input value={stitle} onChange={(e) => setStitle(e.target.value)} placeholder="Nova subtarefa" className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <div className="flex gap-1.5">
              {isMonthly && (
                <select value={sweek} onChange={(e) => setSweek(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
                  {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>Sem {pad(w)}</option>)}
                </select>
              )}
              <input type="date" value={sdate} onChange={(e) => setSdate(e.target.value)} className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              <input type="number" min="0" step="0.5" value={stime} onChange={(e) => setStime(e.target.value)} placeholder="h" className="w-12 border border-slate-300 rounded-lg px-1 py-1.5 text-sm" />
              <button onClick={addSub} className="bg-violet-600 text-white rounded-lg px-3 text-sm"><Plus size={15} /></button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-5">
          <button onClick={() => onDelete(t.id)} className="text-sm text-red-500 flex items-center gap-1 hover:text-red-700"><Trash2 size={14} /> Excluir demanda</button>
          <button onClick={onClose} className="bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Concluir edição</button>
        </div>
      </div>
    </div>
  );
}

function ModeloSocialBox({ client, addTask, updateClient }) {
  const [nome, setNome] = useState("");
  const criar = () => {
    const nomeMes = nome.trim() || cap(new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
    const base = fromKey(TODAY);
    const ano = base.getFullYear(), mes = base.getMonth();
    const inicio = toKey(new Date(ano, mes, 1));
    const fim = toKey(new Date(ano, mes + 1, 0));
    const taskId = uid();
    addTask({
      id: taskId, title: `Social media ${nomeMes}`, area: "cliente", clientId: client.id,
      scope: "mes", deadline: fim, estTime: 0, urgency: "media", recurrence: "none",
      subtasks: [
        { id: uid(), title: "Planejamento do mês", deadline: inicio, estTime: 3, week: 1, done: false, workDate: null, externalOwner: false, ownerName: "" },
        { id: uid(), title: "Análise de dados do mês", deadline: fim, estTime: 2, week: 5, done: false, workDate: null, externalOwner: false, ownerName: "" },
      ],
    });
    updateClient(client.id, {
      socialMonths: [...(client.socialMonths || []), { id: uid(), name: nomeMes, taskId, done: false, posts: [] }],
    });
    setNome("");
  };
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-3">
      <p className="text-xs text-violet-800 font-semibold mb-1">Modelo de social media</p>
      <p className="text-xs text-slate-500 mb-2">Cria a demanda do mês com as subtarefas de planejamento e análise de dados, e já abre o fluxo de posts vinculado. As horas de produção vêm dos posts, conforme o estágio de cada um.</p>
      <div className="flex gap-2 items-center">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do mês (ex: Julho 2026)" className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        <button onClick={criar} className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap">Criar mês completo</button>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">{Icon && <Icon size={15} className="text-violet-500" />}{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function AreaView({ area, data, addTask, toggleTask, delTask, setStatus, onOpen, stuckDays }) {
  const [adding, setAdding] = useState(false);
  const tasks = data.tasks.filter((t) => t.area === area);
  const Icon = AREAS[area].icon;
  return (
    <div className="space-y-4">
      <Section title={AREAS[area].label} icon={Icon} action={
        <button onClick={() => setAdding(!adding)} className="text-violet-600 text-sm flex items-center gap-1 hover:text-violet-800"><Plus size={15} /> Nova</button>
      }>
        {adding && <div className="mb-3"><TaskForm area={area} clients={data.clients} onAdd={addTask} onClose={() => setAdding(false)} /></div>}
        {tasks.length === 0 && !adding ? <p className="text-sm text-slate-400 py-2">Nenhuma demanda por aqui ainda.</p> :
          <TaskGroups tasks={tasks} data={data} onToggle={toggleTask} onDelete={delTask} onStatus={setStatus} onOpen={onOpen} stuckDays={stuckDays} groupByScope={false} />}
      </Section>
    </div>
  );
}

function SocialMonthBlock({ m, isArchive, clientTasks, onUpdateMonth, onDeleteMonth, onAddPost, onUpdatePost, onDeletePost, onCopy, onPasteList }) {
  const linked = clientTasks.find((t) => t.id === m.taskId);
  const posts = (m.posts || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const postado = posts.filter((p) => p.status === "postado").length;
  const aprovacao = posts.filter((p) => p.status === "aprovacao").length;
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const doPaste = () => {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length) onPasteList(m.id, lines);
    setPasteText(""); setShowPaste(false);
  };

  return (
    <div className={`rounded-xl border p-3 mb-3 ${isArchive ? "border-slate-200 bg-slate-50 opacity-70" : "border-violet-200 bg-white"}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-700 flex-1">{m.name}</span>
        <span className="text-xs text-slate-400">{posts.length} posts</span>
        {aprovacao > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{aprovacao} p/ aprovar</span>}
        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{postado} postados</span>
        <button onClick={() => onCopy(m)} title="Copiar mês formatado" className="text-slate-300 hover:text-violet-600"><Copy size={13} /></button>
        {isArchive
          ? <button onClick={() => onUpdateMonth(m.id, { done: false })} className="text-xs text-violet-500 hover:text-violet-700">Reabrir</button>
          : <button onClick={() => onUpdateMonth(m.id, { done: true })} className="text-xs text-slate-400 hover:text-violet-600">Concluir mês</button>}
        <button onClick={() => onDeleteMonth(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">Demanda vinculada:</span>
        <select value={m.taskId || ""} onChange={(e) => onUpdateMonth(m.id, { taskId: e.target.value || null })} className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 min-w-0">
          <option value="">Nenhuma</option>
          {clientTasks.filter((t) => !t.done).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        {linked && <span className="text-xs text-violet-500 truncate max-w-xs">{linked.title}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-1 pr-2 font-medium w-20">Data</th>
              <th className="py-1 pr-2 font-medium w-24">Tipo</th>
              <th className="py-1 pr-2 font-medium">Descrição</th>
              <th className="py-1 pr-2 font-medium w-32">Status</th>
              <th className="py-1 pr-2 font-medium w-14">Restam</th>
              <th className="py-1 pr-2 font-medium w-28">Resp. externo</th>
              <th className="py-1 w-5" />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 align-top">
                <td className="py-1 pr-2">
                  <input type="date" value={p.date || ""} onChange={(e) => onUpdatePost(m.id, p.id, { date: e.target.value || "" })} className="border border-slate-200 rounded px-1 py-0.5 w-full" />
                </td>
                <td className="py-1 pr-2">
                  <select value={p.tipo} onChange={(e) => onUpdatePost(m.id, p.id, { tipo: e.target.value })} className="border border-slate-200 rounded px-1 py-0.5 w-full">
                    {POST_TIPOS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <input value={p.desc || ""} onChange={(e) => onUpdatePost(m.id, p.id, { desc: e.target.value })} placeholder="Descreva o post" className="border border-slate-200 rounded px-1 py-0.5 w-full" />
                </td>
                <td className="py-1 pr-2">
                  <select value={p.status} onChange={(e) => onUpdatePost(m.id, p.id, { status: e.target.value })} className={`border border-slate-200 rounded px-1 py-0.5 w-full font-medium ${POST_STATUS[p.status]?.bg} ${POST_STATUS[p.status]?.text}`}>
                    {Object.entries(POST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  {(() => { const h = postRemainingHours(p); return h > 0 ? <span className="text-violet-700 font-semibold">{h}h</span> : <span className="text-slate-300">0h</span>; })()}
                </td>
                <td className="py-1 pr-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input type="checkbox" checked={!!p.externalOwner} onChange={(e) => onUpdatePost(m.id, p.id, { externalOwner: e.target.checked, ownerName: e.target.checked ? (p.ownerName || "") : "" })} className="w-3 h-3 accent-sky-500" />
                      <span className="text-slate-400">externo</span>
                    </label>
                    {p.externalOwner && (
                      <input value={p.ownerName || ""} onChange={(e) => onUpdatePost(m.id, p.id, { ownerName: e.target.value })} placeholder="Nome" className="border border-slate-200 rounded px-1 py-0.5 w-full" />
                    )}
                  </div>
                </td>
                <td className="py-1">
                  <button onClick={() => onDeletePost(m.id, p.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isArchive && (
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button onClick={() => onAddPost(m.id)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
            <Plus size={13} /> Adicionar post
          </button>
          <button onClick={() => setShowPaste(!showPaste)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
            <ListChecks size={13} /> Colar lista
          </button>
        </div>
      )}
      {showPaste && !isArchive && (
        <div className="mt-2 bg-violet-50 rounded-lg p-2 border border-violet-100">
          <p className="text-xs text-slate-500 mb-1">Cole um post por linha. A data no início é opcional (dd/mm ou dd/mm/aaaa) e pode vir solta, com | ou colada do Excel. Se a linha começar com um tipo (Reels, Stories, Carrossel...), ele também é reconhecido.</p>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"05/07 Reels sobre bastidores\n08/07 | Carrossel | Dicas de organização\nStories enquete\n12/07 Feed foto do escritório"} className="w-full h-28 border border-slate-300 rounded-lg p-2 text-xs" />
          <div className="flex gap-2 mt-1">
            <button onClick={doPaste} className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium">Importar</button>
            <button onClick={() => { setShowPaste(false); setPasteText(""); }} className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PostsView({ client, updateClient, clientTasks }) {
  const months = client.socialMonths || [];
  const [newMonthName, setNewMonthName] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const setMonths = (arr) => updateClient(client.id, { socialMonths: arr });
  const addMonth = () => {
    if (!newMonthName.trim()) return;
    setMonths([...months, { id: uid(), name: newMonthName.trim(), taskId: null, done: false, posts: [] }]);
    setNewMonthName("");
  };
  const updateMonth = (mid, patch) => setMonths(months.map((m) => m.id === mid ? { ...m, ...patch } : m));
  const deleteMonth = (mid) => setMonths(months.filter((m) => m.id !== mid));
  const addPost = (mid) => {
    const m = months.find((x) => x.id === mid);
    if (!m) return;
    updateMonth(mid, { posts: [...(m.posts || []), { id: uid(), date: "", tipo: "Arte única", desc: "", status: POST_STATUS_DEFAULT, externalOwner: false, ownerName: "", workDate: null }] });
  };
  const pasteList = (mid, lines) => {
    const m = months.find((x) => x.id === mid);
    if (!m) return;
    const novos = lines
      .map((linha) => parsePostLine(linha))
      .filter((p) => p && p.desc)
      .map((p) => ({ id: uid(), date: p.date, tipo: p.tipo, desc: p.desc, status: POST_STATUS_DEFAULT, externalOwner: false, ownerName: "", workDate: null }));
    if (novos.length) updateMonth(mid, { posts: [...(m.posts || []), ...novos] });
  };
  const updatePost = (mid, pid, patch) => {
    const m = months.find((x) => x.id === mid);
    if (!m) return;
    updateMonth(mid, { posts: (m.posts || []).map((p) => p.id === pid ? { ...p, ...patch } : p) });
  };
  const deletePost = (mid, pid) => {
    const m = months.find((x) => x.id === mid);
    if (!m) return;
    updateMonth(mid, { posts: (m.posts || []).filter((p) => p.id !== pid) });
  };
  const copyMonth = (m) => {
    const linked = clientTasks.find((t) => t.id === m.taskId);
    const header = `📅 ${m.name}${linked ? ` — ${linked.title}` : ""}`;
    const rows = (m.posts || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((p) => {
      const d = p.date ? fmtBR(p.date) : "sem data";
      const resp = p.externalOwner ? ` (resp: ${p.ownerName || "externo"})` : "";
      return `${d} | ${p.tipo} | ${p.desc || "(sem descrição)"} | ${POST_STATUS[p.status]?.label || p.status}${resp}`;
    });
    navigator.clipboard.writeText([header, ...rows].join("\n")).catch(() => {});
  };

  const active = months.filter((m) => !m.done);
  const archived = months.filter((m) => m.done);

  return (
    <div>
      <div className="flex gap-2 mb-3 items-center">
        <input value={newMonthName} onChange={(e) => setNewMonthName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addMonth(); }} placeholder="Criar mês só de posts (ex: Julho 2026)" className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
        <button onClick={addMonth} className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm"><Plus size={15} /></button>
      </div>
      {active.length === 0 && <p className="text-sm text-slate-400 mb-3">Nenhum mês ativo. Crie um acima.</p>}
      {active.map((m) => (
        <SocialMonthBlock key={m.id} m={m} isArchive={false} clientTasks={clientTasks} onUpdateMonth={updateMonth} onDeleteMonth={deleteMonth} onAddPost={addPost} onUpdatePost={updatePost} onDeletePost={deletePost} onCopy={copyMonth} onPasteList={pasteList} />
      ))}
      {archived.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowArchive(!showArchive)} className="text-xs text-slate-400 hover:text-slate-600">
            {showArchive ? "Ocultar" : "Ver"} arquivo ({archived.length} {archived.length === 1 ? "mês" : "meses"})
          </button>
          {showArchive && archived.map((m) => (
            <SocialMonthBlock key={m.id} m={m} isArchive={true} clientTasks={clientTasks} onUpdateMonth={updateMonth} onDeleteMonth={deleteMonth} onAddPost={addPost} onUpdatePost={updatePost} onDeletePost={deletePost} onCopy={copyMonth} onPasteList={pasteList} />
          ))}
        </div>
      )}
    </div>
  );
}


function ClientInfo({ client, updateClient }) {
  const links = client.links || [];
  const creds = client.creds || [];
  const [lLabel, setLLabel] = useState("");
  const [lUrl, setLUrl] = useState("");
  const [cLabel, setCLabel] = useState("");
  const [cLogin, setCLogin] = useState("");
  const [cSecret, setCSecret] = useState("");
  const [reveal, setReveal] = useState({});

  const addLink = () => { if (!lLabel.trim() && !lUrl.trim()) return; updateClient(client.id, { links: [...links, { id: uid(), label: lLabel.trim() || lUrl.trim(), url: lUrl.trim() }] }); setLLabel(""); setLUrl(""); };
  const delLink = (id) => updateClient(client.id, { links: links.filter((x) => x.id !== id) });
  const addCred = () => { if (!cLabel.trim()) return; updateClient(client.id, { creds: [...creds, { id: uid(), label: cLabel.trim(), login: cLogin.trim(), secret: cSecret }] }); setCLabel(""); setCLogin(""); setCSecret(""); };
  const delCred = (id) => updateClient(client.id, { creds: creds.filter((x) => x.id !== id) });

  return (
    <div className="space-y-4 mt-1">
      <div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Link2 size={13} /> Links e arquivos</p>
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
            <ExternalLink size={13} className="text-violet-400 shrink-0" />
            {l.url ? <a href={href(l.url)} target="_blank" rel="noreferrer" className="text-sm text-violet-700 underline truncate flex-1">{l.label}</a> : <span className="text-sm flex-1">{l.label}</span>}
            <button onClick={() => delLink(l.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="flex flex-col gap-1 mt-2">
          <input value={lLabel} onChange={(e) => setLLabel(e.target.value)} placeholder="Nome (ex: Pasta no Drive, Briefing)" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-1">
            <input value={lUrl} onChange={(e) => setLUrl(e.target.value)} placeholder="Cole o link" className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addLink} className="bg-violet-600 text-white rounded-lg px-3 text-sm"><Plus size={15} /></button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Key size={13} /> Acessos</p>
        <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1 mb-2 flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Salvo sem criptografia ponta a ponta. Para senhas críticas, guarde só uma dica ou use um gerenciador.</p>
        {creds.map((c) => (
          <div key={c.id} className="py-1.5 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium flex-1">{c.label}</span>
              <button onClick={() => setReveal((r) => ({ ...r, [c.id]: !r[c.id] }))} className="text-slate-400 hover:text-violet-600">{reveal[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => delCred(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {c.login && <span>login: {c.login}</span>}
              {c.secret && <span className="ml-2">senha: {reveal[c.id] ? c.secret : "••••••••"}</span>}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-1 mt-2">
          <input value={cLabel} onChange={(e) => setCLabel(e.target.value)} placeholder="Onde (ex: Instagram, Meta Business)" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          <div className="flex gap-1">
            <input value={cLogin} onChange={(e) => setCLogin(e.target.value)} placeholder="Login / usuário" className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={cSecret} onChange={(e) => setCSecret(e.target.value)} placeholder="Senha ou dica" className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={addCred} className="bg-violet-600 text-white rounded-lg px-3 text-sm"><Plus size={15} /></button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><StickyNote size={13} /> Notas</p>
        <textarea value={client.notes || ""} onChange={(e) => updateClient(client.id, { notes: e.target.value })} placeholder="Observações, contatos, particularidades do cliente..." className="w-full h-24 border border-slate-300 rounded-lg p-2 text-sm" />
      </div>
    </div>
  );
}

function Clientes({ data, addTask, toggleTask, delTask, setStatus, addClient, delClient, updateClient, onOpen, stuckDays, onCriarModeloSocial }) {
  const [adding, setAdding] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [openClient, setOpenClient] = useState(null);
  const [view, setView] = useState("demandas");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");

  const openTab = (id) => { if (openClient === id) { setOpenClient(null); } else { setOpenClient(id); setView("demandas"); } };
  const startEdit = (c) => { setEditing(c.id); setEditName(c.name); };
  const saveEdit = (id) => { if (editName.trim()) updateClient(id, { name: editName.trim() }); setEditing(null); };
  const sortedClients = [...data.clients].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  return (
    <div className="space-y-4">
      <Section title="Meus clientes" icon={Users}>
        <div className="flex gap-2 mb-3">
          <input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Nome do cliente"
            onKeyDown={(e) => { if (e.key === "Enter" && newClient.trim()) { addClient(newClient.trim()); setNewClient(""); } }}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => { if (newClient.trim()) { addClient(newClient.trim()); setNewClient(""); } }}
            className="bg-violet-600 text-white rounded-lg px-3 text-sm font-medium"><Plus size={16} /></button>
        </div>
        {data.clients.length === 0 && <p className="text-sm text-slate-400">Adicione seus clientes para organizar as demandas.</p>}
        {sortedClients.map((c) => {
          const ct = data.tasks.filter((t) => t.clientId === c.id);
          const pend = ct.filter((t) => !t.done).length;
          const open = openClient === c.id;
          return (
            <div key={c.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 py-2">
                {editing === c.id ? (
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => saveEdit(c.id)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c.id); }} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm" />
                ) : (
                  <button onClick={() => openTab(c.id)} className="flex-1 flex items-center gap-2 text-left">
                    <span className="text-sm font-medium">{c.name}</span>
                    {pend > 0 && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{pend}</span>}
                  </button>
                )}
                <button onClick={() => startEdit(c)} className="text-slate-300 hover:text-violet-600"><Pencil size={14} /></button>
                <button onClick={() => delClient(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
              {open && (
                <div className="pb-3 pl-1">
                  <div className="flex gap-1 mb-2">
                    <button onClick={() => setView("demandas")} className={`text-xs px-3 py-1 rounded-full border ${view === "demandas" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Demandas</button>
                    <button onClick={() => setView("posts")} className={`text-xs px-3 py-1 rounded-full border ${view === "posts" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Posts</button>
                    <button onClick={() => setView("info")} className={`text-xs px-3 py-1 rounded-full border ${view === "info" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Informações</button>
                  </div>
                  {view === "demandas" ? (
                    ct.length === 0 ? <p className="text-xs text-slate-400 mb-2">Sem demandas para este cliente.</p> :
                      <TaskGroups tasks={ct} data={data} onToggle={toggleTask} onDelete={delTask} onStatus={setStatus} onOpen={onOpen} stuckDays={stuckDays} groupByScope={true} />
                  ) : view === "posts" ? (
                    <div>
                      <ModeloSocialBox client={c} addTask={addTask} updateClient={updateClient} />
                      <PostsView client={c} updateClient={updateClient} clientTasks={ct} />
                    </div>
                  ) : (
                    <ClientInfo client={c} updateClient={updateClient} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="Nova demanda de cliente" icon={Plus} action={
        <button onClick={() => setAdding(!adding)} className="text-violet-600 text-sm">{adding ? "Fechar" : "Abrir"}</button>
      }>
        {data.clients.length === 0 ? <p className="text-sm text-slate-400">Cadastre um cliente primeiro.</p> :
          adding ? <TaskForm area="cliente" clients={sortedClients} onAdd={addTask} onClose={() => setAdding(false)} /> :
          <p className="text-sm text-slate-400">Clique em Abrir para adicionar uma demanda.</p>}
      </Section>
    </div>
  );
}

function Agenda({ data, addMeeting, editMeeting, delMeeting, googleEvents = [], googleStatus = "idle", googleMsg = "", onConnectGoogle, onDisconnectGoogle, onImportGoogle }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(TODAY);
  const [start, setStart] = useState("09:00");
  const [dur, setDur] = useState("60");
  const [editId, setEditId] = useState(null);

  const submit = () => {
    if (!title.trim()) return;
    addMeeting({ title: title.trim(), date, start, durationMin: Number(dur) || 30 });
    setTitle("");
  };

  const upcoming = [...data.meetings].filter((m) => m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || ""));
  const past = [...data.meetings].filter((m) => m.date < TODAY).sort((a, b) => b.date.localeCompare(a.date));
  const googleUpcoming = [...googleEvents].filter((e) => e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || ""));
  const jaImportados = new Set(data.meetings.map((m) => m.googleId).filter(Boolean));

  return (
    <div className="space-y-4">
      <Section title="Google Agenda" icon={Calendar} action={
        googleStatus === "connected"
          ? <div className="flex gap-2 items-center">
              <button onClick={onImportGoogle} className="text-sm bg-violet-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-violet-700">Importar / atualizar</button>
              <button onClick={onDisconnectGoogle} className="text-xs text-slate-400 hover:text-red-500">Desconectar</button>
            </div>
          : <button onClick={onConnectGoogle} disabled={googleStatus === "connecting"} className="text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-60">{googleStatus === "connecting" ? "Conectando..." : "Conectar Google Agenda"}</button>
      }>
        {googleStatus === "connected" ? (
          <div>
            <p className="text-xs text-slate-500 mb-2">Prévia dos eventos do Google (próximos 30 dias). Clique em "Importar / atualizar" para copiá-los para a sua agenda interna, onde ficam salvos e entram no cálculo de horas. {googleMsg && <span className="text-violet-600 font-medium">{googleMsg}</span>}</p>
            {googleUpcoming.length === 0 ? <p className="text-sm text-slate-400">Nenhum evento nos próximos 30 dias.</p> :
              googleUpcoming.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-semibold text-blue-700 w-12">{fmtBR(e.date)}</span>
                  <span className="text-xs font-mono text-slate-500 w-12">{e.allDay ? "dia" : e.start}</span>
                  <span className="text-sm flex-1">{e.title}</span>
                  {jaImportados.has(e.id) ? <span className="text-xs text-green-600 flex items-center gap-0.5"><Check size={11} /> importado</span> : <span className="text-xs text-slate-300">novo</span>}
                  <span className="text-xs text-slate-400">{e.allDay ? "1h" : `${Math.round(e.durationMin)}min`}</span>
                </div>
              ))}
          </div>
        ) : googleStatus === "error" ? (
          <p className="text-sm text-red-600">{googleMsg || "Erro ao conectar."} Tente novamente.</p>
        ) : (
          <p className="text-sm text-slate-400">Conecte sua agenda do Google e importe os eventos para dentro do painel. Uma vez importados, eles ficam salvos e contam no cálculo de horas, mesmo depois que a conexão do Google expirar. Só leitura, próximos 30 dias da agenda principal.</p>
        )}
      </Section>

      <Section title="Nova reunião" icon={Plus}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assunto / com quem"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2" />
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="flex flex-col"><label className="text-xs text-slate-500 mb-0.5">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></div>
          <div className="flex flex-col"><label className="text-xs text-slate-500 mb-0.5">Início</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></div>
          <div className="flex flex-col"><label className="text-xs text-slate-500 mb-0.5">Duração (min)</label>
            <input type="number" min="15" step="15" value={dur} onChange={(e) => setDur(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></div>
        </div>
        <button onClick={submit} className="w-full bg-violet-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-violet-700">Adicionar reunião</button>
      </Section>

      <Section title="Próximas reuniões" icon={Calendar}>
        {upcoming.length === 0 ? <p className="text-sm text-slate-400 py-2">Nenhuma reunião agendada.</p> :
          upcoming.map((m) => editId === m.id ? (
            <div key={m.id} className="py-2 border-b border-slate-100 last:border-0 bg-violet-50 rounded-lg px-2 my-1 space-y-1.5">
              <input value={m.title} onChange={(e) => editMeeting(m.id, { title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              <div className="flex gap-1.5 items-end flex-wrap">
                <div className="flex flex-col"><label className="text-xs text-slate-500">Data</label><input type="date" value={m.date} onChange={(e) => editMeeting(m.id, { date: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm" /></div>
                <div className="flex flex-col"><label className="text-xs text-slate-500">Início</label><input type="time" value={m.start || ""} onChange={(e) => editMeeting(m.id, { start: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm" /></div>
                <div className="flex flex-col"><label className="text-xs text-slate-500">Min</label><input type="number" min="15" step="15" value={m.durationMin} onChange={(e) => editMeeting(m.id, { durationMin: Number(e.target.value) || 0 })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-16" /></div>
                <button onClick={() => setEditId(null)} className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-sm ml-auto">OK</button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs font-semibold text-violet-700 w-12">{fmtBR(m.date)}</span>
              <span className="text-sm font-mono text-slate-600 w-12">{m.start}</span>
              <span className="text-sm flex-1">{m.title}{m.googleId && <span className="text-xs text-blue-400 ml-1">· Google</span>}</span>
              <span className="text-xs text-slate-400">{Math.round(m.durationMin)}min</span>
              <button onClick={() => setEditId(m.id)} className="text-slate-300 hover:text-violet-600"><Pencil size={14} /></button>
              <button onClick={() => delMeeting(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
      </Section>

      {past.length > 0 && (
        <Section title="Anteriores" icon={Clock}>
          {past.slice(0, 8).map((m) => editId === m.id ? (
            <div key={m.id} className="py-2 border-b border-slate-100 last:border-0 bg-violet-50 rounded-lg px-2 my-1 space-y-1.5">
              <input value={m.title} onChange={(e) => editMeeting(m.id, { title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              <div className="flex gap-1.5 items-end flex-wrap">
                <div className="flex flex-col"><label className="text-xs text-slate-500">Data</label><input type="date" value={m.date} onChange={(e) => editMeeting(m.id, { date: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm" /></div>
                <div className="flex flex-col"><label className="text-xs text-slate-500">Início</label><input type="time" value={m.start || ""} onChange={(e) => editMeeting(m.id, { start: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm" /></div>
                <div className="flex flex-col"><label className="text-xs text-slate-500">Min</label><input type="number" min="15" step="15" value={m.durationMin} onChange={(e) => editMeeting(m.id, { durationMin: Number(e.target.value) || 0 })} className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-16" /></div>
                <button onClick={() => setEditId(null)} className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-sm ml-auto">OK</button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0 opacity-60">
              <span className="text-xs text-slate-400 w-12">{fmtBR(m.date)}</span>
              <span className="text-sm flex-1">{m.title}</span>
              <span className="text-xs text-slate-400">{Math.round(m.durationMin)}min</span>
              <button onClick={() => setEditId(m.id)} className="text-slate-300 hover:text-violet-600"><Pencil size={14} /></button>
              <button onClick={() => delMeeting(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Relatorio({ data, onRestore }) {
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  const monthLabel = (() => { const [y, m] = ym.split("-"); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); })();
  const inMonth = (t) => (t.deadline || "").slice(0, 7) === ym || (t.createdAt || "").slice(0, 7) === ym || (t.completedAt || "").slice(0, 7) === ym || (t.doneDate || "").slice(0, 7) === ym;

  const mt = data.tasks.filter(inMonth);
  const done = mt.filter((t) => t.done);
  const espera = mt.filter((t) => !t.done && t.status === "espera");
  const ativa = mt.filter((t) => !t.done && t.status !== "espera");
  const horasTotal = mt.reduce((s, t) => s + (t.estTime || 0), 0);
  const horasDone = done.reduce((s, t) => s + (t.estTime || 0), 0);
  const meetings = data.meetings.filter((m) => (m.date || "").slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));

  const groups = [];
  [...data.clients].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })).forEach((c) => {
    const list = mt.filter((t) => t.area === "cliente" && t.clientId === c.id);
    if (list.length) groups.push({ name: c.name, list });
  });
  ["acohub", "novello", "pessoal", "freela"].forEach((a) => {
    const list = mt.filter((t) => t.area === a);
    if (list.length) groups.push({ name: AREAS[a].label, list });
  });

  const RepRow = (t) => (
    <div key={t.id} className="py-1 text-sm border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${URG[t.urgency].dot}`} />
        <span className="flex-1">{t.title}{t.recurrence !== "none" && <span className="text-xs text-violet-400"> ({REC[t.recurrence]})</span>}{subProgress(t) && <span className="text-xs text-violet-400"> [{subProgress(t)}]</span>}</span>
        <span className="text-xs text-slate-400 whitespace-nowrap w-10 text-right">{t.estTime ? `${t.estTime}h` : ""}</span>
        <span className="text-xs text-slate-400 whitespace-nowrap w-16 text-right">{t.deadline ? fmtBR(t.deadline) : "sem prazo"}</span>
      </div>
      {(t.subtasks || []).length > 0 && (
        <div className="pl-4 mt-0.5">
          {(t.subtasks || []).map((s) => (
            <div key={s.id} className="text-xs text-slate-500 flex items-center gap-1">
              {s.done ? <Check size={10} className="text-green-600" /> : <span className="w-2.5" />}
              <span className={s.done ? "line-through" : ""}>{s.title}</span>
              {s.deadline && <span className="text-slate-300">{fmtBR(s.deadline)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-0.5">Mês do relatório</label>
          <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={() => { try { window.print(); } catch (e) {} }} className="flex items-center gap-1 bg-violet-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-violet-700">
          <Printer size={15} /> Imprimir / Salvar PDF
        </button>
      </div>

      <Section title={`Relatório de ${monthLabel}`} icon={FileText}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Total de demandas" value={mt.length} />
          <Stat label="Concluídas" value={done.length} />
          <Stat label="Ativas" value={ativa.length} />
          <Stat label="Em espera" value={espera.length} />
          <Stat label="Horas estimadas" value={`${horasTotal.toFixed(1)}h`} />
          <Stat label="Horas concluídas" value={`${horasDone.toFixed(1)}h`} />
        </div>
      </Section>

      {groups.length === 0 ? (
        <Section title="Demandas" icon={CircleDot}><p className="text-sm text-slate-400">Nenhuma demanda registrada neste mês.</p></Section>
      ) : groups.map((g) => {
        const pend = g.list.filter((t) => !t.done);
        const conc = g.list.filter((t) => t.done);
        return (
          <Section key={g.name} title={g.name} icon={CircleDot}>
            {pend.length > 0 && <div className="mb-3"><p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Pendentes ({pend.length})</p>{pend.map(RepRow)}</div>}
            {conc.length > 0 && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Concluídas ({conc.length})</p>{conc.map(RepRow)}</div>}
          </Section>
        );
      })}

      {meetings.length > 0 && (
        <Section title="Reuniões do mês" icon={Calendar}>
          {meetings.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-1 text-sm border-b border-slate-100 last:border-0">
              <span className="text-xs font-semibold text-violet-700 w-12">{fmtBR(m.date)}</span>
              <span className="text-xs font-mono text-slate-500 w-12">{m.start}</span>
              <span className="flex-1">{m.title}</span>
            </div>
          ))}
        </Section>
      )}

      <BackupBox data={data} onRestore={onRestore} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-violet-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-violet-800">{value}</p>
    </div>
  );
}

function BackupBox({ data, onRestore }) {
  const [open, setOpen] = useState(false);
  const [imp, setImp] = useState("");
  const [msg, setMsg] = useState("");
  const json = JSON.stringify(data, null, 2);

  const copy = async () => { try { await navigator.clipboard.writeText(json); setMsg("Backup copiado. Cole num arquivo seguro."); } catch (e) { setMsg("Selecione o texto abaixo e copie manualmente."); } };
  const download = () => {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `painel-backup-${TODAY}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMsg("Download iniciado.");
    } catch (e) { setMsg("Download bloqueado aqui. Use Copiar."); }
  };
  const restore = () => {
    try {
      const p = JSON.parse(imp);
      if (!p || !Array.isArray(p.tasks)) throw new Error("formato");
      onRestore(p); setMsg("Dados restaurados com sucesso.");
    } catch (e) { setMsg("JSON inválido. Confira o texto colado."); }
  };

  return (
    <div className="no-print bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Download size={15} className="text-violet-500" /> Backup completo dos dados</h2>
        <button onClick={() => setOpen(!open)} className="text-violet-600 text-sm">{open ? "Fechar" : "Abrir"}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">Backup de tudo (clientes, demandas, subtarefas, reuniões, links e acessos). Guarde num arquivo seguro. Para restaurar, cole o conteúdo no campo de baixo.</p>
          <div className="flex gap-2">
            <button onClick={copy} className="flex items-center gap-1 bg-violet-600 text-white rounded-lg px-3 py-2 text-sm"><Copy size={14} /> Copiar</button>
            <button onClick={download} className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"><Download size={14} /> Baixar .json</button>
          </div>
          <textarea readOnly value={json} className="w-full h-24 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-500 bg-slate-50" />
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Restaurar de um backup</p>
            <textarea value={imp} onChange={(e) => setImp(e.target.value)} placeholder="Cole aqui o conteúdo de um backup salvo" className="w-full h-20 border border-slate-300 rounded-lg p-2 text-xs font-mono" />
            <button onClick={restore} className="mt-1 bg-orange-600 text-white rounded-lg px-3 py-2 text-sm">Restaurar (substitui os dados atuais)</button>
          </div>
          {msg && <p className="text-xs text-violet-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
