import os
import socket
import time
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import io
import csv

import database
from modem_service import modem_instance
from gps_service import gps_instance
from kml_service import generate_kml_3d

app = FastAPI(title="Radio Sentinel - Observatoire Cellulaire & Cartographie RF")

# ---------------------------------------------------------------------------
# Etat global du tunnel (mis a jour par POST /api/tunnel depuis tunnel.ps1)
# ---------------------------------------------------------------------------
_tunnel_state: dict = {
    "url": None,          # ex: "https://xxxx.trycloudflare.com"
    "provider": None,     # "cloudflare" | "ngrok"
    "registered_at": None # timestamp UNIX
}

_server_start_time: float = time.time()

def _get_local_ip() -> str:
    """Detecte l'adresse IP locale reelle (non 127.0.0.1)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

class CommandRequest(BaseModel):
    command: str

class TunnelPayload(BaseModel):
    url: Optional[str] = None
    provider: Optional[str] = "cloudflare"
    active: bool = True

class GPSPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    altitude: Optional[float] = None
    network_type: Optional[str] = None
    downlink_mbps: Optional[float] = None
    rtt_ms: Optional[float] = None
    ping_ms: Optional[float] = None
    operator_sim: Optional[str] = None
    device_model: Optional[str] = None

@app.on_event("startup")
def startup_event():
    database.init_db()
    modem_instance.start()

@app.on_event("shutdown")
def shutdown_event():
    modem_instance.stop()

@app.get("/")
def read_root():
    return FileResponse(os.path.join(BASE_DIR, "templates", "index.html"))

@app.get("/gps")
def read_gps():
    """Page web mobile ouverte sur le Samsung Galaxy A14 pour relayer le GPS."""
    return FileResponse(os.path.join(BASE_DIR, "templates", "gps.html"))

@app.get("/audit-report")
def read_audit_report():
    """Page du rapport d'audit executif telechargeable / imprimable en PDF."""
    return FileResponse(os.path.join(BASE_DIR, "templates", "audit_report.html"))

@app.get("/api/audit-report")
def get_audit_report():
    """Retourne les donnees statistiques et d'analyse d'ondes pour le rapport d'audit."""
    return database.get_audit_report_data()

@app.post("/api/gps")
def post_gps(payload: GPSPayload):
    """Reçoit en direct les coordonnées satellites et les métriques 4G du smartphone."""
    gps_instance.update(
        lat=payload.latitude,
        lon=payload.longitude,
        accuracy=payload.accuracy,
        speed=payload.speed,
        altitude=payload.altitude,
        network_type=payload.network_type,
        downlink_mbps=payload.downlink_mbps,
        rtt_ms=payload.rtt_ms,
        ping_ms=payload.ping_ms,
        operator_sim=payload.operator_sim,
        device_model=payload.device_model
    )
    return {"status": "ok", "received": payload.dict()}

@app.get("/api/gps")
def get_gps():
    """Retourne la position satellite actuelle du Samsung."""
    return gps_instance.get_current()

@app.get("/api/status")
def get_system_status():
    """Retourne l'etat du serveur, l'IP locale detectee et l'etat du tunnel nomade."""
    local_ip = _get_local_ip()
    uptime_sec = int(time.time() - _server_start_time)
    tunnel_url = _tunnel_state.get("url")
    return {
        "status": "online",
        "uptime_sec": uptime_sec,
        "local_ip": local_ip,
        "local_url": f"https://{local_ip}:8000",
        "local_gps_url": f"https://{local_ip}:8000/gps",
        "tunnel": {
            "active": bool(tunnel_url),
            "url": tunnel_url,
            "gps_url": f"{tunnel_url}/gps" if tunnel_url else None,
            "provider": _tunnel_state.get("provider"),
            "registered_at": _tunnel_state.get("registered_at")
        },
        "modem_connected": modem_instance.live_state.get("reg_status") not in (None, "--", "NON ENREGISTRE"),
        "gps_connected": gps_instance.get_current().get("connected", False)
    }

