// Chart.js & Leaflet instances
let signalChart = null;
let leafletMap = null;
let currentPositionMarker = null;
let currentAccuracyCircle = null;
let mapPointsLayer = null;
let heatLayer = null;
let isHeatmapActive = true;
let towerLayer = null;
let officialTowerLayer = null;
let nearbyTowersLayer = null;
let estimatedTowerLatLng = null;
let hasCenteredOnGPS = false;
let radarSweepMarker = null;
let isRadarActive = true;

// Tile Layer References
let tileLayers = {};
let activeTileKey = 'satellite';

const MAX_CHART_POINTS = 30;
let chartLabels = [];
let chartDataPoints = [];

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('signalChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    signalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Puissance (dBm)',
                data: chartDataPoints,
                borderColor: '#06b6d4',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#22d3ee',
                pointBorderColor: '#0f172a',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
                x: {
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'JetBrains Mono', size: 10 },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    min: -115,
                    max: -50,
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'JetBrains Mono', size: 10 },
                        callback: function(v) { return v + ' dBm'; }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderWidth: 1,
                    titleFont: { family: 'JetBrains Mono', size: 11 },
                    bodyFont: { family: 'JetBrains Mono', size: 12 },
                    callbacks: {
                        label: function(ctx) { return `Signal : ${ctx.parsed.y} dBm`; }
                    }
                }
            }
        }
    });
}

// =========================================================================
// FABRIQUE D'ICÔNES ET RADAR TACTIQUES LEAFLET
// =========================================================================

// 1. Balayage Radar Tournant autour de la position de la sonde mobile
function createRadarSweepIcon() {
    const html = `
        <div class="radar-sweep-container">
            <div class="radar-scope">
                <div class="radar-sweep-beam"></div>
                <div class="radar-ring-1"></div>
                <div class="radar-ring-2"></div>
                <div class="radar-ring-3"></div>
                <div class="radar-axis-h"></div>
                <div class="radar-axis-v"></div>
                <div class="radar-tag top">500m</div>
                <div class="radar-tag right">250m</div>
            </div>
        </div>
    `;
    return L.divIcon({
        className: 'custom-leaflet-icon radar-sweep-marker',
        html: html,
        iconSize: [280, 280],
        iconAnchor: [140, 140]
    });
}

// 2. Icône Tactique de la Sonde Mobile / Rover (Ma Position GPS)
function createUserRoverIcon() {
    const html = `
        <div class="custom-user-marker">
            <div class="user-pulse-ring"></div>
            <div class="user-pulse-ring-outer"></div>
            <div class="user-beacon-center">
                <svg viewBox="0 0 36 36" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="14" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3, 2.5" opacity="0.85"/>
                    <circle cx="18" cy="18" r="9.5" fill="rgba(15, 23, 42, 0.95)" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="18" cy="18" r="4.5" fill="#38bdf8"/>
                    <circle cx="18" cy="18" r="2" fill="#ffffff"/>
                    <line x1="18" y1="2" x2="18" y2="6.5" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="18" y1="29.5" x2="18" y2="34" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="2" y1="18" x2="6.5" y2="18" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="29.5" y1="18" x2="34" y2="18" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            </div>
        </div>
    `;
    return L.divIcon({
        className: 'custom-leaflet-icon user-rover-icon',
        html: html,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

// 3. Icône de Pylône Estimé par Barycentre Énergétique
function createEstimatedTowerIcon() {
    const html = `
        <div class="custom-pylone-wrapper estimated">
            <div class="pylone-icon-body">
                <svg viewBox="0 0 48 54" width="40" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Ondes rayonnantes gauches et droites -->
                    <path d="M11 18 C6 23 6 31 11 36" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" class="pylone-wave-1"/>
                    <path d="M5 13 C-1 21 -1 33 5 41" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" opacity="0.6" class="pylone-wave-2"/>
                    <path d="M37 18 C42 23 42 31 37 36" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" class="pylone-wave-1"/>
                    <path d="M43 13 C49 21 49 33 43 41" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" opacity="0.6" class="pylone-wave-2"/>
                    
                    <!-- Pylône Treillis -->
                    <path d="M24 10 L15 50 L33 50 Z" fill="rgba(15, 23, 42, 0.92)" stroke="#fbbf24" stroke-width="2.2" stroke-linejoin="round"/>
                    <path d="M18 42 L30 42 M19 34 L29 34 M21 26 L27 26 M22 18 L26 18" stroke="#fbbf24" stroke-width="1.6"/>
                    <path d="M18 42 L29 34 M30 42 L19 34 M19 34 L27 26 M29 34 L21 26" stroke="#d97706" stroke-width="1.2"/>
                    
                    <!-- Sommet & Émetteur Radio -->
                    <line x1="24" y1="4" x2="24" y2="10" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="24" cy="4" r="3" fill="#fef08a" stroke="#d97706" stroke-width="1.5"/>
                    <line x1="19" y1="10" x2="29" y2="10" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="pylone-badge estimated">Barycentre</div>
        </div>
    `;
    return L.divIcon({
        className: 'custom-leaflet-icon estimated-tower-icon',
        html: html,
        iconSize: [40, 52],
        iconAnchor: [20, 46],
        popupAnchor: [0, -46]
    });
}

// 4. Icône de Pylône Officiel Référencé (OpenCellID & Détection Radar)
function createOfficialTowerIcon(opName, confidence, isServing = false, distanceM = null) {
    let opClass = 'fallback';
    let opLower = (opName || '').toLowerCase();
    if (opLower.includes('moov') || opLower.includes('gabon telecom')) opClass = 'moov';
    else if (opLower.includes('airtel')) opClass = 'airtel';
    else if (opLower.includes('azur')) opClass = 'azur';
    else if (confidence === 'LOW') opClass = 'fallback';

    let label = 'Pylône';
    if (opClass === 'moov') label = 'Moov';
    else if (opClass === 'airtel') label = 'Airtel';
    else if (opClass === 'azur') label = 'Azur';

    if (isServing) {
        label = `★ ${label}`;
    } else if (distanceM) {
        label = `${label} (${distanceM}m)`;
    }

    const servingClass = isServing ? 'active-serving' : '';

    const html = `
        <div class="custom-pylone-wrapper official ${opClass} ${servingClass}">
            <!-- Echo / Ping Sonar du radar -->
            <div class="radar-ping-echo"></div>
            <div class="pylone-icon-body">
                <svg viewBox="0 0 48 54" width="40" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Ondes sectorielles -->
                    <path d="M10 16 C6 22 6 32 10 38" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="pylone-wave-1"/>
                    <path d="M38 16 C42 22 42 32 38 38" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="pylone-wave-1"/>
                    
                    <!-- Mât Monopole télécom -->
                    <rect x="22.5" y="10" width="3" height="40" rx="1.5" fill="currentColor"/>
                    <path d="M12 50 L36 50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    <path d="M15 50 L24 28 L33 50" stroke="currentColor" stroke-width="1.8"/>
                    
                    <!-- Supports d'antennes sectorielles -->
                    <rect x="15" y="14" width="18" height="4" rx="1" fill="#0f172a" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="14" y="11" width="3.5" height="10" rx="1" fill="currentColor"/>
                    <rect x="30.5" y="11" width="3.5" height="10" rx="1" fill="currentColor"/>
                    <rect x="22" y="7" width="4" height="11" rx="1" fill="currentColor"/>
                    
                    <!-- Feu d'obstacle aérien clignotant -->
                    <circle cx="24" cy="4" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="1" class="tower-light-blink"/>
                </svg>
            </div>
            <div class="pylone-badge official ${servingClass}">${label}</div>
        </div>
    `;
    return L.divIcon({
        className: 'custom-leaflet-icon official-tower-icon',
        html: html,
        iconSize: [40, 52],
        iconAnchor: [20, 46],
        popupAnchor: [0, -46]
    });
}

// 5. Révélation et affichage dynamique des pylônes détectés par le balayage radar
function updateNearbyRadarTowers(nearbyTowers, servingTower, gps) {
    if (!nearbyTowersLayer || !leafletMap) return;
    nearbyTowersLayer.clearLayers();

    if (!nearbyTowers || !nearbyTowers.length) return;

    const servingCell = servingTower ? String(servingTower.cell) : null;
    const detectedCount = nearbyTowers.length;

    // Mise à jour de l'indicateur de statut sous la carte
    const towerStatusEl = document.getElementById('tower-triangulation-status');
    if (towerStatusEl && (!estimatedTowerLatLng || geoSpread < MIN_SPREAD_FOR_TOWER)) {
        towerStatusEl.innerHTML = `🌀 Balayage Radar : <strong class="text-cyan-400 font-bold">${detectedCount} pylône(s)</strong> détecté(s) dans le secteur`;
    }

    nearbyTowers.forEach(tow => {
        const towLatLng = [tow.lat, tow.lon];
        const isServing = (servingCell && String(tow.cell) === servingCell);

        // Si c'est l'antenne active et qu'elle est déjà gérée par officialTowerLayer, on n'ajoute pas de doublon
        if (isServing && servingTower) {
            return;
        }

        const conf = 'HIGH';
        const distM = tow.distance_m;
        const bearing = tow.bearing_deg;

        // Marqueur avec l'icône de pylône dédiée
        const marker = L.marker(towLatLng, {
            icon: createOfficialTowerIcon(tow.operator_name || tow.site_name, conf, false, distM),
            zIndexOffset: 920
        });

        // Cercle d'écho radar autour du pylône découvert
        const echoCircle = L.circle(towLatLng, {
            radius: Math.min(250, (tow.range || 800) / 3),
            color: '#06b6d4',
            fillColor: '#06b6d4',
            fillOpacity: 0.06,
            weight: 1,
            dashArray: '3, 4'
        });

        const distTxt = distM !== null ? `${distM} m (Azimut ${bearing !== null ? bearing + '°' : '--'})` : 'En attente GPS';

        marker.bindPopup(`
            <div class="font-sans text-xs leading-relaxed">
                <div class="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[11px] mb-1">
                    <span>🗼</span> Pylône Détecté par Radar
                </div>
                <strong class="text-slate-100 text-sm">${tow.site_name || 'Antenne Relais'}</strong><br>
                <span class="text-cyan-300 font-mono font-bold">${tow.operator_name}</span> • <span class="text-slate-400 font-mono">${tow.radio}</span><br>
                <div class="my-1">
                    <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">🌀 Écho Radar Confirmé</span>
                </div>
                <span class="text-emerald-400 font-mono font-bold">📍 Distance : ${distTxt}</span><br>
                <span class="text-slate-300 font-mono text-[10px]">Cell ID : <strong class="text-cyan-300">${tow.cell}</strong> • LAC : ${tow.area}</span><br>
                <span class="text-slate-500 font-mono text-[10px]">Coordonnées : ${tow.lat.toFixed(5)}, ${tow.lon.toFixed(5)}</span>
            </div>
        `);

        nearbyTowersLayer.addLayer(echoCircle);
        nearbyTowersLayer.addLayer(marker);
    });
}

// Initialize Leaflet 2D Map with Multi-View (Satellite, Dark, Streets, Topo)
function initMap() {
    const defaultLat = 0.4162;
    const defaultLon = 9.4673;

    leafletMap = L.map('map', {
        zoomControl: true,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 3
    }).setView([defaultLat, defaultLon], 14);

    // 1. Définition des différentes couches de tuiles (100% SANS CLÉ API)
    tileLayers = {
        // Vue Satellite Google Hybride — {s} active la rotation sur mt0/mt1/mt2/mt3 pour paralléliser les requêtes
        satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 22,
            maxNativeZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            tileSize: 256,
            detectRetina: true,
            crossOrigin: true
        }),
        // Vue Satellite Pure (sans labels) — fallback si hybrid ne charge pas
        satellite_pure: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 22,
            maxNativeZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            tileSize: 256,
            detectRetina: true,
            crossOrigin: true
        }),
        // Vue Sombre / Nuit (CartoDB Dark Matter haute précision)
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 22,
            maxNativeZoom: 19,
            subdomains: 'abcd',
            tileSize: 256
        }),
        // Vue Rues / Cadastre Standard (OpenStreetMap)
        streets: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            maxNativeZoom: 19,
            tileSize: 256
        }),
        // Vue Topographique / Relief (OpenTopoMap)
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            maxNativeZoom: 17,
            subdomains: ['a', 'b', 'c'],
            tileSize: 256
        })
    };

    // Activer la vue Satellite par défaut
    setMapView('satellite');

    // Échelle métrique en bas à gauche
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(leafletMap);

    // Groupes de calques pour la Heatmap continue, l'antenne et les balises
    heatLayer = L.layerGroup().addTo(leafletMap);
    officialTowerLayer = L.layerGroup().addTo(leafletMap);
    nearbyTowersLayer = L.layerGroup().addTo(leafletMap);
    towerLayer = L.layerGroup().addTo(leafletMap);
    mapPointsLayer = L.layerGroup().addTo(leafletMap);

    setupMapControls();
}

