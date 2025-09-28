// QR Scanner functionality
export async function loadQRScannerPage(container) {
    try {
        const response = await fetch('templates/scanner.html');
        const template = await response.text();
        container.innerHTML = template;

        // Initialize QR scanner
        await initializeScanner();
    } catch (error) {
        console.error('Error loading scanner page:', error);
        container.innerHTML = 'Error loading scanner page';
    }
}

async function initializeScanner() {
    const fileInput = document.getElementById('qrInput');
    const startCameraBtn = document.getElementById('startCamera');
    const video = document.getElementById('video');
    const cameraView = document.getElementById('cameraView');
    const submitRequestBtn = document.getElementById('submitRequest');
    let stream = null; // To hold the camera stream
    let scanning = false; // To control the scanning loop
    
    if (!fileInput || !startCameraBtn || !video || !cameraView || !submitRequestBtn) {
        throw new Error('Required elements not found');
    }

    fileInput.addEventListener('change', handleQRFile);
    startCameraBtn.addEventListener('click', startCamera);
    submitRequestBtn.addEventListener('click', handleRequestSubmit);

    async function handleQRFile(e) {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('qrResult').classList.add('hidden');

        const file = e.target.files[0];
        if (!file) {
            document.getElementById('loadingIndicator').classList.add('hidden');
            return;
        }

        const imageUrl = URL.createObjectURL(file);
        const image = new Image();
        image.src = imageUrl;

        image.onload = () => {
            // --- Optimization: Resize image before scanning ---
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = image.width;
            let height = image.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, 0, 0, width, height);
            
            const imageData = context.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            document.getElementById('loadingIndicator').classList.add('hidden');

            if (code) {
                processScannedData(code.data);
            } else {
                alert('No QR code found in the image.');
            }
            URL.revokeObjectURL(imageUrl); // Clean up
        };

        image.onerror = () => {
            document.getElementById('loadingIndicator').classList.add('hidden');
            alert('Failed to load the image file.');
        };
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;
            video.play();
            cameraView.classList.remove('hidden');
            scanning = true;
            startQRScanning();
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    }
    
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraView.classList.add('hidden');
        scanning = false;
    }

    function startQRScanning() {
        if (!scanning) return;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        function scan() {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    stopCamera();
                    processScannedData(code.data);
                }
            }
            if (scanning) {
                requestAnimationFrame(scan);
            }
        }

        requestAnimationFrame(scan);
    }

    async function processScannedData(scannedText) {
        try {
            const data = JSON.parse(scannedText);
            const response = await fetch(`http://localhost:5000/api/qr-codes/${data.timestamp}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch QR data from the server.');
            
            const result = await response.json();
            displayQRData(result.data);
            await loadAndDisplayInspections(data.timestamp);
        } catch (error) {
            console.error('Error processing QR code:', error);
            alert('Error processing QR code: ' + error.message);
        }
    }

    async function handleRequestSubmit() {
        const qrData = document.getElementById('qrData').dataset.timestamp;
        const inspectionTime = document.getElementById('inspectionTime').value;
        const inspectionReport = document.getElementById('inspectionReport').value;
        const replacementNeeded = document.querySelector('input[name="replacementNeeded"]:checked');

        if (!inspectionTime || !replacementNeeded) {
            alert('Please provide an inspection date and select a replacement/repair status.');
            return;
        }

        // Create a structured request_data object
        const requestData = {
            inspection_time: inspectionTime,
            inspection_report: inspectionReport,
            need_replacement_repair: replacementNeeded.value
        };

        try {
            const response = await fetch('http://localhost:5000/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    qr_timestamp: qrData,
                    request_type: 'inspection_report',
                    request_data: JSON.stringify(requestData) // Send as a JSON string
                })
            });

            if (!response.ok) throw new Error('Failed to submit request');

            alert('Request submitted successfully!');
            document.getElementById('inspectionTime').value = '';
            document.getElementById('inspectionReport').value = '';
            replacementNeeded.checked = false;
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request: ' + error.message);
        }
    }
}

function displayQRData(data) {
    const qrResult = document.getElementById('qrResult');
    const qrData = document.getElementById('qrData');
    
    if (!qrResult || !qrData) {
        console.error('QR result elements not found');
        return;
    }

    qrData.innerHTML = `
        <p class="text-sm text-color-muted">ID: ${data.timestamp}</p>
        <p class="text-sm text-color-muted">Vendor: ${data.vendor_name}</p>
        <p class="text-sm text-color-muted">Item Type: ${data.item_type}</p>
        <p class="text-sm text-color-muted">Lot Number: ${data.lot_number}</p>
        <p class="text-sm text-color-muted">Manufacture Date: ${new Date(data.manufacture_date).toLocaleDateString()}</p>
        <p class="text-sm text-color-muted">Supply Date: ${new Date(data.supply_date).toLocaleDateString()}</p>
        <p class="text-sm text-color-muted">Warranty: ${data.warranty_period}</p>
        <p class="text-sm text-color-muted">Status: ${data.status}</p>
    `;
    qrData.dataset.timestamp = data.timestamp;
    qrResult.classList.remove('hidden');
}

async function loadAndDisplayInspections(timestamp) {
    const container = document.getElementById('inspectionHistory');
    if (!container) return;

    try {
        const response = await fetch(`http://localhost:5000/api/qr-codes/${timestamp}/inspections`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch inspection history.');

        const result = await response.json();
        const inspections = result.data;

        if (inspections.length === 0) {
            container.innerHTML = '<p class="text-sm text-color-muted">No inspection history found.</p>';
            return;
        }

        container.innerHTML = inspections.map((insp, index) => `
            <div class="p-3 bg-body rounded-md border border-color-default">
                <p class="font-semibold text-sm text-color-default">Inspection #${inspections.length - index}</p>
                <p class="text-xs text-color-muted">Date: ${new Date(insp.inspection_time).toLocaleDateString()}</p>
                <p class="text-xs text-color-muted">Report: ${insp.inspection_report || 'N/A'}</p>
                <p class="text-xs text-color-muted">Replacement/Repair Needed: 
                    <span class="${insp.need_replacement_repair === 'yes' ? 'text-red-600 font-bold' : 'text-green-600'}">
                        ${insp.need_replacement_repair.toUpperCase()}
                    </span>
                </p>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<p class="text-color-danger text-sm">${error.message}</p>`;
    }
}