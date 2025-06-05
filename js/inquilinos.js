// js/inquilinos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { updateDoc as updateDocInmueble } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"; // Alias para evitar conflicto

/**
 * Muestra la lista de inquilinos en forma de tarjetas.
 */
export async function mostrarInquilinos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inquilinos.", 'error');
        return;
    }

    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles")); // Para mapear nombres de inmuebles
        
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = data.inmuebleAsociadoId ? inmueblesMap.get(data.inmuebleAsociadoId) || 'Inmueble Desconocido' : 'No Asignado';
            inquilinosList.push({ id: doc.id, ...data, nombreInmueble });
        });

        // Ordenar los inquilinos para que los activos salgan primero
        inquilinosList.sort((a, b) => (b.activo - a.activo) || a.nombre.localeCompare(b.nombre));

        let tarjetasInquilinosHtml = "";
        if (inquilinosList.length === 0) {
            tarjetasInquilinosHtml = `<p class="text-gray-500 text-center py-8">No hay inquilinos registrados.</p>`;
        } else {
            tarjetasInquilinosHtml = inquilinosList.map(inquilino => `
                <div class="bg-white rounded-lg shadow-md p-6 ${inquilino.activo ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}" data-id="${inquilino.id}">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-xl font-semibold text-gray-800">${inquilino.nombre}</h3>
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${inquilino.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${inquilino.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                    <p class="text-gray-600 mb-2"><strong>Teléfono:</strong> ${inquilino.telefono}</p>
                    <p class="text-gray-600 mb-2"><strong>Inmueble:</strong> ${inquilino.nombreInmueble}</p>
                    ${inquilino.fechaOcupacion ? `<p class="text-gray-600 mb-2"><strong>Ocupación (Inicio Pagos):</strong> ${inquilino.fechaOcupacion}</p>` : ''}
                    ${inquilino.fechaLlegada ? `<p class="text-gray-600 mb-2"><strong>Llegada (Firma):</strong> ${inquilino.fechaLlegada}</p>` : ''}
                    ${inquilino.fechaInicioContrato ? `<p class="text-gray-600 mb-2"><strong>Inicio Contrato:</strong> ${inquilino.fechaInicioContrato}</p>` : ''}
                    ${inquilino.fechaFinContrato ? `<p class="text-gray-600 mb-2"><strong>Fin Contrato:</strong> ${inquilino.fechaFinContrato}</p>` : ''}
                    ${inquilino.fechaDesocupacion ? `<p class="text-gray-600 mb-2"><strong>Desocupación:</strong> ${inquilino.fechaDesocupacion}</p>` : ''}
                    ${inquilino.fechaRegistro ? `<p class="text-gray-600 mb-2"><strong>Registro:</strong> ${inquilino.fechaRegistro}</p>` : ''}
                    ${inquilino.urlIdentificacion ? `<p class="text-gray-600 mb-4"><strong>Identificación:</strong> <a href="${inquilino.urlIdentificacion}" target="_blank" class="text-blue-600 hover:underline">Ver Documento</a></p>` : ''}
                    
                    <div class="flex flex-wrap gap-2 justify-end">
                        <button onclick="mostrarHistorialPagosInquilino('${inquilino.id}')" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Historial de Pagos</button>
                        ${inquilino.activo ? 
                            `<button onclick="confirmarDesocupacionInquilino('${inquilino.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Desocupar</button>` :
                            `<button onclick="confirmarReactivacionInquilino('${inquilino.id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Reactivar</button>`
                        }
                        <button onclick="editarInquilino('${inquilino.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Editar</button>
                        <button onclick="eliminarDocumento('inquilinos', '${inquilino.id}', mostrarInquilinos)" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Eliminar</button>
                        <button onclick="mostrarHistorialAbonosInquilino('${inquilino.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Ver Abonos</button>
                        <button onclick="mostrarSaldoFavorInquilino('${inquilino.id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200">Ver Saldo a Favor</button>
                    </div>
                </div>
            `).join('');
        }

        contenedor.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Inquilinos</h2>
                <button onclick="mostrarFormularioNuevoInquilino()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Inquilino</button>
            </div>
            <div id="listaInquilinos" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${tarjetasInquilinosHtml}
            </div>
        `;

        const lista = document.getElementById('listaInquilinos');
        if (lista) {
            Sortable.create(lista, {
                animation: 150,
                onEnd: async function (evt) {
                    const ids = Array.from(lista.children).map(card => card.dataset.id);
                    for (let i = 0; i < ids.length; i++) {
                        await updateDoc(doc(db, "inquilinos", ids[i]), { orden: i });
                    }
                    mostrarNotificacion("Orden de inquilinos actualizado.", "success");
                }
            });
        }
    } catch (error) {
        console.error("Error al obtener inquilinos:", error);
        mostrarNotificacion("Error al cargar los inquilinos.", 'error');
    }
}

