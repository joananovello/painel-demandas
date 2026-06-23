import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, Users, Building2, BookOpen, Heart, Zap, Plus, Trash2, Check, Clock, AlertTriangle, X, Settings, CalendarClock, CircleDot, Repeat, PauseCircle, PlayCircle, FileText, Printer, Copy, Download, Link2, Key, Eye, EyeOff, ExternalLink, StickyNote, Pencil, ListChecks } from "lucide-react";

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
const migTasks = (ts) => (ts || []).map((t) => ({ status: "ativa", recurrence: "none", notes: "", subtasks: [], createdAt: nowISO(), statusSince: nowISO(), ...t, subtasks: (t.subtasks || []).map((s) => ({ estTime: 0, ...s })), notes: t.notes || "" }));
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
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hoje");
  const [showSettings, setShowSettings] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const loaded = useRef(false);

  // Carrega do navegador (localStorage). Na próxima etapa, isso vira Supabase.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        p.tasks = migTasks(p.tasks);
        p.clients = migClients(p.clients);
        p.settings = { workHours: 8, stuckDays: 7, ...(p.settings || {}) };
        setData({ ...emptyData, ...p });
      }
    } catch (e) {}
    loaded.current = true;
    setLoading(false);
  }, []);

  // Salva no navegador a cada mudança.
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }, [data]);

  const sched = useMemo(() => buildSchedule(data.tasks, data.meetings, data.settings.workHours), [data]);

  const addTask = (t) => setData((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), done: false, status: "ativa", recurrence: "none", notes: "", subtasks: [], createdAt: nowISO(), statusSince: nowISO(), ...t }] }));
  const editTask = (id, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const toggleTask = (id) => setData((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return d;
    const becomingDone = !t.done;
    let tasks = d.tasks.map((x) => (x.id === id ? { ...x, done: becomingDone, completedAt: becomingDone ? nowISO() : null } : x));
    if (becomingDone && t.recurrence && t.recurrence !== "none") {
      const base = t.deadline || TODAY;
      const next = advanceDate(base, t.recurrence);
      tasks = [...tasks, { ...t, id: uid(), done: false, status: "ativa", deadline: next, createdAt: nowISO(), statusSince: nowISO(), completedAt: null, subtasks: (t.subtasks || []).map((s) => ({ ...s, id: uid(), done: false })) }];
    }
    return { ...d, tasks };
  });
  const toggleSubtask = (taskId, subId) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) } : t)) }));
  const setStatus = (id, status) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status, statusSince: nowISO() } : t)) }));
  const delTask = (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  const addClient = (name) => setData((d) => ({ ...d, clients: [...d.clients, { id: uid(), name, links: [], creds: [], notes: "" }] }));
  const delClient = (id) => setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id), tasks: d.tasks.filter((t) => t.clientId !== id) }));
  const updateClient = (id, patch) => setData((d) => ({ ...d, clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addMeeting = (m) => setData((d) => ({ ...d, meetings: [...d.meetings, { id: uid(), ...m }] }));
  const delMeeting = (id) => setData((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }));
  const setSetting = (k, v) => setData((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const restoreData = (p) => setData({ ...emptyData, ...p, tasks: migTasks(p.tasks), clients: migClients(p.clients), settings: { workHours: 8, stuckDays: 7, ...(p.settings || {}) } });

  if (loading) return <div className="flex items-center justify-center h-64 text-violet-600">Carregando seu painel...</div>;
  const sd = data.settings.stuckDays;
  const detailTask = detailId ? data.tasks.find((t) => t.id === detailId) : null;

  return (
    <div className="min-h-screen bg-violet-50 text-slate-800">
      <style>{`@media print { .no-print{display:none !important;} body{background:#fff;} }`}</style>
      <div className="max-w-3xl mx-auto p-4">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-violet-900">Painel de Demandas</h1>
            <p className="text-xs text-violet-500">Joana • organização semanal e diária</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="no-print p-2 rounded-lg bg-white border border-violet-200 text-violet-600 hover:bg-violet-100">
            <Settings size={18} />
          </button>
        </header>

        <nav className="no-print flex gap-1 overflow-x-auto pb-2 mb-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:bg-violet-100"}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "hoje" && <Hoje data={data} sched={sched} toggleTask={toggleTask} toggleSubtask={toggleSubtask} setStatus={setStatus} onOpen={setDetailId} />}
        {tab === "agenda" && <Agenda data={data} addMeeting={addMeeting} delMeeting={delMeeting} />}
        {tab === "relatorio" && <Relatorio data={data} onRestore={restoreData} />}
        {tab === "cliente" && <Clientes data={data} addTask={addTask} toggleTask={toggleTask} delTask={delTask} setStatus={setStatus} addClient={addClient} delClient={delClient} updateClient={updateClient} stuckDays={sd} onOpen={setDetailId} />}
        {["acohub", "novello", "pessoal", "freela"].includes(tab) && (
          <AreaView area={tab} data={data} addTask={addTask} toggleTask={toggleTask} delTask={delTask} setStatus={setStatus} stuckDays={sd} onOpen={setDetailId} />
        )}
      </div>

      {detailTask && <TaskDetail task={detailTask} data={data} onEdit={editTask} onDelete={(id) => { delTask(id); setDetailId(null); }} onClose={() => setDetailId(null)} />}

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

function Card({ t, data, onToggle, onStatus, onOpen, stuckDays, todayHours }) {
  const u = URG[t.urgency];
  const client = t.clientId ? data.clients.find((c) => c.id === t.clientId) : null;
  const tag = t.area === "cliente" ? (client ? client.name : "Cliente") : AREAS[t.area].label;
  const recurring = t.recurrence && t.recurrence !== "none";
  const stuck = !t.done && stuckDays && (t.status === "espera" || !t.deadline) && daysSince(t.statusSince) >= stuckDays;
  const overdue = !t.done && t.deadline && t.deadline < TODAY;
  const prog = subProgress(t);
  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${u.lb} p-2 mb-2`}>
      <div className="flex items-start gap-1.5">
        {onToggle && (
          <button onClick={() => onToggle(t.id)} className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${t.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>
            {t.done && <Check size={11} />}
          </button>
        )}
        <p onClick={() => onOpen && onOpen(t.id)} className={`text-sm flex-1 leading-snug cursor-pointer hover:text-violet-700 ${t.done ? "line-through text-slate-400" : ""}`}>{recurring && <Repeat size={11} className="inline text-violet-400 mr-0.5" />}{t.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
        <span className="text-xs text-slate-400">{tag}</span>
        {todayHours > 0 && <span className="text-xs font-semibold text-violet-700">{todayHours.toFixed(1)}h hoje</span>}
        {t.deadline && <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-slate-400"}`}>{overdue ? "vencida " : "entrega "}{fmtBR(t.deadline)}</span>}
        {prog && <span className="text-xs text-violet-500 flex items-center gap-0.5"><ListChecks size={10} />{prog}</span>}
        {(t.notes || "").trim() && <StickyNote size={10} className="text-slate-300" />}
        {stuck && <span className="text-xs px-1 rounded bg-orange-100 text-orange-700 flex items-center gap-0.5"><AlertTriangle size={9} />{daysSince(t.statusSince)}d</span>}
      </div>
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

function SubtaskCard({ task, sub, data, onToggleSub, onOpen, todayHours }) {
  const u = URG[task.urgency];
  const client = task.clientId ? data.clients.find((c) => c.id === task.clientId) : null;
  const tag = task.area === "cliente" ? (client ? client.name : "Cliente") : AREAS[task.area].label;
  const overdue = !sub.done && sub.deadline && sub.deadline < TODAY;
  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${u.lb} p-2 mb-2`}>
      <div className="flex items-start gap-1.5">
        <button onClick={() => onToggleSub(task.id, sub.id)} className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${sub.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>
          {sub.done && <Check size={11} />}
        </button>
        <div className="flex-1 min-w-0">
          <p onClick={() => onOpen && onOpen(task.id)} className={`text-sm leading-snug cursor-pointer hover:text-violet-700 ${sub.done ? "line-through text-slate-400" : ""}`}>{sub.title}</p>
          <p className="text-xs text-slate-400 truncate">{tag} • {task.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs">
        {todayHours > 0 && <span className="font-semibold text-violet-700">{todayHours.toFixed(1)}h hoje</span>}
        {sub.deadline && <span className={overdue ? "text-red-600 font-medium" : "text-slate-400"}>{overdue ? "vencida " : "entrega "}{fmtBR(sub.deadline)}</span>}
        {sub.estTime > 0 && <span className="text-slate-300">{sub.estTime}h</span>}
        <span className="text-violet-400 flex items-center gap-0.5"><ListChecks size={10} />subtarefa</span>
      </div>
    </div>
  );
}

function KColumn({ title, count, accent, today, children }) {
  return (
    <div className={`w-60 shrink-0 rounded-xl p-2 ${today ? "bg-violet-50 ring-2 ring-violet-300" : "bg-slate-100"}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className={`text-xs font-bold uppercase tracking-wide ${accent || "text-slate-600"}`}>{title}</span>
        <span className="text-xs text-slate-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

function Hoje({ data, sched, toggleTask, toggleSubtask, setStatus, onOpen }) {
  const wh = data.settings.workHours;
  const sd = data.settings.stuckDays;
  const tasks = data.tasks;
  const meetHours = sched.meetingHours[TODAY] || 0;

  const findSub = (taskId, subId) => { const t = tasks.find((x) => x.id === taskId); return { task: t, sub: t ? (t.subtasks || []).find((s) => s.id === subId) : null }; };

  const todoUnits = sched.units
    .filter((un) => (sched.perUnitToday[un.id] || 0) > 0 || un.deadline <= TODAY)
    .map((un) => { const r = findSub(un.taskId, un.subId); return { ...un, task: r.task, sub: r.sub, hoje: sched.perUnitToday[un.id] || 0 }; })
    .filter((un) => un.task)
    .sort((a, b) => { const ov = (a.deadline < TODAY ? 0 : 1) - (b.deadline < TODAY ? 0 : 1); if (ov !== 0) return ov; return URG[b.urgency].rank - URG[a.urgency].rank || a.deadline.localeCompare(b.deadline); });

  const esperaT = tasks.filter((t) => !t.done && t.status === "espera" && t.deadline && t.deadline <= TODAY);
  const feito = tasks.filter((t) => t.done && (t.completedAt || "").slice(0, 10) === TODAY);

  const taskHours = todoUnits.reduce((s, un) => s + un.hoje, 0);
  const committed = taskHours + meetHours;
  const pct = Math.min(100, Math.round((committed / wh) * 100));
  const over = committed > wh + 0.01;

  const ws = today0();
  ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const week = labels.map((lb, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    const key = toKey(d);
    return {
      key, label: lb, num: d.getDate(),
      tasks: tasks.filter((t) => t.deadline === key).sort((a, b) => Number(a.done) - Number(b.done) || URG[b.urgency].rank - URG[a.urgency].rank),
      subs: tasks.flatMap((t) => (t.subtasks || []).filter((s) => s.deadline === key).map((s) => ({ task: t, sub: s }))).sort((a, b) => Number(a.sub.done) - Number(b.sub.done)),
      meetings: data.meetings.filter((m) => m.date === key).sort((a, b) => (a.start || "").localeCompare(b.start || "")),
    };
  });

  const dataExt = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-5">
      <p className="text-sm text-violet-700 capitalize font-medium">{dataExt}</p>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Carga do dia</span>
          <span className={`text-sm font-bold ${over ? "text-red-600" : "text-violet-700"}`}>{committed.toFixed(1)}h / {wh}h</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-violet-500"}`} style={{ width: `${pct}%` }} />
        </div>
        {over && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> Dia sobrecarregado. Considere renegociar um prazo ou delegar.</p>}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><CalendarClock size={15} className="text-violet-500" /> Hoje</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <KColumn title="A fazer" count={todoUnits.length} accent="text-violet-700" today>
            {todoUnits.length === 0 ? <p className="text-xs text-slate-400 px-1">Nada travado para hoje.</p> :
              todoUnits.map((un) => un.sub
                ? <SubtaskCard key={un.id} task={un.task} sub={un.sub} data={data} onToggleSub={toggleSubtask} onOpen={onOpen} todayHours={un.hoje} />
                : <Card key={un.id} t={un.task} data={data} onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen} stuckDays={sd} todayHours={un.hoje} />)}
          </KColumn>
          <KColumn title="Em espera" count={esperaT.length} accent="text-slate-500">
            {esperaT.length === 0 ? <p className="text-xs text-slate-400 px-1">Vazio.</p> :
              esperaT.map((t) => <Card key={t.id} t={t} data={data} onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen} stuckDays={sd} />)}
          </KColumn>
          <KColumn title="Feito hoje" count={feito.length} accent="text-green-600">
            {feito.length === 0 ? <p className="text-xs text-slate-400 px-1">Nada concluído ainda.</p> :
              feito.map((t) => <Card key={t.id} t={t} data={data} onToggle={toggleTask} onOpen={onOpen} stuckDays={sd} />)}
          </KColumn>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Calendar size={15} className="text-violet-500" /> Semana <span className="text-xs font-normal text-slate-400">(por data de entrega)</span></h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {week.map((d) => (
            <KColumn key={d.key} title={`${d.label} ${d.num}`} count={d.tasks.length + d.subs.length + d.meetings.length} today={d.key === TODAY}>
              {d.meetings.map((m) => <MeetingCard key={m.id} m={m} />)}
              {d.subs.map(({ task, sub }) => <SubtaskCard key={sub.id} task={task} sub={sub} data={data} onToggleSub={toggleSubtask} onOpen={onOpen} todayHours={d.key === TODAY ? (sched.perUnitToday[`${task.id}::${sub.id}`] || 0) : 0} />)}
              {d.tasks.map((t) => <Card key={t.id} t={t} data={data} onToggle={toggleTask} onStatus={setStatus} onOpen={onOpen} stuckDays={sd} />)}
              {d.tasks.length === 0 && d.subs.length === 0 && d.meetings.length === 0 && <p className="text-xs text-slate-300 px-1">sem entregas</p>}
            </KColumn>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ m }) {
  return (
    <div className="bg-violet-100 rounded-lg border border-violet-200 p-2 mb-2">
      <div className="flex items-center gap-1 text-violet-800">
        <Calendar size={12} /><span className="text-xs font-mono font-semibold">{m.start || "--:--"}</span>
        <span className="text-xs text-violet-500 ml-auto">{Math.round(m.durationMin)}min</span>
      </div>
      <p className="text-sm text-violet-900 mt-0.5">{m.title}</p>
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
  const [t, setT] = useState({ title: "", area, clientId: area === "cliente" ? (clients[0]?.id || null) : null, scope: area === "cliente" ? "semana" : "pontual", deadline: "", estTime: 1, urgency: "media", recurrence: "none" });
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

function TaskDetail({ task, data, onEdit, onDelete, onClose }) {
  const t = task;
  const isMonthly = t.scope === "mes";
  const subs = t.subtasks || [];
  const hasSchedulableSubs = subs.some((s) => s.deadline && (s.estTime || 0) > 0);
  const [stitle, setStitle] = useState("");
  const [sdate, setSdate] = useState("");
  const [stime, setStime] = useState("");
  const [sweek, setSweek] = useState(1);

  const setSubs = (arr) => onEdit(t.id, { subtasks: arr });
  const addSub = () => {
    if (!stitle.trim()) return;
    setSubs([...subs, { id: uid(), title: stitle.trim(), deadline: sdate || null, estTime: Number(stime) || 0, week: isMonthly ? Number(sweek) : null, done: false }]);
    setStitle(""); setSdate(""); setStime("");
  };
  const upSub = (id, patch) => setSubs(subs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const delSub = (id) => setSubs(subs.filter((s) => s.id !== id));

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
    <div key={s.id} className="flex items-center gap-1.5 py-1">
      <button onClick={() => upSub(s.id, { done: !s.done })} className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${s.done ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}>{s.done && <Check size={11} />}</button>
      <input value={s.title} onChange={(e) => upSub(s.id, { title: e.target.value })} className={`flex-1 min-w-0 text-sm border-b border-transparent focus:border-slate-300 outline-none ${s.done ? "line-through text-slate-400" : ""}`} />
      <input type="date" value={s.deadline || ""} onChange={(e) => upSub(s.id, { deadline: e.target.value || null })} className="text-xs border border-slate-200 rounded px-1 py-0.5 w-24 shrink-0" />
      <input type="number" min="0" step="0.5" value={s.estTime || ""} onChange={(e) => upSub(s.id, { estTime: Number(e.target.value) || 0 })} placeholder="h" className="text-xs border border-slate-200 rounded px-1 py-0.5 w-10 shrink-0" />
      <button onClick={() => delSub(s.id)} className="text-slate-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
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
        <TaskFields t={t} clients={data.clients} onChange={(patch) => onEdit(t.id, patch)} allowArea={true} />
        {hasSchedulableSubs && <p className="text-xs text-violet-500 mt-1">Esta demanda tem subtarefas com prazo, então o cálculo do dia agenda as subtarefas (o tempo da demanda mãe é ignorado).</p>}

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
        <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1 mb-2 flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Salvo sem criptografia. Para senhas críticas, guarde só uma dica ou use um gerenciador.</p>
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

function Clientes({ data, addTask, toggleTask, delTask, setStatus, addClient, delClient, updateClient, onOpen, stuckDays }) {
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
                    <button onClick={() => setView("info")} className={`text-xs px-3 py-1 rounded-full border ${view === "info" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200"}`}>Informações</button>
                  </div>
                  {view === "demandas" ? (
                    ct.length === 0 ? <p className="text-xs text-slate-400 mb-2">Sem demandas para este cliente.</p> :
                      <TaskGroups tasks={ct} data={data} onToggle={toggleTask} onDelete={delTask} onStatus={setStatus} onOpen={onOpen} stuckDays={stuckDays} groupByScope={true} />
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

function Agenda({ data, addMeeting, delMeeting }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(TODAY);
  const [start, setStart] = useState("09:00");
  const [dur, setDur] = useState("60");

  const submit = () => {
    if (!title.trim()) return;
    addMeeting({ title: title.trim(), date, start, durationMin: Number(dur) || 30 });
    setTitle("");
  };

  const upcoming = [...data.meetings].filter((m) => m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date) || (a.start || "").localeCompare(b.start || ""));
  const past = [...data.meetings].filter((m) => m.date < TODAY).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
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
          upcoming.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className="text-xs font-semibold text-violet-700 w-12">{fmtBR(m.date)}</span>
              <span className="text-sm font-mono text-slate-600 w-12">{m.start}</span>
              <span className="text-sm flex-1">{m.title}</span>
              <span className="text-xs text-slate-400">{Math.round(m.durationMin)}min</span>
              <button onClick={() => delMeeting(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
      </Section>

      {past.length > 0 && (
        <Section title="Anteriores" icon={Clock}>
          {past.slice(0, 8).map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0 opacity-60">
              <span className="text-xs text-slate-400 w-12">{fmtBR(m.date)}</span>
              <span className="text-sm flex-1">{m.title}</span>
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
  const inMonth = (t) => (t.deadline || "").slice(0, 7) === ym || (t.createdAt || "").slice(0, 7) === ym || (t.completedAt || "").slice(0, 7) === ym;

  const mt = data.tasks.filter(inMonth);
  const done = mt.filter((t) => t.done);
  const espera = mt.filter((t) => !t.done && t.status === "espera");
  const ativa = mt.filter((t) => !t.done && t.status !== "espera");
  const horasTotal = mt.reduce((s, t) => s + (t.estTime || 0), 0);
  const horasDone = done.reduce((s, t) => s + (t.estTime || 0), 0);
  const meetings = data.meetings.filter((m) => (m.date || "").slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));

  const groups = [];
  [...data.clients].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })).forEach((c) => { const list = mt.filter((t) => t.area === "cliente" && t.clientId === c.id); if (list.length) groups.push({ name: c.name, list }); });
  ["acohub", "novello", "pessoal", "freela"].forEach((a) => { const list = mt.filter((t) => t.area === a); if (list.length) groups.push({ name: AREAS[a].label, list }); });

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
          {(t.subtasks || []).map((s) => <div key={s.id} className="text-xs text-slate-500 flex items-center gap-1">{s.done ? <Check size={10} className="text-green-600" /> : <span className="w-2.5" />}<span className={s.done ? "line-through" : ""}>{s.title}</span>{s.deadline && <span className="text-slate-300">{fmtBR(s.deadline)}</span>}</div>)}
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
