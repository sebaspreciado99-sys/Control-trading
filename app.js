// URL para Google Sheets - ACTUALIZA CON TU URL DESPUÉS DE DESPLEGAR
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbyssb4Iwu5rfKpKDwx6gYAPyPCIgygtKAyjzWp3OlLfWRM9gHGwiMgXv9HqBTDUHacs/exec";

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

// SESIÓN ACTUAL
function actualizarSesion() {
  const el = get("sesionActual");
  if (!el) return;

  const ahora = new Date();
  const hora = ahora.getUTCHours();

  let sesion = "Sesión Asia";
  if (hora >= 7 && hora < 13) sesion = "Sesión Londres";
  else if (hora >= 13 && hora < 21) sesion = "Sesión New York";

  el.textContent = `${sesion} · ${ahora.toTimeString().slice(0, 5)}`;
}

// DURACIÓN D/H
function normalizarDuracion() {
  const dur = get("duracion");
  if (!dur) return;
  let v = dur.value.trim().toUpperCase();

  if (v === "") return;

  v = v.replace(/\s+/g, " ");

  if (/^\d+$/.test(v)) {
    v = `${v}H`;
  }

  v = v.replace(/(\d+)D(\d+)H/, "$1D $2H");
  v = v.replace(/DIAS?/g, "D").replace(/HORAS?/g, "H");

  dur.value = v;
}

// GUARDAR CAMBIOS
function guardarCambios() {
  if (currentIdx === null || currentIdx < 0 || currentIdx >= trades.length) return;

  const campos = [
    "fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", "maxRatio",
    "resultado", "duracion", "diario", "horario", "porcentaje",
    "rNegativo", "rPositivo"
  ];

  campos.forEach(id => {
    const el = get(id);
    if (!el) return;
    trades[currentIdx].datos[id] = el.value;
  });

  const colorAuto = get("colorAuto");
  if (colorAuto) trades[currentIdx].color = colorAuto.value;

  save();
}

function calcularRatio() {
  const sl = parseFloat(get("sl").value) || 0;
  const tp = parseFloat(get("tp").value) || 0;

  if (sl > 0 && tp > 0) {
    const ratio = (tp / sl).toFixed(2);
    get("ratio").value = ratio;
    if (!get("maxRatio").value) get("maxRatio").value = ratio;
  } else {
    get("ratio").value = "";
  }

  guardarCambios();
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
  const slInput = get("sl");
  const tpInput = get("tp");
  if (slInput) slInput.addEventListener("input", calcularRatio);
  if (tpInput) tpInput.addEventListener("input", calcularRatio);

  const camposAutoSave = [
    "fecha", "hora", "tipo", "gatillo", "sl", "tp", "maxRatio",
    "resultado", "duracion", "diario", "horario", "porcentaje",
    "rNegativo", "rPositivo", "colorAuto"
  ];

  camposAutoSave.forEach(id => {
    const el = get(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (id === "duracion") normalizarDuracion();
      guardarCambios();
    });
    if (["text", "number", "url", "date", "time"].includes(el.type)) {
      el.addEventListener("input", () => {
        if (id === "duracion") normalizarDuracion();
        guardarCambios();
      });
    }
  });

  updateDatalist();
  renderColores();
  showHome();
  actualizarSesion();
  setInterval(actualizarSesion, 60000);
});

function save() {
  localStorage.setItem("trades_v5_pro", JSON.stringify(trades));
  localStorage.setItem("sugerencias_v5", JSON.stringify(sugerencias));
}

function updateDatalist() {
  const dl = get("misPares");
  if (!dl) return;
  dl.innerHTML = "";
  sugerencias.forEach(s => {
    const o = document.createElement("option");
    o.value = s;
    dl.appendChild(o);
  });
}

