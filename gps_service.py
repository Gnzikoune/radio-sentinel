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
            "total_updates": 0
        }

    def update(self, lat: float, lon: float, accuracy: float = None, speed: float = None, altitude: float = None):
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
                "total_updates": self.state["total_updates"] + 1
            })

    def get_current(self):
        with self.lock:
            now = time.time()
            # Si aucune mise à jour depuis plus de 12 secondes, marquer comme inactif
            is_active = (now - self.state["last_seen"] < 12.0) and (self.state["latitude"] is not None)
            self.state["connected"] = is_active
            return dict(self.state)

gps_instance = GPSService()
