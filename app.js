/* app.js — Diagnostic App (sin PWA) */
"use strict";

/* ========= Keys ========= */
const LS_DIAGS = "diag_app_history_v1";
let CODES = [];
let lastLookup = null;

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
const nowISO = () => new Date().toISOString();
const fmtDate = (d) => new Date(d).toLocaleString("es-PR", { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });

function toast(msg, good=true){
  const el = $("statusMsg");
  el.textContent = msg;
  el.style.color = good ? "rgba(52,211,153,.95)" : "rgba(251,113,133,.95)";
  setTimeout(()=>{ el.textContent=""; el.style.color=""; }, 2200);
}

function safeText(v){ return (v ?? "").toString().trim(); }

function detectBrand(text){
  const t = (text||"").toLowerCase();
  const brands = ["midea","gree","fujitsu","samsung","carrier","tgm","airmax"];
  for (const b of brands) if (t.includes(b)) return b[0].toUpperCase()+b.slice(1);
  return "General";
}

function severityTagClass(sev){
  const s = (sev||"").toLowerCase();
  if (s.includes("alta")) return "tagSevAlta";
  if (s.includes("media")) return "tagSevMedia";
  return "tagSevBaja";
}

function loadHistory(){
  try{
    const raw = localStorage.getItem(LS_DIAGS);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

function saveHistory(items){
  localStorage.setItem(LS_DIAGS, JSON.stringify(items));
}

/* ========= Codes ========= */
async function loadCodes(){
  try{
    const res = await fetch("./codes.json", { cache:"no-store" });
    const data = await res.json();
    CODES = Array.isArray(data.items) ? data.items : [];
  }catch(e){
    CODES = [];
  }
}

function findCode(query, brandHint=""){
  const q = safeText(query).toLowerCase();
  if (!q) return null;

  const brand = safeText(brandHint);
  const byBrand = CODES.filter(x => (x.brand||"").toLowerCase() === brand.toLowerCase());

  const pool = byBrand.length ? byBrand : CODES;

  // match exact code first
  let hit = pool.find(x => (x.code||"").toLowerCase() === q);
  if (hit) return hit;

  // match contains on title/category/fix
  hit = pool.find(x => (x.title||"").toLowerCase().includes(q) || (x.category||"").toLowerCase().includes(q));
  if (hit) return hit;

  // fallback to any brand exact code
  hit = CODES.find(x => (x.code||"").toLowerCase() === q);
  return hit || null;
}

/* ========= UI ========= */
function fillToday(){
  $("todayPill").textContent = new Date().toLocaleDateString("es-PR", { year:"numeric", month:"short", day:"2-digit" });
}

function clearForm(){
  $("cliente").value = "";
  $("equipo").value = "";
  $("ubicacion").value = "";
  $("codigo").value = "";
  $("diagnostico").value = "";
  $("solucion").value = "";
  lastLookup = null;
}

function buildRecCard(item){
  const brand = item.brand || "General";
  const sev = item.severity || "Media";

  const div = document.createElement("div");
  div.className = "rec";

  const title = safeText(item.cliente) || "Sin nombre";
  const meta = `${safeText(item.equipo) || "Equipo"} • ${safeText(item.ubicacion) || "Ubicación"} • ${fmtDate(item.createdAt)}`;

  const codeLine = safeText(item.codigo) ? `Código ${item.codigo}` : (safeText(item.codeTitle) ? `Código: ${item.codeTitle}` : "Sin código");

  const diag = safeText(item.diagnostico);
  const sol = safeText(item.solucion);

  div.innerHTML = `
    <div class="recTop">
      <div>
        <div class="recTitle">${escapeHtml(title)}</div>
        <div class="recMeta">${escapeHtml(meta)}</div>
        <div class="recCode">${escapeHtml(codeLine)}</div>
      </div>
      <div class="recActions">
        <button class="iconBtn" title="Copiar" data-act="copy" data-id="${item.id}">⎘</button>
        <button class="iconBtn iconBtnDanger" title="Eliminar" data-act="del" data-id="${item.id}">✕</button>
      </div>
    </div>

    <div class="recTagRow">
      <span class="tag tagBrand">${escapeHtml(brand)}</span>
      <span class="tag ${severityTagClass(sev)}">${escapeHtml(sev)}</span>
      ${item.category ? `<span class="tag">${escapeHtml(item.category)}</span>` : ""}
    </div>

    ${diag ? `<div class="recBody"><b>Diagnóstico:</b> ${escapeHtml(diag)}</div>` : ""}
    ${sol ? `<div class="recBody"><b>Solución:</b> ${escapeHtml(sol)}</div>` : ""}
  `;

  return div;
}

function render(){
  const list = $("list");
  const empty = $("empty");
  list.innerHTML = "";

  const q = safeText($("search").value).toLowerCase();
  const brandFilter = safeText($("filterBrand").value);

  let items = loadHistory();

  // latest first
  items.sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));

  if (brandFilter){
    items = items.filter(x => (x.brand||"") === brandFilter);
  }

  if (q){
    items = items.filter(x => {
      const blob = [
        x.cliente, x.equipo, x.ubicacion, x.codigo,
        x.codeTitle, x.category, x.diagnostico, x.solucion, x.brand
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }

  if (!items.length){
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  for (const it of items){
    list.appendChild(buildRecCard(it));
  }
}

function openModal(html){
  $("modalBody").innerHTML = html;
  $("modal").style.display = "flex";
}
function closeModal(){
  $("modal").style.display = "none";
}

function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ========= Actions ========= */
function saveDiag(){
  const cliente = safeText($("cliente").value);
  const equipo = safeText($("equipo").value);
  const ubicacion = safeText($("ubicacion").value);
  const codigo = safeText($("codigo").value);
  const diagnostico = safeText($("diagnostico").value);
  const solucion = safeText($("solucion").value);

  if (!cliente || !equipo){
    toast("Cliente y Equipo son obligatorios.", false);
    return;
  }

  const brand = detectBrand(equipo);
  let codeInfo = null;

  if (codigo){
    codeInfo = findCode(codigo, brand);
  } else if (lastLookup && lastLookup.code){
    codeInfo = lastLookup;
  }

  const record = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: nowISO(),
    cliente,
    equipo,
    ubicacion,
    codigo: codigo || (codeInfo?.code || ""),
    brand: codeInfo?.brand || brand || "General",
    codeTitle: codeInfo?.title || "",
    category: codeInfo?.category || "",
    severity: codeInfo?.severity || (codeInfo ? "Media" : "Media"),
    diagnostico: diagnostico || (codeInfo ? `Código ${codeInfo.code}: ${codeInfo.title}` : ""),
    solucion: solucion || (codeInfo?.fix || "")
  };

  const items = loadHistory();
  items.push(record);
  saveHistory(items);

  toast("Guardado. KPI: registro añadido ✅");
  clearForm();
  render();
}

function handleListClick(e){
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
    render();
    return;
  }

  if (act === "copy"){
    const it = items[idx];
    const text = [
      `Cliente: ${it.cliente}`,
      `Equipo: ${it.equipo}`,
      `Ubicación: ${it.ubicacion || "-"}`,
      `Fecha: ${fmtDate(it.createdAt)}`,
      `Código: ${it.codigo || "-"} ${it.codeTitle ? "• "+it.codeTitle : ""}`,
      `Diagnóstico: ${it.diagnostico || "-"}`,
      `Solución: ${it.solucion || "-"}`
    ].join("\n");

    navigator.clipboard?.writeText(text);
    toast("Copiado al clipboard.");
  }
}

function lookupCode(){
  const brand = detectBrand(safeText($("equipo").value));
  const q = safeText($("codigo").value);

  if (!q){
    toast("Escribe un código primero.", false);
    return;
  }

  const hit = findCode(q, brand);
  if (!hit){
    lastLookup = null;
    openModal(`<b>No encontrado.</b><br><br>Tip: verifica el código o añade ese código a <code>codes.json</code>.`);
    return;
  }

  lastLookup = hit;

  const html = `
    <div><b>Marca:</b> ${escapeHtml(hit.brand || "General")}</div>
    <div><b>Código:</b> ${escapeHtml(hit.code)}</div>
    <div><b>Definición:</b> ${escapeHtml(hit.title || "")}</div>
    <div><b>Categoría:</b> ${escapeHtml(hit.category || "")}</div>
    <div><b>Severidad:</b> ${escapeHtml(hit.severity || "")}</div>
    <div style="margin-top:10px"><b>Acción sugerida:</b><br>${escapeHtml(hit.fix || "")}</div>
  `;
  openModal(html);
}

function applyLookup(){
  if (!lastLookup) return closeModal();

  // Autollenar diagnóstico/solución si están vacíos
  if (!safeText($("diagnostico").value)){
    $("diagnostico").value = `Código ${lastLookup.code}: ${lastLookup.title}`;
  }
  if (!safeText($("solucion").value) && lastLookup.fix){
    $("solucion").value = lastLookup.fix;
  }
  // Guardar marca/código en el campo si no está
  if (!safeText($("codigo").value)){
    $("codigo").value = lastLookup.code;
  }

  toast("Aplicado al formulario.");
  closeModal();
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
  setTimeout(()=>URL.revokeObjectURL(url), 600);
}

function wipeAll(){
  const ok = confirm("Vas a borrar TODO el historial local. ¿Seguro?");
  if (!ok) return;
  localStorage.removeItem(LS_DIAGS);
  toast("Historial eliminado.");
  render();
}

/* ========= Init ========= */
(async function init(){
  fillToday();
  await loadCodes();
  render();

  $("btnSave").addEventListener("click", saveDiag);
  $("btnClear").addEventListener("click", clearForm);
  $("list").addEventListener("click", handleListClick);

  $("search").addEventListener("input", render);
  $("filterBrand").addEventListener("change", render);

  $("btnLookup").addEventListener("click", lookupCode);
  $("btnCloseModal").addEventListener("click", closeModal);
  $("modal").addEventListener("click", (e)=>{ if (e.target.id==="modal") closeModal(); });
  $("btnApply").addEventListener("click", applyLookup);

  $("btnExport").addEventListener("click", exportJSON);
  $("btnWipe").addEventListener("click", wipeAll);

  $("btnNew").addEventListener("click", ()=> {
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("cliente").focus();
  });
})();
