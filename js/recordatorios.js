// js/recordatorios.js
import { collection, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Verifica contratos próximos a renovar (cada 6 meses)
 * @returns {Promise<Array>} Lista de contratos próximos a renovar
 */
export async function verificarContratosProximosARenovar() {
    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const hoy = new Date();
        const diasAnticipacion = 15; // Avisar con 15 días de anticipación
        
        let contratosProximosARenovar = [];
        
        inquilinosSnap.forEach(doc => {
            const inquilino = doc.data();
            
            // Solo considerar inquilinos activos con fecha de llegada
            if (inquilino.activo && inquilino.fechaLlegada) {
                const fechaLlegada = new Date(inquilino.fechaLlegada);
                
                // Calcular próxima fecha de renovación (cada 6 meses)
                let fechaRenovacion = new Date(fechaLlegada);
                
                // Encontrar la próxima fecha de renovación
                while (fechaRenovacion <= hoy) {
                    fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 6);
                }
                
                // Calcular días hasta la renovación
                const diasHastaRenovacion = Math.ceil((fechaRenovacion - hoy) / (1000 * 60 * 60 * 24));
                
                // Si está dentro del período de anticipación, agregar a la lista
                if (diasHastaRenovacion <= diasAnticipacion) {
                    contratosProximosARenovar.push({
                        id: doc.id,
                        nombre: inquilino.nombre,
                        telefono: inquilino.telefono || 'No disponible',
                        inmuebleNombre: inquilino.nombreInmueble || 'No especificado',
                        inmuebleId: inquilino.inmuebleAsociadoId || null,
                        fechaLlegada: inquilino.fechaLlegada,
                        fechaRenovacion: fechaRenovacion.toISOString().split('T')[0],
                        diasRestantes: diasHastaRenovacion
                    });
                }
            }
        });
        
        return contratosProximosARenovar;
    } catch (error) {
        console.error("Error al verificar contratos próximos a renovar:", error);
        return [];
    }
}

/**
 * Muestra los recordatorios de renovación de contratos en el dashboard
 */
export async function mostrarRecordatoriosRenovacion() {
    const contratosProximos = await verificarContratosProximosARenovar();
    
    if (contratosProximos.length === 0) {
        return; // No hay contratos próximos a renovar
    }
    
    // Crear elemento para mostrar recordatorios
    const recordatoriosContainer = document.createElement('div');
    recordatoriosContainer.id = 'recordatorios-container';
    recordatoriosContainer.className = 'fixed bottom-4 right-4 z-50';
    
    // Crear botón de notificación
    const notificacionBtn = document.createElement('button');
    notificacionBtn.className = 'bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center relative';
    notificacionBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">${contratosProximos.length}</span>
    `;
    
    // Agregar evento para mostrar detalles
    notificacionBtn.addEventListener('click', () => {
        mostrarDetallesRenovacion(contratosProximos);
    });
    
    recordatoriosContainer.appendChild(notificacionBtn);
    document.body.appendChild(recordatoriosContainer);
    
    // Mostrar notificación inicial
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
        <div class="px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative">
            <button id="btnCerrarModal" class="absolute top-3 right-3 text-white hover:text-yellow-200 transition-colors duration-200 focus:outline-none">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 class="text-2xl font-bold text-center">Contratos Próximos a Renovar</h3>
            <p class="text-center text-yellow-100 mt-1">Se renuevan cada 6 meses</p>
        </div>
        
        <div class="space-y-4 max-h-[60vh] overflow-y-auto px-2">
    `;
    
    contratos.forEach(contrato => {
        // Determinar color según urgencia
        let colorBorde = 'border-yellow-300';
        let colorBg = 'bg-yellow-50';
        let textoUrgencia = 'Próximamente';
        
        if (contrato.diasRestantes <= 5) {
            colorBorde = 'border-red-300';
            colorBg = 'bg-red-50';
            textoUrgencia = 'Urgente';
        } else if (contrato.diasRestantes <= 10) {
            colorBorde = 'border-orange-300';
            colorBg = 'bg-orange-50';
            textoUrgencia = 'Pronto';
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
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${contrato.diasRestantes <= 5 ? 'bg-red-100 text-red-800' : contrato.diasRestantes <= 10 ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${textoUrgencia} - ${contrato.diasRestantes} día${contrato.diasRestantes !== 1 ? 's' : ''}
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
        
        // Actualizar la fecha de llegada (que es la fecha del contrato)
        await updateDoc(doc(db, "inquilinos", inquilinoId), {
            fechaLlegada: fechaRenovacion,
            ultimaRenovacion: fechaRenovacion
        });
        
        mostrarNotificacion("Contrato marcado como renovado", "success");
    } catch (error) {
        console.error("Error al marcar contrato como renovado:", error);
        mostrarNotificacion("Error al marcar contrato como renovado", "error");
    }
}

/**
 * Simula el envío de un recordatorio al inquilino
 * @param {Object} contrato - Datos del contrato
 */
function enviarRecordatorio(contrato) {
    // Aquí podrías integrar con un servicio de mensajería o email
    // Por ahora, solo mostramos una notificación
    mostrarNotificacion(`Recordatorio enviado a ${contrato.nombre}`, "success");
    
    // Mostrar un modal de confirmación
    mostrarModal(`
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Recordatorio Enviado</h3>
        </div>
        <div class="py-4 text-center">
            <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="text-lg text-gray-800 font-medium">Recordatorio enviado correctamente</p>
            <p class="text-gray-600 mt-2">Se ha enviado un recordatorio a ${contrato.nombre} sobre la renovación de su contrato.</p>
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button type="button" onclick="ocultarModal()" 
                class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                Aceptar
            </button>
        </div>
    `);
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