@app.post("/api/tunnel")
def register_tunnel(payload: TunnelPayload):
    """Enregistre ou met a jour l'URL publique du tunnel nomade 4G."""
    if payload.active and payload.url:
        clean_url = payload.url.rstrip("/")
        _tunnel_state["url"] = clean_url
        _tunnel_state["provider"] = payload.provider or "cloudflare"
        _tunnel_state["registered_at"] = time.time()
        database.log_event("TUNNEL_ONLINE", f"Passerelle nomade 4G active ({_tunnel_state['provider']}): {clean_url}")
        return {"status": "ok", "message": "Tunnel enregistré", "tunnel": _tunnel_state}
    else:
        _tunnel_state["url"] = None
        _tunnel_state["provider"] = None
        _tunnel_state["registered_at"] = None
        database.log_event("TUNNEL_OFFLINE", "Passerelle nomade 4G fermée")
        return {"status": "ok", "message": "Tunnel désactivé"}

@app.delete("/api/tunnel")
def delete_tunnel():
    """Ferme ou reinitialise le tunnel nomade enregistre."""
    _tunnel_state["url"] = None
    _tunnel_state["provider"] = None
    _tunnel_state["registered_at"] = None
    database.log_event("TUNNEL_OFFLINE", "Passerelle nomade 4G fermée")
    return {"status": "ok", "message": "Tunnel désactivé"}

@app.get("/api/telemetry/live")
def get_live():
    live = modem_instance.live_state
    official_tower = None
    tower_match_note = None
    try:
        if live.get("operator_code") and live.get("cell_id") and live.get("cell_id") != "--":
            mcc = int(live["operator_code"][:3])
            net = int(live["operator_code"][3:])
            ci = int(live["cell_id"])
            # Récupération de la position GPS courante pour le GIS Sanity Check
            gps = gps_instance.get_current()
            user_lat = gps.get("latitude") if gps else None
            user_lon = gps.get("longitude") if gps else None
            official_tower = database.get_official_tower(mcc, net, ci, user_lat=user_lat, user_lon=user_lon)
            if official_tower is None and user_lat:
                tower_match_note = (
                    f"Cell ID {ci} capté — aucun pylône de référence à moins de 5 km. "
                    "Cell ID probablement réutilisé dans plusieurs secteurs."
                )
            elif official_tower:
                conf = official_tower.get("confidence", "UNKNOWN")
                dist = official_tower.get("distance_m")
                dist_txt = f"{dist/1000:.1f} km" if dist else "?"
                if conf == "HIGH":
                    tower_match_note = f"✅ Pylône confirmé à {dist_txt} (Cell ID local vérifié)"
                elif conf == "MEDIUM":
                    tower_match_note = f"⚠️ Pylône estimé à {dist_txt} — couverture longue portée (rural/péri-urbain)"
                elif conf == "LOW":
                    tower_match_note = f"🔴 Cell ID {ci} réutilisé dans plusieurs secteurs — pylône indicatif à {dist_txt}"
    except Exception:
        pass

    gps_data = gps_instance.get_current()

    # Calcul du diagnostic de corrélation & Audit Bi-Réseau (Clé USB vs SIM Mobile)
    dual_audit = None
    if gps_data.get("connected") and gps_data.get("network_type"):
        dbm = live.get("dbm")
        rtt = gps_data.get("rtt_ms") or gps_data.get("ping_ms")
        downlink = gps_data.get("downlink_mbps")
        op_modem = live.get("operator_name") or "--"
        op_sim = gps_data.get("operator_sim") or "Airtel Gabon"

        status_code = "NOMINAL"
        badge_text = "🟢 Nominal"
        diag_text = "Couverture radio et débit mobile en parfaite santé."

        if dbm is not None and dbm >= -85 and rtt is not None and rtt > 250:
            status_code = "CONGESTION"
            badge_text = "🟠 Saturation Cœur de Réseau"
            diag_text = "Signal radio fort mais latence élevée : possible congestion ou saturation IP chez l'opérateur mobile."
        elif dbm is not None and dbm < -95 and (rtt is None or rtt > 300):
            status_code = "RF_WEAK"
            badge_text = "🔴 Atténuation Hertzienne"
            diag_text = "Zone d'ombre ou forte atténuation hertzienne affectant le débit."
        elif op_modem != "--" and op_sim and not (op_modem.lower() in op_sim.lower() or op_sim.lower() in op_modem.lower()):
            status_code = "DUAL_COMPARE"
            badge_text = "🔵 Audit Bi-Réseau"
            diag_text = f"Comparaison active : {op_modem} (Écoute spectrale) vs {op_sim} (Données 4G SIM)."

        dual_audit = {
            "active": True,
            "probe_modem": {
                "operator": op_modem,
                "tech": live.get("tech") or "UTRAN (3G+)",
                "dbm": dbm,
                "csq": live.get("csq"),
                "cell_id": live.get("cell_id"),
                "channel": live.get("channel")
            },
            "probe_mobile": {
                "operator": op_sim,
                "tech": (gps_data.get("network_type") or "4g").upper(),
                "downlink_mbps": downlink,
                "rtt_ms": rtt,
                "ping_ms": gps_data.get("ping_ms")
            },
            "correlation": {
                "status": status_code,
                "badge": badge_text,
                "diagnosis": diag_text
            }
        }

    return {
        "live": live,
        "hardware": modem_instance.hardware_info,
        "gps": gps_data,
        "stats": database.get_stats(),
        "official_tower": official_tower,
        "tower_match_note": tower_match_note,
        "dual_audit": dual_audit
    }

