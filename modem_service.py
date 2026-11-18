import serial
import serial.tools.list_ports
import time
import threading
import re
from datetime import datetime
import database
from gps_service import gps_instance

OPERATOR_MAP = {
    "62801": "Gabon Telecom / Moov Africa",
    "62802": "Airtel Gabon",
    "62803": "Azur Gabon",
    "62804": "Réseau Local 628-04",
    "20801": "Orange France",
    "20810": "SFR France",
    "20815": "Free Mobile France",
    "20820": "Bouygues Telecom"
}

TECH_MAP = {
    "0": "GSM (2G)",
    "1": "GSM Compact",
    "2": "UTRAN (3G)",
    "3": "GSM w/EGPRS (2.75G EDGE)",
    "4": "UTRAN w/HSDPA (3.5G)",
    "5": "UTRAN w/HSUPA (3.5G)",
    "6": "UTRAN w/HSPA+ (3.75G)",
    "7": "E-UTRAN (4G LTE)"
}

REG_STATUS_MAP = {
    "0": "Non enregistré, pas de recherche",
    "1": "Enregistré sur réseau nominal",
    "2": "Recherche d'opérateur en cours...",
    "3": "Enregistrement refusé",
    "4": "Inconnu",
    "5": "Enregistré en itinérance (Roaming)",
    "8": "Mode d'urgence uniquement (Sans SIM)"
}