// Switch between map views
function setMapView(key) {
    if (!tileLayers[key] || !leafletMap) return;

    // Retirer les anciennes couches
    Object.values(tileLayers).forEach(layer => {
        if (leafletMap.hasLayer(layer)) leafletMap.removeLayer(layer);
    });

    const mapEl = document.getElementById('map');
    if (mapEl) {
        mapEl.classList.remove('dark-tiles');
    }

    tileLayers[key].addTo(leafletMap);
    activeTileKey = key;

    // Mettre à jour l'apparence des boutons
    ['satellite', 'satellite_pure', 'dark', 'streets', 'topo'].forEach(k => {
        const btn = document.getElementById(`btn-view-${k}`);
        if (btn) {
            if (k === key) {
                btn.className = "px-2.5 py-1 rounded-md text-xs font-semibold transition bg-cyan-600 text-white shadow";
            } else {
                btn.className = "px-2.5 py-1 rounded-md text-xs font-semibold transition text-slate-400 hover:text-white";
            }
        }
    });
}

// Setup buttons and GIS controls
function setupMapControls() {
    // Boutons de changement de vue
    ['satellite', 'satellite_pure', 'dark', 'streets', 'topo'].forEach(k => {
        const btn = document.getElementById(`btn-view-${k}`);
        if (btn) {
            btn.addEventListener('click', () => setMapView(k));
        }
    });

    // Bouton Toggle Heatmap Continue
    const btnHeatmap = document.getElementById('btn-toggle-heatmap');
    if (btnHeatmap) {
        btnHeatmap.addEventListener('click', () => {
            isHeatmapActive = !isHeatmapActive;
            if (isHeatmapActive) {
                btnHeatmap.className = "px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 transition flex items-center gap-1 font-semibold";
                btnHeatmap.innerHTML = "🔥 Carte Thermique (ON)";
            } else {
                btnHeatmap.className = "px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition flex items-center gap-1 font-semibold";
                btnHeatmap.innerHTML = "🔥 Carte Thermique (OFF)";
            }
            loadMapPoints();
        });
    }

    // Centrer sur le mobile
    const btnRecenter = document.getElementById('btn-recenter');
    if (btnRecenter) {
        btnRecenter.addEventListener('click', () => {
            if (currentPositionMarker) {
                leafletMap.setView(currentPositionMarker.getLatLng(), 16);
            } else {
                alert("En attente de la position GPS du Samsung...");
            }
        });
    }

    // Activer / Désactiver le balayage radar tournant autour de la position
    const btnToggleRadar = document.getElementById('btn-toggle-radar');
    if (btnToggleRadar) {
        btnToggleRadar.addEventListener('click', () => {
            isRadarActive = !isRadarActive;
            if (isRadarActive) {
                btnToggleRadar.className = "px-2.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1 font-semibold";
                btnToggleRadar.innerHTML = "🌀 Radar (ON)";
                if (currentPositionMarker) {
                    const latLng = currentPositionMarker.getLatLng();
                    if (!radarSweepMarker) {
                        radarSweepMarker = L.marker(latLng, {
                            icon: createRadarSweepIcon(),
                            interactive: false,
                            zIndexOffset: 100
                        }).addTo(leafletMap);
                    } else {
                        radarSweepMarker.setLatLng(latLng);
                        if (!leafletMap.hasLayer(radarSweepMarker)) {
                            radarSweepMarker.addTo(leafletMap);
                        }
                    }
                }
            } else {
                btnToggleRadar.className = "px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white transition flex items-center gap-1 font-semibold";
                btnToggleRadar.innerHTML = "🌀 Radar (OFF)";
                if (radarSweepMarker && leafletMap.hasLayer(radarSweepMarker)) {
                    leafletMap.removeLayer(radarSweepMarker);
                }
            }
        });
    }

    // Centrer sur l'antenne-relais (Point Jaune)
    const btnCenterTower = document.getElementById('btn-center-tower');
    if (btnCenterTower) {
        btnCenterTower.addEventListener('click', () => {
            if (estimatedTowerLatLng) {
                leafletMap.setView(estimatedTowerLatLng, 17);
            } else {
                alert("L'antenne-relais n'a pas encore pu être triangulée. Vous devez vous déplacer d'au moins 50 mètres avec votre mobile pour estimer la zone de plus forte réception.");
            }
        });
    }

    // Bouton Réinitialiser le tracé
    const btnClear = document.getElementById('btn-clear-trail');
    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            if (confirm("Voulez-vous effacer le tracé des points précédents sur la carte pour repartir de zéro ?")) {
                await fetch('/api/clear-points', { method: 'POST' });
                await loadMapPoints();
            }
        });
    }

    // Bouton Plein Écran
    const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
    const mapCard = document.getElementById('map-section-card');
    const mapEl = document.getElementById('map');
    let isFullscreen = false;

    // Contrôles de simulation Cyber-Sécurité (IMSI-Catcher / 2G Downgrade)
    const btnSimulate = document.getElementById('btn-sec-simulate');
    const btnResetSec = document.getElementById('btn-sec-reset');
    if (btnSimulate) {
        btnSimulate.addEventListener('click', async () => {
            await fetch('/api/security/simulate-downgrade', { method: 'POST' });
            updateEvents();
        });
    }
    if (btnResetSec) {
        btnResetSec.addEventListener('click', async () => {
            await fetch('/api/security/reset-alert', { method: 'POST' });
            updateEvents();
        });
    }

    if (btnFullscreen && mapCard && mapEl) {
        btnFullscreen.addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            if (isFullscreen) {
                mapCard.classList.add('fixed', 'inset-0', 'z-50', 'rounded-none', 'p-4', 'h-screen');
                mapEl.style.height = 'calc(100vh - 120px)';
                btnFullscreen.textContent = '✕ Quitter Plein Écran';
                btnFullscreen.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs transition';
            } else {
                mapCard.classList.remove('fixed', 'inset-0', 'z-50', 'rounded-none', 'p-4', 'h-screen');
                mapEl.style.height = '480px';
                btnFullscreen.textContent = '⛶';
                btnFullscreen.className = 'px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition';
            }
            setTimeout(() => leafletMap.invalidateSize(), 300);
        });
    }
}

