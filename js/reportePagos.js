
import { mostrarNotificacion } from './ui.js';

// Asegúrate de que jsPDF y jsPDF-AutoTable estén disponibles globalmente

export function generarReportePagosPDF(pagosFiltrados) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF.autoTable) {
        mostrarNotificacion("La librería jsPDF-AutoTable no está cargada.", "error");
        return;
    }

    if (!pagosFiltrados || pagosFiltrados.length === 0) {
        mostrarNotificacion("No hay datos para generar el reporte.", "warning");
        return;
    }

    try {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'letter'
        });

        // Encabezado
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("Reporte de Historial de Pagos", doc.internal.pageSize.getWidth() / 2, 13, { align: "center" });

        const tableColumn = ["Inmueble", "Inquilino", "Monto Total", "Monto Pagado", "Saldo Pendiente", "Estado", "Mes", "Año"];
        const tableRows = [];

        pagosFiltrados.forEach(pago => {
            const pagoData = [
                pago.nombreInmueble,
                pago.nombreInquilino,
                pago.montoTotal ? pago.montoTotal.toFixed(2) : '0.00',
                pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00',
                pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00',
                pago.estado,
                pago.mesCorrespondiente,
                pago.anioCorrespondiente
            ];
            tableRows.push(pagoData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                cellPadding: 2,
                fontSize: 8,
                valign: 'middle',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'left' }
            }
        });

        const fecha = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
        doc.save(`Reporte_Pagos_${fecha}.pdf`);

        mostrarNotificacion("Reporte de pagos generado exitosamente.", "success");

    } catch (error) {
        console.error("Error al generar el reporte PDF:", error);
        mostrarNotificacion("Error al generar el reporte PDF.", "error");
    }
}
