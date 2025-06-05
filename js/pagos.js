// js/pagos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra la lista de pagos.
 */
export async function mostrarPagos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de pagos.", 'error');
        return;
    }

    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
            const nombreInquilino = inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido';
            pagosList.push({ id: doc.id, ...data, nombreInmueble, nombreInquilino });
        });

        // Ordenar los pagos por fecha de registro (el más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let tablaFilas = "";
        if (pagosList.length === 0) {
            tablaFilas = `<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay pagos registrados.</td></tr>`;
        } else {
            pagosList.forEach(pago => {
                // Clases para el estado del pago
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (pago.estado) {
                    case "pagado":
                        estadoClass += " bg-green-100 text-green-800";
                        break;
                    case "parcial":
                        estadoClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "pendiente":
                        estadoClass += " bg-red-100 text-red-800";
                        break;
                    case "vencido":
                        estadoClass += " bg-purple-100 text-purple-800";
                        break;
                    default:
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                }

                // Asegurar que los montos se muestren con 2 decimales, incluso si son null o undefined
                const montoTotalFormatted = pago.montoTotal ? pago.montoTotal.toFixed(2) : '0.00';
                const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                // En la generación de filas de la tabla:
                const servicios = [];
                if (pago.serviciosPagados?.internet) {
                    servicios.push(`Internet: $${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                }
                if (pago.serviciosPagados?.agua) {
                    servicios.push(`Agua: $${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                }
                if (pago.serviciosPagados?.luz) {
                    servicios.push(`Luz: $${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);
                }
                // ...agrega más servicios si los tienes


                tablaFilas += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${pago.nombreInmueble}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.nombreInquilino}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${montoTotalFormatted}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${montoPagadoFormatted}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${saldoPendienteFormatted}</td>
                        <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${servicios.join('<br>') || '-'}</td>
                        <td class="px-4 py-2 text-sm text-right">
                            <div class="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-1 sm:space-y-0">
                                <button data-pago-id="${pago.id}" class="btn-detalle-pago bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Detalles</button>
                                <button data-pago-id="${pago.id}" class="btn-abonar-pago bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Abonar</button>
                                <button data-pago-id="${pago.id}" class="btn-editar-pago bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Editar</button>
                                <button data-pago-id="${pago.id}" class="btn-eliminar-pago bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Eliminar</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Opciones para los filtros
        const inmueblesOptions = [...inmueblesMap.entries()].map(([id, nombre]) =>
            `<option value="${id}">${nombre}</option>`).join('');
        const inquilinosOptions = [...inquilinosMap.entries()].map(([id, nombre]) =>
            `<option value="${id}">${nombre}</option>`).join('');
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const estados = ["pagado", "parcial", "pendiente", "vencido"];
        const estadosOptions = estados.map(e => `<option value="${e}">${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join('');

        // Filtros UI
        const filtrosHtml = `
            <div class="flex flex-wrap gap-4 mb-4 items-end">
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Inmueble</label>
                    <select id="filtroInmueble" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${inmueblesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Inquilino</label>
                    <select id="filtroInquilino" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${inquilinosOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                    <select id="filtroMes" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${mesesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                    <select id="filtroEstado" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${estadosOptions}
                    </select>
                </div>
                <button id="btnLimpiarFiltros" class="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-3 py-1 rounded-md shadow-sm transition-colors duration-200">Limpiar</button>
            </div>
        `;

        contenedor.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Listado de Pagos de Renta</h2>
                <div class="flex gap-2">
                    <button id="btnNuevoPago" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Pago</button>
                    <button id="btnPagoServicio" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Pago de Servicio</button>
                </div>
            </div>
            ${filtrosHtml}
            <div class="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Pagado</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Pendiente</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Corresp.</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios Pagados</th>
                            <th scope="col" class="relative px-4 py-2 text-right"><span class="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tablaFilas}
                    </tbody>
                </table>
            </div>
        `;
document.getElementById('btnPagoServicio').addEventListener('click', () => mostrarFormularioPagoServicio());
        // --- Adjuntar Event Listeners después de que el HTML se ha cargado ---
        document.getElementById('btnNuevoPago').addEventListener('click', () => mostrarFormularioNuevoPago());

        document.querySelectorAll('.btn-detalle-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                mostrarDetallePago(pagoId);
            });
        });

        document.querySelectorAll('.btn-abonar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                // Busca el pago en la lista para obtener los datos necesarios
                const pagoData = pagosList.find(p => p.id === pagoId);
                if (pagoData) {
                    mostrarFormularioRegistrarAbono(pagoId, pagoData.montoTotal, pagoData.montoPagado);
                } else {
                    mostrarNotificacion("Error: No se encontró la información del pago para abonar.", 'error');
                }
            });
        });

        document.querySelectorAll('.btn-editar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                editarPago(pagoId);
            });
        });

        document.querySelectorAll('.btn-eliminar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                eliminarDocumento('pagos', pagoId, mostrarPagos);
            });
        });

        // --- Filtros interactivos ---
        function aplicarFiltros() {
            const filtroInmueble = document.getElementById('filtroInmueble').value;
            const filtroInquilino = document.getElementById('filtroInquilino').value;
            const filtroMes = document.getElementById('filtroMes').value;
            const filtroEstado = document.getElementById('filtroEstado').value;

            let pagosFiltrados = pagosList.filter(pago => {
                return (!filtroInmueble || pago.inmuebleId === filtroInmueble)
                    && (!filtroInquilino || pago.inquilinoId === filtroInquilino)
                    && (!filtroMes || pago.mesCorrespondiente === filtroMes)
                    && (!filtroEstado || pago.estado === filtroEstado);
            });

            // Generar filas de tabla con pagos filtrados
            let tablaFilas = "";
            if (pagosFiltrados.length === 0) {
                tablaFilas = `<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay pagos registrados.</td></tr>`;
            } else {
                pagosFiltrados.forEach(pago => {
                    // Clases para el estado del pago
                    let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                    switch (pago.estado) {
                        case "pagado":
                            estadoClass += " bg-green-100 text-green-800";
                            break;
                        case "parcial":
                            estadoClass += " bg-yellow-100 text-yellow-800";
                            break;
                        case "pendiente":
                            estadoClass += " bg-red-100 text-red-800";
                            break;
                        case "vencido":
                            estadoClass += " bg-purple-100 text-purple-800";
                            break;
                        default:
                            estadoClass += " bg-gray-100 text-gray-800";
                            break;
                    }

                    // Asegurar que los montos se muestren with 2 decimales, incluso si son null o undefined
                    const montoTotalFormatted = pago.montoTotal ? pago.montoTotal.toFixed(2) : '0.00';
                    const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                    const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                    // En la generación de filas de la tabla:
                    const servicios = [];
                    if (pago.serviciosPagados?.internet) {
                        servicios.push(`Internet: $${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                    }
                    if (pago.serviciosPagados?.agua) {
                        servicios.push(`Agua: $${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                    }
                    if (pago.serviciosPagados?.luz) {
                        servicios.push(`Luz: $${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);
                    }
                    // ...agrega más servicios si los tienes


                    tablaFilas += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-2 text-sm text-gray-800">${pago.nombreInmueble}</td>
                            <td class="px-4 py-2 text-sm text-gray-700">${pago.nombreInquilino}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">$${montoTotalFormatted}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">$${montoPagadoFormatted}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">$${saldoPendienteFormatted}</td>
                            <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                            <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${servicios.join('<br>') || '-'}</td>
                            <td class="px-4 py-2 text-sm text-right">
                                <div class="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-1 sm:space-y-0">
                                    <button data-pago-id="${pago.id}" class="btn-detalle-pago bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Detalles</button>
                                    <button data-pago-id="${pago.id}" class="btn-abonar-pago bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Abonar</button>
                                    <button data-pago-id="${pago.id}" class="btn-editar-pago bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Editar</button>
                                    <button data-pago-id="${pago.id}" class="btn-eliminar-pago bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200">Eliminar</button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            document.querySelector('.min-w-full tbody').innerHTML = tablaFilas;
        }

        // Listeners de filtros
        document.getElementById('filtroInmueble').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroInquilino').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroMes').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            document.getElementById('filtroInmueble').value = "";
            document.getElementById('filtroInquilino').value = "";
            document.getElementById('filtroMes').value = "";
            document.getElementById('filtroEstado').value = "";
            aplicarFiltros();
        });

    } catch (error) {
        console.error("Error al mostrar pagos:", error);
        mostrarNotificacion("Error al cargar la lista de pagos.", 'error');
    }
}

/**
 * Muestra el formulario para registrar o editar un pago.
 * @param {string} id - El ID del pago a editar (opcional).
 */
export async function mostrarFormularioNuevoPago(id = null) {
    let pago = {};
    let inmuebles = [];
    let inquilinos = [];
    let titulo = id ? "Editar Pago" : "Registrar Nuevo Pago";

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        inmueblesSnap.forEach(doc => {
            // Solo agregar inmuebles ocupados
            if (doc.data().estado === 'Ocupado') {
                inmuebles.push({ id: doc.id, ...doc.data() });
            }
        });

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "pagos", id));
            if (docSnap.exists()) {
                pago = { id: docSnap.id, ...docSnap.data() };
            } else {
                mostrarNotificacion("Pago no encontrado.", 'error');
                return;
            }
        }
    } catch (error) {
        mostrarNotificacion("Error al preparar el formulario de pago.", 'error');
        return;
    }

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const anioActual = new Date().getFullYear();
    const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);

    // Opciones de inmuebles
    const inmueblesOptions = inmuebles.map(inm => `
        <option value="${inm.id}" data-renta="${inm.rentaMensual || 0}">
            ${inm.nombre}
        </option>
    `).join('');

    // Opciones de inquilinos
    const inquilinosOptions = inquilinos.map(inq => `
        <option value="${inq.id}">${inq.nombre}</option>
    `).join('');

    // Opciones de meses y años
    const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
    const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

    // Valores por defecto para edición
    const selectedInmueble = pago.inmuebleId || '';
    const selectedInquilino = pago.inquilinoId || '';
    const selectedMes = pago.mesCorrespondiente || '';
    const selectedAnio = pago.anioCorrespondiente || anioActual;
    const montoTotal = pago.montoTotal || '';
    const montoPagado = pago.montoPagado || '';
    const fechaRegistro = pago.fechaRegistro || new Date().toISOString().split('T')[0];

    const propietariosSnap = await getDocs(collection(db, "propietarios"));
    let propietarios = [];
    propietariosSnap.forEach(doc => {
        propietarios.push({ id: doc.id, ...doc.data() });
    });
    const propietariosOptions = propietarios.map(prop =>
        `<option value="${prop.id}">${prop.nombre} (${prop.telefono})</option>`
    ).join('');

    const formHtml = `
    <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
        <h3 class="text-2xl font-bold text-center">${titulo}</h3>
    </div>
    <form id="formPago" class="space-y-5 px-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="inmuebleId" class="block text-sm font-semibold text-gray-700 mb-1">Inmueble</label>
                <select id="inmuebleId" name="inmuebleId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">Selecciona un inmueble</option>
                    ${inmueblesOptions}
                </select>
            </div>
            <div>
                <label for="inquilinoId" class="block text-sm font-semibold text-gray-700 mb-1">Inquilino</label>
                <select id="inquilinoId" name="inquilinoId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">Selecciona un inquilino</option>
                    ${inquilinosOptions}
                </select>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="montoTotal" class="block text-sm font-semibold text-gray-700 mb-1">Costo mensual del inmueble</label>
                <input type="number" id="montoTotal" name="montoTotal" step="0.01" min="0" required readonly
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
                <label for="montoPago" class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a pagar ahora</label>
                <input type="number" id="montoPago" name="montoPago" step="0.01" min="0.01" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <span class="text-xs text-blue-500">Si la cantidad es menor al costo mensual, el pago será considerado parcial.</span>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label for="mesCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Mes Correspondiente</label>
                <select id="mesCorrespondiente" name="mesCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    ${mesesOptions}
                </select>
            </div>
            <div>
                <label for="anioCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Año Correspondiente</label>
                <select id="anioCorrespondiente" name="anioCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    ${aniosOptions}
                </select>
            </div>
            <div>
                <label for="fechaRegistro" class="block text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</label>
                <input type="date" id="fechaRegistro" name="fechaRegistro" value="${fechaRegistro}" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>

        <!-- Forma de pago -->
        <div>
            <label for="formaPago" class="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
            <select id="formaPago" name="formaPago" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                <option value="">Selecciona una forma de pago</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Depósito">Depósito</option>
                <option value="Otro">Otro</option>
            </select>
        </div>

        <!-- Propietario -->
        <div>
            <label for="propietarioId" class="block text-sm font-semibold text-gray-700 mb-1">Propietario</label>
            <select id="propietarioId" name="propietarioId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                <option value="">Selecciona un propietario</option>
                ${propietariosOptions}
            </select>
        </div>

        <!-- Servicios adicionales -->
        <div id="serviciosAdicionales" style="display:none;">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Servicios Pagados</label>
            <div>
                <label><input type="checkbox" id="servicioInternet" /> Internet</label>
                <input type="number" id="montoInternet" placeholder="Monto Internet" class="ml-2 border rounded px-2 py-1 w-24" style="display:none;" min="0" step="0.01" />
            </div>
            <!-- Puedes agregar más servicios aquí -->
        </div>

        <div class="flex justify-end space-x-3 mt-8">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                ${id ? "Actualizar Pago" : "Registrar Pago"}
            </button>
        </div>
    </form>
`;

    mostrarModal(formHtml);

    // --- Script de autollenado robusto ---
    const inmuebleSelect = document.getElementById('inmuebleId');
    const inquilinoSelect = document.getElementById('inquilinoId');
    const montoTotalInput = document.getElementById('montoTotal');
    const montoPagoInput = document.getElementById('montoPago');

    // Al seleccionar un inmueble, autollenar inquilino y monto
    inmuebleSelect.addEventListener('change', function() {
        const inmuebleId = this.value;
        const inmueble = inmuebles.find(inm => inm.id === inmuebleId);

        // Cargar costo mensual
        montoTotalInput.value = inmueble ? (inmueble.rentaMensual || 0) : '';

        // Buscar inquilino activo asociado a este inmueble
        const inquilino = inquilinos.find(inq => inq.inmuebleId === inmuebleId && (inq.activo === true || inq.activo === "true"));
        inquilinoSelect.value = inquilino ? inquilino.id : '';

        // Mostrar servicios adicionales solo si el inmueble tiene internet
        if (inmueble && inmueble.tieneInternet) {
            document.getElementById('serviciosAdicionales').style.display = 'block';
        } else {
            document.getElementById('serviciosAdicionales').style.display = 'none';
            document.getElementById('servicioInternet').checked = false;
            document.getElementById('montoInternet').style.display = 'none';
        }
    });

    // Si es edición, selecciona los valores actuales
    inmuebleSelect.value = selectedInmueble;
    inquilinoSelect.value = selectedInquilino;
    document.getElementById('mesCorrespondiente').value = selectedMes;
    document.getElementById('anioCorrespondiente').value = selectedAnio;
    montoTotalInput.value = montoTotal;
    montoPagoInput.value = montoPagado;

    // --- Guardar pago ---
    document.getElementById('formPago').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inmuebleId = inmuebleSelect.value;
        const inquilinoId = inquilinoSelect.value;
        const montoTotal = parseFloat(montoTotalInput.value);
        const montoPago = parseFloat(montoPagoInput.value);
        const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
        const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
        const fechaRegistro = document.getElementById('fechaRegistro').value;

        // Validación de duplicidad solo para nuevo pago
        if (!id) {
            const pagosRef = collection(db, "pagos");
            const q = query(
                pagosRef,
                where("inmuebleId", "==", inmuebleId),
                where("mesCorrespondiente", "==", mesCorrespondiente),
                where("anioCorrespondiente", "==", anioCorrespondiente),
                where("estado", "==", "pagado")
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                mostrarNotificacion('Ya existe un pago completo registrado para este inmueble, mes y año. No se permite duplicados.', 'error', 8000);
                return;
            }
        }

        // Estado y saldos según el monto pagado
        let estado = "pendiente";
        let saldoPendiente = montoTotal - montoPago;
        if (montoPago >= montoTotal) {
            estado = "pagado";
            saldoPendiente = 0;
        } else if (montoPago > 0) {
            estado = "parcial";
        }

        // --- AQUÍ VA EL FRAGMENTO DE SALDO A FAVOR ---
    if (montoPago > montoTotal) {
        const excedente = montoPago - montoTotal;
        const abonosSnap = await getDocs(query(
            collection(db, "abonosSaldoFavor"),
            where("inquilinoId", "==", inquilinoId),
            where("saldoRestante", ">", 0)
        ));
        if (!abonosSnap.empty) {
            const abonoDoc = abonosSnap.docs[0];
            const abonoData = abonoDoc.data();
            await updateDoc(doc(db, "abonosSaldoFavor", abonoDoc.id), {
                saldoRestante: abonoData.saldoRestante + excedente,
                montoOriginal: abonoData.montoOriginal + excedente
            });
        } else {
            await addDoc(collection(db, "abonosSaldoFavor"), {
                inquilinoId,
                montoOriginal: excedente,
                saldoRestante: excedente,
                descripcion: "Saldo a favor generado por pago excedente",
                fechaAbono: fechaRegistro,
                fechaRegistro: fechaRegistro
            });
        }
    }
    // --- FIN DEL FRAGMENTO ---

        const formaPago = document.getElementById('formaPago').value;
        const propietarioId = document.getElementById('propietarioId').value;
        const serviciosPagados = {};
        if (document.getElementById('servicioInternet').checked) {
            serviciosPagados.internet = true;
            serviciosPagados.internetMonto = parseFloat(document.getElementById('montoInternet').value) || 0;
        }

        const datos = {
            inmuebleId,
            inquilinoId,
            mesCorrespondiente,
            anioCorrespondiente,
            montoTotal,
            montoPagado: montoPago,
            saldoPendiente,
            estado,
            fechaRegistro,
            abonos: [{
                montoAbonado: montoPago,
                fechaAbono: fechaRegistro
            }],
            formaPago,
            propietarioId,
            serviciosPagados
        };

        try {
            if (id) {
                await updateDoc(doc(db, "pagos", id), datos);
                mostrarNotificacion('Pago actualizado con éxito.', 'success');
            } else {
                await addDoc(collection(db, "pagos"), datos);
                mostrarNotificacion('Pago registrado con éxito.', 'success');
            }
            ocultarModal();
            mostrarPagos();
            
        } catch (error) {
            mostrarNotificacion('Error al guardar el pago.', 'error');
        }
    });

    if (document.getElementById('servicioInternet')) {
        document.getElementById('servicioInternet').addEventListener('change', function() {
            document.getElementById('montoInternet').style.display = this.checked ? 'inline-block' : 'none';
        });
    }
}