// Load historical telemetry data for chart
async function loadHistory() {
    try {
        const res = await fetch('/api/telemetry/history?limit=30');
        const data = await res.json();
        
        chartLabels.length = 0;
        chartDataPoints.length = 0;

        data.forEach(item => {
            if (item.timestamp && item.dbm !== null && item.dbm !== undefined) {
                const timeStr = item.timestamp.split('T')[1]?.substring(0, 8) || item.timestamp;
                chartLabels.push(timeStr);
                chartDataPoints.push(item.dbm);
            }
        });

        if (signalChart) signalChart.update();
    } catch (e) {
        console.error('Erreur historique:', e);
    }
}

// Distance en mètres entre deux coordonnées géographiques (Formule de Haversine)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Load and draw points on the Leaflet Map + Antenna Tower (Point Jaune) + Heatmap continue
async function loadMapPoints() {
    if (!leafletMap || !mapPointsLayer || !towerLayer) return;

    try {
        const res = await fetch('/api/map-points?limit=1000');
        const points = await res.json();

        if (heatLayer) heatLayer.clearLayers();
        mapPointsLayer.clearLayers();
        towerLayer.clearLayers();

        let heatPoints = [];
        let bestPoint = null;
        let maxDbm = -999;
        let lastFilteredLat = null;
        let lastFilteredLon = null;

        points.forEach((pt, idx) => {
            if (pt.latitude && pt.longitude && pt.dbm !== null) {
                // Trouver le point avec le meilleur signal (pour l'antenne-relais)
                if (pt.dbm > maxDbm) {
                    maxDbm = pt.dbm;
                    bestPoint = pt;
                }

                // Alimenter la Heatmap RF (Interpolation de surface Krigeage continue)
                const intensity = Math.max(0.05, Math.min(1.0, (pt.dbm - (-115)) / (-50 - (-115))));
                heatPoints.push([pt.latitude, pt.longitude, intensity]);

                // FILTRE INTELLIGENT DE DÉRIVE GPS EN INTÉRIEUR :
                // On n'affiche un nouveau point QUE si on s'est déplacé d'au moins 6 mètres
                // (ou si c'est le tout dernier point en cours pour voir la position actuelle)
                if (lastFilteredLat !== null && lastFilteredLon !== null && idx < points.length - 1) {
                    const dist = getDistanceMeters(lastFilteredLat, lastFilteredLon, pt.latitude, pt.longitude);
                    if (dist < 6.0) {
                        return; // Ignore le bruit satellite statique (< 6 mètres)
                    }
                }

                lastFilteredLat = pt.latitude;
                lastFilteredLon = pt.longitude;

                // Code couleur des points de mesure
                let color = '#f43f5e'; // Rouge : Faible (< -90 dBm)
                let label = 'Signal Faible';
                if (pt.dbm >= -75) {
                    color = '#10b981'; // Vert : Excellent (≥ -75 dBm)
                    label = 'Signal Excellent';
                } else if (pt.dbm >= -90) {
                    color = '#f59e0b'; // Ambre : Moyen (-76 à -90 dBm)
                    label = 'Signal Moyen';
                }

                const marker = L.circleMarker([pt.latitude, pt.longitude], {
                    radius: 7,
                    fillColor: color,
                    color: '#ffffff',
                    weight: 1.5,
                    opacity: 0.9,
                    fillOpacity: 0.85
                });

                const time = pt.timestamp?.split('T')[1]?.substring(0, 8) || pt.timestamp;
                const cellInfo = pt.cell_id ? `<br><span class="text-slate-300 font-mono text-[11px]">Cell ID: <strong class="text-cyan-300">${pt.cell_id}</strong> (LAC: ${pt.lac || '--'})</span>` : '';
                const chanInfo = pt.channel ? `<br><span class="text-slate-400 font-mono text-[10px]">Canal Radio: ${pt.channel}</span>` : '';
                const mobile4gInfo = pt.mobile_downlink ? `<br><span class="text-amber-300 font-mono text-[10px]">⚡ 4G Mobile: <strong>${pt.mobile_downlink} Mbps</strong> • Ping: ${pt.mobile_ping || pt.mobile_rtt || '--'} ms (${pt.mobile_operator || 'SIM'})</span>` : '';

                marker.bindPopup(`
                    <div class="font-sans text-xs leading-relaxed">
                        <span class="text-cyan-400 font-bold uppercase text-[10px] tracking-wider">Mesure sur le Terrain</span><br>
                        <strong class="text-slate-100 text-sm">${pt.operator_name || 'Opérateur'}</strong><br>
                        <span class="font-mono font-bold text-sm" style="color: ${color}">${pt.dbm} dBm (${label})</span>
                        ${cellInfo}
                        ${chanInfo}
                        ${mobile4gInfo}<br>
                        <span class="text-slate-300 font-mono">CSQ: ${pt.csq}/31 • ${pt.tech || 'Cellulaire'}</span><br>
                        <span class="text-slate-400 font-mono text-[10px]">${time} • Vitesse: ${Math.round(pt.speed || 0)} km/h</span>
                    </div>
                `);

                mapPointsLayer.addLayer(marker);
            }
        });

        // 1.5. Affichage de la Heatmap continue RF (Diffusion spatiale du champ électromagnétique)
        if (isHeatmapActive && heatPoints.length > 0 && typeof L.heatLayer === 'function') {
            const heat = L.heatLayer(heatPoints, {
                radius: 32,
                blur: 22,
                maxZoom: 18,
                minOpacity: 0.35,
                gradient: {
                    0.05: '#ef4444', // Rouge sang (Zone blanche / signal critique < -100 dBm)
                    0.35: '#f97316', // Orange vif (Signal faible -95 à -85 dBm)
                    0.60: '#eab308', // Jaune doré (Signal moyen -85 à -75 dBm)
                    0.80: '#10b981', // Vert émeraude (Bon signal -75 à -65 dBm)
                    1.00: '#06b6d4'  // Cyan électrique (Signal d'excellence > -65 dBm)
                }
            });
            heatLayer.addLayer(heat);
        }

        // 2. Affichage de l'Antenne-Relais (LE POINT JAUNE BRILLANT 📡)
        // RÈGLE DE TRIANGULATION :
        // Le point jaune ne s'affiche QUE si l'utilisateur s'est déplacé sur une
        // zone d'au moins 50 mètres. Sinon, les mesures viennent toutes du même
        // endroit et le point avec le meilleur signal serait confondu avec la
        // position de l'utilisateur — ce qui est trompeur.

        // Calculer l'étendue géographique des points valides
        const validPts = points.filter(p => p.latitude && p.longitude && p.dbm !== null);
        let geoSpread = 0; // en mètres
        if (validPts.length >= 2) {
            let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
            validPts.forEach(p => {
                if (p.latitude < minLat) minLat = p.latitude;
                if (p.latitude > maxLat) maxLat = p.latitude;
                if (p.longitude < minLon) minLon = p.longitude;
                if (p.longitude > maxLon) maxLon = p.longitude;
            });
            // Distance diagonale de la boîte englobante
            geoSpread = getDistanceMeters(minLat, minLon, maxLat, maxLon);
        }

        const MIN_SPREAD_FOR_TOWER = 50; // mètres minimum avant d'afficher l'antenne estimée

        // Mettre à jour l'indicateur de triangulation dans la légende
        const towerStatusEl = document.getElementById('tower-triangulation-status');

        if (geoSpread >= MIN_SPREAD_FOR_TOWER && validPts.length > 0) {
            // ✅ Zone couverte (≥ 50m) → TRIANGULATION PAR BARYCENTRE PONDÉRÉ RF (Milliwatts)
            // Sélection des meilleurs relevés (jusqu'à 25 points les plus forts)
            const sortedBySignal = [...validPts].sort((a, b) => b.dbm - a.dbm);
            const topPoints = sortedBySignal.slice(0, Math.min(25, sortedBySignal.length));

            // Poids W_i = 10^(dBm / 10) (conversion logarithmique vers puissance physique linéaire en mW)
            const minBatchDbm = topPoints[topPoints.length - 1].dbm;
            let sumWeight = 0;
            let weightedLatSum = 0;
            let weightedLonSum = 0;

            topPoints.forEach(p => {
                const w = Math.pow(10, (p.dbm - minBatchDbm) / 10);
                sumWeight += w;
                weightedLatSum += p.latitude * w;
                weightedLonSum += p.longitude * w;
            });

            const baryLat = weightedLatSum / sumWeight;
            const baryLon = weightedLonSum / sumWeight;
            estimatedTowerLatLng = [baryLat, baryLon];

            // Écart-type / rayon de dispersion pondéré
            let weightedDistSq = 0;
            topPoints.forEach(p => {
                const w = Math.pow(10, (p.dbm - minBatchDbm) / 10);
                const d = getDistanceMeters(baryLat, baryLon, p.latitude, p.longitude);
                weightedDistSq += (d * d) * w;
            });
            const confidenceRadius = Math.max(25, Math.min(120, Math.round(Math.sqrt(weightedDistSq / sumWeight))));

            if (towerStatusEl) {
                towerStatusEl.textContent = `📡 Barycentre RF calculé (Rayon d'incertitude : ±${confidenceRadius} m, ${topPoints.length} relevés)`;
                towerStatusEl.className = 'text-xs text-amber-300 font-mono font-semibold';
            }

            // Halo d'incertitude d'ondes dorées
            const towerHalo = L.circle(estimatedTowerLatLng, {
                radius: confidenceRadius,
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.22,
                weight: 2,
                dashArray: '5, 5'
            });

            // Pylône Émetteur avec icône treillis dédiée et ondes rayonnantes
            const towerMarker = L.marker(estimatedTowerLatLng, {
                icon: createEstimatedTowerIcon(),
                zIndexOffset: 1000
            });

            const topP = topPoints[0];
            towerMarker.bindPopup(`
                <div class="font-sans text-xs leading-relaxed">
                    <div class="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[11px] mb-1">
                        <span class="text-base">📡</span> Pylône Estimé (Barycentre RF)
                    </div>
                    <strong class="text-slate-100 text-sm">${topP.operator_name || 'Opérateur Réseau'}</strong><br>
                    <span class="text-emerald-400 font-mono font-bold">Signal Crête : ${topP.dbm} dBm</span><br>
                    <span class="text-slate-300 font-mono">Cell ID: <strong>${topP.cell_id || '--'}</strong> • LAC: ${topP.lac || '--'}</span><br>
                    <span class="text-amber-300 font-mono text-[10px]">Pondération : ${topPoints.length} relevés en milliwatts (10^(dBm/10))</span><br>
                    <span class="text-slate-400 font-mono text-[10px]">Précision géométrique : ±${confidenceRadius} m</span>
                </div>
            `);

            towerLayer.addLayer(towerHalo);
            towerLayer.addLayer(towerMarker);

        } else {
            // ❌ Zone trop petite → pas encore assez de déplacement pour trianguler
            estimatedTowerLatLng = null;

            if (towerStatusEl) {
                const remaining = Math.max(0, Math.round(MIN_SPREAD_FOR_TOWER - geoSpread));
                if (geoSpread > 0) {
                    towerStatusEl.textContent = `⏳ Triangulation en cours… déplacez-vous encore ~${remaining} m`;
                } else {
                    towerStatusEl.textContent = `⏳ Déplacez-vous pour trianguler l'antenne (≥ 50 m)`;
                }
                towerStatusEl.className = 'text-xs text-slate-400 font-mono';
            }
            // Pas de point jaune → aucun marqueur affiché pour éviter la confusion
        }

    } catch (e) {
        console.error('Erreur chargement points carte:', e);
    }
}

