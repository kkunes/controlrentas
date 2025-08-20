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
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const pagosSnap = await getDocs(collection(db, "pagos"));

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const pagosList = [];
        pagosSnap.forEach(doc => {
            pagosList.push(doc.data());
        });

        let mantenimientosList = [];
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = data.inmuebleId ? inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido' : 'N/A';

            // --- NUEVA LÓGICA ---
            // Buscar inquilino usando la colección de pagos como historial
            let nombreInquilino = "-";
            if (data.inmuebleId && data.fechaMantenimiento) {
                const fechaMantenimiento = new Date(data.fechaMantenimiento + "T00:00:00"); // Asegurar que se interprete como local
                const mesMantenimiento = fechaMantenimiento.toLocaleString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
                const anioMantenimiento = fechaMantenimiento.getFullYear();

                const pagoCorrespondiente = pagosList.find(p => 
                    p.inmuebleId === data.inmuebleId &&
                    p.mesCorrespondiente === mesMantenimiento &&
                    p.anioCorrespondiente === anioMantenimiento
                );

                if (pagoCorrespondiente && pagoCorrespondiente.inquilinoId) {
                    nombreInquilino = inquilinosMap.get(pagoCorrespondiente.inquilinoId) || "Inquilino no encontrado";
                }
            }
            // --- FIN NUEVA LÓGICA ---

            // Determinar quién pagó el mantenimiento
            let pagadoPor = "-";
            if (data.pagadoPor === "inquilino") pagadoPor = "Inquilino";
            else if (data.pagadoPor === "propietario") pagadoPor = "Propietario";
            else if (data.pagadoPor === "ambos") pagadoPor = "Ambos";

            mantenimientosList.push({ id: doc.id, ...data, nombreInmueble, nombreInquilino, pagadoPor });
        });

        // --- Filtros dinámicos ---
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);

        const inmueblesOptions = [...inmueblesMap.entries()].map(([id, nombre]) =>
            `<option value="${id}">${nombre}</option>`
        ).join('');
        const categorias = ["Fontanería", "Electricidad", "Pintura", "Jardinería", "Limpieza", "Reparación General", "Otros"];
        const categoriasOptions = categorias.map(cat =>
            `<option value="${cat}">${cat}</option>`
        ).join('');
        const estados = ["Pendiente", "En Progreso", "Completado", "Cancelado"];
        const estadosOptions = estados.map(est =>
            `<option value="${est}">${est}</option>`
        ).join('');
        const mesesOptions = meses.map((mes, idx) =>
            `<option value="${idx + 1}">${mes}</option>`
        ).join('');
        const aniosOptions = anos.map(year =>
            `<option value="${year}">${year}</option>`
        ).join('');

        // Filtros UI
        const filtrosHtml = `
            <div class="flex flex-wrap gap-4 mb-4 items-end">
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">Inmueble</label><select id="filtroInmueble" class="border border-gray-300 rounded-md px-2 py-1 bg-white"><option value="">Todos</option>${inmueblesOptions}</select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">Categoría</label><select id="filtroCategoria" class="border border-gray-300 rounded-md px-2 py-1 bg-white"><option value="">Todas</option>${categoriasOptions}</select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">Estado</label><select id="filtroEstado" class="border border-gray-300 rounded-md px-2 py-1 bg-white"><option value="">Todos</option>${estadosOptions}</select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">Mes</label><select id="filtroMes" class="border border-gray-300 rounded-md px-2 py-1 bg-white"><option value="">Todos</option>${mesesOptions}</select></div>
                <div><label class="block text-xs font-semibold text-gray-600 mb-1">Año</label><select id="filtroAnio" class="border border-gray-300 rounded-md px-2 py-1 bg-white"><option value="">Todos</option>${aniosOptions}</select></div>
                <button id="btnLimpiarFiltros" class="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-3 py-1 rounded-md shadow-sm transition-colors duration-200">Limpiar</button>
            </div>
        `;

        const btnNuevoHtml = `
            <div class="flex justify-start gap-3 mb-4">
                <button id="btnNuevoMantenimiento" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Registrar mantenimiento
                </button>
                <button id="btnDescargarPDFMantenimientos" class="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Descargar PDF
                </button>
            </div>
        `;

        contenedor.innerHTML = `
            <div id="total-mantenimientos-container" class="mb-6"></div>
            ${filtrosHtml}
            ${btnNuevoHtml}
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="w-full table-auto divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoría</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                                <th scope="col" class="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Pagado por</th>
                                <th scope="col" class="relative px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tbodyMantenimientos"></tbody>
                    </table>
                </div>
            </div>`;

        document.getElementById('btnNuevoMantenimiento').addEventListener('click', () => mostrarFormularioNuevoMantenimiento());
        document.getElementById('btnDescargarPDFMantenimientos').addEventListener('click', generarPDFMantenimientos);

        async function generarPDFMantenimientos() {
            const filtroInmueble = document.getElementById('filtroInmueble').value;
            const filtroCategoria = document.getElementById('filtroCategoria').value;
            const filtroEstado = document.getElementById('filtroEstado').value;
            const filtroMes = document.getElementById('filtroMes').value ? Number(document.getElementById('filtroMes').value) : null;
            const filtroAnio = document.getElementById('filtroAnio').value ? Number(document.getElementById('filtroAnio').value) : null;

            const filtrados = mantenimientosList.filter(m => {
                const fecha = m.fechaMantenimiento ? new Date(m.fechaMantenimiento + "T00:00:00") : null;
                const mes = fecha ? fecha.getMonth() + 1 : null;
                const anio = fecha ? fecha.getFullYear() : null;
                return (!filtroInmueble || m.inmuebleId === filtroInmueble) &&
                       (!filtroCategoria || m.categoria === filtroCategoria) &&
                       (!filtroEstado || m.estado === filtroEstado) &&
                       (!filtroMes || mes === filtroMes) &&
                       (!filtroAnio || anio === filtroAnio);
            });

            const totalCosto = filtrados.reduce((sum, m) => sum + (Number(m.costo) || 0), 0);

            const nombreMes = filtroMes ? meses[filtroMes - 1] : "Todos los meses";
            const anioReporte = filtroAnio || "Todos los años";
            const tituloReporte = `Reporte de Mantenimientos - ${nombreMes} ${anioReporte}`;

            let tablaHtml = '';
            if (filtrados.length === 0) {
                tablaHtml = `<p style="text-align: center; color: #6b7280; padding: 20px;">No hay mantenimientos que coincidan con los filtros para generar el reporte.</p>`;
            } else {
                filtrados.sort((a, b) => new Date(b.fechaMantenimiento) - new Date(a.fechaMantenimiento));
                tablaHtml = `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr style="background-color: #f3f4f6;">
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Inmueble</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Inquilino</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Descripción</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Costo</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Categoría</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Prioridad</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Estado</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Fecha</th>
                                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 10px;">Pagado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtrados.map(m => `
                                    <tr style="background-color: #ffffff;">
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.nombreInmueble}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.nombreInquilino}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.descripcion || 'Sin descripción'}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${(Number(m.costo) || 0).toFixed(2)}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.categoria || 'N/A'}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.prioridad || 'N/A'}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.estado || 'N/A'}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.fechaMantenimiento || 'N/A'}</td>
                                        <td style="padding: 8px; border: 1px solid #e5e7eb; font-size: 10px;">${m.pagadoPor}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            const pdfContent = `
                <div style="font-family: 'Arial', sans-serif; padding: 20px; background-color: #f8f9fa;">
                    <h1 style="text-align: center; color: #2c3e50; margin-bottom: 25px; font-size: 28px; font-weight: bold; padding-bottom: 10px; border-bottom: 2px solid #e9ecef;">${tituloReporte}</h1>
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <p style="font-size: 18px; color: #155724; margin: 0; font-weight: 600;">Costo Total de Mantenimientos (Filtrado):</p>
                        <p style="font-size: 32px; font-weight: bold; color: #28a745; margin: 10px 0 0;">${totalCosto.toFixed(2)} MXN</p>
                    </div>
                    <div style="border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #007bff; color: #ffffff;">
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Inmueble</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Inquilino</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Descripción</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Costo</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Categoría</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Prioridad</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Estado</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Fecha</th>
                                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; border-bottom: 1px solid #dee2e6;">Pagado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtrados.map((m, index) => `
                                    <tr style="background-color: ${index % 2 === 0 ? '#f2f2f2' : '#ffffff'};">
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.nombreInmueble}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.nombreInquilino}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.descripcion || 'Sin descripción'}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${(Number(m.costo) || 0).toFixed(2)}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.categoria || 'N/A'}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.prioridad || 'N/A'}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.estado || 'N/A'}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.fechaMantenimiento || 'N/A'}</td>
                                        <td style="padding: 10px 8px; border: 1px solid #dee2e6; font-size: 10px;">${m.pagadoPor}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            const opt = {
                margin:       0.5,
                filename:     `Reporte_Mantenimientos_${nombreMes}_${anioReporte}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, scrollY: 0, windowWidth: document.documentElement.offsetWidth },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'] }
            };

            html2pdf().from(pdfContent).set(opt).toPdf().get('pdf').then(function (pdf) {
                var totalPages = pdf.internal.getNumberOfPages();
                for (var i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(10);
                    pdf.setTextColor(150);
                    const text = `Página ${i} de ${totalPages}`;
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    pdf.text(text, pageWidth - 0.75, pageHeight - 0.5);
                }
            }).save();
        }

        function renderTablaMantenimientos() {
            const filtroInmueble = document.getElementById('filtroInmueble').value;
            const filtroCategoria = document.getElementById('filtroCategoria').value;
            const filtroEstado = document.getElementById('filtroEstado').value;
            const filtroMes = document.getElementById('filtroMes').value ? Number(document.getElementById('filtroMes').value) : null;
            const filtroAnio = document.getElementById('filtroAnio').value ? Number(document.getElementById('filtroAnio').value) : null;

            const filtrados = mantenimientosList.filter(m => {
                const fecha = m.fechaMantenimiento ? new Date(m.fechaMantenimiento + "T00:00:00") : null;
                const mes = fecha ? fecha.getMonth() + 1 : null;
                const anio = fecha ? fecha.getFullYear() : null;
                return (!filtroInmueble || m.inmuebleId === filtroInmueble) &&
                       (!filtroCategoria || m.categoria === filtroCategoria) &&
                       (!filtroEstado || m.estado === filtroEstado) &&
                       (!filtroMes || mes === filtroMes) &&
                       (!filtroAnio || anio === filtroAnio);
            });

            const totalContainer = document.getElementById('total-mantenimientos-container');
            if (totalContainer) {
                const totalCosto = filtrados.reduce((sum, m) => sum + (Number(m.costo) || 0), 0);
                totalContainer.innerHTML = `
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg text-center transition-all duration-300 transform hover:scale-105">
                        <p class="text-sm sm:text-base font-medium uppercase tracking-wider">Costo Total (Filtro Actual)</p>
                        <p class="text-2xl sm:text-3xl font-bold mt-1">${totalCosto.toFixed(2)} MXN</p>
                    </div>`;
            }

            const tbody = document.getElementById('tbodyMantenimientos');
            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-gray-500">No hay mantenimientos que coincidan con los filtros.</td></tr>`;
            } else {
                filtrados.sort((a, b) => new Date(b.fechaMantenimiento) - new Date(a.fechaMantenimiento));
                tbody.innerHTML = filtrados.map(m => {
                    let prioridadClass = "px-2 py-0.5 text-xs rounded-full font-semibold " + ({Urgente:"bg-red-100 text-red-800",Alta:"bg-orange-100 text-orange-800",Media:"bg-yellow-100 text-yellow-800",Baja:"bg-green-100 text-green-800"}[m.prioridad] || "bg-gray-100 text-gray-800");
                    let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold " + ({Pendiente:"bg-red-100 text-red-800","En Progreso":"bg-yellow-100 text-yellow-800",Completado:"bg-green-100 text-green-800",Cancelado:"bg-gray-100 text-gray-800"}[m.estado] || "bg-gray-100 text-gray-800");
                    return `
                        <tr class="hover:bg-gray-50 transition-colors duration-200">
                            <td class="px-3 py-2 text-sm text-gray-800">${m.nombreInmueble}</td>
                            <td class="px-3 py-2 text-sm text-gray-800">${m.nombreInquilino}</td>
                            <td class="px-3 py-2 text-sm text-gray-700 whitespace-normal max-w-xs">${m.descripcion || 'Sin descripción'}</td>
                            <td class="px-3 py-2 text-sm text-gray-800 font-medium">${(Number(m.costo) || 0).toFixed(2)}</td>
                            <td class="px-3 py-2 text-sm text-gray-700 hidden md:table-cell">${m.categoria || 'N/A'}</td>
                            <td class="px-3 py-2 text-sm"><span class="${prioridadClass}">${m.prioridad || 'N/A'}</span></td>
                            <td class="px-3 py-2 text-sm"><span class="${estadoClass}">${m.estado || 'N/A'}</span></td>
                            <td class="px-3 py-2 text-sm text-gray-700 hidden md:table-cell">${m.fechaMantenimiento || 'N/A'}</td>
                            <td class="px-3 py-2 text-sm text-gray-800 hidden lg:table-cell">${m.pagadoPor}</td>
                            <td class="px-3 py-2 text-sm text-right">
                                <div class="flex flex-wrap justify-end gap-1">
                                    <button onclick="editarMantenimiento('${m.id}')" class="btn-editar-mantenimiento bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1 rounded-md text-xs transition-all duration-200 flex items-center justify-center" data-id="${m.id}"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Editar</button>
                                    <button onclick="eliminarDocumento('mantenimientos', '${m.id}', mostrarMantenimientos)" class="btn-eliminar-mantenimiento bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded-md text-xs transition-all duration-200 flex items-center justify-center" data-id="${m.id}"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Eliminar</button>
                                </div>
                            </td>
                        </tr>`;
                }).join('');
            }
        }

        document.getElementById('filtroInmueble').addEventListener('change', renderTablaMantenimientos);
        document.getElementById('filtroCategoria').addEventListener('change', renderTablaMantenimientos);
        document.getElementById('filtroEstado').addEventListener('change', renderTablaMantenimientos);
        document.getElementById('filtroMes').addEventListener('change', renderTablaMantenimientos);
        document.getElementById('filtroAnio').addEventListener('change', renderTablaMantenimientos);
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            document.getElementById('filtroInmueble').value = "";
            document.getElementById('filtroCategoria').value = "";
            document.getElementById('filtroEstado').value = "";
            document.getElementById('filtroMes').value = "";
            document.getElementById('filtroAnio').value = "";
            renderTablaMantenimientos();
        });

        if (!document.getElementById('filtroMes').value && !document.getElementById('filtroAnio').value) {
            document.getElementById('filtroMes').value = mesActual;
            document.getElementById('filtroAnio').value = anioActual;
        }
        renderTablaMantenimientos();
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
        <option value="${inmueble.id}" ${mantenimiento?.inmuebleId === inmueble.id ? 'selected' : ''}>
            ${inmueble.nombre}
        </option>
    `).join('');

    const categorias = ["Fontanería", "Electricidad", "Pintura", "Jardinería", "Limpieza", "Reparación General", "Otros"];
    const categoriaOptions = categorias.map(cat => `
        <option value="${cat}" ${mantenimiento?.categoria === cat ? 'selected' : ''}>
            ${cat}
        </option>
    `).join('');

    const prioridades = ["Baja", "Media", "Alta", "Urgente"];
    const prioridadOptions = prioridades.map(prio => `
        <option value="${prio}" ${mantenimiento?.prioridad === prio ? 'selected' : ''}>
            ${prio}
        </option>
    `).join('');

    const estados = ["Pendiente", "En Progreso", "Completado", "Cancelado"];
    const estadoOptions = estados.map(est => `
        <option value="${est}" ${mantenimiento?.estado === est ? 'selected' : ''}>
            ${est}
        </option>
    `).join('');

    const modalContent = `
        <div class="relative">
            <!-- Botón X para cerrar -->
            <button type="button" onclick="ocultarModal()" 
                class="absolute top-2 right-2 z-20 bg-white/80 hover:bg-red-100 text-red-600 rounded-full p-2 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Cerrar">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            <div class="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-xl -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 sm:mb-6">
                <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
                    </svg>
                    ${tituloModal}
                </h3>
            </div>
            <form id="formMantenimiento" class="space-y-4 sm:space-y-6 px-4">
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label for="inmuebleId" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                                Inmueble
                            </label>
                            <select id="inmuebleId" name="inmuebleId" 
                                class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                                required>
                                <option value="">Selecciona un inmueble</option>
                                ${inmueblesOptions}
                            </select>
                        </div>
                        <div>
                            <label for="fechaMantenimiento" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                Fecha de Mantenimiento
                            </label>
                            <input type="date" id="fechaMantenimiento" name="fechaMantenimiento" 
                                class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                                value="${mantenimiento?.fechaMantenimiento ?? ''}" required>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div class="space-y-4">
                        <div>
                            <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                                </svg>
                                Descripción
                            </label>
                            <textarea id="descripcion" name="descripcion" rows="3" 
                                class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                                placeholder="Breve descripción del mantenimiento realizado." required>${mantenimiento?.descripcion ?? ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label for="costo" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Costo
                            </label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center text-gray-500">$</span>
                                <input type="number" id="costo" name="costo" step="0.01" 
                                    class="block w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                                    value="${mantenimiento?.costo ?? ''}" placeholder="0.00" required>
                            </div>
                        </div>
                        <div>
                            <label for="categoria" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                            Categoría
                        </label>
                        <select id="categoria" name="categoria" 
                            class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                            required>
                            <option value="">Selecciona una categoría</option>
                            ${categoriaOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                        <label for="prioridad" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            Prioridad
                        </label>
                        <select id="prioridad" name="prioridad" 
                            class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                            required>
                            <option value="">Selecciona una prioridad</option>
                            ${prioridadOptions}
                        </select>
                    </div>
                    <div>
                        <label for="estado" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Estado
                        </label>
                        <select id="estado" name="estado" 
                            class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" 
                            required>
                            <option value="">Selecciona un estado</option>
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                        <label for="pagadoPor" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            ¿Quién pagó el mantenimiento?
                        </label>
                        <select id="pagadoPor" name="pagadoPor" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <option value="">Selecciona</option>
                            <option value="inquilino" ${mantenimiento?.pagadoPor === "inquilino" ? "selected" : ""}>Inquilino</option>
                            <option value="propietario" ${mantenimiento?.pagadoPor === "propietario" ? "selected" : ""}>Propietario</option>
                            <option value="ambos" ${mantenimiento?.pagadoPor === "ambos" ? "selected" : ""}>Ambos</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button type="button" onclick="ocultarModal()" 
                    class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cancelar
                </button>
                <button type="submit" 
                    class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 
                    text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    ${id ? "Actualizar" : "Registrar"} Mantenimiento
                </button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    // Responsividad extra para el modal
    const modalStyle = document.createElement('style');
    modalStyle.innerHTML = `
    @media (max-width: 600px) {
        .modal-content, .swal2-popup {
            width: 98vw !important;
            min-width: 0 !important;
            max-width: 99vw !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
        }
        .modal-content form, .swal2-popup form {
            padding-left: 0 !important;
            padding-right: 0 !important;
        }
        .modal-content .rounded-xl, .swal2-popup .rounded-xl {
            border-radius: 0.5rem !important;
        }
    }
    @media (max-width: 400px) {
        .modal-content, .swal2-popup {
            width: 100vw !important;
            min-width: 0 !important;
            max-width: 100vw !important;
            padding: 0 !important;
        }
    }
    `;
    if (!document.getElementById('modal-mantenimientos-responsive-style')) {
        modalStyle.id = 'modal-mantenimientos-responsive-style';
        document.head.appendChild(modalStyle);
    }

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
            mostrarMantenimientos();
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
                <h3 class="text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    Historial de Mantenimientos
                </h3>
                <p class="text-center text-indigo-100 mt-1 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    Para: <span class="font-semibold">${inmuebleNombre}</span>
                </p>
            </div>

            <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl shadow-md mb-6 text-center border border-indigo-200">
                <p class="text-lg font-semibold text-indigo-700 flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Total de Costo de Mantenimientos:
                </p>
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
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
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

