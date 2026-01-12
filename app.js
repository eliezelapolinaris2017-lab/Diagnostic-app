"use strict";

/* ====== Config ====== */
const LS_DIAGS = "oasis_diag_history_v2";
let CODES = [];
let lastLookup = null;

/* ====== DOM ====== */
const $ = (id) => document.getElementById(id);

/* ====== Utils ====== */
const nowISO = () => new Date().toISOString();
const fmtDate = (d) => new Date(d).toLocaleString("es-PR", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
const safe = (v) => (v ?? "").toString().trim();
const lc = (v) => safe(v).toLowerCase();

function escapeHtml(str){
  return safe(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function toast(msg, ok=true){
  const el = $("statusMsg");
  el.textContent = msg;
  el.style.color = ok ? "rgba(52,211,153,.95)" : "rgba(251,113,133,.95)";
  setTimeout(()=>{ el.textContent=""; el.style.color=""; }, 2300);
}

/* ====== Hub navigation ====== */
function goHub(){
  // Ajusta a tu ruta real del Hub
  // Si tu hub está en la raíz: "./index.html"
  // Si esta app está dentro de carpeta /diagnostic: "../index.html"
  window.location.href = "../index.html";
}
window.goHub = goHub;

/* ====== Data (History) ====== */
function loadHistory(){
  try{
    const raw = localStorage.getItem(LS_DIAGS);
    return raw ? JSON.parse(raw) : [];
  }catch{ return []; }
}
function saveHistory(items){
  localStorage.setItem(LS_DIAGS, JSON.stringify(items));
}

/* ====== Brand detect ====== */
function detectBrand(text){
  const t = lc(text);
  const brands = ["midea","gree","tgm","fujitsu","samsung","carrier","airmax"];
  for (const b of brands) if (t.includes(b)) return b[0].toUpperCase()+b.slice(1);
  return "General";
}
function sevTag(sev){
  const s = lc(sev);
  if (s.includes("alta")) return "tagAlta";
  if (s.includes("media")) return "tagMedia";
  return "tagBaja";
}

/* ====== Codes load/search ====== */
async function loadCodes(){
  try{
    const res = await fetch("./codes.json", { cache:"no-store" });
    const data = await res.json();
    CODES = Array.isArray(data.items) ? data.items : [];
    $("codesPill").textContent = `${CODES.length} códigos`;
  }catch{
    CODES = [];
    $("codesPill").textContent = "0 códigos";
  }
}

function findCode(code, brandHint=""){
  const q = lc(code);
  if (!q) return null;

  const bh = safe(brandHint);
  let pool = CODES;

  if (bh){
    const byBrand = CODES.filter(x => safe(x.brand).toLowerCase() === bh.toLowerCase());
    if (byBrand.length) pool = byBrand;
  }

  // exact code
  let hit = pool.find(x => lc(x.code) === q);
  if (hit) return hit;

  // fallback exact global
  hit = CODES.find(x => lc(x.code) === q);
  return hit || null;
}

function filterCodes(){
  const q = lc($("codeSearch").value);
  const b = safe($("codeBrand").value);
  const c = safe($("codeCategory").value);

  let items = CODES.slice();

  if (b) items = items.filter(x => safe(x.brand) === b);
  if (c) items = items.filter(x => safe(x.category) === c);

  if (q){
    items = items.filter(x => {
      const blob = `${x.brand} ${x.code} ${x.title} ${x.category} ${x.fix} ${x.keywords||""}`.toLowerCase();
      return blob.includes(q);
    });
  }

  renderCodes(items);
}

function renderCodes(items){
  const grid = $("codesList");
  const empty = $("codesEmpty");
  grid.innerHTML = "";

  if (!items.length){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for (const it of items){
    const div = document.createElement("div");
    div.className = "codeCard";
    div.innerHTML = `
      <div class="codeTop">
        <div class="codeBig">${escapeHtml(it.code)}</div>
        <span class="tag tagBrand">${escapeHtml(it.brand)}</span>
      </div>
      <div class="codeTitle">${escapeHtml(it.title)}</div>
      <div class="codeMeta">${escapeHtml(it.category)} • Severidad: ${escapeHtml(it.severity)}</div>
    `;
    div.addEventListener("click", ()=> showCodeModal(it, true));
    grid.appendChild(div);
  }
}

/* ====== Modal ====== */
function openModal(html){
  $("modalBody").innerHTML = html;
  $("modal").style.display = "flex";
}
function closeModal(){ $("modal").style.display = "none"; }

function showCodeModal(it, allowApply){
  lastLookup = it;
  const html = `
    <div><b>Marca:</b> ${escapeHtml(it.brand)}</div>
    <div><b>Código:</b> ${escapeHtml(it.code)}</div>
    <div><b>Categoría:</b> ${escapeHtml(it.category)}</div>
    <div><b>Severidad:</b> ${escapeHtml(it.severity)}</div>
    <div style="margin-top:10px"><b>Definición:</b><br>${escapeHtml(it.title)}</div>
    <div style="margin-top:10px"><b>Acción sugerida:</b><br>${escapeHtml(it.fix)}</div>
  `;
  openModal(html);
  $("btnApply").style.display = allowApply ? "inline-flex" : "none";
}

/* ====== Diagnóstico logic ====== */
function fillToday(){
  $("todayPill").textContent = new Date().toLocaleDateString("es-PR", { year:"numeric", month:"short", day:"2-digit" });
}

function clearForm(){
  $("cliente").value="";
  $("equipo").value="";
  $("ubicacion").value="";
  $("codigo").value="";
  $("diagnostico").value="";
  $("solucion").value="";
  lastLookup = null;
}

function saveDiag(){
  const cliente = safe($("cliente").value);
  const equipo = safe($("equipo").value);
  const ubicacion = safe($("ubicacion").value);
  const codigo = safe($("codigo").value);
  const diagnostico = safe($("diagnostico").value);
  const solucion = safe($("solucion").value);

  if (!cliente || !equipo){
    toast("Cliente y Equipo son obligatorios.", false);
    return;
  }

  const brand = detectBrand(equipo);
  const hit = codigo ? findCode(codigo, brand) : null;

  const rec = {
    id: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())),
    createdAt: nowISO(),
    cliente,
    equipo,
    ubicacion,
    brand: hit?.brand || brand ||e,
    codigo: codigo || hit?.code || "",
    codeTitle: hit?.title || "",
    category: hit?.category || "",
    severity: hit?.severity || (hit ? "Media" : "Media"),
    diagnostico: diagnostico || (hit ? `Código ${hit.code}: ${hit.title}` : ""),
    solucion: solucion || (hit?.fix || "")
  };

  const items = loadHistory();
  items.push(rec);
  saveHistory(items);

  toast("Guardado. Registro añadido ✅");
  clearForm();
  renderHistory();
}

function lookupCodeFromForm(){
  const brand = detectBrand(safe($("equipo").value));
  const q = safe($("codigo").value);
  if (!q){ toast("Escribe un código primero.", false); return; }

  const hit = findCode(q, brand);
  if (!hit){
    lastLookup = null;
    openModal(`<b>No encontrado.</b><br><br>Esto no es falla tuya: hay códigos que cambian por modelo. Añádelo a <code>codes.json</code> y listo.`);
    $("btnApply").style.display = "none";
    return;
  }
  showCodeModal(hit, true);
}

function applyLookup(){
  if (!lastLookup) return closeModal();

  if (!safe($("diagnostico").value)){
    $("diagnostico").value = `Código ${lastLookup.code}: ${lastLookup.title}`;
  }
  if (!safe($("solucion").value)){
    $("solucion").value = lastLookup.fix;
  }
  if (!safe($("codigo").value)){
    $("codigo").value = lastLookup.code;
  }

  toast("Aplicado al formulario.");
  closeModal();
}

/* ====== History render ====== */
function buildRecCard(it){
  const div = document.createElement("div");
  div.className = "rec";

  const meta = `${safe(it.equipo) || "Equipo"} • ${safe(it.ubicacion) || "Ubicación"} • ${fmtDate(it.createdAt)}`;
  const codeLine = it.codigo ? `Código ${it.codigo}${it.codeTitle ? " • "+it.codeTitle : ""}` : "Sin código";

  div.innerHTML = `
    <div class="recTop">
      <div>
        <div class="recTitle">${escapeHtml(it.cliente)}</div>
        <div class="recMeta">${escapeHtml(meta)}</div>
        <div class="recCode">${escapeHtml(codeLine)}</div>
      </div>
      <div class="recActions">
        <button class="iconBtn" title="Copiar" data-act="copy" data-id="${it.id}">⎘</button>
        <button class="iconBtn iconBtnDanger" title="Eliminar" data-act="del" data-id="${it.id}">✕</button>
      </div>
    </div>

    <div class="recTagRow">
      <span class="tag tagBrand">${escapeHtml(it.brand || "General")}</span>
      <span class="tag ${sevTag(it.severity || "Media")}">${escapeHtml(it.severity || "Media")}</span>
      ${it.category ? `<span class="tag">${escapeHtml(it.category)}</span>` : ""}
    </div>

    ${it.diagnostico ? `<div class="recBody"><b>Diagnóstico:</b> ${escapeHtml(it.diagnostico)}</div>` : ""}
    ${it.solucion ? `<div class="recBody"><b>Solución:</b> ${escapeHtml(it.solucion)}</div>` : ""}
  `;
  return div;
}

function renderHistory(){
  const list = $("list");
  const empty = $("empty");
  list.innerHTML = "";

  const q = lc($("search").value);
  const brand = safe($("filterBrand").value);
  const sev = safe($("filterSeverity").value);

  let items = loadHistory();
  items.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));

  if (brand) items = items.filter(x => safe(x.brand) === brand);
  if (sev) items = items.filter(x => safe(x.severity) === sev);

  if (q){
    items = items.filter(x => {
      const blob = `${x.cliente} ${x.equipo} ${x.ubicacion} ${x.brand} ${x.codigo} ${x.codeTitle} ${x.category} ${x.diagnostico} ${x.solucion}`.toLowerCase();
      return blob.includes(q);
    });
  }

  if (!items.length){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  for (const it of items) list.appendChild(buildRecCard(it));
}

function handleHistoryClick(e){
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (!act || !id) return;

  const items = loadHistory();
  const idx = items.findIndex(x => x.id === id);
  if (idx < 0) return;

  if (act === "del"){
    items.splice(idx,1);
    saveHistory(items);
    toast("Registro eliminado.");
    renderHistory();
    return;
  }

  if (act === "copy"){
    const it = items[idx];
    const text = [
      `Cliente: ${it.cliente}`,
      `Equipo: ${it.equipo}`,
      `Ubicación: ${it.ubicacion || "-"}`,
      `Fecha: ${fmtDate(it.createdAt)}`,
      `Marca: ${it.brand || "General"}`,
      `Código: ${it.codigo || "-"} ${it.codeTitle ? "• "+it.codeTitle : ""}`,
      `Diagnóstico: ${it.diagnostico || "-"}`,
      `Solución: ${it.solucion || "-"}`
    ].join("\n");
    navigator.clipboard?.writeText(text);
    toast("Copiado.");
  }
}

function exportJSON(){
  const data = loadHistory();
  const blob = new Blob([JSON.stringify({ exportedAt: nowISO(), items: data }, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnosticos-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}

function wipeAll(){
  if (!confirm("Vas a borrar TODO el historial local. ¿Seguro?")) return;
  localStorage.removeItem(LS_DIAGS);
  toast("Historial eliminado.");
  renderHistory();
}

/* ====== Tabs ====== */
function showTab(which){
  const diag = $("tabDiag");
  const codes = $("tabCodes");
  const b1 = $("btnTabDiag");
  const b2 = $("btnTabCodes");

  const isDiag = which === "diag";
  diag.classList.toggle("hidden", !isDiag);
  codes.classList.toggle("hidden", isDiag);

  b1.classList.toggle("tabActive", isDiag);
  b2.classList.toggle("tabActive", !isDiag);
}

/* ====== Init ====== */
(async function init(){
  fillToday();
  await loadCodes();
  renderHistory();
  filterCodes();

  $("btnSave").addEventListener("click", saveDiag);
  $("btnClear").addEventListener("click", clearForm);
  $("btnLookup").addEventListener("click", lookupCodeFromForm);

  $("list").addEventListener("click", handleHistoryClick);
  $("search").addEventListener("input", renderHistory);
  $("filterBrand").addEventListener("change", renderHistory);
  $("filterSeverity").addEventListener("change", renderHistory);

  $("btnExport").addEventListener("click", exportJSON);
  $("btnWipe").addEventListener("click", wipeAll);

  $("btnCloseModal").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e)=>{ if (e.target.id === "modal") closeModal(); });
  $("btnApply").addEventListener("click", applyLookup);

  $("btnTabDiag").addEventListener("click", ()=> showTab("diag"));
  $("btnTabCodes").addEventListener("click", ()=> showTab("codes"));

  $("codeSearch").addEventListener("input", filterCodes);
  $("codeBrand").addEventListener("change", filterCodes);
  $("codeCategory").addEventListener("change", filterCodes);

  $("btnNew").addEventListener("click", ()=>{
    showTab("diag");
    window.scrollTo({ top:0, behavior:"smooth" });
    $("cliente").focus();
  });
})();
