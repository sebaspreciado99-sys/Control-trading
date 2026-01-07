// ==================== APP.JS COMPLETO (CON PWA Y GOOGLE SHEETS FUNCIONAL) ====================
// ⚠️ ¡NO CAMBIAR ESTA URL! Es la conexión a tu Google Apps Script
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwhyrjxqY54qQnm11LPrzYBa7ZSFzrJLjdD2eWDhwEcPuJPLrp0CBes8r1OG_JQK81iEA/exec";

// URL base para la PWA en GitHub Pages
const APP_BASE_URL = 'https://sebaspreciado99-sys.github.io/Control-trading/';

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

// ==================== FUNCIÓN: VERIFICAR ID DUPLICADO ====================
function verificarIdDuplicado(idABuscar) {
    if (!idABuscar || idABuscar.trim() === "") return false;
    
    const idNum = parseInt(idABuscar);
    if (isNaN(idNum)) return false;
    
    return trades.some(trade => {
        const tradeId = trade.datos.id_trade;
        return tradeId && !isNaN(tradeId) && parseInt(tradeId) === idNum;
    });
}

// ==================== FUNCIÓN: TOAST ====================
function mostrarToast(mensaje, tipo = 'exito') {
    const toastExistente = document.getElementById('appToast');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.id = 'appToast';
    toast.textContent = mensaje;
    toast.className = tipo === 'error' ? 'error' : '';
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================== FUNCIÓN: EXPORTAR BACKUP ====================
function exportarBackup() {
    try {
        const datos = {
            fechaBackup: new Date().toISOString(),
            versionApp: 'trading_v5_pro',
            trades: trades,
            sugerencias: sugerencias
        };

        const datosStr = JSON.stringify(datos, null, 2);
        const blob = new Blob([datosStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_trading_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        mostrarToast('📁 Backup exportado correctamente', 'exito');
    } catch (error) {
        console.error('Error exportando backup:', error);
        mostrarToast('❌ Error al exportar backup', 'error');
    }
}

// ==================== FUNCIÓN: DETECTAR PWA ====================
function esPWAInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

// SESIÓN ACTUAL
function actualizarSesion() {
    const el = get("sesionActual");
    if (!el) return;

    const ahora = new Date();
    const hora = ahora.getUTCHours();

    let sesion = "Sesión Asia";
    if (hora >= 7 && hora < 13) sesion = "Sesión Londres";
    else if (hora >= 13 && hora < 21) sesion = "Sesión New York";

    el.textContent = sesion + " · " + ahora.toTimeString().slice(0, 5);
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

// GUARDAR CAMBIOS (con autosave y validación de ID)
function guardarCambios(mostrarNotificacion = false) {
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

    // ⭐ GUARDAR ID MANUAL CON VALIDACIÓN
    const idManualForm = get("idManualForm");
    if (idManualForm && idManualForm.value.trim() !== "") {
        const idIngresado = idManualForm.value.trim();
        
        const idExisteEnOtroTrade = trades.some((trade, idx) => {
            if (idx === currentIdx) return false;
            const tradeId = trade.datos.id_trade;
            return tradeId && tradeId.toString() === idIngresado;
        });
        
        if (idExisteEnOtroTrade) {
            mostrarToast(`⚠️ El ID ${idIngresado} ya existe en otro trade`, 'error');
            idManualForm.style.borderColor = '#ef4444';
            idManualForm.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.3)';
            return;
        } else {
            trades[currentIdx].datos.id_trade = idIngresado;
            idManualForm.style.borderColor = '';
            idManualForm.style.boxShadow = '';
        }
    }

    const colorAuto = get("colorAuto");
    if (colorAuto) trades[currentIdx].color = colorAuto.value;

    save();

    if (mostrarNotificacion) {
        const indicador = document.getElementById('autosaveIndicator');
        if (indicador) {
            indicador.textContent = '✓ Guardado';
            indicador.style.opacity = '1';
            setTimeout(() => indicador.style.opacity = '0', 1500);
        }
    }
}

function calcularRatio() {
    const sl = parseFloat(get("sl").value);
    const tp = parseFloat(get("tp").value);

    if (!isNaN(sl) && !isNaN(tp) && sl > 0 && tp > 0) {
        const ratio = tp / sl;
        get("ratio").value = ratio.toFixed(2);
        if (!get("maxRatio").value) get("maxRatio").value = ratio.toFixed(2);
    } else {
        get("ratio").value = "";
    }

    guardarCambios();
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
    console.log('🚀 App Trading inicializando...');
    console.log('🌐 URL Sheets:', URL_SHEETS);
    console.log('🏠 URL App:', APP_BASE_URL);
    console.log('📱 Es PWA instalada?', esPWAInstalada());
    
    // Si es PWA, aplicar estilos especiales
    if (esPWAInstalada()) {
        document.body.classList.add('pwa-mode');
        console.log('✅ Ejecutando en modo PWA instalada');
    }

    const slInput = get("sl");
    const tpInput = get("tp");
    if (slInput) slInput.addEventListener("input", calcularRatio);
    if (tpInput) tpInput.addEventListener("input", calcularRatio);

    // ⭐ VALIDAR ID EN TIEMPO REAL
    const idManualForm = get("idManualForm");
    if (idManualForm) {
        idManualForm.addEventListener("input", () => {
            const idIngresado = idManualForm.value.trim();
            if (idIngresado === "") {
                idManualForm.style.borderColor = '';
                idManualForm.style.boxShadow = '';
                return;
            }
            
            const idExisteEnOtroTrade = trades.some((trade, idx) => {
                if (currentIdx !== null && idx === currentIdx) return false;
                const tradeId = trade.datos.id_trade;
                return tradeId && tradeId.toString() === idIngresado;
            });
            
            if (idExisteEnOtroTrade) {
                idManualForm.style.borderColor = '#ef4444';
                idManualForm.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.3)';
                idManualForm.title = `El ID ${idIngresado} ya existe en otro trade`;
            } else {
                idManualForm.style.borderColor = '#10b981';
                idManualForm.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.3)';
                idManualForm.title = 'ID disponible';
            }
        });
    }

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
            guardarCambios(true);
        });
        if (["text", "number", "url", "date", "time"].includes(el.type)) {
            el.addEventListener("input", () => {
                if (id === "duracion") normalizarDuracion();
                guardarCambios(true);
            });
        }
    });

    // Autoguardado cada 5 segundos
    setInterval(() => {
        if (currentIdx !== null && get('operaciones') && !get('operaciones').classList.contains('oculto')) {
            guardarCambios();
        }
    }, 5000);

    updateDatalist();
    renderColores();
    showHome();
    actualizarSesion();
    setInterval(actualizarSesion, 60000);
    
    // Verificar conexión con Google Sheets
    verificarConexionSheets();
});

