import { db } from './firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Asegúrate de que jsPDF esté disponible globalmente (inclúyelo en tu index.html)
export async function generarReciboPDF(pagoId) {
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
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text("RECIBO DE PAGO DE RENTA", 108, 13, { align: "center" });

    // --- Cuerpo del recibo ---
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
    pdf.save(`Recibo_${pago.mesCorrespondiente}_${pago.anioCorrespondiente}.pdf`);
}

window.generarReciboPDF = generarReciboPDF;