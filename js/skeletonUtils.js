// Skeleton Loader Utilities
// Helper functions to display skeleton loaders while content is loading

/**
 * Creates skeleton loaders for dashboard stat cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {string} HTML string for skeleton stat cards
 */
function createDashboardSkeletons(count = 4) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`
            <div class="skeleton-stat-card">
                <div class="skeleton-stat-icon skeleton"></div>
                <div class="skeleton-stat-content">
                    <div class="skeleton skeleton-stat-title"></div>
                    <div class="skeleton skeleton-stat-value"></div>
                </div>
            </div>
        `);
    }
    return `<div class="skeleton-stats-grid">${skeletons.join('')}</div>`;
}

/**
 * Creates skeleton loaders for property cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {string} HTML string for skeleton property cards
 */
function createPropertySkeletons(count = 6) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`
            <div class="skeleton-property-card">
                <div class="skeleton-property-header">
                    <div class="skeleton-property-badge skeleton"></div>
                </div>
                <div class="skeleton-property-body">
                    <div class="skeleton skeleton-property-title"></div>
                    <div class="skeleton skeleton-property-subtitle"></div>
                    <div class="skeleton-property-info">
                        <div class="skeleton skeleton-property-info-item"></div>
                        <div class="skeleton skeleton-property-info-item"></div>
                        <div class="skeleton skeleton-property-info-item"></div>
                    </div>
                    <div class="skeleton-property-footer">
                        <div class="skeleton skeleton-property-button"></div>
                        <div class="skeleton skeleton-property-button"></div>
                    </div>
                </div>
            </div>
        `);
    }
    return `<div class="skeleton-grid">${skeletons.join('')}</div>`;
}

/**
 * Creates skeleton loaders for tenant cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {string} HTML string for skeleton tenant cards
 */
function createTenantSkeletons(count = 6) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`
            <div class="skeleton-tenant-card">
                <div class="skeleton-tenant-header">
                    <div class="skeleton-tenant-avatar skeleton"></div>
                    <div class="skeleton-tenant-info">
                        <div class="skeleton skeleton-tenant-name"></div>
                        <div class="skeleton skeleton-tenant-property"></div>
                    </div>
                </div>
                <div class="skeleton-tenant-details">
                    <div class="skeleton skeleton-tenant-detail-row"></div>
                    <div class="skeleton skeleton-tenant-detail-row"></div>
                    <div class="skeleton skeleton-tenant-detail-row"></div>
                </div>
            </div>
        `);
    }
    return `<div class="skeleton-grid">${skeletons.join('')}</div>`;
}

/**
 * Creates skeleton loaders for payment table rows
 * @param {number} count - Number of skeleton rows to create
 * @returns {string} HTML string for skeleton table rows
 */
function createPaymentTableSkeletons(count = 8) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(`
            <div class="skeleton-table-row">
                <div class="skeleton skeleton-table-cell large"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell"></div>
                <div class="skeleton skeleton-table-cell badge"></div>
                <div class="skeleton skeleton-table-cell"></div>
            </div>
        `);
    }
    return skeletons.join('');
}

/**
 * Shows skeleton loaders in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @param {string} type - Type of skeleton ('dashboard', 'property', 'tenant', 'payment')
 * @param {number} count - Number of skeletons to show
 */
function showSkeletons(container, type, count) {
    const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!element) return;

    let html = '';
    switch (type) {
        case 'dashboard':
            html = createDashboardSkeletons(count);
            break;
        case 'property':
            html = createPropertySkeletons(count);
            break;
        case 'tenant':
            html = createTenantSkeletons(count);
            break;
        case 'payment':
            html = createPaymentTableSkeletons(count);
            break;
        default:
            console.warn(`Unknown skeleton type: ${type}`);
            return;
    }

    element.innerHTML = html;
}

/**
 * Hides skeleton loaders and shows content with fade-in animation
 * @param {HTMLElement|string} container - Container element or selector
 * @param {string} content - HTML content to display
 */
function hideSkeletonsAndShowContent(container, content) {
    const element = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!element) return;

    // Add fade-out to skeletons
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease-out';

    setTimeout(() => {
        element.innerHTML = content;
        element.style.opacity = '0';

        // Force reflow
        element.offsetHeight;

        // Fade in new content
        element.style.opacity = '1';

        // Add fade-in class to children for staggered animation
        const children = element.children;
        Array.from(children).forEach((child, index) => {
            setTimeout(() => {
                child.classList.add('fade-in');
            }, index * 50); // 50ms delay between each card
        });
    }, 300);
}

// ES6 exports for modern module systems
export {
    createDashboardSkeletons,
    createPropertySkeletons,
    createTenantSkeletons,
    createPaymentTableSkeletons,
    showSkeletons,
    hideSkeletonsAndShowContent
};
