
// ==================== APP.JS COMPLETO ====================
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwhyrjxqY54qQnm11LPrzYBa7ZSFzrJLjdD2eWDhwEcPuJPLrp0CBes8r1OG_JQK81iEA/exec";

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

// ==================== TOAST ====================
function mostrarToast(msg, tipo = "exito") {
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ==================== STORAGE ====================
function save() {
  localStorage.setItem("trades_v5_pro", JSON.stringify(trades));
  localStorage.setItem("sugerencias_v5", JSON.stringify(sugerencias));
}

// ==================== GUARDAR PAR ====================
function guardarPar() {
  const nombre = get("inputPar").value.trim().toUpperCase();
  if (!nombre) return mostrarToast("Nombre requerido", "error");

  if (!sugerencias.includes(nombre)) sugerencias.push(nombre);

  const ahora = new Date();

  trades.push({
    nombre,
    color: get("colorPar").value,
    archivado: false,
    datos: {
      id_trade: null,
      fecha: ahora.toISOString().split("T")[0],
      hora: ahora.toTimeString().slice(0,5)
    }
  });

  save();
  showHome();
  abrirForm(trades.length - 1);
}

// ==================== ABRIR FORM ====================
function abrirForm(i) {
  currentIdx = i;
  const t = trades[i];

  get("tituloPar").textContent = t.nombre;

  // 🔑 MOSTRAR ID EN EL FORMULARIO
  get("id_trade").value = t.datos.id_trade || "";

  const campos = [
    "fecha","hora","tipo","gatillo","sl","tp","ratio","maxRatio",
    "resultado","duracion","diario","horario","porcentaje",
    "rNegativo","rPositivo"
  ];

  campos.forEach(c => {
    if (get(c)) get(c).value = t.datos[c] || "";
  });
}

// ==================== GUARDAR CAMBIOS ====================
function guardarCambios() {
  if (currentIdx === null) return;
  const t = trades[currentIdx];

  const campos = [
    "fecha","hora","tipo","gatillo","sl","tp","ratio","maxRatio",
    "resultado","duracion","diario","horario","porcentaje",
    "rNegativo","rPositivo"
  ];

  campos.forEach(c => {
    if (get(c)) t.datos[c] = get(c).value;
  });

  save();
}

// ==================== ARCHIVAR PAR (CLAVE DEFINITIVA) ====================
async function archivarPar() {
  guardarCambios();

  const t = trades[currentIdx];
  const d = t.datos;

  const params = new URLSearchParams({
    par: t.nombre,
    fecha: d.fecha,
    hora: d.hora,
    tipo: d.tipo || "",
    gatillo: d.gatillo || "",
    sl: d.sl || "",
    tp: d.tp || "",
    ratio: d.ratio || "",
    maxRatio: d.maxRatio || "",
    resultado: d.resultado || "",
    duracion: d.duracion || "",
    diario: d.diario || "",
    horario: d.horario || "",
    porcentaje: d.porcentaje || "",
    rNegativo: d.rNegativo || "",
    rPositivo: d.rPositivo || ""
  });

  // 🔑 SI EXISTE ID → UPDATE
  if (d.id_trade) params.append("id", d.id_trade);

  const res = await fetch(URL_SHEETS, {
    method: "POST",
    body: params
  });

  const json = await res.json();

  if (json.status === "ok") {
    t.datos.id_trade = json.id_trade;
    get("id_trade").value = json.id_trade; // 🔒 visible
    t.archivado = true;
    save();
    mostrarToast(`Trade guardado · ID ${json.id_trade}`);
  } else {
    mostrarToast("Error al guardar", "error");
  }
}

// ==================== HOME ====================
function showHome() {
  const list = get("listaPares");
  list.innerHTML = "";
  trades.filter(t => !t.archivado).forEach((t,i) => {
    const d = document.createElement("div");
    d.textContent = t.nombre;
    d.onclick = () => abrirForm(i);
    list.appendChild(d);
  });
}

// ==================== GLOBALES ====================
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.guardarCambios = guardarCambios;
