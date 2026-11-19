# 📣 Messages Prêts à Publier sur les Communautés Spécialisées

---

## 1. Reddit : r/wardriving & r/RTLSDR & r/selfhosted

**Titre :**  
> I built Radio Sentinel: an souverain cellular RF wardriving station & rogue base station detector made from an upcycled $0 3G USB stick and an Android phone

**Contenu (Markdown) :**
```text
Hey everyone!

I wanted to share a project I've been building over the past weeks: **Radio Sentinel**.

Like many of you, I had an old Alcatel OneTouch X602D 3G USB modem (Spreadtrum SC7702) sitting in a drawer doing nothing. Instead of throwing it away, I wrote a Python/FastAPI engine that talks directly to its serial AT interface.

Here is what it does with zero paid APIs and zero third-party mobile apps:
- 📡 **Raw Physical Layer Telemetry**: Polls AT+CSQ, AT+CCED, AT+COPS to compute exact dBm, Cell ID, LAC, and UARFCN carrier frequency (MHz).
- 📱 **Smartphone GNSS & 4G QoS Relay**: You scan a Smart QR Code on your PC with your phone (no app needed, uses standard HTML5 Geolocation + NetworkInformation APIs). It relays GPS coordinates, estimated 4G downlink speed, and latency.
- ⚡ **Dual-Network Correlation**: Passively sniffs Operator A on the USB stick (works even without SIM via 3GPP emergency broadcast mode) while measuring active 4G data performance on Operator B through the phone SIM.
- 🛡️ **IMSI-Catcher / 2G Downgrade Attack Detection**: Real-time alerts when forced from 3G/4G down to unencrypted 2G GSM with unexpected power surges.
- 🗺️ **GIS Heatmap & 3D Google Earth Export**: Continuous signal heatmapping with Leaflet, plus 3D extruded ribbon export to KML.
- 🌍 **Zero-Config Remote Nomad Tunnel**: Integrated Cloudflare tunnel launcher so you can leave your PC at home and wardrive with just your phone on cellular data.

Code is 100% souverain under MIT:
👉 GitHub: https://github.com/Gnzikoune/radio-sentinel
👉 Live Showcase: https://gnzikoune.github.io/radio-sentinel/

Would love your thoughts, feedback, and pull requests!
```

---

## 2. LinkedIn (Pour la communauté Télécoms, Cybersécurité et Tech Afrique / Monde)

**Texte du post :**
```text
📡 Peut-on transformer une vieille clé USB 3G oubliée au fond d'un tiroir en station d'audit radio et de cybersécurité télécom professionnelle à 0 € ?

C'est le défi relevé avec le projet souverain que je viens de publier : Radio Sentinel.

En combinant une clé USB 3G recyclée (Alcatel X602D) et un smartphone Android ordinaire (Samsung Galaxy A14), la plateforme offre :

✅ Cartographie de couverture hertzienne continue (Heatmap SIG haute précision)
✅ Audit bi-réseau en temps réel : écoute spectrale passive (sans SIM) corrélée à l'expérience utilisateur 4G réelle (débit descendant, latence RTT, ping)
✅ Détection de faux relais cellulaires (IMSI-Catchers) via l'analyse des rétrogradations suspectes 3G->2G GSM
✅ Triangulation des pylônes émetteurs par barycentre pondéré en milliwatts réels
✅ Export géospatial 3D compatible Google Earth Pro (KML)

Ce projet illustre comment la souveraineté numérique et la réutilisation de matériel existant peuvent démocratiser l'analyse de la qualité de service (QoS) des réseaux mobiles, pour les citoyens comme pour les ingénieurs.

Le projet est entièrement documenté et libre d'accès sous licence MIT :
🔗 Dépôt GitHub : https://github.com/Gnzikoune/radio-sentinel
🌐 Vitrine web : https://gnzikoune.github.io/radio-sentinel/

N'hésitez pas à tester, partager ou contribuer !

#Telecom #Cybersecurity #TelecomSecurity #Wardriving #Python #FastAPI #SDR #Innovation #AfriqueTech #Gabon #RadioFrequency #QoS
```
