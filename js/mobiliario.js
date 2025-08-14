import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra el inventario de mobiliario con estado mejorado.
 */
export async function mostrarInventarioMobiliario() {
    try {
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        const mobiliario = [];
        
        // Obtener nombres de inquilinos
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        // Obtener nombres de inmuebles
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        mobiliarioSnap.forEach(doc => {
            const data = doc.data();
            const asignacionesActivas = (data.asignaciones || []).filter(a => a.activa !== false);
            const resumenAsignaciones = asignacionesActivas.map(a => {
                const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
                const nombreInmueble = a.inmuebleAsociadoId ? inmueblesMap.get(a.inmuebleAsociadoId) || 'No especificado' : 'No especificado';
                return `${nombreInquilino} - Inmueble: ${nombreInmueble} (${a.cantidad})`;
            }).join(', ');

            mobiliario.push({
                id: doc.id,
                ...data,
                resumenAsignaciones
            });
        });

        // Ordenar por estado (disponible primero) y luego por nombre
        mobiliario.sort((a, b) => {
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

            <!-- Filtros -->
            <div class="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                        <input type="text" id="filtroBusqueda" placeholder="Buscar por nombre..." 
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select id="filtroEstado" 
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Todos</option>
                            <option value="disponible">Disponible</option>
                            <option value="parcialmente_asignado">Parcialmente Asignado</option>
                            <option value="totalmente_asignado">Totalmente Asignado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Condición</label>
                        <select id="filtroCondicion" 
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Todas</option>
                            <option value="excelente">Excelente</option>
                            <option value="buena">Buena</option>
                            <option value="regular">Regular</option>
                            <option value="necesita_reparacion">Necesita Reparación</option>
                        </select>
                    </div>
                </div>
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
                        <tbody class="bg-white divide-y divide-gray-200" id="tablaMobiliario">
        `;

        if (mobiliario.length === 0) {
            html += `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        No hay mobiliario registrado en el inventario.
                    </td>
                </tr>
            `;
        } else {
            mobiliario.forEach(mob => {
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
                            const nombreInmueble = a.inmuebleAsociadoId ? inmueblesMap.get(a.inmuebleAsociadoId) || 'No especificado' : 'No especificado';
                            return `${nombreInquilino} - Inmueble: ${nombreInmueble} (${a.cantidad})`;
                        }).join(', ');
                    }
                }

                html += `
                    <tr class="hover:bg-gray-50 transition-colors duration-200" 
                        data-nombre="${mob.nombre.toLowerCase()}"
                        data-estado="${estadoTexto.toLowerCase()}"
                        data-condicion="${(mob.condicion || '').toLowerCase()}">
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

        // Agregar event listeners para los filtros
        const filtroBusqueda = document.getElementById('filtroBusqueda');
        const filtroEstado = document.getElementById('filtroEstado');
        const filtroCondicion = document.getElementById('filtroCondicion');

        const aplicarFiltros = () => {
            const busqueda = filtroBusqueda.value.toLowerCase();
            const estado = filtroEstado.value.toLowerCase();
            const condicion = filtroCondicion.value.toLowerCase();

            const filas = document.querySelectorAll('#tablaMobiliario tr');
            filas.forEach(fila => {
                const nombre = fila.dataset.nombre || '';
                const estadoFila = fila.dataset.estado || '';
                const condicionFila = fila.dataset.condicion || '';

                const coincideBusqueda = nombre.includes(busqueda);
                const coincideEstado = !estado || estadoFila.includes(estado);
                const coincideCondicion = !condicion || condicionFila.includes(condicion);

                fila.style.display = coincideBusqueda && coincideEstado && coincideCondicion ? '' : 'none';
            });
        };

        filtroBusqueda.addEventListener('input', aplicarFiltros);
        filtroEstado.addEventListener('change', aplicarFiltros);
        filtroCondicion.addEventListener('change', aplicarFiltros);

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
        <div class="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
            <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    <h3 class="text-xl font-bold">Nuevo Mobiliario</h3>
                </div>
            </div>
        </div>
        <form id="formNuevoMueble" class="space-y-6 px-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                        Nombre *
                    </label>
                    <input type="text" id="nombreMueble" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Costo de Renta *
                    </label>
                    <input type="number" id="costoRentaMueble" min="0" step="0.01" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                </div>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                    </svg>
                    Descripción
                </label>
                <textarea id="descripcionMueble" rows="3" 
                    class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" 
                    placeholder="Descripción detallada del mobiliario..."></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                        Cantidad *
                    </label>
                    <input type="number" id="cantidadMueble" min="1" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Condición
                    </label>
                    <select id="condicionMueble" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <option value="excelente">Excelente</option>
                        <option value="buena" selected>Buena</option>
                        <option value="regular">Regular</option>
                        <option value="necesita_reparacion">Necesita Reparación</option>
                    </select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 
                    text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
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
            <div class="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <div class="px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <h3 class="text-xl font-bold">Editar Mobiliario</h3>
                    </div>
                </div>
            </div>
            <form id="formEditarMueble" class="space-y-6 px-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                            Nombre *
                        </label>
                        <input type="text" id="nombreMuebleEdit" value="${mueble.nombre}" required 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Costo de Renta *
                        </label>
                        <input type="number" id="costoRentaMuebleEdit" value="${mueble.costoRenta}" min="0" step="0.01" required 
                            class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                        </svg>
                        Descripción
                    </label>
                    <textarea id="descripcionMuebleEdit" rows="3" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">${mueble.descripcion || ''}</textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                        Cantidad Total *
                    </label>
                    <input type="number" id="cantidadMuebleEdit" value="${mueble.cantidad || 1}" min="${mueble.cantidadAsignada || 0}" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Condición
                    </label>
                    <select id="condicionMuebleEdit" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <option value="excelente" ${mueble.condicion === 'excelente' ? 'selected' : ''}>Excelente</option>
                        <option value="buena" ${mueble.condicion === 'buena' ? 'selected' : ''}>Buena</option>
                        <option value="regular" ${mueble.condicion === 'regular' ? 'selected' : ''}>Regular</option>
                        <option value="necesita_reparacion" ${mueble.condicion === 'necesita_reparacion' ? 'selected' : ''}>Necesita Reparación</option>
                    </select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 
                    text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
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
            inquilinos.push({ 
                id: doc.id, 
                ...data,
                inmuebleNombre: data.inmuebleAsociadoNombre || 'No especificado'
            });
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
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <div class="px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                        <h3 class="text-xl font-bold">Asignar Mobiliario</h3>
                    </div>
                </div>
            </div>
            <form id="formAsignarMueble" class="space-y-6 px-4">
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md mb-6 border border-indigo-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Disponibles</p>
                                <p class="text-lg font-bold text-indigo-900">${disponibles} de ${mueble.cantidad || 0}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Costo de Renta</p>
                                <p class="text-lg font-bold text-indigo-900">${(mueble.costoRenta || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        Inquilino *
                    </label>
                    <select id="inquilinoAsignar" required
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <option value="">Selecciona un inquilino</option>
                        ${inquilinos.map(inquilino => `
                            <option value="${inquilino.id}">
                                ${inquilino.nombre} - Inmueble: ${inquilino.inmuebleNombre}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                        Cantidad a asignar *
                    </label>
                    <input type="number" id="cantidadAsignar" min="1" max="${disponibles}" value="1" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <p class="text-xs text-gray-500 mt-1">Máximo disponible: ${disponibles}</p>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Fecha de Asignación *
                    </label>
                    <input type="date" id="fechaAsignacion" value="${new Date().toISOString().split('T')[0]}" required 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                    <p class="text-xs text-gray-500 mt-1">Si la asignación es antes del día 15, se cobrará en el mes actual. Si es a partir del día 15, se cobrará en el siguiente mes.</p>
                </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                        </svg>
                        Notas de asignación
                    </label>
                    <textarea id="notasAsignacion" rows="2" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" 
                        placeholder="Observaciones sobre la asignación..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
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
            const fechaAsignacion = document.getElementById('fechaAsignacion').value;
            const notas = document.getElementById('notasAsignacion').value.trim();

            if (!inquilinoId || cantidad < 1 || cantidad > disponibles) {
                mostrarNotificacion("Por favor verifica los datos ingresados.", "error");
                return;
            }

            try {
                const fechaAsignacion = document.getElementById('fechaAsignacion').value;
                const fechaAsignacionObj = new Date(fechaAsignacion);
                const diaAsignacion = fechaAsignacionObj.getDate();
                
                // Determinar si se cobra en el mes actual o siguiente
                const cobroEnMesActual = diaAsignacion < 15;
                
                // Actualizar asignaciones
                let asignaciones = Array.isArray(mueble.asignaciones) ? [...mueble.asignaciones] : [];
                const existingIndex = asignaciones.findIndex(a => a.inquilinoId === inquilinoId && a.activa !== false);
                
                if (existingIndex >= 0) {
                    asignaciones[existingIndex].cantidad += cantidad;
                    asignaciones[existingIndex].fechaUltimaModificacion = new Date().toISOString();
                    asignaciones[existingIndex].fechaAsignacion = fechaAsignacion;
                    asignaciones[existingIndex].cobroEnMesActual = cobroEnMesActual;
                    if (notas) asignaciones[existingIndex].notas = notas;
                } else {
                    // Obtener el inmueble asociado al inquilino
                    const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
                    const inmuebleAsociadoId = inquilinoDoc.data()?.inmuebleAsociadoId;
                    
                    asignaciones.push({
                        inquilinoId,
                        inmuebleAsociadoId,
                        cantidad,
                        fechaAsignacion: fechaAsignacion,
                        cobroEnMesActual: cobroEnMesActual,
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

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const opcionesLiberacion = asignacionesActivas.map(a => {
            const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
            const nombreInmueble = a.inmuebleAsociadoId ? inmueblesMap.get(a.inmuebleAsociadoId) || 'No especificado' : 'No especificado';
            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                    <div class="flex items-start">
                        <input type="checkbox" name="liberarAsignacion" value="${a.inquilinoId}" class="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                <div class="font-medium text-gray-900">${nombreInquilino} - Inmueble: ${nombreInmueble}</div>
                            </div>
                            <div class="text-sm text-gray-500 mt-1">
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                    <span>Cantidad asignada: ${a.cantidad}</span>
                                </div>
                                <div class="flex items-center space-x-2 mt-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span>Asignado: ${new Date(a.fechaAsignacion).toLocaleDateString()}</span>
                                </div>
                                <div class="flex items-center space-x-2 mt-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>Condición: ${a.condicionAsignacion || 'No especificada'}</span>
                                </div>
                            </div>
                            ${a.notas ? `
                                <div class="mt-2 text-xs text-gray-400 flex items-start space-x-2">
                                    <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                                    </svg>
                                    <span>${a.notas}</span>
                                </div>
                            ` : ''}
                            <div class="mt-3">
                                <label class="text-sm text-gray-600 flex items-center space-x-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                                </svg>
                                <span>Cantidad a liberar:</span>
                            </label>
                            <input type="number" 
                                   name="cantidadLiberar_${a.inquilinoId}" 
                                   min="1" 
                                   max="${a.cantidad}" 
                                   value="${a.cantidad}"
                                   class="mt-1 block w-24 border border-gray-300 rounded-lg shadow-sm py-1.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                   disabled>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const formHtml = `
            <div class="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <div class="px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                        </svg>
                        <h3 class="text-xl font-bold">Liberar Mobiliario</h3>
                    </div>
                </div>
            </div>
            <form id="formLiberarMueble" class="space-y-6 px-4">
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md mb-6 border border-indigo-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Total asignado</p>
                                <p class="text-lg font-bold text-indigo-900">${mueble.cantidadAsignada || 0} de ${mueble.cantidad || 0}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Asignaciones activas</p>
                                <p class="text-lg font-bold text-indigo-900">${asignacionesActivas.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    Selecciona las asignaciones a liberar:
                </label>
                <div class="space-y-3 max-h-60 overflow-y-auto">
                    ${opcionesLiberacion}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                        Condición al liberar
                    </label>
                    <select id="condicionLiberacion" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <option value="excelente">Excelente</option>
                        <option value="buena" selected>Buena</option>
                        <option value="regular">Regular</option>
                        <option value="necesita_reparacion">Necesita Reparación</option>
                        <option value="dañado">Dañado</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Motivo de liberación
                    </label>
                    <select id="motivoLiberacion" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700">
                        <option value="fin_contrato">Fin de contrato</option>
                        <option value="cambio_inmueble">Cambio de inmueble</option>
                        <option value="solicitud_inquilino">Solicitud del inquilino</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                        </svg>
                        Notas de liberación
                    </label>
                    <textarea id="notasLiberacion" rows="3" 
                        class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" 
                        placeholder="Observaciones sobre el estado del mobiliario al liberarlo..."></textarea>
                </div>
                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
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
/**
 * Ver historial completo del mobiliario.
 * @param {string} id - ID del mobiliario a consultar.
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

        // Obtener nombres de inquilinos
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        // Obtener nombres de inmuebles
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        // Ordenar historial por fecha (más reciente primero)
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const historialHtml = historial.map(h => {
            const fecha = new Date(h.fecha).toLocaleString();
            let descripcion = h.descripcion;
            
            // Si hay un inquilino asociado, mostrar su nombre y el inmueble
            if (h.inquilinoId) {
                const nombreInquilino = inquilinosMap.get(h.inquilinoId) || 'Inquilino Desconocido';
                const nombreInmueble = h.inmuebleAsociadoId ? inmueblesMap.get(h.inmuebleAsociadoId) || 'No especificado' : 'No especificado';
                descripcion = descripcion.replace('Inquilino Desconocido', `${nombreInquilino} - Inmueble: ${nombreInmueble}`);
            }

            return `
                <div class="border-l-4 ${getColorBorde(h.accion)} pl-4 py-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium text-gray-900">${descripcion}</p>
                            ${h.notas ? `<p class="text-sm text-gray-500 mt-1">${h.notas}</p>` : ''}
                        </div>
                        <span class="text-sm text-gray-500">${fecha}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Obtener asignaciones activas
        const asignacionesActivas = (mueble.asignaciones || []).filter(a => a.activa !== false);
        const resumenAsignaciones = asignacionesActivas.map(a => {
            const nombreInquilino = inquilinosMap.get(a.inquilinoId) || 'Inquilino Desconocido';
            const nombreInmueble = a.inmuebleAsociadoId ? inmueblesMap.get(a.inmuebleAsociadoId) || 'No especificado' : 'No especificado';
            return `
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-medium text-gray-900">${nombreInquilino} - Inmueble: ${nombreInmueble}</p>
                            <p class="text-sm text-gray-500">Cantidad: ${a.cantidad}</p>
                            <p class="text-sm text-gray-500">Asignado: ${new Date(a.fechaAsignacion).toLocaleDateString()}</p>
                            ${a.notas ? `<p class="text-sm text-gray-500 mt-1">${a.notas}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const modalHtml = `
            <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <div class="px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3 class="text-xl font-bold">Historial de ${mueble.nombre}</h3>
                    </div>
                </div>
            </div>
            <div class="space-y-6 px-4">
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md mb-6 border border-indigo-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Total en inventario</p>
                                <p class="text-lg font-bold text-indigo-900">${mueble.cantidad || 0} unidades</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-medium text-indigo-800">Asignaciones activas</p>
                                <p class="text-lg font-bold text-indigo-900">${asignacionesActivas.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Historial de Movimientos
                    </h4>
                    <div class="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                        <div class="flex items-center">
                            <div class="w-3 h-3 border-l-4 border-green-500 mr-1"></div>
                            <span>Creado</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 border-l-4 border-blue-500 mr-1"></div>
                            <span>Asignado</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 border-l-4 border-orange-500 mr-1"></div>
                            <span>Liberado</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-3 h-3 border-l-4 border-yellow-500 mr-1"></div>
                            <span>Editado</span>
                        </div>
                    </div>
                    <div class="space-y-3">
                        ${resumenAsignaciones || '<p class="text-gray-500">No hay asignaciones activas</p>'}
                    </div>
                </div>

                <div>
                    <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Historial de Movimientos
                    </h4>
                    <div class="space-y-3">
                        ${historialHtml || '<p class="text-gray-500">No hay historial disponible</p>'}
                    </div>
                </div>

                <div class="flex justify-end mt-8 gap-3">
                    <button onclick="ocultarModal()" 
                        class="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cerrar
                    </button>
                    <button onclick="limpiarHistorialMueble('${id}')" 
                        class="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 
                        text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        Limpiar Historial
                    </button>
                </div>
            </div>
        `;
        mostrarModal(modalHtml);

        // Agrega la función global para limpiar historial:
        window.limpiarHistorialMueble = async function(id) {
            if (confirm("¿Estás seguro de que deseas limpiar el historial de este mobiliario? Esta acción no se puede deshacer.")) {
                try {
                    await updateDoc(doc(db, "mobiliario", id), {
                        historial: []
                    });
                    mostrarNotificacion("Historial limpiado correctamente.", "success");
                    ocultarModal();
                    mostrarInventarioMobiliario();
                } catch (error) {
                    mostrarNotificacion("Error al limpiar el historial.", "error");
                }
            }
        };
    } catch (error) {
        console.error("Error al cargar historial:", error);
        mostrarNotificacion("Error al cargar el historial del mobiliario.", "error");
    }
};

// Exportar funciones globales
window.mostrarInventarioMobiliario = mostrarInventarioMobiliario;
window.mostrarFormularioNuevoMueble = mostrarFormularioNuevoMueble;
window.eliminarMueble = eliminarMueble;
window.verHistorialMobiliario = verHistorialMobiliario;

window.actualizarAsignacionesInmuebles = async function() {
    try {
        // Obtener todos los documentos de mobiliario
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        
        for (const mobDoc of mobiliarioSnap.docs) {
            const mobiliario = mobDoc.data();
            const asignaciones = mobiliario.asignaciones || [];
            let asignacionesActualizadas = false;

            // Actualizar cada asignación
            for (let asignacion of asignaciones) {
                if (asignacion.activa !== false && !asignacion.inmuebleAsociadoId) {
                    // Obtener el inquilino
                    const inquilinoDoc = await getDoc(doc(db, "inquilinos", asignacion.inquilinoId));
                    if (inquilinoDoc.exists()) {
                        const inmuebleAsociadoId = inquilinoDoc.data()?.inmuebleAsociadoId;
                        if (inmuebleAsociadoId) {
                            asignacion.inmuebleAsociadoId = inmuebleAsociadoId;
                            asignacionesActualizadas = true;
                        }
                    }
                }
            }

            // Si se actualizaron asignaciones, guardar los cambios
            if (asignacionesActualizadas) {
                await updateDoc(doc(db, "mobiliario", mobDoc.id), {
                    asignaciones: asignaciones
                });
            }
        }

        // No mostrar notificación
        mostrarInventarioMobiliario();
    } catch (error) {
        console.error("Error al actualizar asignaciones:", error);
        mostrarNotificacion("Error al actualizar las asignaciones.", "error");
    }
};

// Llamar a la función para actualizar las asignaciones
// window.actualizarAsignacionesInmuebles();

/**
 * Obtiene el color del borde según la acción del historial
 */
function getColorBorde(accion) {
    switch (accion) {
        case 'creado':
            return 'border-green-500';
        case 'asignado':
            return 'border-blue-500';
        case 'liberado':
            return 'border-orange-500';
        case 'editado':
            return 'border-yellow-500';
        default:
            return 'border-gray-500';
    }
}