/* =========================================================
  Oasis Diagnósticos — app.js (FULL)
  - Codes search (codes.json) + color cards
  - Use code -> fill diagnosis/solution
  - History per client (localStorage)
  - Export/Import JSON
========================================================= */

const HUB_URL = "https://eliezelapolinaris2017-lab.github.io/oasis-hub/";
const KEY = "oasis_diagnostics_suite_v1";
const CODES_URL = "codes.json";

const $ = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);

const escapeHtml = (s="") =>
  String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

/* DOM */
const kpiDocs = $("kpiDocs");
const kpiClient = $("kpiClient");
const kpiCodes = $("kpiCodes");

const codesStatus = $("codesStatus");
const brandSel = $("brand");
const codeSearch = $("codeSearch");
const codeResults = $("codeResults");

const modePill = $("modePill");
const client = $("client");
const contact = $("contact");
const dateField = $("date");
const equipment = $("equipment");
const locationField = $("location");
const diagnosis = $("diagnosis");
const solution = $("solution");

const btnNew = $("btnNew");
const btnSave = $("btnSave");
const btnDuplicate = $("btnDuplicate");
const btnDelete = $("btnDelete");

const histSearch = $("histSearch");
const histBody = $("histBody");
const btnExport = $("btnExport");
const btnImport = $("btnImport");
const importFile = $("importFile");
const btnClearAll = $("btnClearAll");

/* State */
let codesDB = {};
let flatCodes = [];
let activeId = null;

/* Storage */
function loadDB(){
  return JSON.parse(localStorage.getItem(KEY) || JSON.stringify({ history: [] }));
}
function saveDB(db){
  localStorage.setItem(KEY, JSON.stringify(db));
}

/* UI helpers */
function setMode(text){
  modePill.textContent = text;
}
function updateKPIs(){
  const db = loadDB();
  kpiDocs.textContent = db.history.length;
  const c = (client.value || "").trim();
  kpiClient.textContent = c ? c : "—";
  kpiCodes.textContent = flatCodes.length;
}

/* Form */
function clearForm(){
  activeId = null;
  setMode("Nuevo");
  client.value = "";
  contact.value = "";
  equipment.value = "";
  locationField.value = "";
  diagnosis.value = "";
  solution.value = "";
  dateField.value = todayISO();
  updateKPIs();
}

function readForm(){
  return {
    id: activeId || `d_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    client: (client.value||"").trim(),
    contact: (contact.value||"").trim(),
    date: dateField.value || todayISO(),
    equipment: (equipment.value||"").trim(),
    location: (locationField.value||"").trim(),
    diagnosis: (diagnosis.value||"").trim(),
    solution: (solution.value||"").trim(),
    updatedAt: new Date().toISOString()
  };
}

function saveDiag(){
  const p = readForm();
  if (!p.client || !p.diagnosis){
    alert("Cliente y Diagnóstico son obligatorios.");
    return;
  }

  const db = loadDB();
  const idx = db.history.findIndex(x=>x.id===p.id);

  if (idx >= 0){
    db.history[idx] = { ...db.history[idx], ...p };
  } else {
    db.history.unshift({ ...p, createdAt: new Date().toISOString() });
  }

  saveDB(db);
  activeId = p.id;
  setMode("Editando");
  renderHistory();
  updateKPIs();
}

function duplicateDiag(){
  if (!client.value.trim() && !diagnosis.value.trim()){
    alert("No hay nada para duplicar.");
    return;
  }
  activeId = null;
  setMode("Nuevo (duplicado)");
}

function deleteDiag(){
  if (!activeId){
    clearForm();
    return;
  }
  if (!confirm("¿Borrar este diagnóstico?")) return;

  const db = loadDB();
  db.history = db.history.filter(x=>x.id !== activeId);
  saveDB(db);
  clearForm();
  renderHistory();
}

/* History */
function openDiag(id){
  const db = loadDB();
  const x = db.history.find(h=>h.id===id);
  if (!x) return;

  activeId = x.id;
  setMode("Editando");

  client.value = x.client || "";
  contact.value = x.contact || "";
  dateField.value = x.date || todayISO();
  equipment.value = x.equipment || "";
  locationField.value = x.location || "";
  diagnosis.value = x.diagnosis || "";
  solution.value = x.solution || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
  updateKPIs();
}

function renderHistory(){
  const db = loadDB();
  const q = (histSearch.value || "").trim().toLowerCase();

  const rows = db.history.filter(x=>{
    if (!q) return true;
    const hay = [x.client, x.contact, x.date, x.equipment, x.location, x.diagnosis, x.solution].join(" ").toLowerCase();
    return hay.includes(q);
  });

  histBody.innerHTML = "";

  if (!rows.length){
    histBody.innerHTML = `<tr><td colspan="5" style="opacity:.7;padding:14px">Sin historial todavía.</td></tr>`;
    return;
  }

  rows.forEach(x=>{
    const summary = (x.diagnosis || "").slice(0, 70) + ((x.diagnosis||"").length>70 ? "…" : "");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(x.date || "")}</td>
      <td><strong>${escapeHtml(x.client || "")}</strong><div style="opacity:.7;font-size:12px">${escapeHtml(x.contact || "")}</div></td>
      <td>${escapeHtml(x.equipment || "—")}<div style="opacity:.7;font-size:12px">${escapeHtml(x.location || "")}</div></td>
      <td>${escapeHtml(summary)}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost" type="button" data-open="${escapeHtml(x.id)}">Abrir</button>
          <button class="btn danger" type="button" data-del="${escapeHtml(x.id)}">Borrar</button>
        </div>
      </td>
    `;
    histBody.appendChild(tr);
  });

  histBody.querySelectorAll("[data-open]").forEach(b=>{
    b.addEventListener("click", ()=>openDiag(b.dataset.open));
  });
  histBody.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      if (!confirm("¿Borrar diagnóstico?")) return;
      const db = loadDB();
      db.history = db.history.filter(h=>h.id!==b.dataset.del);
      saveDB(db);
      if (activeId===b.dataset.del) clearForm();
      renderHistory();
      updateKPIs();
    });
  });
}

