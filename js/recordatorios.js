// js/recordatorios.js
import { collection, getDocs, query, where, updateDoc, doc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db, auth } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Verifica contratos próximos a renovar (cada 6 meses)
 * @returns {Promise<Array>} Lista de contratos próximos a renovar
 */
export async function verificarContratosProximosARenovar() {
    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const hoy = new Date();
        const diasAnticipacion = 15; // Avisar con 15 días de anticipación
        
        // Crear un mapa de inmuebles para buscar rápidamente por ID
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });
        
        let contratosProximosARenovar = [];
        
        inquilinosSnap.forEach(doc => {
            const inquilino = doc.data();
            
            // Solo considerar inquilinos activos con fecha de llegada
            if (inquilino.activo && inquilino.fechaLlegada) {
                // Obtener el nombre real del inmueble desde el mapa
                let nombreInmueble = "No especificado";
                if (inquilino.inmuebleAsociadoId && inmueblesMap.has(inquilino.inmuebleAsociadoId)) {
                    nombreInmueble = inmueblesMap.get(inquilino.inmuebleAsociadoId);
                }
                
                // Usar la fecha de última renovación si existe, de lo contrario usar la fecha de llegada
                const fechaBase = inquilino.ultimaRenovacion ? inquilino.ultimaRenovacion : inquilino.fechaLlegada;
                const fechaInicial = new Date(fechaBase);
                
                // Calcular próxima fecha de renovación (cada 6 meses desde la fecha base)
                let fechaRenovacion = new Date(fechaInicial);
                
                // Encontrar la próxima fecha de renovación
                while (fechaRenovacion <= hoy) {
                    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 6);
                }
                
                // Calcular días hasta la próxima renovación
                const diasHastaRenovacion = Math.ceil((fechaRenovacion - hoy) / (1000 * 60 * 60 * 24));
                
                // Si está dentro del período de anticipación, agregar a la lista
                if (diasHastaRenovacion <= diasAnticipacion) {
                    contratosProximosARenovar.push({
                        id: doc.id,
                        nombre: inquilino.nombre,
                        telefono: inquilino.telefono || 'No disponible',
                        inmuebleNombre: nombreInmueble,
                        inmuebleId: inquilino.inmuebleAsociadoId || null,
                        fechaLlegada: inquilino.fechaLlegada,
                        ultimaRenovacion: inquilino.ultimaRenovacion || null,
                        fechaRenovacion: fechaRenovacion.toISOString().split('T')[0],
                        diasRestantes: diasHastaRenovacion,
                        vencido: false
                    });
                }
                
                // Verificar si ya pasó la fecha de renovación (hasta 30 días después)
                const fechaRenovacionAnterior = new Date(fechaInicial);
                fechaRenovacionAnterior.setMonth(fechaRenovacionAnterior.getMonth() + 6);
                
                if (fechaRenovacionAnterior < hoy) {
                    const diasDesdeVencimiento = Math.ceil((hoy - fechaRenovacionAnterior) / (1000 * 60 * 60 * 24));
                    if (diasDesdeVencimiento <= 30) { // Si pasaron menos de 30 días desde que venció
                        contratosProximosARenovar.push({
                            id: doc.id,
                            nombre: inquilino.nombre,
                            telefono: inquilino.telefono || 'No disponible',
                            inmuebleNombre: nombreInmueble,
                            inmuebleId: inquilino.inmuebleAsociadoId || null,
                            fechaLlegada: inquilino.fechaLlegada,
                            ultimaRenovacion: inquilino.ultimaRenovacion || null,
                            fechaRenovacion: fechaRenovacionAnterior.toISOString().split('T')[0],
                            diasRestantes: -diasDesdeVencimiento, // Valor negativo indica que ya pasó la fecha
                            vencido: true
                        });
                    }
                }
            }
        });
        
        return contratosProximosARenovar;
    } catch (error) {
        console.error("Error al verificar contratos próximos a renovar:", error);
        return [];
    }
}

let recordatoriosYaMostrados = false;