/**
 * Permite editar un pago existente.
 * @param {string} id - El ID del pago a editar.
 */
export async function editarPago(id) {
    await mostrarFormularioNuevoPago(id);
}


/**
 * Muestra el formulario para registrar un abono a un pago pendiente o parcial.
 * @param {string} pagoId - El ID del pago al que se va a abonar.
 */
export async function mostrarFormularioRegistrarAbono(pagoId) {
    let pago = {};
    try {
        const docSnap = await getDoc(doc(db, "pagos", pagoId));
        if (docSnap.exists()) {
            pago = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("No se encontró el pago con el ID:", pagoId);
            mostrarNotificacion("Pago no encontrado para abonar.", 'error');
            return;
        }
    } catch (error) {
        console.error("Error al cargar datos para abono:", error);
        mostrarNotificacion("Error al preparar el formulario de abono.", 'error');
        return;
    }

    // --- VALIDACIÓN: No permitir abonos si el pago ya está pagado ---
    if (pago.estado === 'pagado' || pago.saldoPendiente === 0) {
        mostrarNotificacion('Este pago ya está completamente pagado. No puedes registrar más abonos.', 'warning');
        return;
    }

    const montoTotal = pago.montoTotal || 0;
    const montoPagadoActual = pago.montoPagado || 0;
    const saldoPendiente = montoTotal - montoPagadoActual;

    const formAbonoHtml = `
    <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
        <h3 class="text-2xl font-bold text-center">Registrar Abono</h3>
    </div>
    <form id="formAbono" class="space-y-5 px-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto total del pago</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-blue-900 font-bold text-lg">$${montoTotal.toFixed(2)}</div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto pagado actualmente</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-green-700 font-bold text-lg">$${montoPagadoActual.toFixed(2)}</div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto pendiente</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-red-700 font-bold text-lg">$${saldoPendiente.toFixed(2)}</div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="montoAbono" class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a Abonar</label>
                <input type="number" id="montoAbono" name="montoAbono" step="0.01" min="0.01" max="${saldoPendiente.toFixed(2)}" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
            </div>
            <div>
                <label for="fechaAbono" class="block text-sm font-semibold text-gray-700 mb-1">Fecha del Abono</label>
                <input type="date" id="fechaAbono" name="fechaAbono" value="${new Date().toISOString().split('T')[0]}" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
            </div>
        </div>
        <div class="flex justify-end space-x-3 mt-8">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                Registrar Abono
            </button>
        </div>
    </form>
`;

    mostrarModal(formAbonoHtml);

    document.getElementById('formAbono').addEventListener('submit', async (e) => {
        e.preventDefault();
        const montoAbonar = parseFloat(document.getElementById('montoAbono').value);
        const fechaAbono = document.getElementById('fechaAbono').value;

        if (montoAbonar <= 0 || montoAbonar > saldoPendiente) {
            mostrarNotificacion('El monto a abonar debe ser mayor a 0 y no exceder el monto pendiente.', 'error');
            return;
        }

        try {
            // Asegúrate de que el array 'abonos' exista
            const abonosActuales = pago.abonos || [];

            // Añadir el nuevo abono al array
            abonosActuales.push({
                montoAbonado: montoAbonar,
                fechaAbono: fechaAbono
            });

            // Recalcular montoPagado sumando todos los abonos
            const nuevoMontoPagado = abonosActuales.reduce((sum, abono) => sum + abono.montoAbonado, 0);
            const nuevoSaldoPendiente = montoTotal - nuevoMontoPagado;
            let nuevoEstado = 'pendiente';

            if (nuevoMontoPagado >= montoTotal) {
                nuevoEstado = 'pagado';
            } else if (nuevoMontoPagado > 0) {
                nuevoEstado = 'parcial';
            }
            // Si el pago estaba vencido y no se ha cubierto el total, sigue vencido o parcial/vencido.
            if (pago.estado === 'vencido' && nuevoMontoPagado < montoTotal) {
                if (nuevoMontoPagado > 0) {
                    nuevoEstado = 'parcial';
                } else {
                    nuevoEstado = 'vencido';
                }
            }


            await updateDoc(doc(db, "pagos", pagoId), {
                montoPagado: nuevoMontoPagado,
                saldoPendiente: nuevoSaldoPendiente,
                estado: nuevoEstado,
                abonos: abonosActuales // Guardar el array de abonos actualizado
            });

            mostrarNotificacion('Abono registrado con éxito.', 'success');
            ocultarModal();
            mostrarPagos();
    
        } catch (error) {
            console.error('Error al registrar el abono:', error);
            mostrarNotificacion('Error al registrar el abono.', 'error');
        }
    });
}


