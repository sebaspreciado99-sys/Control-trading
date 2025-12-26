// URL para Google Sheets (¡ACTUALIZA ESTA URL DESPUÉS DE CADA NUEVO DESPLIEGUE DEL SCRIPT!)
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbxYVEBKihhOF0NCoWkWQZCfWkoFtwYURY1qhqO45hQRiQ6J8-GGhTW6avbmKAE3bToL9w/exec";

let trades = JSON.parse(localStorage.getItem("trades_v5_pro")) || [];
let sugerencias = JSON.parse(localStorage.getItem("sugerencias_v5")) || [];
let currentIdx = null;

const get = id => document.getElementById(id);

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

// GUARDAR CAMBIOS (con autosave)
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

    const colorAuto = get("colorAuto");
    if (colorAuto) trades[currentIdx].color = colorAuto.value;

    save();

    // Indicador de autoguardado
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

// ==================== FUNCIÓN MODIFICADA: GUARDAR PAR ====================
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
    
    // CRÍTICO: ID único basado en timestamp (esto evita duplicados)
    const idUnico = Date.now(); // Genera un número único como 1739619856331
    
    const nuevoTrade = {
        id: idUnico,  // Usar Date.now() para ID único
        nombre: nom,
        color: colorPar.value,
        archivado: false,
        archivadoPreviamente: false,
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
    mostrarToast("✅ Nuevo par creado con ID único: " + idUnico, 'exito');
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

// ==================== FUNCIÓN MODIFICADA: ARCHIVAR PAR ====================
async function archivarPar() {
    if (!get("fecha").value || !get("resultado").value) {
        mostrarToast("Por favor, completa al menos Fecha y Resultado antes de archivar", 'error');
        return;
    }

    normalizarDuracion();
    guardarCambios();
    
    // Determinar si es una actualización
    const trade = trades[currentIdx];
    const esUnaActualizacion = trade.archivadoPreviamente === true; // Ya fue archivado antes
    
    trade.datos.archivedAt = Date.now();
    trade.archivado = true;
    trade.archivadoPreviamente = true; // Marcar como ya archivado
    save();

    try {
        const datos = trade.datos;

        const tradeData = {
            id: trade.id,  // ID único del trade
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
        
        // CRÍTICO: Enviar bandera de actualización si corresponde
        if (esUnaActualizacion) {
            tradeData.accion = 'actualizar'; // Esta línea es CLAVE
            console.log('📤 Enviando trade para ACTUALIZAR con ID:', trade.id);
        } else {
            console.log('📤 Enviando NUEVO trade con ID:', trade.id);
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

// ==================== FUNCIÓN MODIFICADA: RESTABLECER ====================
function restablecer(id) {
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    // Solo cambiar el estado de archivado
    trades[idx].archivado = false;
    // IMPORTANTE: Mantener archivadoPreviamente como TRUE porque ya fue enviado a Google Sheets
    trades[idx].archivadoPreviamente = true;
    
    save();
    abrirHistorial();
    mostrarToast("Trade restablecido. Ahora puedes editarlo.", 'exito');
    
    // Abrir el form para editar inmediatamente
    abrirForm(idx);
}

function eliminarUno(id) {
    if (!confirm("¿Estás seguro de eliminar permanentemente este trade?")) return;
    trades = trades.filter(t => t.id !== id);
    save();
    volverHistorial();
    mostrarToast("Trade eliminado", 'exito');
}

function eliminarSeleccionados() {
    const sels = document.querySelectorAll(".sel-trade:checked");
    if (sels.length === 0) {
        mostrarToast("No hay trades seleccionados", 'error');
        return;
    }
    if (!confirm(`¿Estás seguro de eliminar ${sels.length} trade(s) permanentemente?`)) return;

    const ids = Array.from(sels).map(s => parseInt(s.dataset.id));
    trades = trades.filter(t => !ids.includes(t.id));
    save();
    abrirHistorial();
    mostrarToast(`${sels.length} trades eliminados`, 'exito');
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

// ==================== MIGRACIÓN PARA TRADES ANTIGUOS ====================
function migrarTradesAntiguos() {
    let cambioRealizado = false;
    trades.forEach(t => {
        if (t.archivadoPreviamente === undefined) {
            t.archivadoPreviamente = t.archivado;
            cambioRealizado = true;
        }
        // Asegurar que todos los trades tengan un ID único
        if (!t.id || t.id === 0) {
            t.id = Date.now() + Math.floor(Math.random() * 1000);
            cambioRealizado = true;
        }
    });
    if (cambioRealizado) {
        save();
        console.log("✅ Migración de trades antiguos completada.");
    }
}

// Ejecutar automáticamente al cargar la página
migrarTradesAntiguos();

// ==================== FUNCIONES GLOBALES (TODAS) ====================
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

// Registro del Service Worker para PWA
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js")
            .catch(err => console.log("SW error:", err));
    });
}
