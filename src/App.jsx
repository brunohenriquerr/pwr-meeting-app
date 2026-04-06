import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://covdfydbxlofpklviatf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdmRmeWRieGxvZnBrbHZpYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjI3MDEsImV4cCI6MjA5MDQ5ODcwMX0.Eso30lPrM2Ro4ZgJ2x1VwROp4vnLu_ibngUYvi6arww";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const ME = "Bruno Henrique";
const DONE_HIDE_MS = 5 * 60 * 1000;
const DEFAULT_PROJECT_COLORS = {
  "San Paolo":"#f97316","CDG Engenharia":"#ef4444","UmuPrev":"#06b6d4",
  "Montenegro Urbanismo":"#10b981","VDE":"#f59e0b","Nobrecon":"#6366f1",
  "PWR Gestão (interno)":"#1e3a8a",
};
const EXTRA_COLORS = [
  "#8b5cf6","#ec4899","#14b8a6","#f43f5e","#84cc16","#0ea5e9","#fb923c","#a855f7",
];
let PROJECT_COLORS = { ...DEFAULT_PROJECT_COLORS };

function getProjectColor(project) {
  if (PROJECT_COLORS[project]) return PROJECT_COLORS[project];
  const idx = Object.keys(PROJECT_COLORS).length % EXTRA_COLORS.length;
  PROJECT_COLORS[project] = EXTRA_COLORS[idx];
  return PROJECT_COLORS[project];
}

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
  const color = getProjectColor(project);
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
  const [atas, setAtas]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

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

  async function addAction(data) {
    const { data: row, error } = await sb.from("action_items").insert([data]).select().single();
    if (error) { showToast("Erro ao adicionar encaminhamento: " + error.message, "error"); return null; }
    setActions(prev => [{ ...row, done_at: null }, ...prev]);
    showToast("Encaminhamento adicionado.");
    return row;
  }

  async function addActions(dataArray) {
    if (!dataArray || dataArray.length === 0) return [];
    const { data: rows, error } = await sb.from("action_items").insert(dataArray).select();
    if (error) { showToast("Erro ao adicionar encaminhamentos: " + error.message, "error"); return []; }
    setActions(prev => [...(rows ?? []).map(r => ({ ...r, done_at: null })), ...prev]);
    return rows ?? [];
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

  async function updateMeeting(id, updates) {
    const { error } = await sb.from("meetings").update(updates).eq("id", id);
    if (error) { showToast("Erro ao atualizar reunião: " + error.message, "error"); return; }
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }

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
    addAction, addActions, updateAction, deleteAction, saveAta, deleteAta,
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
          <input value={newName} onChange={e => { setNewName(e.target.value); setCreating(true); }}
            placeholder="Nome do novo projeto..."
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`2px solid ${creating && newName?"#1e3a8a":"#e2e8f0"}`,
              fontSize:12, outline:"none", boxSizing:"border-box" }} />
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

// ─── MODAL RENOMEAR TRANSCRIÇÃO ───────────────────────────────────────────────
function RenameModal({ meeting, onSave, onClose }) {
  const [title, setTitle] = useState(meeting.title);
  function handleSave() {
    if (!title.trim()) return;
    onSave(meeting.id, title.trim());
    onClose();
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:14, padding:28, maxWidth:420, width:"90%",
        boxShadow:"0 20px 48px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#1e293b", marginBottom:16 }}>Renomear Transcrição</div>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleSave()} autoFocus
          style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"2px solid #1e3a8a",
            fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:20 }} />
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

