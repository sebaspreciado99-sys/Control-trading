// ==================== CONFIGURACIÓN INICIAL ====================
// ¡ACTUALIZA ESTA URL CON LA TUYA!
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwhyrjxqY54qQnm11LPrzYBa7ZSFzrJLjdD2eWDhwEcPuJPLrp0CBes8r1OG_JQK81iEA/exec";

// Sistema de trades - Versión simplificada
let trades = [];
let sugerencias = [];
let currentTradeIndex = null; // Índice del trade actualmente abierto

// Cargar datos al iniciar
try {
  const savedTrades = localStorage.getItem("trading_trades");
  const savedSugerencias = localStorage.getItem("trading_sugerencias");
  
  if (savedTrades) {
    trades = JSON.parse(savedTrades);
    console.log(`✅ Cargados ${trades.length} trades`);
  }
  
  if (savedSugerencias) {
    sugerencias = JSON.parse(savedSugerencias);
  }
} catch (e) {
  console.error("Error cargando datos:", e);
  trades = [];
  sugerencias = [];
}

// ==================== FUNCIONES BÁSICAS ====================
function $(id) { return document.getElementById(id); }
function saveToLocal() {
  localStorage.setItem("trading_trades", JSON.stringify(trades));
  localStorage.setItem("trading_sugerencias", JSON.stringify(sugerencias));
}

