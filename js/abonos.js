// js/abonos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra la sección principal de abonos/saldos a favor.
 */
export async function mostrarAbonos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        mostrarNotificacion("Error: No se pudo cargar la sección de saldos a favor.", 'error');
        return;
    }

    try {
        const abonosSnap = await getDocs(query(collection(db, "abonosSaldoFavor"), orderBy("fechaAbono", "desc")));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const pagosMap = new Map();

        pagosSnap.forEach(doc => {
            const data = doc.data();
            pagosMap.set(doc.id, {
                mes: data.mesCorrespondiente,
                anio: data.anioCorrespondiente
            });
        });

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        let abonosList = [];
        abonosSnap.forEach(doc => {
            const data = doc.data();
            abonosList.push({
                id: doc.id,
                ...data,
                nombreInquilino: inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido'
            });
        });

        // Agrupar abonos por inquilinoId y guardar el id del abono activo más reciente
        const abonosPorInquilino = new Map();
        abonosList.forEach(abono => {
            if (!abonosPorInquilino.has(abono.inquilinoId)) {
                abonosPorInquilino.set(abono.inquilinoId, {
                    id: null, // Aquí guardaremos el id real del abono activo
                    inquilinoId: abono.inquilinoId,
                    nombreInquilino: abono.nombreInquilino,
                    montoOriginal: 0,
                    saldoRestante: 0,
                    descripcion: '',
                    fechaAbono: '',
                    aplicaciones: []
                });
            }
            const agrupado = abonosPorInquilino.get(abono.inquilinoId);
            agrupado.montoOriginal += parseFloat(abono.montoOriginal) || 0;
            agrupado.saldoRestante += parseFloat(abono.saldoRestante) || 0;
            agrupado.descripcion += abono.descripcion ? (agrupado.descripcion ? ' | ' : '') + abono.descripcion : '';
            agrupado.fechaAbono = abono.fechaAbono; // toma la última fecha registrada
            if (Array.isArray(abono.aplicaciones)) {
                agrupado.aplicaciones = agrupado.aplicaciones.concat(abono.aplicaciones);
            }
            // Si este abono tiene saldoRestante > 0 y es el más reciente, guarda su id
            if (abono.saldoRestante > 0 && (!agrupado.id || new Date(abono.fechaAbono) > new Date(agrupado.fechaAbono))) {
                agrupado.id = abono.id;
                agrupado.fechaAbono = abono.fechaAbono;
            }
        });

        // Ahora genera las tarjetas solo por inquilino
        let tarjetasAbonosHtml = "";
        const abonosUnicos = Array.from(abonosPorInquilino.values());
        if (abonosUnicos.length === 0) {
            tarjetasAbonosHtml = `<p class="text-gray-500 text-center py-8">No hay saldos a favor registrados.</p>`;
        } else {
            tarjetasAbonosHtml = abonosUnicos.map(abono => {
                const estadoClass = abono.saldoRestante > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
                const estadoText = abono.saldoRestante > 0 ? 'Activo' : 'Consumido';
                // Historial de aplicaciones
                let historialAplicacionesHtml = '';
                if (abono.aplicaciones && abono.aplicaciones.length > 0) {
                    // Ordenar por fecha descendente
                    abono.aplicaciones.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
                    historialAplicacionesHtml = `
                        <div class="mt-3">
                            <h4 class="font-semibold text-sm mb-1 text-gray-700">Historial de aplicaciones:</h4>
                            <ul class="text-xs text-gray-600 space-y-1">
                                ${abono.aplicaciones.map(app => {
                                    const pagoInfo = pagosMap.get(app.pagoId);
                                    const pagoLabel = pagoInfo ? `${pagoInfo.mes || ''} ${pagoInfo.anio || ''}` : 'Pago desconocido';
                                    return `
                                        <li>
                                            Pago: <span class="font-semibold">${pagoLabel}</span> |
                                            Monto: <span class="font-semibold text-green-700">$${parseFloat(app.montoAplicado).toFixed(2)}</span> |
                                            Fecha: <span>${app.fecha}</span>
                                        </li>
                                    `;
                                }).join('')}
                            </ul>
                        </div>
                    `;
                }
                return `
                    <div class="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-200">
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">Abono de ${abono.nombreInquilino}</h3>
                        <p class="text-gray-600 mb-2">Monto Original: <span class="font-semibold">$${parseFloat(abono.montoOriginal).toFixed(2)}</span></p>
                        <p class="text-gray-600 mb-2">Saldo Restante: <span class="font-semibold text-xl ${abono.saldoRestante > 0 ? 'text-green-700' : 'text-gray-500'}">$${parseFloat(abono.saldoRestante).toFixed(2)}</span></p>
                        <p class="text-gray-600 mb-2">Fecha del Último Abono: ${abono.fechaAbono}</p>
                        <p class="text-gray-600 mb-2">Descripción: ${abono.descripcion || 'Sin descripción'}</p>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${estadoClass} mb-4">
                            ${estadoText}
                        </span>
                        ${historialAplicacionesHtml}
                        <div class="flex flex-wrap gap-2 mt-4">
                            <button onclick="mostrarFormularioNuevoAbono('${abono.id}')" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors duration-200 text-sm">Actualizar</button>
                            ${abono.saldoRestante > 0 ? `<button onclick="aplicarSaldoFavorManual('${abono.id}', '${abono.inquilinoId}')" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors duration-200 text-sm">Aplicar Manualmente</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        contenedor.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Gestión de Saldos a Favor</h2>
            <div class="mb-6 flex justify-between items-center">
                <button onclick="mostrarFormularioNuevoAbono()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Registrar Nuevo Abono
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${tarjetasAbonosHtml}
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar los abonos a favor:", error);
        mostrarNotificacion("Error al cargar los saldos a favor.", 'error');
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error al cargar los saldos a favor: ${error.message}</p>`;
    }
}

/**
 * Aplica manualmente el saldo a favor a un pago pendiente/parcial del inquilino.
 * @param {string} abonoId
 * @param {string} inquilinoId
 */
export async function aplicarSaldoFavorManual(abonoId, inquilinoId) {
    try {
        const abonoDoc = await getDoc(doc(db, "abonosSaldoFavor", abonoId));
        if (!abonoDoc.exists()) {
            mostrarNotificacion('No se encontró el saldo a favor.', 'error');
            return;
        }
        const abono = abonoDoc.data();
        if (abono.saldoRestante <= 0) {
            mostrarNotificacion('Este saldo a favor ya fue consumido.', 'warning');
            return;
        }

        // Buscar el primer pago pendiente/parcial del inquilino
        const pagosQuery = query(
            collection(db, "pagos"),
            where("inquilinoId", "==", inquilinoId),
            where("estado", "in", ["pendiente", "parcial", "vencido"])
        );
        const pagosSnap = await getDocs(pagosQuery);

        let pagoAplicado = false;
        for (const pagoDoc of pagosSnap.docs) {
            const pago = pagoDoc.data();
            if (pago.saldoPendiente > 0) {
                const aplicar = Math.min(abono.saldoRestante, pago.saldoPendiente);
                // Actualizar pago
                const nuevoMontoPagado = (pago.montoPagado || 0) + aplicar;
                const nuevoSaldoPendiente = (pago.saldoPendiente || 0) - aplicar;
                let nuevoEstado = 'pendiente';
                if (nuevoMontoPagado >= pago.montoTotal) {
                    nuevoEstado = 'pagado';
                } else if (nuevoMontoPagado > 0) {
                    nuevoEstado = 'parcial';
                }
                // Actualizar abonos del pago
                const abonosActuales = pago.abonos || [];
                abonosActuales.push({
                    montoAbonado: aplicar,
                    fechaAbono: new Date().toISOString().split('T')[0],
                    origen: 'saldo a favor'
                });
                await updateDoc(doc(db, "pagos", pagoDoc.id), {
                    montoPagado: nuevoMontoPagado,
                    saldoPendiente: nuevoSaldoPendiente,
                    estado: nuevoEstado,
                    abonos: abonosActuales
                });
                // Actualizar saldo a favor y guardar historial de aplicaciones
                const nuevoSaldoRestante = abono.saldoRestante - aplicar;
                const aplicaciones = abono.aplicaciones || [];
                aplicaciones.push({
                    pagoId: pagoDoc.id,
                    montoAplicado: aplicar,
                    fecha: new Date().toISOString().split('T')[0]
                });
                await updateDoc(doc(db, "abonosSaldoFavor", abonoId), {
                    saldoRestante: nuevoSaldoRestante,
                    aplicaciones: aplicaciones
                });
                mostrarNotificacion('Saldo a favor aplicado correctamente.', 'success');
                pagoAplicado = true;
                break; // Solo aplicar a un pago a la vez
            }
        }
        if (!pagoAplicado) {
            mostrarNotificacion('No hay pagos pendientes para aplicar el saldo a favor.', 'info');
        }
        mostrarAbonos();
        
    } catch (error) {
        mostrarNotificacion('Error al aplicar el saldo a favor.', 'error');
    }
}

/**
 * Muestra el formulario para añadir o editar un abono/saldo a favor en un modal.
 * @param {string} [id=null] - ID del abono a editar. Si es null, es un nuevo abono.
 */
export async function mostrarFormularioNuevoAbono(id = null) {
    let titulo = "Registrar Nuevo Saldo a Favor";
    let abono = { inquilinoId: '', montoOriginal: '', saldoRestante: '', fechaAbono: '', descripcion: '' };
    let inquilinosList = [];

    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            inquilinosList.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        mostrarNotificacion("Error al cargar inquilinos disponibles.", 'error');
        return;
    }

    if (id) {
        titulo = "Editar Saldo a Favor";
        try {
            const docSnap = await getDoc(doc(db, "abonosSaldoFavor", id));
            if (docSnap.exists()) {
                abono = { id: docSnap.id, ...docSnap.data() };
            } else {
                mostrarNotificacion("Saldo a favor no encontrado.", 'error');
                return;
            }
        } catch (error) {
            mostrarNotificacion("Error al cargar datos del saldo a favor para editar.", 'error');
            return;
        }
    }

    const inquilinosOptions = inquilinosList.map(inc => `<option value="${inc.id}" ${inc.id === abono.inquilinoId ? 'selected' : ''}>${inc.nombre}</option>`).join('');

    const formHtml = `
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">${titulo}</h3>
        </div>
        <form id="formAbonoSaldoFavor" class="space-y-4">
            <div>
                <label for="inquilinoId" class="block text-gray-700 text-sm font-bold mb-2">Inquilino:</label>
                <select id="inquilinoId" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                    <option value="">-- Seleccionar Inquilino --</option>
                    ${inquilinosOptions}
                </select>
            </div>
            <div>
                <label for="montoOriginal" class="block text-gray-700 text-sm font-bold mb-2">Monto del Abono:</label>
                <input type="number" id="montoOriginal" value="${abono.montoOriginal}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" step="0.01" required min="0.01">
            </div>
            <div>
                <label for="descripcionAbono" class="block text-gray-700 text-sm font-bold mb-2">Descripción (Opcional):</label>
                <textarea id="descripcionAbono" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" rows="2">${abono.descripcion || ''}</textarea>
            </div>
            <div>
                <label for="fechaAbono" class="block text-gray-700 text-sm font-bold mb-2">Fecha del Abono:</label>
                <input type="date" id="fechaAbono" value="${abono.fechaAbono}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
            </div>
            <div class="flex justify-end gap-3 mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-md shadow-md transition-colors duration-200">Guardar</button>
            </div>
        </form>
    `;

    mostrarModal(formHtml);

    const formAbonoSaldoFavor = document.getElementById('formAbonoSaldoFavor');
    if (formAbonoSaldoFavor) {
        formAbonoSaldoFavor.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inquilinoId = document.getElementById('inquilinoId').value;
            const montoNuevo = parseFloat(document.getElementById('montoOriginal').value);
            const descripcion = document.getElementById('descripcionAbono').value;
            const fechaAbono = document.getElementById('fechaAbono').value;
            const fechaRegistro = id ? abono.fechaRegistro : new Date().toISOString().split('T')[0];

            if (id) {
                // Editar abono existente (sin cambios)
                try {
                    if (montoNuevo !== abono.montoOriginal) {
                        abono.saldoRestante = montoNuevo;
                        abono.montoOriginal = montoNuevo;
                        mostrarNotificacion("El saldo restante se ha restablecido al monto original.", 'info');
                    }
                    abono.descripcion = descripcion;
                    abono.fechaAbono = fechaAbono;
                    await updateDoc(doc(db, "abonosSaldoFavor", id), abono);
                    mostrarNotificacion("Saldo a favor actualizado con éxito.", 'success');
                } catch (err) {
                    mostrarNotificacion("Error al actualizar el saldo a favor.", 'error');
                }
            } else {
                // Registrar nuevo abono: buscar si ya existe uno activo para el inquilino
                try {
                    const abonosSnap = await getDocs(query(
                        collection(db, "abonosSaldoFavor"),
                        where("inquilinoId", "==", inquilinoId)
                    ));
                    const abonosActivos = abonosSnap.docs.filter(doc => (doc.data().saldoRestante || 0) > 0);
                    if (abonosActivos.length > 0) {
                        // Ya existe un saldo a favor activo, sumamos
                        const abonoExistenteDoc = abonosActivos[0];
                        const abonoExistente = abonoExistenteDoc.data();
                        const nuevoMontoOriginal = (abonoExistente.montoOriginal || 0) + montoNuevo;
                        const nuevoSaldoRestante = (abonoExistente.saldoRestante || 0) + montoNuevo;
                        const nuevaDescripcion = abonoExistente.descripcion
                            ? abonoExistente.descripcion + ` | +${montoNuevo} el ${fechaAbono}${descripcion ? ' (' + descripcion + ')' : ''}`
                            : `+${montoNuevo} el ${fechaAbono}${descripcion ? ' (' + descripcion + ')' : ''}`;
                        await updateDoc(doc(db, "abonosSaldoFavor", abonoExistenteDoc.id), {
                            montoOriginal: nuevoMontoOriginal,
                            saldoRestante: nuevoSaldoRestante,
                            descripcion: nuevaDescripcion,
                            fechaAbono: fechaAbono // opcional: puedes guardar la última fecha
                        });
                        mostrarNotificacion("Saldo a favor sumado al existente.", 'success');
                    } else {
                        // No existe, creamos uno nuevo
                        await addDoc(collection(db, "abonosSaldoFavor"), {
                            inquilinoId,
                            montoOriginal: montoNuevo,
                            saldoRestante: montoNuevo,
                            descripcion,
                            fechaAbono,
                            fechaRegistro,
                            aplicaciones: []
                        });
                        mostrarNotificacion("Saldo a favor registrado con éxito.", 'success');
                    }
                } catch (err) {
                    mostrarNotificacion("Error al registrar el saldo a favor.", 'error');
                }
            }
            ocultarModal();
            mostrarAbonos();
        });
    }
}

/**
 * Función para editar un abono a favor, mostrando el formulario.
 * @param {string} id - ID del abono a editar.
 */
export async function editarAbono(id) {
    mostrarFormularioNuevoAbono(id);
}

/**
 * Elimina un abono a favor.
 * @param {string} id - ID del abono a eliminar.
 */
export async function eliminarAbono(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este saldo a favor? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, "abonosSaldoFavor", id));
            mostrarNotificacion('Saldo a favor eliminado con éxito.', 'success');
            mostrarAbonos();
            
        } catch (error) {
            mostrarNotificacion('Error al eliminar el saldo a favor.', 'error');
        }
    }
}

// Hacer funciones globales para los botones en HTML
window.mostrarAbonos = mostrarAbonos;
window.mostrarFormularioNuevoAbono = mostrarFormularioNuevoAbono;
window.editarAbono = editarAbono;
window.eliminarAbono = eliminarAbono;
window.aplicarSaldoFavorManual = aplicarSaldoFavorManual;