// Update live telemetry & GPS in UI
async function updateTelemetry() {
    try {
        const res = await fetch('/api/telemetry/live');
        const data = await res.json();
        const live = data.live || {};
        const hw = data.hardware || {};
        const gps = data.gps || {};
        const stats = data.stats || {};

        // Hardware details
        if (hw.model && hw.model !== "--") document.getElementById('hw-model').textContent = hw.model;
        if (hw.manufacturer && hw.manufacturer !== "--") document.getElementById('hw-mfg').textContent = hw.manufacturer;
        if (hw.imei && hw.imei !== "--") document.getElementById('hw-imei').textContent = hw.imei;
        if (hw.firmware && hw.firmware !== "--") document.getElementById('hw-fw').textContent = hw.firmware;

        // Auto-detected modem port display
        const badgePort = document.getElementById('badge-port');
        badgePort.textContent = live.port || 'Recherche...';

        // GPS Status Badge (Samsung Galaxy A14)
        const badgeGps = document.getElementById('badge-gps');
        const valCoordinates = document.getElementById('val-coordinates');
        const valSpeedText = document.getElementById('val-speed-text');
        const gpsAccPill = document.getElementById('gps-acc-pill');

        if (gps.connected && gps.latitude && gps.longitude) {
            const acc = gps.accuracy ? Math.round(gps.accuracy) : '?';
            badgeGps.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Samsung A14 (±${acc}m)`;
            badgeGps.className = "text-emerald-400 font-semibold flex items-center gap-1";

            valCoordinates.textContent = `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`;
            valSpeedText.textContent = `Vitesse : ${Math.round(gps.speed || 0)} km/h • Satellite actif`;
            gpsAccPill.textContent = `±${acc} m`;
            gpsAccPill.className = "text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";

            // Marqueur Mobile en direct (Icône Tactique Sonde Mobile)
            const latLng = [gps.latitude, gps.longitude];
            if (!currentPositionMarker) {
                currentPositionMarker = L.marker(latLng, {
                    icon: createUserRoverIcon(),
                    zIndexOffset: 2000
                }).addTo(leafletMap);
                currentPositionMarker.bindPopup(`
                    <div class="font-sans text-xs leading-relaxed">
                        <div class="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[11px] mb-1">
                            <span>🎯</span> Ma Position (Sonde Mobile)
                        </div>
                        <strong class="text-white">Samsung Galaxy A14</strong><br>
                        <span class="text-slate-300 font-mono">Vitesse : ${Math.round(gps.speed || 0)} km/h • Précision : ±${acc} m</span><br>
                        <span class="text-cyan-300 font-mono text-[10px]">${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}</span>
                    </div>
                `);
            } else {
                currentPositionMarker.setLatLng(latLng);
            }

            // Balayage Radar Tournant autour de la position
            if (isRadarActive) {
                if (!radarSweepMarker) {
                    radarSweepMarker = L.marker(latLng, {
                        icon: createRadarSweepIcon(),
                        interactive: false,
                        zIndexOffset: 100
                    }).addTo(leafletMap);
                } else {
                    radarSweepMarker.setLatLng(latLng);
                    if (!leafletMap.hasLayer(radarSweepMarker)) {
                        radarSweepMarker.addTo(leafletMap);
                    }
                }
            } else if (radarSweepMarker && leafletMap.hasLayer(radarSweepMarker)) {
                leafletMap.removeLayer(radarSweepMarker);
            }

            if (gps.accuracy) {
                if (!currentAccuracyCircle) {
                    currentAccuracyCircle = L.circle(latLng, {
                        radius: gps.accuracy,
                        color: '#0284c7',
                        fillColor: '#0284c7',
                        fillOpacity: 0.15,
                        weight: 1
                    }).addTo(leafletMap);
                } else {
                    currentAccuracyCircle.setLatLng(latLng);
                    currentAccuracyCircle.setRadius(gps.accuracy);
                }
            }

            // Auto-center on first GPS fix
            if (!hasCenteredOnGPS) {
                leafletMap.setView(latLng, 16);
                hasCenteredOnGPS = true;
            }
        } else {
            badgeGps.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> En attente du mobile`;
            badgeGps.className = "text-amber-400 font-semibold flex items-center gap-1";
            valCoordinates.textContent = "En attente GPS...";
            valSpeedText.textContent = "Ouvrez /gps sur le Samsung";
            gpsAccPill.textContent = "--";
            gpsAccPill.className = "text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700";
        }

        // Live RF Signal values
        const dbmEl = document.getElementById('val-dbm');
        const csqEl = document.getElementById('val-csq');
        const barSignal = document.getElementById('bar-signal');
        const qualityPill = document.getElementById('quality-pill');

        if (live.dbm !== null && live.csq !== null && live.connected) {
            dbmEl.textContent = live.dbm;
            csqEl.textContent = live.csq;
            
            const percent = Math.min(100, Math.max(0, Math.round((live.csq / 31) * 100)));
            barSignal.style.width = percent + '%';

            qualityPill.textContent = live.quality_label || 'Mesure active';
            if (live.csq >= 20) {
                qualityPill.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
                barSignal.className = "bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500";
            } else if (live.csq >= 14) {
                qualityPill.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30";
                barSignal.className = "bg-cyan-500 h-full rounded-full transition-all duration-500";
            } else if (live.csq >= 9) {
                qualityPill.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30";
                barSignal.className = "bg-amber-500 h-full rounded-full transition-all duration-500";
            } else {
                qualityPill.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30";
                barSignal.className = "bg-rose-500 h-full rounded-full transition-all duration-500";
            }

            if (live.timestamp) {
                const timeStr = live.timestamp.split('T')[1]?.substring(0, 8) || '';
                if (chartLabels.length === 0 || chartLabels[chartLabels.length - 1] !== timeStr) {
                    chartLabels.push(timeStr);
                    chartDataPoints.push(live.dbm);
                    if (chartLabels.length > MAX_CHART_POINTS) {
                        chartLabels.shift();
                        chartDataPoints.shift();
                    }
                    if (signalChart) signalChart.update();
                }
            }
        } else {
            dbmEl.textContent = '--';
            csqEl.textContent = '--';
            barSignal.style.width = '0%';
            qualityPill.textContent = live.quality_label || 'En attente...';
            qualityPill.className = "text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400 border border-slate-700";
        }

        // Operator details
        if (live.operator_name) {
            document.getElementById('val-operator').textContent = live.operator_name;
        }
        if (live.operator_code) {
            document.getElementById('val-mcc-mnc').textContent = `Code: ${live.operator_code}`;
            if (live.operator_code.startsWith('628')) {
                document.getElementById('val-country').textContent = 'Gabon (628)';
            } else {
                document.getElementById('val-country').textContent = `Pays ${live.operator_code.substring(0, 3)}`;
            }
        }

        // Topologie 3GPP : Cell ID, LAC, Canal UARFCN & Fréquence physique
        const valCellId = document.getElementById('val-cell-id');
        const valLacChan = document.getElementById('val-lac-channel');
        const valNeighbors = document.getElementById('val-neighbors-badge');
        const hwCellId = document.getElementById('hw-cell-id');
        const hwFreq = document.getElementById('hw-freq');

        if (live.cell_id && live.cell_id !== "--") {
            const hexCi = "0x" + parseInt(live.cell_id).toString(16).toUpperCase();
            if (valCellId) valCellId.textContent = `Cell ID: ${live.cell_id}`;
            if (hwCellId) hwCellId.textContent = `${live.cell_id} (${hexCi})`;
        } else {
            if (valCellId) valCellId.textContent = "Cell ID: --";
        }

        if (live.channel && live.channel !== "--") {
            const freqStr = live.freq_mhz ? ` (${live.freq_mhz} MHz)` : '';
            if (valLacChan) valLacChan.textContent = `LAC: ${live.lac || '--'} • CH: ${live.channel}${freqStr}`;
            if (hwFreq) hwFreq.textContent = `CH ${live.channel}${freqStr}`;
        } else {
            if (valLacChan) valLacChan.textContent = `LAC: ${live.lac || '--'} • UARFCN: --`;
        }

        if (live.neighbors && Array.isArray(live.neighbors)) {
            const count = live.neighbors.length;
            if (valNeighbors) {
                valNeighbors.textContent = `${count} voisine(s)`;
                valNeighbors.className = count > 0 
                    ? "px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 text-[10px] font-bold"
                    : "px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]";
            }
        }

        // Pylône Officiel Référencé (Base OpenCellID Gabon) & GIS Sanity Check
        const valTowerBox = document.getElementById('val-tower-box');
        const valTowerName = document.getElementById('val-tower-name');

        if (officialTowerLayer) officialTowerLayer.clearLayers();
        if (data.official_tower && leafletMap) {
            const tow = data.official_tower;
            const towLatLng = [tow.lat, tow.lon];
            const conf = tow.confidence || 'UNKNOWN';

            // Affichage dans la carte Opérateur & Pylône
            if (valTowerBox && valTowerName) {
                valTowerBox.classList.remove('hidden');
                let confBadge = '';
                if (conf === 'HIGH') confBadge = ' <span class="text-emerald-400 font-bold">[Vérifié]</span>';
                else if (conf === 'MEDIUM') confBadge = ' <span class="text-amber-400 font-bold">[Rural]</span>';
                else if (conf === 'LOW') confBadge = ' <span class="text-rose-400 font-bold">[Indicatif]</span>';
                valTowerName.innerHTML = `🏢 ${tow.site_name || 'Pylône Référencé'}${confBadge}`;
            }

            const markerColor = conf === 'LOW' ? '#f59e0b' : '#06b6d4';

            // Pylône Officiel OpenCellID avec icône télécom dédiée
            const offMarker = L.marker(towLatLng, {
                icon: createOfficialTowerIcon(tow.site_name || tow.operator_name || '', conf),
                zIndexOffset: 950
            });

            const offRadius = L.circle(towLatLng, {
                radius: tow.range || 1000,
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '3, 6'
            });

            let confLabel = '';
            if (conf === 'HIGH') {
                confLabel = '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">✅ Cellule locale confirmée (&lt; 5 km)</span>';
            } else if (conf === 'MEDIUM') {
                confLabel = '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">⚠️ Couverture rurale / longue portée (&lt; 25 km)</span>';
            } else if (conf === 'LOW') {
                confLabel = '<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">🔴 Cell ID réutilisé dans un autre secteur</span>';
            }

            if (gps && gps.latitude && gps.longitude) {
                const distToTow = tow.distance_m || Math.round(getDistanceMeters(gps.latitude, gps.longitude, tow.lat, tow.lon));
                const beamLine = L.polyline([[gps.latitude, gps.longitude], towLatLng], {
                    color: markerColor,
                    weight: 2,
                    opacity: 0.7,
                    dashArray: '6, 6'
                });
                officialTowerLayer.addLayer(beamLine);

                offMarker.bindPopup(`
                    <div class="font-sans text-xs leading-relaxed">
                        <div class="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[11px] mb-1">
                            <span class="text-base">🏢</span> Pylône Officiel (OpenCellID Gabon)
                        </div>
                        <strong class="text-slate-100 text-sm">${tow.site_name || 'Site Pylône Officiel'}</strong><br>
                        <div class="my-1">${confLabel}</div>
                        <span class="text-slate-300 font-mono">Cell ID: <strong class="text-cyan-300">${tow.cell}</strong> • LAC: ${tow.area}</span><br>
                        <span class="text-emerald-400 font-mono font-bold">Distance de vous : ${distToTow} m</span><br>
                        <span class="text-slate-400 font-mono text-[10px]">Norme : ${tow.radio} • Rayon cellulaire : ${tow.range} m</span>
                    </div>
                `);
            } else {
                offMarker.bindPopup(`
                    <div class="font-sans text-xs leading-relaxed">
                        <strong class="text-slate-100 text-sm">${tow.site_name || 'Site Pylône Officiel'}</strong><br>
                        <span class="text-slate-300 font-mono">Cell ID: ${tow.cell} • LAC: ${tow.area}</span>
                    </div>
                `);
            }

            officialTowerLayer.addLayer(offRadius);
            officialTowerLayer.addLayer(offMarker);
        } else {
            if (valTowerBox && valTowerName && data.tower_match_note) {
                valTowerBox.classList.remove('hidden');
                valTowerName.innerHTML = `⚠️ <span class="text-amber-300">${data.tower_match_note}</span>`;
            }
        }

        // Détection et affichage des antennes-relais environnantes dans le balayage radar
        if (data.nearby_towers && leafletMap) {
            updateNearbyRadarTowers(data.nearby_towers, data.official_tower, gps);
        }

        // 7. Surveillance Cyber-Sécurité & Détection Faux Relais (IMSI-Catcher / 2G Downgrade)
        const secBanner = document.getElementById('security-monitor-banner');
        const secPill = document.getElementById('sec-pill');
        const secDetails = document.getElementById('sec-details');
        const secIconBox = document.getElementById('sec-icon-box');
        const btnReset = document.getElementById('btn-sec-reset');

        if (live.security && secBanner && secPill) {
            const sec = live.security;
            if (sec.status === "ALERT") {
                secBanner.className = "p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-pulse";
                secPill.className = "px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-rose-600 text-white border border-rose-400";
                secPill.innerHTML = "🚨 ALERTE INTERCEPTION";
                secDetails.textContent = sec.message || "Rétrogradation 2G anormale détectée !";
                secDetails.className = "text-xs text-rose-300 font-bold mt-0.5";
                secIconBox.className = "flex-shrink-0 w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-bounce";
                if (btnReset) btnReset.style.display = "inline-flex";
            } else if (sec.status === "WARNING") {
                secBanner.className = "p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300";
                secPill.className = "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30";
                secPill.innerHTML = "⚠️ VULNÉRABILITÉ 2G";
                secDetails.textContent = sec.message || "Mode 2G actif (chiffrement faible)";
                secDetails.className = "text-xs text-amber-300 mt-0.5";
                secIconBox.className = "flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400";
                if (btnReset) btnReset.style.display = "inline-flex";
            } else {
                secBanner.className = "p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300";
                secPill.className = "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                secPill.innerHTML = "🛡️ INTÉGRITÉ NOMINALE";
                secDetails.textContent = "Chiffrement 3GPP actif • Aucune rétrogradation 2G ni anomalie de signal détectée";
                secDetails.className = "text-xs text-slate-400 mt-0.5";
                secIconBox.className = "flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400";
                if (btnReset) btnReset.style.display = "none";
            }
        }

        // Stats
        if (stats.total_outages !== undefined) {
            document.getElementById('stat-outages').textContent = stats.total_outages;
        }
        if (stats.avg_csq !== null && stats.avg_csq !== undefined) {
            document.getElementById('stat-avg').textContent = Number(stats.avg_csq).toFixed(1);
        }
        if (stats.geo_samples !== undefined) {
            document.getElementById('stat-geo').textContent = stats.geo_samples;
        }

        // 8. Télémétrie 4G Mobile & Audit Bi-Réseau (Samsung Galaxy A14 avec SIM)
        const dualBadge = document.getElementById('dual-diag-badge');
        const dualModemOp = document.getElementById('dual-modem-op');
        const dualModemTech = document.getElementById('dual-modem-tech');
        const dualModemDbm = document.getElementById('dual-modem-dbm');
        const dualModemCell = document.getElementById('dual-modem-cell');

        const dualSimOp = document.getElementById('dual-sim-op');
        const dualSimBadge = document.getElementById('dual-sim-badge');
        const dualSimDownlink = document.getElementById('dual-sim-downlink');
        const dualSimPing = document.getElementById('dual-sim-ping');
        const dualSimRtt = document.getElementById('dual-sim-rtt');
        const dualDiagText = document.getElementById('dual-diag-text');

        if (data.dual_audit && data.dual_audit.active) {
            const audit = data.dual_audit;
            const corr = audit.correlation || {};
            const pModem = audit.probe_modem || {};
            const pMobile = audit.probe_mobile || {};

            // Mise à jour de la colonne Modem Clé USB
            if (dualModemOp) dualModemOp.textContent = pModem.operator || live.operator_name || 'Écoute radio';
            if (dualModemTech) dualModemTech.textContent = pModem.tech || '3G+ UTRAN';
            if (dualModemDbm) dualModemDbm.textContent = pModem.dbm ? `${pModem.dbm} dBm` : '-- dBm';
            if (dualModemCell) dualModemCell.textContent = `Cell ID: ${pModem.cell_id || '--'} • CH: ${pModem.channel || '--'}`;

            // Mise à jour de la colonne Sonde Mobile Samsung A14
            if (dualSimOp) dualSimOp.textContent = pMobile.operator || 'Opérateur Mobile';
            if (dualSimBadge) dualSimBadge.textContent = pMobile.tech || '4G LTE';
            if (dualSimDownlink) dualSimDownlink.textContent = pMobile.downlink_mbps ? `Débit: ${pMobile.downlink_mbps} Mbps` : 'Débit: Estim. en cours';
            if (dualSimPing) dualSimPing.textContent = pMobile.ping_ms ? `Ping: ${pMobile.ping_ms} ms` : (pMobile.rtt_ms ? `RTT: ${pMobile.rtt_ms} ms` : 'Ping: --');
            if (dualSimRtt) dualSimRtt.textContent = `Techno: ${pMobile.tech || '4G'} • RTT: ${pMobile.rtt_ms || '--'} ms`;

            // Badge & Diagnostic de corrélation
            if (dualBadge) {
                if (corr.status === "CONGESTION") {
                    dualBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse";
                } else if (corr.status === "RF_WEAK") {
                    dualBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30";
                } else if (corr.status === "DUAL_COMPARE") {
                    dualBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30";
                } else {
                    dualBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                }
                dualBadge.innerHTML = `<span>${corr.badge || '🟢 Nominal'}</span>`;
            }
            if (dualDiagText) {
                dualDiagText.textContent = corr.diagnosis || "Corrélation spectrale et data établie.";
            }
        } else {
            if (dualModemOp) dualModemOp.textContent = live.operator_name || 'En attente...';
            if (dualModemDbm) dualModemDbm.textContent = live.dbm ? `${live.dbm} dBm` : '-- dBm';
            if (dualModemCell) dualModemCell.textContent = `Cell ID: ${live.cell_id || '--'} • CH: ${live.channel || '--'}`;
        }

    } catch (e) {
        console.error('Erreur mise à jour télémétrie:', e);
    }
}