/**
 * Muestra los detalles de un pago en un modal, incluyendo el historial de abonos.
 * @param {string} pagoId - El ID del pago a mostrar.
 */
export async function mostrarDetallePago(pagoId) {
    try {
        const docSnap = await getDoc(doc(db, "pagos", pagoId));
        if (!docSnap.exists()) {
            mostrarNotificacion("Pago no encontrado.", 'error');
            return;
        }

        const pago = docSnap.data();

        // Obtener nombres de inmueble e inquilino
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Desconocido';

        const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Desconocido';

        let abonosHtml = '';
        if (pago.abonos && pago.abonos.length > 0) {
            abonosHtml = `
                <h4 class="text-lg font-semibold mt-6 mb-2 text-gray-800">Historial de Abonos:</h4>
                <div class="overflow-x-auto rounded-lg border border-gray-200 shadow">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Abonado</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Abono</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;
            pago.abonos
                .sort((a, b) => new Date(a.fechaAbono) - new Date(b.fechaAbono))
                .forEach((abono, idx) => {
                    abonosHtml += `
                        <tr>
                            <td class="px-4 py-2 text-sm text-gray-500">${idx + 1}</td>
                            <td class="px-4 py-2 text-sm text-green-700 font-bold">$${(abono.montoAbonado || 0).toFixed(2)}</td>
                            <td class="px-4 py-2 text-sm text-gray-700">${abono.fechaAbono}</td>
                        </tr>
                    `;
                });
            abonosHtml += `
                </tbody>
            </table>
        </div>
    `;
        } else {
            abonosHtml = `<p class="text-gray-600 mt-4">No hay abonos registrados para este pago.</p>`;
        }


        const detalleHtml = `
            <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Detalles del Pago</h3>
            </div>
            <div class="space-y-3 text-gray-700 px-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Inmueble:</strong> <span class="text-blue-900">${nombreInmueble}</span></div>
                    <div><strong>Inquilino:</strong> <span class="text-blue-900">${nombreInquilino}</span></div>
                    <div><strong>Mes Correspondiente:</strong> <span>${pago.mesCorrespondiente}</span></div>
                    <div><strong>Año Correspondiente:</strong> <span>${pago.anioCorrespondiente}</span></div>
                    <div><strong>Monto Total:</strong> <span class="text-green-700 font-bold">$${(pago.montoTotal || 0).toFixed(2)}</span></div>
                    <div><strong>Monto Pagado:</strong> <span class="text-green-700 font-bold">$${(pago.montoPagado || 0).toFixed(2)}</span></div>
                    <div><strong>Saldo Pendiente:</strong> <span class="text-red-700 font-bold">$${(pago.saldoPendiente || 0).toFixed(2)}</span></div>
                    <div><strong>Estado:</strong> <span class="inline-block px-3 py-1 rounded-full font-semibold ${pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : pago.estado === 'pendiente' ? 'bg-orange-100 text-orange-800' : pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${pago.estado}</span></div>
                    <div><strong>Fecha de Registro:</strong> <span>${pago.fechaRegistro}</span></div>
                </div>
                ${abonosHtml}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(detalleHtml);

    } catch (error) {
        console.error("Error al mostrar detalles del pago:", error);
        mostrarNotificacion("Error al cargar los detalles del pago.", 'error');
    }
}


/**
 * Muestra el historial de pagos para un inquilino específico.
 * Incluye los detalles de los abonos.
 * @param {string} inquilinoId - El ID del inquilino.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId) {
    try {
        const pagosQuery = query(collection(db, "pagos"), where("inquilinoId", "==", inquilinoId));
        const pagosSnap = await getDocs(pagosQuery);

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Inquilino Desconocido';

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInquilino}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Inmueble
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Mes / Año
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Total
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Pagado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Saldo Pendiente
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Abonos
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (pagosSnap.empty) {
            historialPagosHtml += `
                        <tr>
                            <td colspan="7" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inquilino.
                            </td>
                        </tr>
            `;
        } else {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    // Ordenar abonos por fecha para mostrarlos cronológicamente
                    pago.abonos.sort((a, b) => new Date(a.fechaAbono) - new Date(b.fechaAbono));
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>$${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
                    });
                    abonosDetalleHtml += `</ul>`;
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-500">Sin abonos</span>`;
                }

                historialPagosHtml += `
                            <tr class="hover:bg-gray-50">
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${pago.mesCorrespondiente} / ${pago.anioCorrespondiente}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${abonosDetalleHtml}
                                </td>
                            </tr>
                `;
            });
        }
        historialPagosHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(historialPagosHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inquilino:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inquilino.", 'error');
    }
}


/**
 * Muestra el historial de pagos para un inmueble específico.
 * @param {string} inmuebleId - El ID del inmueble.
 */
export async function mostrarHistorialPagosInmueble(inmuebleId) {
    try {
        const pagosQuery = query(collection(db, "pagos"), where("inmuebleId", "==", inmuebleId));
        const pagosSnap = await getDocs(pagosQuery);

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInmueble}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Inquilino
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Mes / Año
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Total
                            </th>
                             <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Pagado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Saldo Pendiente
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Abonos
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (pagosSnap.empty) {
            historialPagosHtml += `
                        <tr>
                            <td colspan="7" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inmueble.
                            </td>
                        </tr>
            `;
        } else {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>$${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
                    });
                    abonosDetalleHtml += `</ul>`;
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-500">Sin abonos</span>`;
                }

                historialPagosHtml += `
                            <tr class="hover:bg-gray-50">
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${inquilinosMap.get(pago.inquilinoId) || 'Desconocido'}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${pago.mesCorrespondiente} / ${pago.anioCorrespondiente}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${abonosDetalleHtml}
                                </td>
                            </tr>
                `;
            });
        }
        historialPagosHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(historialPagosHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inmueble:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inmueble.", 'error');
    }
}


