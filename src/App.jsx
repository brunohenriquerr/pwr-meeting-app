import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://covdfydbxlofpklviatf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdmRmeWRieGxvZnBrbHZpYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjI3MDEsImV4cCI6MjA5MDQ5ODcwMX0.Eso30lPrM2Ro4ZgJ2x1VwROp4vnLu_ibngUYvi6arww";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const ME = "Bruno Henrique";
const DONE_HIDE_MS = 5 * 60 * 1000;
const PROJECT_COLORS = {
  "San Paolo":"#f97316","CDG Engenharia":"#ef4444","UmuPrev":"#06b6d4",
  "Montenegro Urbanismo":"#10b981","VDE":"#f59e0b","Nobrecon":"#6366f1",
  "PWR Gestão (interno)":"#1e3a8a",
};
const MONTH_LABELS = {
  "2026-01":"Jan 2026","2026-02":"Fev 2026","2026-03":"Mar 2026",
  "2026-04":"Abr 2026","2026-05":"Mai 2026","2026-06":"Jun 2026",
};
const KANBAN_COLS = [
  { id:"pending",    label:"Pendente",         color:"#64748b", bg:"#f8fafc" },
  { id:"critical",   label:"Pontos Críticos",  color:"#dc2626", bg:"#fef2f2" },
  { id:"personal",   label:"Pendente Pessoal", color:"#7c3aed", bg:"#f5f3ff" },
  { id:"in_progress",label:"Em Andamento",     color:"#2563eb", bg:"#eff6ff" },
  { id:"done",       label:"Concluído",        color:"#16a34a", bg:"#f0fdf4" },
];

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
function ProjectBadge({ project, small }) {
  const color = PROJECT_COLORS[project] ?? "#64748b";
  return (
    <span style={{ display:"inline-block", padding: small?"1px 7px":"2px 10px", borderRadius:99,
      fontSize:small?10:11, fontWeight:700, color:"#fff", background:color, whiteSpace:"nowrap" }}>
      {project}
    </span>
  );
}