@app.get("/api/telemetry/history")
def get_history(limit: int = 60):
    return database.get_recent_telemetry(limit=limit)

@app.get("/api/map-points")
def get_map_points(limit: int = 1000):
    """Retourne les coordonnées couplées aux dBm pour afficher la carte 2D."""
    return database.get_map_points(limit=limit)

@app.post("/api/security/simulate-downgrade")
def simulate_downgrade():
    """Déclenche une simulation de rétrogradation 2G pour démonstration aux autorités."""
    modem_instance.simulated_alert = {
        "status": "ALERT",
        "level": "CRITICAL",
        "message": "⚠️ ALERTE INTERCEPTION : Décrochage forcé 3G->2G GSM détecté ! Pylône pirate suspect à forte puissance (+22 dBm)",
        "timestamp": database.datetime.now().isoformat()
    }
    database.log_event("SECURITY_ALERT", modem_instance.simulated_alert["message"])
    return {"status": "ok", "alert": modem_instance.simulated_alert}

@app.post("/api/security/reset-alert")
def reset_security_alert():
    """Réinitialise l'alerte de sécurité."""
    modem_instance.simulated_alert = None
    return {"status": "ok", "message": "Statut de sécurité réinitialisé"}

@app.post("/api/clear-points")
def clear_points():
    """Efface l'historique des points GPS pour repartir sur une carte propre."""
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE telemetry SET latitude = NULL, longitude = NULL")
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Tracé réinitialisé avec succès"}

@app.get("/api/events")
def get_events(limit: int = 20):
    return database.get_recent_events(limit=limit)

@app.post("/api/command")
def execute_command(req: CommandRequest):
    res = modem_instance.send_at_command(req.command)
    return {"command": req.command, "response": res}

@app.get("/api/export-csv")
def export_csv():
    records = database.get_recent_telemetry(limit=10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp", "CSQ", "dBm", "Code_Operateur", "Nom_Operateur",
        "Technologie", "Statut_Enregistrement", "Qualite",
        "Cell_ID_3GPP", "Code_Zone_LAC", "Canal_UARFCN",
        "Latitude", "Longitude", "Precision_GPS_m", "Vitesse_kmh", "Erreur"
    ])
    for r in records:
        writer.writerow([
            r.get("id"), r.get("timestamp"), r.get("csq"), r.get("dbm"),
            r.get("operator_code"), r.get("operator_name"), r.get("tech"),
            r.get("reg_status"), r.get("quality_label"),
            r.get("cell_id"), r.get("lac"), r.get("channel"),
            r.get("latitude"), r.get("longitude"), r.get("accuracy"), r.get("speed"),
            r.get("error")
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=telemetrie_ondes_et_gps.csv"}
    )

@app.get("/api/export-kml")
def export_kml():
    """Génère un fichier KML 3D avec extrusion proportionnelle aux dBm pour Google Earth."""
    records = database.get_recent_telemetry(limit=10000)
    kml_content = generate_kml_3d(records)
    return StreamingResponse(
        iter([kml_content]),
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": "attachment; filename=radio_sentinel_gabon_3d.kml"}
    )

if __name__ == "__main__":
    import uvicorn
    # Écoute sur 0.0.0.0 pour que le smartphone puisse accéder à l'IP locale du PC !
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
