
// --- FUNCIONALIDAD DE CONSOLIDACIÓN HISTÓRICA ---
window.iniciarConsolidacion = async (inquilinoId, nombreInquilino) => {
    const diaAnterior = prompt(`❄️ CONSOLIDACIÓN HISTÓRICA ❄️\n\nEstás a punto de reparar los recibos antiguos de: ${nombreInquilino}.\n\nPor favor, ingresa el DÍA DE PAGO que tenía este inquilino ANTES del cambio (número del 1 al 31):`, "1");

    if (diaAnterior !== null) {
        const diaInt = parseInt(diaAnterior);
        if (isNaN(diaInt) || diaInt < 1 || diaInt > 31) {
            alert("⚠️ Por favor ingresa un día válido (1-31).");
            return;
        }

        if (confirm(`⚠️ ¿CONFIRMAS que el día de corte anterior era el día ${diaInt}?\n\nEsta acción buscará todos los recibos antiguos que no tengan fecha guardada y la fijará permanentemente usando el día ${diaInt}.`)) {
            mostrarLoader(); // Asumiendo que esta función está disponible globalmente o importada
            try {
                // Importación dinámica si el módulo no está expuesto globalmente, pero como importamos consolidarPagosAntiguos arriba, deberíamos poder usarlo si lo exponemos o lo usamos directo.
                // Como 'consolidarPagosAntiguos' fue importado al principio del archivo, lo usamos directo.
                // Nota: Asegúrate de que consolidarPagosAntiguos esté exportada en pagos.js e importada aquí.

                const cantidad = await consolidarPagosAntiguos(inquilinoId, diaInt);

                alert(`✅ ¡ÉXITO!\n\nSe han consolidado y protegido ${cantidad} recibos antiguos.\nAhora puedes generar tus reportes pasados con total confianza.`);
            } catch (error) {
                console.error(error);
                alert("❌ Ocurrió un error al consolidar los pagos. Revisa la consola.");
            } finally {
                ocultarLoader();
            }
        }
    }
};
