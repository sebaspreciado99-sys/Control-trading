// ==================== CONFIGURACIÓN ====================
// ¡¡¡IMPORTANTE!!! Actualiza esta URL con la que te di
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbwhyrjxqY54qQnm11LPrzYBa7ZSFzrJLjdD2eWDhwEcPuJPLrp0CBes8r1OG_JQK81iEA/exec";

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

// ==================== FUNCIÓN: DIAGNOSTICAR ====================
function diagnosticarEnvio(datos, esActualizacion) {
    console.group('🔍 DIAGNÓSTICO APP.JS');
    console.log('Enviando datos:', datos);
    console.log('¿Es actualización?:', esActualizacion);
    console.log('ID a enviar:', datos.id);
    console.groupEnd();
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
    // Configurar eventos
    const slInput = get("sl");
    const tpInput = get("tp");
    if (slInput) slInput.addEventListener("input", calcularRatio);
    if (tpInput) tpInput.addEventListener("input", calcularRatio);

    // Inicializar
    updateDatalist();
    renderColores();
    showHome();
    
    console.log('✅ app.js cargado. URL_SHEETS:', URL_SHEETS);
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

// ==================== FUNCIÓN: GUARDAR PAR ====================
function guardarPar() {
    const inputPar = get("inputPar");
    const colorPar = get("colorPar");
    if (!inputPar || !colorPar) return;

    const nom = inputPar.value.trim().toUpperCase();
    if (!nom) {
        mostrarToast("Ingresa un nombre para el activo", 'error');
        return;
    }
    if (!sugerencias.includes(nom)) sugerencias.push(nom);

    const ahora = new Date();
    
    // IMPORTANTE: Temporalmente 0, Google Sheets asignará el real
    const nuevoTrade = {
        id: 0, // Temporal - Google Sheets lo actualizará
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
    mostrarToast("✅ Par creado. ID será asignado por Google Sheets.", 'exito');
}

// ==================== FUNCIÓN: ARCHIVAR PAR ====================
async function archivarPar() {
    if (!get("fecha").value || !get("resultado").value) {
        mostrarToast("Completa Fecha y Resultado antes de archivar", 'error');
        return;
    }

    guardarCambios();
    
    const trade = trades[currentIdx];
    const esUnaActualizacion = trade.archivadoPreviamente === true;
    
    trade.datos.archivedAt = Date.now();
    trade.archivado = true;
    trade.archivadoPreviamente = true;
    save();

    try {
        const datos = trade.datos;

        // PREPARAR DATOS PARA ENVIAR
        const tradeData = {
            // ¡CRÍTICO! Enviar el ID actual (puede ser 0 para nuevos)
            id: trade.id,
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
        
        // ¡CRÍTICO! Agregar bandera si es restablecimiento
        if (esUnaActualizacion) {
            tradeData.accion = 'actualizar';
            console.log('🚨 ENVIANDO COMO ACTUALIZACIÓN (restablecer)');
        }

        // Diagnosticar antes de enviar
        diagnosticarEnvio(tradeData, esUnaActualizacion);

        // Construir URL
        const params = new URLSearchParams();
        Object.keys(tradeData).forEach(key => {
            if (tradeData[key] !== undefined && tradeData[key] !== null) {
                params.append(key, tradeData[key].toString());
            }
        });

        console.log('📤 Enviando a:', `${URL_SHEETS}?${params.toString().substring(0, 80)}...`);

        // Enviar
        await fetch(`${URL_SHEETS}?${params.toString()}`, {
            method: 'POST',
            mode: 'no-cors'
        });

        // NOTA: No podemos leer la respuesta por 'no-cors'
        // Google Sheets debería responder con el ID asignado
        
        const mensaje = esUnaActualizacion 
            ? "✅ Trade actualizado en Google Sheets" 
            : "✅ Nuevo trade archivado en Google Sheets";
        mostrarToast(mensaje, 'exito');
        
    } catch (error) {
        console.error('Error enviando a Google Sheets:', error);
        mostrarToast("✅ Trade archivado (solo localmente)", 'exito');
    }

    volverHome();
}

// ==================== FUNCIONES DE INTERFAZ ====================
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

    if (!get("fecha").value) {
        get("fecha").value = new Date().toISOString().split("T")[0];
    }
    if (!get("hora").value) {
        const ahora = new Date();
        get("hora").value =
            ahora.getHours().toString().padStart(2, "0") + ":" +
            ahora.getMinutes().toString().padStart(2, "0");
    }

    const home = get("home");
    const operaciones = get("operaciones");
    const btnHistorial = get("btnHistorial");
    if (home) home.classList.add("oculto");
    if (operaciones) operaciones.classList.remove("oculto");
    if (btnHistorial) btnHistorial.style.display = "none";
}

function guardarCambios(mostrarNotificacion = false) {
    if (currentIdx === null) return;

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
    }
    guardarCambios();
}

// ==================== FUNCIÓN: RESTABLECER ====================
function restablecer(id) {
    console.log('↩ Restableciendo trade con ID:', id);
    
    const idx = trades.findIndex(t => t.id === id);
    if (idx === -1) {
        console.error('Trade no encontrado con ID:', id);
        return;
    }
    
    trades[idx].archivado = false;
    trades[idx].archivadoPreviamente = true;
    
    save();
    abrirHistorial();
    mostrarToast(`Trade #${id} restablecido`, 'exito');
    
    // Abrir para editar
    abrirForm(idx);
}

// ==================== FUNCIONES GLOBALES ====================
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.volverHome = () => { currentIdx = null; showHome(); };
window.restablecer = restablecer;
window.abrirHistorial = function() {
    const home = get("home");
    const historial = get("historial");
    const operaciones = get("operaciones");
    const btnHistorial = get("btnHistorial");
    
    if (home) home.classList.add("oculto");
    if (operaciones) operaciones.classList.add("oculto");
    if (historial) historial.classList.remove("oculto");
    if (btnHistorial) btnHistorial.style.display = "none";
    
    // Cargar historial
    const cont = get("historialContenido");
    if (!cont) return;
    
    cont.innerHTML = "";
    const filtrados = trades.filter(t => t.archivado);
    
    filtrados.forEach(t => {
        const d = document.createElement("div");
        d.className = "historial-item";
        d.innerHTML = `
      <div class="historial-info" style="border-left:4px solid ${t.color}; padding-left: 10px; flex: 1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b>${t.nombre}</b>
          <span>${t.datos.resultado || ""}</span>
        </div>
        <small>${t.datos.fecha || ""}</small>
      </div>
      <button onclick="restablecer(${t.id})" style="background:transparent; color:#f0b90b; font-size:20px; border:none; padding:10px; cursor:pointer;">↩</button>
    `;
        cont.appendChild(d);
    });
};
