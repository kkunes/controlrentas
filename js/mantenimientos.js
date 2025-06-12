// js/mantenimientos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra la lista de mantenimientos en formato de tabla.
 */
export async function mostrarMantenimientos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de mantenimientos.", 'error');
        return;
    }

    try {
        const mantenimientosSnap = await getDocs(collection(db, "mantenimientos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles")); // Para asociar mantenimiento a inmueble

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        let mantenimientosList = [];
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = data.inmuebleId ? inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido' : 'N/A';
            mantenimientosList.push({ id: doc.id, ...data, nombreInmueble });
        });

        let tablaFilas = "";
        // NOTA: Hay 8 columnas en total (Inmueble, Descripción, Costo, Categoría, Prioridad, Estado, Fecha, Acciones)
        if (mantenimientosList.length === 0) {
            tablaFilas = `<tr><td colspan=\"8\" class=\"text-center py-4 text-gray-500\">No hay mantenimientos registrados.</td></tr>`;
        } else {
            mantenimientosList.sort((a, b) => new Date(b.fechaMantenimiento) - new Date(a.fechaMantenimiento)); // Ordenar por fecha, el más reciente primero
            mantenimientosList.forEach(mantenimiento => {
                // Clases para estilo de 'chip' para Prioridad
                let prioridadClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (mantenimiento.prioridad) {
                    case "Urgente":
                        prioridadClass += " bg-red-100 text-red-800";
                        break;
                    case "Alta":
                        prioridadClass += " bg-orange-100 text-orange-800";
                        break;
                    case "Media":
                        prioridadClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "Baja":
                        prioridadClass += " bg-green-100 text-green-800";
                        break;
                    default:
                        prioridadClass += " bg-gray-100 text-gray-800";
                        break;
                }

                // Clases para estilo de 'chip' para Estado
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (mantenimiento.estado) {
                    case "Pendiente":
                        estadoClass += " bg-red-100 text-red-800";
                        break;
                    case "En Progreso":
                        estadoClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "Completado":
                        estadoClass += " bg-green-100 text-green-800";
                        break;
                    case "Cancelado":
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                    default:
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                }


                tablaFilas += `
                    <tr class="hover:bg-gray-50 transition-colors duration-200">
                        <td class="px-6 py-4 text-sm text-gray-800">${mantenimiento.nombreInmueble}</td>
                        <td class="px-6 py-4 text-sm text-gray-700 whitespace-normal max-w-xs overflow-hidden text-ellipsis">${mantenimiento.descripcion || 'Sin descripción'}</td>
                        <td class="px-6 py-4 text-sm text-gray-800 font-medium">$${(mantenimiento.costo ?? 0).toFixed(2)}</td>
                        <td class="px-6 py-4 text-sm text-gray-700">${mantenimiento.categoria || 'N/A'}</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="${prioridadClass}">${mantenimiento.prioridad || 'N/A'}</span>
                        </td>
                        <td class="px-6 py-4 text-sm">
                            <span class="${estadoClass}">${mantenimiento.estado || 'N/A'}</span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-700">${mantenimiento.fechaMantenimiento || 'N/A'}</td>
                        <td class="px-6 py-4 text-sm text-right">
                            <div class="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-1 sm:space-y-0">
                                <button onclick="editarMantenimiento('${mantenimiento.id}')" 
                                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                    text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar
                                </button>
                                <button onclick="eliminarDocumento('mantenimientos', '${mantenimiento.id}', mostrarMantenimientos)" 
                                    class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                                    text-white px-3 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        contenedor.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 class="text-3xl font-bold text-gray-800 flex items-center">
                    <svg class="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                    </svg>
                    Listado de Mantenimientos
                </h2>
                <button onclick="mostrarFormularioNuevoMantenimiento()" 
                    class="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                    text-white px-6 py-3 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center font-medium">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Registrar Nuevo Mantenimiento
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" class="relative px-6 py-4 text-right"><span class="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tablaFilas}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Error al obtener mantenimientos:", error);
        mostrarNotificacion("Error al cargar los mantenimientos.", 'error');
    }
}

/**
 * Muestra el formulario para registrar un nuevo mantenimiento o editar uno existente.
 * @param {string} [id] - ID del mantenimiento a editar (opcional).
 */
export async function mostrarFormularioNuevoMantenimiento(id = null) {
    let mantenimiento = null;
    let inmueblesList = [];

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        inmueblesSnap.forEach(doc => {
            inmueblesList.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "mantenimientos", id));
            if (docSnap.exists()) {
                mantenimiento = { id: docSnap.id, ...docSnap.data() };
            }
        }
    } catch (error) {
        console.error("Error al cargar datos para el formulario de mantenimiento:", error);
        mostrarNotificacion("Error al cargar datos para el formulario de mantenimiento.", 'error');
        return;
    }

    const tituloModal = id ? "Editar Mantenimiento" : "Registrar Nuevo Mantenimiento";

    const inmueblesOptions = inmueblesList.map(inmueble => `
        <option value=\"${inmueble.id}\" ${mantenimiento?.inmuebleId === inmueble.id ? 'selected' : ''}>
            ${inmueble.nombre}
        </option>
    `).join('');

    // Opciones para Categoría (puedes personalizar estas)
    const categorias = ["Fontanería", "Electricidad", "Pintura", "Jardinería", "Limpieza", "Reparación General", "Otros"];
    const categoriaOptions = categorias.map(cat => `
        <option value=\"${cat}\" ${mantenimiento?.categoria === cat ? 'selected' : ''}>
            ${cat}
        </option>
    `).join('');

    // Opciones para Prioridad
    const prioridades = ["Baja", "Media", "Alta", "Urgente"];
    const prioridadOptions = prioridades.map(prio => `
        <option value=\"${prio}\" ${mantenimiento?.prioridad === prio ? 'selected' : ''}>
            ${prio}
        </option>
    `).join('');

    // Opciones para Estado
    const estados = ["Pendiente", "En Progreso", "Completado", "Cancelado"];
    const estadoOptions = estados.map(est => `
        <option value=\"${est}\" ${mantenimiento?.estado === est ? 'selected' : ''}>
            ${est}
        </option>
    `).join('');

    const modalContent = `
        <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">${tituloModal}</h3>
        </div>
        <form id="formMantenimiento" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="inmuebleId" class="block text-sm font-medium text-gray-700 mb-2">Inmueble</label>
                    <select id="inmuebleId" name="inmuebleId" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" required>
                        <option value="">Selecciona un inmueble</option>
                        ${inmueblesOptions}
                    </select>
                </div>
                <div>
                    <label for="fechaMantenimiento" class="block text-sm font-medium text-gray-700 mb-2">Fecha de Mantenimiento</label>
                    <input type="date" id="fechaMantenimiento" name="fechaMantenimiento" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" value="${mantenimiento?.fechaMantenimiento ?? ''}" required>
                </div>
            </div>
            <div>
                <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea id="descripcion" name="descripcion" rows="3" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" placeholder="Breve descripción del mantenimiento realizado." required>${mantenimiento?.descripcion ?? ''}</textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="costo" class="block text-sm font-medium text-gray-700 mb-2">Costo</label>
                    <input type="number" id="costo" name="costo" step="0.01" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" value="${mantenimiento?.costo ?? ''}" placeholder="0.00" required>
                </div>
                <div>
                    <label for="categoria" class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                    <select id="categoria" name="categoria" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" required>
                        <option value="">Selecciona una categoría</option>
                        ${categoriaOptions}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="prioridad" class="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                    <select id="prioridad" name="prioridad" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" required>
                        <option value="">Selecciona una prioridad</option>
                        ${prioridadOptions}
                    </select>
                </div>
                <div>
                    <label for="estado" class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select id="estado" name="estado" class="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700" required>
                        <option value="">Selecciona un estado</option>
                        ${estadoOptions}
                    </select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 
                    text-white font-medium rounded-xl shadow-md transition-all duration-200">
                    ${id ? "Actualizar" : "Registrar"} Mantenimiento
                </button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    document.getElementById('formMantenimiento').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Asegurarse de que el costo es un número
        data.costo = parseFloat(data.costo);

        try {
            if (id) {
                await updateDoc(doc(db, "mantenimientos", id), data);
                mostrarNotificacion("Mantenimiento actualizado con éxito.", 'success');
            } else {
                await addDoc(collection(db, "mantenimientos"), data);
                mostrarNotificacion("Mantenimiento registrado con éxito.", 'success');
            }
            ocultarModal();
            mostrarMantenimientos(); // Recargar la lista de mantenimientos
            
        } catch (err) {
            console.error("Error al guardar el mantenimiento:", err);
            mostrarNotificacion("Error al guardar el mantenimiento.", 'error');
        }
    });
}