// Fetch event logs
async function updateEvents() {
    try {
        const res = await fetch('/api/events?limit=10');
        const events = await res.json();
        const container = document.getElementById('events-list');

        if (!events || events.length === 0) {
            container.innerHTML = `<div class="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-slate-500">Aucun incident détecté. Surveillance active...</div>`;
            return;
        }

        container.innerHTML = events.map(ev => {
            const time = ev.timestamp?.split('T')[1]?.substring(0, 8) || ev.timestamp;
            let badgeColor = 'bg-slate-800 text-slate-300';
            let icon = 'ℹ️';
            if (ev.event_type === 'OUTAGE') {
                badgeColor = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                icon = '⚠️';
            } else if (ev.event_type === 'RECONNECT') {
                badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                icon = '✅';
            }

            return `
                <div class="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-start gap-2">
                    <span class="text-xs">${icon}</span>
                    <div class="flex-1">
                        <div class="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                            <span class="px-1.5 py-0.2 rounded font-bold ${badgeColor}">${ev.event_type}</span>
                            <span>${time}</span>
                        </div>
                        <p class="text-xs text-slate-300 mt-1">${ev.message}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Erreur mise à jour événements:', e);
    }
}

// Interactive AT Console handler
function setupConsole() {
    const input = document.getElementById('at-input');
    const btn = document.getElementById('at-send-btn');
    const output = document.getElementById('at-output');

    async function sendCommand() {
        const cmd = input.value.trim();
        if (!cmd) return;

        output.innerHTML += `\n<span class="text-cyan-400 font-bold">&gt; ${cmd}</span>\nEnvoi en cours...`;
        output.scrollTop = output.scrollHeight;

        try {
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            const data = await res.json();
            output.innerHTML = output.innerHTML.replace('Envoi en cours...', '');
            output.innerHTML += `<span class="text-slate-200">${data.response}</span>\n`;
            output.scrollTop = output.scrollHeight;
        } catch (e) {
            output.innerHTML += `<span class="text-rose-400">Erreur : ${e.message}</span>\n`;
            output.scrollTop = output.scrollHeight;
        }
    }

    btn.addEventListener('click', sendCommand);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCommand();
    });
}

// -------------------------------------------------------------
// Module Gestionnaire d'Onglets & Cockpit Modulaire (UI v3)
// -------------------------------------------------------------
function setupWorkspaceTabs() {
    const tabs = [
        { btnId: 'tab-btn-map', targetId: 'workspace-map' },
        { btnId: 'tab-btn-dual', targetId: 'workspace-dual' },
        { btnId: 'tab-btn-spectrum', targetId: 'workspace-spectrum' },
        { btnId: 'tab-btn-security', targetId: 'workspace-security' },
        { btnId: 'tab-btn-hardware', targetId: 'workspace-hardware' }
    ];

    function activateTab(activeBtnId) {
        tabs.forEach(t => {
            const btn = document.getElementById(t.btnId);
            const container = document.getElementById(t.targetId);
            if (!btn || !container) return;

            if (t.btnId === activeBtnId) {
                btn.className = "px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold transition flex items-center gap-2 whitespace-nowrap shadow-sm";
                container.classList.remove('hidden');
            } else {
                btn.className = "px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent font-medium transition flex items-center gap-2 whitespace-nowrap";
                container.classList.add('hidden');
            }
        });

        if (activeBtnId === 'tab-btn-map' && leafletMap) {
            setTimeout(() => {
                leafletMap.invalidateSize();
            }, 100);
        }
        if (activeBtnId === 'tab-btn-spectrum' && signalChart) {
            setTimeout(() => {
                signalChart.resize();
            }, 100);
        }
    }

    tabs.forEach(t => {
        const btn = document.getElementById(t.btnId);
        if (btn) {
            btn.addEventListener('click', () => activateTab(t.btnId));
        }
    });

    activateTab('tab-btn-map');
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    setupWorkspaceTabs();
    initChart();
    initMap();
    await loadHistory();
    await loadMapPoints();
    await updateTelemetry();
    await updateEvents();
    setupConsole();
    setupClientGPS();
    setupQRCodeModal();

    // Intervals
    setInterval(updateTelemetry, 2000);
    setInterval(loadMapPoints, 3000);
    setInterval(updateEvents, 5000);
});

// -------------------------------------------------------------
// Module GPS & Sonde 4G Intégré Côté Client (Mobile ou Laptop)
// Permet d'activer la puce GPS de l'appareil directement sur index.html
// -------------------------------------------------------------
let clientGpsWatchId = null;
let clientWakeLock = null;

function setupClientGPS() {
    const btnHeader = document.getElementById('btn-toggle-client-gps');
    const btnBanner = document.getElementById('btn-banner-toggle-gps');

    function updateGpsButtons(isActive) {
        const text = isActive ? "🛑 Arrêter le GPS" : "🛰️ Activer le GPS local";
        const bannerText = isActive ? "🛑 Arrêter le GPS" : "🛰️ Activer le GPS ici";
        const cls = isActive
            ? "px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans font-semibold transition flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-500/20"
            : "px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-sans font-semibold transition flex items-center gap-1.5 active:scale-95 shadow-sm";
        const bannerCls = isActive
            ? "px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-sans font-bold transition shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
            : "px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-sans font-bold transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5";

        if (btnHeader) {
            btnHeader.innerHTML = text;
            btnHeader.className = cls;
        }
        if (btnBanner) {
            btnBanner.innerHTML = bannerText;
            btnBanner.className = bannerCls;
        }
    }

    async function toggleClientGps() {
        if (clientGpsWatchId !== null) {
            navigator.geolocation.clearWatch(clientGpsWatchId);
            clientGpsWatchId = null;
            if (clientWakeLock) {
                try { await clientWakeLock.release(); } catch(e){}
                clientWakeLock = null;
            }
            updateGpsButtons(false);
            return;
        }

        if (!navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par ce navigateur.");
            return;
        }

        try {
            if ('wakeLock' in navigator) {
                clientWakeLock = await navigator.wakeLock.request('screen');
            }
        } catch(e) {}

        updateGpsButtons(true);

        // 1. Obtention rapide d'une première position réseau/cache pour affichage immédiat
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const c = pos.coords;
                try {
                    await fetch('/api/gps', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            latitude: c.latitude,
                            longitude: c.longitude,
                            accuracy: c.accuracy,
                            speed: c.speed ? c.speed * 3.6 : 0,
                            altitude: c.altitude,
                            network_type: '4g',
                            downlink_mbps: null,
                            rtt_ms: null,
                            ping_ms: 10,
                            operator_sim: "SIM Mobile Directe",
                            device_model: "Samsung Galaxy A14 (All-in-One)"
                        })
                    });
                } catch(e) {}
            },
            (e) => console.log("Fix rapide initial non disponible, recherche GPS en cours :", e.message),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        );

        // 2. Surveillance GNSS haute précision continue (timeout étendu à 30s)
        clientGpsWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const c = pos.coords;
                let netType = '4g', downlink = null, rtt = null;
                const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                if (conn) {
                    netType = conn.effectiveType || '4g';
                    downlink = conn.downlink || null;
                    rtt = conn.rtt || null;
                }

                const tStart = performance.now();
                try {
                    await fetch('/api/gps', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            latitude: c.latitude,
                            longitude: c.longitude,
                            accuracy: c.accuracy,
                            speed: c.speed ? c.speed * 3.6 : 0,
                            altitude: c.altitude,
                            network_type: netType,
                            downlink_mbps: downlink,
                            rtt_ms: rtt,
                            ping_ms: Math.round(performance.now() - tStart),
                            operator_sim: "SIM Mobile Directe",
                            device_model: "Samsung Galaxy A14 (All-in-One)"
                        })
                    });
                } catch(err) {
                    console.error("Erreur envoi GPS direct:", err);
                }
            },
            (err) => {
                console.warn("Événement GPS:", err.code, err.message);
                if (err.code === 1) { // PERMISSION_DENIED
                    alert("Accès GPS refusé : veuillez autoriser la localisation dans les paramètres de votre navigateur.");
                    if (clientGpsWatchId !== null) {
                        navigator.geolocation.clearWatch(clientGpsWatchId);
                        clientGpsWatchId = null;
                    }
                    updateGpsButtons(false);
                } else if (err.code === 3) { // TIMEOUT
                    console.warn("GPS timeout transitoire : recherche des satellites GNSS en cours...");
                    // On ne coupe PAS la sonde pour un simple délai de synchronisation satellite !
                } else {
                    console.warn("Signal GPS indisponible temporairement...");
                }
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 3000 }
        );
    }

    if (btnHeader) btnHeader.addEventListener('click', toggleClientGps);
    if (btnBanner) btnBanner.addEventListener('click', toggleClientGps);
}

// -------------------------------------------------------------
// Module QR Code Intelligent pour Appairage Mobile Sans Saisie
// Distingue le Mode Nomade 4G (Tunnel Cloudflare) du Wi-Fi Local
// -------------------------------------------------------------
let qrCodeInstance = null;
let qrSelectedEnv = 'nomad'; // 'nomad' (Cloudflare 4G) ou 'local' (Wi-Fi)
let qrSelectedDest = 'gps';  // 'gps' (/gps) ou 'dash' (/)
let serverStatusCache = null;

function setupQRCodeModal() {
    const modal = document.getElementById('qr-modal');
    const btnOpenHeader = document.getElementById('btn-open-qr-modal');
    const btnOpenBanner = document.getElementById('btn-banner-qr');
    const btnClose = document.getElementById('btn-close-qr-modal');
    
    const btnEnvNomad = document.getElementById('btn-qr-env-nomad');
    const btnEnvLocal = document.getElementById('btn-qr-env-local');
    const btnDestGps = document.getElementById('btn-qr-dest-gps');
    const btnDestDash = document.getElementById('btn-qr-dest-dash');
    const btnRefresh = document.getElementById('btn-refresh-tunnel-status');

    const tunnelBanner = document.getElementById('qr-tunnel-banner');
    const tunnelIcon = document.getElementById('qr-tunnel-icon');
    const tunnelTitle = document.getElementById('qr-tunnel-title');
    const tunnelDesc = document.getElementById('qr-tunnel-desc');

    const qrDisplay = document.getElementById('qrcode-display');
    const qrText = document.getElementById('qr-target-url-text');
    const btnCopy = document.getElementById('btn-copy-qr-url');
    const btnDownload = document.getElementById('btn-download-qr-png');
    const modeAdvice = document.getElementById('qr-mode-advice');

    if (!modal || !qrDisplay) return;

    async function fetchSystemStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                serverStatusCache = await res.json();
            }
        } catch (e) {
            console.warn("Impossible de recuperer le statut du serveur:", e);
        }
    }

    function computeTargetUrl() {
        // Priorite tunnel: parametre d'URL ou backend /api/status
        const urlParams = new URLSearchParams(window.location.search);
        const tunnelParam = urlParams.get('tunnel');
        let tunnelUrl = tunnelParam ? tunnelParam.replace(/\/+$/, '') : null;
        if (!tunnelUrl && serverStatusCache && serverStatusCache.tunnel && serverStatusCache.tunnel.url) {
            tunnelUrl = serverStatusCache.tunnel.url.replace(/\/+$/, '');
        }

        let localUrl = window.location.origin;
        if (serverStatusCache && serverStatusCache.local_url) {
            localUrl = serverStatusCache.local_url;
        }

        if (qrSelectedEnv === 'nomad') {
            if (tunnelUrl) {
                return qrSelectedDest === 'gps' ? `${tunnelUrl}/gps` : tunnelUrl;
            } else {
                return null; // Pas de tunnel disponible
            }
        } else {
            return qrSelectedDest === 'gps' ? `${localUrl}/gps` : localUrl;
        }
    }

    function renderModalUI() {
        const urlParams = new URLSearchParams(window.location.search);
        const tunnelParam = urlParams.get('tunnel');
        const hasTunnel = Boolean(tunnelParam || (serverStatusCache && serverStatusCache.tunnel && serverStatusCache.tunnel.active));
        const tunnelUrl = tunnelParam || (serverStatusCache && serverStatusCache.tunnel && serverStatusCache.tunnel.url);

        // Mise a jour visuelle des boutons Environnement
        if (btnEnvNomad && btnEnvLocal) {
            if (qrSelectedEnv === 'nomad') {
                btnEnvNomad.className = "py-2.5 px-2 rounded-lg bg-indigo-600 text-white transition shadow flex items-center justify-center gap-1.5 font-bold";
                btnEnvLocal.className = "py-2.5 px-2 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5";
            } else {
                btnEnvNomad.className = "py-2.5 px-2 rounded-lg text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5";
                btnEnvLocal.className = "py-2.5 px-2 rounded-lg bg-indigo-600 text-white transition shadow flex items-center justify-center gap-1.5 font-bold";
            }
        }

        // Mise a jour visuelle des boutons Destination
        if (btnDestGps && btnDestDash) {
            if (qrSelectedDest === 'gps') {
                btnDestGps.className = "px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold transition";
                btnDestDash.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white border border-transparent transition";
            } else {
                btnDestGps.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white border border-transparent transition";
                btnDestDash.className = "px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold transition";
            }
        }

        // Mise a jour du bandeau d'alerte contextuel
        if (tunnelBanner) {
            if (qrSelectedEnv === 'nomad') {
                if (hasTunnel) {
                    tunnelBanner.className = "p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-emerald-950/40 border-emerald-800/80 text-emerald-300";
                    tunnelIcon.textContent = "🟢";
                    tunnelTitle.textContent = "Tunnel Internet 4G Actif (" + (serverStatusCache?.tunnel?.provider || "Cloudflare") + ")";
                    tunnelDesc.textContent = "Scannez ce QR Code chez vous avant de partir : le Samsung restera connecte au PC meme en basculant en donnees mobiles 4G dehors !";
                    if (modeAdvice) modeAdvice.textContent = "👉 Recommande pour la collecte terrain : liaison permanente avec la maison.";
                } else {
                    tunnelBanner.className = "p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-amber-950/40 border-amber-800/80 text-amber-300";
                    tunnelIcon.textContent = "⚠️";
                    tunnelTitle.textContent = "Aucun tunnel nomade actif pour le moment !";
                    tunnelDesc.textContent = "Lancez 'tunnel.bat' sur votre PC pour generer une adresse Internet publique. Sans tunnel, votre telephone ne pourra pas contacter le PC hors de portee du Wi-Fi.";
                    if (modeAdvice) modeAdvice.textContent = "⚠️ Lancez tunnel.bat sur le PC puis cliquez sur 'Actualiser' pour generer le QR 4G.";
                }
            } else {
                tunnelBanner.className = "p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-slate-950/70 border-slate-800 text-slate-300";
                tunnelIcon.textContent = "🏠";
                tunnelTitle.textContent = "Mode Wi-Fi Local (Meme Box / Meme Reseau)";
                tunnelDesc.textContent = "Fonctionne uniquement tant que votre telephone reste sur le meme reseau Wi-Fi que le PC. Si vous sortez de la maison, utilisez l'onglet 'Sortie Nomade 4G'.";
                if (modeAdvice) modeAdvice.textContent = "👉 Valable uniquement a domicile avec le Samsung connecte a la box Wi-Fi.";
            }
        }

        // Calcul et rendu de l'URL
        const targetUrl = computeTargetUrl();

        if (targetUrl) {
            if (qrText) qrText.textContent = targetUrl;
            qrDisplay.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                qrCodeInstance = new QRCode(qrDisplay, {
                    text: targetUrl,
                    width: 190,
                    height: 190,
                    colorDark: "#0f172a",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                qrDisplay.innerHTML = `<span class="text-xs text-slate-500 font-mono">Chargement du moteur QR...</span>`;
            }
        } else {
            if (qrText) qrText.textContent = "En attente du lancement de tunnel.bat sur le PC...";
            qrDisplay.innerHTML = `
                <div class="text-center p-3 text-slate-600 font-mono text-xs">
                    <div class="text-2xl mb-1">⏳</div>
                    <div>Tunnel non detecte</div>
                    <div class="text-[10px] text-slate-400 mt-1">Double-cliquez sur tunnel.bat</div>
                </div>
            `;
        }
    }

    async function openModal() {
        modal.classList.remove('hidden');
        await fetchSystemStatus();

        // Si un tunnel est actif, selectionner automatiquement 'nomad'
        const urlParams = new URLSearchParams(window.location.search);
        const hasTunnel = Boolean(urlParams.get('tunnel') || (serverStatusCache && serverStatusCache.tunnel && serverStatusCache.tunnel.active));
        if (hasTunnel) {
            qrSelectedEnv = 'nomad';
        } else {
            // Par defaut si pas de tunnel encore lance, afficher l'onglet nomade avec l'invite a lancer tunnel.bat
            qrSelectedEnv = 'nomad';
        }
        renderModalUI();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    if (btnOpenHeader) btnOpenHeader.addEventListener('click', openModal);
    if (btnOpenBanner) btnOpenBanner.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (btnEnvNomad) {
        btnEnvNomad.addEventListener('click', () => {
            qrSelectedEnv = 'nomad';
            renderModalUI();
        });
    }

    if (btnEnvLocal) {
        btnEnvLocal.addEventListener('click', () => {
            qrSelectedEnv = 'local';
            renderModalUI();
        });
    }

    if (btnDestGps) {
        btnDestGps.addEventListener('click', () => {
            qrSelectedDest = 'gps';
            renderModalUI();
        });
    }

    if (btnDestDash) {
        btnDestDash.addEventListener('click', () => {
            qrSelectedDest = 'dash';
            renderModalUI();
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            const old = btnRefresh.textContent;
            btnRefresh.textContent = "⏳...";
            await fetchSystemStatus();
            renderModalUI();
            btnRefresh.textContent = old;
        });
    }

    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            const canvas = qrDisplay.querySelector('canvas');
            const img = qrDisplay.querySelector('img');
            let dataUrl = null;

            if (canvas) {
                try {
                    dataUrl = canvas.toDataURL('image/png');
                } catch (e) {
                    console.error("Erreur lecture canvas QR:", e);
                }
            }
            if (!dataUrl && img && img.src) {
                dataUrl = img.src;
            }

            if (dataUrl) {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `radio-sentinel-qr-${qrSelectedEnv}-${qrSelectedDest}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                const old = btnDownload.innerHTML;
                btnDownload.innerHTML = "✅ Enregistre !";
                setTimeout(() => { btnDownload.innerHTML = old; }, 2000);
            } else {
                alert("Image du QR Code en cours de generation. Reessayez dans un instant.");
            }
        });
    }

    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const url = computeTargetUrl();
            if (url) {
                navigator.clipboard.writeText(url).then(() => {
                    const old = btnCopy.textContent;
                    btnCopy.textContent = "✅ Copie !";
                    setTimeout(() => { btnCopy.textContent = old; }, 2000);
                });
            }
        });
    }

    // Si un tunnel public est passe dans l'URL (?tunnel=...), ouvrir la modale aussitot
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tunnel')) {
        setTimeout(openModal, 400);
    }
}
