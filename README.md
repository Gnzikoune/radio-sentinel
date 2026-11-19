# 📡 Radio Sentinel™ — Plateforme d'Intelligence Cellulaire & d'Audit Spectral

[![Language: FR](https://img.shields.io/badge/Langue-Fran%C3%A7ais-blue.svg)](README.md)
[![Language: EN](https://img.shields.io/badge/Language-English-green.svg)](README_EN.md)
[![Plateforme: Web](https://img.shields.io/badge/Web-Live%20Showcase-purple.svg)](https://gnzikoune.github.io/radio-sentinel/)
[![Documentation: Interne](https://img.shields.io/badge/Docs-Portail%20Officiel-cyan.svg)](https://gnzikoune.github.io/radio-sentinel/docs.html)
[![Licence: Propriétaire](https://img.shields.io/badge/Licence-Propri%C3%A9taire-red.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal.svg)](https://fastapi.tiangolo.com/)

> **Solution souveraine d'audit spectral, de cartographie de couverture mobile 2G/3G/4G, de géolocalisation d'infrastructures radio et de détection de contre-mesures cellulaires (anti-IMSI-Catchers).**  
> Conçue pour les régulateurs des télécommunications (ARCEP), les opérateurs de réseaux mobiles, les directions des systèmes d'information (DSI) et les acteurs de la sécurité régalienne.  
> **Architecture à double sonde physique, 100 % de mesures réelles sans aucune dépendance à des API de géolocalisation tierces payantes.**

---

## 🎯 Capacités Stratégiques & Cas d'Usage

1. **Cartographie de Couverture Continue & Balayage Radar 360° :**  
   - **Heatmap SIG Haute Résolution** : Interpolation spatiale dynamique le long des parcours de wardriving, produisant un gradient continu de couverture radio (Vert / Jaune / Rouge) strictement calibré sur les seuils 3GPP et régulateurs (ARCEP), avec couches satellite Google HD et OpenStreetMap.
   - **Balayage Radar Tournant & Icônes Tactiques Dédiées** : Visualisation d'un radar tournant à 360° autour de la position GPS mobile simulant la zone de détection RF active, complété par des icônes vectorielles distinctes pour la sonde mobile (réticule tactique), les pylônes estimés par barycentre (treillis doré à ondes rayonnantes) et les pylônes officiels OpenCellID (mât télécom avec feux d'obstacles et code couleur opérateur).
2. **Identification & Triangulation des Pylônes-Relais :**  
   - **Barycentre pondéré en puissance réelle ($10^{\text{dBm}/10}\text{ mW}$)** : Calcul du centre de gravité énergétique des échantillons pour localiser avec précision les pylônes émetteurs même en milieu urbain dense.
   - **Base locale OpenCellID Gabon (MCC 628)** : Confrontation instantanée de la cellule active avec le registre officiel des sites Moov Africa (`MNC 01`), Airtel Gabon (`MNC 02`) et Azur (`MNC 03`).
   - **Filtre géodésique de plausibilité (Haversine)** : Élimination automatique des faux rattachements dus à la réutilisation de Cell ID entre provinces distantes (`HIGH` < 5 km, `MEDIUM` < 25 km, `LOW` > 25 km).
   - **Faisceau RF vectoriel dynamique** : Tracé en direct reliant la position mobile du terminal au pylône émetteur rattaché.
3. **Audit Bi-Réseau & Performance Data Mobile en Parallèle :**  
   Mise en miroir simultanée de deux opérateurs : écoute spectrale brute sur la sonde physique RF (ex. Moov Africa) et audit de performance réelle sur la carte SIM du smartphone (débit descendant Mbps, latence RTT, ping serveur), permettant d'isoler instantanément une saturation cœur de réseau d'un défaut de propagation hertzienne.
4. **Moteur Cyber-Sécurité Anti-IMSI-Catcher & Filtrage Anti-Faux-Positifs :**  
   Surveillance en continu de l'intégrité de la couche radio : alerte critique en cas de rétrogradation forcée (**2G Downgrade Attack**) vers une cellule non chiffrée avec saut de puissance suspect. Algorithme de filtrage avancé excluant les transitions sentinelles (-113 dBm) pour un taux de faux positifs nul.
5. **Générateur de Rapport d'Audit Exécutif (PDF / Impression) :**  
   Génération autonome sur `/audit-report` de rapports complets de conformité télécom (SLA de couverture, répartition par classes ARCEP, inventaire des pylônes, analyse multi-opérateurs, isolation des coupures réseau réelles versus instabilités logicielles).
6. **Cockpit Modulaire v3 Anti-Saturation Cognitive :**  
   Interface d'ingénierie scindée entre un **HUD de Vol Persistant** (télémétrie critique toujours visible) et 5 espaces de travail spécialisés (Carte SIG, Audit Bi-Réseau, Spectre, Cyber-Sécurité, Console AT).
7. **Appairage Nomade 4G par Smart QR & Tunnels Sécurisés :**  
   Zéro saisie d'URL en mobilité. Détection automatique du mode terrain (Tunnel chiffré Cloudflare / Ngrok) ou laboratoire (Wi-Fi Local), avec fonction d'export direct du QR code en image PNG.
8. **Export Géospatial 3D (.kml pour Google Earth Pro) & CSV :**  
   Modélisation volumétrique sous forme de colonnes ou de ruban 3D dans Google Earth Pro où chaque point GPS est extrudé proportionnellement à sa puissance en dBm.

---

## 🏗️ Architecture Système

```text
  ┌───────────────────────────────────────────────────────────────┐
  │                   ACQUISITION DE TERRAIN                      │
  ├────────────────────────────────┬──────────────────────────────┤
  │    Sonde RF Physique           │    Sonde Mobile GNSS / Data  │
  │    Alcatel OneTouch X602D      │    Samsung Galaxy A14        │
  │    (Port Série COMx - AT)      │    (HTML5 Geo / HTTPS)       │
  └────────────────┬───────────────┴──────────────┬───────────────┘
                   │ Trames RF raw (AT+CSQ, CCED) │ Coordonnées GPS + QoS
                   ▼                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │              SERVEUR RADIO SENTINEL™ (FastAPI)                │
  ├───────────────────────────────────────────────────────────────┤
  │  • modem_service.py   : Décodeur AT 3GPP & filtre anti-IMSI   │
  │  • gps_service.py     : Synchronisation GNSS & audit QoS      │
  │  • opencellid_service : Base locale pylônes Gabon (MCC 628)   │
  │  • database.py        : Persistance spatio-temporelle SQLite  │
  │  • kml_service.py     : Moteur de maillage 3D KML Google Earth│
  └───────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │              POSTE DE PILOTAGE COCKPIT v3                     │
  ├───────────────────────────────────────────────────────────────┤
  │  • Persistent Flight HUD (Statut COM, dBm, PLMN, GPS Fix)     │
  │  • Espace 1 : Carte SIG interactive & Satellite HD            │
  │  • Espace 2 : Audit Bi-Réseau comparatif                      │
  │  • Espace 3 : Visualiseur Spectral glissant Chart.js          │
  │  • Espace 4 : Centre de Cyber-Sécurité & Anti-Downgrade       │
  │  • Espace 5 : Console de Commandes AT Directes                │
  │  • Module 6 : Générateur de Rapport d'Audit Exécutif (PDF)    │
  └───────────────────────────────────────────────────────────────┘
```

---

## 🔬 Modules Techniques & Algorithmes Clés

### 1. Télémétrie Physique & Ingénierie AT
Le pilote matériel dialogue directement avec le contrôleur du modem via les jeux d'instructions Hayes normalisés :
* `AT+CSQ` : Taux de réception brut et conversion en puissance physique : $\text{dBm} = 2 \times \text{CSQ} - 113$.
* `AT+CCED=0,1` : Extraction de la topologie cellulaire 3GPP :
  - **MCC / MNC** : Identifiants pays et réseau (`628-01` Moov Africa, `628-02` Airtel, `628-03` Azur).
  - **LAC** : *Location Area Code* (ex: `303`, `32204`).
  - **Cell ID** : Identifiant unique de la cellule active (ex: `33293`, `926`).
  - **Canal Porteuse** : Numéro UARFCN et calcul de la fréquence centrale MHz (ex: canal `10712` $\rightarrow 2140.0\text{ MHz}$).
* **Résilience Série & Isolation des Couches** : Auto-détection par VID/PID (`1BBB:022C`), tolérance aux micro-déconnexions physiques et séparation totale de la persistance SQLite afin qu'aucune anomalie de base de données n'entraîne la fermeture de la liaison série.

### 2. Double Sonde : Corrélation Physique vs Data Active
Le smartphone Samsung Galaxy A14 opère comme sonde satellite et analyseur data :
* **Précision GNSS Métrique** : Transmission haute fréquence de la latitude, longitude, altitude, vitesse et précision en mètres.
* **Audit QoS Mobile** : Remontée en continu du débit descendant estimé (Mbps), de la latence RTT, du ping serveur et de l'opérateur de la carte SIM active.
* **Corrélation Automatique** : Détection des goulets d'étranglement (signal radio excellent mais débit bridé = saturation antenne ou cœur de réseau).

### 3. Triangulation par Barycentre mW & Registre Gabon
* **Linéarisation Énergétique** : Transformation systématique de l'échelle logarithmique en milliwatts linéaires ($P = 10^{\text{dBm}/10}$). Le barycentre des coordonnées pondérées par leur puissance réelle localise l'émetteur avec une fidélité bien supérieure à une simple moyenne arithmétique.
* **Filtre Haversine Anti-Collision** : Confrontation avec les positions officielles OpenCellID Gabon. Rejet des pylônes situés à plus de 25 km pour neutraliser les fausses identifications liées à la réutilisation d'identifiants de cellules.

### 4. Moteur Cyber-Sécurité Anti-IMSI-Catcher
* **Détection de Rétrogradation Forcée (2G Downgrade)** : Alerte sonore et visuelle immédiate lorsqu'un équipement passe d'un chiffrement robuste (3G/4G) à un protocole vulnérable (2G GSM A5/1) sous l'effet d'une puissance anormale (+12 dBm) ou d'un changement inopiné de LAC.
* **Filtre des Transitions Sentinelles** : Exclusion des décrochages liés aux déconnexions matérielles où le signal part de `-113 dBm` (CSQ=0), garantissant l'absence de fausses alertes d'interception lors des cycles de redémarrage.

### 5. Générateur de Rapport d'Audit Exécutif (PDF)
Accessible sur `/audit-report` :
* Synthèse décisionnelle avec Taux de Couverture Exploitable (SLA), volume d'échantillons et signal moyen.
* Barres proportionnelles et tableau de comptage selon les seuils opérationnels 3GPP TS 36.133 et ARCEP.
* Inventaire exhaustif des cellules détectées et comparatif multi-opérateurs.
* Isolation des pannes réelles de signal (excluant les anomalies logicielles).
* Rendu CSS `@media print` optimisé pour génération PDF instantanée avec masquage automatique des URLs privées de tunnel.

---

## 🔌 Référentiel de l'API REST

| Méthode | Point d'Accès | Description Opérationnelle |
|---|---|---|
| `GET` | `/api/status` | Statut global de la station, détection d'IP locale et état du tunnel nomade. |
| `GET` | `/api/telemetry/live` | Payload temps réel complet (RF physique, topologie cellule, GNSS, audit QoS). |
| `GET` | `/api/telemetry/history` | Fenêtre temporelle glissante pour le visualiseur spectral Chart.js. |
| `GET` | `/api/map-points` | Échantillons géoréférencés pour la heatmap et le tracé de route SIG. |
| `GET` | `/api/events` | Journal des événements d'exploitation, pannes et alertes de sécurité. |
| `GET` | `/api/audit-report` | Données statistiques compilées pour le rapport d'audit exécutif. |
| `GET` | `/audit-report` | Interface du rapport d'audit exécutif officiel prêt pour impression PDF. |
| `GET` | `/api/export-kml` | Fichier 3D Google Earth extrudé selon le relief de puissance radio. |
| `GET` | `/api/export-csv` | Export tabulaire complet compatible SIG (QGIS, ArcGIS, Python). |
| `POST` | `/api/gps` | Ingestion des coordonnées GNSS et métriques data de la sonde mobile. |
| `POST` | `/api/tunnel` | Enregistrement dynamique de l'URL publique du tunnel nomade 4G. |
| `DELETE` | `/api/tunnel` | Révocation et fermeture de l'état du tunnel distant. |
| `POST` | `/api/at-command` | Envoi d'une commande AT directe vers le modem et capture de réponse. |

---

## 🚀 Exploitation Opérationnelle

### 1. Démarrage de la Station Hôte
```powershell
# Lancement de l'environnement sécurisé HTTPS
./lancer.bat
```
Accès direct à la station : **`https://127.0.0.1:8000`**

### 2. Appairage Mobile par Smart QR Code
1. Sur le cockpit, cliquer sur le bouton violet **`📱 QR Code Mobile`** (ou lancer `tunnel.bat`).
2. Deux modes disponibles :
   - 🌍 **Mode Nomade 4G (Sorties de terrain)** : Génère le QR code du tunnel sécurisé Cloudflare/Ngrok. Le smartphone reste connecté à la station sans coupure lors du basculement Wi-Fi vers 4G.
   - 🏠 **Mode Wi-Fi Local (Laboratoire)** : Génère le QR code sur l'IP locale du réseau privé.
3. Deux interfaces mobiles au choix :
   - 🛰️ **Balise Éco (`/gps`)** : Interface tactile légère optimisée pour fonctionner écran allumé en poche ou sur pare-brise.
   - 📊 **Cockpit Complet (`/`)** : Accès à l'ensemble du tableau de bord sur smartphone avec activation du GPS local.
4. **Export PNG** : Téléchargement du QR code en haute résolution pour impression ou transmission opérationnelle.

---

## 🔒 Propriété Intellectuelle & Licence Commerciale

**Radio Sentinel™** est un logiciel propriétaire protégé par les lois internationales sur la propriété intellectuelle.  
**Copyright © 2026 Gildas Nzikoune. Tous droits réservés.**

Toute reproduction, distribution, décompilation ou exploitation commerciale sans autorisation écrite préalable est strictement interdite.

Pour toute demande de licence commerciale, déploiement institutionnel ou intégration sur mesure :  
📧 Contact : [gildas.nzikoune@gmail.com](mailto:gildas.nzikoune@gmail.com)  
🌐 Documentation en ligne : [https://gnzikoune.github.io/radio-sentinel/docs.html](https://gnzikoune.github.io/radio-sentinel/docs.html)
