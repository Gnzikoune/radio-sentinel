# 📡 Radio Sentinel — Observatoire Cellulaire & Cartographie RF Personnel

> **Le couteau suisse personnel d'analyse et de cartographie des réseaux mobiles.**  
> Projet né du détournement d'usage d'une vieille clé USB 3G grand public (Alcatel OneTouch X602 / chipset Spreadtrum SC7702) et de la réutilisation d'un smartphone ordinaire (Samsung Galaxy A14) comme récepteur satellite de précision. **100 % fait maison, 0 € d'abonnement ou de matériel neuf, zéro valeur simulée.**

---

## 🎯 À quoi sert cet outil au quotidien ?

1. **Trouver le meilleur endroit pour capter chez soi ou au travail :**
   Savoir au décibel près à quelle fenêtre, sur quelle table ou dans quelle pièce le signal cellulaire est le plus puissant pour y poser son téléphone en partage de connexion ou son routeur 4G.
2. **Diagnostiquer objectivement les pannes Internet :**
   Quand la connexion saute ou ralentit, l'outil vous indique si l'antenne-relais a coupé (baisse brutale des dBm) ou si le problème vient d'ailleurs. Un journal enregistre l'heure exacte et la durée de chaque coupure.
3. **Cartographier la couverture de son quartier ou de ses trajets (Wardriving personnel) :**
   En emportant son ordinateur portable et son smartphone en déplacement, l'outil dessine votre trajet en direct sur une carte satellite avec un code couleur immédiat (Vert = excellent, Ambre = moyen, Rouge = zone morte).
4. **Mesurer la réalité physique sans filtre :**
   Les "petites barres" de signal sur un téléphone sont souvent trompeuses. Radio Sentinel affiche la valeur physique réelle en décibels-milliwatts (dBm), issue directement du processeur radio du modem.

---

## 📋 Table des Matières

