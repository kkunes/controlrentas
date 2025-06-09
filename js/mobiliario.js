import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra el inventario de mobiliario.
 */
export async function mostrarInventarioMobiliario() {
    try {
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        let mobiliarioList = [];
        mobiliarioSnap.forEach(doc => {
            mobiliarioList.push({ id: doc.id, ...doc.data() });
        });

        let html = `<h2 class="text-2xl font-semibold mb-4">Inventario de Mobiliario</h2>
        <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mb-4" onclick="mostrarFormularioNuevoMueble()">Agregar Mobiliario</button>
        <div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-2">Nombre</th>
                    <th class="px-4 py-2">Descripción</th>
                    <th class="px-4 py-2">Costo Renta</th>
                    <th class="px-4 py-2">Estado</th>
                    <th class="px-4 py-2">Asignado a</th>
                    <th class="px-4 py-2">Cantidad</th>
                    <th class="px-4 py-2">Asignados</th>
                    <th class="px-4 py-2">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${mobiliarioList.map(mob => `
                    <tr>
                        <td class="px-4 py-2">${mob.nombre}</td>
                        <td class="px-4 py-2">${mob.descripcion || ''}</td>
                        <td class="px-4 py-2">$${(mob.costoRenta || 0).toFixed(2)}</td>
                        <td class="px-4 py-2">${mob.estado}</td>
                        <td class="px-4 py-2">${mob.asignadoA || '-'}</td>
                        <td class="px-4 py-2">${mob.cantidad || 0}</td>
                        <td class="px-4 py-2">${mob.cantidadAsignada || 0}</td>
                        <td class="px-4 py-2">
                            <button class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs" onclick="editarMueble('${mob.id}')">Editar</button>
                            <button class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" onclick="eliminarMueble('${mob.id}')">Eliminar</button>
                            ${mob.estado === 'disponible'
                                ? `<button class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs" onclick="asignarMueble('${mob.id}')">Asignar</button>`
                                : `<button class="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs" onclick="desasignarMueble('${mob.id}')">Desasignar</button>`
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table></div>`;
        document.getElementById("contenido").innerHTML = html;
    } catch (error) {
        mostrarNotificacion("Error al cargar el inventario de mobiliario.", "error");
    }
}

/**
 * Muestra el formulario para agregar un nuevo mueble.
 */
export function mostrarFormularioNuevoMueble() {
    const formHtml = `
        <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-2xl font-bold text-center">Agregar Mobiliario</h3>
        </div>
        <form id="formNuevoMueble" class="space-y-5 px-2">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input type="text" id="nombreMueble" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <input type="text" id="descripcionMueble" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Costo de Renta</label>
                <input type="number" id="costoRentaMueble" min="0" step="0.01" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                <input type="number" id="cantidadMueble" min="1" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm">Cancelar</button>
                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md shadow-md">Guardar</button>
            </div>
        </form>
    `;
    mostrarModal(formHtml);

    document.getElementById('formNuevoMueble').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreMueble').value.trim();
        const descripcion = document.getElementById('descripcionMueble').value.trim();
        const costoRenta = parseFloat(document.getElementById('costoRentaMueble').value);
        try {
            // Al agregar mobiliario
            await addDoc(collection(db, "mobiliario"), {
                nombre,
                descripcion,
                costoRenta,
                cantidad: parseInt(document.getElementById('cantidadMueble').value, 10),
                cantidadAsignada: 0,
                estado: "disponible",
                asignadoA: null,
                fechaAsignacion: null
            });
            mostrarNotificacion("Mobiliario agregado correctamente.", "success");
            ocultarModal();
            mostrarInventarioMobiliario();
        } catch (error) {
            mostrarNotificacion("Error al agregar mobiliario.", "error");
        }
    });
}

/**
 * Editar mobiliario.
 */
window.editarMueble = async function(id) {
    const muebleDoc = await getDoc(doc(db, "mobiliario", id));
    if (!muebleDoc.exists()) {
        mostrarNotificacion("Mobiliario no encontrado.", "error");
        return;
    }
    const mueble = muebleDoc.data();
    const formHtml = `
        <div class="px-4 py-3 bg-yellow-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-2xl font-bold text-center">Editar Mobiliario</h3>
        </div>
        <form id="formEditarMueble" class="space-y-5 px-2">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input type="text" id="nombreMuebleEdit" value="${mueble.nombre}" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <input type="text" id="descripcionMuebleEdit" value="${mueble.descripcion || ''}" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Costo de Renta</label>
                <input type="number" id="costoRentaMuebleEdit" value="${mueble.costoRenta}" min="0" step="0.01" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                <input type="number" id="cantidadMuebleEdit" value="${mueble.cantidad || 1}" min="1" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm">Cancelar</button>
                <button type="submit" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-2 rounded-md shadow-md">Actualizar</button>
            </div>
        </form>
    `;
    mostrarModal(formHtml);

    document.getElementById('formEditarMueble').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreMuebleEdit').value.trim();
        const descripcion = document.getElementById('descripcionMuebleEdit').value.trim();
        const costoRenta = parseFloat(document.getElementById('costoRentaMuebleEdit').value);
        try {
            await updateDoc(doc(db, "mobiliario", id), {
                nombre,
                descripcion,
                costoRenta
            });
            mostrarNotificacion("Mobiliario actualizado correctamente.", "success");
            ocultarModal();
            mostrarInventarioMobiliario();
        } catch (error) {
            mostrarNotificacion("Error al actualizar mobiliario.", "error");
        }
    });
};

/**
 * Elimina un mueble del inventario.
 */
export async function eliminarMueble(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este mobiliario?")) {
        try {
            await deleteDoc(doc(db, "mobiliario", id));
            mostrarNotificacion("Mobiliario eliminado correctamente.", "success");
            mostrarInventarioMobiliario();
        } catch (error) {
            mostrarNotificacion("Error al eliminar mobiliario.", "error");
        }
    }
}

/**
 * Asignar mobiliario a un inquilino.
 * (Aquí deberías mostrar un selector de inquilinos activos)
 */
window.asignarMueble = async function(id) {
    // Trae la lista de inquilinos activos
    const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
    const inquilinos = [];
    inquilinosSnap.forEach(doc => {
        const data = doc.data();
        if (data.activo === true || data.activo === "true") {
            inquilinos.push({ id: doc.id, ...data });
        }
    });

    if (inquilinos.length === 0) {
        mostrarNotificacion("No hay inquilinos activos para asignar.", "error");
        return;
    }

    // Trae el mueble para saber cuántos quedan disponibles
    const muebleDoc = await getDoc(doc(db, "mobiliario", id));
    const mueble = muebleDoc.data();
    const disponibles = (mueble.cantidad || 0) - (mueble.cantidadAsignada || 0);

    if (disponibles <= 0) {
        mostrarNotificacion("No hay unidades disponibles para asignar.", "error");
        return;
    }

    // Genera el selector de inquilinos y cantidad
    const selectHtml = `
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-xl font-bold text-center">Asignar Mobiliario</h3>
        </div>
        <form id="formAsignarMueble" class="space-y-5 px-2">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Selecciona un inquilino</label>
                <select id="inquilinoAsignar" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                    <option value="">Selecciona...</option>
                    ${inquilinos.map(inq => `<option value="${inq.id}">${inq.nombre} (${inq.correo || inq.telefono || ''})</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a asignar (disponibles: ${disponibles})</label>
                <input type="number" id="cantidadAsignar" min="1" max="${disponibles}" value="1" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
            <div class="flex justify-end space-x-3 mt-8">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm">Cancelar</button>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-md shadow-md">Asignar</button>
            </div>
        </form>
    `;
    mostrarModal(selectHtml);

    document.getElementById('formAsignarMueble').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inquilinoId = document.getElementById('inquilinoAsignar').value;
        const cantidad = parseInt(document.getElementById('cantidadAsignar').value, 10);

        if (!inquilinoId || cantidad < 1 || cantidad > disponibles) return;

        // Prepara el array de asignaciones
        let asignaciones = Array.isArray(mueble.asignaciones) ? mueble.asignaciones : [];
        // Busca si ya hay asignación para ese inquilino
        const idx = asignaciones.findIndex(a => a.inquilinoId === inquilinoId);
        if (idx >= 0) {
            asignaciones[idx].cantidad += cantidad;
            asignaciones[idx].fechaAsignacion = new Date().toISOString();
        } else {
            asignaciones.push({
                inquilinoId,
                cantidad,
                fechaAsignacion: new Date().toISOString()
            });
        }

        try {
            await updateDoc(doc(db, "mobiliario", id), {
                cantidadAsignada: (mueble.cantidadAsignada || 0) + cantidad,
                estado: (mueble.cantidadAsignada + cantidad) >= mueble.cantidad ? "asignado" : "disponible",
                asignaciones
            });
            mostrarNotificacion("Mobiliario asignado correctamente.", "success");
            ocultarModal();
            mostrarInventarioMobiliario();
        } catch (error) {
            mostrarNotificacion("Error al asignar mobiliario.", "error");
        }
    });
};

/**
 * Desasignar mobiliario.
 */
window.desasignarMueble = async function(id) {
    if (!confirm("¿Desasignar este mobiliario?")) return;
    try {
        await updateDoc(doc(db, "mobiliario", id), {
            estado: "disponible",
            asignadoA: null,
            fechaAsignacion: null
        });
        mostrarNotificacion("Mobiliario desasignado correctamente.", "success");
        mostrarInventarioMobiliario();
    } catch (error) {
        mostrarNotificacion("Error al desasignar mobiliario.", "error");
    }
};

window.mostrarInventarioMobiliario = mostrarInventarioMobiliario;
window.mostrarFormularioNuevoMueble = mostrarFormularioNuevoMueble;
window.eliminarMueble = eliminarMueble;