export async function mostrarRecordatoriosRenovacion() {
    if (recordatoriosYaMostrados) {
        return; // Evitar ejecuciones múltiples
    }
    recordatoriosYaMostrados = true;

    const contratosProximos = await verificarContratosProximosARenovar();

    if (contratosProximos.length === 0) {
        return; // No hay contratos próximos a renovar
    }

    // Evitar duplicados si el contenedor ya existe
    if (document.getElementById('recordatorios-container')) {
        return;
    }

    // Crear elemento para mostrar recordatorios
    const recordatoriosContainer = document.createElement('div');
    recordatoriosContainer.id = 'recordatorios-container';
    recordatoriosContainer.className = 'fixed bottom-4 right-4 z-50 recordatorio-burbuja';

    // Crear botón de notificación con estilos mejorados
    const notificacionBtn = document.createElement('button');
    notificacionBtn.className = 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white p-3 rounded-full shadow-xl flex items-center justify-center relative transform hover:scale-110 transition-all duration-300 animate-pulse-slow';
    notificacionBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">${contratosProximos.length}</span>
    `;

    // Agregar evento para mostrar detalles
    notificacionBtn.addEventListener('click', () => {
        notificacionBtn.classList.remove('animate-pulse-slow');
        mostrarDetallesRenovacion(contratosProximos);
    });

    recordatoriosContainer.appendChild(notificacionBtn);
    document.body.appendChild(recordatoriosContainer);

    // Forzar reflow para la animación de entrada
    requestAnimationFrame(() => {
        recordatoriosContainer.classList.add('show');
    });

    // Si el usuario hace clic, la burbuja ya no necesita pulsar
    notificacionBtn.addEventListener('click', () => {
        notificacionBtn.classList.remove('animate-pulse-slow');
    });

    // Mostrar notificación inicial tipo toast
    mostrarNotificacion(`Hay ${contratosProximos.length} contrato(s) próximo(s) a renovar`, 'warning', 5000);
}

/**
 * Muestra los detalles de los contratos próximos a renovar
 * @param {Array} contratos - Lista de contratos próximos a renovar
 */
export function mostrarDetallesRenovacion(contratos) {
    // Ordenar por días restantes (más urgentes primero)
    contratos.sort((a, b) => a.diasRestantes - b.diasRestantes);
    
    let contenidoHTML = `
        <div class="px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative modal-header-responsive">
            <button id="btnCerrarModal" class="absolute top-3 right-3 text-white hover:text-yellow-200 transition-colors duration-200 focus:outline-none">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 class="text-2xl font-bold text-center modal-title-responsive">Contratos Próximos a Renovar</h3>
            <p class="text-center text-yellow-100 mt-1">Se renuevan cada 6 meses</p>
        </div>
        
        <div class="space-y-4 max-h-[60vh] overflow-y-auto px-2 modal-responsive-padding">
    `;
    
    contratos.forEach(contrato => {
        // Determinar color según urgencia
        let colorBorde = 'border-yellow-300';
        let colorBg = 'bg-yellow-50';
        let textoUrgencia = 'Próximamente';
        
        // Verificar si el contrato ya está vencido
        if (contrato.vencido) {
            colorBorde = 'border-purple-400';
            colorBg = 'bg-purple-50';
            textoUrgencia = 'Vencido';
        } else if (contrato.diasRestantes <= 5) {
            colorBorde = 'border-red-300';
            colorBg = 'bg-red-50';
            textoUrgencia = 'Urgente';
        } else if (contrato.diasRestantes <= 10) {
            colorBorde = 'border-orange-300';
            colorBg = 'bg-orange-50';
            textoUrgencia = 'Pronto';
        }
        
        // Texto para mostrar los días
        let textoTiempo = '';
        if (contrato.vencido) {
            const diasAtraso = Math.abs(contrato.diasRestantes);
            textoTiempo = `Vencido hace ${diasAtraso} día${diasAtraso !== 1 ? 's' : ''}`;
        } else {
            textoTiempo = `${textoUrgencia} - ${contrato.diasRestantes} día${contrato.diasRestantes !== 1 ? 's' : ''}`;
        }
        
        contenidoHTML += `
            <div class="border-l-4 ${colorBorde} ${colorBg} p-4 rounded-r-lg shadow-sm">
                <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800">${contrato.nombre}</h4>
                        <p class="text-sm text-gray-600">Inmueble: ${contrato.inmuebleNombre}</p>
                        <p class="text-sm text-gray-600">Teléfono: ${contrato.telefono}</p>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-sm font-medium text-gray-700">Renovación: ${formatearFecha(contrato.fechaRenovacion)}</span>
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${contrato.vencido ? 'bg-purple-100 text-purple-800' : contrato.diasRestantes <= 5 ? 'bg-red-100 text-red-800' : contrato.diasRestantes <= 10 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${textoTiempo}
                        </span>
                    </div>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                    <button class="btn-marcar-renovado px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-md shadow-sm transition-colors duration-200" 
                            data-inquilino-id="${contrato.id}">
                        Marcar como Renovado
                    </button>
                    <button class="btn-recordatorio px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md shadow-sm transition-colors duration-200"
                            data-inquilino-id="${contrato.id}">
                        Enviar Recordatorio
                    </button>
                </div>
            </div>
        `;
    });
    
    contenidoHTML += `
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button type="button" onclick="ocultarModal()" 
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                Cerrar
            </button>
        </div>
    `;
    
    mostrarModal(contenidoHTML);
    
    // Agregar event listeners a los botones
    document.getElementById('btnCerrarModal').addEventListener('click', ocultarModal);
    
    document.querySelectorAll('.btn-marcar-renovado').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const inquilinoId = e.currentTarget.dataset.inquilinoId;
            await marcarContratoRenovado(inquilinoId);
            // Remover este contrato de la lista
            e.currentTarget.closest('.border-l-4').remove();
            
            // Si no quedan contratos, cerrar el modal
            if (document.querySelectorAll('.border-l-4').length === 0) {
                ocultarModal();
                // También eliminar el botón de notificación
                const recordatoriosContainer = document.getElementById('recordatorios-container');
                if (recordatoriosContainer) {
                    recordatoriosContainer.remove();
                }
            }
        });
    });
    
    document.querySelectorAll('.btn-recordatorio').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inquilinoId = e.currentTarget.dataset.inquilinoId;
            const contrato = contratos.find(c => c.id === inquilinoId);
            if (contrato) {
                enviarRecordatorio(contrato);
            }
        });
    });
}

/**
 * Marca un contrato como renovado
 * @param {string} inquilinoId - ID del inquilino
 */
async function marcarContratoRenovado(inquilinoId) {
    try {
        // Obtener la fecha actual
        const hoy = new Date();
        const fechaRenovacion = hoy.toISOString().split('T')[0];
        
        // Obtener los datos actuales del inquilino
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        if (!inquilinoDoc.exists()) {
            throw new Error("Inquilino no encontrado");
        }
        
        // Actualizar solo la fecha de última renovación, manteniendo la fecha de llegada original
        await updateDoc(doc(db, "inquilinos", inquilinoId), {
            ultimaRenovacion: fechaRenovacion
        });
        
        mostrarNotificacion("Contrato marcado como renovado. Próxima renovación en 6 meses.", "success");
    } catch (error) {
        console.error("Error al marcar contrato como renovado:", error);
        mostrarNotificacion("Error al marcar contrato como renovado", "error");
    }
}

/**
 * Envía un recordatorio al inquilino mediante WhatsApp o SMS
 * @param {Object} contrato - Datos del contrato
 */
function enviarRecordatorio(contrato) {
    // Verificar si hay un número de teléfono válido
    if (!contrato.telefono || contrato.telefono === 'No disponible') {
        mostrarNotificacion(`No se puede enviar recordatorio: Teléfono no disponible`, "error");
        return;
    }
    
    // Formatear la fecha de renovación para el mensaje
    const fechaRenovacion = formatearFecha(contrato.fechaRenovacion);
    
    // Obtener el nombre del inmueble (asegurarse de que no sea 'No especificado')
    const nombreInmueble = contrato.inmuebleNombre && contrato.inmuebleNombre !== 'No especificado' 
        ? contrato.inmuebleNombre 
        : 'su propiedad rentada';
    
    // Crear el mensaje de recordatorio
    let mensaje = `Recordatorio: Su contrato de arrendamiento para ${nombreInmueble} vence el ${fechaRenovacion}. Por favor, contáctenos para renovarlo.`;
    
    // Limpiar el número de teléfono (eliminar espacios, guiones, etc.)
    const telefono = contrato.telefono.replace(/[\s-()]/g, '');
    
    // Opciones para enviar el recordatorio
    mostrarModal(`
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Enviar Recordatorio</h3>
        </div>
        <div class="py-4">
            <p class="text-gray-700 mb-4">Seleccione cómo desea enviar el recordatorio a <strong>${contrato.nombre}</strong>:</p>
            
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="font-medium text-gray-800 mb-2">Mensaje a enviar:</h4>
                    <textarea id="mensaje-recordatorio" class="w-full border border-gray-300 rounded-md p-2 text-sm" rows="3">${mensaje}</textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button id="btn-whatsapp" class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Enviar por WhatsApp
                    </button>
                    
                    <button id="btn-sms" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg shadow-sm transition-colors duration-200 flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Enviar por SMS
                    </button>
                </div>
                
                <div class="text-center text-sm text-gray-500 mt-2">
                    <p>Teléfono: ${contrato.telefono}</p>
                </div>
            </div>
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200 gap-3">
            <button type="button" id="btn-cancelar" 
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                Cancelar
            </button>
        </div>
    `);
    
    // Agregar event listeners a los botones
    document.getElementById('btn-cancelar').addEventListener('click', ocultarModal);
    
    document.getElementById('btn-whatsapp').addEventListener('click', () => {
        const mensajePersonalizado = document.getElementById('mensaje-recordatorio').value;
        const mensajeCodificado = encodeURIComponent(mensajePersonalizado);
        const whatsappUrl = `https://wa.me/${telefono}?text=${mensajeCodificado}`;
        
        // Registrar el envío en la base de datos
        registrarRecordatorioEnviado(contrato.id, 'whatsapp', mensajePersonalizado);
        
        // Abrir WhatsApp en una nueva pestaña
        window.open(whatsappUrl, '_blank');
        
        // Mostrar confirmación
        mostrarConfirmacionEnvio(contrato.nombre, 'WhatsApp');
    });
    
    document.getElementById('btn-sms').addEventListener('click', () => {
        const mensajePersonalizado = document.getElementById('mensaje-recordatorio').value;
        const smsUrl = `sms:${telefono}?body=${encodeURIComponent(mensajePersonalizado)}`;
        
        // Registrar el envío en la base de datos
        registrarRecordatorioEnviado(contrato.id, 'sms', mensajePersonalizado);
        
        // Abrir la aplicación de SMS
        window.open(smsUrl, '_blank');
        
        // Mostrar confirmación
        mostrarConfirmacionEnvio(contrato.nombre, 'SMS');
    });
}

