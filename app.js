// URL para Google Sheets
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbxYVEBKihhOF0NCoWkWQZCfWkoFtwYURY1qhqO45hQRiQ6J8-GGhTW6avbmKAE3bToL9w/exec";

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

// ==================== CONTADOR DE ID_TRADE CONSECUTIVOS ====================
function obtenerSiguienteIdTrade() {
  // Buscar el máximo ID_Trade en los trades archivados
  let maxId = 0;
  
  trades.forEach(t => {
    if (t.datos && t.datos.id_trade && !isNaN(t.datos.id_trade) && t.archivado) {
      const id = parseInt(t.datos.id_trade);
      if (id > maxId) {
        maxId = id;
      }
    }
  });
  
  return maxId + 1;
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

// ==================== FUNCIÓN CORREGIDA: ARCHIVAR PAR ====================
async function archivarPar() {
    if (!get("fecha").value || !get("resultado").value) {
        mostrarToast("Por favor, completa al menos Fecha y Resultado antes de archivar", 'error');
        return;
    }

    normalizarDuracion();
    guardarCambios();
    
    const trade = trades[currentIdx];
    const esUnaActualizacion = trade.archivadoPreviamente === true;
    
    // Asignar ID_Trade consecutivo si no existe
    if (!trade.datos.id_trade || trade.datos.id_trade === '0' || trade.datos.id_trade === 0) {
        const siguienteId = obtenerSiguienteIdTrade();
        trade.datos.id_trade = siguienteId;
        console.log(`🔢 Asignando ID_Trade consecutivo: ${siguienteId}`);
    } else {
        console.log(`📊 Usando ID_Trade existente: ${trade.datos.id_trade}`);
    }
    
    // Marcar como archivado
    trade.datos.archivedAt = Date.now();
    trade.archivado = true;
    trade.archivadoPreviamente = true;
    save();

    try {
        const datos = trade.datos;

        const tradeData = {
            id_trade: datos.id_trade || '',      // ¡¡¡IMPORTANTE: ID_TRADE para numeración!!!
            id_unico: trade.id,                  // ID único del sistema
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
        
        // Agregar bandera de actualización si corresponde
        if (esUnaActualizacion) {
            tradeData.accion = 'actualizar';
            console.log(`🔄 Enviando como ACTUALIZACIÓN - ID_Trade: ${tradeData.id_trade}`);
        } else {
            console.log(`🆕 Enviando como NUEVO - ID_Trade: ${tradeData.id_trade}`);
        }

        const params = new URLSearchParams();
        Object.keys(tradeData).forEach(key => {
            if (tradeData[key] !== undefined && tradeData[key] !== null && tradeData[key] !== '') {
                params.append(key, tradeData[key]);
            }
        });

        // Enviar a Google Sheets
        const response = await fetch(`${URL_SHEETS}?${params.toString()}`, {
            method: 'POST',
            mode: 'no-cors'
        });

        const mensaje = esUnaActualizacion 
            ? `✅ Trade ACTUALIZADO en Google Sheets - ID_Trade: ${tradeData.id_trade}` 
            : `✅ NUEVO Trade archivado en Google Sheets - ID_Trade: ${tradeData.id_trade}`;
        
        mostrarToast(mensaje, 'exito');
        
    } catch (error) {
        console.error('Error al enviar a Google Sheets:', error);
        mostrarToast("✅ Trade archivado (solo localmente)", 'exito');
    }

    volverHome();
}

// ==================== FUNCIÓN CORREGIDA: RESTABLECER ====================
async function restablecer(id) {
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const trade = trades[idx];
    
    // Verificar que el trade esté archivado
    if (!trade.archivado) {
        mostrarToast("Este trade ya está activo", 'error');
        return;
    }
    
    // Preparar datos para restablecimiento
    const datos = trade.datos;
    
    const tradeData = {
        id_trade: datos.id_trade || '',
        id_unico: trade.id,
        par: trade.nombre || '',
        fecha: datos.fecha || '',
        hora: datos.hora || '',
        tipo: datos.tipo || '',
        gatillo: datos.gatillo || '',
        sl: datos.sl || '',
        tp: datos.tp || '',
        ratio: datos.ratio || '',
        maxRatio: datos.maxRatio || '',
        resultado: "RESTABLECIDO",  // Cambiar resultado
        duracion: datos.duracion || '',
        diario: datos.diario || '',
        horario: datos.horario || '',
        porcentaje: datos.porcentaje || '',
        rNegativo: datos.rNegativo || '',
        rPositivo: datos.rPositivo || '',
        accion: 'actualizar'  // Siempre es actualización
    };

    try {
        // Enviar a Google Sheets primero
        const params = new URLSearchParams();
        Object.keys(tradeData).forEach(key => {
            if (tradeData[key] !== undefined && tradeData[key] !== null && tradeData[key] !== '') {
                params.append(key, tradeData[key]);
            }
        });

        await fetch(`${URL_SHEETS}?${params.toString()}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        
        // Solo después de éxito en Google Sheets, actualizar localmente
        trade.archivado = false;
        trade.archivadoPreviamente = true;
        trade.datos.resultado = "RESTABLECIDO"; // Mantener el marcador
        save();
        
        mostrarToast(`✅ Trade restablecido - ID_Trade: ${tradeData.id_trade}`, 'exito');
        abrirHistorial();
        
    } catch (error) {
        console.error('Error al restablecer en Google Sheets:', error);
        mostrarToast("❌ Error al restablecer en Google Sheets", 'error');
    }
}

// ==================== FUNCIÓN: ELIMINAR PERMANENTEMENTE ====================
async function eliminarUno(id) {
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const trade = trades[idx];
    
    if (!confirm(`¿Estás seguro de eliminar permanentemente el trade ${trade.nombre}?`)) return;
    
    // Si está archivado, marcar como ELIMINADO en Google Sheets
    if (trade.archivado && trade.datos.id_trade) {
        const tradeData = {
            id_trade: trade.datos.id_trade || '',
            id_unico: trade.id,
            par: trade.nombre || '',
            fecha: trade.datos.fecha || '',
            hora: trade.datos.hora || '',
            tipo: trade.datos.tipo || '',
            gatillo: trade.datos.gatillo || '',
            sl: trade.datos.sl || '',
            tp: trade.datos.tp || '',
            ratio: trade.datos.ratio || '',
            maxRatio: trade.datos.maxRatio || '',
            resultado: "ELIMINADO",  // Marcador especial
            duracion: trade.datos.duracion || '',
            diario: trade.datos.diario || '',
            horario: trade.datos.horario || '',
            porcentaje: trade.datos.porcentaje || '',
            rNegativo: trade.datos.rNegativo || '',
            rPositivo: trade.datos.rPositivo || '',
            accion: 'actualizar'
        };

        try {
            const params = new URLSearchParams();
            Object.keys(tradeData).forEach(key => {
                if (tradeData[key] !== undefined && tradeData[key] !== null && tradeData[key] !== '') {
                    params.append(key, tradeData[key]);
                }
            });

            await fetch(`${URL_SHEETS}?${params.toString()}`, {
                method: 'POST',
                mode: 'no-cors'
            });
        } catch (error) {
            console.error('Error al marcar como eliminado en Google Sheets:', error);
        }
    }
    
    // Eliminar localmente
    trades = trades.filter(t => t.id !== id);
    save();
    abrirHistorial();
    mostrarToast("Trade eliminado permanentemente", 'exito');
}

// ==================== MIGRACIÓN CORREGIDA ====================
function migrarTradesAntiguos() {
    let cambioRealizado = false;
    let nextIdTrade = obtenerSiguienteIdTrade();
    
    trades.forEach((t, index) => {
        // Migrar datos antiguos
        if (t.archivadoPreviamente === undefined) {
            t.archivadoPreviamente = t.archivado;
            cambioRealizado = true;
        }
        
        // Asegurar ID único
        if (!t.id || t.id === 0) {
            t.id = Date.now() + index;
            cambioRealizado = true;
        }
        
        // Asignar ID_Trade consecutivo a trades archivados
        if (t.archivado && (!t.datos.id_trade || t.datos.id_trade === 0)) {
            t.datos.id_trade = nextIdTrade;
            nextIdTrade++;
            cambioRealizado = true;
        }
    });
    
    if (cambioRealizado) {
        save();
        console.log("✅ Migración completada con IDs_Trade asignados.");
    }
}

// ==================== FUNCIÓN: ACTUALIZAR VISUALIZACIÓN EN HISTORIAL ====================
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
        const resultado = t.datos.resultado || "";
        const statusClass = resultado.includes("WIN") ? "win" : 
                           resultado.includes("LOSS") ? "loss" : 
                           resultado.includes("ELIMINADO") ? "eliminado" : 
                           resultado.includes("RESTABLECIDO") ? "restablecido" : "";

        const d = document.createElement("div");
        d.className = "historial-item";
        
        // Mostrar ID_Trade si existe
        const idTradeDisplay = t.datos.id_trade ? 
            `<span style="background:#3b82f6; color:white; border-radius:4px; padding:2px 6px; font-size:0.8rem; font-weight:bold; margin-right:8px;">
                #${t.datos.id_trade}
            </span>` : '';
        
        d.innerHTML = `
      <input type="checkbox" class="sel-trade" data-id="${t.id}" style="width:18px; margin-right:15px;">
      <div class="historial-info" style="border-left:4px solid ${t.color}; padding-left: 10px; flex: 1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap: 8px;">
            ${idTradeDisplay}
            <b>${t.nombre}</b>
          </div>
          <span class="badge ${statusClass}">${resultado || "S/R"}</span>
        </div>
        <small style="color:var(--subtext);">${t.datos.fecha || "---"} | ${t.datos.tipo || ""} | Ratio: ${t.datos.ratio || "--"}</small>
      </div>
      <button onclick="restablecer(${t.id})" style="background:transparent; color:#f0b90b; font-size:20px; border:none; padding:10px; cursor:pointer; ${resultado.includes("ELIMINADO") ? 'display:none;' : ''}">↩</button>
    `;
        d.querySelector(".historial-info").onclick = () => verDetalle(t.origIdx);
        cont.appendChild(d);
    });
}

// ==================== FUNCIÓN: MOSTRAR HOME CON ID_TRADE ====================
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
        
        // Mostrar ID_Trade si ya fue asignado (aunque no esté archivado)
        if (t.datos.id_trade) {
            info += `<div style="color:#3b82f6; font-weight:bold; font-size:0.9rem; margin-top:3px;">
                ID Trade: ${t.datos.id_trade}
            </div>`;
        }
        
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

// ==================== RESTANTE DEL CÓDIGO (SIN CAMBIOS) ====================
// ... (el resto del código permanece igual, solo reemplaza las funciones mostradas arriba)

// Ejecutar migración al cargar
migrarTradesAntiguos();

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
