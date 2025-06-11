// js/inmuebles.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { mostrarHistorialPagosInmueble } from './pagos.js'; // Importar para mostrar historial de pagos
//import { mostrarHistorialMantenimientoInmueble } from './mantenimientos.js'; // Importar para mostrar historial de mantenimientos
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm"; // Si usas módulos

/**
 * Muestra la lista de inmuebles en forma de tarjetas.
 */
export async function mostrarInmuebles(estadoFiltro = null, tipoFiltro = null) {
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
        if (estadoFiltro && estadoFiltro !== "Todos") {
            inmueblesList = inmueblesList.filter(inmueble => inmueble.estado && inmueble.estado.toLowerCase() === estadoFiltro.toLowerCase());
        }
        // Filtrar por tipo si se solicita
        if (tipoFiltro && tipoFiltro !== "Todos") {
            inmueblesList = inmueblesList.filter(inmueble => inmueble.tipo && inmueble.tipo.toLowerCase() === tipoFiltro.toLowerCase());
        }

        // Ordenar los inmuebles para que los disponibles salgan primero
        inmueblesList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        let tarjetasInmueblesHtml = "";
        if (inmueblesList.length === 0) {
            tarjetasInmueblesHtml = `<p class="text-gray-500 text-center py-8">No hay inmuebles registrados.</p>`;
        } else {
            tarjetasInmueblesHtml = inmueblesList.map(inmueble => {
                // Define color de borde según estado
                let borderColor = 'border-green-500'; // Disponible
                let estadoBg = 'bg-green-100 text-green-800';
                let estadoIcon = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // Checkmark icon
                
                if (inmueble.estado === 'Ocupado') {
                    borderColor = 'border-orange-500';
                    estadoBg = 'bg-orange-100 text-orange-800';
                    estadoIcon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock icon
                } else if (inmueble.estado === 'Mantenimiento') {
                    borderColor = 'border-gray-500';
                    estadoBg = 'bg-gray-100 text-gray-800';
                    estadoIcon = 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'; // Settings icon
                }

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${borderColor} overflow-hidden transform hover:-translate-y-1" data-id="${inmueble.id}">
                        <div class="p-4 sm:p-6">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">${inmueble.nombre}</h3>
                                </div>
                                <span class="${estadoBg} px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${estadoIcon}" />
                                    </svg>
                                    ${inmueble.estado}
                                </span>
                            </div>
                            
                            <div class="space-y-3 mb-6">
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span class="text-sm font-medium">${inmueble.direccion}</span>
                                </div>
                                
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span class="text-sm font-medium">${inmueble.tipo}</span>
                                </div>
                                
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-sm font-medium">$${(inmueble.rentaMensual ?? 0).toFixed(2)}</span>
                                    <span class="text-xs text-gray-500 ml-1">/mes</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                ${inmueble.urlContrato ? `
                                    <a href="${inmueble.urlContrato}" target="_blank" rel="noopener noreferrer"
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md"
                                        title="Ver contrato en Drive">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Contrato
                                    </a>
                                ` : ''}
                                <button onclick="mostrarHistorialPagosInmueble('${inmueble.id}', '${inmueble.nombre}')" 
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pagos
                                </button>
                                <button onclick="mostrarHistorialMantenimientoInmueble('${inmueble.id}', '${inmueble.nombre}')" 
                                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    </svg>
                                    Mantenimiento
                                </button>
                                <button onclick="editarInmueble('${inmueble.id}')" 
                                    class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar
                                </button>
                                <button onclick="eliminarDocumento('inmuebles', '${inmueble.id}', mostrarInmuebles)" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Eliminar
                                </button>
                                <button onclick="mostrarHistorialInquilinosInmueble('${inmueble.id}', '${inmueble.nombre}')" 
                                    class="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Inquilinos
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-end">
                            <span class="handle-move cursor-move text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors duration-200" title="Arrastrar para reordenar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                <span class="text-xs">Reordenar</span>
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Filtros
        const tipos = ["Todos", "Casa", "Apartamento", "Local Comercial", "Oficina"];
        const estados = ["Todos", "Disponible", "Ocupado", "Mantenimiento"];

        contenedor.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div class="flex gap-2">
                    <button onclick="mostrarFormularioNuevoPropietario()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Propietario
                    </button>
                    <button onclick="mostrarFormularioNuevoInmueble()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Inmueble</button>
                </div>
                <div class="flex gap-2">
                    <select id="filtroTipo" class="border-gray-300 rounded px-2 py-1">
                        ${tipos.map(tipo => `<option value="${tipo}" ${tipo === (tipoFiltro || "Todos") ? "selected" : ""}>${tipo}</option>`).join('')}
                    </select>
                    <select id="filtroEstado" class="border-gray-300 rounded px-2 py-1">
                        ${estados.map(estado => `<option value="${estado}" ${estado === (estadoFiltro || "Todos") ? "selected" : ""}>${estado}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="listaInmuebles" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${tarjetasInmueblesHtml}
            </div>
        `;

        // Listeners para los filtros
        document.getElementById('filtroTipo').addEventListener('change', function () {
            mostrarInmuebles(document.getElementById('filtroEstado').value, this.value);
        });
        document.getElementById('filtroEstado').addEventListener('change', function () {
            mostrarInmuebles(this.value, document.getElementById('filtroTipo').value);
        });

        // Sortable
        const listaInmuebles = document.getElementById('listaInmuebles');
        if (listaInmuebles) {
            Sortable.create(listaInmuebles, {
                animation: 150,
                handle: '.handle-move', // Solo se puede arrastrar desde el handle
                onEnd: async function (evt) {
                    const ids = Array.from(listaInmuebles.children).map(card => card.dataset.id);
                    for (let i = 0; i < ids.length; i++) {
                        await updateDoc(doc(db, "inmuebles", ids[i]), { orden: i });
                    }
                    mostrarNotificacion("Orden actualizado.", "success");
                }
            });
        }

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
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
            <div class="px-6 py-4">
                <h3 class="text-2xl font-bold text-center">${tituloModal}</h3>
                <p class="text-center text-indigo-100 mt-1">Complete los datos del inmueble</p>
            </div>
        </div>
        
        <form id="formInmueble" class="space-y-6 max-h-[80vh] overflow-y-auto px-2">
            <!-- Información Básica -->
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Información Básica
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre/Identificador</label>
                        <input type="text" id="nombre" name="nombre" 
                            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" 
                            value="${inmueble?.nombre ?? ''}" 
                            placeholder="Ej: Casa 123" required>
                    </div>
                    <div>
                        <label for="tipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Inmueble</label>
                        <select id="tipo" name="tipo" 
                            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" required>
                            <option value="">Selecciona un tipo</option>
                            <option value="Casa" ${inmueble?.tipo === 'Casa' ? 'selected' : ''}>Casa</option>
                            <option value="Apartamento" ${inmueble?.tipo === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                            <option value="Local Comercial" ${inmueble?.tipo === 'Local Comercial' ? 'selected' : ''}>Local Comercial</option>
                            <option value="Oficina" ${inmueble?.tipo === 'Oficina' ? 'selected' : ''}>Oficina</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Ubicación -->
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ubicación
                </h4>
                <div>
                    <label for="direccion" class="block text-sm font-medium text-gray-700 mb-1">Dirección Completa</label>
                    <input type="text" id="direccion" name="direccion" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" 
                        value="${inmueble?.direccion ?? ''}" 
                        placeholder="Ej: Calle Principal #123, Colonia" required>
                </div>
            </div>

            <!-- Detalles Financieros -->
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detalles Financieros
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="rentaMensual" class="block text-sm font-medium text-gray-700 mb-1">Renta Mensual</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500">$</span>
                            </div>
                            <input type="number" id="rentaMensual" name="rentaMensual" step="0.01" 
                                class="w-full pl-7 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" 
                                value="${inmueble?.rentaMensual ?? ''}" 
                                placeholder="0.00" required>
                        </div>
                    </div>
                    <div>
                        <label for="estado" class="block text-sm font-medium text-gray-700 mb-1">Estado del Inmueble</label>
                        <select id="estado" name="estado" 
                            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" required>
                            <option value="Disponible" ${inmueble?.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
                            <option value="Ocupado" ${inmueble?.estado === 'Ocupado' ? 'selected' : ''}>Ocupado</option>
                            <option value="Mantenimiento" ${inmueble?.estado === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Documentación -->
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentación
                </h4>
                <div>
                    <label for="urlContrato" class="block text-sm font-medium text-gray-700 mb-1">URL del Contrato</label>
                    <input type="url" id="urlContrato" name="urlContrato" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200" 
                        value="${inmueble?.urlContrato ?? ''}" 
                        placeholder="Ej: https://drive.google.com/file/...">
                    <p class="mt-1 text-xs text-gray-500">Enlace a Google Drive, Dropbox, u otro servicio de almacenamiento.</p>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-colors duration-200 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    ${id ? "Actualizar" : "Registrar"} Inmueble
                </button>
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
    if (coleccion === "inmuebles") {
        // Obtén el inmueble antes de eliminar
        const docSnap = await getDoc(doc(db, "inmuebles", id));
        if (!docSnap.exists()) {
            mostrarNotificacion("Inmueble no encontrado.", 'error');
            return;
        }
        const inmueble = docSnap.data();
        if (inmueble.estado === "Ocupado") {
            mostrarNotificacion("No puedes eliminar un inmueble ocupado. Desocúpalo primero.", 'error');
            return;
        }
        // Confirmación antes de eliminar
        if (!confirm("¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.")) {
            return;
        }
    } else {
        // Confirmación genérica para otras colecciones
        if (!confirm("¿Estás seguro de que deseas eliminar este elemento?")) {
            return;
        }
    }

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

export async function mostrarHistorialMantenimientoInmueble(inmuebleId, inmuebleNombre) {
    try {
        // Trae los mantenimientos de este inmueble
        const mantenimientosSnap = await getDocs(query(
            collection(db, "mantenimientos"),
            where("inmuebleId", "==", inmuebleId)
        ));

        let historial = [];
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            historial.push({
                descripcion: data.descripcion || '',
                fecha: data.fecha || '',
                costo: data.costo ? parseFloat(data.costo) : 0,
                responsable: data.responsable || '',
                estado: data.estado || ''
            });
        });

        // Ordenar por fecha descendente (más reciente primero)
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        let tablaHtml = '';
        if (historial.length === 0) {
            tablaHtml = `<p class="text-gray-500 text-center py-4">Este inmueble no tiene historial de mantenimientos.</p>`;
        } else {
            // Cards para móvil, tabla para escritorio
            tablaHtml = `
                <div class="space-y-3 sm:hidden">
                    ${historial.map(m => `
                        <div class="rounded-lg shadow border border-yellow-100 bg-white p-3 flex flex-col gap-1">
                            <div class="font-semibold text-yellow-800">${m.descripcion}</div>
                            <div class="text-xs text-gray-500">Fecha: <span class="font-medium">${m.fecha}</span></div>
                            <div class="text-xs text-gray-500">Costo: <span class="font-semibold text-yellow-700">$${m.costo.toFixed(2)}</span></div>
                            <div class="text-xs text-gray-500">Responsable: <span class="font-medium">${m.responsable}</span></div>
                            <div class="text-xs text-gray-500">Estado: <span class="font-medium">${m.estado}</span></div>
                        </div>
                    `).join('')}
                </div>
                <div class="overflow-x-auto rounded-lg shadow border border-gray-200 mt-4 hidden sm:block">
                    <table class="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead class="bg-yellow-50">
                            <tr>
                                <th class="px-3 py-2 text-left font-semibold text-yellow-800">Descripción</th>
                                <th class="px-3 py-2 text-left font-semibold text-yellow-800">Fecha</th>
                                <th class="px-3 py-2 text-right font-semibold text-yellow-800">Costo</th>
                                <th class="px-3 py-2 text-left font-semibold text-yellow-800">Responsable</th>
                                <th class="px-3 py-2 text-center font-semibold text-yellow-800">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historial.map(m => `
                                <tr class="hover:bg-yellow-50">
                                    <td class="px-3 py-2">${m.descripcion}</td>
                                    <td class="px-3 py-2">${m.fecha}</td>
                                    <td class="px-3 py-2 text-right">$${m.costo.toFixed(2)}</td>
                                    <td class="px-3 py-2">${m.responsable}</td>
                                    <td class="px-3 py-2 text-center">${m.estado}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        mostrarModal(`
            <div class="px-4 py-3 bg-yellow-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
                <h3 class="text-lg font-bold text-center">Mantenimientos<br><span class="text-base font-normal">${inmuebleNombre}</span></h3>
            </div>
            ${tablaHtml}
            <div class="flex justify-end mt-4">
                <button onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
            </div>
        `);

    } catch (error) {
        console.error("Error al obtener historial de mantenimientos:", error);
        mostrarNotificacion("Error al cargar el historial de mantenimientos.", 'error');
    }
}

window.mostrarHistorialMantenimientoInmueble = mostrarHistorialMantenimientoInmueble;

