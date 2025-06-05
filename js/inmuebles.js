// js/inmuebles.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { mostrarHistorialPagosInmueble } from './pagos.js'; // Importar para mostrar historial de pagos
import { mostrarHistorialMantenimientoInmueble } from './mantenimientos.js'; // Importar para mostrar historial de mantenimientos
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm"; // Si usas módulos

/**
 * Muestra la lista de inmuebles en forma de tarjetas.
 */
export async function mostrarInmuebles(estadoFiltro = null) {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inmuebles.", 'error');
        return;
    }

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        let inmueblesList = [];
        inmueblesSnap.forEach(doc => {
            inmueblesList.push({ id: doc.id, ...doc.data() });
        });

        // Filtrar por estado si se solicita
        if (estadoFiltro) {
            inmueblesList = inmueblesList.filter(inmueble => inmueble.estado.toLowerCase() === estadoFiltro.toLowerCase());
        }

        // Ordenar los inmuebles para que los disponibles salgan primero
        inmueblesList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        let tarjetasInmueblesHtml = "";
        if (inmueblesList.length === 0) {
            tarjetasInmueblesHtml = `<p class="text-gray-500 text-center py-8">No hay inmuebles registrados.</p>`;
        } else {
            tarjetasInmueblesHtml = inmueblesList.map(inmueble => `
                <div class="bg-white rounded-lg shadow-md p-6 border-l-4 ${inmueble.estado === 'Ocupado' ? 'border-orange-500' : 'border-green-500'}" data-id="${inmueble.id}">
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">${inmueble.nombre}</h3>
                    <p class="text-gray-600 mb-1"><strong>Dirección:</strong> ${inmueble.direccion}</p>
                    <p class="text-gray-600 mb-1"><strong>Tipo:</strong> ${inmueble.tipo}</p>
                    <p class="text-gray-600 mb-1"><strong>Renta Mensual:</strong> $${(inmueble.rentaMensual ?? 0).toFixed(2)}</p>
                    <p class="text-gray-600 mb-4"><strong>Estado:</strong>
                        <span class="${inmueble.estado === 'Ocupado' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'} px-2 py-0.5 rounded-full text-sm font-medium">
                            ${inmueble.estado}
                        </span>
                    </p>
                    <div class="flex flex-wrap gap-2 justify-end items-center">
                        ${inmueble.urlContrato ? `
                            <a href="${inmueble.urlContrato}" target="_blank" rel="noopener noreferrer"
                                class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-1 rounded-md text-sm font-semibold shadow transition-colors duration-200 flex items-center gap-1"
                                title="Ver contrato en Drive">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Ver Contrato
                            </a>
                        ` : ''}
                        <button onclick="mostrarHistorialPagosInmueble('${inmueble.id}', '${inmueble.nombre}')" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Pagos</button>
                        <button onclick="mostrarHistorialMantenimientoInmueble('${inmueble.id}', '${inmueble.nombre}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Mantenimientos</button>
                        <button onclick="editarInmueble('${inmueble.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Editar</button>
                        <button onclick="eliminarDocumento('inmuebles', '${inmueble.id}', mostrarInmuebles)" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Eliminar</button>
                        <button onclick="mostrarHistorialInquilinosInmueble('${inmueble.id}', '${inmueble.nombre}')" class="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Historial Inquilinos</button>
                    </div>
                </div>
            `).join('');
        }

        contenedor.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Inmuebles</h2>
                <div class="flex gap-2">
                    <button onclick="mostrarFormularioNuevoPropietario()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Propietario
                    </button>
                    <button onclick="mostrarFormularioNuevoInmueble()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Inmueble</button>
                </div>
            </div>
            <div id="listaInmuebles" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${tarjetasInmueblesHtml}
            </div>
        `;

        const lista = document.getElementById('listaInmuebles');
        Sortable.create(lista, {
            animation: 150,
            onEnd: async function (evt) {
                // Obtén el nuevo orden de los IDs
                const ids = Array.from(lista.children).map(card => card.dataset.id);
                // Actualiza el campo 'orden' en Firestore para cada inmueble
                for (let i = 0; i < ids.length; i++) {
                    await updateDoc(doc(db, "inmuebles", ids[i]), { orden: i });
                }
                mostrarNotificacion("Orden actualizado.", "success");
            }
        });

    } catch (error) {
        console.error("Error al obtener inmuebles:", error);
        mostrarNotificacion("Error al cargar los inmuebles.", 'error');
    }
}

/**
 * Muestra el formulario para registrar un nuevo inmueble o editar uno existente.
 * @param {string} [id] - ID del inmueble a editar (opcional).
 */
export async function mostrarFormularioNuevoInmueble(id = null) {
    let inmueble = null;
    if (id) {
        try {
            const docSnap = await getDoc(doc(db, "inmuebles", id));
            if (docSnap.exists()) {
                inmueble = { id: docSnap.id, ...docSnap.data() };
            }
        } catch (error) {
            console.error("Error al obtener el inmueble para editar:", error);
            mostrarNotificacion("Error al cargar los datos del inmueble para editar.", 'error');
            return;
        }
    }

    const tituloModal = id ? "Editar Inmueble" : "Registrar Nuevo Inmueble";

    const modalContent = `
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">${tituloModal}</h3>
        </div>
        <form id="formInmueble" class="space-y-4">
            <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700">Nombre/Identificador</label>
                <input type="text" id="nombre" name="nombre" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inmueble?.nombre ?? ''}" required>
            </div>
            <div>
                <label for="direccion" class="block text-sm font-medium text-gray-700">Dirección</label>
                <input type="text" id="direccion" name="direccion" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inmueble?.direccion ?? ''}" required>
            </div>
            <div>
                <label for="tipo" class="block text-sm font-medium text-gray-700">Tipo de Inmueble</label>
                <select id="tipo" name="tipo" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                    <option value="">Selecciona un tipo</option>
                    <option value="Casa" ${inmueble?.tipo === 'Casa' ? 'selected' : ''}>Casa</option>
                    <option value="Apartamento" ${inmueble?.tipo === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                    <option value="Local Comercial" ${inmueble?.tipo === 'Local Comercial' ? 'selected' : ''}>Local Comercial</option>
                    <option value="Oficina" ${inmueble?.tipo === 'Oficina' ? 'selected' : ''}>Oficina</option>
                </select>
            </div>
            <div>
                <label for="rentaMensual" class="block text-sm font-medium text-gray-700">Renta Mensual</label>
                <input type="number" id="rentaMensual" name="rentaMensual" step="0.01" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inmueble?.rentaMensual ?? ''}" required>
            </div>
            <div>
                <label for="estado" class="block text-sm font-medium text-gray-700">Estado</label>
                <select id="estado" name="estado" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                    <option value="Disponible" ${inmueble?.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
                    <option value="Ocupado" ${inmueble?.estado === 'Ocupado' ? 'selected' : ''}>Ocupado</option>
                    <option value="Mantenimiento" ${inmueble?.estado === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                </select>
            </div>
            <div>
                <label for="urlContrato" class="block text-sm font-medium text-gray-700">URL de Contrato (Drive)</label>
                <input type="url" id="urlContrato" name="urlContrato" placeholder="https://drive.google.com/..." class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inmueble?.urlContrato ?? ''}">
                <span class="text-xs text-gray-400">Pega aquí el enlace de Google Drive del contrato (opcional).</span>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="tieneInternet" name="tieneInternet">
                    ¿Cuenta con servicio de Internet?
                </label>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="btn-primary">${id ? "Actualizar" : "Registrar"} Inmueble</button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    document.getElementById('formInmueble').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Asegurarse de que rentaMensual es un número
        data.rentaMensual = parseFloat(data.rentaMensual);
        const tieneInternet = document.getElementById('tieneInternet').checked;
        data.tieneInternet = tieneInternet;

        try {
            if (id) {
                await updateDoc(doc(db, "inmuebles", id), data);
                mostrarNotificacion("Inmueble actualizado con éxito.", 'success');
            } else {
                await addDoc(collection(db, "inmuebles"), data);
                mostrarNotificacion("Inmueble registrado con éxito.", 'success');
            }
            ocultarModal();
            mostrarInmuebles(); // Recargar la lista de inmuebles
         
        } catch (err) {
            console.error("Error al guardar el inmueble:", err);
            mostrarNotificacion("Error al guardar el inmueble.", 'error');
        }
    });
}

