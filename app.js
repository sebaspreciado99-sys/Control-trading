document.addEventListener('DOMContentLoaded', function() {
    const formTrading = document.getElementById('form-trading');
    const tradingTableBody = document.querySelector('#trading-table tbody');
    const btnGuardar = document.getElementById('btn-guardar');

    // Inicializar la tabla al cargar la página
    google.script.run.withSuccessHandler(actualizarTabla).obtenerDatos();

    // Event listener para el envío del formulario
    formTrading.addEventListener('submit', guardarTrading);

    function guardarTrading(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const tradingData = {};

        // Convertir FormData a un objeto plano
        for (let [key, value] of formData.entries()) {
            tradingData[key] = value;
        }

        // Asegurarse de que el ID oculto se incluye si existe y no está vacío
        const hiddenIdInput = document.getElementById('tradingId');
        if (hiddenIdInput && hiddenIdInput.value) {
            tradingData.ID = hiddenIdInput.value; // Coincide con 'ID' en Sheets
        } else {
            // Si es un nuevo registro, asegura que no se envíe un ID vacío
            delete tradingData.ID; 
        }

        // Llamar a la función de Apps Script para crear o actualizar
        google.script.run.withSuccessHandler(actualizarTabla).crearOActualizarTrading(tradingData);

        // Resetear el formulario y el botón después de guardar/actualizar
        form.reset();
        if (hiddenIdInput) {
            hiddenIdInput.value = ''; // Limpiar el ID oculto
        }
        btnGuardar.textContent = 'Guardar Trading'; // Restablecer el texto del botón
    }

    function actualizarTabla(data) {
        tradingTableBody.innerHTML = ''; // Limpiar la tabla existente
        data.forEach(trading => {
            const row = tradingTableBody.insertRow();
            
            // Asegúrate de que los nombres de las propiedades aquí coinciden con los encabezados de tu Sheet
            // y con cómo los devuelve obtenerDatos()
            row.insertCell().textContent = trading.ID || ''; 
            row.insertCell().textContent = trading.Fecha || '';
            row.insertCell().textContent = trading['Par de Moneda'] || '';
            row.insertCell().textContent = trading.Monto || '';
            row.insertCell().textContent = trading.Accion || '';
            row.insertCell().textContent = trading['Precio de Entrada'] || '';
            row.insertCell().textContent = trading['Precio de Salida'] || '';
            row.insertCell().textContent = trading['Stop Loss'] || '';
            row.insertCell().textContent = trading['Take Profit'] || '';
            row.insertCell().textContent = trading['Resultado ($)'] || '';
            row.insertCell().textContent = trading['Comisión ($)'] || '';
            row.insertCell().textContent = trading.Notas || '';
            row.insertCell().textContent = trading['URL Captura'] || '';

            const accionesCell = row.insertCell();
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.classList.add('btn-action', 'btn-edit');
            btnEditar.onclick = () => cargarFormulario(trading.ID); // Pasa el ID
            accionesCell.appendChild(btnEditar);

            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = 'Eliminar';
            btnEliminar.classList.add('btn-action', 'btn-delete');
            btnEliminar.onclick = () => eliminarTrading(trading.ID); // Pasa el ID
            accionesCell.appendChild(btnEliminar);
        });
    }

    function cargarFormulario(id) {
        google.script.run.withSuccessHandler(function(trading) {
            if (trading) {
                // Rellenar el formulario con los datos del trading encontrado
                document.getElementById('fecha').value = trading.Fecha || '';
                document.getElementById('moneda').value = trading['Par de Moneda'] || '';
                document.getElementById('monto').value = trading.Monto || '';
                document.getElementById('accion').value = trading.Accion || '';
                document.getElementById('p_entrada').value = trading['Precio de Entrada'] || '';
                document.getElementById('p_salida').value = trading['Precio de Salida'] || '';
                document.getElementById('stoploss').value = trading['Stop Loss'] || '';
                document.getElementById('take_profit').value = trading['Take Profit'] || '';
                document.getElementById('resultado').value = trading['Resultado ($)'] || '';
                document.getElementById('comision').value = trading['Comisión ($)'] || '';
                document.getElementById('notas').value = trading.Notas || '';
                document.getElementById('captura').value = trading['URL Captura'] || '';
                
                // ¡IMPORTANTE! Asignar el ID al campo oculto para que sepa qué registro actualizar
                document.getElementById('tradingId').value = trading.ID;

                btnGuardar.textContent = 'Actualizar Trading'; // Cambiar texto del botón
            } else {
                console.error("No se encontró el trading con ID:", id);
                alert("Error: No se pudo cargar el trading para editar.");
            }
        }).buscarTrading(id);
    }

    function eliminarTrading(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este registro de trading?')) {
            google.script.run.withSuccessHandler(actualizarTabla).eliminarTrading(id);
        }
    }
});
