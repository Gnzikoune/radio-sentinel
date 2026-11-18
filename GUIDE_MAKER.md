# 🛠️ Le Guide du Maker — De la Clé 3G Oubliée à l'Observatoire Radio Personnel

> **Guide technique et pratique pas à pas**  
> Ce document retrace l'intégralité de la démarche de rétro-ingénierie, de détournement d'usage et de développement logiciel menée pour transformer un vieux modem USB 3G et un smartphone classique en un véritable laboratoire personnel d'analyse et de cartographie des ondes radio.

---

## 🧭 Sommaire

1. [La Philosophie du Projet : Zéro Achat, Zéro Dépendance](#1-la-philosophie-du-projet--zéro-achat-zéro-dépendance)
2. [Étape 1 : Rétro-ingénierie Matérielle du Modem USB](#2-étape-1--rétro-ingénierie-matérielle-du-modem-usb)
   * [Identification du Chipset & Périphérique](#identification-du-chipset--périphérique)
   * [Le Piège du "Zero-CD"](#le-piège-du-zero-cd)
   * [L'Astuce de l'Écoute Passive Sans Carte SIM](#lastuce-de-lécoute-passive-sans-carte-sim)
3. [Étape 2 : Dialogue avec le Processeur via les Commandes AT](#3-étape-2--dialogue-avec-le-processeur-via-les-commandes-at)
   * [Les Commandes Clés Découvertes](#les-commandes-clés-découvertes)
   * [La Formule Physique des dBm](#la-formule-physique-des-dbm)
4. [Étape 3 : Conception de la Station d'Acquisition (Python / FastAPI)](#4-étape-3--conception-de-la-station-dacquisition-python--fastapi)
   * [Le Pilote Série Résilient (Gestion Hot-Plug)](#le-pilote-série-résilient-gestion-hot-plug)
   * [La Base de Données Locale SQLite](#la-base-de-données-locale-sqlite)
5. [Étape 4 : Détournement du Smartphone en Balise Satellite (GPS)](#5-étape-4--détournement-du-smartphone-en-balise-satellite-gps)
   * [Le Problème du Dongle GPS Manquant](#le-problème-du-dongle-gps-manquant)
   * [L'Obstacle du HTTPS sous Android](#lobstacle-du-https-sous-android)
   * [Génération du Certificat SSL Local](#génération-du-certificat-ssl-local)
   * [Le Relais Mobile via HTML5 Geolocation & WakeLock](#le-relais-mobile-via-html5-geolocation--wakelock)
6. [Étape 5 : Cartographie Interactive & Résolution des Pièges Physiques](#6-étape-5--cartographie-interactive--résolution-des-pièges-physiques)
   * [Intégration Leaflet Multi-Vues 100% Gratuite](#intégration-leaflet-multi-vues-100-gratuite)
   * [Résolution du Bruit Satellite en Intérieur (Filtre Haversine)](#résolution-du-bruit-satellite-en-intérieur-filtre-haversine)
   * [Correction de la Triangulation de l'Antenne (Règle des 50 m)](#correction-de-la-triangulation-de-lantenne-règle-des-50-m)
7. [Étape 6 : Synthèse pour Tout Amateur de Technologie](#7-étape-6--synthèse-pour-tout-amateur-de-technologie)

---

## 1. La Philosophie du Projet : Zéro Achat, Zéro Dépendance

Trop souvent, quand on souhaite analyser un réseau ou cartographier des ondes radio (wardriving), les tutoriels recommandent d'acheter du matériel coûteux : antenne SDR HackRF (300 €), dongle GPS USB (40 €), abonnement à des services d'API cartographiques payants (Google Maps).

**L'approche "Maker" de ce projet prend le contre-pied absolu :**
1. **Recycler un déchet électronique :** Une clé USB 3G/4G achetée il y a des années pour quelques milliers de francs CFA, souvent oubliée au fond d'un tiroir.
2. **Réutiliser le matériel déjà en votre possession :** Votre smartphone ordinaire (Samsung Galaxy A14) possède déjà une puce de géolocalisation par satellite d'une précision remarquable.
3. **Zéro dépense récurrente :** Aucune carte SIM requise pour capter les ondes, aucun abonnement, aucune clé API propriétaire.
4. **Zéro simulation :** 100 % des chiffres et des points affichés proviennent directement de la physique des ondes captées par le circuit imprimé.

---

## 2. Étape 1 : Rétro-ingénierie Matérielle du Modem USB

### Identification du Chipset & Périphérique
À la première inspection sous Windows, la clé insérée est une **Alcatel OneTouch X602D** commercialisée par **Airtel Gabon**, avec les caractéristiques suivantes :
* **Constructeur :** TCT Mobile Limited
* **Chipset :** Spreadtrum SC7702 (cœur ARM télécom)
* **Identifiant matériel USB :** `VID_1BBB&PID_022C`

### Le Piège du "Zero-CD"
Tous les modems 3G grand public intègrent une technologie appelée **Zero-CD** :
* À l'insertion dans le port USB, la clé ne se présente **pas** comme un modem, mais comme un **lecteur de CD-ROM virtuel** contenant le logiciel propriétaire d'installation de l'opérateur (souvent obsolète et plein de bloatware).
* Dès que le pilote Windows reconnaît le périphérique, il envoie une instruction spéciale (commande SCSI ou message USB) pour faire basculer le matériel en **mode composite série**.
* C'est seulement après cette bascule que les ports série virtuels apparaissent dans le Gestionnaire de périphériques (par exemple `COM9` ou `COM12`).

### L'Astuce de l'Écoute Passive Sans Carte SIM
Une question fondamentale s'est posée : *Peut-on mesurer les ondes si la clé n'a pas de carte SIM insérée ?*  
La réponse est **OUI**, grâce à la réglementation internationale des télécoms (normes 3GPP) :
* Pour garantir que n'importe qui puisse composer le numéro des secours d'urgence (**112** ou **911**) même avec un téléphone sans puce, tout modem cellulaire en état de marche a l'obligation légale de chercher et de synchroniser les balises publiques de signalisation (**BCCH**) de l'antenne-relais la plus proche.
* Dans ce mode dit **d'urgence** (`+CREG: 2,8`), le modem mesure en permanence l'intensité du signal électromagnétique, sans qu'aucun compte opérateur ou forfait ne soit nécessaire !

---

## 3. Étape 2 : Dialogue avec le Processeur via les Commandes AT

Le processeur radio de la clé communique via le jeu d'instructions normalisé **AT (Hayes)** sur liaison série RS-232 émulée à 115 200 bauds.

### Les Commandes Clés Découvertes

| Commande | Rôle | Réponse Matérielle Obtenue |
| :--- | :--- | :--- |
| `ATI` | Identification du firmware | `Manufacturer: TCT Mobile Limited. / Model: X602D` |
| `AT+CGSN` | Numéro de série matériel unique | Lecture de l'IMEI réel de l'appareil (`86434302...`) |
| `AT+CSQ` | **Force du signal reçu** | `+CSQ: 11,99` (CSQ = 11 sur une échelle de 0 à 31) |
| `AT+COPS?` | Opérateur de rattachement | `+COPS: 1,2,"62801",6` (Code 62801 = Gabon Telecom / Moov Africa en 3G+) |
| `AT+CREG?` | Statut du réseau | `+CREG: 2,8` (Mode d'urgence sans carte SIM) |

### La Formule Physique des dBm
L'indice CSQ retourné par le modem est un entier compris entre 0 et 31. Pour obtenir la véritable puissance reçue par l'antenne en **décibels-milliwatts (dBm)**, on applique la formule normalisée par l'ETSI :

$$\text{dBm} = -113 + (2 \times \text{CSQ})$$

*Pour notre mesure `CSQ = 11` :*
$$\text{dBm} = -113 + (2 \times 11) = -113 + 22 = \mathbf{-91\text{ dBm}}$$

Cette mesure (-91 dBm) correspond parfaitement à la physique d'une onde 3G reçue à l'intérieur d'un bâtiment urbain à Libreville.

---

## 4. Étape 3 : Conception de la Station d'Acquisition (Python / FastAPI)

Pour automatiser la collecte et créer une interface moderne, nous avons conçu une application légère en Python.

### Le Pilote Série Résilient (Gestion Hot-Plug)
Un piège classique en développement matériel est de coder en dur le numéro de port (ex: `COM9`). Si l'utilisateur débranche sa clé et la rebranche sur le port USB voisin, Windows lui attribue souvent un autre port (ex: `COM12`), et le programme plante.

**La solution mise en place dans `modem_service.py` :**
* Le programme interroge la liste des périphériques USB via `serial.tools.list_ports`.
* Il recherche dynamiquement tout périphérique portant l'identifiant matériel `VID_1BBB` (signature Alcatel).
* En cas de déconnexion physique, le script ne crashe pas : il enregistre un événement **`OUTAGE`** dans la base et scrute en arrière-plan toutes les 1,5 seconde.
* Dès réinsertion, la connexion se rétablit automatiquement sans intervention de l'utilisateur.

### La Base de Données Locale SQLite
Toutes les données sont stockées localement dans `antenne.db` avec deux tables :
1. **`telemetry` :** Horodatage, CSQ, dBm, opérateur, technologie, latitude, longitude, précision GPS, vitesse.
2. **`events` :** Historique des pannes réseau (`OUTAGE`) et des reprises (`RECONNECT`).

---

## 5. Étape 4 : Détournement du Smartphone en Balise Satellite (GPS)

### Le Problème du Dongle GPS Manquant
Pour cartographier le signal sur une carte, il faut connaître sa position à chaque seconde. Acheter un récepteur GPS USB pour le PC était exclu par la philosophie du projet.

### L'Obstacle du HTTPS sous Android
Un smartphone Samsung Galaxy A14 intègre une puce GNSS multi-constellations très précise. Mais un problème de sécurité moderne s'est dressé :
* **Google Chrome et Samsung Internet interdisent catégoriquement l'accès au GPS sur un site en HTTP non sécurisé.**
* Pour que le smartphone accepte de transmettre ses coordonnées GPS au serveur local du PC, le serveur **doit obligatoirement être servi en HTTPS**.

### Génération du Certificat SSL Local
Pour contourner ce blocage sans payer de certificat auprès d'une autorité commerciale, nous avons généré un certificat auto-signé valide avec Subject Alternative Names (SAN) incluant l'adresse IP locale du PC (`192.168.1.134`) :
* Fichiers générés : `cert.pem` et `key.pem`.
* Démarrage du serveur Uvicorn avec le chiffrement SSL activé.
* Sur le smartphone, il suffit de cliquer une seule fois sur **"Paramètres avancés > Continuer"** pour débloquer l'accès.

### Le Relais Mobile via HTML5 Geolocation & WakeLock
La page web mobile (`templates/gps.html`) utilise deux APIs natives des navigateurs récents :
1. **`navigator.geolocation.watchPosition` :** Récupère la position satellite en continu avec l'option `enableHighAccuracy: true`.
2. **`navigator.wakeLock.request('screen')` :** Empêche le smartphone de verrouiller son écran pendant que vous marchez, assurant un flux continu de coordonnées vers le PC via des requêtes `POST /api/gps`.

---

## 6. Étape 5 : Cartographie Interactive & Résolution des Pièges Physiques

### Intégration Leaflet Multi-Vues 100% Gratuite
Pour afficher la carte sans dépendre d'une clé d'API payante (comme Google Maps ou Mapbox), nous avons intégré la bibliothèque open-source **Leaflet** avec 4 sources de tuiles gratuites mondiales :
* **Esri World Imagery :** Vue satellite haute résolution photographique.
* **OpenStreetMap Dark :** Vue sombre idéale pour le tableau de bord de nuit.
* **OpenStreetMap Standard :** Vue des rues, quartiers et boulevards.
* **OpenTopoMap :** Vue du relief et des courbes de niveau topographiques.

### Résolution du Bruit Satellite en Intérieur (Filtre Haversine)
**Le phénomène rencontré :** Lorsque vous laissez le smartphone posé sur votre bureau sans bouger, les ondes GPS ricochent sur les murs et le plafond (effet *multipath*). La puce GPS calcule alors des coordonnées qui dérivent de 5 à 12 mètres, créant une constellation de faux points rouges sur la carte comme si vous vous étiez déplacé.

**La formule mathématique de Haversine appliquée :**
Pour calculer la distance réelle en mètres entre deux points géographiques $(\text{lat}_1, \text{lon}_1)$ et $(\text{lat}_2, \text{lon}_2)$ :

$$a = \sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta \text{lon}}{2}\right)$$
$$d = 2 \cdot R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right) \quad \text{avec } R = 6\,371\,000\text{ mètres}$$

**Le filtre logiciel :** Tout point dont la distance par rapport au précédent est **inférieure à 6 mètres** est filtré. La carte reste propre et exempte de bruit statique.

### Correction de la Triangulation de l'Antenne (Règle des 50 m)
**Le problème initial :** Le marqueur jaune représentant l'antenne-relais était programmé pour se placer au point ayant enregistré le meilleur signal en dBm. En restant dans votre pièce, votre propre position était mécaniquement le point avec le meilleur signal : l'antenne apparaissait donc posée sur votre bureau !

**La correction algorithmique :**
* Le système calcule l'étendue géographique totale des points collectés.
* **Tant que cette étendue est inférieure à 50 mètres :** Aucun point jaune n'est affiché, et un message indique clairement :  
  `⏳ Déplacez-vous pour trianguler l'antenne (≥ 50 m)`.
* **Dès que vous couvrez plus de 50 mètres :** La triangulation devient géographiquement significative, et le point jaune 📡 s'installe à l'endroit de plus forte convergence des ondes.

---

## 7. Étape 6 : Synthèse pour Tout Amateur de Technologie

Si vous souhaitez reproduire cette démarche sur votre propre matériel ou l'adapter à un autre projet, voici les grands enseignements à retenir :

1. **Ne jetez jamais un vieux modem 3G/4G :** Même si la 3G est vouée à disparaître au profit de la 4G/5G, ces clés restent des analyseurs de spectre radio low-cost pilotables en Python via de simples commandes séries AT.
2. **Votre téléphone est une station de capteurs ambulante :** Inutile d'acheter des capteurs externes quand un smartphone moderne intègre déjà du Wi-Fi, du Bluetooth, un magnétomètre, un accéléromètre et un récepteur GNSS multi-satellites accessible en 10 lignes de JavaScript.
3. **Le web standard suffit :** Avec FastAPI, Leaflet et Chart.js, il est possible de bâtir un tableau de bord digne d'une salle de contrôle industrielle sans aucune dépendance lourde ni abonnement cloud.
4. **La physique a toujours le dernier mot :** Un bon projet matériel ne se résume pas à afficher des données : il faut comprendre la physique des ondes (formule des dBm, réflexion multipath, géométrie de triangulation) pour que les chiffres affichés aient un véritable sens scientifique.

---

*Document réalisé dans le cadre du projet Radio Sentinel — Conçu avec passion par et pour les amateurs de technologies souveraines et indépendantes.*
