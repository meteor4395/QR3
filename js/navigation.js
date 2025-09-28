import { loadOverviewPage } from './tabs/overview.js';
import { loadQRGeneratorPage } from './tabs/qr-generator.js';
import { loadAnalyticsPage } from './tabs/analytics.js';
import { loadInventoryPage } from './tabs/inventory.js';
import { loadQRScannerPage } from './tabs/scanner.js';
import { loadAdminPage } from './tabs/admin.js';
import { checkAuth, getUserRole, showLoginForm } from './auth.js';

const mainContent = document.getElementById('content');

const pageLoaders = {
    'overview': loadOverviewPage,
    'generate-qr': loadQRGeneratorPage,
    'scan-qr': loadQRScannerPage,
    'inventory': loadInventoryPage,
    'analytics': loadAnalyticsPage,
    'admin': loadAdminPage
};

const adminPages = ['generate-qr', 'admin'];

async function navigateTo(page, data) {
    if (!checkAuth()) {
        showLoginForm();
        return;
    }

    if (adminPages.includes(page) && getUserRole() !== 'admin') {
        alert('Admin access required');
        return;
    }

    const loadPage = pageLoaders[page];
    if (loadPage) {
        await loadPage(mainContent, data);
    } else {
        mainContent.innerHTML = '<p class="text-gray-500">Coming soon...</p>';
    }
}

function setActiveLink(link) {
    document.querySelectorAll('[data-page]').forEach(l => 
        l.classList.remove('active')
    );
    link.classList.add('active');
}

export function initNavigation() {
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            
            setActiveLink(link);
            await navigateTo(page);
        });
    });
}

export function navigateToDefaultPage() {
    const overviewLink = document.querySelector('[data-page="overview"]');
    if (overviewLink) {
        setActiveLink(overviewLink);
        navigateTo('overview');
    }
}