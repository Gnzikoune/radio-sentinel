# 📡 Radio Sentinel — Observatoire Cellulaire & Cartographie RF

[![Language: FR](https://img.shields.io/badge/Langue-Fran%C3%A7ais-blue.svg)](README.md)
[![Language: EN](https://img.shields.io/badge/Language-English-green.svg)](README_EN.md)
[![Website: GitHub Pages](https://img.shields.io/badge/Web-Live%20Showcase-purple.svg)](https://gnzikoune.github.io/radio-sentinel/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal.svg)](https://fastapi.tiangolo.com/)

> **Plateforme autonome d'audit spectral, de géolocalisation d'infrastructures radio et de détection d'anomalies de sécurité mobile.**  
> Projet né du détournement d'usage d'une clé USB 3G grand public (*Alcatel OneTouch X602D* / chipset *Spreadtrum SC7702*) et de la réutilisation d'un smartphone ordinaire (*Samsung Galaxy A14*) comme passerelle satellite multi-constellations haute fréquence.  
> **100 % souverain, 0 € d'abonnement ou de clé API payante, zéro valeur simulée.**

---

## 🎯 Capacités Opérationnelles & Cas d'Usage

1. **Cartographie de Couverture Continue (Heatmap SIG) :**  
   Génération à la volée d'une carte thermique continue par interpolation spatiale (Kriging / IDW) le long des axes de déplacement, produisant un dégradé de couverture radio haute résolution (Vert / Jaune / Rouge) similaire aux outils professionnels d'ingénierie RF et de régulation (ARCEP).
2. **Identification & Triangulation des Pylônes-Relais :**  
   - **Barycentre pondéré en puissance réelle ($10^{\text{dBm}/10}\text{ mW}$)** : Calcul du centre géométrique des 25 meilleurs échantillons radio pour localiser les pylônes même en milieu urbain dense.
   - **Base locale OpenCellID Gabon (MCC 628)** : Confrontation instantanée de la cellule active avec le registre officiel des sites Moov Africa (MNC 01), Airtel Gabon (MNC 02) et Azur (MNC 03).
   - **Vecteur de liaison RF dynamique** : Tracé vectoriel en direct entre la position satellite du terminal et le pylône émetteur rattaché.
3. **Audit Bi-Réseau & Performance 4G Active (SIM Mobile + Écoute Spectre) :**  
   Exploitation de la carte SIM active du Samsung Galaxy A14 pour comparer simultanément deux opérateurs (ex. Airtel vs Moov). Mesure conjointe de la couche physique (dBm, canal) et de la couche applicative réelle (débit descendant estimé en Mbps, latence RTT, ping serveur), avec diagnostic automatique de saturation cœur de réseau versus atténuation hertzienne.
4. **Filtre de Plausibilité Spatiale (GIS Sanity Check) :**  
   Calcul de distance géodésique par formule de Haversine pour qualifier la fiabilité du raccordement cellulaire (`HIGH` < 5 km, `MEDIUM` < 25 km, `LOW` > 25 km) et détecter les réutilisations de Cell ID entre quartiers distants.
4. **Détection d'Anomalies de Sécurité & Faux Relais (IMSI-Catchers) :**  
   Surveillance en continu de l'intégrité de la couche radio : alerte rouge instantanée en cas de rétrogradation forcée (**2G Downgrade Attack**) provoquant la rupture du chiffrement 3GPP (Kasumi/SNOW) vers une cellule 2G non chiffrée avec saut brutal de puissance et changement suspect de LAC.
5. **Export Géospatial 3D (.kml pour Google Earth) :**  
   Exportation en un clic de l'ensemble de la campagne de mesure sous forme de rideau volumétrique 3D dans Google Earth Pro : chaque point GPS est extrudé verticalement selon sa puissance en dBm.
6. **Écoute Passive 100 % Sans Carte SIM (Mode Urgence 3GPP) :**  
   Exploitation des canaux balises descendants (*Broadcast Control Channel - BCCH*) accessibles librement pour la sécurité publique (appels d'urgence 112/911).

---

## 📋 Table des Matières

1. [Architecture Système](#-architecture-système)
2. [Matériel Utilisé](#-matériel-utilisé)
3. [Modules & Fonctionnalités Clés](#-modules--fonctionnalités-clés)
   * [1. Télémétrie Physique & Ingénierie AT](#1-télémétrie-physique--ingénierie-at)
   * [2. Relais Satellite Mobile Sans Application](#2-relais-satellite-mobile-sans-application)
   * [3. Cartographie Leaflet Multi-Vues & Satellite HD](#3-cartographie-leaflet-multi-vues--satellite-hd)
   * [4. Triangulation Spatiale par Barycentre mW](#4-triangulation-spatiale-par-barycentre-mw)
   * [5. Registre OpenCellID Gabon & GIS Sanity Check](#5-registre-opencellid-gabon--gis-sanity-check)
   * [6. Surveillance Cyber-Sécurité (Anti IMSI-Catcher)](#6-surveillance-cyber-sécurité-anti-imsi-catcher)
   * [7. Export 3D Google Earth (KML) & CSV](#7-export-3d-google-earth-kml--csv)
4. [Spécifications des API REST](#-spécifications-des-api-rest)
5. [Structure des Fichiers](#-structure-des-fichiers)
6. [Guide de Démarrage Rapide](#-guide-de-démarrage-rapide)

---

## 🏗️ Architecture Système

```text
  ┌───────────────────────────────────────────────────────────────┐
  │                   ACQUISITION DE TERRAIN                      │
  ├────────────────────────────────┬──────────────────────────────┤
  │    Clé USB 3G/4G (Alcatel)     │    Samsung Galaxy A14        │
  │    Processeur Spreadtrum       │    Passerelle Satellite      │
  │    (Port Série COMx - AT)      │    (HTML5 Geo / HTTPS)       │
  └────────────────┬───────────────┴──────────────┬───────────────┘
                   │ Trames RF raw                │ Coordonnées GPS
                   ▼                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │              SERVEUR RADIO SENTINEL (FastAPI)                 │
  ├───────────────────────────────────────────────────────────────┤
  │  • modem_service.py   : Décodeur AT (CSQ, CCED, COPS, CREG)   │
  │  • gps_service.py     : Moteur de synchronisation satellite   │
  │  • opencellid_service : Base locale pylônes Gabon (MCC 628)   │
  │  • kml_service.py     : Générateur de maillage 3D KML         │
  │  • database.py        : Persistance spatio-temporelle SQLite  │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │              STATION DE CONTRÔLE (Navigateur)                 │
  ├───────────────────────────────────────────────────────────────┤
  │  • Vue Satellite Google HD Hybride/Pure (sans clé, anti-quota)│
  │  • Heatmap d'interpolation continue IDW / Voronoï             │
  │  • Pylône calculé (Barycentre) vs Pylône officiel (OpenCellID)│
  │  • Bandeau d'alerte cyber-sécurité (Détection Downgrade 2G)   │
  └───────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Matériel Utilisé

* **Modem Radio USB Récupéré :** Alcatel OneTouch X602D (*TCT Mobile*, chipset Spreadtrum SC7702, interface composite USB `VID_1BBB&PID_022C`).
* **Récepteur Satellite Mobile :** Smartphone Samsung Galaxy A14 (utilisant son capteur GNSS multi-constellations GPS/Galileo/GLONASS via le navigateur web mobile sans installation d'application tierce).
* **Station Hôte :** PC portable sous Windows (exécutant Python 3, FastAPI, Uvicorn sous protocole SSL local).

---

## 🔬 Modules & Fonctionnalités Clés

### 1. Télémétrie Physique & Ingénierie AT
Le pilote matériel dialogue directement avec le microcontrôleur du modem via les jeux d'instructions Hayes :
* `AT+CSQ` : Taux de réception brut et calcul de la puissance physique exacte en $\text{dBm}$ ($\text{dBm} = 2 \times \text{CSQ} - 113$).
* `AT+CCED=0,1` : Extraction de la topologie cellulaire 3GPP :
  - **MCC / MNC** : Identifiants pays et réseau (`628-01` Moov, `628-02` Airtel, `628-03` Azur).
  - **LAC** : *Location Area Code* (ex: `32204`).
  - **Cell ID** : Identifiant unique de la cellule active (ex: `921`).
  - **UARFCN / ARFCN** : Canal de fréquence porteuse physique et calcul automatique de la fréquence radio réelle en MHz (ex: canal `2995` $\rightarrow 936.6\text{ MHz}$).
* **Tolérance au Débranchement & Robustesse Série** : Détection dynamique par VID/PID (`1BBB:022C`) avec isolation stricte des couches : les opérations de base de données ne bloquent ni ne rompent la communication série physique, assurant une stabilité 24/7 sur le port COM sans décrochage intempestif. Journalisation automatique des événements de coupure (`OUTAGE`) et reprise instantanée (`RECONNECT`).

### 2. Relais Satellite Mobile & Sonde 4G Active
Pour supprimer le besoin d'acheter un dongle GPS USB et étendre l'écoute passive à la mesure de performance réelle :
1. Le smartphone Samsung ouvre la page web mobile servie par le PC : `https://<IP_LOCAL>:8000/gps`.
2. L'API **HTML5 Geolocation (`watchPosition`)** transmet en continu latitude, longitude, précision (en mètres) et vitesse.
3. L'API **NetworkInformation** du terminal mobile remonte en direct :
   - Le type de connexion cellulaire (`4G LTE`).
   - Le débit descendant estimé en mégabits/seconde (`downlink_mbps`).
   - La latence aller-retour (`rtt_ms`) et le ping HTTP réel mesuré à chaque cycle.
   - L'opérateur de la carte SIM active (Airtel Gabon, Moov Africa, etc.).
4. **Moteur de Corrélation Couche Physique vs Données** :
   - *🟢 Nominal* : Puissance radio et débit data en parfaite adéquation.
   - *🟠 Saturation Cœur de Réseau* : Signal fort ($\ge -85\text{ dBm}$) mais latence élevée ($> 250\text{ ms}$) $\rightarrow$ congestion logique chez l'opérateur.
   - *🔴 Atténuation Hertzienne* : Signal dégradé ($< -95\text{ dBm}$) causé par un obstacle ou un éloignement excessif.
   - *🔵 Audit Bi-Réseau* : Comparaison simultanée de deux opérateurs différents sur un même écran (ex. Azur en écoute passive sur la clé vs Airtel 4G sur la SIM du téléphone).
5. Le verrouillage **Screen WakeLock** maintient l'écran allumé pendant les tournées de mesure (wardriving).
6. Un filtre de mouvement Haversine (> 5 mètres) évite l'accumulation de points parasites en phase stationnaire.

### 3. Cartographie Leaflet Multi-Vues & Satellite HD
La cartographie embarque 5 fonds de carte indépendants sans aucune clé API requise :
* 🛰️ **Google Satellite Hybride** : Imagerie satellite HD mondiale combinée avec le réseau routier et les toponymes, optimisée par rotation sur sous-domaines (`mt0` à `mt3`) pour éliminer tout blocage de tuiles à fort grossissement (zoom jusqu'à 22).
* 🌍 **Google Satellite Pur** : Imagerie satellite brute sans labels pour une visibilité RF dégagée.
* 🌑 **CartoDB Dark Matter** : Vue sombre haute lisibilité pour l'analyse spectrale nocturne.
* 🗺️ **OpenStreetMap Standard** : Plan de ville et réseau viaire.
* ⛰️ **OpenTopoMap** : Relief et courbes de niveau pour analyser les masques d'atténuation orographique.

### 4. Triangulation Spatiale par Barycentre mW
Au-delà de la simple recherche du maximum discret, Radio Sentinel implémente un algorithme de barycentre pondéré :
$$\mathbf{P}_{\text{antenne}} = \frac{\sum_{i=1}^{N} w_i \cdot \mathbf{x}_i}{\sum_{i=1}^{N} w_i} \quad \text{avec} \quad w_i = 10^{\frac{\text{dBm}_i}{10}}$$
Ce calcul convertit la puissance logarithmique (dBm) en puissance linéaire réelle (milliwatts), isolant ainsi la position théorique du pylône émetteur avec une forte robustesse face aux réflexions d'immeubles.

### 5. Registre OpenCellID Gabon & GIS Sanity Check
* **Base locale intégrée** : Cartographie des pylônes officiels de Libreville, Akanda, Owendo et des corridors routiers nationaux.
* **Filtre de Plausibilité Géographique (Sanity Check)** : La formule de Haversine évalue en direct la distance entre l'utilisateur et l'antenne référencée :
  - `HIGH` (< 5 km) : **Cellule locale confirmée** (antenne de secteur direct).
  - `MEDIUM` (< 25 km) : **Couverture longue portée / péri-urbaine**.
  - `LOW` (> 25 km) : **Cell ID réutilisé** dans un autre secteur géographique (affiché à titre indicatif pour ne pas fausser la géométrie).

### 6. Surveillance Cyber-Sécurité (Anti IMSI-Catcher)
Radio Sentinel surveille en temps réel les indicateurs clés de sécurité 3GPP :
* **Détection du déclassement forcé (2G Downgrade Attack)** : Alerte rouge immédiate lors d'un basculement brutal d'une modulation 3G/4G chiffrée vers de la 2G (non chiffrée ou A5/1 compromis) associé à un saut de puissance anormal et un nouveau LAC.
* **Bandeau d'alerte interactif** : Sirène clignotante, diagnostic d'attaque et bouton de réinitialisation.
* **Module d'audit & simulation** : Endpoint `/api/security/simulate-downgrade` permettant de tester la chaîne d'alerte lors de présentations officielles ou d'exercices d'entraînement.

### 8. Générateur de Rapport d'Audit Exécutif (PDF / Print)

Accessible via le bouton **📄 Rapport Audit** dans le cockpit ou directement sur `/audit-report`, cette page génère un rapport officiel de couverture et de qualité de service (QoS) télécom, prêt à être imprimé ou exporté en PDF via la fonction d'impression du navigateur.

* **Métriques clés (KPI)** : SLA de couverture (%), volume d'échantillons géolocalisés, signal moyen en dBm, nombre de ruptures de service.
* **Répartition ARCEP/UIT** : Distribution visuelle Excellent / Bon / Moyen / Faible avec barres proportionnelles et table de comptage.
* **Analyse multi-opérateurs** : Tableau comparatif par PLMN (Gabon Telecom, Azur Gabon…) avec signal moyen et pic.
* **Inventaire des pylônes** : Cellules LTE/UMTS/GSM identifiées (Cell-ID, LAC, canal, hits).
* **Journal d'incidents sécurité** : Événements de downgrade et anomalies horodatés.
* **Mode impression natif** : CSS `@media print` dédié pour un rendu PDF propre sans éléments de navigation.

> Idéal pour une présentation formelle à un régulateur (ARCEP-GA), une DSI, ou un investisseur télécom.

### 7. Export 3D Google Earth (KML) & CSV
* **Export KML 3D (`/api/export-kml`)** : Modélise le trajet sous forme de colonnes ou de ruban continu dans Google Earth Pro. La hauteur d'extrusion de chaque point est proportionnelle à la qualité du signal radio reçu, permettant d'observer le relief de couverture hertzienne au-dessus des quartiers.
* **Export CSV (`/api/export-csv`)** : Export tabulaire exhaustif compatible Excel, pandas et QGIS pour les analyses statistiques approfondies.

### 8. Cockpit Modulaire Multi-Workspaces (UI v3 Anti-Saturation)
Pour éliminer l'empilement vertical monolithique et éviter toute surcharge cognitive :
* **Flight HUD Fixe (Barre Supérieure)** : Jauges de puissance instantanée, état de synchronisation du port COM, précision GNSS et boutons d'action rapide toujours visibles à l'écran.
* **5 Espaces de Travail Dédiés (Workspaces sans rechargement)** :
  - 🗺️ **Carte & SIG** : Vue cartographique plein format (75 % de l'écran) associée à un **drawer latéral rétractable** pour inspecter les métriques du pylône et la cellule sans masquer la carte.
  - ⚡ **Audit Bi-Réseau** : Comparateur 3 colonnes Clé USB vs SIM 4G avec diagnostic automatique de congestion cœur de réseau versus atténuation hertzienne.
  - 📊 **Spectre & Topologie** : Graphique temporel Chart.js grand format et tableau des cellules voisines (`AT+CCED=0,2`).
  - 🛡️ **Cyber-Sécurité** : Moniteur anti IMSI-Catcher (2G Downgrade) et journal exhaustif des événements réseau (`OUTAGE`, `RECONNECT`).
  - ⚙️ **Console AT & Matériel** : Fiche technique du modem Alcatel X602D et terminal interactif d'injection de commandes Hayes.

---

## 🔌 Spécifications des API REST

| Méthode | Route | Description |
| :---: | :--- | :--- |
| `GET` | `/` | Tableau de bord principal (Interface de supervision, carte Leaflet, graphes). |
| `GET` | `/gps` | Interface tactile pour le smartphone Samsung (balise satellite). |
| `POST` | `/api/gps` | Ingestion des coordonnées GPS transmises par le smartphone. |
| `GET` | `/api/gps` | Lecture de la dernière position GNSS connue et de l'état du capteur. |
| `GET` | `/api/telemetry/live` | Télémétrie globale en direct (RF, matériel, GPS, stats, pylône officiel). |
| `GET` | `/api/telemetry/history` | Historique glissant des mesures récentes pour Chart.js. |
| `GET` | `/api/map-points` | Échantillons géolocalisés pour le rendu de la Heatmap continue. |
| `POST` | `/api/security/simulate-downgrade` | Déclenchement d'une attaque simulée 2G Downgrade pour audit/démo. |
| `POST` | `/api/security/reset-alert` | Réinitialisation du moniteur de cyber-sécurité. |
| `POST` | `/api/clear-points` | Remise à zéro des traces GPS pour démarrer une nouvelle campagne. |
| `GET` | `/api/events` | Journal des coupures de faisceau (`OUTAGE`) et reconnexions. |
| `POST` | `/api/command` | Console d'injection directe de commandes AT vers le modem. |
| `GET` | `/api/export-csv` | Téléchargement du jeu de données brut au format CSV. |
| `GET` | `/api/export-kml` | Génération et téléchargement du modèle géospatial 3D Google Earth. |
| `GET` | `/api/status` | Statut du système, détection dynamique de l'IP locale et état du tunnel nomade 4G. |
| `POST` | `/api/tunnel` | Enregistrement / mise à jour de l'URL publique du tunnel nomade (Cloudflare / Ngrok). |
| `DELETE` | `/api/tunnel` | Révocation et fermeture de l'état du tunnel distant. |
| `GET` | `/audit-report` | Rapport d'audit télécom officiel interactif, imprimable en PDF. |
| `GET` | `/api/audit-report` | Données statistiques compilées : couverture SLA, opérateurs, inventaire pylônes, événements sécurité. |

---

## 📂 Structure des Fichiers

```text
antenne/
├── app.py                  # API REST FastAPI, routage des services et exports
├── modem_service.py        # Pilote série PnP, décodeur AT physique & moniteur sécurité
├── gps_service.py          # Gestionnaire de la balise satellite GNSS en mémoire
├── opencellid_service.py   # Base locale pylônes Gabon (MCC 628) & GIS Sanity Check
├── kml_service.py          # Moteur de génération de tracés 3D Google Earth
├── database.py             # Persistance spatio-temporelle SQLite (antenne.db)
├── lancer.bat              # Script de lancement automatique en un clic
├── tunnel.bat / .ps1       # Passerelle Cloudflare Tunnel (accès 4G extérieur sans Wi-Fi)
├── cert.pem / key.pem      # Certificat SSL local (requis pour l'API GPS sous Android)
├── README.md               # Documentation de référence du projet
├── static/
│   ├── app.js              # Moteur front-end (Leaflet, Heatmap, Chart.js, sécurité)
│   └── style.css           # Thème visuel sombre haute densité
└── templates/
    ├── index.html          # Tableau de bord de commandement
    └── gps.html            # Interface tactile mobile pour le Samsung A14
```

---

## 🚀 Guide de Démarrage Rapide

### 1. Démarrage de la Station Hôte (PC)
1. Insérez la clé modem Alcatel dans n'importe quel port USB.
2. Exécutez le script **`lancer.bat`**.
3. Accédez au tableau de bord local :  
   👉 **`https://127.0.0.1:8000`**

### 2. Appairage Mobile par QR Code Intelligent (Zéro Saisie Manuelle)
Pour ne jamais avoir à saisir de longues URLs sur le clavier de votre téléphone :
1. Sur le tableau de bord PC, cliquez sur le bouton violet **`📱 QR Code Mobile`** (ou double-cliquez sur `tunnel.bat` qui l'ouvre automatiquement avec l'URL publique).
2. La fenêtre modale intelligente propose deux environnements bien distincts :
   - 🌍 **Mode Sortie Nomade 4G (Recommandé pour sortir)** : Génère le QR Code de votre tunnel sécurisé Cloudflare (`https://xxxx.trycloudflare.com/gps`). En scannant ce code chez vous avant de sortir, votre smartphone charge l'URL publique : lorsque vous quittez la maison et que le Wi-Fi se coupe au profit de la 4G, **la transmission de télémétrie continue sans aucune coupure** !
   - 🏠 **Mode Wi-Fi Local (Maison)** : Génère le QR Code avec l'adresse IP de votre box (`https://192.168.1.x:8000/gps`), réservé aux tests intérieurs sous le même réseau Wi-Fi.
3. Deux cibles d'affichage au choix :
   - 🛰️ **Balise GPS & Sonde 4G (`/gps`)** : Interface tactile ultra-légère conçue pour tourner en tâche de fond dans la poche ou sur support pare-brise.
   - 📊 **Tableau de Bord Complet (`/`)** : Le cockpit de commandement complet avec la carte satellite HD et les graphiques en direct sur smartphone.
4. Pointez l'appareil photo du Samsung Galaxy A14 vers l'écran du PC et touchez la notification : Radio Sentinel est immédiatement appairé !
5. **Export PNG en un clic (`📥 Enregistrer PNG`)** : Téléchargez le QR Code sous forme d'image PNG haute résolution pour l'imprimer, l'envoyer par messagerie ou l'archiver pour vos futures sorties terrain.

#### Mode A : Vous emportez votre PC portable avec vous
1. Activez le **Point d'accès mobile (partage Wi-Fi)** sur votre Samsung Galaxy A14.
2. Connectez le PC au Wi-Fi du Samsung.
3. Ouvrez sur le smartphone : `https://<IP_DU_PC>:8000/gps` *(ex: `https://192.168.43.50:8000/gps`)*.
4. Aucun accès Internet fixe requis : 100 % autonome partout sur le terrain.

#### Mode B : Vous laissez le PC allumé à la maison et sortez avec le téléphone seul en 4G
1. Sur le PC à la maison, double-cliquez sur **`tunnel.bat`** *(ou `tunnel.bat -Provider ngrok` en secours si vous préférez Ngrok)*.
2. Une URL publique chiffrée HTTPS est générée automatiquement (Cloudflare Tunnel par défaut, gratuit sans compte ni restriction).
3. Le tableau de bord du PC s'ouvre automatiquement avec le **QR Code Nomade 4G**.
4. Pointez votre Samsung Galaxy A14 vers l'écran : le téléphone charge l'adresse publique Internet.
5. Dès que vous franchissez le pas de votre porte et que le Wi-Fi domestique bascule en 4G, **votre session continue sans aucune déconnexion** ! Deux modes au choix sur le smartphone :
   - **Option 1 (Tableau de bord All-in-One)** : Ouvrez `https://<VOTRE_TUNNEL>.trycloudflare.com` directement sur le smartphone et cliquez sur le bouton vert **`🛰️ Activer le GPS local`** en haut de page. Vous avez ainsi la carte satellite HD, les graphiques temps réel et la transmission GPS active sur un seul et même écran.
   - **Option 2 (Balise allégée)** : Ouvrez `https://<VOTRE_TUNNEL>.trycloudflare.com/gps` pour une interface tactile ultra-sobre minimisant la consommation de batterie.
6. Votre position satellite, votre débit 4G et vos pings sont injectés en continu dans la base de données de votre PC à la maison à travers la ville !

---

## 📢 Articles & Relais Communautaires

Des articles détaillés prêts pour publication et partage sont disponibles dans le dossier [`articles/`](articles/) :
* 🇫🇷 [Article complet en français pour LinuxFr / Korben / Dev.to](articles/article_linuxfr_korben_fr.md)
* 🇬🇧 [Hardware hacking deep-dive for Hackaday / Dev.to / Hacker News](articles/article_hackaday_devto_en.md)
* 💬 [Modèles de publications pour Reddit (r/wardriving, r/RTLSDR) & LinkedIn](articles/social_reddit_linkedin.md)
* 🔍 [Guide complet d'optimisation SEO & Google Search Console](SEO.md)
* 🎨 [Spécifications de la refonte UI/UX modulaire (v3)](UI_REDESIGN_SPECS.md)
