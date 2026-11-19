# 🎨 Spécifications de Refonte UI/UX : Radio Sentinel v3 « Cockpit Modulaire »

---

## 1. Diagnostic de l'Interface Actuelle : Pourquoi est-elle saturée ?

L'interface actuelle souffre du syndrome du **« tableau de bord vertical monolithique »** :
1. **Surcharge cognitive immédiate** : 4 cartes KPI + 1 bandeau d'audit bi-réseau + 1 bandeau d'alerte sécurité + 1 carte Leaflet + 1 graphique Chart.js + 1 panneau matériel + 1 console AT + 1 journal d'événements sont empilés les uns sous les autres sur une seule page déroulante.
2. **Conflit d'attention** : L'utilisateur qui roule ou marche en wardriving veut surveiller la carte satellite ; mais pour vérifier la console AT ou les logs, il doit scroller tout en bas et perd la vue sur la carte.
3. **Absence de hiérarchisation des rôles** : Un technicien terrain n'a pas besoin de la console AT ouverte en permanence ; un analyste cyber n'a pas besoin de voir les tuiles satellites en grand écran quand il inspecte les trames 2G.

---

## 2. Best Practices Internationales (NOC & Surveillance Spectrale)

D'après les benchmarks des stations d'ingénierie RF modernes (NOC télécoms, FlightRadar24, Grafana, CellMapper, Starlink Terminal UI) :

1. **Le paradigme du « Flight HUD » persistant (En-tête haute densité)** :
   Une barre supérieure fine (56px) qui reste **fixe en haut de l'écran** et affiche en permanence les 4 métriques vitales :
   - Puissance instantanée (`-89 dBm` / CSQ avec jauge couleur)
   - Opérateur actif & Technologie (`Moov 3G+` ou `Airtel 4G`)
   - Cell ID & Canal (`Cell 921 • CH 10712`)
   - État GPS & Sonde (`Précision 3.2m • 0 km/h`)
   - Sélecteur d'onglets / espaces de travail.

2. **La divulgation progressive (Progressive Disclosure)** :
   Découpage de l'application en **5 Espaces de Travail (Workspaces)** accessibles via des onglets instantanés (sans rechargement de page) :
   - 🗺️ **1. Carte & SIG** (Focus Cartographique 80% + Drawer latéral d'informations)
   - ⚡ **2. Audit Bi-Réseau** (Comparateur Clé USB vs SIM 4G & Diagnostic de saturation)
   - 📊 **3. Spectre & Historique** (Graphiques Chart.js grand format + Cellules voisines)
   - 🛡️ **4. Cyber-Sécurité** (Moniteur anti-IMSI Catcher + Journal d'événements)
   - ⚙️ **5. Console AT & Matériel** (Terminal Hayes interactif + Spécifications hardware)

3. **Le panneau latéral contextuel (Contextual Drawer / Split-Screen)** :
   Dans l'onglet Cartographie, cliquer sur un pylône ou sur sa propre position ouvre un tiroir rétractable à droite (comme sur FlightRadar24 ou Google Maps), sans masquer le reste de la carte.

---

## 3. Maquette Fonctionnelle & Wireframe (Architecture v3)

```text
+----------------------------------------------------------------------------------------------------+
| 📡 RADIO SENTINEL | -89 dBm [==== ] | MOOV GABON (3G+) | CELL 921 | GPS: OK (3m) | [📱 QR] [🛰️ GPS]  |
| Tabs: [ 🗺️ Carte SIG ]  [ ⚡ Bi-Réseau ]  [ 📊 Spectre ]  [ 🛡️ Cyber-Sécurité ]  [ ⚙️ Matériel & AT ]   |
+----------------------------------------------------------------------------------------------------+
|                                                                    | PANNEAU CONTEXTUEL RETRACTABLE |
|                                                                    |--------------------------------|
|                                                                    | 📍 PYLÔNE ACTIF                |
|                    VUE PLEIN ÉCRAN CARTE LEAFLET                   | Nom: Batterie IV               |
|                                                                    | Distance: 1.4 km               |
|                    - Fond Satellite Google HD                      | Confiance: HIGH (Vérifié)      |
|                    - Heatmap continue dBm                          |                                |
|                    - Pylônes OpenCellID Gabon                      | ⚡ COUVERTURE LOCALE           |
|                    - Faisceau RF vectoriel                         | Signal: Bon (-89 dBm)          |
|                                                                    | Canal: 10712 (2140 MHz)        |
|                                                                    |                                |
|                                                                    | [📥 Export KML 3D] [🗑️ Reset]  |
+--------------------------------------------------------------------+--------------------------------+
```

---

## 4. Détail des 5 Espaces de Travail

### Espace 1 : 🗺️ Carte & SIG (Espace Principal par Défaut)
* **Carte en plein écran (80 % ou 100 % de la vue)** avec sélecteur de couches discret en bas à gauche.
* **Tiroir d'ingénierie rétractable (Sidebar)** à droite avec :
  - Identité du pylône accroché et score de confiance Haversine.
  - Statistiques rapides (Moyenne dBm, points collectés, coupures).
  - Boutons d'action rapide (Centrer sur ma position, Export 3D KML, Remise à zéro).

### Espace 2 : ⚡ Audit Bi-Réseau & Performance 4G
* Tableau comparatif côte à côte en 3 colonnes :
  - **Colonne 1 (Clé USB)** : Spectre brut, dBm, canal physique, cellules voisines.
  - **Colonne 2 (Samsung A14 SIM)** : Débit 4G réel (Mbps), latence RTT, ping serveur.
  - **Colonne 3 (Moteur de Diagnostic)** : Diagnostic automatique en temps réel (Nominal / Congestion Cœur de Réseau / Atténuation hertzienne / Audit comparatif).

### Espace 3 : 📊 Spectre & Historique
* Graphique Chart.js de signal grand format sur toute la largeur (avec zoom temporel).
* Tableau exhaustif des **Cellules Voisines** (`AT+CCED=0,2`) avec leurs LAC, Cell ID, canaux et niveaux de puissance reçus (RxLev).

### Espace 4 : 🛡️ Cyber-Sécurité & Logs
* Moniteur de détection d'IMSI-Catcher (Anti 2G Downgrade).
* Sirène visuelle et historique des alertes d'interception.
* Boutons d'audit : « Simuler une attaque 2G Downgrade » et « Réinitialiser ».
* Journal en direct de tous les événements réseau (`RECONNECT`, `OUTAGE`, `SECURITY_ALERT`, `TUNNEL_ONLINE`).

### Espace 5 : ⚙️ Matériel & Console AT
* Fiche d'identité du matériel (Modèle Alcatel X602D, IMEI, Version Firmware, Port COM physique).
* Terminal interactif d'envoi de commandes AT Hayes directes avec historique des commandes (touche flèche haut/bas) et affichage colorisé des réponses du modem.

---

## 5. Feuille de Route d'Implémentation Recommandée

| Phase | Branche Git | Livrable |
|---|---|---|
| **Phase 1** | `feature/ui-flight-hud-header` | Implémentation du bandeau supérieur persistant (HUD) avec jauges compactes et barre d'onglets. |
| **Phase 2** | `feature/ui-workspace-tabs` | Mise en place du routeur d'onglets sans rechargement (Tabs) et conteneurs isolés. |
| **Phase 3** | `feature/ui-gis-drawer` | Carte Leaflet plein écran avec tiroir rétractable d'ingénierie à droite. |
| **Phase 4** | `feature/ui-at-terminal-modern` | Console AT interactive avec coloration syntaxique et autocomplétion. |