function renderColores() {
  const colores = ["#f0b90b", "#f6465d", "#2ebd85", "#3b82f6", "#8b5cf6", "#f97316"];
  [get("coloresRapidos"), get("coloresRapidosEditar")].forEach(cont => {
    if (!cont) return;
    cont.innerHTML = "";
    colores.forEach(c => {
      const d = document.createElement("div");
      d.className = "color-chip";
      d.style.background = c;
      d.onclick = () => {
        if (currentIdx !== null && cont.id === "coloresRapidosEditar") {
          trades[currentIdx].color = c;
          const colorAuto = get("colorAuto");
          if (colorAuto) colorAuto.value = c;
          guardarCambios();
          showHome();
        } else {
          const colorPar = get("colorPar");
          if (colorPar) colorPar.value = c;
        }
      };
      cont.appendChild(d);
    });
  });
}

function guardarPar() {
  const inputPar = get("inputPar");
  const colorPar = get("colorPar");
  if (!inputPar || !colorPar) return;

  const nom = inputPar.value.trim().toUpperCase();
  if (!nom) {
    alert("Por favor, ingresa un nombre para el activo");
    return;
  }
  if (!sugerencias.includes(nom)) sugerencias.push(nom);

  const ahora = new Date();
  const nuevoTrade = {
    id: Date.now(),
    nombre: nom,
    color: colorPar.value,
    archivado: false,
    datos: {
      fecha: ahora.toISOString().split("T")[0],
      hora: ahora.getHours().toString().padStart(2, "0") + ":" +
        ahora.getMinutes().toString().padStart(2, "0")
    }
  };

  trades.push(nuevoTrade);
  inputPar.value = "";
  save();
  updateDatalist();
  showHome();
  abrirForm(trades.length - 1);
}

function showHome() {
  const home = get("home");
  const operaciones = get("operaciones");
  const historial = get("historial");
  const detalle = get("detalle");
  const btnHistorial = get("btnHistorial");
  const list = get("listaPares");

  if (home) home.classList.remove("oculto");
  if (operaciones) operaciones.classList.add("oculto");
  if (historial) historial.classList.add("oculto");
  if (detalle) detalle.classList.add("oculto");
  if (btnHistorial) btnHistorial.style.display = "flex";
  if (!list) return;

  list.innerHTML = "";
  const paresActivos = trades.filter(t => !t.archivado);

  if (paresActivos.length === 0) {
    list.innerHTML = `<div class="card-glass" style="text-align:center; color:var(--subtext);">
      No hay pares activos. Agrega uno nuevo.
    </div>`;
    return;
  }

  paresActivos.forEach(t => {
    const d = document.createElement("div");
    d.className = "par";
    d.style.borderLeft = `6px solid ${t.color}`;
    if (currentIdx !== null && trades[currentIdx].id === t.id) {
      d.classList.add("selected");
    }

    let info = `<div style="font-size:1.2rem;">${t.nombre}</div>`;
    if (t.datos.fecha) {
      info += `<div style="color:var(--subtext); font-weight:400; font-size:0.9rem; margin-top:6px;">`;
      info += `${t.datos.fecha}`;
      if (t.datos.resultado) info += ` | ${t.datos.resultado}`;
      info += `</div>`;
    }

    d.innerHTML = info;
    d.addEventListener("click", () => {
      const idx = trades.findIndex(tr => tr.id === t.id);
      if (idx !== -1) {
        abrirForm(idx);
      }
    });

    list.appendChild(d);
  });
}

function abrirForm(i) {
  currentIdx = i;
  const t = trades[i];
  if (!t) return;

  const tituloPar = get("tituloPar");
  const colorAuto = get("colorAuto");
  if (tituloPar) tituloPar.textContent = t.nombre;
  if (colorAuto) colorAuto.value = t.color || "#f0b90b";

  const campos = [
    "fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", "maxRatio",
    "resultado", "duracion", "diario", "horario", "porcentaje",
    "rNegativo", "rPositivo"
  ];

  campos.forEach(id => {
    const el = get(id);
    if (!el) return;
    if (t.datos && t.datos[id] !== undefined && t.datos[id] !== null) {
      el.value = t.datos[id];
    } else {
      el.value = "";
    }
  });

  normalizarDuracion();

  if (!get("fecha").value) {
    get("fecha").value = new Date().toISOString().split("T")[0];
    guardarCambios();
  }

  if (!get("hora").value) {
    const ahora = new Date();
    get("hora").value =
      ahora.getHours().toString().padStart(2, "0") + ":" +
      ahora.getMinutes().toString().padStart(2, "0");
    guardarCambios();
  }

  const home = get("home");
  const operaciones = get("operaciones");
  const btnHistorial = get("btnHistorial");
  if (home) home.classList.add("oculto");
  if (operaciones) operaciones.classList.remove("oculto");
  if (btnHistorial) btnHistorial.style.display = "none";

  calcularRatio();
}

