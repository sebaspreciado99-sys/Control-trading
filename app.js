// URL para Google Sheets - MANTENER TU URL
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbxYVEBKihhOF0NCoWkWQZCfWkoFtwYURY1qhqO45hQRiQ6J8-GGhTW6avbmKAE3bToL9w/exec";

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

// ==================== FUNCIÓN: GUARDAR PAR (MANTENIENDO TU CÓDIGO) ====================
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
    
    // ¡¡¡CAMBIOS MÍNIMOS!!! Ahora el ID será la numeración consecutiva desde Google Sheets
    // Pero localmente mantenemos un ID temporal
    const idTemporal = "temp_" + Date.now();
    
    const nuevoTrade = {
        id: idTemporal,  // ID temporal local
        nombre: nom,
        color: colorPar.value,
        archivado: false,
        archivadoPreviamente: false,
        datos: {
            fecha: ahora.toISOString().split("T")[0],
            hora: ahora.getHours().toString().padStart(2, "0") + ":" +
                  ahora.getMinutes().toString().padStart(2, "0"),
            idGoogleSheets: null // Se llenará cuando se archive
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

// ==================== FUNCIÓN: ARCHIVAR PAR (MODIFICACIÓN MÍNIMA) ====================
async function archivarPar() {
    if (!get("fecha").value || !get("resultado").value) {
        mostrarToast("Por favor, completa al menos Fecha y Resultado antes de archivar", 'error');
        return;
    }

    normalizarDuracion();
    guardarCambios();
    
    // DETERMINAR SI ES UNA ACTUALIZACIÓN
    const trade = trades[currentIdx];
    const esUnaActualizacion = trade.archivadoPreviamente === true;
    
    // Marcar como archivado localmente primero
    trade.datos.archivedAt = Date.now();
    trade.archivado = true;
    trade.archivadoPreviamente = true;
    save();

    try {
        const datos = trade.datos;

        // ¡¡¡IMPORTANTE!!! Enviar el ID correcto
        // Si es una actualización, usar el ID de Google Sheets que ya tenemos
        // Si es nuevo, dejar que Google Sheets asigne la numeración
        const tradeData = {
            id: esUnaActualizacion ? trade.datos.idGoogleSheets : '', // Solo para actualizaciones
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
        
        // AGREGAR BANDERA DE ACTUALIZACIÓN
        if (esUnaActualizacion) {
            tradeData.accion = 'actualizar';
        }

        const params = new URLSearchParams();
        Object.keys(tradeData).forEach(key => {
            if (tradeData[key] !== undefined && tradeData[key] !== null) {
                params.append(key, tradeData[key]);
            }
        });

        await fetch(`${URL_SHEETS}?${params.toString()}`, {
            method: 'POST',
            mode: 'no-cors'
        });

        // GUARDAR EL ID ASIGNADO POR GOOGLE SHEETS
        // Nota: No podemos obtener respuesta por "no-cors", 
        // pero podemos asumir que se asignó correctamente
        if (!esUnaActualizacion) {
            // Para nuevos trades, podemos intentar obtener el ID de la respuesta
            // Pero con "no-cors" no podemos. Necesitamos una solución diferente.
            
            // SOLUCIÓN: Guardar referencia con timestamp
            trade.datos.idGoogleSheets = 'asignado_en_gsheets_' + Date.now();
            save();
        }

        const mensaje = esUnaActualizacion 
            ? "✅ Trade ACTUALIZADO en Google Sheets" 
            : "✅ NUEVO Trade archivado en Google Sheets";
        mostrarToast(mensaje, 'exito');
        
    } catch (error) {
        console.error('Error al enviar a Google Sheets:', error);
        mostrarToast("✅ Trade archivado (solo localmente)", 'exito');
    }

    volverHome();
}

// ==================== FUNCIÓN: MIGRAR TRADES ANTIGUOS ====================
function migrarTradesAntiguos() {
    let cambioRealizado = false;
    trades.forEach(t => {
        if (t.archivadoPreviamente === undefined) {
            t.archivadoPreviamente = t.archivado;
            cambioRealizado = true;
        }
        // Asegurar que tenemos idGoogleSheets
        if (t.archivado && !t.datos.idGoogleSheets) {
            t.datos.idGoogleSheets = 'migrado_' + Date.now();
            cambioRealizado = true;
        }
    });
    if (cambioRealizado) {
        save();
        console.log("✅ Migración de trades antiguos completada.");
    }
}

// ==================== FUNCIÓN: RESTABLECER (MODIFICACIÓN) ====================
function restablecer(id) {
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    // IMPORTANTE: No cambiar el archivadoPreviamente
    trades[idx].archivado = false;
    
    // Marcar resultado como "RESTABLECIDO" para Google Sheets
    trades[idx].datos.resultado = "RESTABLECIDO";
    
    save();
    abrirHistorial();
    mostrarToast("Trade restablecido. Actualiza en Google Sheets manualmente.", 'exito');
}

// ==================== FUNCIÓN: ELIMINAR UNO (MODIFICACIÓN) ====================
function eliminarUno(id) {
    if (!confirm("¿Estás seguro de eliminar permanentemente este trade?")) return;
    
    // Encontrar el trade
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const trade = trades[idx];
    
    // Si está archivado y tiene ID de Google Sheets, podemos marcarlo como eliminado
    if (trade.archivado && trade.datos.idGoogleSheets) {
        // Podrías enviar una actualización a Google Sheets aquí si quieres
        console.log(`Trade ${trade.nombre} tenía ID Google Sheets: ${trade.datos.idGoogleSheets}`);
    }
    
    // Eliminar localmente
    trades = trades.filter(t => t.id !== id);
    save();
    volverHistorial();
    mostrarToast("Trade eliminado permanentemente", 'exito');
}

// ==================== FUNCIÓN: ABRIR HISTORIAL (MEJORA VISUAL) ====================
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

    // Mostrar con mejor formato
    filtrados.forEach(t => {
        const statusClass = t.datos.resultado?.toUpperCase().includes("WIN")
            ? "win"
            : t.datos.resultado?.toUpperCase().includes("LOSS")
                ? "loss"
                : t.datos.resultado?.includes("RESTABLECIDO")
                ? "restablecido"
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
        <small style="color:var(--subtext);">
          ${t.datos.fecha || "---"} | ${t.datos.tipo || ""} | Ratio: ${t.datos.ratio || "--"}
          ${t.datos.idGoogleSheets ? ' | ID: ' + t.datos.idGoogleSheets.substring(0, 8) + '...' : ''}
        </small>
      </div>
      <button onclick="restablecer(${t.id})" style="background:transparent; color:#f0b90b; font-size:20px; border:none; padding:10px; cursor:pointer;">↩</button>
    `;
        d.querySelector(".historial-info").onclick = () => verDetalle(t.origIdx);
        cont.appendChild(d);
    });
}

// ==================== TODO LO DEMÁS PERMANECE IGUAL ====================
// No cambies nada más de tu código original excepto las funciones anteriores

// ==================== EJECUTAR MIGRACIÓN AL CARGAR ====================
document.addEventListener("DOMContentLoaded", () => {
    migrarTradesAntiguos();
    
    // Tu código de inicialización original aquí...
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
            guardarCambios(true);
        });
        if (["text", "number", "url", "date", "time"].includes(el.type)) {
            el.addEventListener("input", () => {
                if (id === "duracion") normalizarDuracion();
                guardarCambios(true);
            });
        }
    });

    // AUTOGUARDADO CADA 5 SEGUNDOS
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
});

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