/**
 * Muestra el formulario para registrar un nuevo inquilino o editar uno existente.
 * @param {string} [id] - ID del inquilino a editar (opcional).
 */
export async function mostrarFormularioNuevoInquilino(id = null) {
    let inquilino = null;
    let inmueblesDisponibles = [];
    let inmuebleAnteriorId = null; // Para guardar el ID del inmueble antes de la edición

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const todosInmuebles = [];
        inmueblesSnap.forEach(doc => {
            todosInmuebles.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "inquilinos", id));
            if (docSnap.exists()) {
                inquilino = { id: docSnap.id, ...docSnap.data() };
                inmuebleAnteriorId = inquilino.inmuebleAsociadoId; // Guardar el ID actual del inmueble del inquilino
            }
        }

        // Filtrar inmuebles: solo los disponibles o el que ya está asignado a este inquilino (si existe)
        inmueblesDisponibles = todosInmuebles.filter(inmueble => 
            inmueble.estado === 'Disponible' || (inquilino && inmueble.id === inquilino.inmuebleAsociadoId)
        );

    } catch (error) {
        console.error("Error al cargar datos para el formulario de inquilino:", error);
        mostrarNotificacion("Error al cargar datos para el formulario de inquilino.", 'error');
        return;
    }

    const tituloModal = id ? "Editar Inquilino" : "Registrar Nuevo Inquilino";

    const inmueblesOptions = inmueblesDisponibles.map(inmueble => {
        // Si el inmueble está ocupado por otro inquilino (no el actual en edición), deshabilitarlo
        const isDisabled = inmueble.estado === 'Ocupado' && (!inquilino || inmueble.id !== inquilino.inmuebleAsociadoId);
        return `
            <option value="${inmueble.id}" 
                    ${inquilino && inquilino.inmuebleAsociadoId === inmueble.id ? 'selected' : ''}
                    ${isDisabled ? 'disabled' : ''}>
                ${inmueble.nombre} ${isDisabled ? '(Ocupado)' : ''}
            </option>
        `;
    }).join('');

    const modalContent = `
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">${tituloModal}</h3>
        </div>
        <form id="formInquilino" class="space-y-4">
            <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input type="text" id="nombre" name="nombre" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inquilino ? inquilino.nombre : ''}" placeholder="Ej: Juan Pérez" required>
            </div>
            <div>
                <label for="telefono" class="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" id="telefono" name="telefono" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inquilino ? inquilino.telefono : ''}" placeholder="Ej: +52 123 456 7890" required>
            </div>
            <div>
                <label for="fechaLlegada" class="block text-sm font-medium text-gray-700">Fecha de Llegada (Firma de Contrato)</label>
                <input type="date" id="fechaLlegada" name="fechaLlegada" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value="${inquilino && inquilino.fechaLlegada ? inquilino.fechaLlegada : ''}" required>
            </div>
            <div>
                <label for="fechaOcupacion" class="block text-sm font-medium text-gray-700">Fecha de Ocupación (Inicio de Pagos)</label>
                <input type="date" id="fechaOcupacion" name="fechaOcupacion" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    value="${inquilino && inquilino.fechaOcupacion ? inquilino.fechaOcupacion : ''}" required>
            </div>
            <div>
                <label for="urlIdentificacion" class="block text-sm font-medium text-gray-700">URL de Identificación (INE, Pasaporte, etc.)</label>
                <input type="url" id="urlIdentificacion" name="urlIdentificacion" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" value="${inquilino && inquilino.urlIdentificacion ? inquilino.urlIdentificacion : ''}" placeholder="Ej: https://docs.google.com/d/abc123xyz">
                <p class="mt-2 text-xs text-gray-500">Enlace a Google Drive, Dropbox, u otro servicio de almacenamiento.</p>
            </div>
            <div>
                <label for="inmuebleAsociadoId" class="block text-sm font-medium text-gray-700">Inmueble Asociado</label>
                <select id="inmuebleAsociadoId" name="inmuebleAsociadoId" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">Ninguno</option>
                    ${inmueblesOptions}
                </select>
                <p class="mt-2 text-xs text-gray-500">Solo se muestran inmuebles disponibles o el actualmente asignado a este inquilino.</p>
            </div>
            <div class="flex items-center">
                <input type="checkbox" id="activo" name="activo" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" ${inquilino === null || inquilino.activo ? 'checked' : ''}>
                <label for="activo" class="ml-2 block text-sm text-gray-900">Inquilino Activo</label>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="btn-primary">${id ? "Actualizar" : "Registrar"} Inquilino</button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    document.getElementById('formInquilino').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Convertir el checkbox a booleano
        data.activo = data.activo === 'on';

        // Si no se seleccionó inmueble, el valor será una cadena vacía, lo convertimos a null
        if (data.inmuebleAsociadoId === "") {
            data.inmuebleAsociadoId = null;
        }

        try {
            let inquilinoId = id; // El ID del inquilino que estamos creando/editando

            if (id) {
                // Actualizar inquilino existente
                await updateDoc(doc(db, "inquilinos", id), data);
                mostrarNotificacion("Inquilino actualizado con éxito.", 'success');
            } else {
                // Agregar nuevo inquilino
                const docRef = await addDoc(collection(db, "inquilinos"), data);
                inquilinoId = docRef.id; // Obtener el ID del nuevo inquilino
                mostrarNotificacion("Inquilino registrado con éxito.", 'success');
            }

            // --- Lógica para actualizar el estado del inmueble asociado ---
            const nuevoInmuebleId = data.inmuebleAsociadoId;
            const inquilinoNombre = data.nombre;

            if (inmuebleAnteriorId && inmuebleAnteriorId !== nuevoInmuebleId) {
                // El inquilino se ha movido o desocupado su inmueble anterior
                await updateDocInmueble(doc(db, "inmuebles", inmuebleAnteriorId), {
                    estado: 'Disponible',
                    inquilinoActualId: null,
                    inquilinoActualNombre: null
                });
                mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === inmuebleAnteriorId)?.nombre || 'anterior'} marcado como Disponible.`, 'info');
            }

            if (nuevoInmuebleId) {
                // Asignar el inmueble al inquilino (o actualizar si cambió)
                await updateDocInmueble(doc(db, "inmuebles", nuevoInmuebleId), {
                    estado: 'Ocupado',
                    inquilinoActualId: inquilinoId,
                    inquilinoActualNombre: inquilinoNombre
                });
                // También actualizar el inquilino con el nombre del inmueble si es relevante para el dashboard
                await updateDoc(doc(db, "inquilinos", inquilinoId), {
                    inmuebleAsociadoNombre: inmueblesDisponibles.find(i => i.id === nuevoInmuebleId)?.nombre || 'Desconocido'
                });
                mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === nuevoInmuebleId)?.nombre || 'seleccionado'} marcado como Ocupado.`, 'info');
            } else if (!nuevoInmuebleId && id) {
                // Si se eliminó la asociación de inmueble de un inquilino existente
                // La lógica del `inmuebleAnteriorId` ya debería haberlo manejado, pero nos aseguramos
                // Esta parte es más para cuando se edita un inquilino y se le quita la asociación sin usar desocupar
                 if (inmuebleAnteriorId) {
                    await updateDocInmueble(doc(db, "inmuebles", inmuebleAnteriorId), {
                        estado: 'Disponible',
                        inquilinoActualId: null,
                        inquilinoActualNombre: null
                    });
                    mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === inmuebleAnteriorId)?.nombre || 'anterior'} marcado como Disponible.`, 'info');
                }
                // Actualizar el inquilino sin nombre de inmueble
                 await updateDoc(doc(db, "inquilinos", inquilinoId), {
                    inmuebleAsociadoNombre: 'No Asignado'
                });
            }


            ocultarModal();
            mostrarInquilinos(); // Recargar la lista de inquilinos
           
        } catch (err) {
            console.error("Error al guardar el inquilino:", err);
            mostrarNotificacion("Error al guardar el inquilino.", 'error');
        }
    });
}

