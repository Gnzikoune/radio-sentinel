import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import io
import csv

import database
from modem_service import modem_instance
from gps_service import gps_instance

app = FastAPI(title="Radio Sentinel - Observatoire Cellulaire & Cartographie RF")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

class CommandRequest(BaseModel):
    command: str

class GPSPayload(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    altitude: Optional[float] = None

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

@app.post("/api/gps")
def post_gps(payload: GPSPayload):
    """Reçoit en direct les coordonnées satellites du smartphone."""
    gps_instance.update(
        lat=payload.latitude,
        lon=payload.longitude,
        accuracy=payload.accuracy,
        speed=payload.speed,
        altitude=payload.altitude
    )
    return {"status": "ok", "received": payload.dict()}

@app.get("/api/gps")
def get_gps():
    """Retourne la position satellite actuelle du Samsung."""
    return gps_instance.get_current()

@app.get("/api/telemetry/live")
def get_live():
    return {
        "live": modem_instance.live_state,
        "hardware": modem_instance.hardware_info,
        "gps": gps_instance.get_current(),
        "stats": database.get_stats()
    }

@app.get("/api/telemetry/history")
def get_history(limit: int = 60):
    return database.get_recent_telemetry(limit=limit)

@app.get("/api/map-points")
def get_map_points(limit: int = 1000):
    """Retourne les coordonnées couplées aux dBm pour afficher la carte 2D."""
    return database.get_map_points(limit=limit)

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

if __name__ == "__main__":
    import uvicorn
    # Écoute sur 0.0.0.0 pour que le smartphone puisse accéder à l'IP locale du PC !
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