/**
 * Revisa y actualiza el estado de los pagos vencidos.
 * Esta función se debe llamar periódicamente, por ejemplo, al cargar el dashboard.
 */
export async function revisarPagosVencidos() {
    try {
        const today = new Date();
        // Establecer la hora a 00:00:00 para comparar solo fechas
        today.setHours(0, 0, 0, 0);

        // Obtener pagos que no estén 'pagado'
        const pagosPendientesParcialesQuery = query(
            collection(db, "pagos"),
            where("estado", "!=", "pagado")
        );
        const pagosSnap = await getDocs(pagosPendientesParcialesQuery);

        const actualizaciones = [];

        pagosSnap.forEach(documento => {
            const pago = documento.data();
            const pagoId = documento.id;

            const anioPago = pago.anioCorrespondiente;
            const meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];
            const mesPagoNumero = meses.indexOf(pago.mesCorrespondiente); // 0-indexed month

            // Creamos una fecha de vencimiento que es el último día del mes del pago
            // Si el pago es de Enero, vence el 31 de Enero.
            const fechaVencimiento = new Date(anioPago, mesPagoNumero + 1, 0); // Día 0 del mes siguiente es el último día del mes actual
            fechaVencimiento.setHours(23, 59, 59, 999); // Establecer la hora al final del día para una comparación precisa

            // Un pago se considera vencido si la fecha actual es posterior a la fecha de vencimiento
            // Y si el estado actual no es ya 'vencido' y no está 'pagado'
            if (today > fechaVencimiento && pago.estado !== 'vencido' && pago.montoPagado < pago.montoTotal) {
                actualizaciones.push(updateDoc(doc(db, "pagos", pagoId), {
                    estado: 'vencido'
                }));
                // Opcional: Mostrar una notificación si el pago pasa a estar vencido
                mostrarNotificacion(`¡Alerta! El pago del inmueble para el mes ${pago.mesCorrespondiente} del ${pago.anioCorrespondiente} está vencido.`, 'warning', 10000);
            }
        });

        await Promise.all(actualizaciones);

    } catch (error) {
        console.error("Error al revisar pagos vencidos:", error);
        mostrarNotificacion("Error al revisar pagos vencidos.", 'error');
    }
}

