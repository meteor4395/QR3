// Overview tab functionality
class OverviewPage {
    constructor() {
        this.template = null;
        this.contentDiv = null;
        this.dashboardData = null;
    }

    async initialize(contentDiv, dashboardData) {
        this.contentDiv = contentDiv;
        this.dashboardData = dashboardData;
        await this.loadTemplate();
        this.render();
        this.attachEventListeners();
    }

    async loadTemplate() {
        try {
            const response = await fetch('templates/overview.html');
            this.template = await response.text();
        } catch (error) {
            console.error('Error loading overview template:', error);
            throw error;
        }
    }

    render() {
        if (!this.template || !this.contentDiv) return;

        this.contentDiv.innerHTML = this.template;
        this.updateStatistics();
        this.updateRecentActivity();
        this.updateAlerts();
    }

    updateStatistics() {
        const stats = this.dashboardData.stats;
        document.getElementById('totalItems').textContent = this.formatNumber(stats.totalItems);
        document.getElementById('activeVendors').textContent = this.formatNumber(stats.activeVendors);
        document.getElementById('itemsUnderWarranty').textContent = this.formatNumber(stats.itemsUnderWarranty);
        document.getElementById('failedInspections').textContent = this.formatNumber(stats.failedInspections);
    }

    updateRecentActivity() {
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;

        activityList.innerHTML = this.dashboardData.recentActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">📋</div>
                <div class="activity-content">
                    <div class="activity-title">${this.escapeHtml(activity.id)}</div>
                    <div class="activity-subtitle">${this.escapeHtml(activity.vendor)}</div>
                </div>
                <div class="activity-date">${this.formatDate(activity.date)}</div>
            </div>
        `).join('');
    }

    updateAlerts() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        alertsList.innerHTML = this.dashboardData.alerts.map(alert => `
            <div class="alert-card alert-${alert.type}">
                <div class="flex items-center">
                    <div class="mr-4">${alert.type === 'warning' ? '⚠️' : '🚫'}</div>
                    <div>
                        <div class="font-semibold">${this.escapeHtml(alert.message)}</div>
                        <div class="text-sm text-gray-600">${this.escapeHtml(alert.category)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    attachEventListeners() {
        const generateQRBtn = this.contentDiv.querySelector('button:first-child');
        if (generateQRBtn) {
            generateQRBtn.addEventListener('click', () => {
                document.querySelector('[data-page="generate-qr"]')?.click();
            });
        }
    }

    // Utility functions
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Create and export the page instance
const overviewPage = new OverviewPage();
export const loadOverviewPage = async (contentDiv, dashboardData) => {
    try {
        await overviewPage.initialize(contentDiv, dashboardData);
    } catch (error) {
        console.error('Error loading overview page:', error);
        contentDiv.innerHTML = '<p class="text-red-500">Error loading content</p>';
    }
};