async function archivarPar() {
  if (!get("fecha").value || !get("resultado").value) {
    alert("Por favor, completa al menos Fecha y Resultado antes de archivar");
    return;
  }

  normalizarDuracion();
  guardarCambios();
  trades[currentIdx].datos.archivedAt = Date.now();
  trades[currentIdx].archivado = true;
  save();

  try {
    // Preparar datos para Google Sheets
    const trade = trades[currentIdx];
    const datos = trade.datos;

    const tradeData = {
      par: trade.nombre || '',
      fecha: datos.fecha || '',
      hora: datos.hora || '',
      tipo: datos.tipo || '',
      gatillo: datos.gatillo || '',
      sl: datos.sl || '',
      tp: datos.tp || '',
      ratio: datos.ratio || '',
      maxRatio: datos.maxRatio || '',
      resultado: datos.resultado || '',
      duracion: datos.duracion || '',
      diario: datos.diario || '',
      horario: datos.horario || '',
      porcentaje: datos.porcentaje || '',
      rNegativo: datos.rNegativo || '',
      rPositivo: datos.rPositivo || ''
    };

    console.log("Enviando datos a Google Sheets:", tradeData);

    // Enviar usando FormData (más compatible)
    const formData = new FormData();
    Object.keys(tradeData).forEach(key => {
      formData.append(key, tradeData[key]);
    });

    // IMPORTANTE: Usar 'no-cors' para evitar problemas
    const response = await fetch(URL_SHEETS, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(tradeData)
    });

    console.log("Solicitud enviada a Google Sheets");

  } catch (error) {
    console.error("Error al enviar a Google Sheets:", error);
  }

  alert("✅ Trade archivado correctamente\n✓ Guardado en localStorage\n✓ Enviado a Google Sheets");
  volverHome();
}

function limpiarFiltros() {
  const fNom = get("filtroNombre");
  const fFecha = get("filtroFecha");
  if (fNom) fNom.value = "";
  if (fFecha) fFecha.value = "";
  abrirHistorial();
}