// Función auxiliar para eliminar documentos (probablemente ya la tienes en ui.js o utilities.js)
// Si no la tienes, aquí una versión simple para pagos:
export async function eliminarDocumento(coleccion, id, callbackRefresh) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');
            if (callbackRefresh) callbackRefresh();
            
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

/**
 * Muestra el formulario para registrar un pago de servicio.
 */
export async function mostrarFormularioPagoServicio() {
    // Carga inquilinos e inmuebles
    const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
    const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
    const inquilinos = [];
    inquilinosSnap.forEach(doc => inquilinos.push({ id: doc.id, ...doc.data() }));
    const inmuebles = [];
    inmueblesSnap.forEach(doc => inmuebles.push({ id: doc.id, ...doc.data() }));

    // Opciones de inquilinos
    const inquilinosOptions = inquilinos.map(inq =>
        `<option value="${inq.id}">${inq.nombre}</option>`
    ).join('');

    // Opciones de servicios
    const servicios = ["Internet", "Agua", "Luz"];
    const serviciosOptions = servicios.map(s => `<option value="${s}">${s}</option>`).join('');

    // Opciones de meses y años
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const anioActual = new Date().getFullYear();
    const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);
    const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
    const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

    const formHtml = `
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-2xl font-bold text-center">Registrar Pago de Servicio</h3>
        </div>
        <form id="formPagoServicio" class="space-y-5 px-2">
            <div>
                <label for="inquilinoIdServicio" class="block text-sm font-semibold text-gray-700 mb-1">Inquilino</label>
                <select id="inquilinoIdServicio" name="inquilinoIdServicio" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                    <option value="">Selecciona un inquilino</option>
                    ${inquilinosOptions}
                </select>
            </div>
            <div>
                <label for="servicio" class="block text-sm font-semibold text-gray-700 mb-1">Servicio</label>
                <select id="servicio" name="servicio" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                    <option value="">Selecciona un servicio</option>
                    ${serviciosOptions}
                </select>
            </div>
            <div>
                <label for="montoServicio" class="block text-sm font-semibold text-gray-700 mb-1">Monto del Servicio</label>
                <input type="number" id="montoServicio" name="montoServicio" step="0.01" min="0.01" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="mesServicio" class="block text-sm font-semibold text-gray-700 mb-1">Mes Correspondiente</label>
                    <select id="mesServicio" name="mesServicio" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                        ${mesesOptions}
                    </select>
                </div>
                <div>
                    <label for="anioServicio" class="block text-sm font-semibold text-gray-700 mb-1">Año Correspondiente</label>
                    <select id="anioServicio" name="anioServicio" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                        ${aniosOptions}
                    </select>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                    Registrar Pago de Servicio
                </button>
            </div>
        </form>
    `;
    mostrarModal(formHtml);

    document.getElementById('formPagoServicio').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inquilinoId = document.getElementById('inquilinoIdServicio').value;
        const servicio = document.getElementById('servicio').value;
        const montoServicio = parseFloat(document.getElementById('montoServicio').value);
        const mesServicio = document.getElementById('mesServicio').value;
        const anioServicio = parseInt(document.getElementById('anioServicio').value);

        // Busca el inmueble asociado al inquilino
        const inquilino = inquilinos.find(i => i.id === inquilinoId);
        const inmuebleId = inquilino?.inmuebleId || null;
        if (!inmuebleId) {
            mostrarNotificacion('El inquilino seleccionado no tiene inmueble asociado.', 'error');
            return;
        }

        // Busca si ya existe un pago para ese inmueble, inquilino, mes y año
        const pagosRef = collection(db, "pagos");
        const q = query(
            pagosRef,
            where("inmuebleId", "==", inmuebleId),
            where("inquilinoId", "==", inquilinoId),
            where("mesCorrespondiente", "==", mesServicio),
            where("anioCorrespondiente", "==", anioServicio)
        );
        const querySnapshot = await getDocs(q);

        let pagoDocId = null;
        let pagoData = null;
        if (!querySnapshot.empty) {
            // Ya existe un pago, actualiza el campo serviciosPagados
            pagoDocId = querySnapshot.docs[0].id;
            pagoData = querySnapshot.docs[0].data();
        }

        // Prepara el objeto de serviciosPagados
        let serviciosPagados = pagoData?.serviciosPagados || {};
        serviciosPagados[servicio.toLowerCase()] = true;
        serviciosPagados[`${servicio.toLowerCase()}Monto`] = montoServicio;

        if (pagoDocId) {
            // Actualiza el documento existente
            await updateDoc(doc(db, "pagos", pagoDocId), { serviciosPagados });
        } else {
            // Si no existe, crea un nuevo pago SOLO de servicio
            await addDoc(collection(db, "pagos"), {
                inmuebleId,
                inquilinoId,
                mesCorrespondiente: mesServicio,
                anioCorrespondiente: anioServicio,
                montoTotal: 0,
                montoPagado: 0,
                saldoPendiente: 0,
                estado: "pagado",
                fechaRegistro: new Date().toISOString().split('T')[0],
                serviciosPagados
            });
        }
        mostrarNotificacion('Pago de servicio registrado con éxito.', 'success');
        ocultarModal();
        mostrarPagos();
    });
}