// QR Generator tab functionality
class QRGeneratorPage {
    constructor() {
        this.contentDiv = null;
        this.qrData = null;
    }

    async initialize(contentDiv) {
        this.contentDiv = contentDiv;
        this.render();
        this.attachEventListeners();
    }

    render() {
        if (!this.contentDiv) return;
        this.contentDiv.innerHTML = `
            <div class="flex flex-col gap-4">
                <div class="mb-2">
                    <h2 class="text-3xl font-bold text-color-default">QR Code Generator</h2>
                    <p class="text-lg text-color-muted">Generate QR codes for railway track fittings</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Form Card -->
                    <div class="bg-surface rounded-xl shadow-lg p-8 flex flex-col justify-center min-h-[400px]">
                        <h3 class="text-xl font-semibold mb-6 text-color-default">Item Information</h3>
                        <form id="qr-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-color-muted">Vendor Name <span class="text-red-500">*</span></label>
                                <input type="text" name="vendor_name" required placeholder="e.g., QRix Solutions" 
                                    class="mt-1 block w-full form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-color-muted">Lot Number <span class="text-red-500">*</span></label>
                                <input type="text" name="lot_number" required placeholder="e.g., LOT-2024-001"
                                    class="mt-1 block w-full form-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-color-muted">Item Type <span class="text-red-500">*</span></label>
                                <select name="item_type" required class="mt-1 block w-full form-input">
                                    <option value="">Select item type</option>
                                    <option value="Elastic Rail Clip">Elastic Rail Clip</option>
                                    <option value="Rail Liner">Rail Liner</option>
                                    <option value="Track Bolt">Track Bolt</option>
                                    <option value="Rail Pad">Rail Pad</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-color-muted">Manufacture Date</label>
                                    <input type="date" name="manufacture_date" required placeholder="dd-mm-yyyy"
                                        class="mt-1 block w-full form-input">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-color-muted">Supply Date</label>
                                    <input type="date" name="supply_date" required placeholder="dd-mm-yyyy"
                                        class="mt-1 block w-full form-input">
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-color-muted">Warranty Period</label>
                                <select name="warranty_period" required class="mt-1 block w-full form-input">
                                    <option value="12 months">12 months</option>
                                    <option value="6 months">6 months</option>
                                    <option value="1 year">1 year</option>
                                    <option value="2 years">2 years</option>
                                    <option value="5 years">5 years</option>
                                </select>
                            </div>
                            <button type="submit"
                                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold shadow hover:bg-blue-700 transition-all duration-200">
                                Generate QR Code
                            </button>
                        </form>
                    </div>
                    <!-- Preview Card -->
                    <div class="bg-surface rounded-xl shadow-lg p-8 flex flex-col justify-center min-h-[400px]">
                        <h3 class="text-xl font-semibold mb-6 text-color-default">Generated QR Code</h3>
                        <div id="qrcode" class="flex justify-center items-center p-4"></div>
                        <div id="qr-success" class="mt-4 text-center text-green-600"></div>
                        <div id="qr-error" class="mt-4 text-center text-red-600"></div>
                        <div id="qr-placeholder" class="text-color-subtle text-center mt-8">Fill out the form to generate a QR code</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const form = document.getElementById('qr-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Clear previous QR code
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = '';
        
        // Generate timestamp
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Create QR data object - no timestamp needed here, backend will create it.
        this.qrData = {
            vendor_name: formData.get('vendor_name'),
            lot_number: formData.get('lot_number'),
            item_type: formData.get('item_type'),
            manufacture_date: formData.get('manufacture_date'),
            supply_date: formData.get('supply_date'),
            warranty_period: formData.get('warranty_period')
        };

        await this.generateQRCode();
    }

    async generateQRCode() {
        if (!this.qrData) return;

        try {
            // Save to database
            const response = await fetch('http://localhost:5000/api/qr-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.qrData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save QR code data');
            }

            const result = await response.json();
            const newTimestamp = result.timestamp;
            this.qrData.timestamp = newTimestamp; // Add the server-generated timestamp

            // Generate QR code with timestamp as part of the data
            const qrString = JSON.stringify(this.qrData);
            const qrcodeDiv = document.getElementById('qrcode');
            new QRCode(qrcodeDiv, {
                text: qrString,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR code to be generated
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get the canvas with QR code
            const canvas = qrcodeDiv.querySelector('canvas');
            if (!canvas) {
                throw new Error('QR code canvas not found');
            }

            // Show success message
            document.getElementById('qr-success').innerHTML = `
                <div class="bg-success-subtle border border-color-default rounded-md p-4 mt-4">
                    <h3 class="text-color-success font-medium">QR Code Generated Successfully</h3>
                    <p class="text-color-success mt-1">ID: ${newTimestamp}</p>
                    <p class="text-color-success">Vendor: ${this.qrData.vendor_name}</p>
                    <p class="text-color-success">Lot: ${this.qrData.lot_number}</p>
                    <button onclick="window.qrGeneratorPage.downloadQRCode()" class="mt-2 bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700">
                        Download QR Code
                    </button>
                </div>
            `;
            document.getElementById('qr-error').innerHTML = '';
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('qr-error').innerHTML = `
                <div class="bg-danger-bg border border-color-default rounded-md p-4 mt-4">
                    <p class="text-color-danger">Failed to generate QR code: ${error.message}</p>
                </div>
            `;
            document.getElementById('qr-success').innerHTML = '';
        }
    }

    downloadQRCode() {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `qr-code-${this.qrData.timestamp}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    }
}

// Create and export the page instance
window.qrGeneratorPage = new QRGeneratorPage();
export const loadQRGeneratorPage = async (contentDiv) => {
    try {
        await window.qrGeneratorPage.initialize(contentDiv);
    } catch (error) {
        console.error('Error loading QR generator page:', error);
        contentDiv.innerHTML = '<p class="text-red-500">Error loading content</p>';
    }
};