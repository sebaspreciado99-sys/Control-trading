function doPost(e) {
  return doGet(e);
}

function doGet(e) {
  try {
    // ==================== 0. DIAGNÓSTICO COMPLETO (INICIO) ====================
    console.log("🔍 === INICIO DIAGNÓSTICO COMPLETO ===");
    console.log("📥 Tipo de evento recibido:", typeof e);
    console.log("📥 Evento completo:", JSON.stringify(e));
    
    if (!e) {
      console.log("❌ NO se recibió NINGÚN evento 'e'");
      console.log("⚠️ Esto pasa cuando ejecutas manualmente desde el editor");
      console.log("✅ Cuando tu app.js llame a la URL, SÍ recibirá 'e'");
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'diagnostico',
          message: 'Modo diagnóstico activado',
          problema: 'No se recibió evento (ejecución manual)',
          solucion: 'Tu app.js SÍ enviará el evento cuando use la URL'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!e.parameter) {
      console.log("⚠️ Se recibió evento PERO sin parámetros 'parameter'");
      console.log("📤 Parámetros disponibles en 'e':", Object.keys(e));
      
      // Intentar obtener parámetros de otras formas
      if (e.queryString) {
        console.log("🔗 Query string recibida:", e.queryString);
        // Parsear manualmente
        const params = {};
        e.queryString.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) params[key] = decodeURIComponent(value);
        });
        console.log("🔄 Parámetros parseados:", params);
        e.parameter = params; // Asignar para continuar
      }
    }
    
    if (e.parameter) {
      console.log("✅ PARÁMETROS RECIBIDOS CORRECTAMENTE:");
      console.log("----------------------------------------");
      for (let key in e.parameter) {
        console.log(`  ${key}: "${e.parameter[key]}" (tipo: ${typeof e.parameter[key]})`);
      }
      console.log("----------------------------------------");
      
      // VERIFICACIONES ESPECÍFICAS
      const tieneID = e.parameter.id !== undefined && e.parameter.id !== '';
      const tieneAccion = e.parameter.accion !== undefined;
      const idValido = tieneID && e.parameter.id !== '0' && e.parameter.id !== 0;
      
      console.log(`📋 VERIFICACIÓN:`);
      console.log(`  • ¿Tiene campo 'id'?: ${tieneID ? '✅ SÍ' : '❌ NO'}`);
      console.log(`  • ¿Tiene campo 'accion'?: ${tieneAccion ? '✅ SÍ' : '❌ NO'}`);
      console.log(`  • ¿ID es válido (no 0)?: ${idValido ? '✅ SÍ' : '❌ NO'}`);
      
      if (!tieneID) {
        console.log("❌ PROBLEMA CRÍTICO: No se recibió 'id'");
        console.log("   Esto explica por qué se crean nuevos trades siempre");
        console.log("   SOLUCIÓN: Revisa que app.js envíe 'id' en los parámetros");
      }
      
      if (tieneID && !idValido) {
        console.log("❌ PROBLEMA CRÍTICO: ID recibido es 0 o vacío");
        console.log("   ID recibido:", e.parameter.id);
        console.log("   SOLUCIÓN: app.js debe generar ID con Date.now()");
      }
      
      if (tieneAccion) {
        console.log(`  • Valor de 'accion': "${e.parameter.accion}"`);
        console.log(`  • ¿Es 'actualizar'?: ${e.parameter.accion === 'actualizar' ? '✅ SÍ' : '❌ NO'}`);
      }
    }
    
    console.log("🔍 === FIN DIAGNÓSTICO ===\n");
    
    // Si estamos en modo diagnóstico puro, retornar info
    if (e.parameter && e.parameter.modo === 'diagnostico') {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'diagnostico_completo',
          timestamp: new Date().toISOString(),
          parametros_recibidos: e.parameter,
          advertencias: [
            !e.parameter.id ? "Falta parámetro 'id'" : null,
            e.parameter.id === '0' ? "ID es 0 (inválido)" : null,
            !e.parameter.accion ? "Falta parámetro 'accion'" : null
          ].filter(w => w !== null)
        }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==================== 1. SI NO HAY PARÁMETROS, SALIR ====================
    if (!e.parameter || Object.keys(e.parameter).length === 0) {
      console.error("❌ ERROR: No se recibieron parámetros para procesar");
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'No se recibieron datos',
          diagnostico: 'app.js no está enviando parámetros o hay error en la URL'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==================== 2. CONFIGURACIÓN ====================
    const spreadsheetId = "15Yl9SxH599rmH54bCJl36WEqb1TbbeWHsHGxg4U2mIA";
    const sheetName = "Control de comercio";
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName(sheetName);
    
    // Crear hoja si no existe
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "ID_Trade", "PAR", "FECHA", "HORA", "TIPO", "GATILLO", 
        "SL", "TP", "RATIO", "MAX RATIO", "RESULTADO", "DURACIÓN", 
        "DIARIO", "HORARIO", "PORCENTAJE", "R NEGATIVO", "R POSITIVO"
      ]);
      
      const headerRange = sheet.getRange(1, 1, 1, 17);
      headerRange.setBackground("#0f172a")
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setHorizontalAlignment("center");
      
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, 17);
      
      return ContentService
        .createTextOutput("EXITO: Hoja creada inicialmente")
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    // ==================== 3. OBTENER Y VALIDAR DATOS ====================
    const params = e.parameter;
    
    // VALIDACIÓN CRÍTICA DEL ID
    const tradeId = params.id || '';
    const idValidoParaGuardar = tradeId && tradeId !== '0' && tradeId !== 0 && tradeId.toString().trim() !== '';
    
    if (!idValidoParaGuardar) {
      console.error("❌ ERROR: ID inválido para guardar:", tradeId);
      console.error("   Esto creará un 0 en la columna A");
      
      // Generar un ID de emergencia
      const idEmergencia = Date.now();
      console.log("   Usando ID de emergencia:", idEmergencia);
      
      // Sobrescribir el ID inválido
      params.id = idEmergencia;
    }
    
    const esUnaActualizacion = params.accion === 'actualizar';
    
    console.log(`🔄 PROCESANDO: ID=${params.id}, Acción=${params.accion || 'nueva'}, Actualización=${esUnaActualizacion}`);
    
    // ==================== 4. PREPARAR DATOS ====================
    const rowData = [
      params.id,                          // Columna A: ID_Trade
      params.par || '',                   // Columna B: PAR
      params.fecha || '',                 // Columna C: FECHA
      params.hora || '',                  // Columna D: HORA
      params.tipo || '',                  // Columna E: TIPO
      params.gatillo || '',               // Columna F: GATILLO
      params.sl || '',                    // Columna G: SL
      params.tp || '',                    // Columna H: TP
      params.ratio || '',                 // Columna I: RATIO
      params.maxRatio || '',              // Columna J: MAX RATIO
      params.resultado || '',             // Columna K: RESULTADO
      params.duracion || '',              // Columna L: DURACIÓN
      params.diario || '',                // Columna M: DIARIO
      params.horario || '',               // Columna N: HORARIO
      params.porcentaje || '',            // Columna O: PORCENTAJE
      params.rNegativo || '',             // Columna P: R NEGATIVO
      params.rPositivo || ''              // Columna Q: R POSITIVO
    ];
    
    // ==================== 5. LÓGICA: BUSCAR O CREAR ====================
    // INTENTAR ACTUALIZAR SI ES RESTABLECER Y HAY ID VÁLIDO
    if (esUnaActualizacion && params.id) {
      console.log(`🔍 BUSCANDO trade existente con ID: ${params.id}`);
      
      const lastRow = sheet.getLastRow();
      
      if (lastRow > 1) {
        const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
        const idValues = idRange.getValues();
        
        let filaEncontrada = -1;
        
        for (let i = 0; i < idValues.length; i++) {
          if (idValues[i][0] == params.id) {
            filaEncontrada = i + 2;
            console.log(`✅ ENCONTRADO en fila ${filaEncontrada}`);
            break;
          }
        }
        
        if (filaEncontrada > 0) {
          const rango = sheet.getRange(filaEncontrada, 1, 1, rowData.length);
          rango.setValues([rowData]);
          
          console.log(`✓ ACTUALIZADO trade en fila ${filaEncontrada}`);
          
          return ContentService
            .createTextOutput(`EXITO: Trade actualizado en fila ${filaEncontrada}`)
            .setMimeType(ContentService.MimeType.TEXT);
        } else {
          console.log(`⚠️ NO ENCONTRADO ID ${params.id}, se creará NUEVO`);
        }
      }
    }
    
    // ==================== 6. CREAR NUEVA FILA ====================
    console.log(`📝 CREANDO NUEVA FILA para ID: ${params.id}`);
    
    const ultimaFila = sheet.getLastRow();
    const nuevaFila = ultimaFila + 1;
    
    const rango = sheet.getRange(nuevaFila, 1, 1, rowData.length);
    rango.setValues([rowData]);
    
    // Formatear
    if (nuevaFila % 2 === 0) {
      rango.setBackground("#f8fafc");
    } else {
      rango.setBackground("#ffffff");
    }
    
    if (params.resultado) {
      const res = params.resultado.toUpperCase();
      if (res.includes("WIN")) {
        rango.setBackground("#dcfce7").setFontColor("#14532d");
      } else if (res.includes("LOSS")) {
        rango.setBackground("#fee2e2").setFontColor("#7f1d1d");
      }
    }
    
    console.log(`✅ NUEVO trade creado en fila ${nuevaFila} con ID: ${params.id}`);
    
    // ==================== 7. RESPUESTA ====================
    const mensaje = esUnaActualizacion 
      ? `EXITO: Trade ID ${params.id} no encontrado. Se creó NUEVO en fila ${nuevaFila}` 
      : `EXITO: Nuevo trade guardado en fila ${nuevaFila}`;
    
    return ContentService
      .createTextOutput(mensaje)
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    console.error("❌ ERROR CRÍTICO en doGet:", error);
    console.error("Stack:", error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error_critico',
        message: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== FUNCIÓN: TESTEAR COMUNICACIÓN ====================
function testearComunicacionAppJS() {
  console.log("🧪 TESTEANDO COMUNICACIÓN CON APP.JS");
  
  // Simular lo que debería enviar app.js
  const tests = [
    {
      nombre: "Test 1 - Nuevo trade normal",
      params: {
        id: Date.now(),
        par: "EURUSD",
        fecha: "2024-02-15",
        hora: "10:30",
        tipo: "COMPRA",
        resultado: "WIN"
      }
    },
    {
      nombre: "Test 2 - Restablecer (actualizar)",
      params: {
        id: Date.now() - 1000, // ID diferente
        accion: "actualizar",
        par: "EURUSD",
        fecha: "2024-02-15",
        hora: "11:45",
        tipo: "COMPRA",
        resultado: "WIN ACTUALIZADO"
      }
    },
    {
      nombre: "Test 3 - ID inválido (0)",
      params: {
        id: "0",
        par: "GBPUSD",
        fecha: "2024-02-15",
        resultado: "LOSS"
      }
    }
  ];
  
  tests.forEach((test, index) => {
    console.log(`\n🔬 ${test.nombre}:`);
    console.log("Parámetros:", test.params);
    
    const eventoSimulado = { parameter: test.params };
    try {
      const resultado = doGet(eventoSimulado);
      console.log("Resultado:", resultado.getContent());
    } catch (error) {
      console.error("Error en test:", error);
    }
  });
  
  return "Tests completados. Revisa logs.";
}

// ==================== FUNCIÓN: LIMPIAR Y VER HOJA ====================
function limpiarYVerHoja() {
  try {
    const ss = SpreadsheetApp.openById("15Yl9SxH599rmH54bCJl36WEqb1TbbeWHsHGxg4U2mIA");
    const sheet = ss.getSheetByName("Control de comercio");
    
    if (!sheet) return "Hoja no existe";
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    let info = "📊 ESTADO ACTUAL DE LA HOJA:\n";
    info += `Filas: ${lastRow}, Columnas: ${lastCol}\n\n`;
    
    // Ver encabezados
    const headers = sheet.getRange(1, 1, 1, Math.min(lastCol, 17)).getValues()[0];
    info += "Encabezados: " + headers.join(", ") + "\n\n";
    
    // Ver primeros datos
    if (lastRow > 1) {
      const sampleRows = Math.min(lastRow, 6);
      const data = sheet.getRange(1, 1, sampleRows, Math.min(lastCol, 5)).getValues();
      
      info += "Primeras filas:\n";
      data.forEach((row, i) => {
        info += `Fila ${i+1}: ${row.slice(0, 3).join(" | ")}...\n`;
      });
      
      // Ver IDs en columna A
      info += "\n🔍 IDs en columna A:\n";
      const ids = sheet.getRange(2, 1, lastRow-1, 1).getValues();
      const idsUnicos = new Set();
      const idsProblema = [];
      
      ids.forEach((idCell, index) => {
        const id = idCell[0];
        if (!id || id === 0 || id === '0') {
          idsProblema.push(`Fila ${index+2}: ${id}`);
        } else if (idsUnicos.has(id)) {
          idsProblema.push(`Fila ${index+2}: ${id} (DUPLICADO)`);
        } else {
          idsUnicos.add(id);
        }
      });
      
      info += `• IDs únicos: ${idsUnicos.size}\n`;
      info += `• IDs con problemas: ${idsProblema.length}\n`;
      
      if (idsProblema.length > 0) {
        info += "\n❌ PROBLEMAS ENCONTRADOS:\n";
        idsProblema.slice(0, 5).forEach(p => info += p + "\n");
        if (idsProblema.length > 5) info += `... y ${idsProblema.length-5} más\n`;
      }
    }
    
    console.log(info);
    return info;
    
  } catch (error) {
    return "Error: " + error.toString();
  }
}

// ==================== FUNCIÓN: VER URL DE DESPLIEGUE ====================
function verUrlDespliegue() {
  try {
    // Obtener URL del despliegue web actual
    const projectId = ScriptApp.getScriptId();
    const url = `https://script.google.com/macros/s/${projectId}/exec`;
    
    console.log("🌐 URL ACTUAL DE LA APLICACIÓN WEB:");
    console.log(url);
    console.log("\n📋 CÓMO USAR:");
    console.log("1. Copia esta URL");
    console.log("2. Pégala en app.js como URL_SHEETS");
    console.log("3. Asegúrate de que el despliegue sea público");
    
    return url;
  } catch (error) {
    return "Error obteniendo URL: " + error;
  }
}

// ==================== MENÚ ====================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 DIAGNÓSTICO Trading')
    .addItem('🔍 Ver estado hoja', 'limpiarYVerHoja')
    .addItem('🧪 Testear comunicación', 'testearComunicacionAppJS')
    .addItem('🌐 Ver URL actual', 'verUrlDespliegue')
    .addSeparator()
    .addItem('📋 Ayuda', 'mostrarAyudaCompleta')
    .addToUi();
}

