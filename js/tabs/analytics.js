// Analytics tab functionality
class AnalyticsPage {
    constructor() {
        this.template = null;
        this.contentDiv = null;
        this.charts = {};
    }

    async initialize(contentDiv) {
        this.contentDiv = contentDiv;
        await this.loadTemplate();
        this.render();
        await this.initializeCharts();
    }

    async loadTemplate() {
        try {
            const response = await fetch('templates/analytics.html');
            this.template = await response.text();
        } catch (error) {
            console.error('Error loading analytics template:', error);
            throw error;
        }
    }

    render() {
        if (!this.template || !this.contentDiv) return;
        this.contentDiv.innerHTML = this.template;
    }

    async initializeCharts() {
        await this.initHealthTrendChart();
        await this.initComponentDistChart();
        await this.initMaintenanceHistoryChart();
    }

    async initHealthTrendChart() {
        const ctx = document.getElementById('healthTrendChart')?.getContext('2d');
        if (!ctx) return;

        // Get theme colors from CSS variables
        const style = getComputedStyle(document.body);
        const textColor = style.getPropertyValue('--gray-500');

        this.charts.healthTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Overall Health Score',
                    data: [85, 88, 87, 89, 86, 87],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: { color: textColor }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 80,
                        max: 100,
                        ticks: { color: textColor },
                        grid: { color: style.getPropertyValue('--gray-200') }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: style.getPropertyValue('--gray-200') }
                    }
                }
            }
        });
    }

    async initComponentDistChart() {
        const ctx = document.getElementById('componentDistChart')?.getContext('2d');
        if (!ctx) return;

        // Get theme colors from CSS variables
        const style = getComputedStyle(document.body);
        const textColor = style.getPropertyValue('--gray-500');

        this.charts.componentDist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Rail Liner', 'Elastic Clips', 'Rail Pads', 'Sleepers', 'Others'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#3B82F6', // blue
                        '#10B981', // green
                        '#F59E0B', // yellow
                        '#EF4444', // red
                        '#6B7280'  // gray
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor }
                    }
                }
            }
        });
    }

    async initMaintenanceHistoryChart() {
        const ctx = document.getElementById('maintenanceHistoryChart')?.getContext('2d');
        if (!ctx) return;

        // Get theme colors from CSS variables
        const style = getComputedStyle(document.body);
        const textColor = style.getPropertyValue('--gray-500');

        this.charts.maintenanceHistory = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Scheduled',
                        data: [65, 72, 68, 75, 70, 72],
                        backgroundColor: '#3B82F6'
                    },
                    {
                        label: 'Emergency',
                        data: [12, 8, 15, 10, 14, 9],
                        backgroundColor: '#EF4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: textColor },
                        grid: { color: style.getPropertyValue('--gray-200') }
                    },
                    y: {
                        stacked: true,
                        ticks: { color: textColor },
                        grid: { color: style.getPropertyValue('--gray-200') }
                    }
                }
            }
        });
    }

    // Method to update chart data
    updateChartData(chartName, newData) {
        const chart = this.charts[chartName];
        if (!chart) return;

        chart.data = { ...chart.data, ...newData };
        chart.update();
    }

    // Method to destroy charts when component is unmounted
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}

// Create and export the page instance
const analyticsPage = new AnalyticsPage();
export const loadAnalyticsPage = async (contentDiv) => {
    try {
        await analyticsPage.initialize(contentDiv);
    } catch (error) {
        console.error('Error loading analytics page:', error);
        contentDiv.innerHTML = '<p class="text-red-500">Error loading content</p>';
    }

    // Clean up when navigating away
    return () => analyticsPage.destroy();
};