/* Export / Import */
function exportJSON(){
  const db = loadDB();
  const payload = { exportedAt: new Date().toISOString(), db };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oasis_diagnosticos_${todayISO()}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 300);
}

async function importJSON(file){
  try{
    const txt = await file.text();
    const data = JSON.parse(txt);
    const db = data.db || data;
    if (!db.history || !Array.isArray(db.history)) {
      alert("Archivo inválido.");
      return;
    }
    saveDB({ history: db.history });
    clearForm();
    renderHistory();
    alert("Importado ✅");
  }catch{
    alert("No se pudo importar.");
  }
}

/* Codes */
function brandClass(brand){
  const b = String(brand || "").trim();
  return b ? `brand-${b.replace(/\s+/g,"")}` : "brand-Generic";
}
function sevClass(sev){
  const s = String(sev||"Media").trim();
  return `sev-${s.replace(/\s+/g,"")}`;
}

async function loadCodes(){
  try{
    codesStatus.textContent = "Cargando…";
    const res = await fetch(CODES_URL, { cache: "no-store" });
    if(!res.ok) throw new Error("codes.json no encontrado");
    codesDB = await res.json();

    const brands = Object.keys(codesDB).sort();
    brands.forEach(b=>{
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      brandSel.appendChild(opt);
    });

    flatCodes = [];
    brands.forEach(b=>{
      (codesDB[b] || []).forEach(x=>{
        flatCodes.push({
          brand: b,
          code: x.code || "",
          title: x.title || "",
          cause: x.cause || "",
          fix: x.fix || "",
          severity: x.severity || "Media",
          tags: Array.isArray(x.tags) ? x.tags : []
        });
      });
    });

    codesStatus.textContent = `Listo · ${flatCodes.length}`;
    updateKPIs();
    renderCodeResults([]);

  } catch (e) {
    console.warn(e);
    codesStatus.textContent = "Error";
    codeResults.innerHTML = `
      <div class="codeCard brand-Generic sev-Alta">
        <strong>Error cargando codes.json</strong>
        <div class="meta">Confirma que <b>codes.json</b> está en la raíz del repo.</div>
      </div>
    `;
  }
}

function filterCodes(){
  const q = (codeSearch.value || "").trim().toLowerCase();
  const b = brandSel.value;

  if (!q){
    renderCodeResults([]);
    return;
  }

  const rows = flatCodes.filter(r=>{
    const inBrand = (b === "ALL") || (r.brand === b);
    const hay = [r.brand, r.code, r.title, r.cause, r.fix, r.severity, (r.tags||[]).join(" ")].join(" ").toLowerCase();
    return inBrand && hay.includes(q);
  }).slice(0, 24);

  renderCodeResults(rows);
}