class ModemService:
    def __init__(self, baudrate=115200):
        self.baudrate = baudrate
        self.port = None
        self.ser = None
        self.lock = threading.Lock()
        self.running = False
        self.thread = None
        self.connected = False
        
        # Hardware specs (updated dynamically)
        self.hardware_info = {
            "model": "--",
            "manufacturer": "--",
            "firmware": "--",
            "imei": "--"
        }
        
        # Current live telemetry state
        self.live_state = {
            "timestamp": None,
            "connected": False,
            "port": "Détection...",
            "csq": None,
            "dbm": None,
            "quality_label": "En attente du modem...",
            "operator_code": None,
            "operator_name": "--",
            "tech": "--",
            "reg_status": "--",
            "is_outage": True,
            "latitude": None,
            "longitude": None,
            "accuracy": None,
            "speed": None,
            "gps_connected": False,
            "lac": "--",
            "cell_id": "--",
            "channel": "--",
            "freq_mhz": None,
            "rxlev": None,
            "neighbors": []
        }
        
        self.last_csq = None

    def find_available_port(self):
        """Scanne tous les ports COM pour trouver l'interface Modem Alcatel (VID 1BBB)."""
        all_ports = list(serial.tools.list_ports.comports())
        
        # 1. Port explicitement étiqueté 'Modem' avec VID 1BBB
        for p in all_ports:
            hwid = str(p.hwid).upper()
            desc = str(p.description).lower()
            if "1BBB" in hwid and ("modem" in desc or "x.1" in hwid or "mi_01" in hwid):
                return p.device

        # 2. Tout port VID 1BBB non-control/non-voice/non-extension
        for p in all_ports:
            hwid = str(p.hwid).upper()
            desc = str(p.description).lower()
            if "1BBB" in hwid and not any(k in desc for k in ["control", "voice", "extension"]):
                return p.device

        return None

    def _disconnect(self, reason="Déconnexion"):
        """Ferme proprement le port série et réinitialise l'état vers Déconnecté."""
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None
        self.connected = False
        self.live_state.update({
            "connected": False,
            "port": "Modem débranché...",
            "csq": None,
            "dbm": None,
            "quality_label": "Modem déconnecté",
            "operator_code": None,
            "operator_name": "--",
            "tech": "--",
            "reg_status": "Non détecté",
            "is_outage": True
        })
        database.log_event("OUTAGE", f"Perte de liaison avec le modem ({reason})")

    def connect(self):
        with self.lock:
            if self.ser and self.ser.is_open:
                return True

            target_port = self.find_available_port()
            if not target_port:
                self.connected = False
                self.live_state["connected"] = False
                self.live_state["port"] = "Aucun modem détecté"
                self.live_state["quality_label"] = "Branchez le modem USB"
                return False

            try:
                if self.ser:
                    try: self.ser.close()
                    except: pass
                    self.ser = None

                self.ser = serial.Serial(target_port, self.baudrate, timeout=1.0)
                self.port = target_port
                self.connected = True
                self.live_state["connected"] = True
                self.live_state["port"] = target_port
                self._init_hardware()
                database.log_event("RECONNECT", f"Modem détecté et connecté sur {target_port}")
                return True
            except Exception as e:
                self._disconnect(f"Échec ouverture {target_port} : {e}")
                return False

    def _send_raw_command(self, cmd: str, timeout=1.5) -> str:
        if not self.ser or not self.ser.is_open:
            return "ERROR: Port non ouvert"
        try:
            self.ser.reset_input_buffer()
            self.ser.write((cmd + "\r\n").encode("utf-8"))
            time.sleep(0.08)
            start = time.time()
            response = ""
            while time.time() - start < timeout:
                if self.ser.in_waiting:
                    chunk = self.ser.read(self.ser.in_waiting).decode("utf-8", errors="ignore")
                    response += chunk
                    if "OK" in response or "ERROR" in response:
                        break
                time.sleep(0.05)
            return response.strip()
        except (serial.SerialException, OSError) as e:
            self._disconnect(f"Câble débranché : {e}")
            return f"ERROR: {e}"
        except Exception as e:
            return f"ERROR: {e}"

    def send_at_command(self, cmd: str) -> str:
        with self.lock:
            if not self.connected:
                self.connect()
            return self._send_raw_command(cmd, timeout=3.0)

    def _init_hardware(self):
        mfg = self._send_raw_command("AT+CGMI")
        mfg_clean = re.sub(r'(\r|\n|OK|\+CGMI:)', '', mfg).strip()
        if mfg_clean: self.hardware_info["manufacturer"] = mfg_clean

        model = self._send_raw_command("AT+CGMM")
        model_clean = re.sub(r'(\r|\n|OK|\+CGMM:)', '', model).strip()
        if model_clean: self.hardware_info["model"] = model_clean

        rev = self._send_raw_command("AT+CGMR")
        rev_clean = re.sub(r'(\r|\n|OK|\+CGMR:)', '', rev).strip()
        if rev_clean: self.hardware_info["firmware"] = rev_clean

        imei = self._send_raw_command("AT+CGSN")
        imei_clean = re.sub(r'(\r|\n|OK|\+CGSN:)', '', imei).strip()
        if imei_clean: self.hardware_info["imei"] = imei_clean

        self._send_raw_command("AT+CFUN=1")
        self._send_raw_command("AT+CREG=2")

    def poll_metrics(self):
        with self.lock:
            if not self.ser or not self.ser.is_open or not self.connected:
                if not self.connect():
                    return
            
            now_iso = datetime.now().isoformat()
            
            # 1. Signal CSQ
            csq_raw = self._send_raw_command("AT+CSQ")
            if not self.connected:
                return

            csq = None
            dbm = None
            quality = "Signal non détectable"
            
            match_csq = re.search(r'\+CSQ:\s*(\d+),(\d+)', csq_raw)
            if match_csq:
                csq = int(match_csq.group(1))
                if csq != 99:
                    dbm = -113 + (2 * csq)
                    if csq >= 20: quality = "Signal Excellent"
                    elif csq >= 14: quality = "Bon Signal"
                    elif csq >= 9: quality = "Signal Moyen"
                    elif csq > 0: quality = "Signal Faible"
                    else: quality = "Aucun Signal"
            
            # 2. Operator info
            cops_raw = self._send_raw_command("AT+COPS?")
            op_code = None
            op_name = "Recherche d'antenne..."
            tech_desc = "Cellulaire"
            match_cops = re.search(r'\+COPS:\s*\d+,\s*\d+,\s*"(\w+)"(?:,\s*(\d+))?', cops_raw)
            if match_cops:
                op_code = match_cops.group(1)
                op_name = OPERATOR_MAP.get(op_code, f"Opérateur [{op_code}]")
                tech_code = match_cops.group(2)
                if tech_code:
                    tech_desc = TECH_MAP.get(tech_code, f"Mode [{tech_code}]")

            # 3. Registration status
            creg_raw = self._send_raw_command("AT+CREG?")
            reg_status_desc = "Inconnu"
            match_creg = re.search(r'\+CREG:\s*\d+,\s*(\d+)', creg_raw)
            if match_creg:
                reg_code = match_creg.group(1)
                reg_status_desc = REG_STATUS_MAP.get(reg_code, f"Code [{reg_code}]")

            # 4. Engineering Cell Data (AT+CCED=0,1) - Cell ID, LAC, Canal Fréquence 3GPP
            cced_raw = self._send_raw_command("AT+CCED=0,1")
            cell_id = self.live_state.get("cell_id", "--")
            lac = self.live_state.get("lac", "--")
            channel = self.live_state.get("channel", "--")
            freq_mhz = self.live_state.get("freq_mhz")
            rxlev = self.live_state.get("rxlev")
            
            match_cced = re.search(r'\+CCED:\s*(\d+),(\d+),(\w+),(\w+),(\w+),(\w+),(\w+)', cced_raw)
            if match_cced:
                mcc = match_cced.group(1)
                mnc = match_cced.group(2)
                lac_val = match_cced.group(3)
                ci_val = match_cced.group(4)
                ch_val = match_cced.group(6)
                rx_val = match_cced.group(7)

                lac = str(lac_val)
                cell_id = str(ci_val)
                channel = str(ch_val)
                try: rxlev = int(rx_val)
                except: pass

                # Déduction de la fréquence porteuse (UMTS Band 1 / Band 8)
                try:
                    ch_num = int(channel)
                    if 10562 <= ch_num <= 10838:
                        freq_mhz = round(2110 + (ch_num - 10562) * 0.2, 1) # UMTS 2100 Band 1
                    elif 2937 <= ch_num <= 3088:
                        freq_mhz = round(925 + (ch_num - 2937) * 0.2, 1)   # UMTS 900 Band 8
                except:
                    pass

            # 5. Cellules Voisines (Neighbor Cells - AT+CCED=0,2)
            cced_nc = self._send_raw_command("AT+CCED=0,2")
            neighbors = []
            if "+CCED:" in cced_nc:
                nc_matches = re.findall(r'(\d+),(\d+),(\w+),(\w+),(\w+),(\w+)', cced_nc)
                for nc in nc_matches:
                    neighbors.append({
                        "mcc": nc[0],
                        "mnc": nc[1],
                        "lac": nc[2],
                        "cell_id": nc[3],
                        "channel": nc[4],
                        "rxlev": nc[5]
                    })

            # Outage checking
            is_outage = (csq is None or csq == 0 or csq == 99)
            if self.last_csq is not None:
                if self.last_csq > 0 and is_outage:
                    database.log_event("OUTAGE", f"Coupure réseau détectée ! Le signal est tombé à {csq}")
                elif self.last_csq == 0 and not is_outage:
                    database.log_event("RECONNECT", f"Signal rétabli : CSQ={csq} ({dbm} dBm) sur {op_name} (Cell ID: {cell_id})")
            self.last_csq = csq if csq is not None else 0

            # 6. GPS Synchronization (Depuis le Samsung Galaxy A14)
            current_gps = gps_instance.get_current()
            lat = current_gps.get("latitude")
            lon = current_gps.get("longitude")
            accuracy = current_gps.get("accuracy")
            speed = current_gps.get("speed")
            gps_connected = current_gps.get("connected", False)

            # Update live state
            self.live_state.update({
                "timestamp": now_iso,
                "connected": True,
                "port": self.port,
                "csq": csq,
                "dbm": dbm,
                "quality_label": quality,
                "operator_code": op_code,
                "operator_name": op_name,
                "tech": tech_desc,
                "reg_status": reg_status_desc,
                "is_outage": is_outage,
                "latitude": lat,
                "longitude": lon,
                "accuracy": accuracy,
                "speed": speed,
                "gps_connected": gps_connected,
                "lac": lac,
                "cell_id": cell_id,
                "channel": channel,
                "freq_mhz": freq_mhz,
                "rxlev": rxlev,
                "neighbors": neighbors
            })

            # Sauvegarde en BDD (avec GPS si actif)
            database.insert_telemetry(self.live_state)

    def _loop(self):
        while self.running:
            try:
                if not self.connected:
                    self.connect()
                else:
                    self.poll_metrics()
            except Exception as e:
                self._disconnect(f"Exception dans la boucle: {e}")
            time.sleep(1.5)

    def start(self):
        if self.running: return
        self.running = True
        self.connect()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.ser:
            try: self.ser.close()
            except: pass
            self.ser = None

modem_instance = ModemService()
