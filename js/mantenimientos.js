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
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${mantenimiento.nombreInmueble}</td>
                        <td class="px-4 py-2 text-sm text-gray-700 whitespace-normal max-w-xs overflow-hidden text-ellipsis">${mantenimiento.descripcion || 'Sin descripción'}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(mantenimiento.costo ?? 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${mantenimiento.categoria || 'N/A'}</td>
                        <td class="px-4 py-2 text-sm">
                            <span class="${prioridadClass}">${mantenimiento.prioridad || 'N/A'}</span>
                        </td>
                        <td class="px-4 py-2 text-sm">
                            <span class="${estadoClass}">${mantenimiento.estado || 'N/A'}</span>
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-700">${mantenimiento.fechaMantenimiento || 'N/A'}</td>
                        <td class="px-4 py-2 text-sm text-right">
                            <div class="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-1 sm:space-y-0">
                                <button onclick="editarMantenimiento('${mantenimiento.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Editar</button>
                                <button onclick="eliminarDocumento('mantenimientos', '${mantenimiento.id}', mostrarMantenimientos)" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Eliminar</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        contenedor.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Listado de Mantenimientos</h2>
                <button onclick="mostrarFormularioNuevoMantenimiento()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Mantenimiento</button>
            </div>
            <div class="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th scope="col" class="relative px-4 py-2 text-right"><span class="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tablaFilas}
                    </tbody>
                </table>
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

    // Modificación aquí: usar (mantenimiento?.propiedad ?? '') para asegurar un string vacío si es null/undefined
    const modalContent = `
        <div class=\"px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6\">
            <h3 class=\"text-2xl font-bold text-center\">${tituloModal}</h3>
        </div>
        <form id=\"formMantenimiento\" class=\"space-y-4\">
            <div>
                <label for=\"inmuebleId\" class=\"block text-sm font-medium text-gray-700\">Inmueble</label>
                <select id=\"inmuebleId\" name=\"inmuebleId\" class=\"mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md\" required>
                    <option value=\"\">Selecciona un inmueble</option>
                    ${inmueblesOptions}
                </select>
            </div>
            <div>
                <label for=\"fechaMantenimiento\" class=\"block text-sm font-medium text-gray-700\">Fecha de Mantenimiento</label>
                <input type=\"date\" id=\"fechaMantenimiento\" name=\"fechaMantenimiento\" class=\"mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md\" value=\"${mantenimiento?.fechaMantenimiento ?? ''}\" required>
            </div>
            <div>
                <label for=\"descripcion\" class=\"block text-sm font-medium text-gray-700\">Descripción</label>
                <textarea id=\"descripcion\" name=\"descripcion\" rows=\"3\" class=\"mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md\" placeholder=\"Breve descripción del mantenimiento realizado.\" required>${mantenimiento?.descripcion ?? ''}</textarea>
            </div>
            <div>
                <label for=\"costo\" class=\"block text-sm font-medium text-gray-700\">Costo</label>
                <input type=\"number\" id=\"costo\" name=\"costo\" step=\"0.01\" class=\"mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md\" value=\"${mantenimiento?.costo ?? ''}\" placeholder=\"0.00\" required>
            </div>
            <div>
                <label for=\"categoria\" class=\"block text-sm font-medium text-gray-700\">Categoría</label>
                <select id=\"categoria\" name=\"categoria\" class=\"mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md\" required>
                    <option value=\"\">Selecciona una categoría</option>
                    ${categoriaOptions}
                </select>
            </div>
            <div>
                <label for=\"prioridad\" class=\"block text-sm font-medium text-gray-700\">Prioridad</label>
                <select id=\"prioridad\" name=\"prioridad\" class=\"mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md\" required>
                    <option value=\"\">Selecciona una prioridad</option>
                    ${prioridadOptions}
                </select>
            </div>
            <div>
                <label for=\"estado\" class=\"block text-sm font-medium text-gray-700\">Estado</label>
                <select id=\"estado\" name=\"estado\" class=\"mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md\" required>
                    <option value=\"\">Selecciona un estado</option>
                    ${estadoOptions}
                </select>
            </div>
            <div class=\"flex justify-end space-x-3 mt-6\">
                <button type=\"button\" onclick=\"ocultarModal()\" class=\"bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200\">Cancelar</button>
                <button type=\"submit\" class=\"btn-primary\">${id ? "Actualizar" : "Registrar"} Mantenimiento</button>
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
            <div class=\"px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6\">
                <h3 class=\"text-2xl font-bold text-center\">Historial de Mantenimientos</h3>
                <p class=\"text-center text-indigo-100 mt-1\">Para: <span class=\"font-semibold\">${inmuebleNombre}</span></p>
            </div>

            <div class=\"bg-gray-100 p-4 rounded-lg shadow-inner mb-6 text-center\">
                <p class=\"text-lg font-semibold text-gray-700\">Total de Costo de Mantenimientos:</p>
                <p class=\"text-3xl font-extrabold text-indigo-700 mt-2\">$${totalCostoMantenimientos.toFixed(2)}</p>
            </div>
            
            <div class=\"shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg\">
                <table class=\"min-w-full divide-y divide-gray-200\">
                    <thead class=\"bg-gray-50\">
                        <tr>
                            <th scope=\"col\" class=\"px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Descripción</th>
                            <th scope=\"col\" class=\"px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Costo</th>
                            <th scope=\"col\" class=\"px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Prioridad</th>
                            <th scope=\"col\" class=\"px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Estado</th>
                            <th scope=\"col\" class=\"px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Fecha</th>
                        </tr>
                    </thead>
                    <tbody class=\"bg-white divide-y divide-gray-200\">
                        ${tablaHistorialMantenimientoHtml}
                    </tbody>
                </table>
            </div>

            <div class=\"flex justify-end mt-6\">
                <button type=\"button\" onclick=\"ocultarModal()\" class=\"bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200\">Cerrar</button>
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