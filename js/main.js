// js/main.js
import { db, auth } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { mostrarDashboard } from './dashboard.js';
import { verificarContratosProximosARenovar, mostrarDetallesRenovacion } from './recordatorios.js';
// Asegúrate de que eliminarDocumento se importa con un alias de cada módulo
import { mostrarInmuebles, mostrarFormularioNuevoInmueble, editarInmueble, eliminarDocumento as eliminarInmuebleDoc, mostrarHistorialInquilinos } from './inmuebles.js';
import { mostrarInquilinos, mostrarFormularioNuevoInquilino, editarInquilino, confirmarDesocupacionInquilino, confirmarReactivacionInquilino, eliminarDocumento as eliminarInquilinoDoc, mostrarHistorialAbonosInquilino, mostrarSaldoFavorInquilino } from './inquilinos.js';
import { mostrarPagos, mostrarFormularioNuevoPago, editarPago, mostrarFormularioRegistrarAbono, revisarPagosVencidos, mostrarHistorialPagosInmueble, eliminarDocumento as eliminarPagoDoc, mostrarHistorialPagosInquilino } from './pagos.js'; // Added mostrarHistorialPagosInquilino import
import { mostrarMantenimientos, mostrarFormularioNuevoMantenimiento, editarMantenimiento, mostrarHistorialMantenimientoInmueble, eliminarDocumento as eliminarMantenimientoDoc, cambiarEstadoCosto } from './mantenimientos.js';
import { mostrarInventarioMobiliario, mostrarFormularioNuevoMueble, eliminarMueble } from './mobiliario.js';
import { mostrarReportes } from './reportes.js';
import { mostrarAbonos, mostrarFormularioNuevoAbono, editarAbono, eliminarAbono, aplicarSaldoFavorManual } from './abonos.js';
import { mostrarDesperfectos, mostrarFormularioNuevoDesperfecto, mostrarTotalDesperfectosInquilino } from './desperfectos.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { renderComisiones } from './comision.js';
import { collection, doc, setDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// ---- Hacemos que las funciones de los módulos estén disponibles en el objeto 'window' ----
// Esto permite que estas funciones sean llamadas directamente desde el HTML (ej. onclick="mostrarDashboard()")

// Funciones principales de navegación
window.mostrarDashboard = mostrarDashboard;
window.mostrarInmuebles = mostrarInmuebles;
window.mostrarInquilinos = mostrarInquilinos;
window.mostrarPagos = mostrarPagos;
window.mostrarMantenimientos = mostrarMantenimientos;
window.mostrarInventarioMobiliario = mostrarInventarioMobiliario;
window.mostrarReportes = mostrarReportes;
window.mostrarAbonos = mostrarAbonos;
window.mostrarDesperfectos = mostrarDesperfectos;

// Funciones específicas de Desperfectos
window.mostrarFormularioNuevoDesperfecto = mostrarFormularioNuevoDesperfecto;
window.editarDesperfecto = editarDesperfecto;
window.mostrarTotalDesperfectosInquilino = mostrarTotalDesperfectosInquilino;

// Funciones específicas de Inmuebles
window.mostrarFormularioNuevoInmueble = mostrarFormularioNuevoInmueble;
window.editarInmueble = editarInmueble;

// Funciones específicas de Inquilinos
window.mostrarFormularioNuevoInquilino = mostrarFormularioNuevoInquilino;
window.editarInquilino = editarInquilino;
window.confirmarDesocupacionInquilino = confirmarDesocupacionInquilino;
window.confirmarReactivacionInquilino = confirmarReactivacionInquilino;
window.mostrarHistorialPagosInquilino = mostrarHistorialPagosInquilino; // Added this line
window.mostrarHistorialAbonosInquilino = mostrarHistorialAbonosInquilino;
window.mostrarSaldoFavorInquilino = mostrarSaldoFavorInquilino;

// Funciones específicas de Pagos
window.mostrarFormularioNuevoPago = mostrarFormularioNuevoPago;
window.editarPago = editarPago;
// window.mostrarHistorialPagosInquilino = mostrarHistorialPagosInquilino; // This was already here, but ensures it's correct
window.mostrarFormularioRegistrarAbono = mostrarFormularioRegistrarAbono;
window.revisarPagosVencidos = revisarPagosVencidos;
window.mostrarHistorialPagosInmueble = mostrarHistorialPagosInmueble;

// Funciones específicas de Mantenimientos
window.mostrarFormularioNuevoMantenimiento = mostrarFormularioNuevoMantenimiento;
window.editarMantenimiento = editarMantenimiento;
window.mostrarHistorialMantenimientoInmueble = mostrarHistorialMantenimientoInmueble;
window.cambiarEstadoCosto = cambiarEstadoCosto;

// Funciones específicas de Mobiliario
window.mostrarInventarioMobiliario = mostrarInventarioMobiliario;
window.mostrarFormularioNuevoMueble = mostrarFormularioNuevoMueble;
window.eliminarMueble = eliminarMueble;

// Funciones específicas de Abonos/Saldos a Favor
window.mostrarFormularioNuevoAbono = mostrarFormularioNuevoAbono;
window.editarAbono = editarAbono;
window.eliminarAbono = eliminarAbono;
window.aplicarSaldoFavorManual = aplicarSaldoFavorManual;

// Funciones de UI generales
window.mostrarModal = mostrarModal;
window.ocultarModal = ocultarModal;
window.mostrarNotificacion = mostrarNotificacion;
window.mostrarLoader = () => document.getElementById('loader').classList.remove('hidden');
window.ocultarLoader = () => document.getElementById('loader').classList.add('hidden');

// Funciones de recordatorios de renovación de contratos
window.verificarContratosProximosARenovar = verificarContratosProximosARenovar;
window.mostrarDetallesRenovacion = mostrarDetallesRenovacion;
window.mostrarHistorialInquilinos = mostrarHistorialInquilinos; // Nueva línea

// ***** Centralización de la función eliminarDocumento *****
// Esta función global manejará la confirmación y delegará la eliminación a la función específica de cada módulo.
window.eliminarDocumento = async (coleccion, id, callbackRefresh) => {
    switch (coleccion) {
        case 'inmuebles':
            eliminarInmuebleDoc(coleccion, id, callbackRefresh);
            break;
        case 'inquilinos':
            eliminarInquilinoDoc(coleccion, id, callbackRefresh);
            break;
        case 'pagos':
            eliminarPagoDoc(coleccion, id, callbackRefresh);
            break;
        case 'mantenimientos':
            eliminarMantenimientoDoc(coleccion, id, callbackRefresh);
            break;
        case 'desperfectos':
            window.eliminarDocumento(coleccion, id, callbackRefresh);
            break;
        default:
            mostrarNotificacion('Colección no reconocida para eliminar.', 'error');
            break;
    }
};

// ---- Funciones de Autenticación ----
document.getElementById('btnLogin').onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert('Error al iniciar sesión: ' + e.message);
  }
};

