import { db } from './firebaseConfig.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Asegúrate de que jsPDF esté disponible globalmente (inclúyelo en tu index.html)
export async function generarReciboPDF(pagoId) {
    const { jsPDF } = window.jspdf;

    // Busca el pago en Firestore
    const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
    if (!pagoDoc.exists()) return alert("Pago no encontrado");
    const pago = pagoDoc.data();

    // Busca el inquilino
    const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
    const inquilino = inquilinoDoc.exists() ? inquilinoDoc.data() : {};

    // Busca el inmueble
    const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
    const inmueble = inmuebleDoc.exists() ? inmuebleDoc.data() : {};

    // Crea el PDF (usa otro nombre, por ejemplo 'pdf')
    const pdf = new jsPDF();

    // Opcional: Logo (debes tener una imagen base64 o URL pública)
    // pdf.addImage('data:image/png;base64,...', 'PNG', 15, 10, 30, 15);

    // Encabezado
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("RECIBO DE PAGO DE RENTA", 105, 25, { align: "center" });

    // Línea separadora
    pdf.setDrawColor(60, 60, 60);
    pdf.line(20, 30, 190, 30);

    // Datos principales
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    let y = 40;
    pdf.text(`Folio: ${pagoId}`, 20, y);
    pdf.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 140, y);

    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Datos del Inquilino", 20, y);
    pdf.setFont("helvetica", "normal");
    y += 7;
    pdf.text(`Nombre: ${inquilino.nombre || ''}`, 25, y);
    y += 7;
    pdf.text(`Teléfono: ${inquilino.telefono || ''}`, 25, y);

    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Datos del Inmueble", 20, y);
    pdf.setFont("helvetica", "normal");
    y += 7;
    pdf.text(`Nombre: ${inmueble.nombre || ''}`, 25, y);
    y += 7;
    pdf.text(`Dirección: ${inmueble.direccion || ''}`, 25, y);

    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Detalle del Pago", 20, y);
    pdf.setFont("helvetica", "normal");
    y += 7;
    pdf.text(`Mes: ${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`, 25, y);
    y += 7;
    pdf.text(`Monto total: $${(pago.montoTotal || 0).toFixed(2)}`, 25, y);
    y += 7;
    pdf.text(`Monto pagado: $${(pago.montoPagado || 0).toFixed(2)}`, 25, y);
    y += 7;
    pdf.text(`Saldo pendiente: $${(pago.saldoPendiente || 0).toFixed(2)}`, 25, y);
    y += 7;
    pdf.text(`Fecha de pago: ${pago.fechaPago || pago.fechaRegistro || ''}`, 25, y);
    y += 7;
    pdf.text(`Estado: ${pago.estado}`, 25, y);

    // Firma y agradecimiento
    y += 20;
    pdf.setFont("helvetica", "italic");
    pdf.text("_________________________", 140, y);
    pdf.text("Firma y sello", 155, y + 7);
    y += 15;
    pdf.setFont("helvetica", "normal");
    pdf.text("¡Gracias por su pago!", 105, y, { align: "center" });

    // Descarga el PDF
    pdf.save(`Recibo_${pago.mesCorrespondiente}_${pago.anioCorrespondiente}.pdf`);
}

window.generarReciboPDF = generarReciboPDF;