/**
 * Función para editar un mantenimiento, mostrando el formulario.
 * @param {string} id - ID del mantenimiento a editar.
 */
export async function editarMantenimiento(id) {
    mostrarFormularioNuevoMantenimiento(id);
}

/**
 * Muestra el historial de mantenimientos para un inmueble específico en un modal.
 * @param {string} inmuebleId - ID del inmueble para el cual mostrar el historial.
 * @param {string} inmuebleNombre - Nombre del inmueble. // Asegúrate de pasar el nombre del inmueble desde donde llamas esta función
 */
export async function mostrarHistorialMantenimientoInmueble(inmuebleId, inmuebleNombre) {
    try {
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        if (!inmuebleDoc.exists()) {
            mostrarNotificacion("Inmueble no encontrado.", 'error');
            return;
        }
        // El nombre del inmueble ya se pasa como parámetro, así que no es estrictamente necesario re-obtenerlo
        // const inmuebleNombre = inmuebleDoc.data().nombre;

        const mantenimientosQuery = query(collection(db, "mantenimientos"), where("inmuebleId", "==", inmuebleId));
        const mantenimientosSnap = await getDocs(mantenimientosQuery);

        let mantenimientosList = [];
        let totalCostoMantenimientos = 0;

        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            mantenimientosList.push({ id: doc.id, ...data });
            totalCostoMantenimientos += parseFloat(data.costo || 0);
        });

        // Ordenar por fecha (más reciente primero)
        mantenimientosList.sort((a, b) => new Date(b.fechaMantenimiento) - new Date(a.fechaMantenimiento));

        let tablaHistorialMantenimientoHtml = ""; // Cambiado a tablaHistorialMantenimientoHtml
        if (mantenimientosList.length === 0) {
            tablaHistorialMantenimientoHtml = `<tr><td colspan=\"5\" class=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center\">No hay mantenimientos registrados para este inmueble.</td></tr>`;
        } else {
            tablaHistorialMantenimientoHtml = mantenimientosList.map(mantenimiento => {
                // Clases para estilo de 'chip' para Prioridad
                let prioridadClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (mantenimiento.prioridad) {
                    case "Urgente":
                        prioridadClass += " bg-red-100 text-red-800";
                        break;
                    case "Alta":
                        prioridadClass += " bg-orange-100 text-orange-800";
                        break;
                    case "Media":
                        prioridadClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "Baja":
                        prioridadClass += " bg-green-100 text-green-800";
                        break;
                    default:
                        prioridadClass += " bg-gray-100 text-gray-800";
                        break;
                }

                // Clases para estilo de 'chip' para Estado
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (mantenimiento.estado) {
                    case "Pendiente":
                        estadoClass += " bg-red-100 text-red-800";
                        break;
                    case "En Progreso":
                        estadoClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "Completado":
                        estadoClass += " bg-green-100 text-green-800";
                        break;
                    case "Cancelado":
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                    default:
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                }

                return `
                    <tr class=\"hover:bg-gray-50\">
                        <td class=\"px-4 py-2 text-sm text-gray-700 whitespace-normal max-w-xs overflow-hidden text-ellipsis\">${mantenimiento.descripcion || 'Sin descripción'}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-800\">$${(mantenimiento.costo ?? 0).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm\">
                            <span class=\"${prioridadClass}\">${mantenimiento.prioridad || 'N/A'}</span>
                        </td>
                        <td class=\"px-4 py-2 text-sm\">
                            <span class=\"${estadoClass}\">${mantenimiento.estado || 'N/A'}</span>
                        </td>
                        <td class=\"px-4 py-2 text-sm text-gray-700\">${mantenimiento.fechaMantenimiento || 'N/A'}</td>
                    </tr>
                `;
            }).join('');
        }

        const modalContentHtml = `
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Mantenimientos</h3>
                <p class="text-center text-indigo-100 mt-1">Para: <span class="font-semibold">${inmuebleNombre}</span></p>
            </div>

            <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md mb-6 text-center border border-indigo-200">
                <p class="text-lg font-semibold text-indigo-700">Total de Costo de Mantenimientos:</p>
                <p class="text-3xl font-extrabold text-indigo-900 mt-2">$${totalCostoMantenimientos.toFixed(2)}</p>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tablaHistorialMantenimientoHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200">
                    Cerrar
                </button>
            </div>
        `;
        mostrarModal(modalContentHtml);

    } catch (error) {
        console.error("Error al mostrar historial de mantenimientos:", error);
        mostrarNotificacion("Error al cargar el historial de mantenimientos.", 'error');
    }
}

// Función auxiliar para eliminar documentos, exportada para uso en main.js
export async function eliminarDocumento(coleccion, id, callbackRefresh, callbackDashboard) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');
            if (callbackRefresh) callbackRefresh();
            if (callbackDashboard) callbackDashboard();
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}