document.getElementById('btnLogout').onclick = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    alert('Error al cerrar sesión: ' + e.message);
  }
};

// Mostrar info de usuario y alternar botones
onAuthStateChanged(auth, user => {
  const userInfo = document.getElementById('userInfo');
  if (user) {
    document.getElementById('btnLogin').classList.add('hidden');
    document.getElementById('btnLogout').classList.remove('hidden');
    userInfo.textContent = `Hola, ${user.displayName || user.email}`;
    mostrarDashboard(); // Cargar el dashboard u otra información aquí si es necesario
  } else {
    document.getElementById('btnLogin').classList.remove('hidden');
    document.getElementById('btnLogout').classList.add('hidden');
    userInfo.textContent = '';

    // Mostrar mensaje de inicio de sesión en el contenido principal
    document.getElementById('contenido').innerHTML = `
      <div class="text-center py-10">
        <p class="text-lg text-gray-700 mb-4">Por favor, inicia sesión para ver la información.</p>
        <button id="btnLogin" class="bg-blue-600 text-white px-4 py-2 rounded">Iniciar sesión con Google</button>
      </div>
    `;
  }
});

// ---- Control de Rutas (Navegación) basado en el hash de la URL ----
const loadContent = () => {
    const fullHash = window.location.hash.substring(1);
    const parts = fullHash.split('?');
    const hash = parts[0];
    const queryString = parts[1];

    let params = {};
    if (queryString) {
        params = Object.fromEntries(new URLSearchParams(queryString));
    }

    switch (hash) {
        case 'inmuebles':
            mostrarInmuebles(params.estado);
            break;
        case 'inquilinos':
            mostrarInquilinos();
            break;
        case 'pagos':
            mostrarPagos();
            break;
        case 'mantenimientos':
            mostrarMantenimientos();
            break;
        case 'mobiliario':
            mostrarInventarioMobiliario();
            break;
        case 'reportes':
            mostrarReportes();
            break;
        case 'abonos':
            mostrarAbonos();
            break;
        case 'desperfectos':
            mostrarDesperfectos();
            break;
        case 'dashboard':
        default:
            mostrarDashboard();
            break;
    }
};

// ---- Event Listeners Principales ----

// Escuchar cambios en el hash de la URL para cargar el contenido correspondiente
window.addEventListener('hashchange', loadContent);

// Cargar el contenido inicial al cargar completamente la página (DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    loadContent();
    // Revisar pagos vencidos al cargar la aplicación
    revisarPagosVencidos();
});

// Nueva función para mostrar comisiones
window.mostrarComisiones = function() {
    renderComisiones();
    if (typeof setActiveSection === 'function') setActiveSection('comisiones');
};