function mostrarMensaje(texto, esError = false) {
  const mensaje = document.createElement('div');
  mensaje.textContent = texto;
  mensaje.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${esError ? '#ef4444' : '#10b981'};
    color: white; padding: 12px 20px; border-radius: 6px;
    z-index: 10000; font-weight: bold; animation: fadeIn 0.3s;
  `;
  document.body.appendChild(mensaje);
  setTimeout(() => mensaje.remove(), 3000);
}

// ==================== SISTEMA DE IDs MANUAL ====================
function obtenerSiguienteID() {
  if (trades.length === 0) return 1;
  
  // Buscar el máximo ID actual
  const ids = trades.map(t => t.id).filter(id => id && id > 0);
  if (ids.length === 0) return 1;
  
  const maxId = Math.max(...ids);
  return maxId + 1;
}

// ==================== FUNCIÓN: CREAR NUEVO PAR ====================
function crearNuevoPar() {
  console.group("➕ CREANDO NUEVO PAR");
  
  const inputPar = $("inputPar");
  const colorPar = $("colorPar");
  
  if (!inputPar || !colorPar) {
    console.error("Elementos no encontrados");
    return;
  }

  const nombrePar = inputPar.value.trim().toUpperCase();
  if (!nombrePar) {
    mostrarMensaje("Ingresa un nombre para el activo", true);
    return;
  }
  
  // Agregar a sugerencias
  if (!sugerencias.includes(nombrePar)) {
    sugerencias.push(nombrePar);
  }

  // Generar ID MANUALMENTE (1, 2, 3...)
  const nuevoID = obtenerSiguienteID();
  
  const ahora = new Date();
  
  // Crear el trade con ID DEFINITIVO
  const nuevoTrade = {
    id: nuevoID, // ¡ID DEFINITIVO desde el inicio!
    nombre: nombrePar,
    color: colorPar.value || "#f0b90b",
    archivado: false,
    datos: {
      fecha: ahora.toISOString().split("T")[0],
      hora: ahora.getHours().toString().padStart(2, "0") + ":" +
            ahora.getMinutes().toString().padStart(2, "0"),
      creadoEn: Date.now()
    }
  };

  console.log("Nuevo trade creado:", nuevoTrade);
  console.log("ID asignado:", nuevoID);
  
  // Agregar a la lista
  trades.push(nuevoTrade);
  
  // Limpiar y actualizar
  inputPar.value = "";
  saveToLocal();
  actualizarSugerencias();
  mostrarHome();
  
  // Abrir este trade para editarlo
  abrirTradeParaEditar(trades.length - 1);
  
  mostrarMensaje(`✅ Par "${nombrePar}" creado (ID: ${nuevoID})`);
  console.groupEnd();
}

// ==================== FUNCIÓN: ABRIR TRADE PARA EDITAR ====================
function abrirTradeParaEditar(indice) {
  console.group("📝 ABRIENDO TRADE PARA EDITAR");
  
  if (indice < 0 || indice >= trades.length) {
    console.error("Índice inválido:", indice);
    return;
  }
  
  const trade = trades[indice];
  console.log("Trade a abrir:", trade);
  console.log("ID del trade:", trade.id);
  console.log("Nombre del trade:", trade.nombre);
  
  // Guardar índice actual
  currentTradeIndex = indice;
  
  // Actualizar título
  const titulo = $("tituloPar");
  if (titulo) {
    titulo.textContent = trade.nombre;
    console.log("Título actualizado a:", trade.nombre);
  }
  
  // Actualizar color
  const colorInput = $("colorAuto");
  if (colorInput) {
    colorInput.value = trade.color || "#f0b90b";
  }
  
  // Llenar TODOS los campos del formulario
  const campos = [
    "fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", "maxRatio",
    "resultado", "duracion", "diario", "horario", "porcentaje",
    "rNegativo", "rPositivo"
  ];
  
  campos.forEach(campoId => {
    const campo = $(campoId);
    if (campo) {
      // Usar valor del trade o vacío
      const valor = trade.datos[campoId];
      campo.value = valor !== undefined ? valor : "";
      
      if (campoId === "fecha" && !valor) {
        // Fecha por defecto si está vacía
        campo.value = new Date().toISOString().split("T")[0];
      }
    }
  });
  
  // Calcular ratio automáticamente
  calcularRatioAuto();
  
  // Mostrar sección de operaciones
  const home = $("home");
  const operaciones = $("operaciones");
  
  if (home) home.classList.add("oculto");
  if (operaciones) operaciones.classList.remove("oculto");
  
  // Ocultar botón de historial
  const btnHistorial = $("btnHistorial");
  if (btnHistorial) btnHistorial.style.display = "none";
  
  console.log("✅ Trade abierto correctamente");
  console.groupEnd();
}

// ==================== FUNCIÓN: GUARDAR CAMBIOS LOCALES ====================
function guardarCambiosLocales() {
  if (currentTradeIndex === null || currentTradeIndex >= trades.length) {
    return;
  }
  
  const trade = trades[currentTradeIndex];
  console.log("💾 Guardando cambios para trade ID:", trade.id);
  
  const campos = [
    "fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", "maxRatio",
    "resultado", "duracion", "diario", "horario", "porcentaje",
    "rNegativo", "rPositivo", "colorAuto"
  ];
  
  campos.forEach(campoId => {
    const campo = $(campoId);
    if (campo) {
      if (campoId === "colorAuto") {
        trade.color = campo.value;
      } else {
        trade.datos[campoId] = campo.value;
      }
    }
  });
  
  saveToLocal();
}

// ==================== FUNCIÓN: ARCHIVAR TRADE ====================
async function archivarTrade() {
  console.group("📤 ARCHIVANDO TRADE");
  
  if (currentTradeIndex === null) {
    mostrarMensaje("No hay trade seleccionado", true);
    return;
  }
  
  const trade = trades[currentTradeIndex];
  console.log("Trade a archivar:", trade);
  
  // Validar datos mínimos
  if (!trade.datos.fecha || !trade.datos.resultado) {
    mostrarMensaje("Completa Fecha y Resultado antes de archivar", true);
    return;
  }
  
  // Guardar cambios locales primero
  guardarCambiosLocales();
  
  // Determinar si es restablecimiento (ya fue archivado antes)
  const esRestablecimiento = trade.archivado === true;
  
  // Actualizar estado local
  trade.archivado = true;
  trade.datos.archivedAt = Date.now();
  
  // Guardar localmente
  saveToLocal();
  console.log("Estado actualizado localmente");
  
  try {
    // Preparar datos para Google Sheets
    const datosParaEnviar = {
      id: trade.id, // ¡ID CORRECTO!
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
    
    // ¡IMPORTANTE! Agregar acción si es restablecimiento
    if (esRestablecimiento) {
      datosParaEnviar.accion = 'actualizar';
      console.log("🚨 ENVIANDO COMO RESTABLECIMIENTO (accion: 'actualizar')");
    } else {
      console.log("🚨 ENVIANDO COMO NUEVO TRADE");
    }
    
    // Mostrar en consola
    console.log("📤 Enviando a Google Sheets:", datosParaEnviar);
    
    // Construir URL
    const params = new URLSearchParams();
    Object.keys(datosParaEnviar).forEach(key => {
      if (datosParaEnviar[key] !== undefined && datosParaEnviar[key] !== null) {
        params.append(key, datosParaEnviar[key].toString());
      }
    });
    
    const urlCompleta = `${URL_SHEETS}?${params.toString()}`;
    console.log("URL:", urlCompleta.substring(0, 80) + "...");
    
    // Enviar
    await fetch(urlCompleta, { method: 'POST', mode: 'no-cors' });
    
    console.log("✅ Datos enviados a Google Sheets");
    
    // Mensaje de éxito
    if (esRestablecimiento) {
      mostrarMensaje(`✅ Trade #${trade.id} actualizado en Google Sheets`);
    } else {
      mostrarMensaje(`✅ Trade #${trade.id} archivado en Google Sheets`);
    }
    
  } catch (error) {
    console.error("❌ Error enviando a Google Sheets:", error);
    mostrarMensaje("✅ Trade archivado (solo localmente)");
  }
  
  // Volver al inicio
  mostrarHome();
  console.groupEnd();
}

