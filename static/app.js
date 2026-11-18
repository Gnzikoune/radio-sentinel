// Chart.js & Leaflet instances
let signalChart = null;
let leafletMap = null;
let currentPositionMarker = null;
let currentAccuracyCircle = null;
let mapPointsLayer = null;
let towerLayer = null;
let estimatedTowerLatLng = null;
let hasCenteredOnGPS = false;

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

// Initialize Leaflet 2D Map with Multi-View (Satellite, Dark, Streets, Topo)
function initMap() {
    const defaultLat = 0.4162;
    const defaultLon = 9.4673;

    leafletMap = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([defaultLat, defaultLon], 14);

    // 1. Définition des différentes couches de tuiles (100% SANS CLÉ API)
    tileLayers = {
        // Vue Satellite Réelle Mondiale (Esri World Imagery) - Gratuit sans clé
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }),
        // Vue Sombre / Nuit (OpenStreetMap avec filtre sombre)
        dark: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }),
        // Vue Rues / Cadastre Standard (OpenStreetMap)
        streets: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }),
        // Vue Topographique / Relief (OpenTopoMap)
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            subdomains: ['a', 'b', 'c']
        })
    };

    // Activer la vue Satellite par défaut
    setMapView('satellite');

    // Échelle métrique en bas à gauche
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(leafletMap);

    // Groupes de calques pour les points et l'antenne
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
    if (key === 'dark') {
        mapEl.classList.add('dark-tiles');
    } else {
        mapEl.classList.remove('dark-tiles');
    }

    tileLayers[key].addTo(leafletMap);
    activeTileKey = key;

    // Mettre à jour l'apparence des boutons
    ['satellite', 'dark', 'streets', 'topo'].forEach(k => {
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
    ['satellite', 'dark', 'streets', 'topo'].forEach(k => {
        const btn = document.getElementById(`btn-view-${k}`);
        if (btn) {
            btn.addEventListener('click', () => setMapView(k));
        }
    });

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

// Load and draw points on the Leaflet Map + Antenna Tower (Point Jaune)
async function loadMapPoints() {
    if (!leafletMap || !mapPointsLayer || !towerLayer) return;

    try {
        const res = await fetch('/api/map-points?limit=1000');
        const points = await res.json();

        mapPointsLayer.clearLayers();
        towerLayer.clearLayers();

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
                marker.bindPopup(`
                    <div class="font-sans text-xs leading-relaxed">
                        <span class="text-cyan-400 font-bold uppercase text-[10px] tracking-wider">Mesure sur le Terrain</span><br>
                        <strong class="text-slate-100 text-sm">${pt.operator_name || 'Opérateur'}</strong><br>
                        <span class="font-mono font-bold text-sm" style="color: ${color}">${pt.dbm} dBm (${label})</span><br>
                        <span class="text-slate-300 font-mono">CSQ: ${pt.csq}/31 • ${pt.tech || 'Cellulaire'}</span><br>
                        <span class="text-slate-400 font-mono text-[10px]">${time} • Vitesse: ${Math.round(pt.speed || 0)} km/h</span>
                    </div>
                `);

                mapPointsLayer.addLayer(marker);
            }
        });

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

        if (geoSpread >= MIN_SPREAD_FOR_TOWER && bestPoint) {
            // ✅ Zone suffisamment couverte → on peut estimer la direction de l'antenne
            estimatedTowerLatLng = [bestPoint.latitude, bestPoint.longitude];

            if (towerStatusEl) {
                towerStatusEl.textContent = `📡 Antenne estimée (zone couverte : ${Math.round(geoSpread)} m)`;
                towerStatusEl.className = 'text-xs text-amber-300 font-mono';
            }

            // Halo d'ondes dorées
            const towerHalo = L.circle(estimatedTowerLatLng, {
                radius: 40,
                color: '#f59e0b',
                fillColor: '#fbbf24',
                fillOpacity: 0.25,
                weight: 2,
                dashArray: '4, 4'
            });

            // Point Jaune Émetteur
            const towerMarker = L.circleMarker(estimatedTowerLatLng, {
                radius: 12,
                fillColor: '#fbbf24', // Jaune / Or éclatant
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 1
            });

            towerMarker.bindPopup(`
                <div class="font-sans text-xs leading-relaxed">
                    <div class="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[11px] mb-1">
                        <span class="text-base">📡</span> Antenne-Relais Estimée
                    </div>
                    <strong class="text-slate-100 text-sm">${bestPoint.operator_name || 'Opérateur Réseau'}</strong><br>
                    <span class="text-emerald-400 font-mono font-bold">Puissance Max : ${bestPoint.dbm} dBm</span><br>
                    <span class="text-slate-300 font-mono">Norme : ${bestPoint.tech || '3G+ HSPA+'}</span><br>
                    <span class="text-amber-300 font-mono text-[10px]">Zone de plus forte réception (${Math.round(geoSpread)} m couverts)</span><br>
                    <span class="text-slate-500 font-mono text-[10px]">⚠️ Position approximative — continuez à vous déplacer pour affiner</span>
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

            // Marqueur Mobile en direct
            const latLng = [gps.latitude, gps.longitude];
            if (!currentPositionMarker) {
                currentPositionMarker = L.circleMarker(latLng, {
                    radius: 8,
                    fillColor: '#38bdf8',
                    color: '#ffffff',
                    weight: 2.5,
                    fillOpacity: 1
                }).addTo(leafletMap);
                currentPositionMarker.bindPopup("<strong class='text-slate-900'>Position actuelle (Samsung Galaxy A14)</strong>");
            } else {
                currentPositionMarker.setLatLng(latLng);
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
            document.getElementById('val-mcc-mnc').textContent = `Code Réseau: ${live.operator_code}`;
            if (live.operator_code.startsWith('628')) {
                document.getElementById('val-country').textContent = 'Gabon (628)';
            } else {
                document.getElementById('val-country').textContent = `Pays ${live.operator_code.substring(0, 3)}`;
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

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    initMap();
    await loadHistory();
    await loadMapPoints();
    await updateTelemetry();
    await updateEvents();
    setupConsole();

    // Intervals
    setInterval(updateTelemetry, 2000);
    setInterval(loadMapPoints, 3000);
    setInterval(updateEvents, 5000);
});
