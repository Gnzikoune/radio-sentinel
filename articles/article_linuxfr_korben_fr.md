# Comment j'ai transformé une vieille clé USB 3G en observatoire de réseau mobile à 0 € (Radio Sentinel)

*Article prêt pour publication sur LinuxFr.org, Korben.info, Dev.to ou Medium.*

---

## Introduction : Le constat des tiroirs encombrés

Nous avons tous dans nos tiroirs de vieilles clés USB 3G qui prenaient la poussière depuis l'avènement de la 4G et de la 5G. Considérées comme obsolètes et vouées à la déchetterie électronique, ces clés renferment pourtant un concentré d'ingénierie radiofréquence (RF) tout à fait opérationnel : un synthétiseur RF bande étroite, un modem bande de base (baseband) et une pile de protocoles 3GPP complète.

Face au manque de visibilité citoyenne sur la qualité réelle de couverture des opérateurs télécoms (notamment au Gabon avec Moov Africa et Airtel), j'ai décidé de concevoir **Radio Sentinel** : une station autonome de cartographie spectrale, d'audit bi-réseau et de détection d'anomalies de cyber-sécurité (IMSI-Catchers), sans dépenser un seul centime et sans aucun abonnement.

Voici comment ce projet fonctionne et comment le reproduire chez vous.

---

## 1. Le Matériel : Deux objets du quotidien

Le montage repose sur deux éléments que beaucoup possèdent déjà :
1. **Une clé USB 3G récupérée** : Un modèle grand public **Alcatel OneTouch X602D** (*TCT Mobile*, chipset Spreadtrum SC7702, interface composite USB `VID_1BBB&PID_022C`).
2. **Un smartphone Android ordinaire** : Un Samsung Galaxy A14, utilisé sans aucune application tierce grâce aux APIs web standards de son navigateur.
3. **Un PC hôte** : Tournant sous Windows ou Linux avec Python 3.10+, FastAPI et SQLite.

---

## 2. Le détournement logiciel : Quand les commandes Hayes reprennent vie

Au lieu d'utiliser le logiciel propriétaire du fabricant, Radio Sentinel interagit directement avec le port série virtuel du modem (`/dev/ttyUSB*` sous Linux ou `COM9` sous Windows) à 115 200 bauds.

Le microcontrôleur du modem est interrogé à travers des instructions normalisées 3GPP :
* **`AT+CSQ`** : Retourne la qualité de signal brute, instantanément convertie en décibels-milliwatts ($\text{dBm} = 2 \times \text{CSQ} - 113$).
* **`AT+COPS?`** : Identifie l'opérateur cellulaire accroché (`628-01` pour Moov, `628-02` pour Airtel, `628-03` pour Azur).
* **`AT+CREG?`** : Surveille l'état d'enregistrement au réseau.
* **`AT+CCED=0,1`** : Extrait la topologie cellulaire profonde : le **Cell ID** (identifiant de l'antenne émettrice), le **LAC** (*Location Area Code*) et le canal physique **UARFCN**, permettant de calculer la fréquence radio exacte en MHz (ex : bande 900 MHz ou 2100 MHz).
* **Mode Urgence 3GPP (Sans SIM)** : Même sans aucune carte SIM insérée, la réglementation internationale impose aux modems de synchroniser les canaux balises (*Broadcast Control Channel - BCCH*) pour les appels de secours (112/911). Radio Sentinel exploite cette obligation légale pour cartographier passivement le réseau le plus fort disponible !

---

## 3. L'astuce du smartphone : Couplage GPS et Télémétrie 4G active

Pour éviter d'acheter un dongle GPS USB supplémentaire :
1. Le smartphone charge une page web ultra-légère servie par le PC via un **QR Code intelligent**.
2. Grâce à l'API HTML5 `navigator.geolocation`, le smartphone transmet en continu ses coordonnées satellites haute précision.
3. Grâce à l'API `NetworkInformation`, le smartphone remonte son débit descendant estimé (Mbps) et sa latence aller-retour (RTT).

### L'audit Bi-Réseau en temps réel
Si le modem écoute par exemple le spectre d'un opérateur A en passif et que le smartphone dispose d'une SIM de l'opérateur B, Radio Sentinel effectue un comparatif en direct sur le même écran : puissance hertzienne versus expérience utilisateur réelle.

Radio Sentinel isole immédiatement les responsabilités :
- **Saturation Cœur de Réseau** : Signal radio excellent (ex. -75 dBm) mais latence qui explose (> 300 ms) $\rightarrow$ la cellule émet bien, mais la bande passante de l'opérateur est congestionnée.
- **Atténuation Hertzienne** : Chute brutale des dBm et du débit $\rightarrow$ zone d'ombre ou masque topographique.

---

## 4. Cyber-Sécurité : La détection des IMSI-Catchers

Les fausses antennes relais pirates (*IMSI-Catchers*) utilisent fréquemment la technique du **2G Downgrade Attack** : elles forcent les téléphones aux alentours à rétrograder d'une modulation 3G/4G chiffrée vers de la 2G GSM non chiffrée (ou avec chiffrement A5/1 cassé), tout en émettant une puissance anormale pour attirer le trafic.

Radio Sentinel surveille en temps réel l'intégrité de la modulation radio : en cas de déclassement brutal 3G->2G associé à un saut suspect de dBm et à un nouveau code de zone (LAC), une alerte rouge clignotante retentit immédiatement sur le tableau de bord avec horodatage dans le journal de sécurité.

---

## 5. Cartographie SIG et Export 3D Google Earth

L'interface web (bâtie avec Leaflet, Chart.js et Tailwind CSS) propose :
* Un dégradé continu de couverture radio par interpolation spatiale (Heatmap).
* Une vue satellite Google HD mondiale sans aucune clé API payante requise.
* Un barycentre pondéré en milliwatts réels ($10^{\text{dBm}/10}\text{ mW}$) pour trianguler l'emplacement des pylônes.
* Un export en un clic vers **Google Earth Pro (KML 3D)** : le trajet est modélisé sous la forme d'un ruban 3D où chaque point GPS est extrudé en hauteur selon la puissance reçue en dBm.

---

## 6. Tester et contribuer

Le projet est 100 % souverain sous licence MIT et disponible sur GitHub :

👉 **Dépôt GitHub :** [https://github.com/Gnzikoune/radio-sentinel](https://github.com/Gnzikoune/radio-sentinel)  
👉 **Site web vitrine :** [https://gnzikoune.github.io/radio-sentinel/](https://gnzikoune.github.io/radio-sentinel/)

N'hésitez pas à tester le projet avec vos propres clés 3G/4G, à ouvrir des issues ou à partager vos tracés de couverture !
