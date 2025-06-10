import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra el inventario de mobiliario con estado mejorado.
 */
export async function mostrarInventarioMobiliario() {
    try {
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        
        // Crear mapa de inquilinos para mostrar nombres
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            inquilinosMap.set(doc.id, data.nombre);
        });

        let mobiliarioList = [];
        mobiliarioSnap.forEach(doc => {
            const data = doc.data();
            mobiliarioList.push({ id: doc.id, ...data });
        });

        // Ordenar por estado (disponible primero) y luego por nombre
        mobiliarioList.sort((a, b) => {
            if (a.estado !== b.estado) {
                return a.estado === 'disponible' ? -1 : 1;
            }
            return (a.nombre || '').localeCompare(b.nombre || '');
        });

        let html = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Inventario de Mobiliario</h2>
                <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2" onclick="mostrarFormularioNuevoMueble()">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Agregar Mobiliario
                </button>
            </div>
            
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Renta</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibles</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignaciones</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (mobiliarioList.length === 0) {
            html += `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        No hay mobiliario registrado en el inventario.
                    </td>
                </tr>
            `;
        } else {
            mobiliarioList.forEach(mob => {
                const cantidadTotal = mob.cantidad || 0;
                const cantidadAsignada = mob.cantidadAsignada || 0;
                const cantidadDisponible = cantidadTotal - cantidadAsignada;
                
                // Determinar estado visual
                let estadoClass = 'bg-green-100 text-green-800';
                let estadoTexto = 'Disponible';
                
                if (cantidadDisponible === 0) {
                    estadoClass = 'bg-red-100 text-red-800';
                    estadoTexto = 'Totalmente Asignado';
                } else if (cantidadAsignada > 0) {
                    estadoClass = 'bg-yellow-100 text-yellow-800';
                    estadoTexto = 'Parcialmente Asignado';
                }

                // Generar lista de asignaciones actuales
                let asignacionesTexto = '-';
                if (mob.asignaciones && Array.isArray(mob.asignaciones) && mob.asignaciones.length > 0) {
                    const asignacionesActivas = mob.asignaciones.filter(a => a.activa !== false);
                    if (asignacionesActivas.length > 0) {
                        asignacionesTexto = asignacionesActivas.map(a => {
                            const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
                            return `${nombreInquilino} (${a.cantidad})`;
                        }).join(', ');
                    }
                }

                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">${mob.nombre}</td>
                        <td class="px-4 py-3 text-sm text-gray-700">${mob.descripcion || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">$${(mob.costoRenta || 0).toFixed(2)}</td>
                        <td class="px-4 py-3 text-sm">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${estadoClass}">
                                ${estadoTexto}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-900">${cantidadTotal}</td>
                        <td class="px-4 py-3 text-sm font-semibold ${cantidadDisponible > 0 ? 'text-green-600' : 'text-red-600'}">${cantidadDisponible}</td>
                        <td class="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title="${asignacionesTexto}">${asignacionesTexto}</td>
                        <td class="px-4 py-3 text-sm text-right">
                            <div class="flex flex-col sm:flex-row sm:justify-end gap-1">
                                <button onclick="verHistorialMobiliario('${mob.id}')" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200" title="Ver historial">
                                    📋
                                </button>
                                <button onclick="editarMueble('${mob.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200">
                                    Editar
                                </button>
                                ${cantidadDisponible > 0 ? `
                                    <button onclick="asignarMueble('${mob.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200">
                                        Asignar
                                    </button>
                                ` : ''}
                                ${cantidadAsignada > 0 ? `
                                    <button onclick="liberarMobiliario('${mob.id}')" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200">
                                        Liberar
                                    </button>
                                ` : ''}
                                <button onclick="eliminarMueble('${mob.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200" ${cantidadAsignada > 0 ? 'disabled title="No se puede eliminar mobiliario asignado"' : ''}>
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById("contenido").innerHTML = html;
    } catch (error) {
        console.error("Error al cargar el inventario de mobiliario:", error);
        mostrarNotificacion("Error al cargar el inventario de mobiliario.", "error");
    }
}

/**
 * Muestra el formulario para agregar un nuevo mueble.
 */
export function mostrarFormularioNuevoMueble() {
    const formHtml = `
        <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-2xl font-bold text-center">Agregar Mobiliario</h3>
        </div>
        <form id="formNuevoMueble" class="space-y-5 px-2">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input type="text" id="nombreMueble" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-green-500 focus:border-green-500">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea id="descripcionMueble" rows="3" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-green-500 focus:border-green-500" placeholder="Descripción detallada del mobiliario..."></textarea>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Costo de Renta *</label>
                <input type="number" id="costoRentaMueble" min="0" step="0.01" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-green-500 focus:border-green-500">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad *</label>
                <input type="number" id="cantidadMueble" min="1" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-green-500 focus:border-green-500">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Condición</label>
                <select id="condicionMueble" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-green-500 focus:border-green-500">
                    <option value="excelente">Excelente</option>
                    <option value="buena" selected>Buena</option>
                    <option value="regular">Regular</option>
                    <option value="necesita_reparacion">Necesita Reparación</option>
                </select>
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">Guardar</button>
            </div>
        </form>
    `;
    mostrarModal(formHtml);

    document.getElementById('formNuevoMueble').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreMueble').value.trim();
        const descripcion = document.getElementById('descripcionMueble').value.trim();
        const costoRenta = parseFloat(document.getElementById('costoRentaMueble').value);
        const cantidad = parseInt(document.getElementById('cantidadMueble').value, 10);
        const condicion = document.getElementById('condicionMueble').value;

        if (!nombre || isNaN(costoRenta) || isNaN(cantidad)) {
            mostrarNotificacion("Por favor completa todos los campos requeridos.", "error");
            return;
        }

        try {
            await addDoc(collection(db, "mobiliario"), {
                nombre,
                descripcion,
                costoRenta,
                cantidad,
                cantidadAsignada: 0,
                estado: "disponible",
                condicion,
                asignaciones: [],
                historial: [{
                    fecha: new Date().toISOString(),
                    accion: "creado",
                    descripcion: `Mobiliario creado con ${cantidad} unidades`
                }],
                fechaCreacion: new Date().toISOString()
            });
            mostrarNotificacion("Mobiliario agregado correctamente.", "success");
            ocultarModal();
            mostrarInventarioMobiliario();
        } catch (error) {
            console.error("Error al agregar mobiliario:", error);
            mostrarNotificacion("Error al agregar mobiliario.", "error");
        }
    });
}

