"""
Module de gestion et de géolocalisation des pylônes cellulaires officiels du Gabon (MCC 628)
Base locale OpenCellID / ANINF / ARCEP
"""

import sqlite3
import os

def seed_opencellid_gabon(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS opencellid_towers (
            radio TEXT,
            mcc INTEGER,
            net INTEGER,
            area INTEGER,
            cell INTEGER,
            unit INTEGER,
            lon REAL,
            lat REAL,
            range INTEGER,
            samples INTEGER,
            site_name TEXT,
            PRIMARY KEY (mcc, net, area, cell)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tower_lookup ON opencellid_towers (mcc, net, cell)")

    # Vérifier si déjà initialisé
    cursor.execute("SELECT COUNT(*) FROM opencellid_towers")
    if cursor.fetchone()[0] == 0:
        # Pylônes cellulaires référencés dans l'agglomération de Libreville & environs
        known_towers = [
            ("UMTS", 628, 1, 303, 33293, 0, 9.4582, 0.4195, 1200, 48, "Site Pylône Moov - Sablière / Bord de Mer"),
            ("UMTS", 628, 1, 32204, 921, 0, 9.4674, 0.4165, 800, 35, "Site Pylône Moov - Batterie IV / Charbonnages"),
            ("UMTS", 628, 1, 303, 10452, 0, 9.4498, 0.3920, 1500, 82, "Site Relais Moov - Centre-Ville / Boulevard Triomphal"),
            ("LTE",  628, 1, 303, 50124, 0, 9.4550, 0.4350, 2000, 110, "Pylône 4G Moov - Akanda Stade"),
            ("UMTS", 628, 2, 201, 12041, 0, 9.4455, 0.3912, 1000, 65, "Pylône Airtel - Siège Glass"),
            ("LTE",  628, 2, 201, 41029, 0, 9.4621, 0.4210, 1800, 140, "Pylône 4G Airtel - Camp de Police / Aéroport"),
            ("UMTS", 628, 1, 303, 21890, 0, 9.4850, 0.3810, 2500, 40, "Pylône Moov - Owendo Port"),
            ("LTE",  628, 2, 201, 33100, 0, 9.4720, 0.4050, 1400, 95, "Pylône Airtel - PK8 / Mont-Bouët")
        ]
        cursor.executemany("""
            INSERT OR IGNORE INTO opencellid_towers (radio, mcc, net, area, cell, unit, lon, lat, range, samples, site_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, known_towers)
        conn.commit()

def lookup_tower(conn: sqlite3.Connection, mcc: int, net: int, cell_id: int):
    """Recherche un pylône officiel par MCC, Opérateur (NET) et Cell ID."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT radio, mcc, net, area, cell, lon, lat, range, site_name
        FROM opencellid_towers
        WHERE mcc = ? AND net = ? AND cell = ?
        LIMIT 1
    """, (mcc, net, cell_id))
    row = cursor.fetchone()
    if row:
        return {
            "radio": row[0],
            "mcc": row[1],
            "net": row[2],
            "area": row[3],
            "cell": row[4],
            "lon": row[5],
            "lat": row[6],
            "range": row[7],
            "site_name": row[8]
        }
    return None
