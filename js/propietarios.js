import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

export async function mostrarPropietarios() {
    try {
        // Obtener lista de propietarios
        const propietariosSnap = await getDocs(collection(db, "propietarios"));
        let propietariosList = [];
        propietariosSnap.forEach(doc => {
            propietariosList.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar por nombre
        propietariosList.sort((a, b) => a.nombre.localeCompare(b.nombre));

        let listaPropietariosHtml = '';
        if (propietariosList.length === 0) {
            listaPropietariosHtml = `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                    <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p class="text-gray-500">No hay propietarios registrados</p>
                </div>`;
        } else {
            listaPropietariosHtml = `
                <!-- Versión móvil -->
                <div class="block md:hidden space-y-3">
                    ${propietariosList.map(p => `
                        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-gray-800">${p.nombre}</h4>
                                    <p class="text-sm text-gray-600">${p.telefono}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editarPropietario('${p.id}')" 
                                        class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button onclick="eliminarPropietario('${p.id}')" 
                                        class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <!-- Versión escritorio -->
                <div class="hidden md:block w-full">
                    <div class="overflow-x-auto rounded-lg shadow border border-gray-200">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-indigo-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Nombre</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Teléfono</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${propietariosList.map(p => `
                                    <tr class="hover:bg-indigo-50 transition-colors duration-200">
                                        <td class="px-4 py-3 text-sm text-gray-900">${p.nombre}</td>
                                        <td class="px-4 py-3 text-sm text-gray-900">${p.telefono}</td>
                                        <td class="px-4 py-3 text-sm text-center">
                                            <div class="flex justify-center gap-2">
                                                <button onclick="editarPropietario('${p.id}')" 
                                                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button onclick="eliminarPropietario('${p.id}')" 
                                                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }

        mostrarModal(`
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-center gap-3">
                        <svg class="w-8 h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div>
                            <h3 class="text-2xl font-bold text-center">Propietarios</h3>
                            <p class="text-center text-indigo-100 mt-1">Administra los propietarios de los inmuebles</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Lista de Propietarios -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Lista de Propietarios
                    </h4>
                    ${listaPropietariosHtml}
                </div>

                <!-- Formulario de Registro -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Nuevo Propietario
                    </h4>
                    <form id="formPropietario" class="space-y-4">
                        <div>
                            <label for="nombrePropietario" class="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" id="nombrePropietario" name="nombrePropietario" 
                                class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                required>
                        </div>
                        <div>
                            <label for="telefonoPropietario" class="block text-sm font-medium text-gray-700">Teléfono</label>
                            <input type="text" id="telefonoPropietario" name="telefonoPropietario" 
                                class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                required>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="ocultarModal()" 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200">
                                Cerrar
                            </button>
                            <button type="submit" 
                                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200">
                                Registrar Propietario
                            </button>
                        </div>
                    </form>
                </div>
            </div>
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
                mostrarPropietarios(); // Recargar la lista
            } catch (err) {
                console.error("Error al registrar propietario:", err);
                mostrarNotificacion("Error al registrar propietario.", 'error');
            }
        });

    } catch (error) {
        console.error("Error al cargar propietarios:", error);
        mostrarNotificacion("Error al cargar los propietarios.", 'error');
    }
}

export async function editarPropietario(id) {
    try {
        const docSnap = await getDoc(doc(db, "propietarios", id));
        if (!docSnap.exists()) {
            mostrarNotificacion("Propietario no encontrado.", 'error');
            return;
        }

        const propietario = docSnap.data();
        mostrarModal(`
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <h3 class="text-2xl font-bold text-center">Editar Propietario</h3>
                </div>
            </div>
            <form id="formEditarPropietario" class="space-y-4">
                <div>
                    <label for="nombrePropietario" class="block text-sm font-medium text-gray-700">Nombre</label>
                    <input type="text" id="nombrePropietario" name="nombrePropietario" 
                        class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                        value="${propietario.nombre}" required>
                </div>
                <div>
                    <label for="telefonoPropietario" class="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="text" id="telefonoPropietario" name="telefonoPropietario" 
                        class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                        value="${propietario.telefono}" required>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200">
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200">
                        Actualizar Propietario
                    </button>
                </div>
            </form>
        `);

        document.getElementById('formEditarPropietario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombrePropietario').value.trim();
            const telefono = document.getElementById('telefonoPropietario').value.trim();
            
            try {
                await updateDoc(doc(db, "propietarios", id), { nombre, telefono });
                mostrarNotificacion("Propietario actualizado con éxito.", 'success');
                mostrarPropietarios(); // Recargar la lista
            } catch (err) {
                console.error("Error al actualizar propietario:", err);
                mostrarNotificacion("Error al actualizar propietario.", 'error');
            }
        });

    } catch (error) {
        console.error("Error al cargar datos del propietario:", error);
        mostrarNotificacion("Error al cargar los datos del propietario.", 'error');
    }
}

export async function eliminarPropietario(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este propietario?')) {
        try {
            await deleteDoc(doc(db, "propietarios", id));
            mostrarNotificacion("Propietario eliminado con éxito.", 'success');
            mostrarPropietarios(); // Recargar la lista
        } catch (error) {
            console.error("Error al eliminar propietario:", error);
            mostrarNotificacion("Error al eliminar propietario.", 'error');
        }
    }
}

// Hacer las funciones disponibles globalmente
window.mostrarPropietarios = mostrarPropietarios;
window.editarPropietario = editarPropietario;
window.eliminarPropietario = eliminarPropietario;