# 📡 Radio Sentinel — Cellular Network Observatory & RF Wardriving Station

[![Language: FR](https://img.shields.io/badge/Langue-Fran%C3%A7ais-blue.svg)](README.md)
[![Language: EN](https://img.shields.io/badge/Language-English-green.svg)](README_EN.md)
[![Website: GitHub Pages](https://img.shields.io/badge/Web-Live%20Showcase-purple.svg)](https://gnzikoune.github.io/radio-sentinel/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal.svg)](https://fastapi.tiangolo.com/)

> **Autonomous platform for cellular spectrum auditing, radio infrastructure geolocation, and mobile cyber-threat detection.**  
> Built by upcycling an old consumer 3G USB modem (*Alcatel OneTouch X602D* / *Spreadtrum SC7702* chipset) paired with an everyday smartphone (*Samsung Galaxy A14*) as an active multi-constellation GNSS & 4G probe.  
> **100% sovereign, $0 in paid APIs or subscriptions, zero simulated or mocked data.**

---

## 🎯 Key Operational Capabilities & Use Cases

1. **Continuous RF Heatmap Coverage (GIS Interpolation):**  
   Real-time generation of continuous radio coverage heatmaps using spatial interpolation along traveled routes. Yields professional-grade coverage gradients (Green / Amber / Red) comparable to telecom regulator toolsets (such as ARCEP).
2. **Cell Tower Identification & Triangulation:**  
   - **Weighted Real-Power Centroid ($10^{\text{dBm}/10}\text{ mW}$):** Calculates the spatial center of mass for top signal samples to estimate cell tower coordinates even in dense multipath urban environments.
   - **Integrated Gabon OpenCellID Registry (MCC 628):** Real-time matching against official tower databases for Moov Africa (`MNC 01`), Airtel Gabon (`MNC 02`), and Azur (`MNC 03`).
   - **Dynamic RF Vector Beam:** Live visual vector connecting the user's GPS position to the serving base station.
3. **Dual-Network Audit & Active 4G Mobile QoS (SIM + Spectrum):**  
   Leverages the active SIM card of the Samsung Galaxy A14 to monitor two operators simultaneously (e.g. passive spectral listen on Operator A vs active 4G data on Operator B). Correlates physical layer metrics (dBm, channel, frequency) with real application layer performance (estimated downlink Mbps, RTT latency, server ping).
4. **Spatial GIS Sanity Check:**  
   Applies Haversine geodesic filtering (`HIGH` < 5 km, `MEDIUM` < 25 km, `LOW` > 25 km) to validate cell associations and detect Cell ID reuse across distant districts.
5. **Cybersecurity & Rogue Base Station Detection (Anti IMSI-Catcher):**  
   Continuous physical layer security monitoring: triggers critical red alerts upon forced **2G Downgrade Attacks** (coercing phones to switch from encrypted 3G/4G to unencrypted 2G GSM with sudden power spikes and unexpected LAC changes).
6. **3D Google Earth Geospatial Export (.kml):**  
   One-click export of war-driving survey traces into Google Earth Pro. Each GPS coordinate is extruded vertically proportionally to measured signal power in dBm.
7. **SIM-less Passive Listening (3GPP Emergency Mode):**  
   Taps into open Broadcast Control Channels (BCCH) mandated by emergency regulations (112/911), enabling radio surveys even with no SIM card inserted.

---

## 🛠️ Hardware Requirements

* **Repurposed USB Radio Modem:** Alcatel OneTouch X602D (*TCT Mobile*, Spreadtrum SC7702 chipset, USB composite ID `VID_1BBB&PID_022C`).
* **Mobile Satellite Probe:** Any standard Android smartphone (tested on Samsung Galaxy A14) running modern Chrome/Samsung Internet via HTML5 Geolocation API without needing third-party native apps.
* **Host Station:** Windows PC running Python 3.10+, FastAPI, and Uvicorn over local HTTPS.

---

## 🔬 Architecture & Signal Processing

### 1. Physical AT Telemetry
* `AT+CSQ`: Raw received signal strength indication converted to real dBm ($\text{dBm} = 2 \times \text{CSQ} - 113$).
* `AT+CCED=0,1`: 3GPP cellular topology extraction:
  - **MCC / MNC**: Mobile Country Code and Network Code (`628-01` Moov, `628-02` Airtel, `628-03` Azur).
  - **LAC**: Location Area Code.
  - **Cell ID**: Unique base station sector identifier.
  - **UARFCN / ARFCN**: Carrier radio channel with real-time frequency computation in MHz.

### 2. Physical vs Data Layer Correlation
* *🟢 Nominal*: Healthy RF signal and responsive mobile latency.
* *🟠 Core Network Congestion*: Strong physical signal ($\ge -85\text{ dBm}$) combined with high latency ($> 250\text{ ms}$) $\rightarrow$ carrier backbone congestion.
* *🔴 RF Attenuation*: Degraded signal ($< -95\text{ dBm}$) caused by physical obstacles or distance.
* *🔵 Dual-Network Compare*: Real-time side-by-side comparison between passive listening and active SIM data.

### 3. Modular Multi-Workspace Cockpit (UI v3)
Eliminates vertical visual clutter and cognitive fatigue through NOC-inspired ergonomics:
* **Persistent Flight HUD**: Top sticky bar continuously displaying live dBm, active operator, GNSS accuracy, and quick actions.
* **5 Dedicated Workspaces (Instant Tab Switching)**:
  - 🗺️ **Map & GIS**: Expansive 75% screen map view with a dedicated right-hand engineering telemetry drawer.
  - ⚡ **Dual-Network Audit**: Full-width side-by-side modem vs SIM 4G comparator with real-time saturation diagnosis.
  - 📊 **Spectrum & Topology**: High-resolution Chart.js time-series graph with neighbor cell table (`AT+CCED=0,2`).
  - 🛡️ **Cybersecurity & Logs**: Anti-IMSI-catcher monitor with acoustic/visual alerts and outage event logs.
  - ⚙️ **AT Console & Hardware**: Alcatel X602D hardware spec sheet and interactive serial Hayes terminal.

---

## 🚀 Quick Start Guide

### 1. Host Station Setup (PC)
1. Plug the Alcatel USB modem into any USB port.
2. Run **`lancer.bat`** (or `python -m uvicorn app:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem`).
3. Open the dashboard at:  
   👉 **`https://127.0.0.1:8000`**

### 2. Smartphone Instant Pairing via Smart QR Code
1. On the PC dashboard, click **`📱 QR Code Mobile`** (or run `tunnel.bat` to launch the Cloudflare secure gateway).
2. Choose your network environment:
   - 🌍 **Nomad 4G Mode (Outdoor / Cellular Data)**: Points to the public HTTPS tunnel. Scanning this at home keeps the connection alive when stepping out onto 4G data!
   - 🏠 **Local Wi-Fi Mode (Indoor)**: Connects directly through your local router IP (`https://192.168.1.x:8000/gps`).
3. Scan with your phone's camera: Radio Sentinel opens instantly with zero typing.
4. Download the QR Code as a high-resolution PNG via **`📥 Save PNG`** for field reference.

---

## 🔌 REST API Endpoints

| Method | Route | Description |
| :---: | :--- | :--- |
| `GET` | `/` | Main command dashboard (Leaflet GIS, live charts, RF cockpit). |
| `GET` | `/gps` | Touch-optimized smartphone probe page for satellite & 4G relay. |
| `POST` | `/api/gps` | Ingests real-time GNSS coordinates and 4G QoS metrics. |
| `GET` | `/api/status` | System health, dynamic local IP detection, and active tunnel state. |
| `POST` | `/api/tunnel` | Registers / updates public nomad tunnel URL (Cloudflare / Ngrok). |
| `DELETE` | `/api/tunnel` | Revokes and resets nomad tunnel status. |
| `GET` | `/api/telemetry/live` | Live telemetry payload (RF signal, hardware, GPS, dual-audit, tower match). |
| `GET` | `/api/telemetry/history` | Rolling historical window for Chart.js. |
| `GET` | `/api/map-points` | Geospatial points with dBm for continuous heatmap rendering. |
| `POST` | `/api/security/simulate-downgrade` | Triggers a simulated 2G Downgrade Attack for demonstration/auditing. |
| `POST` | `/api/security/reset-alert` | Resets cybersecurity alert monitor. |
| `POST` | `/api/clear-points` | Clears stored GPS trajectory points. |
| `GET` | `/api/events` | Outage and reconnection log stream. |
| `POST` | `/api/command` | Raw AT command injection console to the physical modem. |
| `GET` | `/api/export-csv` | Raw telemetry dataset export as CSV. |
| `GET` | `/api/export-kml` | 3D extruded geospatial model for Google Earth Pro. |

---

## 📜 License & Ethics

Radio Sentinel is open-source under the **MIT License**. It complies strictly with 3GPP safety specifications and acts exclusively in passive reception mode or standard authorized cellular interaction.