function mostrarAyudaCompleta() {
  const ayuda = `🚀 DIAGNÓSTICO COMPLETO - PASOS:

1. EJECUTAR DESDE EDITOR:
   • Selecciona "testearComunicacionAppJS"
   • Haz clic en Ejecutar
   • Revisa los LOGS (Ver > Logs)

2. VER QUÉ PASA CON APP.JS:
   • Ejecuta "Ver URL actual"
   • Copia esa URL
   • En app.js, actualiza URL_SHEETS

3. PROBAR DESDE TU APP:
   • Crea un trade en tu app web
   • Archívalo
   • Vuelve a EDITOR > Ver > Logs
   • Debes ver los parámetros que llegan

4. VERIFICAR PROBLEMAS:
   • Si 'id' es 0 o vacío → Problema en app.js
   • Si no llega 'accion' → No se envía al restablecer
   • Si se crea nuevo siempre → ID no se encuentra en hoja

SOLUCIONES COMUNES:
• app.js debe usar: id: Date.now()
• Al restablecer, enviar: accion: 'actualizar'
• Google Sheets debe tener IDs únicos en columna A

CONTACTO:
Sistema en diagnóstico. Revisa logs después de cada acción.`;
  
  SpreadsheetApp.getUi().alert('Ayuda Diagnóstico', ayuda, SpreadsheetApp.getUi().ButtonSet.OK);
}

function onInstall() {
  onOpen();
}