// ==================== FUNCIÓN: RESTABLECER TRADE ====================
function restablecerTrade(id) {
  console.group("↩ RESTABLECIENDO TRADE");
  console.log("ID a restablecer:", id);
  
  // Buscar el trade por ID
  const indice = trades.findIndex(t => t.id === id);
  console.log("Índice encontrado:", indice);
  
  if (indice === -1) {
    console.error("❌ Trade no encontrado con ID:", id);
    mostrarMensaje("Trade no encontrado", true);
    return;
  }
  
  // Restablecer (des-archivar)
  trades[indice].archivado = false;
  
  // Guardar
  saveToLocal();
  console.log("✅ Trade restablecido localmente");
  
  // Actualizar interfaz
  mostrarHistorial();
  mostrarMensaje(`✅ Trade #${id} restablecido`);
  
  // Abrir para editar
  setTimeout(() => abrirTradeParaEditar(indice), 300);
  
  console.groupEnd();
}

// ==================== INTERFAZ DE USUARIO ====================
function mostrarHome() {
  currentTradeIndex = null;
  
  // Ocultar todas las secciones
  ["operaciones", "historial", "detalle"].forEach(seccion => {
    const el = $(seccion);
    if (el) el.classList.add("oculto");
  });
  
  // Mostrar home
  const home = $("home");
  if (home) {
    home.classList.remove("oculto");
  }
  
  // Mostrar botón de historial
  const btnHistorial = $("btnHistorial");
  if (btnHistorial) {
    btnHistorial.style.display = "flex";
  }
  
  // Cargar lista de pares activos
  cargarListaParesActivos();
}