// ==================== FUNCIÓN: VERIFICAR CONEXIÓN CON SHEETS ====================
async function verificarConexionSheets() {
    try {
        console.log('🔍 Verificando conexión con Google Sheets...');
        const respuesta = await fetch(URL_SHEETS + '?test=conexion', {
            method: 'GET',
            mode: 'no-cors' // Para evitar errores de CORS en la verificación
        });
        console.log('✅ Conexión con Google Sheets disponible');
        mostrarToast('✅ Conectado a Google Sheets', 'exito');
    } catch (error) {
        console.warn('⚠️ No se pudo verificar conexión con Google Sheets:', error);
        mostrarToast('⚠️ Modo offline activado - Guardando localmente', 'error');
    }
}

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
                    guardarCambios(true);
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

// ==================== FUNCIÓN: GUARDAR PAR ====================
function guardarPar() {
    const inputPar = get("inputPar");
    const colorPar = get("colorPar");
    
    if (!inputPar || !colorPar) return;

    const nom = inputPar.value.trim().toUpperCase();
    if (!nom) {
        mostrarToast("Por favor, ingresa un nombre para el activo", 'error');
        return;
    }
    if (!sugerencias.includes(nom)) sugerencias.push(nom);

    const ahora = new Date();
    
    const idUnico = Date.now();
    
    const nuevoTrade = {
        id: idUnico,
        nombre: nom,
        color: colorPar.value,
        archivado: false,
        archivadoPreviamente: false,
        datos: {
            fecha: ahora.toISOString().split("T")[0],
            hora: ahora.getHours().toString().padStart(2, "0") + ":" +
                  ahora.getMinutes().toString().padStart(2, "0"),
            id_trade: null
        }
    };

    trades.push(nuevoTrade);
    inputPar.value = "";
    save();
    updateDatalist();
    showHome();
    abrirForm(trades.length - 1);
    mostrarToast(`✅ Nuevo par creado: ${nom}`, 'exito');
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
        
        if (t.datos.id_trade && !isNaN(t.datos.id_trade)) {
            info += `<div style="color:#3b82f6; font-weight:bold; font-size:0.9rem; margin-top:3px;">
                ID: ${t.datos.id_trade}
            </div>`;
        }
        
        if (t.datos.fecha) {
            info += `<div style="color:var(--subtext); font-weight:400; font-size:0.9rem; margin-top:6px;">`;
            info += `${t.datos.fecha} ${t.datos.hora || ''}`;
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
    const idManualForm = get("idManualForm");
    
    if (tituloPar) tituloPar.textContent = t.nombre;
    if (colorAuto) colorAuto.value = t.color || "#f0b90b";
    if (idManualForm) {
        idManualForm.value = t.datos.id_trade || "";
        idManualForm.style.borderColor = '';
        idManualForm.style.boxShadow = '';
        idManualForm.title = '';
    }

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

// ==================== FUNCIÓN: ARCHIVAR PAR (CORREGIDA) ====================
async function archivarPar() {
    if (!get("fecha").value || !get("resultado").value) {
        mostrarToast("Por favor, completa al menos Fecha y Resultado antes de archivar", 'error');
        return;
    }

    // ⭐ VALIDAR ID DUPLICADO ANTES DE ARCHIVAR
    const idManualForm = get("idManualForm");
    if (idManualForm && idManualForm.value.trim() !== "") {
        const idIngresado = idManualForm.value.trim();
        
        const idExisteEnOtroTrade = trades.some((trade, idx) => {
            if (idx === currentIdx) return false;
            const tradeId = trade.datos.id_trade;
            return tradeId && tradeId.toString() === idIngresado;
        });
        
        if (idExisteEnOtroTrade) {
            mostrarToast(`❌ No se puede archivar. El ID ${idIngresado} ya existe en otro trade`, 'error');
            return;
        }
    }

    normalizarDuracion();
    guardarCambios();
    
    const trade = trades[currentIdx];
    
    console.log('📤 Intentando archivar trade:', trade.nombre);
    console.log('🔗 URL destino:', URL_SHEETS);
    console.log('📊 Datos trade:', trade.datos);

    // Preparar datos para enviar
    const tradeData = {
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
    
    // Determinar si es actualización o nuevo
    const idParaEnviar = trade.datos.id_trade || (idManualForm && idManualForm.value.trim() !== "" ? idManualForm.value : null);
    
    if (idParaEnviar) {
        tradeData.id = idParaEnviar;
        tradeData.accion = 'actualizar';
        console.log('🔁 Actualizando trade existente ID:', idParaEnviar);
    } else {
        tradeData.accion = 'nuevo';
        console.log('🆕 Creando nuevo trade');
    }

    // Crear parámetros para enviar
    const params = new URLSearchParams();
    Object.keys(tradeData).forEach(key => {
        if (tradeData[key] !== undefined && tradeData[key] !== null && tradeData[key] !== '') {
            params.append(key, tradeData[key].toString());
        }
    });

    console.log('📨 Parámetros enviados:', Object.fromEntries(params));

    try {
        // ⭐ ENVÍO CRÍTICO: Usar fetch SIN 'no-cors' para poder leer respuesta
        console.log('🌐 Enviando datos a Google Sheets...');
        const respuesta = await fetch(URL_SHEETS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
            // ❌ NO usar: mode: 'no-cors' (impide leer respuesta)
        });
        
        const textoRespuesta = await respuesta.text();
        console.log('📥 Respuesta de Google Sheets:', textoRespuesta);
        
        // Procesar respuesta
        if (textoRespuesta.includes('EXITO') || textoRespuesta.includes('Trade')) {
            // Extraer ID si es un nuevo trade
            if (!idParaEnviar) {
                const matchId = textoRespuesta.match(/trade\s+(\d+)/i) || textoRespuesta.match(/ID[:\s]+(\d+)/i);
                if (matchId && matchId[1]) {
                    const nuevoId = matchId[1];
                    console.log('✅ ID asignado por Google Sheets:', nuevoId);
                    trades[currentIdx].datos.id_trade = nuevoId;
                    if (idManualForm) idManualForm.value = nuevoId;
                    save();
                    mostrarToast(`✅ Trade archivado en Sheets (ID: ${nuevoId})`, 'exito');
                } else {
                    mostrarToast('✅ Trade archivado en Google Sheets', 'exito');
                }
            } else {
                mostrarToast(`✅ Trade actualizado en Sheets (ID: ${idParaEnviar})`, 'exito');
            }
            
            // Marcar como archivado localmente
            trade.datos.archivedAt = Date.now();
            trade.archivado = true;
            trade.archivadoPreviamente = true;
            save();
            
        } else if (textoRespuesta.includes('ERROR')) {
            console.error('❌ Error de Google Sheets:', textoRespuesta);
            mostrarToast(`❌ Error de Google Sheets: ${textoRespuesta.substring(0, 100)}`, 'error');
            
            // Archivar localmente aunque falle en Sheets
            trade.datos.archivedAt = Date.now();
            trade.archivado = true;
            trade.archivadoPreviamente = true;
            save();
            mostrarToast('✅ Trade archivado localmente', 'exito');
        } else {
            console.warn('⚠️ Respuesta inesperada:', textoRespuesta);
            mostrarToast('✅ Trade archivado (respuesta inesperada)', 'exito');
            
            // Archivar localmente
            trade.datos.archivedAt = Date.now();
            trade.archivado = true;
            trade.archivadoPreviamente = true;
            save();
        }
        
    } catch (error) {
        console.error('❌ Error de conexión al archivar:', error);
        mostrarToast('❌ Error de conexión con Google Sheets', 'error');
        
        // Archivar localmente si falla la conexión
        trade.datos.archivedAt = Date.now();
        trade.archivado = true;
        trade.archivadoPreviamente = true;
        save();
        mostrarToast('✅ Trade archivado localmente (modo offline)', 'exito');
    }

    volverHome();
}

// ==================== FUNCIÓN PARA ELIMINAR EN SHEETS ====================
async function eliminarEnSheets(idTrade) {
    if (!idTrade || idTrade === '') {
        console.log("ℹ️ No hay ID para eliminar en Sheets");
        return false;
    }
  
    try {
        const params = new URLSearchParams();
        params.append('accion', 'eliminar');
        params.append('id', idTrade.toString());
    
        console.log(`🗑️ Enviando eliminación a Sheets para ID: ${idTrade}`);
    
        const respuesta = await fetch(URL_SHEETS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
    
        const textoRespuesta = await respuesta.text();
        console.log("📥 Respuesta de eliminación:", textoRespuesta);
    
        if (textoRespuesta.includes('EXITO') || textoRespuesta.includes('INFO')) {
            mostrarToast(`✅ Trade eliminado en Google Sheets (ID: ${idTrade})`, 'exito');
            return true;
        } else {
            mostrarToast(`⚠️ Eliminado localmente, error en Sheets: ${textoRespuesta}`, 'error');
            return false;
        }
    
    } catch (error) {
        console.error('❌ Error al eliminar en Sheets:', error);
        mostrarToast('✅ Eliminado localmente, sin conexión a Sheets', 'exito');
        return false;
    }
}

// ==================== FUNCIÓN: eliminarUno ====================
async function eliminarUno(id) {
    if (!confirm("¿Estás seguro de eliminar permanentemente este trade?\n\nSe marcará como 'ELIMINADO' en Google Sheets.")) return;
  
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
  
    const trade = trades[idx];
    const idTradeParaSheets = trade.datos.id_trade;
  
    console.log(`Eliminando trade ${trade.nombre} ID_Trade: ${idTradeParaSheets}`);
  
    // 1. Intentar eliminar en Google Sheets (si tiene ID)
    if (idTradeParaSheets) {
        await eliminarEnSheets(idTradeParaSheets);
    }
  
    // 2. Eliminar localmente
    trades = trades.filter(t => t.id !== id);
    save();
  
    // Actualizar vista
    if (window.location.hash.includes('#historial') || get('detalle')?.classList.contains('oculto') === false) {
        volverHistorial();
    } else {
        abrirHistorial();
    }
}

// ==================== FUNCIÓN: eliminarSeleccionados ====================
async function eliminarSeleccionados() {
    const sels = document.querySelectorAll(".sel-trade:checked");
    if (sels.length === 0) {
        mostrarToast("No hay trades seleccionados", 'error');
        return;
    }
  
    const mensaje = sels.length === 1 
        ? "¿Estás seguro de eliminar permanentemente este trade?\n\nSe marcará como 'ELIMINADO' en Google Sheets."
        : `¿Estás seguro de eliminar ${sels.length} trades permanentemente?\n\nSe marcarán como 'ELIMINADO' en Google Sheets.`;
  
    if (!confirm(mensaje)) return;

    const ids = Array.from(sels).map(s => parseInt(s.dataset.id));
    const tradesAEliminar = trades.filter(t => ids.includes(t.id));
  
    // 1. Intentar eliminar en Google Sheets
    for (const trade of tradesAEliminar) {
        if (trade.datos.id_trade) {
            await eliminarEnSheets(trade.datos.id_trade);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
  
    // 2. Eliminar localmente
    trades = trades.filter(t => !ids.includes(t.id));
    save();
  
    abrirHistorial();
    mostrarToast(`${sels.length} trades eliminados`, 'exito');
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
        
        const idInfo = (t.datos.id_trade && !isNaN(t.datos.id_trade)) ? 
            `<span style="background:#3b82f6; color:white; border-radius:4px; padding:2px 6px; font-size:0.7rem; margin-right:5px; font-weight:bold;">
                #${t.datos.id_trade}
            </span>` : '';
        
        d.innerHTML = `
      <input type="checkbox" class="sel-trade" data-id="${t.id}" style="width:18px; margin-right:15px;">
      <div class="historial-info" style="border-left:4px solid ${t.color}; padding-left: 10px; flex: 1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center;">
            ${idInfo}
            <b>${t.nombre}</b>
          </div>
          <span class="badge ${statusClass}">${t.datos.resultado || "S/R"}</span>
        </div>
        <small style="color:var(--subtext);">${t.datos.fecha || "---"} ${t.datos.hora || ""} | ${t.datos.tipo || ""} | Ratio: ${t.datos.ratio || "--"}</small>
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

    if (t.datos.id_trade) {
        html += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(43,49,57,0.35); padding:8px 0; background:rgba(59, 130, 246, 0.1);">
      <span style="color:var(--subtext); font-weight:bold;">ID_TRADE</span>
      <span style="font-weight:bold; color:#3b82f6;">${t.datos.id_trade}</span>
    </div>`;
    }

    for (const key in t.datos) {
        if (key === "archivedAt" || key === "id_trade") continue;
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

// ==================== FUNCIÓN: RESTABLECER ====================
function restablecer(id) {
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) {
        mostrarToast("Trade no encontrado", 'error');
        return;
    }
    
    const trade = trades[idx];
    
    if (!trade.archivado) {
        mostrarToast("Este trade ya está activo", 'error');
        return;
    }
    
    console.log("Restableciendo:", trade.nombre, 
                "Resultado:", trade.datos.resultado,
                "ID_Trade:", trade.datos.id_trade);
    
    trade.archivado = false;
    
    if (!trade.datos.resultado) {
        trade.datos.resultado = "RESTABLECIDO";
    }
    
    save();
    
    mostrarToast(`✅ Trade restablecido ${trade.datos.id_trade ? 'ID: ' + trade.datos.id_trade : ''}`, 'exito');
    
    abrirHistorial();
}

// ==================== MIGRACIÓN ====================
function migrarTradesAntiguos() {
    let cambioRealizado = false;
    trades.forEach(t => {
        if (t.archivadoPreviamente === undefined) {
            t.archivadoPreviamente = t.archivado;
            cambioRealizado = true;
        }
        
        if (!t.id || t.id === 0) {
            t.id = Date.now() + Math.floor(Math.random() * 1000);
            cambioRealizado = true;
        }
    });
    if (cambioRealizado) {
        save();
        console.log("✅ Migración completada");
    }
}

// Ejecutar automáticamente al cargar la página
migrarTradesAntiguos();

// ==================== FUNCIÓN: SUGERIR ID DISPONIBLE ====================
function sugerirIdDisponible() {
    const idsExistentes = [];
    
    trades.forEach(trade => {
        const tradeId = trade.datos.id_trade;
        if (tradeId && !isNaN(tradeId)) {
            idsExistentes.push(parseInt(tradeId));
        }
    });
    
    if (idsExistentes.length === 0) {
        return "1";
    }
    
    idsExistentes.sort((a, b) => a - b);
    
    let siguienteId = 1;
    for (const id of idsExistentes) {
        if (id === siguienteId) {
            siguienteId++;
        } else if (id > siguienteId) {
            break;
        }
    }
    
    return siguienteId.toString();
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

// ==================== FUNCIONES GLOBALES ====================
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.volverHome = volverHome;
window.abrirHistorial = abrirHistorial;
window.limpiarFiltros = limpiarFiltros;
window.eliminarSeleccionados = eliminarSeleccionados;
window.volverHistorial = volverHistorial;
window.restablecer = restablecer;
window.eliminarUno = eliminarUno;
window.exportarBackup = exportarBackup;
window.sugerirIdDisponible = sugerirIdDisponible;
window.eliminarEnSheets = eliminarEnSheets;
window.esPWAInstalada = esPWAInstalada;

// ==================== REGISTRO DE SERVICE WORKER (MEJORADO) ====================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        // Registrar con control de errores
        navigator.serviceWorker.register("./sw.js")
            .then(registration => {
                console.log("✅ Service Worker registrado correctamente:", registration.scope);
                
                // Verificar actualizaciones periódicamente
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000); // Cada hora
            })
            .catch(error => {
                console.log("⚠️ Service Worker NO registrado (puede ser normal en desarrollo):", error);
            });
    });
}