function renderCodeResults(rows){
  codeResults.innerHTML = "";

  if (!rows.length){
    codeResults.innerHTML = `
      <div class="codeCard brand-Generic sev-Baja">
        <strong>Listo para buscar</strong>
        <div class="meta">Ej: <b>E6</b>, <b>EC</b>, <b>F1</b>, <b>NTC</b>, <b>comunicación</b>, <b>voltaje</b>…</div>
      </div>
    `;
    return;
  }

  rows.forEach(r=>{
    const div = document.createElement("div");
    div.className = `codeCard ${brandClass(r.brand)} ${sevClass(r.severity)}`;

    div.innerHTML = `
      <strong>${escapeHtml(r.brand)} · ${escapeHtml(r.code)} — ${escapeHtml(r.title)}</strong>
      <div class="meta">Severidad: <b>${escapeHtml(r.severity)}</b> · Tags: ${escapeHtml((r.tags||[]).join(", ") || "—")}</div>
      ${r.cause ? `<p><b>Causa:</b> ${escapeHtml(r.cause)}</p>` : ""}
      ${r.fix ? `<p><b>Solución:</b> ${escapeHtml(r.fix)}</p>` : ""}
      <div class="btnRow">
        <button class="btn" type="button" data-use="${escapeHtml(r.brand)}|${escapeHtml(r.code)}">Usar</button>
        <button class="btn ghost" type="button" data-copy="${escapeHtml(r.brand)}|${escapeHtml(r.code)}">Copiar</button>
      </div>
    `;

    codeResults.appendChild(div);
  });

  // Use
  codeResults.querySelectorAll("[data-use]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const [brand, code] = b.dataset.use.split("|");
      const r = flatCodes.find(x=>x.brand===brand && x.code===code);
      if (!r) return;

      if (!equipment.value.trim()) equipment.value = r.brand;

      const block = `${r.brand} ${r.code} — ${r.title}`;
      const diagLine = `Código: ${block}.`;

      diagnosis.value = (diagnosis.value.trim() ? (diagnosis.value.trim() + "\n\n") : "") +
        diagLine + (r.cause ? `\nPosible causa: ${r.cause}` : "");

      solution.value = (solution.value.trim() ? (solution.value.trim() + "\n\n") : "") +
        (r.fix ? r.fix : `Revisar procedimiento técnico para ${block}.`);

      updateKPIs();
      diagnosis.focus();
    });
  });

  // Copy
  codeResults.querySelectorAll("[data-copy]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const [brand, code] = b.dataset.copy.split("|");
      const r = flatCodes.find(x=>x.brand===brand && x.code===code);
      if (!r) return;

      const txt = `${r.brand} ${r.code} — ${r.title}\nCausa: ${r.cause}\nSolución: ${r.fix}`;
      try{
        await navigator.clipboard.writeText(txt);
        codesStatus.textContent = "Copiado ✅";
        setTimeout(()=>codesStatus.textContent = `Listo · ${flatCodes.length}`, 900);
      }catch{
        alert("No se pudo copiar (permisos del navegador).");
      }
    });
  });
}

/* Boot */
(function boot(){
  $("hubBtn").href = HUB_URL;
  dateField.value = todayISO();

  btnNew.addEventListener("click", clearForm);
  btnSave.addEventListener("click", saveDiag);
  btnDuplicate.addEventListener("click", duplicateDiag);
  btnDelete.addEventListener("click", deleteDiag);

  histSearch.addEventListener("input", renderHistory);

  btnExport.addEventListener("click", exportJSON);
  btnImport.addEventListener("click", ()=>importFile.click());
  importFile.addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if (f) importJSON(f);
    e.target.value = "";
  });

  btnClearAll.addEventListener("click", ()=>{
    if (!confirm("¿Vaciar historial completo?")) return;
    saveDB({ history: [] });
    clearForm();
    renderHistory();
    updateKPIs();
  });

  client.addEventListener("input", updateKPIs);

  brandSel.addEventListener("change", filterCodes);
  codeSearch.addEventListener("input", filterCodes);

  renderHistory();
  updateKPIs();
  loadCodes();
})();
