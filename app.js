// ==================== APP.JS COMPLETO ====================
// URL para Google Sheets
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

// ==================== SESIÓN ACTUAL ====================
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

// ==================== DURACIÓN ====================
function normalizarDuracion() {
    const dur = get("duracion");
    if (!dur) return;
    let v = dur.value.trim().toUpperCase();
    if (v === "") return;

    v = v.replace(/\s+/g, " ");
    if (/^\d+$/.test(v)) v = `${v}H`;

    v = v.replace(/(\d+)D(\d+)H/, "$1D $2H");
    v = v.replace(/DIAS?/g, "D").replace(/HORAS?/g, "H");

    dur.value = v;
}

// ==================== GUARDAR CAMBIOS ====================
function guardarCambios(mostrarNotificacion = false) {
    if (currentIdx === null || currentIdx < 0 || currentIdx >= trades.length) return;

    const campos = [
        "fecha", "hora", "tipo", "gatillo", "sl", "tp", "ratio", "maxRatio",
        "resultado", "duracion", "diario", "horario", "porcentaje",
        "rNegativo", "rPositivo"
    ];

    campos.forEach(id => {
        const el = get(id);
        if (el) trades[currentIdx].datos[id] = el.value;
    });

    const colorAuto = get("colorAuto");
    if (colorAuto) trades[currentIdx].color = colorAuto.value;

    save();

    if (mostrarNotificacion) {
        const ind = document.getElementById('autosaveIndicator');
        if (ind) {
            ind.textContent = '✓ Guardado';
            ind.style.opacity = '1';
            setTimeout(() => ind.style.opacity = '0', 1500);
        }
    }
}

// ==================== CALCULAR RATIO ====================
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
    ["sl", "tp"].forEach(id => {
        const el = get(id);
        if (el) el.addEventListener("input", calcularRatio);
    });

    const camposAutoSave = [
        "fecha","hora","tipo","gatillo","sl","tp","maxRatio",
        "resultado","duracion","diario","horario","porcentaje",
        "rNegativo","rPositivo","colorAuto"
    ];

    camposAutoSave.forEach(id => {
        const el = get(id);
        if (!el) return;
        el.addEventListener("change", () => {
            if (id === "duracion") normalizarDuracion();
            guardarCambios(true);
        });
        el.addEventListener("input", () => guardarCambios(true));
    });

    updateDatalist();
    showHome();
    actualizarSesion();
    setInterval(actualizarSesion, 60000);
});

// ==================== STORAGE ====================
function save() {
    localStorage.setItem("trades_v5_pro", JSON.stringify(trades));
    localStorage.setItem("sugerencias_v5", JSON.stringify(sugerencias));
}

// ==================== GUARDAR PAR ====================
function guardarPar() {
    const nom = get("inputPar").value.trim().toUpperCase();
    if (!nom) return mostrarToast("Nombre requerido", "error");

    if (!sugerencias.includes(nom)) sugerencias.push(nom);

    const ahora = new Date();

    trades.push({
        nombre: nom,
        color: get("colorPar").value,
        archivado: false,
        archivadoPreviamente: false,
        datos: {
            fecha: ahora.toISOString().split("T")[0],
            hora: ahora.toTimeString().slice(0,5),
            id_trade: null
        }
    });

    save();
    showHome();
    abrirForm(trades.length - 1);
}

// ==================== ARCHIVAR PAR (CLAVE) ====================
async function archivarPar() {
    guardarCambios();

    const trade = trades[currentIdx];
    const datos = trade.datos;

    const params = new URLSearchParams({
        par: trade.nombre,
        fecha: datos.fecha,
        hora: datos.hora,
        tipo: datos.tipo || "",
        gatillo: datos.gatillo || "",
        sl: datos.sl || "",
        tp: datos.tp || "",
        ratio: datos.ratio || "",
        maxRatio: datos.maxRatio || "",
        resultado: datos.resultado || "",
        duracion: datos.duracion || "",
        diario: datos.diario || "",
        horario: datos.horario || "",
        porcentaje: datos.porcentaje || "",
        rNegativo: datos.rNegativo || "",
        rPositivo: datos.rPositivo || ""
    });

    if (datos.id_trade) params.append("id", datos.id_trade);

    const res = await fetch(URL_SHEETS, {
        method: "POST",
        body: params
    });

    const json = await res.json();

    if (json.status === "ok") {
        trade.datos.id_trade = json.id_trade;
        trade.archivado = true;
        trade.archivadoPreviamente = true;
        save();
        mostrarToast(`✅ Trade guardado · ID ${json.id_trade}`, "exito");
    }
}

// ==================== HOME ====================
function showHome() {
    const list = get("listaPares");
    if (!list) return;

    list.innerHTML = "";
    trades.filter(t => !t.archivado).forEach((t, i) => {
        const d = document.createElement("div");
        d.className = "par";
        d.innerHTML = `<b>${t.nombre}</b>`;
        d.onclick = () => abrirForm(i);
        list.appendChild(d);
    });
}

function abrirForm(i) {
    currentIdx = i;
    const t = trades[i];
    get("tituloPar").textContent = t.nombre;
    Object.keys(t.datos).forEach(k => {
        const el = get(k);
        if (el) el.value = t.datos[k] || "";
    });
}

// ==================== GLOBALES ====================
window.guardarPar = guardarPar;
window.archivarPar = archivarPar;
window.exportarBackup = exportarBackup;
