# QRix - Railway Track Fittings Management System

A web-based system for managing railway track fittings using QR codes for identification and tracking.

## Setup Instructions

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Start the Flask backend server:
```bash
python api/app.py
```

3. Open index.html in your web browser or serve it using a local server.

## Features

- Generate QR codes for railway track fittings
- Store fitting information in SQLite database
- Each QR code contains:
  - Unique timestamp ID
  - Vendor information
  - Lot number
  - Item type
  - Manufacture date
  - Supply date
  - Warranty period
- Download generated QR codes as PNG images
- View analytics and track fitting data