function cargarListaParesActivos() {
  const lista = $("listaPares");
  if (!lista) return;
  
  const activos = trades.filter(t => !t.archivado);
  
  lista.innerHTML = "";
  
  if (activos.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center; padding:30px; color:#888;">
        No hay pares activos.<br>
        Crea uno nuevo arriba.
      </div>
    `;
    return;
  }
  
  activos.forEach((trade, index) => {
    const elemento = document.createElement("div");
    elemento.className = "par-item";
    elemento.style.cssText = `
      padding: 12px 16px; margin: 8px 0; cursor: pointer;
      background: rgba(255,255,255,0.05); border-radius: 8px;
      border-left: 4px solid ${trade.color || "#f0b90b"};
      transition: background 0.2s;
    `;
    
    elemento.onmouseover = () => elemento.style.background = "rgba(255,255,255,0.1)";
    elemento.onmouseout = () => elemento.style.background = "rgba(255,255,255,0.05)";
    
    // Información del trade
    elemento.innerHTML = `
      <div style="font-weight: bold; font-size: 1.1rem;">${trade.nombre}</div>
      <div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">
        ${trade.datos.fecha || ''} ${trade.datos.hora || ''}
        ${trade.datos.resultado ? '| ' + trade.datos.resultado : ''}
      </div>
      <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">
        ID: ${trade.id}
      </div>
    `;
    
    // Al hacer clic, abrir este trade
    elemento.onclick = () => {
      console.log("Clic en trade:", trade.nombre, "ID:", trade.id, "Índice:", index);
      abrirTradeParaEditar(index);
    };
    
    lista.appendChild(elemento);
  });
}

function mostrarHistorial() {
  // Ocultar otras secciones
  ["home", "operaciones", "detalle"].forEach(seccion => {
    const el = $(seccion);
    if (el) el.classList.add("oculto");
  });
  
  // Mostrar historial
  const historial = $("historial");
  if (historial) {
    historial.classList.remove("oculto");
  }
  
  // Ocultar botón de historial
  const btnHistorial = $("btnHistorial");
  if (btnHistorial) {
    btnHistorial.style.display = "none";
  }
  
  // Cargar trades archivados
  cargarListaTradesArchivados();
}

function cargarListaTradesArchivados() {
  const contenedor = $("historialContenido");
  if (!contenedor) return;
  
  const archivados = trades.filter(t => t.archivado);
  
  contenedor.innerHTML = "";
  
  if (archivados.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center; padding:30px; color:#888;">
        No hay trades archivados.
      </div>
    `;
    return;
  }
  
  // Ordenar por fecha de archivado (más reciente primero)
  archivados.sort((a, b) => (b.datos.archivedAt || 0) - (a.datos.archivedAt || 0));
  
  archivados.forEach(trade => {
    const elemento = document.createElement("div");
    elemento.className = "historial-item";
    elemento.style.cssText = `
      display: flex; align-items: center; padding: 12px 16px; margin: 8px 0;
      background: rgba(255,255,255,0.05); border-radius: 8px;
      border-left: 4px solid ${trade.color || "#f0b90b"};
    `;
    
    // Información
    elemento.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold;">${trade.nombre}</span>
          <span style="
            background: ${trade.datos.resultado?.includes('WIN') ? '#10b98122' : 
                         trade.datos.resultado?.includes('LOSS') ? '#ef444422' : '#f0b90b22'};
            color: ${trade.datos.resultado?.includes('WIN') ? '#10b981' : 
                    trade.datos.resultado?.includes('LOSS') ? '#ef4444' : '#f0b90b'};
            padding: 2px 8px; border-radius: 12px; font-size: 0.85rem;
          ">
            ${trade.datos.resultado || 'S/R'}
          </span>
        </div>
        <div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">
          ${trade.datos.fecha || ''} | ${trade.datos.tipo || ''} | Ratio: ${trade.datos.ratio || '--'}
        </div>
        <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">
          ID: ${trade.id}
        </div>
      </div>
      <button onclick="restablecerTrade(${trade.id})" style="
        background: transparent; color: #f0b90b; font-size: 1.2rem;
        border: none; padding: 8px 12px; cursor: pointer; margin-left: 10px;
        border-radius: 6px; transition: background 0.2s;
      " title="Restablecer este trade">↩</button>
    `;
    
    // Efecto hover en botón
    const boton = elemento.querySelector("button");
    if (boton) {
      boton.onmouseover = () => boton.style.background = "rgba(240, 185, 11, 0.1)";
      boton.onmouseout = () => boton.style.background = "transparent";
    }
    
    contenedor.appendChild(elemento);
  });
}

// ==================== FUNCIONES UTILITARIAS ====================
function calcularRatioAuto() {
  const sl = parseFloat($("sl")?.value || 0);
  const tp = parseFloat($("tp")?.value || 0);
  
  if (sl > 0 && tp > 0) {
    const ratio = (tp / sl).toFixed(2);
    const ratioInput = $("ratio");
    if (ratioInput) ratioInput.value = ratio;
    
    // Guardar automáticamente
    guardarCambiosLocales();
  }
}

function actualizarSugerencias() {
  const datalist = $("misPares");
  if (!datalist) return;
  
  datalist.innerHTML = "";
  sugerencias.forEach(s => {
    const option = document.createElement("option");
    option.value = s;
    datalist.appendChild(option);
  });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Sistema de Trading iniciado");
  console.log("Trades cargados:", trades.length);
  console.log("URL de Google Sheets:", URL_SHEETS);
  
  // Configurar eventos
  const slInput = $("sl");
  const tpInput = $("tp");
  
  if (slInput && tpInput) {
    slInput.addEventListener("input", calcularRatioAuto);
    tpInput.addEventListener("input", calcularRatioAuto);
  }
  
  // Configurar autoguardado cada 5 segundos
  setInterval(() => {
    if (currentTradeIndex !== null) {
      guardarCambiosLocales();
    }
  }, 5000);
  
  // Inicializar interfaz
  actualizarSugerencias();
  mostrarHome();
});

// ==================== FUNCIONES GLOBALES ====================
window.crearNuevoPar = crearNuevoPar;
window.archivarTrade = archivarTrade;
window.mostrarHome = mostrarHome;
window.mostrarHistorial = mostrarHistorial;
window.restablecerTrade = restablecerTrade;
