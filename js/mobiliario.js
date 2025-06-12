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
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
                    <svg class="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    Inventario de Mobiliario
                </h2>
                <button onclick="mostrarFormularioNuevoMueble()" 
                    class="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                    text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center font-medium text-sm sm:text-base">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Agregar Mobiliario
                </button>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Descripción</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disp.</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Asign.</th>
                                <th class="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">${mob.nombre}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-700 hidden sm:table-cell">${mob.descripcion || '-'}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">$${(mob.costoRenta || 0).toFixed(2)}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                            <span class="inline-flex px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${estadoClass}">
                                ${estadoTexto}
                            </span>
                        </td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">${cantidadTotal}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold ${cantidadDisponible > 0 ? 'text-green-600' : 'text-red-600'}">${cantidadDisponible}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-700 max-w-xs truncate hidden sm:table-cell" title="${asignacionesTexto}">${asignacionesTexto}</td>
                        <td class="px-3 sm:px-6 py-3 sm:py-4 text-sm text-right">
                            <div class="flex flex-wrap justify-end gap-1.5">
                                <button onclick="verHistorialMobiliario('${mob.id}')" 
                                    class="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                                    text-white px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                    Historial
                                </button>
                                <button onclick="editarMueble('${mob.id}')" 
                                    class="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 
                                    text-white px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar
                                </button>
                                ${cantidadDisponible > 0 ? `
                                    <button onclick="asignarMueble('${mob.id}')" 
                                        class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                        text-white px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                        </svg>
                                        Asignar
                                    </button>
                                ` : ''}
                                ${cantidadAsignada > 0 ? `
                                    <button onclick="liberarMobiliario('${mob.id}')" 
                                        class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 
                                        text-white px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                                        </svg>
                                        Liberar
                                    </button>
                                ` : ''}
                                <button onclick="eliminarMueble('${mob.id}')" 
                                    class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                                    text-white px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1.5"
                                    ${cantidadAsignada > 0 ? 'disabled title="No se puede eliminar mobiliario asignado"' : ''}>
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
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
        <div class="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-xl -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-6">
            <h3 class="text-xl sm:text-2xl font-bold text-center">Agregar Mobiliario</h3>
        </div>
        <form id="formNuevoMueble" class="space-y-4 sm:space-y-6 px-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Nombre *</label>
                    <input type="text" id="nombreMueble" required 
                        class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Costo de Renta *</label>
                    <input type="number" id="costoRentaMueble" min="0" step="0.01" required 
                        class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 text-sm">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Descripción</label>
                <textarea id="descripcionMueble" rows="3" 
                    class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 text-sm" 
                    placeholder="Descripción detallada del mobiliario..."></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Cantidad *</label>
                    <input type="number" id="cantidadMueble" min="1" required 
                        class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 text-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Condición</label>
                    <select id="condicionMueble" 
                        class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 text-sm">
                        <option value="excelente">Excelente</option>
                        <option value="buena" selected>Buena</option>
                        <option value="regular">Regular</option>
                        <option value="necesita_reparacion">Necesita Reparación</option>
                    </select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 sm:mt-8">
                <button type="button" onclick="ocultarModal()" 
                    class="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 text-sm">
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                    text-white font-medium rounded-xl shadow-md transition-all duration-200 text-sm">
                    Guardar
                </button>
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
            <div class="px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Editar Mobiliario</h3>
            </div>
            <form id="formEditarMueble" class="space-y-6 px-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                        <input type="text" id="nombreMuebleEdit" value="${mueble.nombre}" required 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Costo de Renta *</label>
                        <input type="number" id="costoRentaMuebleEdit" value="${mueble.costoRenta}" min="0" step="0.01" required 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea id="descripcionMuebleEdit" rows="3" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700">${mueble.descripcion || ''}</textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad Total *</label>
                        <input type="number" id="cantidadMuebleEdit" value="${mueble.cantidad || 1}" min="${mueble.cantidadAsignada || 0}" required 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700">
                        <p class="text-xs text-gray-500 mt-1">Mínimo: ${mueble.cantidadAsignada || 0} (cantidad actualmente asignada)</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Condición</label>
                        <select id="condicionMuebleEdit" 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-700">
                            <option value="excelente" ${mueble.condicion === 'excelente' ? 'selected' : ''}>Excelente</option>
                            <option value="buena" ${mueble.condicion === 'buena' ? 'selected' : ''}>Buena</option>
                            <option value="regular" ${mueble.condicion === 'regular' ? 'selected' : ''}>Regular</option>
                            <option value="necesita_reparacion" ${mueble.condicion === 'necesita_reparacion' ? 'selected' : ''}>Necesita Reparación</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200">
                        Actualizar
                    </button>
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
            <div class="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-xl font-bold text-center">Asignar Mobiliario</h3>
                <p class="text-center text-blue-100 mt-1">${mueble.nombre}</p>
            </div>
            <form id="formAsignarMueble" class="space-y-6 px-2">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md mb-6 border border-blue-200">
                    <p class="text-sm text-blue-800"><strong>Disponibles:</strong> ${disponibles} de ${mueble.cantidad || 0}</p>
                    <p class="text-sm text-blue-800"><strong>Condición:</strong> ${mueble.condicion || 'No especificada'}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Selecciona un inquilino *</label>
                    <select id="inquilinoAsignar" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700">
                        <option value="">Selecciona...</option>
                        ${inquilinos.map(inq => `<option value="${inq.id}">${inq.nombre} ${inq.inmuebleNombre ? `(${inq.inmuebleNombre})` : ''}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Cantidad a asignar *</label>
                    <input type="number" id="cantidadAsignar" min="1" max="${disponibles}" value="1" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700">
                    <p class="text-xs text-gray-500 mt-1">Máximo disponible: ${disponibles}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Notas de asignación</label>
                    <textarea id="notasAsignacion" rows="2" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700" 
                        placeholder="Observaciones sobre la asignación..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200">
                        Asignar
                    </button>
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
                    <div class="flex items-start">
                        <input type="checkbox" name="liberarAsignacion" value="${a.inquilinoId}" class="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${nombreInquilino}</div>
                            <div class="text-sm text-gray-500">
                                Cantidad asignada: ${a.cantidad} | 
                                Asignado: ${new Date(a.fechaAsignacion).toLocaleDateString()} |
                                Condición: ${a.condicionAsignacion || 'No especificada'}
                            </div>
                            ${a.notas ? `<div class="text-xs text-gray-400 mt-1">${a.notas}</div>` : ''}
                            <div class="mt-2">
                                <label class="text-sm text-gray-600">Cantidad a liberar:</label>
                                <input type="number" 
                                       name="cantidadLiberar_${a.inquilinoId}" 
                                       min="1" 
                                       max="${a.cantidad}" 
                                       value="${a.cantidad}"
                                       class="mt-1 block w-24 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                       disabled>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const formHtml = `
            <div class="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-xl font-bold text-center">Liberar Mobiliario</h3>
                <p class="text-center text-orange-100 mt-1">${mueble.nombre}</p>
            </div>
            <form id="formLiberarMueble" class="space-y-6 px-2">
                <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-md mb-6 border border-orange-200">
                    <p class="text-sm text-orange-800"><strong>Total asignado:</strong> ${mueble.cantidadAsignada || 0} de ${mueble.cantidad || 0}</p>
                    <p class="text-sm text-orange-800"><strong>Asignaciones activas:</strong> ${asignacionesActivas.length}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-3">Selecciona las asignaciones a liberar:</label>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${opcionesLiberacion}
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Condición al liberar</label>
                        <select id="condicionLiberacion" 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700">
                            <option value="excelente">Excelente</option>
                            <option value="buena" selected>Buena</option>
                            <option value="regular">Regular</option>
                            <option value="necesita_reparacion">Necesita Reparación</option>
                            <option value="dañado">Dañado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Motivo de liberación</label>
                        <select id="motivoLiberacion" 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700">
                            <option value="fin_contrato">Fin de contrato</option>
                            <option value="cambio_inmueble">Cambio de inmueble</option>
                            <option value="solicitud_inquilino">Solicitud del inquilino</option>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Notas de liberación</label>
                    <textarea id="notasLiberacion" rows="3" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700" 
                        placeholder="Observaciones sobre el estado del mobiliario al liberarlo..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200">
                        Liberar Seleccionados
                    </button>
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
                    const cantidadALiberar = parseInt(document.querySelector(`input[name="cantidadLiberar_${inquilinoId}"]`).value, 10);
                    const asignacionIndex = asignaciones.findIndex(a => a.inquilinoId === inquilinoId && a.activa !== false);
                    
                    if (asignacionIndex >= 0) {
                        const asignacion = asignaciones[asignacionIndex];
                        
                        if (cantidadALiberar > asignacion.cantidad) {
                            throw new Error(`La cantidad a liberar no puede ser mayor a la cantidad asignada`);
                        }

                        cantidadLiberada += cantidadALiberar;
                        
                        if (cantidadALiberar === asignacion.cantidad) {
                            // Si se libera todo, marcar como inactiva
                            asignaciones[asignacionIndex] = {
                                ...asignacion,
                                activa: false,
                                fechaLiberacion: new Date().toISOString(),
                                condicionLiberacion,
                                motivoLiberacion,
                                notasLiberacion
                            };
                        } else {
                            // Si se libera parcialmente, crear una nueva asignación con la cantidad restante
                            const cantidadRestante = asignacion.cantidad - cantidadALiberar;
                            
                            // Marcar la asignación actual como inactiva
                            asignaciones[asignacionIndex] = {
                                ...asignacion,
                                activa: false,
                                fechaLiberacion: new Date().toISOString(),
                                condicionLiberacion,
                                motivoLiberacion,
                                notasLiberacion,
                                cantidad: cantidadALiberar
                            };

                            // Agregar nueva asignación con la cantidad restante
                            asignaciones.push({
                                ...asignacion,
                                cantidad: cantidadRestante,
                                fechaAsignacion: new Date().toISOString(),
                                activa: true
                            });
                        }

                        // Agregar al historial
                        const nombreInquilino = inquilinosMap.get(inquilinoId) || 'Inquilino Desconocido';
                        historial.push({
                            fecha: new Date().toISOString(),
                            accion: "liberado",
                            descripcion: `${cantidadALiberar} unidad(es) liberada(s) de ${nombreInquilino}`,
                            inquilinoId,
                            cantidad: cantidadALiberar,
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
                    condicion: condicionLiberacion,
                    asignaciones,
                    historial,
                    fechaUltimaLiberacion: new Date().toISOString()
                });

                mostrarNotificacion(`${cantidadLiberada} unidad(es) de mobiliario liberada(s) correctamente.`, "success");
                ocultarModal();
                mostrarInventarioMobiliario();
            } catch (error) {
                console.error("Error al liberar mobiliario:", error);
                mostrarNotificacion(error.message || "Error al liberar mobiliario.", "error");
            }
        });

        // Agregar el event listener para habilitar/deshabilitar el input de cantidad
        document.querySelectorAll('input[name="liberarAsignacion"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const cantidadInput = document.querySelector(`input[name="cantidadLiberar_${this.value}"]`);
                if (cantidadInput) {
                    cantidadInput.disabled = !this.checked;
                }
            });
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
            <div class="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-xl font-bold text-center">Historial de Mobiliario</h3>
                <p class="text-center text-purple-100 mt-1">${mueble.nombre}</p>
            </div>
            <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
                        <strong class="text-purple-800">Estado actual:</strong> ${mueble.estado || 'No especificado'}
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
                        <strong class="text-purple-800">Condición:</strong> ${mueble.condicion || 'No especificada'}
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
                        <strong class="text-purple-800">Total:</strong> ${mueble.cantidad || 0} unidades
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-200">
                        <strong class="text-purple-800">Asignadas:</strong> ${mueble.cantidadAsignada || 0} unidades
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-800 mb-3">Historial de Movimientos</h5>
                    ${historialHtml}
                </div>
                ${resumenAsignaciones}
            </div>
            <div class="flex justify-end mt-6">
                <button onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                    Cerrar
                </button>
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