// ==================== CONFIGURACIÓN ====================
// ¡¡¡ACTUALIZA ESTA URL!!!
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwhyrjxqY54qQnm11LPrzYBa7ZSFzrJLjdD2eWDhwEcPuJPLrp0CBes8r1OG_JQK81iEA/exec";

let trades = [];
let sugerencias = [];
let currentIdx = null;

// Cargar datos al iniciar
try {
  trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
  sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
} catch (e) {
  trades = [];
  sugerencias = [];
  console.log("⚠️ Error cargando datos, iniciando vacío");
}

const get = id => document.getElementById(id);

// ==================== FUNCIÓN: GUARDAR LOCALMENTE ====================
function save() {
  try {
    localStorage.setItem("trades_v5_pro", JSON.stringify(trades));
    localStorage.setItem("sugerencias_v5", JSON.stringify(sugerencias));
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
}

// ==================== FUNCIÓN: GUARDAR PAR ====================
function guardarPar() {
  console.group("➕ CREANDO NUEVO PAR");
  
  const inputPar = get("inputPar");
  const colorPar = get("colorPar");
  
  if (!inputPar || !colorPar) {
    console.error("❌ Elementos no encontrados");
    return;
  }

  const nom = inputPar.value.trim().toUpperCase();
  if (!nom) {
    mostrarToast("Ingresa un nombre para el activo", 'error');
    return;
  }
  
  // Agregar a sugerencias si no existe
  if (!sugerencias.includes(nom)) {
    sugerencias.push(nom);
  }

  const ahora = new Date();
  
  // ¡¡¡IMPORTANTE!!! Crear trade con ID TEMPORAL
  // Google Sheets asignará el ID real
  const nuevoTrade = {
    id: 0, // TEMPORAL - Google Sheets lo actualizará
    nombre: nom,
    color: colorPar.value,
    archivado: false,
    archivadoPreviamente: false,
    datos: {
      fecha: ahora.toISOString().split("T")[0],
      hora: ahora.getHours().toString().padStart(2, "0") + ":" +
            ahora.getMinutes().toString().padStart(2, "0"),
      creadoEn: Date.now()
    }
  };

  console.log("Nuevo trade creado:", nuevoTrade);
  
  trades.push(nuevoTrade);
  inputPar.value = "";
  save();
  updateDatalist();
  showHome();
  
  // Abrir para editar
  abrirForm(trades.length - 1);
  
  mostrarToast("✅ Par creado. Completa los datos y archiva.", 'exito');
  console.groupEnd();
}

// ==================== FUNCIÓN: ARCHIVAR PAR ====================
async function archivarPar() {
  console.group("📤 ARCHIVANDO TRADE");
  
  if (currentIdx === null || currentIdx >= trades.length) {
    mostrarToast("No hay trade seleccionado", 'error');
    return;
  }

  const trade = trades[currentIdx];
  
  // Validar datos mínimos
  if (!trade.datos.fecha || !trade.datos.resultado) {
    mostrarToast("Completa Fecha y Resultado antes de archivar", 'error');
    return;
  }

  // Determinar si es actualización
  const esUnaActualizacion = trade.archivadoPreviamente === true;
  
  console.log("Trade a archivar:", trade);
  console.log("¿Es actualización?", esUnaActualizacion);
  console.log("ID actual:", trade.id);

  // Actualizar estado local
  trade.datos.archivedAt = Date.now();
  trade.archivado = true;
  trade.archivadoPreviamente = true;
  
  // GUARDAR PRIMERO localmente
  save();
  
  console.log("Estado actualizado localmente");

  try {
    // Preparar datos para enviar
    const tradeData = {
      // ¡IMPORTANTE! Enviar el ID actual (puede ser 0)
      id: trade.id,
      par: trade.nombre || '',
      fecha: trade.datos.fecha || '',
      hora: trade.datos.hora || '',
      tipo: trade.datos.tipo || '',
      gatillo: trade.datos.gatillo || '',
      sl: trade.datos.sl || '',
      tp: trade.datos.tp || '',
      ratio: trade.datos.ratio || '',
      maxRatio: trade.datos.maxRatio || '',
      resultado: trade.datos.resultado || '',
      duracion: trade.datos.duracion || '',
      diario: trade.datos.diario || '',
      horario: trade.datos.horario || '',
      porcentaje: trade.datos.porcentaje || '',
      rNegativo: trade.datos.rNegativo || '',
      rPositivo: trade.datos.rPositivo || ''
    };
    
    // ¡CRÍTICO! Agregar bandera si es actualización
    if (esUnaActualizacion) {
      tradeData.accion = 'actualizar';
      console.log("🚨 ENVIANDO COMO ACTUALIZACIÓN");
    } else {
      console.log("🚨 ENVIANDO COMO NUEVO");
    }

    // Mostrar en consola qué se envía
    console.log("📤 Datos a enviar a Google Sheets:");
    console.log(JSON.stringify(tradeData, null, 2));

    // Construir URL
    const params = new URLSearchParams();
    Object.keys(tradeData).forEach(key => {
      if (tradeData[key] !== undefined && tradeData[key] !== null) {
        params.append(key, tradeData[key].toString());
      }
    });

    const urlCompleta = `${URL_SHEETS}?${params.toString()}`;
    console.log("URL completa:", urlCompleta.substring(0, 100) + "...");

    // Enviar a Google Sheets
    console.log("Enviando solicitud...");
    
    const response = await fetch(urlCompleta, {
      method: 'POST',
      mode: 'no-cors' // No podemos leer respuesta, pero sí enviar
    });
    
    console.log("✅ Solicitud enviada (no-cors mode)");
    
    // MOSTRAR TOAST según el tipo
    if (esUnaActualizacion) {
      mostrarToast(`✅ Trade #${trade.id} actualizado en Google Sheets`, 'exito');
    } else {
      mostrarToast("✅ Nuevo trade archivado en Google Sheets", 'exito');
    }
    
  } catch (error) {
    console.error("❌ Error enviando a Google Sheets:", error);
    mostrarToast("✅ Trade archivado (solo localmente)", 'exito');
  }
  
  // Volver al home
  volverHome();
  console.groupEnd();
}

// ==================== FUNCIÓN: RESTABLECER ====================
function restablecer(id) {
  console.group("↩ RESTABLECIENDO TRADE");
  console.log("ID a restablecer:", id);
  
  // Buscar el trade
  const idx = trades.findIndex(t => t.id === id);
  console.log("Índice encontrado:", idx);
  
  if (idx === -1) {
    console.error("❌ Trade no encontrado con ID:", id);
    mostrarToast("Trade no encontrado", 'error');
    return;
  }
  
  // Actualizar estado
  trades[idx].archivado = false;
  trades[idx].archivadoPreviamente = true; // ¡IMPORTANTE!
  
  console.log("Trade actualizado:", trades[idx]);
  
  // Guardar
  save();
  
  // Actualizar interfaz
  abrirHistorial();
  mostrarToast(`Trade #${id} restablecido. Edítalo y archiva nuevamente.`, 'exito');
  
  // Abrir para editar
  setTimeout(() => abrirForm(idx), 500);
  
  console.groupEnd();
}

// ==================== FUNCIONES DE INTERFAZ ====================
function mostrarToast(mensaje, tipo = 'exito') {
  const toast = document.createElement('div');
  toast.textContent = mensaje;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: ${tipo === 'error' ? '#ef4444' : '#10b981'}; 
    color: white; padding: 12px 20px; border-radius: 6px; 
    z-index: 1000; font-weight: bold;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

function showHome() {
  const sections = ["home", "operaciones", "historial", "detalle"];
  sections.forEach(id => {
    const el = get(id);
    if (el) el.classList.add("oculto");
  });
  if (get("home")) get("home").classList.remove("oculto");
  
  // Mostrar lista de pares activos
  const list = get("listaPares");
  if (!list) return;
  
  list.innerHTML = "";
  const activos = trades.filter(t => !t.archivado);
  
  if (activos.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No hay pares activos</div>';
    return;
  }
  
  activos.forEach(t => {
    const div = document.createElement("div");
    div.className = "par";
    div.style.cssText = `
      padding: 12px; margin: 8px 0; background: rgba(255,255,255,0.05);
      border-left: 4px solid ${t.color}; border-radius: 6px; cursor: pointer;
    `;
    
    div.innerHTML = `
      <div style="font-weight: bold;">${t.nombre}</div>
      <div style="font-size: 12px; color: #888; margin-top: 4px;">
        ${t.datos.fecha || ''} ${t.datos.hora || ''}
        ${t.datos.resultado ? '| ' + t.datos.resultado : ''}
      </div>
    `;
    
    div.onclick = () => {
      const idx = trades.findIndex(tr => tr.id === t.id);
      if (idx !== -1) abrirForm(idx);
    };
    
    list.appendChild(div);
  });
}

function abrirForm(i) {
  currentIdx = i;
  const t = trades[i];
  if (!t) return;
  
  // Actualizar UI
  const tituloPar = get("tituloPar");
  if (tituloPar) tituloPar.textContent = t.nombre;
  
  const colorAuto = get("colorAuto");
  if (colorAuto) colorAuto.value = t.color || "#f0b90b";
  
  // Llenar campos
  const campos = ["fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", 
                 "maxRatio", "resultado", "duracion", "diario", "horario", 
                 "porcentaje", "rNegativo", "rPositivo"];
  
  campos.forEach(id => {
    const el = get(id);
    if (el && t.datos[id] !== undefined) {
      el.value = t.datos[id] || "";
    }
  });
  
  // Mostrar sección operaciones
  if (get("home")) get("home").classList.add("oculto");
  if (get("operaciones")) get("operaciones").classList.remove("oculto");
}

function abrirHistorial() {
  // Ocultar otras secciones
  ["home", "operaciones", "detalle"].forEach(id => {
    const el = get(id);
    if (el) el.classList.add("oculto");
  });
  
  const historial = get("historial");
  if (historial) historial.classList.remove("oculto");
  
  // Cargar trades archivados
  const cont = get("historialContenido");
  if (!cont) return;
  
  cont.innerHTML = "";
  const archivados = trades.filter(t => t.archivado);
  
  if (archivados.length === 0) {
    cont.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No hay trades archivados</div>';
    return;
  }
  
  archivados.forEach(t => {
    const div = document.createElement("div");
    div.className = "historial-item";
    div.style.cssText = `
      display: flex; align-items: center; padding: 12px; margin: 8px 0;
      background: rgba(255,255,255,0.05); border-radius: 6px;
      border-left: 4px solid ${t.color};
    `;
    
    div.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: bold; display: flex; justify-content: space-between;">
          <span>${t.nombre}</span>
          <span style="color: ${t.datos.resultado?.includes('WIN') ? '#10b981' : 
                               t.datos.resultado?.includes('LOSS') ? '#ef4444' : '#f0b90b'}">
            ${t.datos.resultado || 'S/R'}
          </span>
        </div>
        <div style="font-size: 12px; color: #888; margin-top: 4px;">
          ${t.datos.fecha || ''} | ${t.datos.tipo || ''} | ID: ${t.id || '?'}
        </div>
      </div>
      <button onclick="restablecer(${t.id})" style="
        background: transparent; color: #f0b90b; font-size: 20px;
        border: none; padding: 8px; cursor: pointer; margin-left: 10px;
      ">↩</button>
    `;
    
    cont.appendChild(div);
  });
}

function volverHome() {
  currentIdx = null;
  showHome();
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ app.js cargado");
  console.log("Trades en localStorage:", trades.length);
  console.log("URL_SHEETS:", URL_SHEETS);
  
  // Configurar eventos
  const sl = get("sl");
  const tp = get("tp");
  if (sl && tp) {
    const calcular = () => {
      const slVal = parseFloat(sl.value);
      const tpVal = parseFloat(tp.value);
      if (slVal > 0 && tpVal > 0) {
        const ratio = (tpVal / slVal).toFixed(2);
        const ratioEl = get("ratio");
        if (ratioEl) ratioEl.value = ratio;
      }
    };
    sl.addEventListener("input", calcular);
    tp.addEventListener("input", calcular);
  }
  
  // Mostrar home
  showHome();
});

// ==================== FUNCIONES GLOBALES ====================
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.volverHome = volverHome;
window.abrirHistorial = abrirHistorial;
window.restablecer = restablecer;
window.limpiarFiltros = function() {
  const filtro = get("filtroNombre");
  if (filtro) filtro.value = "";
  abrirHistorial();
};
