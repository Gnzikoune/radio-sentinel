import sqlite3
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "antenne.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            csq INTEGER,
            dbm INTEGER,
            operator_code TEXT,
            operator_name TEXT,
            tech TEXT,
            reg_status TEXT,
            quality_label TEXT,
            error TEXT,
            latitude REAL,
            longitude REAL,
            accuracy REAL,
            speed REAL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL
        )
    """)
    conn.commit()

    # Migration automatique si colonnes GPS ou Ingénierie absentes
    cursor.execute("PRAGMA table_info(telemetry)")
    columns = [row["name"] for row in cursor.fetchall()]
    for col, col_type in [
        ("latitude", "REAL"), ("longitude", "REAL"), ("accuracy", "REAL"), ("speed", "REAL"),
        ("lac", "TEXT"), ("cell_id", "TEXT"), ("channel", "TEXT"), ("neighbors", "TEXT")
    ]:
        if col not in columns:
            cursor.execute(f"ALTER TABLE telemetry ADD COLUMN {col} {col_type}")
    
    conn.commit()
    conn.close()

def insert_telemetry(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry (
            timestamp, csq, dbm, operator_code, operator_name, tech, reg_status, quality_label, error,
            latitude, longitude, accuracy, speed, lac, cell_id, channel, neighbors
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("timestamp", datetime.now().isoformat()),
        data.get("csq"),
        data.get("dbm"),
        data.get("operator_code"),
        data.get("operator_name"),
        data.get("tech"),
        data.get("reg_status"),
        data.get("quality_label"),
        data.get("error"),
        data.get("latitude"),
        data.get("longitude"),
        data.get("accuracy"),
        data.get("speed"),
        data.get("lac"),
        data.get("cell_id"),
        data.get("channel"),
        data.get("neighbors")
    ))
    conn.commit()
    conn.close()

def log_event(event_type: str, message: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (timestamp, event_type, message)
        VALUES (?, ?, ?)
    """, (datetime.now().isoformat(), event_type, message))
    conn.commit()
    conn.close()

def get_recent_telemetry(limit: int = 60):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM telemetry ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

def get_map_points(limit: int = 1000):
    """Récupère les points géolocalisés pour afficher la Heatmap / parcours sur la carte."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, timestamp, dbm, csq, operator_name, tech, quality_label, latitude, longitude, accuracy, speed, lac, cell_id, channel
        FROM telemetry
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

def get_recent_events(limit: int = 20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_stats():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total_samples, AVG(csq) as avg_csq, MAX(csq) as max_csq, MIN(csq) as min_csq FROM telemetry WHERE csq IS NOT NULL AND csq != 99")
    stats = dict(cursor.fetchone())
    cursor.execute("SELECT COUNT(*) as total_outages FROM events WHERE event_type = 'OUTAGE'")
    stats.update(dict(cursor.fetchone()))
    cursor.execute("SELECT COUNT(*) as geo_samples FROM telemetry WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
    stats.update(dict(cursor.fetchone()))
    conn.close()
    return stats
