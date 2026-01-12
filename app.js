/* =========================================================
   Oasis Diagnósticos — app.js
   - Historial por cliente (localStorage)
   - Buscador de códigos por marca (fetch codes.json)
   - Cards con color (marca + severidad)
   - Usar en diagnóstico / Copiar
   - Export/Import JSON
   ========================================================= */

const HUB_URL = "https://eliezelapolinaris2017-lab.github.io/oasis-hub/";
const KEY = "oasis_diagnostics_v2";
const CODES_URL = "codes.json";

const $ = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);

const escapeHtml = (s="") =>
  String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

// DOM
const brandSel = $("brand");
const codeSearch = $("codeSearch");
const codeResults = $("codeResults");
const codesStatus = $("codesStatus");

const client = $("client");
const contact = $("contact");
const equipment = $("equipment");
const locationField = $("location");
const dateField = $("date");
const statusField = $("status");
const diagnosis = $("diagnosis");
const solution = $("solution");

const btnSaveDiag = $("btnSaveDiag");
const btnClearForm = $("btnClearForm");
const btnDuplicate = $("btnDuplicate");
const btnDeleteActive = $("btnDeleteActive");

const histSearch = $("histSearch");
const histBody = $("histBody");
const btnExport = $("btnExport");
const btnImport = $("btnImport");
const importFile = $("importFile");
const btnClearHist = $("btnClearHist");

const diagMode = $("diagMode");

// State
let codesDB = {};   // { Brand: [ ... ] }
let flatCodes = []; // flattened array
let activeId = null;

// ----------------- Storage -----------------
function loadDB(){
  return JSON.parse(localStorage.getItem(KEY) || JSON.stringify({ history: [] }));
}
function saveDB(db){
  localStorage.setItem(KEY, JSON.stringify(db));
}