/**
 * Editar mobiliario.
 */
window.editarMueble = async function(id) {
    try {
        const muebleDoc = await getDoc(doc(db, "mobiliario", id));
        if (!muebleDoc.exists()) {
            mostrarNotificacion("Mobiliario no encontrado.", "error");
            return;
        }
        const mueble = muebleDoc.data();
        
        const formHtml = `
            <div class="px-4 py-3 bg-yellow-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Editar Mobiliario</h3>
            </div>
            <form id="formEditarMueble" class="space-y-5 px-2">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                    <input type="text" id="nombreMuebleEdit" value="${mueble.nombre}" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-yellow-500 focus:border-yellow-500">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                    <textarea id="descripcionMuebleEdit" rows="3" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-yellow-500 focus:border-yellow-500">${mueble.descripcion || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Costo de Renta *</label>
                    <input type="number" id="costoRentaMuebleEdit" value="${mueble.costoRenta}" min="0" step="0.01" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-yellow-500 focus:border-yellow-500">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad Total *</label>
                    <input type="number" id="cantidadMuebleEdit" value="${mueble.cantidad || 1}" min="${mueble.cantidadAsignada || 0}" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-yellow-500 focus:border-yellow-500">
                    <p class="text-xs text-gray-500 mt-1">Mínimo: ${mueble.cantidadAsignada || 0} (cantidad actualmente asignada)</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Condición</label>
                    <select id="condicionMuebleEdit" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-yellow-500 focus:border-yellow-500">
                        <option value="excelente" ${mueble.condicion === 'excelente' ? 'selected' : ''}>Excelente</option>
                        <option value="buena" ${mueble.condicion === 'buena' ? 'selected' : ''}>Buena</option>
                        <option value="regular" ${mueble.condicion === 'regular' ? 'selected' : ''}>Regular</option>
                        <option value="necesita_reparacion" ${mueble.condicion === 'necesita_reparacion' ? 'selected' : ''}>Necesita Reparación</option>
                    </select>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">Actualizar</button>
                </div>
            </form>
        `;
        mostrarModal(formHtml);

        document.getElementById('formEditarMueble').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombreMuebleEdit').value.trim();
            const descripcion = document.getElementById('descripcionMuebleEdit').value.trim();
            const costoRenta = parseFloat(document.getElementById('costoRentaMuebleEdit').value);
            const cantidad = parseInt(document.getElementById('cantidadMuebleEdit').value, 10);
            const condicion = document.getElementById('condicionMuebleEdit').value;

            if (!nombre || isNaN(costoRenta) || isNaN(cantidad)) {
                mostrarNotificacion("Por favor completa todos los campos requeridos.", "error");
                return;
            }

            try {
                const historial = mueble.historial || [];
                historial.push({
                    fecha: new Date().toISOString(),
                    accion: "editado",
                    descripcion: `Mobiliario actualizado - Cantidad: ${cantidad}, Condición: ${condicion}`
                });

                await updateDoc(doc(db, "mobiliario", id), {
                    nombre,
                    descripcion,
                    costoRenta,
                    cantidad,
                    condicion,
                    historial,
                    fechaUltimaModificacion: new Date().toISOString()
                });
                mostrarNotificacion("Mobiliario actualizado correctamente.", "success");
                ocultarModal();
                mostrarInventarioMobiliario();
            } catch (error) {
                console.error("Error al actualizar mobiliario:", error);
                mostrarNotificacion("Error al actualizar mobiliario.", "error");
            }
        });
    } catch (error) {
        console.error("Error al cargar mobiliario para editar:", error);
        mostrarNotificacion("Error al cargar los datos del mobiliario.", "error");
    }
};