// ─── MODAL REVISÃO DE ENCAMINHAMENTOS DA ATA ─────────────────────────────────
function ActionReviewModal({ encaminhamentos, meetingId, meetingProject, meetings, addActions, onClose }) {
  const [items, setItems] = useState(
    (encaminhamentos || []).map((row, i) => ({
      id: i,
      description: row[1] || row[0] || "",
      responsible: row[2] || ME,
      due_date: row[3] || "A Definir",
      project: meetingProject || "Sem projeto",
      include: true,
    }))
  );
  const [saving, setSaving] = useState(false);
  const allProjects = [...new Set([
    ...Object.keys(DEFAULT_PROJECT_COLORS),
    ...meetings.map(m => m.project).filter(Boolean),
  ])].sort();

  function toggle(id) { setItems(prev => prev.map(it => it.id===id ? {...it, include:!it.include} : it)); }
  function updateItem(id, field, value) { setItems(prev => prev.map(it => it.id===id ? {...it, [field]:value} : it)); }

  async function handleSend() {
    setSaving(true);
    const toSend = items.filter(it => it.include).map(it => ({
      meeting_id: meetingId, description: it.description,
      responsible: it.responsible, due_date: it.due_date,
      project: it.project, status: "pending",
    }));
    await addActions(toSend);
    setSaving(false);
    onClose();
  }

  const includedCount = items.filter(i => i.include).length;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, maxWidth:680, width:"100%",
        boxShadow:"0 24px 64px rgba(0,0,0,.3)", display:"flex", flexDirection:"column", maxHeight:"90vh" }}>
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #f1f5f9" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", marginBottom:4 }}>Revisar Encaminhamentos da Ata</div>
          <div style={{ fontSize:12, color:"#64748b" }}>Selecione quais encaminhamentos devem ir para o Kanban.</div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 24px" }}>
          {items.length===0 && <div style={{ textAlign:"center", padding:32, color:"#94a3b8" }}>Nenhum encaminhamento encontrado.</div>}
          {items.map(it => (
            <div key={it.id} style={{ display:"flex", gap:10, padding:"12px 14px", marginBottom:8, borderRadius:10,
              border:`2px solid ${it.include?"#bfdbfe":"#f1f5f9"}`, background:it.include?"#f8fbff":"#f8fafc",
              opacity:it.include?1:0.5, transition:"all 0.15s" }}>
              <div onClick={() => toggle(it.id)} style={{ flexShrink:0, marginTop:2, cursor:"pointer" }}>
                <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${it.include?"#1e3a8a":"#cbd5e1"}`,
                  background:it.include?"#1e3a8a":"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {it.include && <span style={{ color:"#fff", fontSize:12, fontWeight:900 }}>✓</span>}
                </div>
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                <input value={it.description} onChange={e=>updateItem(it.id,"description",e.target.value)} disabled={!it.include}
                  style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:12, fontWeight:600, color:"#1e293b", width:"100%", boxSizing:"border-box" }} />
                <div style={{ display:"flex", gap:6 }}>
                  <input value={it.responsible} onChange={e=>updateItem(it.id,"responsible",e.target.value)} disabled={!it.include} placeholder="Responsável"
                    style={{ flex:1, padding:"4px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11 }} />
                  <input value={it.due_date} onChange={e=>updateItem(it.id,"due_date",e.target.value)} disabled={!it.include} placeholder="Prazo"
                    style={{ flex:1, padding:"4px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11 }} />
                  <select value={it.project} onChange={e=>updateItem(it.id,"project",e.target.value)} disabled={!it.include}
                    style={{ flex:1, padding:"4px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, background:"#fff" }}>
                    {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"#64748b" }}>{includedCount} de {items.length} selecionados</span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #e2e8f0",
              background:"#fff", fontSize:12, cursor:"pointer", color:"#475569", fontWeight:600 }}>Cancelar</button>
            <button onClick={handleSend} disabled={saving||includedCount===0}
              style={{ padding:"8px 18px", borderRadius:8, border:"none",
                background:includedCount===0?"#e2e8f0":"#1e3a8a", color:includedCount===0?"#94a3b8":"#fff",
                fontSize:12, fontWeight:700, cursor:includedCount===0||saving?"default":"pointer",
                display:"flex", alignItems:"center", gap:6 }}>
              {saving ? <><Spinner size={12}/> Enviando...</> : `✅ Enviar ${includedCount} para Kanban`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE CHECKLIST ─────────────────────────────────────────────────────
function Checklist({ actionId, checklists, onUpdate }) {
  const [newItemText, setNewItemText]   = useState({});
  const [addingItem, setAddingItem]     = useState(null);
  const [editTitle, setEditTitle]       = useState(null);
  const [editTitleVal, setEditTitleVal] = useState("");

  async function persist(clId, updatedCl) {
    const { error } = await sb.from("action_item_checklists")
      .update({ title: updatedCl.title, items: JSON.stringify(updatedCl.items) })
      .eq("id", clId);
    if (error) console.error("Erro ao persistir checklist:", error);
  }

  async function toggleItem(clId, itemId) {
    const updatedCl = checklists.find(cl => cl.id === clId);
    if (!updatedCl) return;
    const newCl = { ...updatedCl, items: updatedCl.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it) };
    onUpdate(checklists.map(cl => cl.id !== clId ? cl : newCl));
    await persist(clId, newCl);
  }

  async function addItem(clId) {
    const text = (newItemText[clId] || "").trim();
    if (!text) return;
    const newItem = { id: Date.now() + "_" + Math.random(), text, done: false };
    const updatedCl = checklists.find(cl => cl.id === clId);
    if (!updatedCl) return;
    const newCl = { ...updatedCl, items: [...updatedCl.items, newItem] };
    onUpdate(checklists.map(cl => cl.id !== clId ? cl : newCl));
    setNewItemText(prev => ({ ...prev, [clId]: "" }));
    setAddingItem(null);
    await persist(clId, newCl);
  }

  async function removeItem(clId, itemId) {
    const updatedCl = checklists.find(cl => cl.id === clId);
    if (!updatedCl) return;
    const newCl = { ...updatedCl, items: updatedCl.items.filter(it => it.id !== itemId) };
    onUpdate(checklists.map(cl => cl.id !== clId ? cl : newCl));
    await persist(clId, newCl);
  }

  async function removeChecklist(clId) {
    onUpdate(checklists.filter(cl => cl.id !== clId));
    await sb.from("action_item_checklists").delete().eq("id", clId);
  }

  async function saveTitle(clId) {
    if (!editTitleVal.trim()) return;
    const updatedCl = checklists.find(cl => cl.id === clId);
    if (!updatedCl) return;
    const newCl = { ...updatedCl, title: editTitleVal.trim() };
    onUpdate(checklists.map(cl => cl.id !== clId ? cl : newCl));
    setEditTitle(null);
    await persist(clId, newCl);
  }

  if (!checklists || checklists.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {checklists.map(cl => {
        const done  = cl.items.filter(i => i.done).length;
        const total = cl.items.length;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={cl.id} style={{ background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0", padding:"10px 12px", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              {editTitle === cl.id ? (
                <input autoFocus value={editTitleVal}
                  onChange={e => setEditTitleVal(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter") saveTitle(cl.id); if (e.key==="Escape") setEditTitle(null); }}
                  onBlur={() => saveTitle(cl.id)}
                  style={{ flex:1, padding:"3px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, fontWeight:700 }} />
              ) : (
                <span onClick={() => { setEditTitle(cl.id); setEditTitleVal(cl.title); }}
                  style={{ fontSize:11, fontWeight:800, color:"#1e293b", cursor:"pointer", flex:1 }}>
                  ☑ {cl.title}
                </span>
              )}
              <button onClick={() => removeChecklist(cl.id)}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#94a3b8", padding:"0 2px" }}>✕</button>
            </div>
            {total > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <span style={{ fontSize:9, color:"#94a3b8", fontWeight:700, minWidth:24 }}>{pct}%</span>
                <div style={{ flex:1, height:4, background:"#e2e8f0", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:pct===100?"#16a34a":"#1e3a8a", borderRadius:99, transition:"width 0.3s" }} />
                </div>
                <span style={{ fontSize:9, color:"#94a3b8", fontWeight:700 }}>{done}/{total}</span>
              </div>
            )}
            {cl.items.map(it => (
              <div key={it.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, padding:"3px 0" }}>
                <div onClick={() => toggleItem(cl.id, it.id)} style={{
                  width:14, height:14, borderRadius:3, border:`2px solid ${it.done?"#1e3a8a":"#cbd5e1"}`,
                  background:it.done?"#1e3a8a":"#fff", cursor:"pointer", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {it.done && <span style={{ color:"#fff", fontSize:9, fontWeight:900, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:11, color:it.done?"#94a3b8":"#334155", textDecoration:it.done?"line-through":"none", flex:1, lineHeight:1.4 }}>{it.text}</span>
                <button onClick={() => removeItem(cl.id, it.id)}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#d1d5db", padding:0, opacity:0.6 }}>✕</button>
              </div>
            ))}
            {addingItem === cl.id ? (
              <div style={{ marginTop:6 }}>
                <input autoFocus value={newItemText[cl.id] || ""} placeholder="Item do checklist..."
                  onChange={e => setNewItemText(prev => ({ ...prev, [cl.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key==="Enter") addItem(cl.id); if (e.key==="Escape") setAddingItem(null); }}
                  style={{ width:"100%", padding:"4px 8px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, boxSizing:"border-box", marginBottom:4 }} />
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={() => addItem(cl.id)} style={{ padding:"4px 10px", borderRadius:5, border:"none", background:"#1e3a8a", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Salvar</button>
                  <button onClick={() => setAddingItem(null)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #e2e8f0", background:"#fff", fontSize:11, cursor:"pointer" }}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingItem(cl.id)}
                style={{ marginTop:4, display:"flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:5,
                  border:"1px dashed #cbd5e1", background:"none", color:"#94a3b8", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                + Adicionar item
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ABA 1: TRANSCRIÇÕES ─────────────────────────────────────────────────────
function TranscriptionsTab({ meetings, addMeeting, deleteMeeting, updateMeeting, saveAta, atas, loadAll, addActions }) {
  const [search, setSearch]               = useState("");
  const [filterProject, setFP]            = useState("Todos");
  const [filterMonth, setFM]              = useState("Todos");
  const [expandedId, setExpanded]         = useState(null);
  const [syncing, setSyncing]             = useState(false);
  const [syncMsg, setSyncMsg]             = useState(null);
  const [confirmDel, setConfirmDel]       = useState(null);
  const [classifyMeeting, setClassify]    = useState(null);
  const [renameMeeting, setRename]        = useState(null);
  const [generatingAta, setGeneratingAta] = useState(null);
  const [reviewModal, setReviewModal]     = useState(null);
  const fileRef = useRef();

  const allProjects = [...new Set(meetings.map(m => m.project).filter(Boolean))].sort();
  const projects = ["Todos", ...allProjects];
  const months   = ["Todos", ...new Set(meetings.map(m => m.month).filter(Boolean))];

  const filtered = meetings.filter(m => {
    const s = !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.project||"").toLowerCase().includes(search.toLowerCase());
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
      setSyncMsg(data.imported > 0
        ? `✓ ${data.imported} nova(s) transcrição(ões) importada(s) do Drive.`
        : "✓ Nenhuma transcrição nova encontrada no Drive.");
    } catch (e) {
      setSyncMsg(`⚠ Erro: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  // ✅ CORRIGIDO: lê o texto real do PDF via /api/extract-pdf
  async function handlePDF(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setSyncMsg("📄 Extraindo texto do PDF...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na extração");

      const name = file.name.replace(/\.pdf$/i, "");
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
      const project =
        Object.keys(DEFAULT_PROJECT_COLORS).find(p => name.toLowerCase().includes(p.toLowerCase())) ?? "Sem projeto";

      await addMeeting({
        project, month, date: dateStr, title: name,
        participants: [], status: "transcribed", source: "pdf",
        transcription: data.text,
      });

      setSyncMsg("✓ PDF importado com sucesso.");
    } catch (err) {
      setSyncMsg(`⚠ Erro: ${err.message}`);
    } finally {
      setSyncing(false);
      e.target.value = "";
      setTimeout(() => setSyncMsg(null), 5000);
    }
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
        body: JSON.stringify({ transcription: meeting.transcription, title: meeting.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro na API");
      await saveAta(meeting.id, {
        participantes: data.participantes || [],
        pautas: data.pautas || [],
        decisoes: data.decisoes || [],
        encaminhamentos: data.encaminhamentos || [],
      });
      if (data.encaminhamentos && data.encaminhamentos.length > 0) {
        setReviewModal({ encaminhamentos: data.encaminhamentos, meetingId: meeting.id, meetingProject: meeting.project });
      } else {
        setSyncMsg(`✓ Ata de "${meeting.title}" gerada! Veja na aba Atas.`);
      }
    } catch (e) {
      setSyncMsg(`⚠ Erro ao gerar ata: ${e.message}`);
    } finally {
      setGeneratingAta(null);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  const total = filtered.length;
  const countLabel = total === 1 ? "1 reunião encontrada" : `${total} reuniões encontradas`;

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

      <div style={{ fontSize:12, color:"#94a3b8", marginBottom:10 }}>{countLabel}</div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filtered.map(m => {
          const expanded = expandedId === m.id;
          const hasAta = m.status === "ata_generated";
          const isGenerating = generatingAta === m.id;
          return (
            <div key={m.id} style={{ borderRadius:10, border:`1px solid ${expanded?"#bfdbfe":"#f1f5f9"}`,
              background:expanded?"#f8fbff":"#fff", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => setExpanded(expanded ? null : m.id)}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                    <ProjectBadge project={m.project} />
                    <span style={{ fontSize:11, fontWeight:700, color:hasAta?"#10b981":"#6366f1" }}>● {hasAta?"Ata gerada":"Transcrição"}</span>
                    {m.source === "pdf" && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>PDF</span>}
                    <span style={{ fontSize:11, color:"#94a3b8" }}>{m.date}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.title}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{(m.participants||[]).join(", ")}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                  <button onClick={e=>{ e.stopPropagation(); setRename(m); }} title="Renomear"
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #e2e8f0",
                      background:"#fff", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer" }}>✏️</button>
                  <button onClick={e=>{ e.stopPropagation(); setClassify(m); }} title="Classificar projeto"
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #bfdbfe",
                      background:"#eff6ff", color:"#1e3a8a", fontSize:11, fontWeight:700, cursor:"pointer" }}>🏷 Projeto</button>
                  <button onClick={e=>{ e.stopPropagation(); handleGerarAta(m); }}
                    disabled={isGenerating||hasAta}
                    style={{ padding:"4px 10px", borderRadius:6,
                      border:`1px solid ${hasAta?"#bbf7d0":isGenerating?"#e2e8f0":"#a5f3fc"}`,
                      background:hasAta?"#f0fdf4":isGenerating?"#f8fafc":"#ecfeff",
                      color:hasAta?"#16a34a":isGenerating?"#94a3b8":"#0891b2",
                      fontSize:11, fontWeight:700, cursor:hasAta||isGenerating?"default":"pointer",
                      display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
                    {isGenerating ? <><Spinner size={10}/> Gerando...</> : hasAta ? "✓ Ata ok" : "✨ Gerar Ata"}
                  </button>
                  <button onClick={e=>{ e.stopPropagation(); setConfirmDel(m.id); }}
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #fca5a5",
                      background:"#fff", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑</button>
                  <span onClick={() => setExpanded(expanded?null:m.id)} style={{ fontSize:18, color:"#94a3b8", paddingTop:2, cursor:"pointer" }}>{expanded?"↑":"↓"}</span>
                </div>
              </div>
              {expanded && (
                <pre style={{ margin:0, padding:"12px 14px", background:"#f1f5f9", fontSize:12,
                  lineHeight:1.7, color:"#475569", whiteSpace:"pre-wrap", wordBreak:"break-word", borderTop:"1px solid #e2e8f0" }}>
                  {m.transcription || "Sem transcrição."}
                </pre>
              )}
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Nenhuma transcrição encontrada.</div>}
      </div>

      {confirmDel && <ConfirmModal message="Apagar esta transcrição? Esta ação não pode ser desfeita."
        onConfirm={()=>{ deleteMeeting(confirmDel); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />}
      {classifyMeeting && <ClassifyProjectModal meeting={classifyMeeting} allProjects={allProjects}
        onSave={(id,project)=>updateMeeting(id,{project})} onClose={()=>setClassify(null)} />}
      {renameMeeting && <RenameModal meeting={renameMeeting}
        onSave={(id,title)=>updateMeeting(id,{title})} onClose={()=>setRename(null)} />}
      {reviewModal && <ActionReviewModal encaminhamentos={reviewModal.encaminhamentos}
        meetingId={reviewModal.meetingId} meetingProject={reviewModal.meetingProject}
        meetings={meetings} addActions={addActions}
        onClose={()=>{ setReviewModal(null); setSyncMsg("✓ Ata salva! Encaminhamentos enviados para o Kanban."); setTimeout(()=>setSyncMsg(null),5000); }} />}
    </div>
  );
}

// ─── ABA 2: ATAS ─────────────────────────────────────────────────────────────
function MinutesTab({ meetings, atas, saveAta, deleteAta, addActions }) {
  const [filterProject, setFP]    = useState("Todos");
  const [filterMonth, setFM]      = useState("Todos");
  const [selectedId, setSelected] = useState(null);
  const [editing, setEditing]     = useState(false);
  const [localAta, setLocalAta]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [confirmDelAta, setConfirmDelAta] = useState(null);
  const [reviewModal, setReviewModal]     = useState(null);

  const withAta = meetings.filter(m => m.status === "ata_generated");
  const projects = ["Todos", ...new Set(withAta.map(m => m.project))];
  const months   = ["Todos", ...new Set(withAta.map(m => m.month).filter(Boolean))];
  const filtered = withAta.filter(m => {
    const p  = filterProject === "Todos" || m.project === filterProject;
    const mo = filterMonth   === "Todos" || m.month   === filterMonth;
    return p && mo;
  });

  const meeting = filtered.find(m => m.id === selectedId);
  const ata = selectedId ? atas[selectedId] : null;

  function selectMeeting(id) {
    setSelected(id); setEditing(false);
    const a = atas[id];
    if (a) setLocalAta({ participantes:a.participantes, pautas:a.pautas, decisoes:a.decisoes, encaminhamentos:a.encaminhamentos });
  }

  function startEdit() {
    setLocalAta({ participantes:ata.participantes, pautas:ata.pautas, decisoes:ata.decisoes, encaminhamentos:ata.encaminhamentos });
    setEditing(true);
  }

  async function handleSave() { setSaving(true); await saveAta(selectedId, localAta); setSaving(false); setEditing(false); }

  function updateCell(section, ri, ci, val) {
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[section][ri][ci] = val;
      return copy;
    });
  }

  function addRow(section) {
    const EMPTY = { participantes:["","",""], pautas:["","",""], decisoes:["","",""], encaminhamentos:["","","",""] };
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const newRow = [...EMPTY[section]]; newRow[0] = String((copy[section]?.length||0)+1);
      copy[section] = [...(copy[section]||[]), newRow];
      return copy;
    });
  }

  function removeRow(section, ri) {
    setLocalAta(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[section] = copy[section].filter((_,i)=>i!==ri).map((row,i)=>{ const r=[...row]; r[0]=String(i+1); return r; });
      return copy;
    });
  }

  const displayAta = editing ? localAta : (ata ? { participantes:ata.participantes, pautas:ata.pautas, decisoes:ata.decisoes, encaminhamentos:ata.encaminhamentos } : null);
  const SECTIONS = [
    { key:"participantes",   title:"PARTICIPANTES",   columns:["#","Nome","Empresa"],            widths:[0.5,2,2] },
    { key:"pautas",          title:"PAUTAS",          columns:["#","Pauta","Observações"],       widths:[0.5,2,2] },
    { key:"decisoes",        title:"DECISÕES",        columns:["#","Decisão","Responsável"],     widths:[0.5,2,2] },
    { key:"encaminhamentos", title:"ENCAMINHAMENTOS", columns:["#","Ação","Responsável","Prazo"],widths:[0.5,2.5,1.5,1] },
  ];

  return (
    <div style={{ display:"flex", gap:20 }}>
      <div style={{ width:240, flexShrink:0 }}>
        <div style={{ marginBottom:10 }}>
          <select value={filterProject} onChange={e=>setFP(e.target.value)}
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, marginBottom:6, background:"#fff" }}>
            {projects.map(p=><option key={p} value={p}>{p==="Todos"?"Todos os projetos":p}</option>)}
          </select>
          <select value={filterMonth} onChange={e=>setFM(e.target.value)}
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            {months.map(m=><option key={m} value={m}>{m==="Todos"?"Todos os meses":(MONTH_LABELS[m]||m)}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {filtered.map(m=>(
            <button key={m.id} onClick={()=>selectMeeting(m.id)}
              style={{ textAlign:"left", padding:"9px 11px", borderRadius:8,
                border:`1px solid ${selectedId===m.id?"#1e3a8a":"#f1f5f9"}`,
                background:selectedId===m.id?"#eff6ff":"#fff", cursor:"pointer" }}>
              <div style={{ marginBottom:3 }}><ProjectBadge project={m.project} small /></div>
              <div style={{ fontSize:11, fontWeight:600, color:"#1e293b", lineHeight:1.3 }}>{m.title.slice(0,40)}</div>
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{m.date}</div>
            </button>
          ))}
          {filtered.length===0 && <div style={{ fontSize:12, color:"#94a3b8", padding:16, textAlign:"center" }}>Nenhuma ata.</div>}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {!meeting ? (
          <div style={{ textAlign:"center", padding:64, color:"#94a3b8" }}>Selecione uma ata na lista.</div>
        ) : (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:"#1e293b" }}>{meeting.title}</div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>{meeting.date} · <ProjectBadge project={meeting.project} small /></div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {ata && ata.encaminhamentos && ata.encaminhamentos.length>0 && (
                  <button onClick={()=>setReviewModal({ encaminhamentos:ata.encaminhamentos, meetingId:meeting.id, meetingProject:meeting.project })}
                    style={{ padding:"6px 14px", borderRadius:8, border:"1px solid #a5f3fc",
                      background:"#ecfeff", color:"#0891b2", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    ✅ Enviar Encaminhamentos
                  </button>
                )}
                {!editing ? (
                  <button onClick={startEdit} style={{ padding:"6px 14px", borderRadius:8,
                    border:"1px solid #bfdbfe", background:"#eff6ff", color:"#1e3a8a", fontSize:12, fontWeight:700, cursor:"pointer" }}>✏️ Editar</button>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding:"6px 14px", borderRadius:8, border:"none",
                      background:"#10b981", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                      {saving?<><Spinner size={12}/> Salvando...</>:"💾 Salvar"}
                    </button>
                    <button onClick={()=>setEditing(false)} style={{ padding:"6px 14px", borderRadius:8,
                      border:"1px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:12, cursor:"pointer" }}>Cancelar</button>
                  </>
                )}
                <button onClick={()=>setConfirmDelAta(selectedId)}
                  style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #fca5a5",
                    background:"#fff", color:"#ef4444", fontSize:12, cursor:"pointer" }}>🗑</button>
              </div>
            </div>
            {displayAta && SECTIONS.map(({key:section,title,columns,widths}) =>
              editing ? (
                <div key={section} style={{ marginBottom:18, border:"1px solid #bfdbfe", borderRadius:8, overflow:"hidden" }}>
                  <div style={{ background:"#1f3864", padding:"7px 12px" }}>
                    <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>{title}</span>
                  </div>
                  {(displayAta[section]||[]).map((row,ri)=>(
                    <div key={ri} style={{ display:"flex", background:ri%2===1?"#e8f0fe":"#fff", borderBottom:"1px solid #e2e8f0" }}>
                      {row.map((cell,ci)=>(
                        <div key={ci} style={{ flex:widths[ci], padding:"4px 6px", borderRight:ci<row.length-1?"1px solid #e2e8f0":"none" }}>
                          <input value={cell} onChange={e=>updateCell(section,ri,ci,e.target.value)}
                            style={{ width:"100%", border:"none", background:"transparent", fontSize:11,
                              padding:"2px 4px", outline:"none", color:"#334155", boxSizing:"border-box" }} />
                        </div>
                      ))}
                      <div style={{ padding:"0 6px", flexShrink:0 }}>
                        <button onClick={()=>removeRow(section,ri)}
                          style={{ width:20, height:20, borderRadius:"50%", border:"none", background:"#fca5a5",
                            color:"#ef4444", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center",
                            justifyContent:"center", fontWeight:700, lineHeight:1 }}>−</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding:"6px 10px", borderTop:"1px dashed #bfdbfe" }}>
                    <button onClick={()=>addRow(section)} style={{ display:"flex", alignItems:"center", gap:4,
                      padding:"4px 10px", borderRadius:6, border:"1px dashed #93c5fd", background:"#f0f7ff",
                      color:"#1e3a8a", fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Adicionar linha</button>
                  </div>
                </div>
              ) : (
                <ATATable key={section} title={title} columns={columns} rows={displayAta[section]||[]} widths={widths} />
              )
            )}
          </div>
        )}
      </div>
      {confirmDelAta && <ConfirmModal
        message="Apagar esta ata? A reunião voltará ao status de transcrição."
        onConfirm={()=>{ deleteAta(confirmDelAta); setConfirmDelAta(null); setSelected(null); }}
        onCancel={()=>setConfirmDelAta(null)} />}
      {reviewModal && <ActionReviewModal encaminhamentos={reviewModal.encaminhamentos}
        meetingId={reviewModal.meetingId} meetingProject={reviewModal.meetingProject}
        meetings={meetings} addActions={addActions} onClose={()=>setReviewModal(null)} />}
    </div>
  );
}

// ─── ABA 3: ENCAMINHAMENTOS (KANBAN) ─────────────────────────────────────────
function ActionItemsTab({ actions, meetings, addAction, updateAction, deleteAction }) {
  const [filterResponsible, setFilterResp] = useState("Todos");
  const [showDone, setShowDone]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [addingCol, setAddingCol]   = useState(null);
  const [newForm, setNewForm]       = useState({ description:"", responsible:"", due_date:"", meeting_id:"", project:"" });
  const [confirmDel, setConfirmDel] = useState(null);
  const [dragging, setDragging]     = useState(null);
  const [now, setNow]               = useState(Date.now());
  const [filterProject, setFP]      = useState("Todos");
  const [newProject, setNewProject] = useState("");
  const [showNewProj, setShowNewProj] = useState(false);
  const [checklists, setChecklists]           = useState({});
  const [addingChecklist, setAddingChecklist] = useState(null);
  const [newClTitle, setNewClTitle]           = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadChecklists() {
      const { data, error } = await sb.from("action_item_checklists").select("*");
      if (!error && data) {
        const map = {};
        data.forEach(cl => {
          if (!map[cl.action_item_id]) map[cl.action_item_id] = [];
          let parsedItems = [];
          try {
            parsedItems = typeof cl.items === "string" ? JSON.parse(cl.items) : Array.isArray(cl.items) ? cl.items : [];
          } catch (e) { parsedItems = []; }
          map[cl.action_item_id].push({ id: cl.id, title: cl.title, items: parsedItems });
        });
        setChecklists(map);
      }
    }
    loadChecklists();
  }, []);

  const allProjects = [...new Set([
    ...meetings.map(m => m.project).filter(Boolean),
    ...actions.map(a => a.project).filter(Boolean),
    ...Object.keys(DEFAULT_PROJECT_COLORS),
  ])].sort();

  const allResponsibles = ["Todos", ...new Set(actions.map(a => a.responsible).filter(Boolean))].sort((a, b) => {
    if (a === "Todos") return -1; if (b === "Todos") return 1;
    if (a === ME) return -1; if (b === ME) return 1;
    return a.localeCompare(b);
  });

  const visible = actions.filter(a => {
    const byResp = filterResponsible === "Todos" || a.responsible === filterResponsible;
    const byProject = filterProject === "Todos" || a.project === filterProject ||
      (!a.project && meetings.find(m => m.id === a.meeting_id)?.project === filterProject);
    return byResp && byProject;
  });

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
    setEditForm({ description:a.description, responsible:a.responsible, due_date:a.due_date, project:a.project||"" });
  }

  async function saveEdit(id) { await updateAction(id, editForm); setEditingId(null); }

  async function handleAdd(colId) {
    if (!newForm.description.trim()) return;
    const proj = showNewProj && newProject.trim() ? newProject.trim() : (newForm.project || "Sem projeto");
    const meetingId = newForm.meeting_id ? parseInt(newForm.meeting_id) : (meetings[0]?.id ?? null);
    await addAction({ meeting_id:meetingId, description:newForm.description,
      responsible:newForm.responsible||ME, due_date:newForm.due_date||"A Definir", status:colId, project:proj });
    setNewForm({ description:"", responsible:"", due_date:"", meeting_id:"", project:"" });
    setNewProject(""); setShowNewProj(false); setAddingCol(null);
  }

  async function addChecklist(actionId) {
    const title = newClTitle.trim() || "Checklist";
    const { data, error } = await sb.from("action_item_checklists")
      .insert({ action_item_id: actionId, title, items: JSON.stringify([]) })
      .select().single();
    if (error) { console.error("Erro ao criar checklist:", error); return; }
    if (data) {
      setChecklists(prev => ({ ...prev, [actionId]: [...(prev[actionId] || []), { id: data.id, title: data.title, items: [] }] }));
    }
    setAddingChecklist(null);
    setNewClTitle("");
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#64748b" }}>Responsável:</span>
          <select value={filterResponsible} onChange={e => setFilterResp(e.target.value)}
            style={{ padding:"5px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            {allResponsibles.map(r => (
              <option key={r} value={r}>{r === "Todos" ? "Todos" : r === ME ? `${r} (eu)` : r}</option>
            ))}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, fontWeight:600, color:"#64748b" }}>Projeto:</span>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            style={{ padding:"5px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            <option value="Todos">Todos os projetos</option>
            {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {hiddenDoneCount > 0 && (
          <button onClick={() => setShowDone(!showDone)} style={{ padding:"5px 12px", borderRadius:99,
            border:"1px solid #e2e8f0", background:showDone?"#f0fdf4":"#fff",
            color:showDone?"#16a34a":"#64748b", fontSize:12, fontWeight:600, cursor:"pointer" }}>
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
              style={{ minWidth:240, flex:"0 0 240px", background:col.bg, borderRadius:12,
                border:`1px solid ${col.color}25`, overflow:"hidden" }}>
              <div style={{ padding:"10px 12px", borderBottom:`2px solid ${col.color}`,
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col.color }} />
                  <span style={{ fontSize:11, fontWeight:800, color:col.color, textTransform:"uppercase", letterSpacing:0.3 }}>{col.label}</span>
                  <span style={{ fontSize:11, background:`${col.color}22`, color:col.color, borderRadius:99, padding:"1px 7px", fontWeight:700 }}>{items.length}</span>
                </div>
                {col.id !== "done" && (
                  <button onClick={() => setAddingCol(addingCol === col.id ? null : col.id)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:col.color, lineHeight:1 }}>+</button>
                )}
              </div>

              {addingCol === col.id && (
                <div style={{ padding:"8px 10px", background:"#fff", borderBottom:`1px solid ${col.color}25` }}>
                  <input placeholder="Descrição..." value={newForm.description}
                    onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                  <input placeholder="Responsável" value={newForm.responsible}
                    onChange={e => setNewForm(f => ({ ...f, responsible: e.target.value }))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                  <input placeholder="Prazo (dd/mm/aaaa)" value={newForm.due_date}
                    onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                  <select value={showNewProj ? "__new__" : newForm.project}
                    onChange={e => { if (e.target.value === "__new__") { setShowNewProj(true); }
                      else { setShowNewProj(false); setNewForm(f => ({ ...f, project: e.target.value })); } }}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:4, background:"#fff" }}>
                    <option value="">Sem projeto</option>
                    {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__new__">+ Criar novo projeto...</option>
                  </select>
                  {showNewProj && (
                    <input placeholder="Nome do novo projeto" value={newProject}
                      onChange={e => setNewProject(e.target.value)}
                      style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                  )}
                  <select value={newForm.meeting_id} onChange={e => setNewForm(f => ({ ...f, meeting_id: e.target.value }))}
                    style={{ width:"100%", padding:"5px 8px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:11, marginBottom:6, background:"#fff" }}>
                    <option value="">Vincular reunião (opcional)</option>
                    {meetings.map(m => <option key={m.id} value={m.id}>{m.project} — {m.title.slice(0,30)}</option>)}
                  </select>
                  <div style={{ display:"flex", gap:5 }}>
                    <button onClick={() => handleAdd(col.id)} style={{ flex:1, padding:"5px", borderRadius:6, border:"none",
                      background:col.color, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Adicionar</button>
                    <button onClick={() => { setAddingCol(null); setShowNewProj(false); setNewProject(""); }} style={{ padding:"5px 8px", borderRadius:6,
                      border:"1px solid #e2e8f0", background:"#fff", fontSize:11, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              )}

              <div style={{ padding:"8px", display:"flex", flexDirection:"column", gap:6, minHeight:80 }}>
                {items.map(a => {
                  const m = meetings.find(mt => mt.id === a.meeting_id);
                  const cardProject = a.project || m?.project;
                  const isMe = a.responsible === ME;
                  const isEditing = editingId === a.id;
                  const cardChecklists = checklists[a.id] || [];
                  return (
                    <div key={a.id} draggable onDragStart={() => setDragging(a.id)} onDragEnd={() => setDragging(null)}
                      style={{ background:"#fff", borderRadius:8, padding:"10px 10px 8px",
                        boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #f1f5f9",
                        cursor:"grab", borderLeft:`3px solid ${col.color}`, opacity:dragging===a.id?0.5:1 }}>
                      {isEditing ? (
                        <div>
                          <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                          <input value={editForm.responsible} onChange={e => setEditForm(f => ({ ...f, responsible: e.target.value }))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                          <input value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:4, boxSizing:"border-box" }} />
                          <select value={editForm.project || ""} onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                            style={{ width:"100%", padding:"4px 6px", borderRadius:5, border:"1px solid #bfdbfe", fontSize:11, marginBottom:6, background:"#fff" }}>
                            <option value="">Sem projeto</option>
                            {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
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
                            {cardProject && <span style={{ marginBottom:2 }}><ProjectBadge project={cardProject} small /></span>}
                            <span style={{ fontSize:10, color:isMe?"#1e3a8a":"#64748b", fontWeight:isMe?700:400 }}>👤 {a.responsible}{isMe?" (eu)":""}</span>
                            <span style={{ fontSize:10, color:"#94a3b8" }}>📅 {a.due_date}</span>
                          </div>
                          <Checklist actionId={a.id} checklists={cardChecklists}
                            onUpdate={updated => setChecklists(prev => ({ ...prev, [a.id]: updated }))} />
                          {addingChecklist === a.id ? (
                            <div style={{ marginTop:6 }}>
                              <input autoFocus value={newClTitle} placeholder="Título do checklist..."
                                onChange={e => setNewClTitle(e.target.value)}
                                onKeyDown={e => { if (e.key==="Enter") addChecklist(a.id); if (e.key==="Escape") setAddingChecklist(null); }}
                                style={{ width:"100%", padding:"4px 8px", borderRadius:5, border:"1px solid #bfdbfe",
                                  fontSize:11, boxSizing:"border-box", marginBottom:4 }} />
                              <div style={{ display:"flex", gap:4 }}>
                                <button onClick={() => addChecklist(a.id)} style={{ padding:"4px 10px", borderRadius:5, border:"none",
                                  background:"#1e3a8a", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Criar</button>
                                <button onClick={() => setAddingChecklist(null)} style={{ padding:"4px 8px", borderRadius:5,
                                  border:"1px solid #e2e8f0", background:"#fff", fontSize:11, cursor:"pointer" }}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingChecklist(a.id); setNewClTitle(""); }}
                              style={{ display:"flex", alignItems:"center", gap:4, marginTop:6, padding:"3px 8px",
                                borderRadius:5, border:"1px dashed #cbd5e1", background:"none",
                                color:"#94a3b8", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                              ☑ Checklist
                            </button>
                          )}
                          <div style={{ display:"flex", gap:4, justifyContent:"flex-end", marginTop:6 }}>
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
      {confirmDel && <ConfirmModal message="Excluir este encaminhamento? Esta ação não pode ser desfeita."
        onConfirm={() => { deleteAction(confirmDel); setConfirmDel(null); }} onCancel={() => setConfirmDel(null)} />}
    </div>
  );
}

// ─── ABA 4: CONCLUÍDOS ───────────────────────────────────────────────────────
function CompletedTab({ actions, meetings }) {
  const [filterProject, setFP] = useState("Todos");
  const done = actions.filter(a => a.status === "done");
  function getProject(a) {
    if (a.project) return a.project;
    return meetings.find(m => m.id === a.meeting_id)?.project ?? "Sem projeto";
  }
  const projects = ["Todos", ...new Set(done.map(getProject))];
  const byProject = {};
  done.forEach(a => {
    const p = getProject(a);
    if (filterProject !== "Todos" && p !== filterProject) return;
    if (!byProject[p]) byProject[p] = [];
    const m = meetings.find(mt => mt.id === a.meeting_id);
    byProject[p].push({ ...a, meetingTitle: m?.title ?? "—" });
  });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>Encaminhamentos Concluídos</div>
        <span style={{ background:"#f0fdf4", color:"#16a34a", fontSize:12, fontWeight:700, padding:"2px 10px", borderRadius:99 }}>{done.length} total</span>
        <select value={filterProject} onChange={e => setFP(e.target.value)}
          style={{ marginLeft:"auto", padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
          {projects.map(p => <option key={p} value={p}>{p === "Todos" ? "Todos os projetos" : p}</option>)}
        </select>
      </div>
      {Object.keys(byProject).length === 0 && <div style={{ textAlign:"center", padding:48, color:"#94a3b8", fontSize:14 }}>Nenhum encaminhamento concluído.</div>}
      {Object.entries(byProject).map(([project, items]) => (
        <div key={project} style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:"2px solid #f1f5f9" }}>
            <ProjectBadge project={project} />
            <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{items.length} concluído{items.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {items.map(a => (
              <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px",
                borderRadius:8, background:"#f8fafc", border:"1px solid #f1f5f9" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"#dcfce7",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, marginTop:1 }}>✓</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#64748b", textDecoration:"line-through", marginBottom:3 }}>{a.description}</div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>👤 {a.responsible} · 📅 {a.due_date} · 📋 {a.meetingTitle}</div>
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
  const [filterProject, setFP]     = useState("Todos");
  const [filterStatus, setFS]      = useState("Todos");
  const [filterResponsible, setFR] = useState("Todos");

  function getActionProject(a) {
    if (a.project) return a.project;
    return meetings.find(m => m.id === a.meeting_id)?.project ?? "Sem projeto";
  }

  const allProjects     = [...new Set(actions.map(getActionProject).filter(Boolean))].sort();
  const allResponsibles = [...new Set(actions.map(a => a.responsible).filter(Boolean))].sort();

  let fa = actions;
  if (filterProject !== "Todos")     fa = fa.filter(a => getActionProject(a) === filterProject);
  if (filterStatus !== "Todos")      fa = fa.filter(a => a.status === filterStatus);
  if (filterResponsible !== "Todos") fa = fa.filter(a => a.responsible === filterResponsible);

  const total    = fa.length;
  const done     = fa.filter(a => a.status === "done").length;
  const pending  = fa.filter(a => ["pending", "personal"].includes(a.status)).length;
  const critical = fa.filter(a => a.status === "critical").length;
  const inProg   = fa.filter(a => a.status === "in_progress").length;
  const rate     = total > 0 ? Math.round((done / total) * 100) : 0;
  const projectsInFilter = [...new Set(fa.map(getActionProject))];
  const hasActiveFilters = filterProject !== "Todos" || filterStatus !== "Todos" || filterResponsible !== "Todos";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"14px 18px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#475569", marginBottom:10, textTransform:"uppercase", letterSpacing:0.3 }}>Filtros</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            <option value="Todos">Todos os projetos</option>
            {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFS(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            <option value="Todos">Todos os status</option>
            {KANBAN_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={filterResponsible} onChange={e => setFR(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }}>
            <option value="Todos">Todos os responsáveis</option>
            {allResponsibles.map(r => <option key={r} value={r}>{r === ME ? `${r} (eu)` : r}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setFP("Todos"); setFS("Todos"); setFR("Todos"); }}
              style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #fca5a5", background:"#fff",
                color:"#ef4444", fontSize:11, fontWeight:600, cursor:"pointer" }}>✕ Limpar filtros</button>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {[
          { label:"Reuniões",        value:meetings.length, color:"#1e3a8a", icon:"📋" },
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
        {projectsInFilter.length === 0 && <div style={{ fontSize:12, color:"#94a3b8" }}>Sem dados.</div>}
        {projectsInFilter.map(project => {
          const pi  = fa.filter(a => getActionProject(a) === project);
          const pd  = pi.filter(a => a.status === "done").length;
          const pct = pi.length > 0 ? Math.round((pd / pi.length) * 100) : 0;
          const color = getProjectColor(project);
          return (
            <div key={project} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <ProjectBadge project={project} />
                <span style={{ fontSize:11, color:"#94a3b8" }}>{pd}/{pi.length} ({pct}%)</span>
              </div>
              <div style={{ height:8, background:"#f1f5f9", borderRadius:99, overflow:"hidden", marginBottom:6 }}>
                <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 0.5s" }} />
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {KANBAN_COLS.map(c => { const n = pi.filter(a => a.status === c.id).length; if (!n) return null;
                  return <span key={c.id} style={{ fontSize:10, padding:"1px 8px", borderRadius:99,
                    background:`${c.color}15`, color:c.color, fontWeight:700, border:`1px solid ${c.color}30` }}>{c.label}: {n}</span>; })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"18px 22px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Pendências por responsável</div>
        {[...new Set(fa.map(a => a.responsible))].map(resp => {
          const open  = fa.filter(a => a.responsible === resp && a.status !== "done").length;
          const doneR = fa.filter(a => a.responsible === resp && a.status === "done").length;
          if (!open && !doneR) return null;
          const initials = resp.split(" ").slice(0, 2).map(w => w[0]).join("");
          const isMe = resp === ME;
          return (
            <div key={resp} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"8px 12px",
              borderRadius:8, background:isMe?"#f0f7ff":"#fafafa", border:`1px solid ${isMe?"#bfdbfe":"#f1f5f9"}` }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:isMe?"#dbeafe":"#f1f5f9",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700,
                color:isMe?"#1e3a8a":"#475569", border:isMe?"2px solid #1e3a8a":"none", flexShrink:0 }}>{initials}</div>
              <div style={{ flex:1, fontSize:12, fontWeight:isMe?700:400, color:isMe?"#1e3a8a":"#334155" }}>{resp}{isMe?" (eu)":""}</div>
              <div style={{ display:"flex", gap:6 }}>
                {open > 0 && <span style={{ padding:"3px 10px", borderRadius:99, background:"#fef3c7", color:"#d97706", fontSize:11, fontWeight:700 }}>{open} aberto{open > 1 ? "s" : ""}</span>}
                {doneR > 0 && <span style={{ padding:"3px 10px", borderRadius:99, background:"#dcfce7", color:"#16a34a", fontSize:11, fontWeight:700 }}>{doneR} concluído{doneR > 1 ? "s" : ""}</span>}
              </div>
            </div>
          );
        })}
        {fa.length === 0 && <div style={{ fontSize:12, color:"#94a3b8" }}>Nenhum dado com os filtros selecionados.</div>}
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #f1f5f9", padding:"18px 22px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:12 }}>Status geral dos encaminhamentos</div>
        <div style={{ display:"flex", gap:8 }}>
          {KANBAN_COLS.map(c => {
            const n = fa.filter(a => a.status === c.id).length;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={c.id} style={{ flex:1, textAlign:"center" }}>
                <div style={{ height:60, background:"#f1f5f9", borderRadius:8, overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                  <div style={{ width:"100%", height:`${pct}%`, background:c.color, transition:"height 0.5s", minHeight:n>0?4:0 }} />
                </div>
                <div style={{ fontSize:10, color:c.color, fontWeight:700, marginTop:4 }}>{n}</div>
                <div style={{ fontSize:9, color:"#94a3b8", lineHeight:1.2, marginTop:1 }}>{c.label.split(" ")[0]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ABA 6: ENVIO DE AGENDAS ─────────────────────────────────────────────────
function EnvioAgendasTab() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  useEffect(() => { carregarProjetos(); }, []);

  async function carregarProjetos() {
    setLoading(true);
    const { data, error } = await sb.from("agenda_projetos").select("*").order("created_at", { ascending: true });
    if (!error && data) setProjetos(data);
    setLoading(false);
  }

  async function adicionarProjeto() {
    const nome = novoNome.trim();
    if (!nome) return;
    const { data, error } = await sb.from("agenda_projetos")
      .insert({ nome, atividades_programadas: false, agenda_enviada: false })
      .select().single();
    if (!error && data) { setProjetos(prev => [...prev, data]); setNovoNome(""); setAdicionando(false); }
  }

  async function toggleFlag(id, campo, valorAtual) {
    const { error } = await sb.from("agenda_projetos").update({ [campo]: !valorAtual }).eq("id", id);
    if (!error) setProjetos(prev => prev.map(p => p.id === id ? { ...p, [campo]: !valorAtual } : p));
  }

  async function excluirProjeto(id) {
    if (!confirm("Remover este projeto da lista de agendas?")) return;
    const { error } = await sb.from("agenda_projetos").delete().eq("id", id);
    if (!error) setProjetos(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#1e293b", marginBottom:4 }}>📅 Envio de Agendas</div>
        <div style={{ fontSize:13, color:"#64748b" }}>Controle semanal de atividades programadas e envio de agendas por projeto</div>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 190px 190px 44px",
          padding:"11px 20px", background:"#f9fafb", borderBottom:"1px solid #e5e7eb", gap:8 }}>
          {["PROJETO","ATIVIDADES PROGRAMADAS","AGENDA ENVIADA",""].map((h, i) => (
            <div key={i} style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", letterSpacing:"0.05em", textAlign:i>0&&i<3?"center":"left" }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>Carregando...</div>
        ) : (
          <>
            {projetos.map((p, idx) => (
              <div key={p.id} style={{ display:"grid", gridTemplateColumns:"1fr 190px 190px 44px",
                padding:"12px 20px", gap:8, alignItems:"center",
                borderBottom: idx < projetos.length - 1 || adicionando ? "1px solid #f3f4f6" : "none",
                background:"#fff", transition:"background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <span style={{ fontSize:14, fontWeight:600, color:"#111" }}>{p.nome}</span>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <button onClick={() => toggleFlag(p.id, "atividades_programadas", p.atividades_programadas)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 14px", borderRadius:20, border:"none",
                      cursor:"pointer", fontSize:12, fontWeight:600, transition:"all 0.15s",
                      background:p.atividades_programadas?"#dcfce7":"#f3f4f6",
                      color:p.atividades_programadas?"#16a34a":"#9ca3af" }}>
                    {p.atividades_programadas ? "✅ Sim" : "⬜ Não"}
                  </button>
                </div>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <button onClick={() => toggleFlag(p.id, "agenda_enviada", p.agenda_enviada)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 14px", borderRadius:20, border:"none",
                      cursor:"pointer", fontSize:12, fontWeight:600, transition:"all 0.15s",
                      background:p.agenda_enviada?"#dbeafe":"#f3f4f6",
                      color:p.agenda_enviada?"#1d4ed8":"#9ca3af" }}>
                    {p.agenda_enviada ? "📨 Enviada" : "📭 Pendente"}
                  </button>
                </div>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <button onClick={() => excluirProjeto(p.id)} title="Remover"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#d1d5db",
                      fontSize:15, padding:4, borderRadius:4, lineHeight:1, transition:"color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.color = "#d1d5db"}>🗑</button>
                </div>
              </div>
            ))}
            {adicionando && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 190px 190px 44px",
                padding:"10px 20px", gap:8, alignItems:"center", background:"#fffbeb",
                borderTop: projetos.length > 0 ? "1px solid #f3f4f6" : "none" }}>
                <input autoFocus value={novoNome} onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter") adicionarProjeto(); if (e.key==="Escape") { setAdicionando(false); setNovoNome(""); } }}
                  placeholder="Nome do projeto..."
                  style={{ padding:"6px 10px", borderRadius:6, border:"1px solid #d1d5db", fontSize:13,
                    outline:"none", width:"100%", boxSizing:"border-box" }} />
                <div style={{ textAlign:"center", color:"#9ca3af", fontSize:12 }}>—</div>
                <div style={{ textAlign:"center", color:"#9ca3af", fontSize:12 }}>—</div>
                <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                  <button onClick={adicionarProjeto} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#16a34a" }}>✓</button>
                  <button onClick={() => { setAdicionando(false); setNovoNome(""); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#ef4444" }}>✕</button>
                </div>
              </div>
            )}
            {projetos.length === 0 && !adicionando && (
              <div style={{ padding:40, textAlign:"center", color:"#9ca3af", fontSize:13 }}>Nenhum projeto cadastrado ainda.</div>
            )}
          </>
        )}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #e5e7eb", background:"#f9fafb" }}>
          {!adicionando ? (
            <button onClick={() => setAdicionando(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"none",
                border:"1px dashed #d1d5db", borderRadius:8, padding:"6px 14px", cursor:"pointer",
                fontSize:12, color:"#6b7280", fontWeight:600, transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
              + Adicionar projeto
            </button>
          ) : (
            <span style={{ fontSize:12, color:"#9ca3af" }}>Enter para salvar · Esc para cancelar</span>
          )}
        </div>
      </div>
      <div style={{ marginTop:14, display:"flex", gap:20, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"#9ca3af" }}>✅ Atividades planejadas para a semana</span>
        <span style={{ fontSize:11, color:"#9ca3af" }}>📨 Agenda enviada ao cliente</span>
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
    addAction, addActions, updateAction, deleteAction, saveAta, deleteAta,
  } = useAppData();

  const tabs = [
    { id:"transcricoes",    label:"Transcrições",    icon:"📄" },
    { id:"atas",            label:"Atas",             icon:"📋" },
    { id:"encaminhamentos", label:"Encaminhamentos",  icon:"✅" },
    { id:"concluidos",      label:"Concluídos",       icon:"🏁" },
    { id:"dashboard",       label:"Dashboard",        icon:"📊" },
    { id:"envio_agendas",   label:"Envio de Agendas", icon:"📅" },
  ];

  const doneCount = actions.filter(a => a.status === "done").length;
  const openCount = actions.filter(a => a.status !== "done").length;

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
            <Spinner size={28}/> Carregando dados...
          </div>
        ) : (
          <>
            {activeTab==="transcricoes"    && <TranscriptionsTab meetings={meetings} addMeeting={addMeeting} deleteMeeting={deleteMeeting} updateMeeting={updateMeeting} saveAta={saveAta} atas={atas} loadAll={loadAll} addActions={addActions} />}
            {activeTab==="atas"            && <MinutesTab meetings={meetings} atas={atas} saveAta={saveAta} deleteAta={deleteAta} addActions={addActions} />}
            {activeTab==="encaminhamentos" && <ActionItemsTab actions={actions} meetings={meetings} addAction={addAction} updateAction={updateAction} deleteAction={deleteAction} />}
            {activeTab==="concluidos"      && <CompletedTab actions={actions} meetings={meetings} />}
            {activeTab==="dashboard"       && <DashboardTab meetings={meetings} actions={actions} />}
            {activeTab==="envio_agendas"   && <EnvioAgendasTab />}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
