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

    // --- Configuración de tamaño: ancho carta, alto 100mm (~1/3 carta) ---
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [215.9, 140] // ancho carta, alto 100mm
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
    pdf.text(`Folio: ${pagoId}`, 10, y);
    pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 170, y);

    y += 8;
    pdf.setDrawColor(37, 99, 235);
    pdf.line(10, y, 205, y);

    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(55, 65, 81);
    pdf.text("Inquilino:", 12, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55, 65, 81);
    pdf.text(`${inquilino.nombre || ''}`, 40, y);
    y += 6;

    pdf.setFont("helvetica", "bold");
    pdf.text("Inmueble:", 12, y);
    pdf.setFont("helvetica", "normal");
    // Maneja nombres largos
    let inmuebleNombre = pdf.splitTextToSize(`${inmueble.nombre || ''}`, 60);
    pdf.text(inmuebleNombre, 40, y);
    y += 6 * inmuebleNombre.length;

    pdf.setFont("helvetica", "bold");
    pdf.text("Dirección:", 12, y);
    pdf.setFont("helvetica", "normal");
    // Maneja direcciones largas
    let direccion = pdf.splitTextToSize(`${inmueble.direccion || ''}`, 120);
    pdf.text(direccion, 40, y);
    y += 6 * direccion.length;

    y += 8;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(10, y, 205, y);

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(37, 99, 235);
    pdf.text("Detalle del Pago", 12, y);

    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55, 65, 81);
    pdf.text(`Mes:`, 15, y);
    pdf.text(`${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`, 45, y);
    y += 6;
    pdf.text(`Monto total:`, 15, y);
    pdf.text(`$${(pago.montoTotal || 0).toFixed(2)}`, 45, y);
    y += 6;
    pdf.text(`Monto pagado:`, 15, y);
    pdf.text(`$${(pago.montoPagado || 0).toFixed(2)}`, 45, y);
    y += 6;
    pdf.text(`Saldo pendiente:`, 15, y);
    pdf.text(`$${(pago.saldoPendiente || 0).toFixed(2)}`, 45, y);
    y += 6;
    pdf.text(`Fecha de pago:`, 15, y);
    pdf.text(`${pago.fechaPago || pago.fechaRegistro || ''}`, 45, y);
    y += 6;
    pdf.text(`Estado:`, 15, y);
    pdf.text(`${pago.estado}`, 45, y);

    // --- Firma y agradecimiento ---
    y += 18;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(140, y, 200, y);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    pdf.text("Firma y sello", 170, y + 5, { align: "center" });

    y += 15;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(37, 99, 235);
    pdf.text("¡Gracias por su pago!", 108, y, { align: "center" });

    // --- Descargar PDF ---
    pdf.save(`Recibo_${pago.mesCorrespondiente}_${pago.anioCorrespondiente}.pdf`);
}

window.generarReciboPDF = generarReciboPDF;