// ----------------- History CRUD -----------------
function makePayload(){
  return {
    id: activeId || `d_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    client: (client.value||"").trim(),
    contact: (contact.value||"").trim(),
    equipment: (equipment.value||"").trim(),
    location: (locationField.value||"").trim(),
    date: dateField.value || todayISO(),
    status: statusField.value || "Pendiente",
    diagnosis: (diagnosis.value||"").trim(),
    solution: (solution.value||"").trim(),
    updatedAt: new Date().toISOString()
  };
}

function clearForm(){
  activeId = null;
  diagMode.textContent = "Nuevo";
  client.value = "";
  contact.value = "";
  equipment.value = "";
  locationField.value = "";
  dateField.value = todayISO();
  statusField.value = "Pendiente";
  diagnosis.value = "";
  solution.value = "";
}

function saveDiagnostic(){
  const p = makePayload();

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
  renderHistory();
  // mantiene el form “en edición” si estabas editando
  activeId = p.id;
  diagMode.textContent = "Editando";
}

function deleteActive(){
  if (!activeId){
    clearForm();
    return;
  }
  if (!confirm("¿Borrar este diagnóstico del historial?")) return;

  const db = loadDB();
  db.history = db.history.filter(x=>x.id!==activeId);
  saveDB(db);
  clearForm();
  renderHistory();
}

function duplicateActive(){
  const p = makePayload();
  if (!p.client && !p.diagnosis){
    alert("No hay nada para duplicar.");
    return;
  }
  activeId = null;
  diagMode.textContent = "Nuevo (duplicado)";
  // deja los campos como están, solo cambia el modo/id
}

function openFromHistory(id){
  const db = loadDB();
  const x = db.history.find(h=>h.id===id);
  if (!x) return;

  activeId = x.id;
  diagMode.textContent = "Editando";

  client.value = x.client || "";
  contact.value = x.contact || "";
  equipment.value = x.equipment || "";
  locationField.value = x.location || "";
  dateField.value = x.date || todayISO();
  statusField.value = x.status || "Pendiente";
  diagnosis.value = x.diagnosis || "";
  solution.value = x.solution || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHistory(){
  const db = loadDB();
  const q = (histSearch.value || "").trim().toLowerCase();

  const rows = db.history.filter(x=>{
    if (!q) return true;
    const hay = [
      x.client, x.contact, x.equipment, x.location, x.date, x.status, x.diagnosis, x.solution
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });

  histBody.innerHTML = "";

  if (!rows.length){
    histBody.innerHTML = `<tr><td colspan="6" style="opacity:.7;padding:14px">Sin historial todavía.</td></tr>`;
    return;
  }

  rows.forEach(x=>{
    const badge =
      x.status === "Resuelto" ? `<span class="badge ok">Resuelto</span>` :
      x.status === "En proceso" ? `<span class="badge warn">En proceso</span>` :
      `<span class="badge danger">Pendiente</span>`;

    const summary = (x.diagnosis || "").slice(0, 60) + ((x.diagnosis||"").length>60 ? "…" : "");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(x.date||"")}</td>
      <td><strong>${escapeHtml(x.client||"")}</strong><div style="opacity:.7;font-size:12px">${escapeHtml(x.contact||"")}</div></td>
      <td>${escapeHtml(x.equipment||"—")}<div style="opacity:.7;font-size:12px">${escapeHtml(x.location||"")}</div></td>
      <td>${badge}</td>
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
    b.addEventListener("click", ()=>openFromHistory(b.dataset.open));
  });
  histBody.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      if (!confirm("¿Borrar diagnóstico?")) return;
      const db = loadDB();
      db.history = db.history.filter(h=>h.id!==b.dataset.del);
      saveDB(db);
      if (activeId===b.dataset.del) clearForm();
      renderHistory();
    });
  });
}

// ----------------- Export / Import -----------------
function exportJSON(){
  const db = loadDB();
  const payload = { exportedAt: new Date().toISOString(), db };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oasis_diagnosticos_${todayISO()}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 400);
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

// ----------------- Codes -----------------
function normalizeBrandClass(brand){
  return `brand-${String(brand||"").replace(/\s+/g,"")}`;
}
function normalizeSevClass(sev){
  const s = String(sev||"Media").replace(/\s+/g,"");
  return `sev-${s}`;
}

async function loadCodes(){
  try{
    codesStatus.textContent = "Cargando…";
    const res = await fetch(CODES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("codes.json no disponible");
    codesDB = await res.json();

    // brands
    const brands = Object.keys(codesDB).sort();
    brands.forEach(b=>{
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      brandSel.appendChild(opt);
    });

    // flatten
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

    codesStatus.textContent = `Listo · ${flatCodes.length} códigos`;
    renderCodeResults([]);

  } catch (e) {
    console.warn(e);
    codesStatus.textContent = "Error";
    codeResults.innerHTML = `
      <div class="codeCard sev-Alta brand-Midea">
        <strong>Error</strong>
        <div class="meta">No se pudo cargar <b>codes.json</b>. Verifica que esté en la raíz del repo.</div>
      </div>`;
  }
}

function filterCodes(){
  const q = (codeSearch.value || "").trim().toLowerCase();
  const brand = brandSel.value;

  if (!q){
    renderCodeResults([]);
    return;
  }

  const results = flatCodes.filter(r=>{
    const inBrand = (brand === "ALL") || (r.brand === brand);
    const hay = [
      r.brand, r.code, r.title, r.cause, r.fix, r.severity, (r.tags||[]).join(" ")
    ].join(" ").toLowerCase();
    return inBrand && hay.includes(q);
  }).slice(0, 30);

  renderCodeResults(results);
}

function renderCodeResults(rows){
  codeResults.innerHTML = "";

  if (!rows.length){
    codeResults.innerHTML = `
      <div class="codeCard sev-Baja brand-Fujitsu">
        <strong>Busca un código o palabra clave</strong>
        <div class="meta">Ej: <b>E6</b>, <b>EC</b>, <b>F1</b>, <b>NTC</b>, <b>comunicación</b>, <b>descarga</b>…</div>
      </div>`;
    return;
  }

  rows.forEach(r=>{
    const div = document.createElement("div");
    div.className = `codeCard ${normalizeBrandClass(r.brand)} ${normalizeSevClass(r.severity)}`;

    div.innerHTML = `
      <strong>${escapeHtml(r.brand)} · ${escapeHtml(r.code)} — ${escapeHtml(r.title)}</strong>
      <div class="meta">Severidad: <b>${escapeHtml(r.severity || "—")}</b> · Tags: ${escapeHtml((r.tags||[]).join(", ") || "—")}</div>
      ${r.cause ? `<p><b>Causa:</b> ${escapeHtml(r.cause)}</p>` : ""}
      ${r.fix ? `<p><b>Solución:</b> ${escapeHtml(r.fix)}</p>` : ""}
      <div class="gridBtns">
        <button class="btn primary" type="button" data-use="${escapeHtml(r.brand)}|${escapeHtml(r.code)}">Usar en diagnóstico</button>
        <button class="btn" type="button" data-copy="${escapeHtml(r.brand)}|${escapeHtml(r.code)}">Copiar</button>
      </div>
    `;

    codeResults.appendChild(div);
  });

  // events
  codeResults.querySelectorAll("[data-use]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const [brand, code] = b.dataset.use.split("|");
      const r = flatCodes.find(x=>x.brand===brand && x.code===code);
      if (!r) return;

      // rellena equipo si está vacío
      if (!equipment.value.trim()) equipment.value = `${r.brand}`;

      const block = `${r.brand} ${r.code} — ${r.title}`;
      const diagLine = `Código detectado: ${block}.`;

      // no te borra, te añade
      diagnosis.value = (diagnosis.value.trim() ? (diagnosis.value.trim() + "\n\n") : "") +
        diagLine + (r.cause ? `\nPosible causa: ${r.cause}` : "");

      solution.value = (solution.value.trim() ? (solution.value.trim() + "\n\n") : "") +
        (r.fix ? r.fix : `Revisar procedimiento técnico para ${block}.`);

      // foco a diagnóstico
      diagnosis.focus();
    });
  });

  codeResults.querySelectorAll("[data-copy]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const [brand, code] = b.dataset.copy.split("|");
      const r = flatCodes.find(x=>x.brand===brand && x.code===code);
      if (!r) return;

      const txt = `${r.brand} ${r.code} — ${r.title}\nCausa: ${r.cause}\nSolución: ${r.fix}`;
      try{
        await navigator.clipboard.writeText(txt);
        codesStatus.textContent = "Copiado ✅";
        setTimeout(()=>codesStatus.textContent = `Listo · ${flatCodes.length} códigos`, 900);
      }catch{
        alert("No se pudo copiar (permisos del navegador).");
      }
    });
  });
}

// ----------------- Boot -----------------
(function boot(){
  $("hubBackBtn").href = HUB_URL;
  dateField.value = todayISO();

  btnSaveDiag.addEventListener("click", saveDiagnostic);
  btnClearForm.addEventListener("click", clearForm);
  btnDuplicate.addEventListener("click", duplicateActive);
  btnDeleteActive.addEventListener("click", deleteActive);

  histSearch.addEventListener("input", renderHistory);

  btnExport.addEventListener("click", exportJSON);
  btnImport.addEventListener("click", ()=>importFile.click());
  importFile.addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if (f) importJSON(f);
    e.target.value = "";
  });
  btnClearHist.addEventListener("click", ()=>{
    if (!confirm("¿Vaciar historial completo?")) return;
    saveDB({ history: [] });
    clearForm();
    renderHistory();
  });

  brandSel.addEventListener("change", filterCodes);
  codeSearch.addEventListener("input", filterCodes);

  renderHistory();
  loadCodes();
})();