/**
 * Función para editar un inquilino, mostrando el formulario.
 * @param {string} id - ID del inquilino a editar.
 */
export async function editarInquilino(id) {
    mostrarFormularioNuevoInquilino(id);
}

/**
 * Confirma la desocupación de un inquilino y actualiza su estado.
 * También marca el inmueble asociado como 'Disponible'.
 * @param {string} inquilinoId - ID del inquilino a desocupar.
 */
export async function confirmarDesocupacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres desocupar a este inquilino? Se marcará como inactivo y su inmueble asociado como disponible.')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            const inquilinoSnap = await getDoc(inquilinoRef);
            
            if (inquilinoSnap.exists()) {
                const inquilinoData = inquilinoSnap.data();
                const inmuebleId = inquilinoData.inmuebleAsociadoId;

                await updateDoc(inquilinoRef, {
                    activo: false,
                    inmuebleAsociadoId: null,
                    inmuebleAsociadoNombre: 'No Asignado',
                    fechaDesocupacion: new Date().toISOString().split('T')[0] // <-- Nueva línea
                });
                mostrarNotificacion("Inquilino desocupado con éxito.", 'success');

                if (inmuebleId) {
                    await updateDocInmueble(doc(db, "inmuebles", inmuebleId), {
                        estado: 'Disponible',
                        inquilinoActualId: null, // Limpiar inquilino actual del inmueble
                        inquilinoActualNombre: null
                    });
                    mostrarNotificacion(`Inmueble asociado marcado como Disponible.`, 'info');
                }
            } else {
                mostrarNotificacion("Inquilino no encontrado.", 'error');
            }
            mostrarInquilinos();
            
        } catch (error) {
            console.error("Error al desocupar inquilino:", error);
            mostrarNotificacion("Error al desocupar inquilino.", "error");
        }
    }
}