/**
 * Función para editar un inmueble, mostrando el formulario.
 * @param {string} id - ID del inmueble a editar.
 */
export async function editarInmueble(id) {
    mostrarFormularioNuevoInmueble(id);
}

/**
 * Muestra el historial de inquilinos de un inmueble en un modal.
 * @param {string} inmuebleId - ID del inmueble.
 * @param {string} inmuebleNombre - Nombre del inmueble.
 */
export async function mostrarHistorialInquilinosInmueble(inmuebleId, inmuebleNombre) {
    try {
        // Buscar todos los inquilinos que han estado asociados a este inmueble
        const inquilinosSnap = await getDocs(query(
            collection(db, "inquilinos"),
            where("inmuebleId", "==", inmuebleId)
        ));

        let historial = [];
        const hoy = new Date().toISOString().slice(0, 10);

        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            // Usa siempre fechaInicioContrato y fechaFinContrato si existen, si no, usa fechaDesocupacion
            const fechaInicio = data.fechaInicioContrato || data.fechaInicio || '';
            const fechaFin = data.fechaFinContrato || data.fechaDesocupacion || '';
            // Considera actual si no hay fecha de fin o si la fecha de fin es en el futuro
            const esActual = !fechaFin || fechaFin === '' || fechaFin === null || fechaFin >= hoy;
            historial.push({
                nombre: data.nombre,
                fechaInicio,
                fechaFin,
                telefono: data.telefono || '',
                correo: data.correo || '',
                actual: esActual
            });
        });

        // Ordenar por fecha de inicio descendente (más reciente primero)
        historial.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

        let tablaHtml = '';
        if (historial.length === 0) {
            tablaHtml = `<p class="text-gray-500 text-center py-4">Este inmueble no tiene historial de inquilinos.</p>`;
        } else {
            tablaHtml = `
                <div class="overflow-x-auto rounded-lg shadow border border-gray-200 mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inquilino</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actual</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${historial.map(h => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.nombre}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.fechaInicio || '-'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.fechaFin || '-'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.telefono || '-'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${h.correo || '-'}</td>
                                    <td class="px-4 py-2 text-center">${h.actual ? '<span title="Actual" class="inline-block w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">&#10003;</span>' : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        mostrarModal(`
            <div class="px-4 py-3 bg-cyan-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-xl font-bold text-center">Historial de Inquilinos<br><span class="text-base font-normal">${inmuebleNombre}</span></h3>
            </div>
            ${tablaHtml}
            <div class="flex justify-end mt-6">
                <button onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `);

    } catch (error) {
        console.error("Error al obtener historial de inquilinos:", error);
        mostrarNotificacion("Error al cargar el historial de inquilinos.", 'error');
    }
}

window.mostrarHistorialInquilinosInmueble = mostrarHistorialInquilinosInmueble;

/**
 * Función para eliminar un documento de Firestore.
 * @param {string} coleccion - Nombre de la colección.
 * @param {string} id - ID del documento a eliminar.
 * @param {function} callback - Función a ejecutar después de eliminar (opcional).
 * @param {function} callbackDashboard - Función para actualizar el dashboard (opcional).
 */
export async function eliminarDocumento(coleccion, id, callback, callbackDashboard) {
    try {
        await deleteDoc(doc(db, coleccion, id));
        if (typeof callback === 'function') callback();
        if (typeof callbackDashboard === 'function') callbackDashboard();
        mostrarNotificacion("Documento eliminado correctamente.", 'success');
    } catch (error) {
        console.error("Error al eliminar el documento:", error);
        mostrarNotificacion("Error al eliminar el documento.", 'error');
    }
}

window.mostrarFormularioNuevoPropietario = function() {
    mostrarModal(`
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">Registrar Propietario</h3>
        </div>
        <form id="formPropietario" class="space-y-4">
            <div>
                <label for="nombrePropietario" class="block text-sm font-medium text-gray-700">Nombre</label>
                <input type="text" id="nombrePropietario" name="nombrePropietario" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" required>
            </div>
            <div>
                <label for="telefonoPropietario" class="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="text" id="telefonoPropietario" name="telefonoPropietario" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" required>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="btn-primary">Registrar Propietario</button>
            </div>
        </form>
    `);

    document.getElementById('formPropietario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombrePropietario').value.trim();
        const telefono = document.getElementById('telefonoPropietario').value.trim();
        if (!nombre || !telefono) {
            mostrarNotificacion("Completa todos los campos.", 'error');
            return;
        }
        try {
            await addDoc(collection(db, "propietarios"), { nombre, telefono });
            mostrarNotificacion("Propietario registrado con éxito.", 'success');
            ocultarModal();
        } catch (err) {
            console.error("Error al registrar propietario:", err);
            mostrarNotificacion("Error al registrar propietario.", 'error');
        }
    });
};