1. [Matériel Utilisé (Récupération & Zéro Dépense)](#-matériel-utilisé-récupération--zéro-dépense)
2. [Phase 1 : Station Fixe & Télémétrie Réelle](#-phase-1--station-fixe--télémétrie-réelle)
   * [Chipset Spreadtrum SC7702 & Zero-CD](#chipset-spreadtrum-sc7702--zero-cd)
   * [Écoute Passive Sans Carte SIM (Mode Urgence 3GPP)](#écoute-passive-sans-carte-sim-mode-urgence-3gpp)
   * [Tolérance au Débranchement (Hot-Plug & Port Dynamique)](#tolérance-au-débranchement-hot-plug--port-dynamique)
3. [Phase 2 : Cartographie 2D & Relais GPS Mobile](#-phase-2--cartographie-2d--relais-gps-mobile)
   * [Le Relais Satellite Mobile Sans Application](#le-relais-satellite-mobile-sans-application)
   * [La Cartographie Interactive 2D Multi-Vues](#la-cartographie-interactive-2d-multi-vues)
   * [Filtre Anti-Dérive GPS (Haversine)](#filtre-anti-dérive-gps-haversine)
   * [Triangulation de l'Antenne-Relais](#triangulation-de-lantenne-relais)
4. [Guide d'Utilisation Pas à Pas](#-guide-dutilisation-pas-à-pas)
5. [Spécification des API REST](#-spécification-des-api-rest)
6. [Structure des Fichiers](#-structure-des-fichiers)
7. [Pistes d'Évolution Personnelle](#-pistes-dévolution-personnelle)

---

## 🛠️ Matériel Utilisé (Récupération & Zéro Dépense)

* **Clé USB Modem 3G/4G de récupération :**
  Alcatel OneTouch X602D (vendue à l'origine par l'opérateur Airtel Gabon), basée sur un processeur Spreadtrum SC7702.
* **Smartphone standard :**
  Samsung Galaxy A14 (utilisé pour son récepteur satellite multi-constellations GPS/Galileo/GLONASS).
* **PC sous Windows :**
  Porte le serveur local FastAPI et l'interface de contrôle.
* **Aucun dongle GPS dédié à acheter, aucune clé API payante.**

---

## 🔌 Phase 1 : Station Fixe & Télémétrie Réelle

### Chipset Spreadtrum SC7702 & Zero-CD
À l'insertion dans le port USB, la clé se fait passer pour un faux lecteur de CD-ROM virtuel (`VID_1BBB&PID_022C`) afin de proposer ses pilotes d'origine. Le système Windows commute ensuite le périphérique en mode modem composite, exposant un port série virtuel (ex: `COM9` ou `COM12`).

Radio Sentinel se connecte directement à ce port série pour dialoguer avec le processeur radio via les commandes normalisées **AT (Hayes)**.

### Écoute Passive Sans Carte SIM (Mode Urgence 3GPP)
Même **sans aucune carte SIM insérée**, la clé n'est pas muette :
* Conformément aux normes internationales 3GPP de sécurité publique (autorisant les appels d'urgence 112 / 911 sur n'importe quel réseau disponible), le modem écoute en continu les balises radio (**BCCH**) de l'antenne la plus proche.
* Réponse matérielle brute confirmée :
  ```text
  +CREG: 2, 8               -> "Emergency bearer services only"
  +COPS: 1, 2, "62801", 6   -> Accroché en 3G+ sur le réseau Gabon Telecom / Moov Africa
  +CSQ: 11, 99              -> Puissance brute reçue : -91 dBm
  ```

### Tolérance au Débranchement (Hot-Plug & Port Dynamique)
Le pilote Python (`modem_service.py`) scanne en permanence les identifiants matériels USB (`VID_1BBB`) :
* Si vous débranchez la clé ou changez de port USB, le système consigne immédiatement un événement **`OUTAGE`** et passe en attente.
* Dès que la clé est réinsérée (même sur un autre numéro de port COM), la liaison est rétablie en moins de 1,5 seconde et un événement **`RECONNECT`** est enregistré.

---

## 🗺️ Phase 2 : Cartographie 2D & Relais GPS Mobile

### Le Relais Satellite Mobile Sans Application
Pour éviter d'acheter un récepteur GPS USB pour le PC, le smartphone **Samsung Galaxy A14** sert de passerelle :
1. Le smartphone se connecte au PC via le réseau local (ou en partage de connexion Wi-Fi).
2. Il ouvre simplement la page web mobile servie par le PC :  
   👉 `https://192.168.1.134:8000/gps`
3. Grâce à l'API **HTML5 Geolocation (`watchPosition`)** et au protocole **Screen WakeLock** (qui garde l'écran allumé), le smartphone transmet ses coordonnées haute précision en continu au PC via `POST /api/gps`.
4. Le PC fusionne chaque seconde :  
   $$\mathbf{[Timestamp, Puissance\ dBm, CSQ, Opérateur, Latitude, Longitude, Précision, Vitesse]}$$

### La Cartographie Interactive 2D Multi-Vues
Le tableau de bord (`https://127.0.0.1:8000`) intègre une carte Leaflet interactive avec **4 vues gratuites sans clé API** :
* 🛰️ **Vue Satellite Mondiale Réelle** (*Esri World Imagery*)
* 🌑 **Vue Sombre / Nuit** (*OpenStreetMap Dark*)
* 🗺️ **Vue Rues / Cadastre** (*OpenStreetMap Standard*)
* ⛰️ **Vue Relief / Topographique** (*OpenTopoMap*)

Chaque point mesuré apparaît avec un code couleur immédiat :
* 🟢 **Vert :** Signal Excellent ($\ge -75\text{ dBm}$)
* 🟡 **Ambre :** Signal Moyen ($-76$ à $-90\text{ dBm}$)
* 🔴 **Rouge :** Signal Faible ou Zone Morte ($< -90\text{ dBm}$)

### Filtre Anti-Dérive GPS (Haversine)
En intérieur, les réflexions des signaux satellites sur les murs provoquent une dérive artificielle de ±6 à 12 mètres alors qu'on ne bouge pas.  
Radio Sentinel intègre un **filtre de distance Haversine** : un point d'historique n'est validé sur la carte que si le déplacement réel dépasse **6 mètres**, évitant ainsi de polluer la carte avec des points parasites stationnaires.

### Triangulation de l'Antenne-Relais
Pour estimer la position du pylône émetteur sans afficher de fausse information :
* **Tant que l'utilisateur est immobile (< 50 m couverts) :** L'antenne n'est pas dessinée, car le signal le plus fort serait confondu avec la position de la pièce. Un message indique : `⏳ Déplacez-vous pour trianguler l'antenne (≥ 50 m)`.
* **Dès que vous vous déplacez (≥ 50 m) :** L'algorithme place le **Point Jaune Éclatant 📡** sur la zone géographique ayant enregistré la plus forte puissance radio.

---

## 🚀 Guide d'Utilisation Pas à Pas

### 1. Démarrage sur votre PC
1. Branchez votre clé modem Alcatel sur un port USB.
2. Double-cliquez sur le fichier **`lancer.bat`**.
3. Ouvrez le tableau de bord sur votre PC :  
   👉 **`https://127.0.0.1:8000`**

### 2. Connexion du Samsung Galaxy A14 pour le GPS
1. Vérifiez que votre PC et votre smartphone sont sur le même réseau (ex : partage de connexion Wi-Fi du Samsung vers le PC).
2. Sur le navigateur du Samsung (Chrome ou Samsung Internet), ouvrez :  
   👉 **`https://192.168.1.134:8000/gps`**
3. Cliquez sur **"Paramètres avancés"** puis **"Continuer vers le site"** (acceptation du certificat SSL local).
4. Appuyez sur **`Démarrer la Transmission GPS`** et autorisez l'accès à la position.
5. **Instantanément :** Le badge GPS passe au vert sur le PC, la carte se centre sur vous, et chaque mesure est géolocalisée.

---

## 🔌 Spécification des API REST

| Méthode | Route | Rôle |
| :---: | :--- | :--- |
| `GET` | `/` | Tableau de bord principal (Carte 2D, Jauges, Graphe, Console AT). |
| `GET` | `/gps` | Interface tactile pour le smartphone Samsung. |
| `POST` | `/api/gps` | Réception des coordonnées GPS du smartphone. |
| `GET` | `/api/gps` | Lecture de la dernière position satellite connue. |
| `GET` | `/api/telemetry/live` | État complet en direct (Signal, Opérateur, GPS, Stats). |
| `GET` | `/api/map-points` | Historique des points géolocalisés pour Leaflet. |
| `POST` | `/api/clear-points`| Réinitialise le tracé pour repartir sur une carte propre. |
| `GET` | `/api/events` | Journal des coupures (`OUTAGE`) et reconnexions. |
| `POST` | `/api/command` | Envoi d'une commande AT directe au modem. |
| `GET` | `/api/export-csv` | Téléchargement du fichier tableur CSV complet. |

---

## 📂 Structure des Fichiers

```text
antenne/
├── app.py               # Serveur FastAPI (Dashboard, API REST, Relais GPS, Export CSV)
├── modem_service.py     # Pilote série PnP, reconnexion auto et lecture des commandes AT
├── gps_service.py       # Module de synchronisation satellite en mémoire
├── database.py          # Stockage SQLite (antenne.db) pour l'historique et les pannes
├── lancer.bat           # Démarrage rapide en 1 clic
├── cert.pem / key.pem   # Certificat SSL local pour autoriser le GPS sous Android
├── README.md            # Ce document de référence
├── GUIDE_MAKER.md       # Guide complet pas à pas pour les passionnés de tech
├── static/
│   ├── app.js           # Front-end (Leaflet multi-vues, Chart.js, filtres, télémétrie)
│   └── style.css        # Interface sombre
└── templates/
    ├── index.html       # Tableau de bord principal sur PC
    └── gps.html         # Page mobile tactile pour le smartphone
```

---

## 💡 Pistes d'Évolution Personnelle

* **Mode "Détecteur de signal sonore" :** Un bip sonore modulé en fréquence selon les dBm pour trouver le meilleur endroit où poser son téléphone dans une pièce sans regarder l'écran.
* **Test comparatif multi-cartes SIM :** Insérer tour à tour une puce Airtel et une puce Moov pour comparer objectivement les performances réelles chez soi.
* **Bilan automatique de coupure :** Calcul automatique de la durée totale d'indisponibilité du réseau sur 24 heures.