/**
 * Elimina un mueble del inventario.
 */
export async function eliminarMueble(id) {
    try {
        const muebleDoc = await getDoc(doc(db, "mobiliario", id));
        if (!muebleDoc.exists()) {
            mostrarNotificacion("Mobiliario no encontrado.", "error");
            return;
        }

        const mueble = muebleDoc.data();
        if ((mueble.cantidadAsignada || 0) > 0) {
            mostrarNotificacion("No se puede eliminar mobiliario que tiene asignaciones activas.", "error");
            return;
        }

        if (confirm("¿Estás seguro de que deseas eliminar este mobiliario? Esta acción no se puede deshacer.")) {
            await deleteDoc(doc(db, "mobiliario", id));
            mostrarNotificacion("Mobiliario eliminado correctamente.", "success");
            mostrarInventarioMobiliario();
        }
    } catch (error) {
        console.error("Error al eliminar mobiliario:", error);
        mostrarNotificacion("Error al eliminar mobiliario.", "error");
    }
}

/**
 * Asignar mobiliario a un inquilino.
 */
window.asignarMueble = async function(id) {
    try {
        // Obtener inquilinos activos
        const inquilinosSnap = await getDocs(query(collection(db, "inquilinos"), where("activo", "==", true)));
        const inquilinos = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            inquilinos.push({ id: doc.id, ...data });
        });

        if (inquilinos.length === 0) {
            mostrarNotificacion("No hay inquilinos activos para asignar.", "error");
            return;
        }

        // Obtener datos del mueble
        const muebleDoc = await getDoc(doc(db, "mobiliario", id));
        if (!muebleDoc.exists()) {
            mostrarNotificacion("Mobiliario no encontrado.", "error");
            return;
        }

        const mueble = muebleDoc.data();
        const disponibles = (mueble.cantidad || 0) - (mueble.cantidadAsignada || 0);

        if (disponibles <= 0) {
            mostrarNotificacion("No hay unidades disponibles para asignar.", "error");
            return;
        }

        const selectHtml = `
            <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-xl font-bold text-center">Asignar Mobiliario</h3>
                <p class="text-center text-blue-100 mt-1">${mueble.nombre}</p>
            </div>
            <form id="formAsignarMueble" class="space-y-5 px-2">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-sm text-blue-800"><strong>Disponibles:</strong> ${disponibles} de ${mueble.cantidad || 0}</p>
                    <p class="text-sm text-blue-800"><strong>Condición:</strong> ${mueble.condicion || 'No especificada'}</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Selecciona un inquilino *</label>
                    <select id="inquilinoAsignar" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Selecciona...</option>
                        ${inquilinos.map(inq => `<option value="${inq.id}">${inq.nombre} ${inq.inmuebleNombre ? `(${inq.inmuebleNombre})` : ''}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a asignar *</label>
                    <input type="number" id="cantidadAsignar" min="1" max="${disponibles}" value="1" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-500 mt-1">Máximo disponible: ${disponibles}</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Notas de asignación</label>
                    <textarea id="notasAsignacion" rows="2" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500" placeholder="Observaciones sobre la asignación..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">Asignar</button>
                </div>
            </form>
        `;
        mostrarModal(selectHtml);

        document.getElementById('formAsignarMueble').addEventListener('submit', async (e) => {
            e.preventDefault();
            const inquilinoId = document.getElementById('inquilinoAsignar').value;
            const cantidad = parseInt(document.getElementById('cantidadAsignar').value, 10);
            const notas = document.getElementById('notasAsignacion').value.trim();

            if (!inquilinoId || cantidad < 1 || cantidad > disponibles) {
                mostrarNotificacion("Por favor verifica los datos ingresados.", "error");
                return;
            }

            try {
                // Actualizar asignaciones
                let asignaciones = Array.isArray(mueble.asignaciones) ? [...mueble.asignaciones] : [];
                const existingIndex = asignaciones.findIndex(a => a.inquilinoId === inquilinoId && a.activa !== false);
                
                if (existingIndex >= 0) {
                    asignaciones[existingIndex].cantidad += cantidad;
                    asignaciones[existingIndex].fechaUltimaModificacion = new Date().toISOString();
                    if (notas) asignaciones[existingIndex].notas = notas;
                } else {
                    asignaciones.push({
                        inquilinoId,
                        cantidad,
                        fechaAsignacion: new Date().toISOString(),
                        activa: true,
                        notas,
                        condicionAsignacion: mueble.condicion || 'buena'
                    });
                }

                // Actualizar historial
                const historial = mueble.historial || [];
                const inquilinoNombre = inquilinos.find(i => i.id === inquilinoId)?.nombre || 'Inquilino Desconocido';
                historial.push({
                    fecha: new Date().toISOString(),
                    accion: "asignado",
                    descripcion: `${cantidad} unidad(es) asignada(s) a ${inquilinoNombre}`,
                    inquilinoId,
                    cantidad,
                    notas
                });

                const nuevaCantidadAsignada = (mueble.cantidadAsignada || 0) + cantidad;
                const nuevoEstado = nuevaCantidadAsignada >= (mueble.cantidad || 0) ? "totalmente_asignado" : "parcialmente_asignado";

                await updateDoc(doc(db, "mobiliario", id), {
                    cantidadAsignada: nuevaCantidadAsignada,
                    estado: nuevoEstado,
                    asignaciones,
                    historial,
                    fechaUltimaAsignacion: new Date().toISOString()
                });

                mostrarNotificacion(`Mobiliario asignado correctamente a ${inquilinoNombre}.`, "success");
                ocultarModal();
                mostrarInventarioMobiliario();
            } catch (error) {
                console.error("Error al asignar mobiliario:", error);
                mostrarNotificacion("Error al asignar mobiliario.", "error");
            }
        });
    } catch (error) {
        console.error("Error al preparar asignación:", error);
        mostrarNotificacion("Error al cargar datos para la asignación.", "error");
    }
};

/**
 * Liberar mobiliario asignado.
 */
window.liberarMobiliario = async function(id) {
    try {
        const muebleDoc = await getDoc(doc(db, "mobiliario", id));
        if (!muebleDoc.exists()) {
            mostrarNotificacion("Mobiliario no encontrado.", "error");
            return;
        }

        const mueble = muebleDoc.data();
        const asignacionesActivas = (mueble.asignaciones || []).filter(a => a.activa !== false);

        if (asignacionesActivas.length === 0) {
            mostrarNotificacion("Este mobiliario no tiene asignaciones activas.", "info");
            return;
        }

        // Obtener nombres de inquilinos
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const opcionesLiberacion = asignacionesActivas.map(a => {
            const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" name="liberarAsignacion" value="${a.inquilinoId}" class="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${nombreInquilino}</div>
                            <div class="text-sm text-gray-500">
                                Cantidad: ${a.cantidad} | 
                                Asignado: ${new Date(a.fechaAsignacion).toLocaleDateString()} |
                                Condición: ${a.condicionAsignacion || 'No especificada'}
                            </div>
                            ${a.notas ? `<div class="text-xs text-gray-400 mt-1">${a.notas}</div>` : ''}
                        </div>
                    </label>
                </div>
            `;
        }).join('');

        const formHtml = `
            <div class="px-4 py-3 bg-orange-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-xl font-bold text-center">Liberar Mobiliario</h3>
                <p class="text-center text-orange-100 mt-1">${mueble.nombre}</p>
            </div>
            <form id="formLiberarMueble" class="space-y-5 px-2">
                <div class="bg-orange-50 p-4 rounded-lg">
                    <p class="text-sm text-orange-800"><strong>Total asignado:</strong> ${mueble.cantidadAsignada || 0} de ${mueble.cantidad || 0}</p>
                    <p class="text-sm text-orange-800"><strong>Asignaciones activas:</strong> ${asignacionesActivas.length}</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Selecciona las asignaciones a liberar:</label>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${opcionesLiberacion}
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Condición al liberar</label>
                    <select id="condicionLiberacion" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500">
                        <option value="excelente">Excelente</option>
                        <option value="buena" selected>Buena</option>
                        <option value="regular">Regular</option>
                        <option value="necesita_reparacion">Necesita Reparación</option>
                        <option value="dañado">Dañado</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Motivo de liberación</label>
                    <select id="motivoLiberacion" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500">
                        <option value="fin_contrato">Fin de contrato</option>
                        <option value="cambio_inmueble">Cambio de inmueble</option>
                        <option value="solicitud_inquilino">Solicitud del inquilino</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Notas de liberación</label>
                    <textarea id="notasLiberacion" rows="3" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500" placeholder="Observaciones sobre el estado del mobiliario al liberarlo..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">Liberar Seleccionados</button>
                </div>
            </form>
        `;
        mostrarModal(formHtml);

        document.getElementById('formLiberarMueble').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const checkboxes = document.querySelectorAll('input[name="liberarAsignacion"]:checked');
            if (checkboxes.length === 0) {
                mostrarNotificacion("Selecciona al menos una asignación para liberar.", "error");
                return;
            }

            const condicionLiberacion = document.getElementById('condicionLiberacion').value;
            const motivoLiberacion = document.getElementById('motivoLiberacion').value;
            const notasLiberacion = document.getElementById('notasLiberacion').value.trim();

            try {
                let asignaciones = [...(mueble.asignaciones || [])];
                let historial = [...(mueble.historial || [])];
                let cantidadLiberada = 0;

                // Procesar cada asignación seleccionada
                checkboxes.forEach(checkbox => {
                    const inquilinoId = checkbox.value;
                    const asignacionIndex = asignaciones.findIndex(a => a.inquilinoId === inquilinoId && a.activa !== false);
                    
                    if (asignacionIndex >= 0) {
                        const asignacion = asignaciones[asignacionIndex];
                        cantidadLiberada += asignacion.cantidad;
                        
                        // Marcar como inactiva en lugar de eliminar (para historial)
                        asignaciones[asignacionIndex] = {
                            ...asignacion,
                            activa: false,
                            fechaLiberacion: new Date().toISOString(),
                            condicionLiberacion,
                            motivoLiberacion,
                            notasLiberacion
                        };

                        // Agregar al historial
                        const nombreInquilino = inquilinosMap.get(inquilinoId) || 'Inquilino Desconocido';
                        historial.push({
                            fecha: new Date().toISOString(),
                            accion: "liberado",
                            descripcion: `${asignacion.cantidad} unidad(es) liberada(s) de ${nombreInquilino}`,
                            inquilinoId,
                            cantidad: asignacion.cantidad,
                            motivo: motivoLiberacion,
                            condicion: condicionLiberacion,
                            notas: notasLiberacion
                        });
                    }
                });

                const nuevaCantidadAsignada = (mueble.cantidadAsignada || 0) - cantidadLiberada;
                let nuevoEstado = "disponible";
                if (nuevaCantidadAsignada > 0) {
                    nuevoEstado = nuevaCantidadAsignada >= (mueble.cantidad || 0) ? "totalmente_asignado" : "parcialmente_asignado";
                }

                await updateDoc(doc(db, "mobiliario", id), {
                    cantidadAsignada: nuevaCantidadAsignada,
                    estado: nuevoEstado,
                    condicion: condicionLiberacion, // Actualizar condición general
                    asignaciones,
                    historial,
                    fechaUltimaLiberacion: new Date().toISOString()
                });

                mostrarNotificacion(`${cantidadLiberada} unidad(es) de mobiliario liberada(s) correctamente.`, "success");
                ocultarModal();
                mostrarInventarioMobiliario();
            } catch (error) {
                console.error("Error al liberar mobiliario:", error);
                mostrarNotificacion("Error al liberar mobiliario.", "error");
            }
        });
    } catch (error) {
        console.error("Error al preparar liberación:", error);
        mostrarNotificacion("Error al cargar datos para la liberación.", "error");
    }
};

