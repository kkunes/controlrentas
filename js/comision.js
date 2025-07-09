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
                fechaPago: fechaPago
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
let filtroEstado = ''; // Nuevo filtro

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
    const meses = [...new Set(mesesDisponibles.map(m => m.split('-')[1]))].sort();

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
                ${meses.map(mes => {
                    const nombreMes = new Date(2000, parseInt(mes, 10) - 1, 1).toLocaleString('es-MX', { month: 'long' });
                    return `<option value="${mes}" ${filtroMes === mes ? 'selected' : ''}>${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}</option>`;
                }).join('')}
            </select>
        </div>
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
            <select id="filtroEstado" class="mt-1 block w-36 rounded-lg border-gray-300 shadow focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Todos</option>
                <option value="cobrado" ${filtroEstado === 'cobrado' ? 'selected' : ''}>Cobrado</option>
                <option value="nocobrado" ${filtroEstado === 'nocobrado' ? 'selected' : ''}>No cobrado</option>
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
        const [anio, mesNum] = mes.split('-');
        const coincideAnio = !filtroAnio || filtroAnio === anio;
        const coincideMes = !filtroMes || filtroMes === mesNum;
        const comisionMes = comisionesEstado[mes];
        const cobrado = comisionMes?.cobrado === true;
        let coincideEstado = true;
        if (filtroEstado === 'cobrado') coincideEstado = cobrado;
        if (filtroEstado === 'nocobrado') coincideEstado = !cobrado;
        return coincideAnio && coincideMes && coincideEstado;
    });

    if (mesesFiltrados.length === 0) {
        html += `<p class="text-gray-500 text-center">No hay pagos registrados para los filtros seleccionados.</p></div>`;
        contenedor.innerHTML = html;
        return;
    }

    mesesFiltrados.sort().forEach(mes => {
        const pagos = pagosPorMes[mes];
        const totalRentas = pagos.reduce((sum, p) => sum + p.monto, 0);
        const totalComision = totalRentas * 0.10;
        const nombreMes = new Date(2000, parseInt(mes.split('-')[1], 10) - 1, 1).toLocaleString('es-MX', { month: 'long' });
        const comisionMes = comisionesEstado[mes];
        const cobrado = comisionMes?.cobrado === true;
        const fechaCobro = comisionMes?.fechaCobro ? new Date(comisionMes.fechaCobro).toLocaleString('es-MX') : '';

        html += `
        <div class="mb-8 bg-white rounded-xl shadow-lg p-6 transition hover:shadow-2xl">
            <h3 class="text-xl font-semibold text-indigo-600 mb-3 flex items-center gap-2">
                <span class="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                    ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${mes.split('-')[0]}
                </span>
            </h3>
            <div class="mb-2 flex flex-wrap gap-6">
                <div>
                    <span class="font-medium text-gray-700">Total rentas pagadas:</span>
                    <span class="text-lg font-bold text-gray-900">$${totalRentas.toFixed(2)}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-700">Comisión (10%):</span>
                    <span class="text-lg font-bold text-indigo-700">$${totalComision.toFixed(2)}</span>
                </div>
            </div>
            <div class="mb-2 flex items-center gap-3">
                <span class="font-medium text-gray-700">Estado:</span>
                <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${cobrado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${cobrado ? 'Cobrado' : 'No cobrado'}
                </span>
                <button class="marcar-cobrado ml-2 px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition"
                    data-mes="${mes}" data-cobrado="${cobrado}">
                    ${cobrado ? 'Desmarcar' : 'Marcar cobrado'}
                </button>
                ${cobrado && fechaCobro ? `<span class="ml-2 text-xs text-gray-500">(${fechaCobro})</span>` : ''}
            </div>
            <div class="mb-2">
                <span class="font-medium text-gray-700">Pagos incluidos:</span>
                <ul class="list-disc ml-8 mt-2 text-gray-600">
                    ${pagos.map(p => `<li class="mb-1">${new Date(p.fechaPago).toLocaleDateString('es-MX')} - <span class="font-semibold">$${p.monto.toFixed(2)}</span></li>`).join('')}
                </ul>
            </div>
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
    document.getElementById('filtroEstado').addEventListener('change', function() {
        filtroEstado = this.value;
        renderComisiones();
    });

    // 6. Asigna eventos a los botones de cobrado
    document.querySelectorAll('.marcar-cobrado').forEach(btn => {
        btn.addEventListener('click', async function() {
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
}

// Integración con el menú lateral
window.mostrarComisiones = function() {
    renderComisiones();
    if (typeof setActiveSection === 'function') setActiveSection('comisiones');
};