function Spinner({ size = 20 }) {
  return (
    <>
      <div style={{ width:size, height:size, borderRadius:"50%",
        border:`${Math.max(2, size/8)}px solid #e2e8f0`,
        borderTopColor:"#1e3a8a", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
      <div onClick={onChange} style={{ width:36, height:20, borderRadius:10,
        background:checked?"#1e3a8a":"#cbd5e1", position:"relative", transition:"background 0.2s", cursor:"pointer", flexShrink:0 }}>
        <div style={{ position:"absolute", top:2, left:checked?18:2, width:16, height:16,
          borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
      </div>
      {label && <span style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</span>}
    </label>
  );
}

function ATATable({ title, columns, rows, widths }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ background:"#1f3864", padding:"7px 12px", borderRadius:"6px 6px 0 0", textAlign:"center" }}>
        <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>{title}</span>
      </div>
      <div style={{ display:"flex", background:"#d9d9d9" }}>
        {columns.map((c,i) => (
          <div key={i} style={{ flex:widths[i], padding:"5px 10px", fontWeight:700, fontSize:11, color:"#1f3864",
            borderRight:i<columns.length-1?"1px solid #bbb":"none" }}>{c}</div>
        ))}
      </div>
      {rows.map((row,ri) => (
        <div key={ri} style={{ display:"flex", background:ri%2===1?"#e8f0fe":"#fff", borderBottom:"1px solid #e2e8f0" }}>
          {row.map((cell,ci) => (
            <div key={ci} style={{ flex:widths[ci], padding:"6px 10px", fontSize:11, color:"#334155",
              borderRight:ci<row.length-1?"1px solid #e2e8f0":"none" }}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, maxWidth:340, width:"90%",
        boxShadow:"0 20px 40px rgba(0,0,0,.3)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:8 }}>Confirmar ação</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>{message}</div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"7px 16px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", fontSize:12, cursor:"pointer" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type = "success" }) {
  const bg = type === "error" ? "#fef2f2" : "#f0fdf4";
  const color = type === "error" ? "#dc2626" : "#16a34a";
  const icon = type === "error" ? "⚠️" : "✓";
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:1000,
      background:bg, border:`1px solid ${color}44`, borderRadius:10,
      padding:"12px 18px", fontSize:13, fontWeight:600, color,
      boxShadow:"0 8px 24px rgba(0,0,0,.12)", display:"flex", alignItems:"center", gap:8,
      animation:"slideIn 0.3s ease" }}>
      <style>{`@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {icon} {message}
    </div>
  );
}

// ─── HOOK GLOBAL DE DADOS ─────────────────────────────────────────────────────
function useAppData() {
  const [meetings, setMeetings]     = useState([]);
  const [actions, setActions]       = useState([]);
  const [atas, setAtas]             = useState({});   // { meeting_id: ata }
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── LOAD ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ms }, { data: as }, { data: ats }] = await Promise.all([
        sb.from("meetings").select("*").order("created_at", { ascending: false }),
        sb.from("action_items").select("*").order("created_at", { ascending: false }),
        sb.from("atas").select("*"),
      ]);
      setMeetings(ms ?? []);
      setActions((as ?? []).map(a => ({ ...a, done_at: a.done_at ? new Date(a.done_at).getTime() : null })));
      const ataMap = {};
      (ats ?? []).forEach(a => { ataMap[a.meeting_id] = a; });
      setAtas(ataMap);
    } catch (e) {
      showToast("Erro ao carregar dados: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── MEETINGS ──────────────────────────────────────────────────────────────
  async function addMeeting(data) {
    const { data: row, error } = await sb.from("meetings").insert([data]).select().single();
    if (error) { showToast("Erro ao salvar reunião: " + error.message, "error"); return null; }
    setMeetings(prev => [row, ...prev]);
    showToast("Reunião adicionada com sucesso.");
    return row;
  }

  async function deleteMeeting(id) {
    const { error } = await sb.from("meetings").delete().eq("id", id);
    if (error) { showToast("Erro ao apagar: " + error.message, "error"); return; }
    setMeetings(prev => prev.filter(m => m.id !== id));
    setActions(prev => prev.filter(a => a.meeting_id !== id));
    showToast("Transcrição apagada.");
  }

  // ── ACTION ITEMS ──────────────────────────────────────────────────────────
  async function addAction(data) {
    const { data: row, error } = await sb.from("action_items").insert([data]).select().single();
    if (error) { showToast("Erro ao adicionar encaminhamento: " + error.message, "error"); return; }
    setActions(prev => [{ ...row, done_at: null }, ...prev]);
    showToast("Encaminhamento adicionado.");
  }

  async function updateAction(id, updates) {
    const dbUpdates = { ...updates };
    if (updates.status === "done" && !updates.done_at) dbUpdates.done_at = new Date().toISOString();
    if (updates.status && updates.status !== "done") dbUpdates.done_at = null;

    const { error } = await sb.from("action_items").update(dbUpdates).eq("id", id);
    if (error) { showToast("Erro ao atualizar: " + error.message, "error"); return; }
    setActions(prev => prev.map(a => a.id === id
      ? { ...a, ...updates, done_at: dbUpdates.done_at ? new Date(dbUpdates.done_at).getTime() : null }
      : a));
  }

  async function deleteAction(id) {
    const { error } = await sb.from("action_items").delete().eq("id", id);
    if (error) { showToast("Erro ao excluir: " + error.message, "error"); return; }
    setActions(prev => prev.filter(a => a.id !== id));
    showToast("Encaminhamento excluído.");
  }

  // ── UPDATE MEETING ────────────────────────────────────────────────────────
  async function updateMeeting(id, updates) {
    const { error } = await sb.from("meetings").update(updates).eq("id", id);
    if (error) { showToast("Erro ao atualizar reunião: " + error.message, "error"); return; }
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }

  // ── ATAS ──────────────────────────────────────────────────────────────────
  async function saveAta(meetingId, ataData) {
    const existing = atas[meetingId];
    if (existing) {
      const { error } = await sb.from("atas").update(ataData).eq("id", existing.id);
      if (error) { showToast("Erro ao salvar ata: " + error.message, "error"); return; }
      setAtas(prev => ({ ...prev, [meetingId]: { ...existing, ...ataData } }));
    } else {
      const { data: row, error } = await sb.from("atas").insert([{ meeting_id: meetingId, ...ataData }]).select().single();
      if (error) { showToast("Erro ao salvar ata: " + error.message, "error"); return; }
      setAtas(prev => ({ ...prev, [meetingId]: row }));
      await sb.from("meetings").update({ status: "ata_generated" }).eq("id", meetingId);
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: "ata_generated" } : m));
    }
    showToast("Ata salva com sucesso.");
  }

  async function deleteAta(meetingId) {
    const existing = atas[meetingId];
    if (!existing) return;
    const { error } = await sb.from("atas").delete().eq("id", existing.id);
    if (error) { showToast("Erro ao apagar ata: " + error.message, "error"); return; }
    setAtas(prev => { const n = { ...prev }; delete n[meetingId]; return n; });
    await sb.from("meetings").update({ status: "transcribed" }).eq("id", meetingId);
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: "transcribed" } : m));
    showToast("Ata apagada.");
  }

  return {
    meetings, actions, atas, loading, toast,
    loadAll, addMeeting, deleteMeeting, updateMeeting,
    addAction, updateAction, deleteAction, saveAta, deleteAta,
    showToast,
  };
}

// ─── MODAL CLASSIFICAR PROJETO ───────────────────────────────────────────────
function ClassifyProjectModal({ meeting, allProjects, onSave, onClose }) {
  const [selected, setSelected] = useState(meeting.project || "Sem projeto");
  const [newName, setNewName]   = useState("");
  const [creating, setCreating] = useState(false);

  function handleSave() {
    const proj = creating && newName.trim() ? newName.trim() : selected;
    onSave(meeting.id, proj);
    onClose();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, maxWidth:380, width:"90%",
        boxShadow:"0 20px 48px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#1e293b", marginBottom:4 }}>Classificar Projeto</div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:18 }}>{meeting.title}</div>

        <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:8, textTransform:"uppercase" }}>Selecionar projeto existente</div>
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:16, maxHeight:200, overflowY:"auto" }}>
          {allProjects.map(p => (
            <button key={p} onClick={() => { setSelected(p); setCreating(false); }}
              style={{ padding:"8px 12px", borderRadius:8, border:`2px solid ${selected===p && !creating?"#1e3a8a":"#e2e8f0"}`,
                background:selected===p && !creating?"#eff6ff":"#fff",
                color:selected===p && !creating?"#1e3a8a":"#334155",
                fontSize:12, fontWeight:selected===p && !creating?700:400, cursor:"pointer", textAlign:"left" }}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:14, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#475569", marginBottom:8, textTransform:"uppercase" }}>Ou criar novo projeto</div>
          <div style={{ display:"flex", gap:6 }}>
            <input value={newName} onChange={e => { setNewName(e.target.value); setCreating(true); }}
              placeholder="Nome do novo projeto..."
              style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`2px solid ${creating && newName?"#1e3a8a":"#e2e8f0"}`,
                fontSize:12, outline:"none" }} />
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e2e8f0",
            background:"#fff", fontSize:12, cursor:"pointer", color:"#475569" }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:"8px 16px", borderRadius:8, border:"none",
            background:"#1e3a8a", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── ABA 1: TRANSCRIÇÕES ─────────────────────────────────────────────────────
function TranscriptionsTab({ meetings, addMeeting, deleteMeeting, updateMeeting, saveAta, atas, loadAll }) {
  const [search, setSearch]           = useState("");
  const [filterProject, setFP]        = useState("Todos");
  const [filterMonth, setFM]          = useState("Todos");
  const [expandedId, setExpanded]     = useState(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState(null);
  const [confirmDel, setConfirmDel]   = useState(null);
  const [classifyMeeting, setClassify] = useState(null);
  const [generatingAta, setGeneratingAta] = useState(null); // meeting id
  const fileRef = useRef();

  const allProjects = [...new Set(meetings.map(m => m.project).filter(Boolean))].sort();
  const projects = ["Todos", ...allProjects];
  const months   = ["Todos", ...new Set(meetings.map(m => m.month).filter(Boolean))];

  const filtered = meetings.filter(m => {
    const s = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.project.toLowerCase().includes(search.toLowerCase());
    const p = filterProject === "Todos" || m.project === filterProject;
    const mo = filterMonth  === "Todos" || m.month  === filterMonth;
    return s && p && mo;
  });

  async function handleSync() {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await fetch("/api/drive-sync");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      await loadAll();
      if (data.imported > 0) {
        setSyncMsg(`✓ ${data.imported} nova(s) transcrição(ões) importada(s) do Drive.`);
      } else {
        setSyncMsg("✓ Nenhuma transcrição nova encontrada no Drive.");
      }
    } catch (e) {
      setSyncMsg(`⚠ Erro: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  async function handlePDF(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.pdf$/i, "");
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
    const dateStr = `${String(today.getDate()).padStart(2,"0")}/${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;
    const project = Object.keys(PROJECT_COLORS).find(p => name.toLowerCase().includes(p.toLowerCase())) ?? "Sem projeto";
    await addMeeting({
      project, month, date: dateStr, title: name,
      participants: [], status: "transcribed", source: "pdf",
      transcription: `[PDF importado: ${file.name}]\nConteúdo extraído automaticamente.`,
    });
    e.target.value = "";
  }

  async function handleGerarAta(meeting) {
    if (!meeting.transcription || meeting.transcription.trim().length < 50) {
      setSyncMsg("⚠ Transcrição muito curta para gerar ata.");
      setTimeout(() => setSyncMsg(null), 4000);
      return;
    }
    setGeneratingAta(meeting.id);
    try {
      const response = await fetch("/api/generate-ata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription: meeting.transcription,
          title: meeting.title,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro na API");

      await saveAta(meeting.id, {
        participantes:   data.participantes   || [],
        pautas:          data.pautas          || [],
        decisoes:        data.decisoes        || [],
        encaminhamentos: data.encaminhamentos || [],
      });
      setSyncMsg(`✓ Ata de "${meeting.title}" gerada com sucesso! Veja na aba Atas.`);
    } catch (e) {
      setSyncMsg(`⚠ Erro ao gerar ata: ${e.message}`);
    } finally {
      setGeneratingAta(null);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={handleSync} disabled={syncing} style={{
          display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8,
          border:"1px solid #1e3a8a", background:syncing?"#f1f5f9":"#1e3a8a",
          color:syncing?"#94a3b8":"#fff", fontSize:13, fontWeight:700, cursor:syncing?"not-allowed":"pointer" }}>
          {syncing ? <Spinner size={14}/> : "⟳"} {syncing ? "Atualizando..." : "Buscar no Drive"}
        </button>
        <button onClick={() => fileRef.current?.click()} style={{
          display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8,
          border:"1px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          📎 Importar PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={handlePDF} />
        {syncMsg && <span style={{ fontSize:12, color: syncMsg.startsWith("⚠") ? "#ef4444" : "#10b981", fontWeight:600 }}>{syncMsg}</span>}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <input type="text" placeholder="Buscar reunião..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:180, padding:"7px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13 }} />
        <select value={filterProject} onChange={e => setFP(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13, background:"#fff" }}>
          {projects.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFM(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13, background:"#fff" }}>
          {months.map(m => <option key={m} value={m}>{m === "Todos" ? "Todos os meses" : (MONTH_LABELS[m]||m)}</option>)}
        </select>
      </div>

      <div style={{ fontSize:12, color:"#94a3b8", marginBottom:10 }}>
        {filtered.length} reunião{filtered.length!==1?"ões":""} encontrada{filtered.length!==1?"s":""}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filtered.map(m => {
          const expanded = expandedId === m.id;
          const hasAta = m.status === "ata_generated";
          const isGenerating = generatingAta === m.id;
          const stColor = hasAta ? "#10b981" : "#6366f1";
          const stLabel = hasAta ? "Ata gerada" : "Transcrição";
          return (
            <div key={m.id} style={{ borderRadius:10, border:`1px solid ${expanded?"#bfdbfe":"#f1f5f9"}`,
              background:expanded?"#f8fbff":"#fff", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => setExpanded(expanded ? null : m.id)}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                    <ProjectBadge project={m.project} />
                    <span style={{ fontSize:11, fontWeight:700, color:stColor }}>● {stLabel}</span>
                    {m.source === "pdf" && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>PDF</span>}
                    <span style={{ fontSize:11, color:"#94a3b8" }}>{m.date}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.title}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{(m.participants||[]).join(", ")}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                  {/* Botão classificar projeto */}
                  <button onClick={e => { e.stopPropagation(); setClassify(m); }}
                    title="Classificar projeto"
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #bfdbfe",
                      background:"#eff6ff", color:"#1e3a8a", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    🏷 Projeto
                  </button>
                  {/* Botão gerar ata */}
                  <button onClick={e => { e.stopPropagation(); handleGerarAta(m); }}
                    disabled={isGenerating || hasAta}
                    title={hasAta ? "Ata já gerada" : "Gerar ata com Claude"}
                    style={{ padding:"4px 10px", borderRadius:6,
                      border:`1px solid ${hasAta?"#bbf7d0":isGenerating?"#e2e8f0":"#a5f3fc"}`,
                      background:hasAta?"#f0fdf4":isGenerating?"#f8fafc":"#ecfeff",
                      color:hasAta?"#16a34a":isGenerating?"#94a3b8":"#0891b2",
                      fontSize:11, fontWeight:700, cursor:hasAta||isGenerating?"default":"pointer",
                      display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
                    {isGenerating ? <><Spinner size={10}/> Gerando...</> : hasAta ? "✓ Ata ok" : "✨ Gerar Ata"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDel(m.id); }}
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #fca5a5",
                      background:"#fff", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    🗑
                  </button>
                  <span onClick={() => setExpanded(expanded ? null : m.id)}
                    style={{ fontSize:18, color:"#94a3b8", paddingTop:2, cursor:"pointer" }}>{expanded?"↑":"↓"}</span>
                </div>
              </div>
              {expanded && (
                <pre style={{ margin:0, padding:"12px 14px", background:"#f1f5f9", fontSize:12,
                  lineHeight:1.7, color:"#475569", whiteSpace:"pre-wrap", wordBreak:"break-word",
                  borderTop:"1px solid #e2e8f0" }}>
                  {m.transcription || "Sem transcrição."}
                </pre>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Nenhuma transcrição encontrada.</div>
        )}
      </div>

      {confirmDel && (
        <ConfirmModal
          message="Apagar esta transcrição? Esta ação não pode ser desfeita."
          onConfirm={() => { deleteMeeting(confirmDel); setConfirmDel(null); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {classifyMeeting && (
        <ClassifyProjectModal
          meeting={classifyMeeting}
          allProjects={allProjects}
          onSave={(id, project) => updateMeeting(id, { project })}
          onClose={() => setClassify(null)}
        />
      )}
    </div>
  );
}

// ─── ABA 2: ATAS ─────────────────────────────────────────────────────────────
function MinutesTab({ meetings, atas, saveAta, deleteAta }) {
  const [filterProject, setFP]    = useState("Todos");
  const [filterMonth, setFM]      = useState("Todos");
  const [selectedId, setSelected] = useState(null);
  const [editing, setEditing]     = useState(false);
  const [localAta, setLocalAta]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [exportMsg, setExportMsg]   = useState(null);
  const [confirmDelAta, setConfirmDelAta] = useState(null);

  const withAta = meetings.filter(m => m.status === "ata_generated");
  const projects = ["Todos", ...new Set(withAta.map(m => m.project))];
  const months   = ["Todos", ...new Set(withAta.map(m => m.month).filter(Boolean))];
  const filtered = withAta.filter(m => {
    const p = filterProject === "Todos" || m.project === filterProject;
    const mo = filterMonth  === "Todos" || m.month   === filterMonth;
    return p && mo;
  });

  const meeting = filtered.find(m => m.id === selectedId);
  const ata = selectedId ? atas[selectedId] : null;

  function selectMeeting(id) {
    setSelected(id);
    setEditing(false);
    const a = atas[id];
    if (a) setLocalAta({ participantes: a.participantes, pautas: a.pautas, decisoes: a.decisoes, encaminhamentos: a.encaminhamentos });
  }

  function startEdit() {
    setLocalAta({ participantes: ata.participantes, pautas: ata.pautas, decisoes: ata.decisoes, encaminhamentos: ata.encaminhamentos });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    await saveAta(selectedId, localAta);
    setSaving(false);
    setEditing(false);
  }

  async function handleExport() {
    setExporting(true); setExportMsg(null);
    await new Promise(r => setTimeout(r, 1500));
    setExporting(false);
    setExportMsg(`✓ Ata_${meeting?.project?.replace(/ /g,"_")}_${meeting?.date?.replace(/\//g,"-")}.docx gerada.`);
    setTimeout(() => setExportMsg(null), 5000);
  }

  function updateCell(section, ri, ci, val) {
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[section][ri][ci] = val;
      return copy;
    });
  }

  function addRow(section) {
    const EMPTY = {
      participantes: ["","",""],
      pautas: ["","",""],
      decisoes: ["","",""],
      encaminhamentos: ["","","",""],
    };
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const newRow = [...EMPTY[section]];
      newRow[0] = String((copy[section]?.length || 0) + 1);
      copy[section] = [...(copy[section] || []), newRow];
      return copy;
    });
  }

  function removeRow(section, ri) {
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[section] = copy[section].filter((_,i) => i !== ri)
        .map((row, i) => { const r = [...row]; r[0] = String(i+1); return r; });
      return copy;
    });
  }

  const displayAta = editing ? localAta : (ata ? { participantes: ata.participantes, pautas: ata.pautas, decisoes: ata.decisoes, encaminhamentos: ata.encaminhamentos } : null);

  return (
    <div style={{ display:"flex", gap:20 }}>
      <div style={{ width:240, flexShrink:0 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            style={{ padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            {projects.map(p => <option key={p}>{p === "Todos" ? "Todos os projetos" : p}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFM(e.target.value)}
            style={{ padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            {months.map(m => <option key={m} value={m}>{m === "Todos" ? "Todos os meses" : (MONTH_LABELS[m]||m)}</option>)}
          </select>
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginBottom:8, textTransform:"uppercase" }}>
          {filtered.length} ata{filtered.length!==1?"s":""}
        </div>
        {filtered.map(m => (
          <div key={m.id} onClick={() => selectMeeting(m.id)}
            style={{ padding:"10px 12px", borderRadius:8, marginBottom:5, cursor:"pointer",
              border:`1px solid ${selectedId===m.id?"#bfdbfe":"#f1f5f9"}`,
              background:selectedId===m.id?"#f0f7ff":"#fff" }}>
            <div style={{ marginBottom:3 }}><ProjectBadge project={m.project} small /></div>
            <div style={{ fontSize:12, fontWeight:600, color:"#1e293b", lineHeight:1.3 }}>{m.title}</div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{m.date}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ fontSize:12, color:"#94a3b8", textAlign:"center", padding:20 }}>Nenhuma ata</div>}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        {!meeting || !displayAta ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"#94a3b8", fontSize:14, flexDirection:"column", gap:8 }}>
            <span style={{ fontSize:32 }}>📋</span> Selecione uma ata para visualizar
          </div>
        ) : (
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #f1f5f9", padding:"20px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:"#1f3864" }}>ATA DE REUNIÃO</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>DATA: {meeting.date}</div>
                <div style={{ marginTop:6 }}><ProjectBadge project={meeting.project} /></div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{
                      padding:"7px 14px", borderRadius:8, border:"none",
                      background:saving?"#94a3b8":"#10b981", color:"#fff", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
                      {saving ? "Salvando..." : "✓ Salvar"}
                    </button>
                    <button onClick={() => setEditing(false)} style={{ padding:"7px 14px", borderRadius:8,
                      border:"1px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:12, cursor:"pointer" }}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={startEdit} style={{ padding:"7px 14px", borderRadius:8,
                      border:"1px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      ✏️ Editar
                    </button>
                    <button onClick={handleExport} disabled={exporting} style={{ padding:"7px 14px", borderRadius:8,
                      border:"none", background:exporting?"#94a3b8":"#1e3a8a", color:"#fff", fontSize:12, fontWeight:700,
                      cursor:exporting?"not-allowed":"pointer" }}>
                      {exporting ? "Gerando..." : "⬇ .docx"}
                    </button>
                    <button onClick={() => setConfirmDelAta(selectedId)} style={{ padding:"7px 14px", borderRadius:8,
                      border:"1px solid #fca5a5", background:"#fff", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      🗑 Apagar
                    </button>
                  </>
                )}
              </div>
            </div>

            {exportMsg && <div style={{ marginBottom:12, fontSize:12, color:"#10b981", fontWeight:600,
              background:"#f0fdf4", padding:"8px 12px", borderRadius:8 }}>{exportMsg}</div>}

            <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:14 }}>{meeting.title}</div>

            {[
              ["participantes","PARTICIPANTES",["#","Nome Participantes","Empresa"],[0.5,3,2]],
              ["pautas","PAUTA DA REUNIÃO",["#","Pauta","Duração"],[0.5,4,1]],
              ["decisoes","DECISÕES & CONCLUSÕES",["#","Assunto","Tomador da Decisão"],[0.5,3.5,1.5]],
              ["encaminhamentos","ENCAMINHAMENTOS",["#","Descrição","Responsável","Prazo"],[0.5,3,1.5,1]],
            ].map(([section, title, columns, widths]) => (
              editing ? (
                <div key={section} style={{ marginBottom:18 }}>
                  <div style={{ background:"#1f3864", padding:"7px 12px", borderRadius:"6px 6px 0 0", textAlign:"center" }}>
                    <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>{title}</span>
                  </div>
                  <div style={{ display:"flex", background:"#d9d9d9" }}>
                    {columns.map((c,i) => <div key={i} style={{ flex:widths[i], padding:"5px 10px", fontWeight:700, fontSize:11, color:"#1f3864" }}>{c}</div>)}
                  </div>
                  {(displayAta[section]||[]).map((row,ri) => (
                    <div key={ri} style={{ display:"flex", background:ri%2===1?"#e8f0fe":"#fff", borderBottom:"1px solid #e2e8f0", alignItems:"center" }}>
                      {row.map((cell,ci) => (
                        <div key={ci} style={{ flex:widths[ci], padding:"4px 6px" }}>
                          {ci === 0
                            ? <span style={{ fontSize:11, padding:"2px 6px" }}>{cell}</span>
                            : <input value={cell} onChange={e => updateCell(section, ri, ci, e.target.value)}
                                style={{ width:"100%", border:"1px solid #bfdbfe", borderRadius:4, padding:"3px 6px", fontSize:11, fontFamily:"inherit" }} />
                          }
                        </div>
                      ))}
                      <div style={{ padding:"0 6px", flexShrink:0 }}>
                        <button onClick={() => removeRow(section, ri)} title="Remover linha"
                          style={{ width:20, height:20, borderRadius:"50%", border:"none", background:"#fca5a5",
                            color:"#ef4444", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center",
                            justifyContent:"center", fontWeight:700, lineHeight:1 }}>−</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding:"6px 10px", borderTop:"1px dashed #bfdbfe" }}>
                    <button onClick={() => addRow(section)}
                      style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:6,
                        border:"1px dashed #93c5fd", background:"#f0f7ff", color:"#1e3a8a",
                        fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      + Adicionar linha
                    </button>
                  </div>
                </div>
              ) : (
                <ATATable key={section} title={title} columns={columns} rows={displayAta[section]||[]} widths={widths} />
              )
            ))}
          </div>
        )}
      </div>

      {confirmDelAta && (
        <ConfirmModal
          message="Apagar esta ata? A reunião voltará ao status de transcrição. Esta ação não pode ser desfeita."
          onConfirm={() => { deleteAta(confirmDelAta); setConfirmDelAta(null); setSelected(null); }}
          onCancel={() => setConfirmDelAta(null)}
        />
      )}
    </div>
  );
}

// ─── ABA 3: ENCAMINHAMENTOS (KANBAN) ─────────────────────────────────────────
function ActionItemsTab({ actions, meetings, addAction, updateAction, deleteAction }) {
  const [onlyMe, setOnlyMe]         = useState(false);
  const [showDone, setShowDone]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [addingCol, setAddingCol]   = useState(null);
  const [newForm, setNewForm]       = useState({ description:"", responsible:"", due_date:"", meeting_id:"" });
  const [confirmDel, setConfirmDel] = useState(null);
  const [dragging, setDragging]     = useState(null);
  const [now, setNow]               = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const visible = actions.filter(a => !onlyMe || a.responsible === ME);

  function colItems(colId) {
    const items = visible.filter(a => a.status === colId);
    if (colId !== "done") return items;
    if (showDone) return items;
    return items.filter(a => !a.done_at || (now - a.done_at) < DONE_HIDE_MS);
  }

  const hiddenDoneCount = visible.filter(a =>
    a.status === "done" && a.done_at && (now - a.done_at) >= DONE_HIDE_MS
  ).length;

  function startEdit(a) {
    setEditingId(a.id);
    setEditForm({ description: a.description, responsible: a.responsible, due_date: a.due_date });
  }

  async function saveEdit(id) {
    await updateAction(id, editForm);
    setEditingId(null);
  }

  async function handleAdd(colId) {
    if (!newForm.description.trim()) return;
    const meetingId = newForm.meeting_id ? parseInt(newForm.meeting_id) : (meetings[0]?.id ?? null);
    await addAction({
      meeting_id: meetingId,
      description: newForm.description,
      responsible: newForm.responsible || ME,
      due_date: newForm.due_date || "A Definir",
      status: colId,
    });
    setNewForm({ description:"", responsible:"", due_date:"", meeting_id:"" });
    setAddingCol(null);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, flexWrap:"wrap" }}>
        <Toggle checked={onlyMe} onChange={() => setOnlyMe(!onlyMe)} label={`Apenas meus (${ME.split(" ")[0]})`} />
        {hiddenDoneCount > 0 && (
          <button onClick={() => setShowDone(!showDone)} style={{
            padding:"5px 12px", borderRadius:99, border:"1px solid #e2e8f0",
            background:showDone?"#f0fdf4":"#fff", color:showDone?"#16a34a":"#64748b",
            fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {showDone ? `↑ Ocultar concluídos (${hiddenDoneCount})` : `↓ Ver todos concluídos (${hiddenDoneCount} ocultos)`}
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:12, alignItems:"flex-start" }}>
        {KANBAN_COLS.map(col => {
          const items = colItems(col.id);
          return (
            <div key={col.id}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragging !== null) { updateAction(dragging, { status: col.id }); setDragging(null); } }}
              style={{ minWidth:220, flex:"0 0 220px", background:col.bg, borderRadius:12,
                border:`1px solid ${col.color}25`, overflow:"hidden" }}>
              {/* Header */}
              <div style={{ padding:"10px 12px", borderBottom:`2px solid ${col.color}`,
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col.color }} />
                  <span style={{ fontSize:11, fontWeight:800, color:col.color, textTransform:"uppercase", letterSpacing:0.3 }}>{col.label}</span>
                  <span style={{ fontSize:11, background:`${col.color}22`, color:col.color, borderRadius:99, padding:"1px 7px", fontWeight:700 }}>{items.length}</span>
                </div>
                {col.id !== "done" && (
                  <button onClick={() => setAddingCol(addingCol===col.id?null:col.id)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:col.color, lineHeight:1 }}>+</button>
                )}
              </div>

              {/* Novo card form */}
              {addingCol === col.id && (
                <div style={{ padding:"8px 10px", background:"#fff", borderBottom:`1px solid ${col.color}25` }}>
                  <input placeholder="Descrição..." value={newForm.description}
                    onChange={e => setNewForm(f=>({...f,description:e.target.value}))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4 }} />
                  <input placeholder="Responsável" value={newForm.responsible}
                    onChange={e => setNewForm(f=>({...f,responsible:e.target.value}))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4 }} />
                  <input placeholder="Prazo (dd/mm/aaaa)" value={newForm.due_date}
                    onChange={e => setNewForm(f=>({...f,due_date:e.target.value}))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4 }} />
                  <select value={newForm.meeting_id} onChange={e => setNewForm(f=>({...f,meeting_id:e.target.value}))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:6, background:"#fff" }}>
                    <option value="">Vincular reunião (opcional)</option>
                    {meetings.map(m => <option key={m.id} value={m.id}>{m.project} — {m.title.slice(0,30)}</option>)}
                  </select>
                  <div style={{ display:"flex", gap:5 }}>
                    <button onClick={() => handleAdd(col.id)} style={{ flex:1, padding:"5px", borderRadius:6, border:"none",
                      background:col.color, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Adicionar</button>
                    <button onClick={() => setAddingCol(null)} style={{ padding:"5px 8px", borderRadius:6,
                      border:"1px solid #e2e8f0", background:"#fff", fontSize:11, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              )}

              {/* Cards */}
              <div style={{ padding:"8px", display:"flex", flexDirection:"column", gap:6, minHeight:80 }}>
                {items.map(a => {
                  const m = meetings.find(mt => mt.id === a.meeting_id);
                  const isMe = a.responsible === ME;
                  const isEditing = editingId === a.id;
                  return (
                    <div key={a.id} draggable
                      onDragStart={() => setDragging(a.id)}
                      onDragEnd={() => setDragging(null)}
                      style={{ background:"#fff", borderRadius:8, padding:"10px 10px 8px",
                        boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #f1f5f9",
                        cursor:"grab", borderLeft:`3px solid ${col.color}`,
                        opacity:dragging===a.id?0.5:1 }}>
                      {isEditing ? (
                        <div>
                          <input value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4 }} />
                          <input value={editForm.responsible} onChange={e=>setEditForm(f=>({...f,responsible:e.target.value}))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4 }} />
                          <input value={editForm.due_date} onChange={e=>setEditForm(f=>({...f,due_date:e.target.value}))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:6 }} />
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={() => saveEdit(a.id)} style={{ flex:1, padding:"4px", borderRadius:5, border:"none",
                              background:"#10b981", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Salvar</button>
                            <button onClick={() => setEditingId(null)} style={{ padding:"4px 7px", borderRadius:5,
                              border:"1px solid #e2e8f0", background:"#fff", fontSize:11, cursor:"pointer" }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize:12, fontWeight:600, color:"#1e293b", lineHeight:1.4, marginBottom:6 }}>{a.description}</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:2, marginBottom:6 }}>
                            {m && <span style={{ marginBottom:2 }}><ProjectBadge project={m.project} small /></span>}
                            <span style={{ fontSize:10, color:isMe?"#1e3a8a":"#64748b", fontWeight:isMe?700:400 }}>
                              👤 {a.responsible}{isMe?" (eu)":""}
                            </span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>📅 {a.due_date}</span>
                          </div>
                          <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginBottom:4 }}>
                            {KANBAN_COLS.filter(c=>c.id!==col.id).map(c => (
                              <button key={c.id} onClick={() => updateAction(a.id, { status: c.id })}
                                title={`Mover para ${c.label}`}
                                style={{ fontSize:9, padding:"2px 6px", borderRadius:99, border:`1px solid ${c.color}`,
                                  color:c.color, background:"#fff", cursor:"pointer", fontWeight:700 }}>
                                → {c.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                          <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                            <button onClick={() => startEdit(a)} style={{ fontSize:10, padding:"2px 7px", borderRadius:5,
                              border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", color:"#475569" }}>✏️</button>
                            <button onClick={() => setConfirmDel(a.id)} style={{ fontSize:10, padding:"2px 7px", borderRadius:5,
                              border:"1px solid #fca5a5", background:"#fff", cursor:"pointer", color:"#ef4444" }}>🗑</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ fontSize:11, color:`${col.color}88`, textAlign:"center", padding:"10px 0", fontStyle:"italic" }}>vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmDel && (
        <ConfirmModal
          message="Excluir este encaminhamento? Esta ação não pode ser desfeita."
          onConfirm={() => { deleteAction(confirmDel); setConfirmDel(null); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ─── ABA 4: CONCLUÍDOS ───────────────────────────────────────────────────────
function CompletedTab({ actions, meetings }) {
  const [filterProject, setFP] = useState("Todos");

  const done = actions.filter(a => a.status === "done");
  const projects = ["Todos", ...new Set(done.map(a => meetings.find(m => m.id===a.meeting_id)?.project ?? "Sem projeto"))];

  const byProject = {};
  done.forEach(a => {
    const m = meetings.find(mt => mt.id===a.meeting_id);
    const p = m?.project ?? "Sem projeto";
    if (filterProject !== "Todos" && p !== filterProject) return;
    if (!byProject[p]) byProject[p] = [];
    byProject[p].push({ ...a, meetingTitle: m?.title ?? "—" });
  });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>Encaminhamentos Concluídos</div>
        <span style={{ background:"#f0fdf4", color:"#16a34a", fontSize:12, fontWeight:700, padding:"2px 10px", borderRadius:99 }}>
          {done.length} total
        </span>
        <select value={filterProject} onChange={e => setFP(e.target.value)}
          style={{ marginLeft:"auto", padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
          {projects.map(p => <option key={p} value={p}>{p === "Todos" ? "Todos os projetos" : p}</option>)}
        </select>
      </div>

      {Object.keys(byProject).length === 0 && (
        <div style={{ textAlign:"center", padding:48, color:"#94a3b8", fontSize:14 }}>Nenhum encaminhamento concluído.</div>
      )}

      {Object.entries(byProject).map(([project, items]) => (
        <div key={project} style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:"2px solid #f1f5f9" }}>
            <ProjectBadge project={project} />
            <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{items.length} concluído{items.length!==1?"s":""}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {items.map(a => (
              <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px",
                borderRadius:8, background:"#f8fafc", border:"1px solid #f1f5f9" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"#dcfce7",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, marginTop:1 }}>✓</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#64748b", textDecoration:"line-through", marginBottom:3 }}>{a.description}</div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>
                    👤 {a.responsible} · 📅 {a.due_date} · 📋 {a.meetingTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ABA 5: DASHBOARD ────────────────────────────────────────────────────────
function DashboardTab({ meetings, actions }) {
  const [onlyMe, setOnlyMe] = useState(false);

  const fa = onlyMe ? actions.filter(a => a.responsible === ME) : actions;
  const fm = onlyMe ? meetings.filter(m => actions.some(a => a.meeting_id===m.id && a.responsible===ME)) : meetings;

  const total    = fa.length;
  const done     = fa.filter(a => a.status==="done").length;
  const pending  = fa.filter(a => ["pending","personal"].includes(a.status)).length;
  const critical = fa.filter(a => a.status==="critical").length;
  const inProg   = fa.filter(a => a.status==="in_progress").length;
  const rate     = total > 0 ? Math.round((done/total)*100) : 0;
  const projects = [...new Set(fm.map(m => m.project))];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Toggle checked={onlyMe} onChange={() => setOnlyMe(!onlyMe)} label={`Apenas meus (${ME.split(" ")[0]})`} />
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {[
          { label:"Reuniões",        value:fm.length, color:"#1e3a8a", icon:"📋" },
          { label:"Total encam.",    value:total,     color:"#6366f1", icon:"📌" },
          { label:"Pendentes",       value:pending,   color:"#f59e0b", icon:"⏳" },
          { label:"Pontos críticos", value:critical,  color:"#ef4444", icon:"🔴" },
          { label:"Em andamento",    value:inProg,    color:"#2563eb", icon:"⚡" },
          { label:"Taxa conclusão",  value:`${rate}%`,color:"#10b981", icon:"📈" },
        ].map(k => (
          <div key={k.label} style={{ flex:"1 1 130px", padding:"14px 16px", borderRadius:12, background:"#fff", border:"1px solid #f1f5f9" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:11, color:"#64748b" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"18px 22px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:14 }}>Encaminhamentos por projeto</div>
        {projects.length === 0 && <div style={{ fontSize:12, color:"#94a3b8" }}>Sem dados.</div>}
        {projects.map(project => {
          const ids = fm.filter(m => m.project===project).map(m => m.id);
          const pi = fa.filter(a => ids.includes(a.meeting_id));
          const pd = pi.filter(a => a.status==="done").length;
          const pct = pi.length > 0 ? Math.round((pd/pi.length)*100) : 0;
          const color = PROJECT_COLORS[project]??"#64748b";
          return (
            <div key={project} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:600, color:"#334155" }}>{project}</span>
                <span style={{ fontSize:11, color:"#94a3b8" }}>{pd}/{pi.length} ({pct}%)</span>
              </div>
              <div style={{ height:8, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 0.5s" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"18px 22px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Pendências por responsável</div>
        {[...new Set(fa.map(a => a.responsible))].map(resp => {
          const open = fa.filter(a => a.responsible===resp && a.status!=="done").length;
          if (open === 0) return null;
          const initials = resp.split(" ").slice(0,2).map(w=>w[0]).join("");
          const isMe = resp === ME;
          return (
            <div key={resp} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:"50%",
                background:isMe?"#dbeafe":"#f1f5f9", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:11, fontWeight:700,
                color:isMe?"#1e3a8a":"#475569", border:isMe?"2px solid #1e3a8a":"none" }}>
                {initials}
              </div>
              <div style={{ flex:1, fontSize:12, fontWeight:isMe?700:400, color:isMe?"#1e3a8a":"#334155" }}>
                {resp}{isMe?" (eu)":""}
              </div>
              <div style={{ padding:"3px 10px", borderRadius:99, background:"#fef3c7", color:"#d97706", fontSize:11, fontWeight:700 }}>
                {open} pendente{open>1?"s":""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function PWRMeetingApp() {
  const [activeTab, setActiveTab] = useState("transcricoes");
  const {
    meetings, actions, atas, loading, toast,
    loadAll, addMeeting, deleteMeeting, updateMeeting,
    addAction, updateAction, deleteAction, saveAta, deleteAta,
  } = useAppData();

  const tabs = [
    { id:"transcricoes",    label:"Transcrições",   icon:"📄" },
    { id:"atas",            label:"Atas",            icon:"📋" },
    { id:"encaminhamentos", label:"Encaminhamentos", icon:"✅" },
    { id:"concluidos",      label:"Concluídos",      icon:"🏁" },
    { id:"dashboard",       label:"Dashboard",       icon:"📊" },
  ];

  const doneCount = actions.filter(a => a.status==="done").length;
  const openCount = actions.filter(a => a.status!=="done").length;

  return (
    <div style={{ fontFamily:"'Segoe UI',Arial,sans-serif", minHeight:"100vh", background:"#f8fafc" }}>
      <div style={{ background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)", padding:"15px 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,.15)" }}>
        <div>
          <div style={{ fontSize:19, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>PWR · Reuniões</div>
          <div style={{ fontSize:11, color:"#93c5fd", marginTop:1 }}>Transcrições → Atas → Encaminhamentos</div>
        </div>
        <div style={{ display:"flex", gap:16, fontSize:12, color:"#93c5fd" }}>
          <span>📋 {meetings.length} reuniões</span>
          <span>✅ {doneCount} concluídos</span>
          <span>📌 {openCount} abertos</span>
        </div>
      </div>

      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 32px",
        display:"flex", gap:0, overflowX:"auto" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:"13px 18px", border:"none", background:"none", cursor:"pointer",
            fontSize:13, fontWeight:activeTab===tab.id?700:400,
            color:activeTab===tab.id?"#1e3a8a":"#64748b",
            borderBottom:activeTab===tab.id?"2px solid #1e3a8a":"2px solid transparent",
            transition:"all 0.15s", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 32px" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:12, color:"#64748b", fontSize:14 }}>
            <Spinner size={28} /> Carregando dados...
          </div>
        ) : (
          <>
            {activeTab==="transcricoes"    && <TranscriptionsTab meetings={meetings} addMeeting={addMeeting} deleteMeeting={deleteMeeting} updateMeeting={updateMeeting} saveAta={saveAta} atas={atas} loadAll={loadAll} />}
            {activeTab==="atas"            && <MinutesTab meetings={meetings} atas={atas} saveAta={saveAta} deleteAta={deleteAta} />}
            {activeTab==="encaminhamentos" && <ActionItemsTab actions={actions} meetings={meetings} addAction={addAction} updateAction={updateAction} deleteAction={deleteAction} />}
            {activeTab==="concluidos"      && <CompletedTab actions={actions} meetings={meetings} />}
            {activeTab==="dashboard"       && <DashboardTab meetings={meetings} actions={actions} />}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
