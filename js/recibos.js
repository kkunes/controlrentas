import { db } from './firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";



window.seleccionarFirmaYGenerarRecibo = function (pagoId) {
    const modalHtml = `
        <div class="p-6">
            <h3 class="text-xl font-semibold mb-4 text-center text-gray-700">Selecciona una firma para el recibo</h3>
            <div class="flex flex-col items-center gap-6">
                <div class="flex gap-4">
                    <button class="firma-option" data-firma="firmaCarlos.png">
                        <img src="./img/firmaCarlos.png" alt="Firma Carlos" class="h-20 border rounded shadow hover:ring-2 ring-blue-500">
                        <p class="mt-2 text-sm text-center text-gray-600">Carlos</p>
                    </button>
                    <button class="firma-option" data-firma="firmaKarla.png">
                        <img src="./img/firmaKarla.png" alt="Firma Karla" class="h-20 border rounded shadow hover:ring-2 ring-blue-500">
                        <p class="mt-2 text-sm text-center text-gray-600">Karla</p>
                    </button>
                </div>
                <button class="mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium firma-option" data-firma="">Usar sin firma</button>
            </div>
        </div>
    `;

    const modalContenedor = document.createElement('div');
    modalContenedor.id = 'modalFirma';
    modalContenedor.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    modalContenedor.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg w-full max-w-md relative animate-fade-in">
            <button id="cerrarModalFirma" class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">×</button>
            ${modalHtml}
        </div>
    `;
    document.body.appendChild(modalContenedor);

    document.getElementById('cerrarModalFirma').addEventListener('click', () => {
        document.body.removeChild(modalContenedor);
    });

    document.querySelectorAll('.firma-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const firma = btn.getAttribute('data-firma');
            document.body.removeChild(modalContenedor);
            generarReciboPDF(pagoId, firma);
        });
    });
};




// Asegúrate de que jsPDF esté disponible globalmente (inclúyelo en tu index.html)
export async function generarReciboPDF(pagoId, firma = '') {
    const { jsPDF } = window.jspdf;

    // --- Datos ---
    const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
    if (!pagoDoc.exists()) return alert("Pago no encontrado");
    const pago = pagoDoc.data();
    const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
    const inquilino = inquilinoDoc.exists() ? inquilinoDoc.data() : {};
    const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
    const inmueble = inmuebleDoc.exists() ? inmuebleDoc.data() : {};

    // --- Calcula el periodo cubierto por el pago ---
    let periodoTexto = "";

    if (inquilino.fechaOcupacion && pago.mesCorrespondiente && pago.anioCorrespondiente) {
        // Detecta formato y extrae día, mes, año correctamente
        let diaInicio = 1, mesInicio = 0, anioInicio = 2000;
        if (inquilino.fechaOcupacion.includes('/')) {
            // Formato DD/MM/YYYY
            const partes = inquilino.fechaOcupacion.split('/');
            diaInicio = parseInt(partes[0]);
            mesInicio = parseInt(partes[1]) - 1; // JS: 0=enero
            anioInicio = parseInt(partes[2]);
        } else if (inquilino.fechaOcupacion.includes('-')) {
            // Formato YYYY-MM-DD
            const partes = inquilino.fechaOcupacion.split('-');
            anioInicio = parseInt(partes[0]);
            mesInicio = parseInt(partes[1]) - 1;
            diaInicio = parseInt(partes[2]);
        }

        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const mesPagoIdx = meses.findIndex(m => m.toLowerCase() === pago.mesCorrespondiente.toLowerCase());
        const anioPago = parseInt(pago.anioCorrespondiente);

        // Fecha de inicio: día de ocupación, mes/año del pago
        const fechaInicio = new Date(anioPago, mesPagoIdx, diaInicio);

        // Fecha de fin: un día antes del mismo día del mes siguiente
        let mesFin = mesPagoIdx + 1;
        let anioFin = anioPago;
        if (mesFin > 11) { mesFin = 0; anioFin++; }
        const fechaFin = new Date(anioFin, mesFin, diaInicio);
        fechaFin.setDate(fechaFin.getDate() - 1);

        // Formatea las fechas
        const opciones = { day: '2-digit', month: 'long', year: 'numeric' };
        const inicioStr = fechaInicio.toLocaleDateString('es-MX', opciones);
        const finStr = fechaFin.toLocaleDateString('es-MX', opciones);

        periodoTexto = `${inicioStr} al ${finStr}`;
    }

    // --- Configuración de tamaño: ancho carta, alto 100mm (~1/3 carta) ---
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [215.9, 100] // ancho carta, alto 100mm
    });

    // --- Fondo suave ---
    pdf.setFillColor(245, 247, 255);
    pdf.rect(0, 0, 215.9, 100, "F");

    // --- Encabezado color ---
    pdf.setFillColor(37, 99, 235); // azul
    pdf.rect(0, 0, 215.9, 20, "F");

    // --- Icono de renta (casa) ---
    const iconoImg = new Image();
    iconoImg.src = './img/iconoRenta.png';
    iconoImg.onload = () => {
        pdf.addImage(iconoImg, 'PNG', 12, 4, 12, 12); // x, y, width, height

        // --- Título centrado ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.text("RECIBO DE PAGO DE RENTA", 108, 13, { align: "center" });

        // --- Subtítulo elegante ---
        pdf.setFontSize(10);
        pdf.setTextColor(220, 220, 255);
        pdf.text("Control de Rentas", 108, 18, { align: "center" });

        // --- Resto del recibo ---
        dibujarCuerpo();
    };

    // Si la imagen tarda en cargar, dibuja el cuerpo después
    function dibujarCuerpo() {
        let y = 26;
        pdf.setFontSize(11);
        pdf.setTextColor(37, 99, 235);
        pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 170, y);

        // --- Servicios pagados (arriba de la línea, posición fija) ---
        let serviciosTexto = '';
        if (pago.serviciosPagados && typeof pago.serviciosPagados === 'object') {
            const servicios = [];
            for (const key in pago.serviciosPagados) {
                if (key.endsWith('Monto')) continue; // Saltar los montos, los usamos abajo
                if (pago.serviciosPagados[key] === true) {
                    // Busca el monto correspondiente
                    const montoKey = key + 'Monto';
                    const monto = pago.serviciosPagados[montoKey];
                    servicios.push(`${key.charAt(0).toUpperCase() + key.slice(1)}${monto ? `: $${parseFloat(monto).toFixed(2)}` : ''}`);
                }
            }
            serviciosTexto = servicios.join('   |   ');
            if (serviciosTexto) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(37, 99, 235);
                let serviciosLineas = pdf.splitTextToSize(serviciosTexto, 80); // ancho más pequeño
                pdf.text(serviciosLineas, 12, y); // X=12 (izquierda), Y=y (misma línea que la fecha)
            }
        }

        // La línea y el bloque de inquilino siempre en la misma posición
        let yLinea = y + 10; // Fijo, no depende de si hay servicios o no

        pdf.setDrawColor(37, 99, 235);
        pdf.line(10, yLinea, 205, yLinea);

        let yIzq = yLinea + 7;   // Para la columna izquierda
        let yDer = yLinea + 7;   // Para la columna derecha
        const xIzq = 12;
        const xDer = 100; // <-- Antes 120, ahora más a la izquierda

        // --- Columna izquierda: Inquilino e inmueble ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(55, 65, 81);
        pdf.text("Inquilino:", xIzq, yIzq);
        pdf.setFont("helvetica", "normal");
        let inquilinoNombre = pdf.splitTextToSize(`${inquilino.nombre || ''}`, 80);
        pdf.text(inquilinoNombre, xIzq + 28, yIzq);
        yIzq += 6 * inquilinoNombre.length;

        pdf.setFont("helvetica", "bold");
        pdf.text("Inmueble:", xIzq, yIzq);
        pdf.setFont("helvetica", "normal");
        let inmuebleNombre = pdf.splitTextToSize(`${inmueble.nombre || ''}`, 80);
        pdf.text(inmuebleNombre, xIzq + 28, yIzq);
        yIzq += 6 * inmuebleNombre.length;

        pdf.setFont("helvetica", "bold");
        pdf.text("Dirección:", xIzq, yIzq);
        pdf.setFont("helvetica", "normal");
        let direccion = pdf.splitTextToSize(`${inmueble.direccion || ''}`, 80);
        pdf.text(direccion, xIzq + 28, yIzq);
        yIzq += 6 * direccion.length;

        yIzq += 17; // Dos saltos de línea (2 x 6px)

        // Línea de firma
        pdf.setDrawColor(203, 213, 225);
        pdf.line(xIzq + 10, yIzq, xIzq + 80, yIzq);

        // Texto "Firma y sello"
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        pdf.text("Firma", xIzq + 45, yIzq + 5, { align: "center" });

         // --- AGREGAR FIRMA COMO IMAGEN SOLO SI SE SELECCIONÓ ---
        if (firma) {
            const firmaImg = new Image();
            firmaImg.src = './img/' + firma;

            firmaImg.onload = () => {
                // Agregar imagen encima de la línea de firma
                pdf.addImage(firmaImg, 'PNG', xIzq + 20, yIzq - 20, 40, 20); 
                // x, y, width, height

                // Mensaje de agradecimiento
                yIzq += 15;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(12);
                pdf.setTextColor(37, 99, 235);
                pdf.text("¡Gracias por su pago!", xIzq + 45, yIzq, { align: "center" });

                // --- Columna derecha: Detalle del Pago ---
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(37, 99, 235);
                pdf.text("Detalle del Pago", xDer, yDer);

                yDer += 7;
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(55, 65, 81);
                pdf.text(`Mes:`, xDer, yDer);
                pdf.text(`${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`, xDer + 35, yDer);
                yDer += 6;
                // Calcular el monto total sumando servicios pagados
                let montoTotal = pago.montoTotal || 0;
                if (pago.serviciosPagados) {
                    if (pago.serviciosPagados.internet && pago.serviciosPagados.internetMonto) {
                        montoTotal += pago.serviciosPagados.internetMonto;
                    }
                    if (pago.serviciosPagados.agua && pago.serviciosPagados.aguaMonto) {
                        montoTotal += pago.serviciosPagados.aguaMonto;
                    }
                    if (pago.serviciosPagados.luz && pago.serviciosPagados.luzMonto) {
                        montoTotal += pago.serviciosPagados.luzMonto;
                    }
                }
                pdf.text(`Monto total:`, xDer, yDer);
                pdf.text(`${montoTotal.toFixed(2)}`, xDer + 35, yDer);
                yDer += 6;
                pdf.text(`Monto pagado:`, xDer, yDer);
                pdf.text(`$${(pago.montoPagado || 0).toFixed(2)}`, xDer + 35, yDer);
                yDer += 6;
                pdf.text(`Saldo pendiente:`, xDer, yDer);
                pdf.text(`$${(pago.saldoPendiente || 0).toFixed(2)}`, xDer + 35, yDer);
                yDer += 6;
                pdf.text(`Fecha de pago:`, xDer, yDer);
                pdf.text(`${pago.fechaPago || pago.fechaRegistro || ''}`, xDer + 35, yDer);
                yDer += 6;
                pdf.text(`Estado:`, xDer, yDer);
                pdf.text(`${pago.estado}`, xDer + 35, yDer);
                yDer += 6;
                pdf.text(`Periodo:`, xDer, yDer);
                // Ajusta el periodo para que no se corte
                let periodoLineas = pdf.splitTextToSize(periodoTexto || 'N/A', 60);
                pdf.text(periodoLineas, xDer + 35, yDer);
                yDer += 6 * periodoLineas.length;

                // --- Descargar PDF ---
                // Limpiar el nombre del inmueble para usarlo en el nombre del archivo (quitar caracteres especiales)
                const nombreInmuebleLimpio = (inmueble.nombre || 'Inmueble').replace(/[^a-zA-Z0-9]/g, '_');
                pdf.save(`${nombreInmuebleLimpio}-${pago.mesCorrespondiente}-${pago.anioCorrespondiente}.pdf`);
            };
        } else {
            // Si no hay firma, solo finaliza y descarga el PDF
            finalizarPDF();
        }
    }

    function finalizarPDF() {
        // Mensaje de agradecimiento
        yIzq += 15;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(37, 99, 235);
        pdf.text("¡Gracias por su pago!", xIzq + 45, yIzq, { align: "center" });

        // --- Columna derecha: Detalle del Pago ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(37, 99, 235);
        pdf.text("Detalle del Pago", xDer, yDer);

        yDer += 7;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Mes:`, xDer, yDer);
        pdf.text(`${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`, xDer + 35, yDer);
        yDer += 6;
        // Calcular el monto total sumando servicios pagados
        let montoTotal = pago.montoTotal || 0;
        if (pago.serviciosPagados) {
            if (pago.serviciosPagados.internet && pago.serviciosPagados.internetMonto) {
                montoTotal += pago.serviciosPagados.internetMonto;
            }
            if (pago.serviciosPagados.agua && pago.serviciosPagados.aguaMonto) {
                montoTotal += pago.serviciosPagados.aguaMonto;
            }
            if (pago.serviciosPagados.luz && pago.serviciosPagados.luzMonto) {
                montoTotal += pago.serviciosPagados.luzMonto;
            }
        }
        pdf.text(`Monto total:`, xDer, yDer);
        pdf.text(`${montoTotal.toFixed(2)}`, xDer + 35, yDer);
        yDer += 6;
        pdf.text(`Monto pagado:`, xDer, yDer);
        pdf.text(`$${(pago.montoPagado || 0).toFixed(2)}`, xDer + 35, yDer);
        yDer += 6;
        pdf.text(`Saldo pendiente:`, xDer, yDer);
        pdf.text(`$${(pago.saldoPendiente || 0).toFixed(2)}`, xDer + 35, yDer);
        yDer += 6;
        pdf.text(`Fecha de pago:`, xDer, yDer);
        pdf.text(`${pago.fechaPago || pago.fechaRegistro || ''}`, xDer + 35, yDer);
        yDer += 6;
        pdf.text(`Estado:`, xDer, yDer);
        pdf.text(`${pago.estado}`, xDer + 35, yDer);
        yDer += 6;
        pdf.text(`Periodo:`, xDer, yDer);
        // Ajusta el periodo para que no se corte
        let periodoLineas = pdf.splitTextToSize(periodoTexto || 'N/A', 60);
        pdf.text(periodoLineas, xDer + 35, yDer);
        yDer += 6 * periodoLineas.length;

        // --- Descargar PDF ---
        // Limpiar el nombre del inmueble para usarlo en el nombre del archivo (quitar caracteres especiales)
        const nombreInmuebleLimpio = (inmueble.nombre || 'Inmueble').replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save(`${nombreInmuebleLimpio}-${pago.mesCorrespondiente}-${pago.anioCorrespondiente}.pdf`);
    }
}

window.generarReciboPDF = generarReciboPDF;