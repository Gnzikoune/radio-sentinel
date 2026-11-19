import sqlite3
from datetime import datetime
import json
import os
from opencellid_service import seed_opencellid_gabon, lookup_tower

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
        ("lac", "TEXT"), ("cell_id", "TEXT"), ("channel", "TEXT"), ("neighbors", "TEXT"),
        ("mobile_net_type", "TEXT"), ("mobile_downlink", "REAL"), ("mobile_rtt", "REAL"),
        ("mobile_ping", "REAL"), ("mobile_operator", "TEXT")
    ]:
        if col not in columns:
            cursor.execute(f"ALTER TABLE telemetry ADD COLUMN {col} {col_type}")
    
    # Initialisation de la base OpenCellID Gabon
    seed_opencellid_gabon(conn)

    conn.commit()
    conn.close()

def insert_telemetry(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    neighbors_val = data.get("neighbors")
    if isinstance(neighbors_val, (list, dict)):
        neighbors_val = json.dumps(neighbors_val)
    elif neighbors_val is not None:
        neighbors_val = str(neighbors_val)

    cursor.execute("""
        INSERT INTO telemetry (
            timestamp, csq, dbm, operator_code, operator_name, tech, reg_status, quality_label, error,
            latitude, longitude, accuracy, speed, lac, cell_id, channel, neighbors,
            mobile_net_type, mobile_downlink, mobile_rtt, mobile_ping, mobile_operator
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        neighbors_val,
        data.get("mobile_net_type"),
        data.get("mobile_downlink"),
        data.get("mobile_rtt"),
        data.get("mobile_ping"),
        data.get("mobile_operator")
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
        SELECT id, timestamp, dbm, csq, operator_name, tech, quality_label, latitude, longitude, accuracy, speed, lac, cell_id, channel,
               mobile_net_type, mobile_downlink, mobile_rtt, mobile_ping, mobile_operator
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

def get_official_tower(mcc: int, net: int, cell_id: int,
                       user_lat: float = None, user_lon: float = None):
    """Interroge la table locale OpenCellID pour un pylône officiel au Gabon.

    Si user_lat/user_lon sont fournis, applique le filtre géographique (GIS Sanity Check) :
    un pylône trouvé à plus de 5 km de la position GPS est rejeté comme Cell ID réutilisé
    dans un autre secteur radio.
    """
    conn = get_connection()
    res = lookup_tower(conn, mcc, net, cell_id, user_lat=user_lat, user_lon=user_lon)
    conn.close()
    return res

def get_audit_report_data():
    """Compile l'ensemble des métriques statistiques pour le rapport d'audit exécutif."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Statistiques globales d'échantillonnage
    cursor.execute("""
        SELECT COUNT(*) as total_samples,
               MIN(timestamp) as start_time,
               MAX(timestamp) as end_time,
               AVG(csq) as avg_csq,
               MIN(csq) as min_csq,
               MAX(csq) as max_csq,
               AVG(dbm) as avg_dbm,
               MIN(dbm) as min_dbm,
               MAX(dbm) as max_dbm
        FROM telemetry
        WHERE csq IS NOT NULL AND csq != 99
    """)
    overview = dict(cursor.fetchone() or {})

    # Échantillons géolocalisés
    cursor.execute("SELECT COUNT(*) as geo_samples FROM telemetry WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
    overview.update(dict(cursor.fetchone() or {}))

    # 2. Répartition par classes de couverture (seuils opérationnels 3GPP / ARCEP)
    # NOTE : on ne comptabilise QUE les lignes avec un dbm mesuré (dbm IS NOT NULL).
    # Les lignes dbm IS NULL correspondent à des états transitoires du modem (boot,
    # reconnexion en cours, CSQ=99) — ce ne sont PAS des mesures de signal réseau.
    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE dbm >= -75")
    excellent = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE dbm >= -85 AND dbm < -75")
    good = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE dbm >= -95 AND dbm < -85")
    fair = cursor.fetchone()[0] or 0

    # "poor" = signal mesuré mais en dessous du seuil exploitable (inclut CSQ=0 → dbm=-113)
    # On exclut dbm IS NULL pour ne pas gonfler artificiellement ce compteur.
    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE dbm < -95")
    poor = cursor.fetchone()[0] or 0

    total_cov = excellent + good + fair + poor
    breakdown = {
        "excellent": {"count": excellent, "pct": round((excellent / total_cov * 100), 1) if total_cov else 0},
        "good": {"count": good, "pct": round((good / total_cov * 100), 1) if total_cov else 0},
        "fair": {"count": fair, "pct": round((fair / total_cov * 100), 1) if total_cov else 0},
        "poor": {"count": poor, "pct": round((poor / total_cov * 100), 1) if total_cov else 0},
        "total": total_cov
    }

    # 3. Métriques de performance 4G mobile (Sonde Samsung A14)
    cursor.execute("""
        SELECT AVG(mobile_downlink) as avg_downlink,
               MAX(mobile_downlink) as max_downlink,
               AVG(mobile_ping) as avg_ping,
               MIN(mobile_ping) as min_ping,
               COUNT(mobile_ping) as mobile_samples
        FROM telemetry
        WHERE mobile_downlink IS NOT NULL OR mobile_ping IS NOT NULL
    """)
    mobile_stats = dict(cursor.fetchone() or {})

    # 4. Analyse par opérateur détecté
    cursor.execute("""
        SELECT operator_name,
               operator_code,
               COUNT(*) as samples,
               AVG(dbm) as avg_dbm,
               MAX(dbm) as max_dbm
        FROM telemetry
        WHERE operator_name IS NOT NULL AND operator_name != '--'
        GROUP BY operator_name
        ORDER BY samples DESC
    """)
    operators = [dict(r) for r in cursor.fetchall()]

    # 5. Cellules et Pylônes identifiés
    cursor.execute("""
        SELECT DISTINCT operator_name, lac, cell_id, channel, COUNT(*) as hits
        FROM telemetry
        WHERE cell_id IS NOT NULL AND cell_id != '--'
        GROUP BY operator_name, lac, cell_id, channel
        ORDER BY hits DESC
        LIMIT 15
    """)
    cells = [dict(r) for r in cursor.fetchall()]

    # 6. Coupures et alertes de sécurité
    cursor.execute("""
        SELECT timestamp, event_type, message
        FROM events
        ORDER BY id DESC
        LIMIT 25
    """)
    events = [dict(r) for r in cursor.fetchall()]

    # Outages réseaux réels = coupure de signal (CSQ tombé à 0 ou None)
    # On exclut les OUTAGEs causés par des erreurs logicielles ou de port série
    # (reconnexion BDD, PermissionError, etc.) car ils ne représentent pas une
    # panne du réseau cellulaire mais des instabilités de l'outil de mesure.
    cursor.execute("""
        SELECT COUNT(*) FROM events
        WHERE event_type = 'OUTAGE'
        AND (message LIKE 'Coupure r%seau%' OR message LIKE 'Signal tomb%')
    """)
    total_outages = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM events WHERE event_type = 'SECURITY_ALERT'")
    total_sec_alerts = cursor.fetchone()[0] or 0

    conn.close()

    return {
        "overview": overview,
        "breakdown": breakdown,
        "mobile_stats": mobile_stats,
        "operators": operators,
        "cells": cells,
        "events": events,
        "total_outages": total_outages,
        "total_sec_alerts": total_sec_alerts
    }
