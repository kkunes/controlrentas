// js/commandPalette.js
import { db } from './firebaseConfig.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { mostrarInquilinos } from './inquilinos.js';
import { mostrarInmuebles } from './inmuebles.js';
import { mostrarDashboard } from './dashboard.js';
import { mostrarPagos } from './pagos.js';
import { mostrarReportes } from './reportes.js';
import { mostrarInventarioMobiliario } from './mobiliario.js';
import { mostrarMantenimientos } from './mantenimientos.js';
import { mostrarAbonos } from './abonos.js';
import { mostrarDesperfectos } from './desperfectos.js';

export class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.selectedIndex = 0;
        this.data = []; // Stores indexed items
        this.filteredData = [];
        this.backdrop = null;
        this.modal = null;
        this.input = null;
        this.resultsContainer = null;

        // Bind methods
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.close = this.close.bind(this);
        this.open = this.open.bind(this);
    }

    async init() {
        this.createDOM();
        this.attachEvents();
        await this.indexData();
    }

    createDOM() {
        // Create backdrop and modal structure
        const backdrop = document.createElement('div');
        backdrop.id = 'command-palette-backdrop';

        backdrop.innerHTML = `
            <div id="command-palette-modal">
                <div class="cp-search-container">
                    <svg class="cp-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="cp-input" placeholder="Escribe un comando o busca..." autocomplete="off">
                </div>
                <div id="cp-results"></div>
                <div class="cp-footer">
                    <div class="cp-footer-item"><span class="cp-key">↑</span> <span class="cp-key">↓</span> navegar</div>
                    <div class="cp-footer-item"><span class="cp-key">↵</span> seleccionar</div>
                    <div class="cp-footer-item"><span class="cp-key">esc</span> cerrar</div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        this.backdrop = backdrop;
        this.modal = backdrop.querySelector('#command-palette-modal');
        this.input = backdrop.querySelector('#cp-input');
        this.resultsContainer = backdrop.querySelector('#cp-results');

        // Close on backdrop click
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) this.close();
        });

        // Create Floating Action Button (FAB) for mobile
        const fab = document.createElement('button');
        fab.id = 'cp-fab';
        fab.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        `;
        fab.onclick = () => this.open();
        document.body.appendChild(fab);
    }

    attachEvents() {
        // Global shortcut Ctrl+K or Cmd+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.isOpen ? this.close() : this.open();
            }

            if (this.isOpen && e.key === 'Escape') {
                this.close();
            }
        });

        // Input handling
        this.input.addEventListener('input', this.handleInput);
        this.input.addEventListener('keydown', this.handleKeydown);
    }

    async indexData() {
        this.data = [];

        // 1. Navigation Commands
        const navCommands = [
            { title: 'Dashboard', type: 'nav', action: () => mostrarDashboard(), icon: 'dashboard', keywords: 'inicio home resumen' },
            { title: 'Inmuebles', type: 'nav', action: () => mostrarInmuebles(), icon: 'inmuebles', keywords: 'propiedades casas departamentos' },
            { title: 'Inquilinos', type: 'nav', action: () => mostrarInquilinos(), icon: 'inquilinos', keywords: 'rentas personas clientes' },
            { title: 'Pagos', type: 'nav', action: () => mostrarPagos(), icon: 'pagos', keywords: 'cobros dinero ingresos' },
            { title: 'Mobiliario', type: 'nav', action: () => mostrarInventarioMobiliario(), icon: 'mobiliario', keywords: 'inventario muebles' },
            { title: 'Mantenimientos', type: 'nav', action: () => mostrarMantenimientos(), icon: 'mantenimientos', keywords: 'reparaciones gastos' },
            { title: 'Reportes', type: 'nav', action: () => mostrarReportes(), icon: 'reportes', keywords: 'estadisticas pdf imprimir' },
            { title: 'Saldos a Favor', type: 'nav', action: () => mostrarAbonos(), icon: 'abonos', keywords: 'creditos devoluciones' },
            { title: 'Desperfectos', type: 'nav', action: () => mostrarDesperfectos(), icon: 'desperfectos', keywords: 'daños incidencias' },
        ];
        this.data.push(...navCommands);

        // 2. Fetch Inquilinos (Async)
        try {
            const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
            inquilinosSnap.forEach(doc => {
                const i = doc.data();
                if (i.activo) { // Only index active tenants for now
                    this.data.push({
                        title: i.nombre,
                        subtitle: 'Inquilino',
                        type: 'inquilino',
                        id: doc.id,
                        action: () => {
                            mostrarInquilinos();
                            // Small delay to allow rendering, then filter/highlight could be added
                            setTimeout(() => {
                                const searchInput = document.getElementById('busquedaInquilino');
                                if (searchInput) {
                                    searchInput.value = i.nombre;
                                    searchInput.dispatchEvent(new Event('input'));
                                }
                            }, 500);
                        },
                        icon: 'user',
                        keywords: `${i.telefono} ${i.email || ''}`
                    });
                }
            });
        } catch (e) {
            console.error("Error indexing inquilinos:", e);
        }

        // 3. Fetch Inmuebles (Async)
        try {
            const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
            inmueblesSnap.forEach(doc => {
                const p = doc.data();
                this.data.push({
                    title: p.nombre,
                    subtitle: `Inmueble - ${p.estado}`,
                    type: 'inmueble',
                    id: doc.id,
                    action: () => {
                        mostrarInmuebles();
                        setTimeout(() => {
                            const searchInput = document.getElementById('busquedaInmueble'); // Assuming this ID exists or similar
                            if (searchInput) {
                                searchInput.value = p.nombre;
                                searchInput.dispatchEvent(new Event('input'));
                            }
                        }, 500);
                    },
                    icon: 'home',
                    keywords: `${p.direccion} ${p.tipo}`
                });
            });
        } catch (e) {
            console.error("Error indexing inmuebles:", e);
        }
    }

    open() {
        this.isOpen = true;
        this.backdrop.classList.add('open');
        this.input.value = '';
        this.input.focus();
        this.filterData('');
        // Re-index data silently to keep it fresh
        this.indexData();
    }

    close() {
        this.isOpen = false;
        this.backdrop.classList.remove('open');
    }

    handleInput(e) {
        const query = e.target.value;
        this.filterData(query);
    }

    filterData(query) {
        const lowerQuery = query.toLowerCase();

        if (!query) {
            // Show navigation items by default
            this.filteredData = this.data.filter(item => item.type === 'nav');
        } else {
            this.filteredData = this.data.filter(item => {
                const matchTitle = item.title.toLowerCase().includes(lowerQuery);
                const matchKeywords = item.keywords && item.keywords.toLowerCase().includes(lowerQuery);
                const matchSubtitle = item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery);
                return matchTitle || matchKeywords || matchSubtitle;
            });
        }

        // Limit results
        this.filteredData = this.filteredData.slice(0, 10);
        this.selectedIndex = 0;
        this.renderResults();
    }

    handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.filteredData.length;
            this.updateVisualSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.filteredData.length) % this.filteredData.length;
            this.updateVisualSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.filteredData.length > 0) {
                const item = this.filteredData[this.selectedIndex];
                this.executeAction(item);
            }
        }
    }

    scrollToSelected() {
        const selectedEl = this.resultsContainer.children[this.selectedIndex];
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    }

    executeAction(item) {
        this.close();
        if (item.action) item.action();
    }

    getIconSvg(iconName) {
        // Simple mapping for icons
        const icons = {
            dashboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>',
            inmuebles: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
            inquilinos: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
            pagos: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            user: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
            home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
            default: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>'
        };
        return icons[iconName] || icons.default;
    }

    renderResults() {
        this.resultsContainer.innerHTML = '';

        if (this.filteredData.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    No se encontraron resultados
                </div>
            `;
            return;
        }

        this.filteredData.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = `cp-item ${index === this.selectedIndex ? 'selected' : ''}`;
            el.onclick = () => this.executeAction(item);

            // Use mousemove to update selection without re-rendering
            // This prevents issues on mobile where hover/touch events might conflict
            el.addEventListener('mousemove', () => {
                if (this.selectedIndex !== index) {
                    this.selectedIndex = index;
                    this.updateVisualSelection();
                }
            });

            el.innerHTML = `
                <div class="cp-item-icon">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${this.getIconSvg(item.icon)}
                    </svg>
                </div>
                <div class="cp-item-content">
                    <div class="cp-item-title">${item.title}</div>
                    ${item.subtitle ? `<div class="cp-item-subtitle">${item.subtitle}</div>` : ''}
                </div>
                ${item.type === 'nav' ? '<div class="cp-item-shortcut">Ir a</div>' : ''}
            `;
            this.resultsContainer.appendChild(el);
        });
    }

    updateVisualSelection() {
        const items = this.resultsContainer.children;
        for (let i = 0; i < items.length; i++) {
            if (i === this.selectedIndex) {
                items[i].classList.add('selected');
                items[i].scrollIntoView({ block: 'nearest' });
            } else {
                items[i].classList.remove('selected');
            }
        }
    }
}