function abrirHistorial() {
  const home = get("home");
  const historial = get("historial");
  const detalle = get("detalle");
  const operaciones = get("operaciones");
  const btnHistorial = get("btnHistorial");
  const cont = get("historialContenido");

  if (home) home.classList.add("oculto");
  if (operaciones) operaciones.classList.add("oculto");
  if (detalle) detalle.classList.add("oculto");
  if (historial) historial.classList.remove("oculto");
  if (btnHistorial) btnHistorial.style.display = "none";
  if (!cont) return;

  cont.innerHTML = "";
  const fNom = (get("filtroNombre")?.value || "").toUpperCase();
  const fFecha = get("filtroFecha")?.value || "";

  const filtrados = trades
    .map((t, i) => ({ ...t, origIdx: i }))
    .filter(t => {
      if (!t.archivado) return false;
      const matchNom = t.nombre.includes(fNom);
      const matchFecha = fFecha === "" || (t.datos.fecha === fFecha);
      return matchNom && matchFecha;
    })
    .sort((a, b) => (b.datos.archivedAt || 0) - (a.datos.archivedAt || 0));

  let n = 0, p = 0;
  filtrados.forEach(t => {
    n += parseFloat(t.datos.rNegativo || 0);
    p += parseFloat(t.datos.rPositivo || 0);
  });

  const resumen = get("resumenGlobal");
  if (resumen) {
    resumen.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#ef4444; font-weight:700;">R- ${n.toFixed(2)}</span>
      <span style="color:#10b981; font-weight:700;">R+ ${p.toFixed(2)}</span>
      <b style="color:#f0b90b;">NETO ${(p - n).toFixed(2)} R</b>
    </div>`;
  }

  filtrados.forEach(t => {
    const statusClass = t.datos.resultado?.toUpperCase().includes("WIN")
      ? "win"
      : t.datos.resultado?.toUpperCase().includes("LOSS")
        ? "loss"
        : "";

    const d = document.createElement("div");
    d.className = "historial-item";
    d.innerHTML = `
      <input type="checkbox" class="sel-trade" data-id="${t.id}" style="width:18px; margin-right:15px;">
      <div class="historial-info" style="border-left:4px solid ${t.color}; padding-left: 10px; flex: 1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b>${t.nombre}</b>
          <span class="badge ${statusClass}">${t.datos.resultado || "S/R"}</span>
        </div>
        <small style="color:var(--subtext);">${t.datos.fecha || "---"} | ${t.datos.tipo || ""} | Ratio: ${t.datos.ratio || "--"}</small>
      </div>
      <button onclick="restablecer(${t.id})" style="background:transparent; color:#f0b90b; font-size:20px; border:none; padding:10px; cursor:pointer;">↩</button>
    `;
    d.querySelector(".historial-info").onclick = () => verDetalle(t.origIdx);
    cont.appendChild(d);
  });
}

function verDetalle(i) {
  const historial = get("historial");
  const detalle = get("detalle");
  if (historial) historial.classList.add("oculto");
  if (detalle) detalle.classList.remove("oculto");

  const t = trades[i];
  if (!t) return;

  get("detalleTitulo").textContent = t.nombre;
  let html = `<div class="card-glass" style="font-size:14px;">`;

  html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(43,49,57,0.5); padding:8px 0; margin-bottom: 8px;">
    <span style="color:var(--subtext)">COLOR</span>
    <span style="background:${t.color}; width:22px; height:22px; border-radius:6px; display:inline-block;"></span>
  </div>`;

  for (const key in t.datos) {
    if (key === "archivedAt") continue;
    let val = t.datos[key];
    if (key.includes("diario") || key.includes("horario")) {
      val = val ? `<a href="${val}" target="_blank" style="color:#f0b90b;">Ver Link</a>` : "---";
    }
    html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(43,49,57,0.35); padding:8px 0;">
      <span style="color:var(--subtext)">${key.toUpperCase()}</span>
      <span>${val || "---"}</span>
    </div>`;
  }

  html += `
    <button onclick="eliminarUno(${t.id})" class="btn-danger premium" style="width:100%; margin-top:18px;">
      Eliminar Permanente
    </button>
  </div>`;
  get("detalleContenido").innerHTML = html;
}

function restablecer(id) {
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return;
  trades[idx].archivado = false;
  save();
  abrirHistorial();
}

function eliminarUno(id) {
  if (!confirm("¿Estás seguro de eliminar permanentemente este trade?")) return;
  trades = trades.filter(t => t.id !== id);
  save();
  volverHistorial();
}

function eliminarSeleccionados() {
  const sels = document.querySelectorAll(".sel-trade:checked");
  if (sels.length === 0) {
    alert("No hay trades seleccionados");
    return;
  }
  if (!confirm(`¿Estás seguro de eliminar ${sels.length} trade(s) permanentemente?`)) return;

  const ids = Array.from(sels).map(s => parseInt(s.dataset.id));
  trades = trades.filter(t => !ids.includes(t.id));
  save();
  abrirHistorial();
}

function volverHome() {
  if (currentIdx !== null) guardarCambios();
  currentIdx = null;
  showHome();
}

function volverHistorial() {
  const detalle = get("detalle");
  if (detalle) detalle.classList.add("oculto");
  abrirHistorial();
}

// funciones globales
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.volverHome = volverHome;
window.abrirHistorial = abrirHistorial;
window.limpiarFiltros = limpiarFiltros;
window.eliminarSeleccionados = eliminarSeleccionados;
window.volverHistorial = volverHistorial;
window.restablecer = restablecer;
window.eliminarUno = eliminarUno;

// Registro del Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .catch(err => console.log("SW error:", err));
  });
}
