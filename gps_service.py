import time
from datetime import datetime
import threading

class GPSService:
    def __init__(self):
        self.lock = threading.Lock()
        self.state = {
            "connected": False,
            "latitude": None,
            "longitude": None,
            "accuracy": None,
            "speed": None,
            "altitude": None,
            "timestamp": None,
            "last_seen": 0,
            "total_updates": 0,
            # Métriques 4G / QoS et Audit Bi-Réseau (depuis le Samsung avec SIM)
            "network_type": None,       # ex: "4g", "3g", "wifi"
            "downlink_mbps": None,      # ex: 18.5 Mbps
            "rtt_ms": None,             # ex: 55 ms (latence estimée par le navigateur)
            "ping_ms": None,            # ex: 42 ms (aller-retour HTTP réel vers le serveur)
            "operator_sim": "Airtel Gabon",  # Opérateur de la carte SIM mobile
            "device_model": "Samsung Galaxy A14"
        }

    def update(self, lat: float, lon: float, accuracy: float = None, speed: float = None, altitude: float = None,
               network_type: str = None, downlink_mbps: float = None, rtt_ms: float = None,
               ping_ms: float = None, operator_sim: str = None, device_model: str = None):
        with self.lock:
            now = time.time()
            self.state.update({
                "connected": True,
                "latitude": lat,
                "longitude": lon,
                "accuracy": accuracy,
                "speed": speed,
                "altitude": altitude,
                "timestamp": datetime.now().isoformat(),
                "last_seen": now,
                "total_updates": self.state["total_updates"] + 1,
                "network_type": network_type or self.state.get("network_type"),
                "downlink_mbps": downlink_mbps if downlink_mbps is not None else self.state.get("downlink_mbps"),
                "rtt_ms": rtt_ms if rtt_ms is not None else self.state.get("rtt_ms"),
                "ping_ms": ping_ms if ping_ms is not None else self.state.get("ping_ms"),
                "operator_sim": operator_sim or self.state.get("operator_sim"),
                "device_model": device_model or self.state.get("device_model")
            })

    def get_current(self):
        with self.lock:
            now = time.time()
            # Si aucune mise à jour depuis plus de 12 secondes, marquer comme inactif
            is_active = (now - self.state["last_seen"] < 12.0) and (self.state["latitude"] is not None)
            self.state["connected"] = is_active
            return dict(self.state)

gps_instance = GPSService()