/**
 * Confirma la reactivación de un inquilino.
 * @param {string} inquilinoId - ID del inquilino a reactivar.
 */
export async function confirmarReactivacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres reactivar a este inquilino?')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            await updateDoc(inquilinoRef, {
                activo: true,
                fechaDesocupacion: null
            });
            mostrarNotificacion("Inquilino reactivado con éxito.", 'success');
            mostrarInquilinos();
           
        } catch (error) {
            console.error("Error al reactivar inquilino:", error);
            mostrarNotificacion("Error al reactivar inquilino.", "error");
        }
    }
}

/**
 * Muestra el historial de pagos de un inquilino en un modal.
 * @param {string} inquilinoId - ID del inquilino cuyo historial de pagos se desea mostrar.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinoSnap = await getDoc(doc(db, "inquilinos", inquilinoId));

        if (!inquilinoSnap.exists()) {
            mostrarNotificacion("Inquilino no encontrado.", "error");
            return;
        }

        const inquilino = inquilinoSnap.data();
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        // Filtrar pagos de este inquilino
        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            if (data.inquilinoId === inquilinoId) {
                pagosList.push({ id: doc.id, ...data });
            }
        });

        // Ordenar por fecha (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let historialHtml = `
            <div class="px-4 py-3 bg-purple-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Pagos de ${inquilino.nombre}</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inmueble</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes/Año</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Abonos</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (pagosList.length === 0) {
            historialHtml += `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">No hay pagos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            pagosList.forEach(pago => {
                // Estado visual
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                switch (pago.estado) {
                    case "pagado":
                        estadoClass += "bg-green-100 text-green-800";
                        break;
                    case "parcial":
                        estadoClass += "bg-yellow-100 text-yellow-800";
                        break;
                    case "pendiente":
                        estadoClass += "bg-red-100 text-red-800";
                        break;
                    case "vencido":
                        estadoClass += "bg-purple-100 text-purple-800";
                        break;
                    default:
                        estadoClass += "bg-gray-100 text-gray-800";
                        break;
                }

                // Abonos detalle
                let abonosDetalleHtml = "";
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml = pago.abonos.map(abono => `
                        <div class="mb-1">
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold mr-1">$${parseFloat(abono.montoAbonado).toFixed(2)}</span>
                            <span class="text-xs text-gray-500">${abono.fechaAbono}</span>
                            ${abono.origen ? `<span class="ml-1 text-xs text-cyan-700">(${abono.origen})</span>` : ""}
                        </div>
                    `).join('');
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-400">Sin abonos</span>`;
                }

                historialHtml += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || ''} / ${pago.anioCorrespondiente || ''}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoTotal || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoPagado || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.saldoPendiente || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-4 py-2 text-sm">${abonosDetalleHtml}</td>
                    </tr>
                `;
            });
        }

        historialHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;

        mostrarModal(historialHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inquilino:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inquilino.", 'error');
    }
}

// Historial de abonos elegante
export async function mostrarHistorialAbonosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        let abonosList = [];
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.inquilinoId === inquilinoId && pago.abonos && pago.abonos.length > 0) {
                pago.abonos.forEach(abono => {
                    abonosList.push({
                        monto: abono.montoAbonado,
                        fecha: abono.fechaAbono,
                        origen: abono.origen || "manual",
                        pagoId: doc.id,
                        mes: pago.mesCorrespondiente,
                        anio: pago.anioCorrespondiente
                    });
                });
            }
        });

        let html = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Abonos</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pago (Mes/Año)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (abonosList.length === 0) {
            html += `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">No hay abonos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            abonosList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            abonosList.forEach(a => {
                let origenClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                origenClass += a.origen === "saldo a favor" ? "bg-cyan-100 text-cyan-800" : "bg-green-100 text-green-800";
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">$${parseFloat(a.monto).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.fecha}</td>
                        <td class="px-4 py-2 text-sm"><span class="${origenClass}">${a.origen}</span></td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.mes || ''} / ${a.anio || ''}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(html);
    } catch (error) {
        mostrarNotificacion("Error al cargar abonos.", "error");
    }
}

// Saldo a favor elegante
export async function mostrarSaldoFavorInquilino(inquilinoId) {
    try {
        const abonosSnap = await getDocs(collection(db, "abonosSaldoFavor"));
        let saldoTotal = 0;
        let abonos = [];
        abonosSnap.forEach(doc => {
            const abono = doc.data();
            if (abono.inquilinoId === inquilinoId && abono.saldoRestante > 0) {
                saldoTotal += abono.saldoRestante;
                abonos.push({
                    monto: abono.saldoRestante,
                    fecha: abono.fechaAbono,
                    descripcion: abono.descripcion || ""
                });
            }
        });

        let html = `
            <div class="px-4 py-3 bg-cyan-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Saldo a Favor Actual</h3>
            </div>
            <div class="mb-4">
                <p class="text-lg font-semibold text-green-700">Total disponible: $${saldoTotal.toFixed(2)}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (abonos.length === 0) {
            html += `
                <tr>
                    <td colspan="3" class="text-center py-8 text-gray-500">No hay saldo a favor disponible.</td>
                </tr>
            `;
        } else {
            abonos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            abonos.forEach(a => {
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">$${parseFloat(a.monto).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.fecha}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.descripcion}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(html);
    } catch (error) {
        mostrarNotificacion("Error al cargar saldo a favor.", "error");
    }
}

// Función auxiliar para eliminar documentos (probablemente ya la tienes en ui.js o utilities.js)
// Si no la tienes, aquí una versión simple para inquilinos:
export async function eliminarDocumento(coleccion, id, callbackRefresh, callbackDashboard) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            const docSnap = await getDoc(doc(db, coleccion, id));
            const data = docSnap.data();

            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');

            // Si el inquilino eliminado estaba asociado a un inmueble, liberar el inmueble
            if (coleccion === 'inquilinos' && data && data.inmuebleAsociadoId) {
                await updateDocInmueble(doc(db, "inmuebles", data.inmuebleAsociadoId), {
                    estado: 'Disponible',
                    inquilinoActualId: null,
                    inquilinoActualNombre: null
                });
                mostrarNotificacion(`Inmueble ${data.inmuebleAsociadoNombre || 'anterior'} ha sido marcado como Disponible tras la eliminación del inquilino.`, 'info');
            }

            if (callbackRefresh) callbackRefresh();
            if (callbackDashboard) callbackDashboard();
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

// Al cargar los inquilinos, también cargar y asignar el orden correspondiente
window.addEventListener('load', async () => {
    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            inquilinosList.push({ id: doc.id, ...data });
        });

        // Ordenar inquilinos por el campo 'orden' (si existe)
        inquilinosList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        // Asignar el orden a cada inquilino en la interfaz (puedes tener un contenedor específico para esto)
        const contenedorOrden = document.getElementById("contenidoOrden");
        if (contenedorOrden) {
            contenedorOrden.innerHTML = inquilinosList.map((inquilino, index) => `
                <div class="flex items-center py-2 ${index % 2 === 0 ? 'bg-gray-50' : ''}">
                    <span class="text-gray-700 font-semibold">${index + 1}.</span>
                    <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">${inquilino.nombre}</div>
                        <div class="text-xs text-gray-500">${inquilino.telefono}</div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Error al cargar inquilinos para orden:", error);
    }
});

import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm";