import { db } from './firebaseConfig.js';
import { collection, doc, getDocs, query, where, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Agrupa pagos por mes de pago (YYYY-MM)
function agruparPorMes(pagos) {
    const meses = {};
    pagos.forEach(pago => {
        const fecha = pago.fechaPago instanceof Date ? pago.fechaPago : new Date(pago.fechaPago);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        if (!meses[key]) meses[key] = [];
        meses[key].push(pago);
    });
    return meses;
}

// Obtiene los pagos de renta pagados desde Firestore (usando mesCorrespondiente/anioCorrespondiente si no hay fechaPago)
async function obtenerPagosRentaComisiones() {
    const pagosRef = collection(db, "pagos");
    const pagosQuery = query(pagosRef, where("estado", "==", "pagado"));
    const snapshot = await getDocs(pagosQuery);
    const pagos = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();

        // Toma el primer monto válido
        let montoTotal = 0;
        if (typeof data.montoPagado === 'number') montoTotal = data.montoPagado;
        else if (typeof data.montoTotal === 'number') montoTotal = data.montoTotal;
        else if (typeof data.monto === 'number') montoTotal = data.monto;
        // NO sumes mobiliarioPagado aquí si ya está incluido

        // Determinar la fecha de pago
        let fechaPago = null;
        if (data.fechaPago && typeof data.fechaPago === 'object' && typeof data.fechaPago.toDate === 'function') {
            fechaPago = data.fechaPago.toDate();
        } else if (data.fechaPago && typeof data.fechaPago === 'string') {
            fechaPago = new Date(data.fechaPago);
        } else if (data.mesCorrespondiente && data.anioCorrespondiente) {
            // Construir fecha usando mesCorrespondiente y anioCorrespondiente
            // mesCorrespondiente puede ser "Enero", "Febrero", etc.
            const mesesNombres = [
                "enero", "febrero", "marzo", "abril", "mayo", "junio",
                "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
            ];
            let mesNum = mesesNombres.findIndex(
                m => m === String(data.mesCorrespondiente).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            );
            if (mesNum !== -1) {
                fechaPago = new Date(Number(data.anioCorrespondiente), mesNum, 1);
            }
        }

        // Solo agrega si la fecha es válida y el monto es mayor a 0
        if (montoTotal > 0 && fechaPago instanceof Date && !isNaN(fechaPago)) {
            pagos.push({
                id: docSnap.id,
                monto: montoTotal,
                fechaPago: fechaPago,
                inmuebleId: data.inmuebleId || null // <-- asegúrate de incluir esto
            });
            // Depuración: muestra el pago que sí se va a mostrar
            console.log('Pago válido para mostrar:', {
                id: docSnap.id,
                monto: montoTotal,
                fechaPago: fechaPago
            });
        } else {
            // Depuración: muestra por qué no se muestra
            console.warn('Pago ignorado:', {
                id: docSnap.id,
                monto: montoTotal,
                fechaPago: fechaPago,
                mesCorrespondiente: data.mesCorrespondiente,
                anioCorrespondiente: data.anioCorrespondiente
            });
        }
    });
    return pagos;
}

// --- Filtros globales ---
let filtroAnio = '';
let filtroMes = '';
let filtroEstadoCobro = ''; // Nuevo filtro para estado de cobro

// Renderiza la tabla de pagos agrupados por mes, con comisión calculada y opción de marcar como cobrado
export async function renderComisiones() {
    const contenedor = document.getElementById('contenido');
    if (!contenedor) return;
    contenedor.innerHTML = `
        <div class="flex items-center justify-center h-32">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    `;

    // 1. Obtiene los pagos reales de Firestore
    const pagosRenta = await obtenerPagosRentaComisiones();
    const pagosPorMes = agruparPorMes(pagosRenta);

    // 2. Obtiene el estado de cobro de cada mes desde la colección comisiones
    const comisionesSnap = await getDocs(collection(db, "comisiones"));
    const comisionesEstado = {};
    comisionesSnap.forEach(docSnap => {
        comisionesEstado[docSnap.id] = docSnap.data();
    });

    // 3. Construcción de filtros
    const mesesDisponibles = Object.keys(pagosPorMes);
    const anios = [...new Set(mesesDisponibles.map(m => m.split('-')[0]))].sort();
    const mesesNumeros = [...new Set(mesesDisponibles.map(m => m.split('-')[1]))].sort();

    let filtrosHtml = `
<div class="flex flex-wrap gap-4 mb-6 items-end">
    <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Año</label>
        <select id="filtroAnio" class="mt-1 block w-28 rounded-lg border-gray-300 shadow focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Todos</option>
            ${anios.map(anio => `<option value="${anio}" ${filtroAnio === anio ? 'selected' : ''}>${anio}</option>`).join('')}
        </select>
    </div>
    <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Mes</label>
        <select id="filtroMes" class="mt-1 block w-32 rounded-lg border-gray-300 shadow focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Todos</option>
            ${mesesNumeros.map(mesNum => {
                const mesStr = String(mesNum).padStart(2, '0');
                const nombreMes = new Date(2000, parseInt(mesNum, 10) - 1, 1).toLocaleString('es-MX', { month: 'long' });
                return `<option value="${mesStr}" ${filtroMes === mesStr ? 'selected' : ''}>${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}</option>`;
            }).join('')}
        </select>
    </div>
    <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Estado de cobro</label>
        <select id="filtroEstadoCobro" class="mt-1 block w-36 rounded-lg border-gray-300 shadow focus:ring-indigo-500 focus:border-indigo-500">
            <option value="">Todos</option>
            <option value="cobrado" ${filtroEstadoCobro === 'cobrado' ? 'selected' : ''}>Cobrados</option>
            <option value="nocobrado" ${filtroEstadoCobro === 'nocobrado' ? 'selected' : ''}>No cobrados</option>
        </select>
    </div>
</div>
`;

    // 4. Construcción del HTML de pagos agrupados y filtrados
    let html = `
    <div class="max-w-3xl mx-auto px-2">
        <h2 class="text-3xl font-extrabold mb-6 text-indigo-700 text-center">Pagos de Renta Registrados</h2>
        ${filtrosHtml}
    `;

    // Filtrar meses según los filtros seleccionados
    let mesesFiltrados = Object.keys(pagosPorMes).filter(mes => {
        const [anio, mesNum] = mes.split('-'); // mesNum SIEMPRE es string de dos dígitos
        const coincideAnio = !filtroAnio || filtroAnio === anio;
        const coincideMes = !filtroMes || filtroMes === mesNum;
        const comisionMes = comisionesEstado[mes];
        const estado = filtroEstadoCobro || '';

        if (estado === 'cobrado') {
            return coincideAnio && coincideMes && !!comisionMes && comisionMes.cobrado === true;
        }
        if (estado === 'nocobrado') {
            return coincideAnio && coincideMes && (!comisionMes || comisionMes.cobrado !== true);
        }
        // Si es "Todos" (""), muestra todos
        return coincideAnio && coincideMes;
    });

    if (mesesFiltrados.length === 0) {
        html += `<p class="text-gray-500 text-center">No hay pagos registrados para los filtros seleccionados.</p></div>`;
        contenedor.innerHTML = html;
        return;
    }

    // Obtén la lista global de inmuebles ocupados antes del bucle
    const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
    const inmueblesOcupadosGlobal = [];
    inmueblesSnap.forEach(doc => {
        const data = doc.data();
        if (data.estado === "Ocupado") {
            inmueblesOcupadosGlobal.push({ id: doc.id, nombre: data.nombre });
        }
    });

    mesesFiltrados.sort().reverse().forEach(mes => {
        const pagos = pagosPorMes[mes];
        const totalRentas = pagos.reduce((sum, p) => sum + p.monto, 0);
        const totalComision = totalRentas * 0.10;
        const nombreMes = new Date(2000, parseInt(mes.split('-')[1], 10) - 1, 1).toLocaleString('es-MX', { month: 'long' });
        const comisionMes = comisionesEstado[mes];
        const cobrado = comisionMes?.cobrado === true;
        const fechaCobro = comisionMes?.fechaCobro ? new Date(comisionMes.fechaCobro).toLocaleString('es-MX') : '';

        const pagosInmuebleIds = pagos.map(p => p.inmuebleId);
        const faltantes = inmueblesOcupadosGlobal.filter(inm => !pagosInmuebleIds.includes(inm.id));
        const faltanPagos = faltantes.length > 0;
        const faltantesNombres = faltantes.map(f => f.nombre);

        html += `
        <div class="mb-10 bg-gradient-to-br from-indigo-50 to-white rounded-2xl shadow-xl p-8 transition hover:shadow-2xl border border-indigo-100">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div class="flex items-center gap-3">
                    <span class="inline-block bg-indigo-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow">${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${mes.split('-')[0]}</span>
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${cobrado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} shadow">
                        ${cobrado ? 
                            `<svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Cobrado` : 
                            `<svg class="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01" /></svg> No cobrado`
                        }
                    </span>
                    ${cobrado && fechaCobro ? `<span class="ml-2 text-xs text-gray-500">(${fechaCobro})</span>` : ''}
                </div>
                <div class="flex gap-2">
                    <button class="marcar-cobrado px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow transition flex items-center gap-2"
                        data-mes="${mes}" data-cobrado="${cobrado}" ${faltanPagos ? 'disabled title="No puedes marcar como cobrado hasta que todos los inmuebles ocupados tengan pago registrado."' : ''}>
                        ${cobrado ? 
                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Desmarcar` : 
                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Marcar cobrado`
                        }
                    </button>
                    <button class="px-4 py-2 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold shadow transition btn-ver-pagos flex items-center gap-2" data-mes="${mes}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Ver pagos
                    </button>
                    <button class="px-4 py-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold shadow transition btn-ver-faltantes flex items-center gap-2" data-mes="${mes}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Inmuebles sin pago
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div class="bg-white rounded-xl shadow p-5 flex flex-col items-center border border-indigo-100">
                    <span class="text-gray-500 text-sm mb-1">Total rentas pagadas</span>
                    <span class="text-2xl font-extrabold text-indigo-700">$${totalRentas.toFixed(2)}</span>
                </div>
                <div class="bg-white rounded-xl shadow p-5 flex flex-col items-center border border-indigo-100">
                    <span class="text-gray-500 text-sm mb-1">Comisión (10%)</span>
                    <span class="text-2xl font-extrabold text-green-600">$${totalComision.toFixed(2)}</span>
                </div>
            </div>
            ${faltanPagos ? `
                <div class="flex items-center gap-2 mt-2 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold shadow animate-pulse">
                    <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ¡Faltan pagos de: ${faltantesNombres.join(', ')}!
                </div>
            ` : ''}
        </div>
        `;
    });

    html += `</div>`;
    contenedor.innerHTML = html;

    // 5. Asigna eventos a los filtros
    document.getElementById('filtroAnio').addEventListener('change', function() {
        filtroAnio = this.value;
        renderComisiones();
    });
    document.getElementById('filtroMes').addEventListener('change', function() {
        filtroMes = this.value;
        renderComisiones();
    });
    document.getElementById('filtroEstadoCobro').addEventListener('change', function() {
        filtroEstadoCobro = this.value || '';
        renderComisiones();
    });

    // 6. Asigna eventos a los botones de cobrado
    document.querySelectorAll('.marcar-cobrado').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            if (this.disabled) {
                mostrarNotificacion("No puedes marcar como cobrado hasta que todos los inmuebles ocupados tengan pago registrado.", "warning");
                return;
            }
            const mes = this.getAttribute('data-mes');
            const cobradoActual = this.getAttribute('data-cobrado') === 'true';
            const pagos = pagosPorMes[mes];
            const totalRentas = pagos.reduce((sum, p) => sum + p.monto, 0);
            const totalComision = totalRentas * 0.10;
            const ref = doc(db, "comisiones", mes);

            if (!cobradoActual) {
                // Marcar como cobrado
                await setDoc(ref, {
                    mes,
                    totalComision,
                    fechaCobro: new Date().toISOString(),
                    cobrado: true
                }, { merge: true });
            } else {
                // Desmarcar como cobrado
                await setDoc(ref, {
                    mes,
                    totalComision,
                    fechaCobro: null,
                    cobrado: false
                }, { merge: true });
            }
            renderComisiones();
        });
    });

    document.querySelectorAll('.btn-ver-pagos').forEach(btn => {
        btn.addEventListener('click', async function() {
            const mes = this.getAttribute('data-mes');
            const pagos = pagosPorMes[mes];

            // Trae todos los inmuebles para mapear id -> nombre
            const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
            const inmueblesMap = {};
            inmueblesSnap.forEach(doc => {
                const data = doc.data();
                inmueblesMap[doc.id] = data.nombre || '';
            });

            // --- Para el modal de "Ver Pagos" ---
            let tabla = `
                <div class="relative">
                    <button onclick="ocultarModal()" class="absolute top-2 right-2 z-20 bg-white/80 hover:bg-red-100 text-red-600 rounded-full p-2 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-400" style="font-size:1.5rem;line-height:1;">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div class="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-t-2xl -mx-6 -mt-6 mb-6 shadow flex flex-col items-center">
                        <h3 class="text-2xl font-extrabold text-center mb-1 tracking-tight">Pagos incluidos</h3>
                        <span class="text-indigo-100 text-sm font-medium">${pagos.length} pago${pagos.length === 1 ? '' : 's'} registrados</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-indigo-100 rounded-xl shadow bg-white">
                            <thead class="bg-indigo-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Fecha</th>
                                    <th class="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Monto</th>
                                    <th class="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Inmueble</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-indigo-50">
                                ${pagos.map(p => `
                                    <tr class="hover:bg-indigo-50 transition">
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${new Date(p.fechaPago).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">$${p.monto.toFixed(2)}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-indigo-900 font-semibold">${inmueblesMap[p.inmuebleId] || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                        <div class="flex flex-col items-center sm:items-start">
                            <span class="text-xs text-gray-500 mb-1">Total de pagos</span>
                            <span class="text-2xl font-extrabold text-indigo-700">$${pagos.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}</span>
                        </div>
                        <button onclick="ocultarModal()" class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2 mt-4 sm:mt-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cerrar
                        </button>
                    </div>
                </div>
                <style>
                    @media (max-width: 640px) {
                        .modal-content table th, .modal-content table td {
                            padding-left: 0.5rem !important;
                            padding-right: 0.5rem !important;
                            font-size: 0.95rem;
                        }
                        .modal-content .flex {
                            flex-direction: column !important;
                            gap: 1rem !important;
                        }
                        .modal-content .absolute.top-2.right-2 {
                            top: 0.5rem !important;
                            right: 0.5rem !important;
                        }
                    }
                </style>
            `;
            mostrarModal(`<div class="modal-content">${tabla}</div>`);
        });
    });

    document.querySelectorAll('.btn-ver-faltantes').forEach(btn => {
        btn.addEventListener('click', async function() {
            const mes = this.getAttribute('data-mes');
            const [anio, mesNum] = mes.split('-');
            // 1. Trae todos los inmuebles ocupados
            const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
            const inmueblesOcupados = [];
            inmueblesSnap.forEach(doc => {
                const data = doc.data();
                if (data.estado === "Ocupado") {
                    inmueblesOcupados.push({ id: doc.id, nombre: data.nombre });
                }
            });
            // 2. Obtén los pagos de ese mes
            const pagos = pagosPorMes[mes] || [];
            const pagosInmuebleIds = pagos.map(p => p.inmuebleId);

            // 3. Filtra los inmuebles ocupados que no tienen pago ese mes
            const faltantes = inmueblesOcupados.filter(inm => !pagosInmuebleIds.includes(inm.id));

            // --- Para el modal de "Inmuebles sin pago" ---
            let tablaFaltantes = `
                <div class="relative">
                    <button onclick="ocultarModal()" class="absolute top-2 right-2 z-20 bg-white/80 hover:bg-red-100 text-red-600 rounded-full p-2 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-400" style="font-size:1.5rem;line-height:1;">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div class="px-4 py-3 bg-yellow-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow flex flex-col items-center">
                        <h3 class="text-xl font-bold text-center mb-1">Inmuebles ocupados sin pago en el mes</h3>
                        <div class="flex items-center gap-2 mt-1 mb-2">
                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-yellow-600 font-extrabold text-lg shadow">${faltantes.length}</span>
                            <span class="text-sm text-yellow-100 font-medium">sin pago</span>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        ${
                            faltantes.length > 0
                            ? `<ul class="divide-y divide-yellow-100 bg-yellow-50 rounded-lg shadow p-4">
                                ${faltantes.map(inm => `
                                    <li class="flex items-center gap-3 py-2">
                                        <svg class="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span class="font-medium text-yellow-900">${inm.nombre}</span>
                                    </li>
                                `).join('')}
                            </ul>`
                            : `<div class="p-6 text-center text-green-700 font-semibold bg-green-50 rounded-lg shadow">Todos los inmuebles ocupados tienen pago registrado.</div>`
                        }
                    </div>
                    <div class="flex justify-end mt-6">
                        <button onclick="ocultarModal()" class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cerrar
                        </button>
                    </div>
                </div>
            `;
            mostrarModal(tablaFaltantes);
        });
    });
}

// Integración con el menú lateral
window.mostrarComisiones = function() {
    renderComisiones();
    if (typeof setActiveSection === 'function') setActiveSection('comisiones');
};