/**
 * Ver historial completo del mobiliario.
 */
window.verHistorialMobiliario = async function(id) {
    try {
        const muebleDoc = await getDoc(doc(db, "mobiliario", id));
        if (!muebleDoc.exists()) {
            mostrarNotificacion("Mobiliario no encontrado.", "error");
            return;
        }

        const mueble = muebleDoc.data();
        const historial = mueble.historial || [];
        const asignaciones = mueble.asignaciones || [];

        // Obtener nombres de inquilinos
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        // Generar historial ordenado por fecha descendente
        const historialOrdenado = [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        let historialHtml = '';
        if (historialOrdenado.length === 0) {
            historialHtml = '<p class="text-gray-500 text-center py-4">No hay historial disponible.</p>';
        } else {
            historialHtml = `
                <div class="space-y-3 max-h-60 overflow-y-auto">
                    ${historialOrdenado.map(h => {
                        const fecha = new Date(h.fecha).toLocaleString();
                        let iconoAccion = '📝';
                        let colorAccion = 'text-gray-600';
                        
                        switch (h.accion) {
                            case 'creado':
                                iconoAccion = '✨';
                                colorAccion = 'text-green-600';
                                break;
                            case 'asignado':
                                iconoAccion = '📤';
                                colorAccion = 'text-blue-600';
                                break;
                            case 'liberado':
                                iconoAccion = '📥';
                                colorAccion = 'text-orange-600';
                                break;
                            case 'editado':
                                iconoAccion = '✏️';
                                colorAccion = 'text-yellow-600';
                                break;
                        }

                        return `
                            <div class="border-l-4 border-gray-200 pl-4 py-2">
                                <div class="flex items-start">
                                    <span class="text-lg mr-2">${iconoAccion}</span>
                                    <div class="flex-1">
                                        <div class="flex justify-between items-start">
                                            <span class="font-medium ${colorAccion} capitalize">${h.accion}</span>
                                            <span class="text-xs text-gray-500">${fecha}</span>
                                        </div>
                                        <p class="text-sm text-gray-700 mt-1">${h.descripcion}</p>
                                        ${h.notas ? `<p class="text-xs text-gray-500 mt-1 italic">${h.notas}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Generar resumen de asignaciones
        const asignacionesActivas = asignaciones.filter(a => a.activa !== false);
        const asignacionesInactivas = asignaciones.filter(a => a.activa === false);

        let resumenAsignaciones = '';
        if (asignacionesActivas.length > 0 || asignacionesInactivas.length > 0) {
            resumenAsignaciones = `
                <div class="mt-6">
                    <h5 class="font-semibold text-gray-800 mb-3">Resumen de Asignaciones</h5>
                    ${asignacionesActivas.length > 0 ? `
                        <div class="mb-4">
                            <h6 class="text-sm font-medium text-green-700 mb-2">Asignaciones Activas (${asignacionesActivas.length})</h6>
                            <div class="space-y-2">
                                ${asignacionesActivas.map(a => {
                                    const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
                                    return `
                                        <div class="bg-green-50 p-2 rounded text-sm">
                                            <strong>${nombreInquilino}</strong> - ${a.cantidad} unidad(es)
                                            <br><span class="text-xs text-gray-600">Desde: ${new Date(a.fechaAsignacion).toLocaleDateString()}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${asignacionesInactivas.length > 0 ? `
                        <div>
                            <h6 class="text-sm font-medium text-gray-700 mb-2">Asignaciones Anteriores (${asignacionesInactivas.length})</h6>
                            <div class="space-y-2">
                                ${asignacionesInactivas.map(a => {
                                    const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
                                    return `
                                        <div class="bg-gray-50 p-2 rounded text-sm">
                                            <strong>${nombreInquilino}</strong> - ${a.cantidad} unidad(es)
                                            <br><span class="text-xs text-gray-600">
                                                ${new Date(a.fechaAsignacion).toLocaleDateString()} - ${new Date(a.fechaLiberacion).toLocaleDateString()}
                                                ${a.motivoLiberacion ? `(${a.motivoLiberacion})` : ''}
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const modalHtml = `
            <div class="px-4 py-3 bg-purple-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-xl font-bold text-center">Historial de Mobiliario</h3>
                <p class="text-center text-purple-100 mt-1">${mueble.nombre}</p>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="bg-gray-50 p-3 rounded">
                        <strong>Estado actual:</strong> ${mueble.estado || 'No especificado'}
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <strong>Condición:</strong> ${mueble.condicion || 'No especificada'}
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <strong>Total:</strong> ${mueble.cantidad || 0} unidades
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <strong>Asignadas:</strong> ${mueble.cantidadAsignada || 0} unidades
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-800 mb-3">Historial de Movimientos</h5>
                    ${historialHtml}
                </div>
                ${resumenAsignaciones}
            </div>
            <div class="flex justify-end mt-6">
                <button onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(modalHtml);
    } catch (error) {
        console.error("Error al cargar historial:", error);
        mostrarNotificacion("Error al cargar el historial del mobiliario.", "error");
    }
};

// Exportar funciones globales
window.mostrarInventarioMobiliario = mostrarInventarioMobiliario;
window.mostrarFormularioNuevoMueble = mostrarFormularioNuevoMueble;
window.eliminarMueble = eliminarMueble;