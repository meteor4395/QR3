// Inventory tab functionality
export async function loadInventoryPage(container) {
    try {
        const response = await fetch('templates/inventory.html');
        const template = await response.text();
        container.innerHTML = template;

        // Initialize the inventory page
        await initializeInventory();
    } catch (error) {
        console.error('Error loading inventory page:', error);
        container.innerHTML = 'Error loading inventory page';
    }
}

async function initializeInventory() {
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const viewSelector = document.getElementById('viewSelector');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Load initial data
    await refreshData();

    // Add event listeners for search and filter
    searchInput.addEventListener('input', debounce(refreshData, 300));
    viewSelector.addEventListener('change', refreshData);
    document.getElementById('filterStatus').addEventListener('change', refreshData);
}

async function refreshData() {
    const view = document.getElementById('viewSelector').value;
    if (view === 'inventory') {
        document.getElementById('inventoryFilters').style.display = 'block';
        await refreshInventoryData();
    } else {
        document.getElementById('inventoryFilters').style.display = 'none';
        await refreshInspectionsData();
    }
}

async function refreshInventoryData() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const loadingIndicator = document.getElementById('loadingIndicator');
    try {
        loadingIndicator.classList.remove('hidden');
        
        // Fetch data from the API
        const response = await fetch('http://localhost:5000/api/qr-codes');
        if (!response.ok) throw new Error('Failed to fetch inventory data');
        
        const result = await response.json();
        const items = result.data;

        // Filter items based on search and status
        const searchTerm = searchInput.value.toLowerCase();
        const statusFilter = filterStatus.value;

        const filteredItems = items.filter(item => {
            const matchesSearch = !searchTerm || 
                Object.values(item).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
            const matchesStatus = !statusFilter || item.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Set table header for inventory
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Vendor</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Item Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Lot #</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Mfg. Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Supply Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Warranty</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Warranty Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Actions</th>
            </tr>
        `;
        // Clear existing table content
        tableBody.innerHTML = '';

        // Add filtered items to table
        filteredItems.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-surface-hover';
            
            // Format dates for display
            const manufactureDate = new Date(item.manufacture_date).toLocaleDateString();
            const supplyDate = new Date(item.supply_date).toLocaleDateString();
            
            // Calculate warranty status
            const warrantyEnd = new Date(item.supply_date);
            warrantyEnd.setMonth(warrantyEnd.getMonth() + getWarrantyMonths(item.warranty_period));
            const isExpired = warrantyEnd < new Date();
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-color-default">${item.timestamp}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${item.vendor_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${item.item_type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${item.lot_number}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${manufactureDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${supplyDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${item.warranty_period}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${isExpired ? 'warning' : 'excellent'}">
                        ${isExpired ? 'Expired' : 'Active'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">
                    <button onclick="regenerateQR('${item.timestamp}')"
                            class="text-color-primary hover:text-primary-dark">
                        Regenerate QR
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading inventory:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="px-6 py-4 text-center text-color-danger">
                    Error loading inventory data: ${error.message}
                </td>
            </tr>
        `;
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

async function refreshInspectionsData() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const loadingIndicator = document.getElementById('loadingIndicator');

    try {
        loadingIndicator.classList.remove('hidden');

        const response = await fetch('http://localhost:5000/api/inspections');
        if (!response.ok) throw new Error('Failed to fetch inspections data');

        const result = await response.json();
        const inspections = result.data;

        const searchTerm = searchInput.value.toLowerCase();
        const filteredInspections = inspections.filter(insp => {
            return !searchTerm ||
                Object.values(insp).some(value =>
                    String(value).toLowerCase().includes(searchTerm)
                );
        });

        // Set table header for inspections
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Inspection Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Item (Lot #)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Report</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">Replacement/Repair</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-color-muted uppercase">QR ID</th>
            </tr>
        `;
        tableBody.innerHTML = '';

        filteredInspections.forEach(insp => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-surface-hover';

            const inspectionDate = new Date(insp.inspection_time).toLocaleDateString();

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-color-default">${inspectionDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${insp.item_type} (${insp.lot_number})</td>
                <td class="px-6 py-4 text-sm text-color-muted">${insp.inspection_report || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${insp.need_replacement_repair === 'yes' ? 'warning' : 'excellent'}">
                        ${insp.need_replacement_repair.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-color-muted">${insp.qr_timestamp}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading inspections:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 p-4">Error: ${error.message}</td></tr>`;
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function getWarrantyMonths(warrantyPeriod) {
    const periods = {
        '6 months': 6,
        '1 year': 12,
        '2 years': 24,
        '5 years': 60
    };
    return periods[warrantyPeriod] || 0;
}

// Utility function to debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add regenerateQR function to window object for button click handler
window.regenerateQR = async function(timestamp) {
    try {
        const response = await fetch(`http://localhost:5000/api/qr-codes/${timestamp}`);
        if (!response.ok) throw new Error('Failed to fetch QR data');
        
        const result = await response.json();
        const qrData = result.data;

        // Create a temporary container for the QR code
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        document.body.appendChild(container);

        // Generate QR code
        new QRCode(container, {
            text: JSON.stringify(qrData),
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait for QR code to generate
        setTimeout(() => {
            // Get the canvas and download the image
            const canvas = container.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `qr-code-${timestamp}.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
            
            // Clean up
            document.body.removeChild(container);
        }, 100);
    } catch (error) {
        console.error('Error regenerating QR code:', error);
        alert('Failed to regenerate QR code: ' + error.message);
    }
};