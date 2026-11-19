# 📡 Radio Sentinel™ — Cellular Spectrum Intelligence & Telecom Audit Platform

[![Language: FR](https://img.shields.io/badge/Language-Fran%C3%A7ais-blue.svg)](README.md)
[![Language: EN](https://img.shields.io/badge/Language-English-green.svg)](README_EN.md)
[![Platform: Web](https://img.shields.io/badge/Web-Live%20Showcase-purple.svg)](https://gnzikoune.github.io/radio-sentinel/)
[![Docs: Portal](https://img.shields.io/badge/Docs-Official%20Portal-cyan.svg)](https://gnzikoune.github.io/radio-sentinel/docs.html)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal.svg)](https://fastapi.tiangolo.com/)

> **Sovereign cellular spectrum intelligence, 2G/3G/4G radio coverage audit, base station triangulation, and cellular counter-measure (Anti-IMSI Catcher) platform.**  
> Designed for national telecom regulators (ARCEP), mobile network operators (MNOs), enterprise IT directorates (CIO/CTO), and defense/homeland security organizations.  
> **Dual physical probe architecture delivering 100% real empirical RF measurements with zero reliance on paid third-party geolocation APIs.**

---

## 🎯 Key Operational Capabilities

1. **Continuous High-Resolution RF Heatmap & 360° Rotating Radar Sweep:**  
   - **GIS Dynamic Heatmap**: Spatial interpolation along survey routes producing professional-grade coverage gradients (Green / Amber / Red) strictly aligned with 3GPP and regulator standards, layered over Google Satellite HD and OpenStreetMap.
   - **Rotating Radar Sweep & Tactical Custom Icons**: Live 360° sweeping radar beam centered around the mobile probe coordinates, coupled with distinctive vector icons for the mobile rover (pulsing tactical reticle), estimated towers (golden lattice with radiating RF waves), and official OpenCellID towers (monopole mast with aviation obstruction lights and operator color-coding).
2. **Base Station Identification & Real-Power Triangulation:**  
   - **Weighted Real-Power Centroid ($10^{\text{dBm}/10}\text{ mW}$)**: Calculates the physical energy center of gravity to pinpoint base stations accurately even in dense multipath urban corridors.
   - **Integrated Gabon OpenCellID Registry (MCC 628)**: Instant matching against official tower databases for Moov Africa (`MNC 01`), Airtel Gabon (`MNC 02`), and Azur (`MNC 03`).
   - **Haversine Geodesic Sanity Check**: Automatic rejection of spurious cell associations due to Cell ID reuse across distant provinces (`HIGH` < 5 km, `MEDIUM` < 25 km, `LOW` > 25 km).
   - **Live Vector Beam**: Dynamic vector directly connecting the mobile terminal to the serving cell tower.
3. **Dual-Network Audit & Active 4G Mobile QoS Correlation:**  
   Simultaneous monitoring of two operators: passive physical spectrum listening via the RF USB probe alongside active real-world data throughput and latency measurements on the smartphone's active SIM card (downlink Mbps, RTT latency, server ping).
4. **Cybersecurity & Rogue Base Station Defense (Anti IMSI-Catcher):**  
   Continuous physical layer integrity monitoring: immediate alert triggers on forced **2G Downgrade Attacks** with power surges. Advanced filtering algorithm shielding against sentinel transition false-positives (-113 dBm).
5. **Executive Telecom Audit Report Generator (PDF / Print):**  
   One-click generation at `/audit-report` of formal telecom compliance reports (SLA coverage percentage, ARCEP signal tiers, cell tower inventory, multi-operator comparison, and verified network outage isolation).
6. **Modular Multi-Workspace Cockpit v3:**  
   Aeronautical engineering cockpit separating the persistent Flight HUD (vital telemetry always visible) from 5 specialized operational workspaces (GIS Map, Dual-Network Audit, Spectrum Waterfall, Cybersecurity, AT Command Console).
7. **Smart QR Nomad 4G Pairing & Encrypted Tunnels:**  
   Zero manual URL typing on mobile devices. Automatic detection between Nomad 4G field mode (Cloudflare / Ngrok encrypted tunnel) and local Wi-Fi laboratory mode, complete with one-click PNG QR export.
8. **3D Google Earth Geospatial Export (.kml) & CSV:**  
   Volumetric ribbon and extruded column export into Google Earth Pro with each GPS coordinate extruded proportionally to received radio power in dBm.

---

## 🏗️ System Architecture

```text
  ┌───────────────────────────────────────────────────────────────┐
  │                      FIELD ACQUISITION                        │
  ├────────────────────────────────┬──────────────────────────────┤
  │    Physical RF Probe           │    Mobile GNSS / Data Probe  │
  │    Alcatel OneTouch X602D      │    Samsung Galaxy A14        │
  │    (Serial COMx - AT Commands) │    (HTML5 Geo / HTTPS)       │
  └────────────────┬───────────────┴──────────────┬───────────────┘
                   │ Raw RF Telemetry (CSQ, CCED) │ GPS Coordinates + QoS
                   ▼                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                 RADIO SENTINEL™ CORE (FastAPI)                │
  ├───────────────────────────────────────────────────────────────┤
  │  • modem_service.py   : 3GPP AT decoder & Anti-IMSI engine    │
  │  • gps_service.py     : GNSS synch & QoS measurement broker   │
  │  • opencellid_service : Local Gabon base station db (MCC 628) │
  │  • database.py        : SQLite spatial-temporal persistence   │
  │  • kml_service.py     : 3D Google Earth volumetric KML engine │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                 MODULAR COCKPIT v3 INTERFACE                  │
  ├───────────────────────────────────────────────────────────────┤
  │  • Persistent Flight HUD (COM, dBm, PLMN, GPS Fix)            │
  │  • Workspace 1 : Interactive GIS Map & Satellite HD           │
  │  • Workspace 2 : Dual-Network Physical vs Data Audit          │
  │  • Workspace 3 : Real-time Rolling Spectrum Chart             │
  │  • Workspace 4 : Cybersecurity & Anti-Downgrade Defense       │
  │  • Workspace 5 : Direct AT Command Engineering Console        │
  │  • Module 6    : Executive Audit Report Generator (PDF)       │
  └───────────────────────────────────────────────────────────────┘
```

---

## 🔌 REST API Specification

| Method | Endpoint | Operational Role |
|---|---|---|
| `GET` | `/api/status` | Global station health, local IP auto-discovery, nomad tunnel status. |
| `GET` | `/api/telemetry/live` | Complete real-time payload (physical RF, cell topology, GNSS, QoS). |
| `GET` | `/api/telemetry/history` | Rolling historical window for Chart.js spectral viewer. |
| `GET` | `/api/map-points` | Geospatial survey samples for GIS heatmap and route plotting. |
| `GET` | `/api/events` | Operational audit log (outages, reconnections, security alerts). |
| `GET` | `/api/audit-report` | Compiled statistics for the executive telecom audit report. |
| `GET` | `/audit-report` | Official executive audit report webpage ready for PDF printing. |
| `GET` | `/api/export-kml` | 3D Google Earth volumetric KML file extruded by dBm power. |
| `GET` | `/api/export-csv` | Full tabular export compatible with GIS software (QGIS, ArcGIS). |
| `POST` | `/api/gps` | Ingestion of GNSS coordinates and active mobile data metrics. |
| `POST` | `/api/tunnel` | Dynamic registration of public Nomad 4G tunnel URL. |
| `DELETE` | `/api/tunnel` | Revocation and closing of remote tunnel state. |
| `POST` | `/api/at-command` | Direct AT command dispatch to the modem with response capture. |

---

## 🔒 Intellectual Property & Commercial License

**Radio Sentinel™** is proprietary software protected under international copyright and intellectual property treaties.  
**Copyright © 2026 Gildas Nzikoune. All Rights Reserved.**

Any reproduction, decompilation, unauthorized modification, distribution, or commercial exploitation is strictly prohibited without prior written authorization.

For commercial licensing, institutional deployment, and custom mission integration:  
📧 Contact: [gildas.nzikoune@gmail.com](mailto:gildas.nzikoune@gmail.com)  
🌐 Online Documentation Portal: [https://gnzikoune.github.io/radio-sentinel/docs.html](https://gnzikoune.github.io/radio-sentinel/docs.html)
