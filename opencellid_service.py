"""
Module de gestion et de géolocalisation des pylônes cellulaires officiels du Gabon (MCC 628)
Base locale OpenCellID / ANINF / ARCEP
"""

import sqlite3
import os
import math

# Distance maximale acceptable entre la position GPS de l'utilisateur
# et le pylône retourné par la base OpenCellID (filtre anti-réutilisation de Cell ID).
# Au-delà de cette distance, le match est considéré comme appartenant à un autre secteur.
MAX_TOWER_DISTANCE_M = 5000       # 5 km : match fiable (cellule locale confirmée)
WARN_TOWER_DISTANCE_M = 25000     # 25 km : match incertain (couverture longue portée rurale ou Cell ID réutilisé)

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance en mètres entre deux points GPS (formule de Haversine)."""
    R = 6_371_000  # Rayon moyen de la Terre en mètres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

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

    # --- Insertions incrémentales (ajout de nouveaux sites sans réinitialiser la DB) ---
    # Pylône Azur (MNC=03) Cell ID 921 dans la zone Okala / Akanda — confirmé par mesures terrain
    # Cell ID 921 est RÉUTILISÉ par Moov (Batterie IV) et Azur/Airtel (Okala) — deux secteurs distincts
    cursor.execute("""
        INSERT OR IGNORE INTO opencellid_towers (radio, mcc, net, area, cell, unit, lon, lat, range, samples, site_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("UMTS", 628, 3, 32204, 921, 0, 9.5115, 0.4680, 900, 12, "Pylône Azur - Okala Résidentiel / Akanda"))
    # Pylône Azur supplémentaire Okala Centre (Cell ID alternatif courant dans ce secteur)
    cursor.execute("""
        INSERT OR IGNORE INTO opencellid_towers (radio, mcc, net, area, cell, unit, lon, lat, range, samples, site_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("UMTS", 628, 3, 32204, 923, 0, 9.5090, 0.4710, 1100, 8, "Pylône Azur - Okala Centre / Carrefour SNI"))
    # Pylône Azur/Airtel zone Ntoum / RN1 (LAC 32204, fréq 936 MHz — même RNC Azur que Okala)
    # IMPORTANT : Cell ID 921 est en PRIMARY KEY (628,3,32204,921) = Okala ; ce site Ntoum utilise 924
    # Le Cell ID réel de ce pylône Ntoum sera confirmé par wardriving sur la RN1
    # Coordonnées estimées à partir de la position GPS live (0.5648N, 9.3599E)
    cursor.execute("""
        INSERT OR IGNORE INTO opencellid_towers (radio, mcc, net, area, cell, unit, lon, lat, range, samples, site_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("UMTS", 628, 3, 32204, 924, 0, 9.3610, 0.5650, 3000, 3, "Pylône Azur - Ntoum / RN1 Corridor (à confirmer par wardriving)"))
    conn.commit()

def lookup_tower(conn: sqlite3.Connection, mcc: int, net: int, cell_id: int,
                 user_lat: float = None, user_lon: float = None):
    """
    Recherche un pylône officiel par MCC, Opérateur (NET) et Cell ID.

    Logique :
      1. Correspondance exacte (mcc, net, cell).
      2. Fallback RAN-sharing sur (mcc, cell) tous opérateurs.
      3. FILTRE GÉOGRAPHIQUE avec 3 niveaux de confiance :
         - moins de 5 km  : confidence=HIGH   (pylone local confirme)
         - moins de 25 km : confidence=MEDIUM (couverture longue portee rurale)
         - plus de 25 km  : confidence=LOW    (Cell ID reutilise dans un autre secteur)
         Le pylone le plus proche est toujours retourne avec son niveau de confiance.

    Returns dict avec les infos du pylone + champs distance_m et confidence, ou None si introuvable.
    """
    cursor = conn.cursor()

    def _row_to_dict(row, distance_m=None):
        d = {
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
        if distance_m is not None:
            d["distance_m"] = round(distance_m)
            if distance_m < MAX_TOWER_DISTANCE_M:
                d["confidence"] = "HIGH"
            elif distance_m < WARN_TOWER_DISTANCE_M:
                d["confidence"] = "MEDIUM"
            else:
                d["confidence"] = "LOW"
        else:
            d["confidence"] = "UNKNOWN"
        return d

    def _get_dist(row):
        if user_lat is None or user_lon is None:
            return None
        return haversine_m(user_lat, user_lon, row[6], row[5])  # lat=row[6], lon=row[5]

    # Étape 1 — Correspondance exacte (mcc, net, cell)
    cursor.execute("""
        SELECT radio, mcc, net, area, cell, lon, lat, range, site_name
        FROM opencellid_towers
        WHERE mcc = ? AND net = ? AND cell = ?
        ORDER BY range ASC
        LIMIT 1
    """, (mcc, net, cell_id))
    row = cursor.fetchone()
    if row:
        return _row_to_dict(row, _get_dist(row))

    # Étape 2 — Fallback RAN-sharing (mcc, cell tous opérateurs)
    # On récupère TOUS les pylônes avec ce Cell ID, puis on choisit le plus proche
    cursor.execute("""
        SELECT radio, mcc, net, area, cell, lon, lat, range, site_name
        FROM opencellid_towers
        WHERE mcc = ? AND cell = ?
    """, (mcc, cell_id))
    rows = cursor.fetchall()

    if not rows:
        return None

    best_row = None
    best_dist = float("inf")

    for r in rows:
        if user_lat is not None and user_lon is not None:
            dist = haversine_m(user_lat, user_lon, r[6], r[5])
            if dist < best_dist:
                best_row = r
                best_dist = dist
        else:
            # Pas de GPS : on prend le premier
            best_row = r
            best_dist = None
            break

    if best_row:
        return _row_to_dict(best_row, best_dist if best_dist != float("inf") else None)

    return None