/**
 * Registra el envío de un recordatorio en la base de datos
 * @param {string} inquilinoId - ID del inquilino
 * @param {string} tipo - Tipo de recordatorio (whatsapp, sms)
 * @param {string} mensaje - Mensaje enviado
 */
async function registrarRecordatorioEnviado(inquilinoId, tipo, mensaje) {
    try {
        // Obtener la fecha actual
        const hoy = new Date();
        const fechaEnvio = hoy.toISOString().split('T')[0];
        const horaEnvio = hoy.toTimeString().split(' ')[0];
        
        // Crear un nuevo documento en la colección de recordatorios
        await addDoc(collection(db, "recordatorios"), {
            inquilinoId: inquilinoId,
            tipo: tipo,
            mensaje: mensaje,
            fechaEnvio: fechaEnvio,
            horaEnvio: horaEnvio,
            usuarioEnvio: auth.currentUser ? auth.currentUser.displayName || auth.currentUser.email : 'Usuario desconocido'
        });
        
        // Actualizar el inquilino con la fecha del último recordatorio
        await updateDoc(doc(db, "inquilinos", inquilinoId), {
            ultimoRecordatorio: fechaEnvio
        });
        
    } catch (error) {
        console.error("Error al registrar recordatorio:", error);
    }
}

/**
 * Muestra una confirmación de envío de recordatorio
 * @param {string} nombre - Nombre del inquilino
 * @param {string} medio - Medio de envío (WhatsApp, SMS)
 */
function mostrarConfirmacionEnvio(nombre, medio) {
    mostrarModal(`
        <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Recordatorio Enviado</h3>
        </div>
        <div class="py-4 text-center">
            <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="text-lg text-gray-800 font-medium">Recordatorio enviado correctamente</p>
            <p class="text-gray-600 mt-2">Se ha enviado un recordatorio a ${nombre} por ${medio}.</p>
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button type="button" onclick="ocultarModal()" 
                class="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                Aceptar
            </button>
        </div>
    `);
    
    // Mostrar notificación
    mostrarNotificacion(`Recordatorio enviado a ${nombre} por ${medio}`, "success");
}

/**
 * Formatea una fecha en formato YYYY-MM-DD a DD/MM/YYYY
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatearFecha(fecha) {
    if (!fecha) return '';
    const partes = fecha.split('-');
    if (partes.length !== 3) return fecha;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}