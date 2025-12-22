# LoRa Smart Irrigation Network
An end-to-end, high-efficiency IoT Precision Irrigation System designed for large-scale agricultural environments. This project focuses on extreme energy optimization, reliable long-range communication, and a complete user experience from sensor to dashboard.

## 📌 Overview
Traditional irrigation systems often lack granular data or consume too much power for remote battery operation. This system solves these issues by deploying a network of Ultra-Low Power Motas (Sensor Nodes) that communicate via LoRa with a centralized Gateway (Router).

The project covers the entire engineering stack: from low-level firmware and hardware power management to 3D enclosure design, backend data processing, and a modern frontend.

## 🚀 Key Features
Advanced Power Management: Motas are optimized for a 15 µA deep sleep current, utilizing an IRLML2502 MOSFET to physically cut off peripheral power.

Precision Timing: Integration of the DS3231 High-Precision RTC to ensure synchronized wake-up cycles and network coordination.

Custom MAC Layer: Implementation of a CSMA/CA (Listen Before Talk) algorithm on top of the LoRa physical layer to prevent packet collisions and ensure scalability.

Industrial Design: Custom-designed 3D-printed enclosures rated for field deployment, protecting electronics from environmental factors.

Full-Stack Monitoring: A dedicated web dashboard for real-time visualization of soil moisture, battery health, and network status.

## 📂 Project Structure
The repository is organized into the following modules:
```
.
├── 📂 3d-models       # STL and CAD files for enclosures and mounts.
├── 📂 backend         # Server-side logic (API, Database, Data processing).
├── 📂 docs            # Technical manuals, schematics, and the final TFG report.
├── 📂 firmware        # Source code for the ESP32-S3 (Heltec V3).
│   ├── 📂 mote        # Deep-sleep optimized code for sensor nodes.
│   └── 📂 router      # Gateway logic and CSMA/CA scheduling.
├── 📂 frontend        # User web interface (React/Vue or HTML/JS).
└── 📂 hardware        # PCB designs, BoM (Bill of Materials), and wiring diagrams.
```

## 🛠️ Hardware Stack

Microcontroller: ESP32-S3 (Heltec LoRa 32 V3).

LoRa Transceiver: Semtech SX1262 (integrated).

Real-Time Clock: DS3231 (via I2C).

Power Switching: IRLML2502 N-Channel MOSFET.

Battery Management: Li-Po 3.7V with TP4056 charging circuit.

Connectivity: LoRa (868 MHz), WiFi (Gateway only).

## 📡 Networking & Protocol

This project moves away from standard ALOHA-based LoRa transmissions to a more robust CSMA/CA approach:

CCA (Clear Channel Assessment): The node checks the RSSI before transmitting.

Random Backoff: If the channel is busy, the node waits for a randomized interval.

LBT (Listen Before Talk): Ensures that high-priority sensor data is not lost due to interference.

## 🔧 Installation & Setup

Clone the repo: git clone https://github.com/Davidrp23/LoRa-Smart-Irrigation-Network.git

Firmware: Open /firmware in VS Code (PlatformIO) or Arduino IDE. Install required libraries: Heltec ESP32 Dev-Boards, RTClib, and RadioLib.

Backend: Navigate to /backend, install dependencies, and run the server.

Frontend: Open /frontend and point the API endpoint to your server address.

📝 Author
David Romero - Initial Work / TFG Student 

⚖️ License
This project is licensed under the MIT License - see the LICENSE file for details.
