"""
SetuHealth Persistent SQLite Database Engine.
Provides persistent storage for:
1. referrals: Closed-loop patient referrals, outcome verifications, and mismatch tracking.
2. facilities: District hospital bed matrix (ICU, Oxygen, General) and live capacity status.
3. audit_logs: Comprehensive medical-legal telemetry audit trail.
"""

import sqlite3
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "setuhealth.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================
# DEFAULT SEED DATA FOR FACILITIES & AUDIT
# ==========================================
_SEED_FACILITIES = [
    {
        "id": "fac-st-johns",
        "name": "St. John's District Hospital",
        "type": "District Hospital",
        "lat": 28.5355,
        "lng": 77.2090,
        "icu_beds": 4,
        "oxygen_beds": 9,
        "general_beds": 18,
        "specialist": "Cardiology & Critical Care (Dr. A. Sharma)",
        "capacity_status": "AMPLE",
        "address": "Sector 4, Mahatma Gandhi Marg, South District",
        "phone": "+91 11 2658 8500",
    },
    {
        "id": "fac-city-civil",
        "name": "City Civil Hospital & Trauma Centre",
        "type": "Tertiary Medical College",
        "lat": 28.6738,
        "lng": 77.2140,
        "icu_beds": 8,
        "oxygen_beds": 15,
        "general_beds": 32,
        "specialist": "Emergency Trauma & Pulmonology (Dr. V. Rao)",
        "capacity_status": "AMPLE",
        "address": "Ring Road, Civil Lines Hub",
        "phone": "+91 11 2390 1200",
    },
    {
        "id": "fac-metro-community",
        "name": "Adarsh Community Health Centre (CHC)",
        "type": "Community Health Center",
        "lat": 28.6280,
        "lng": 77.1025,
        "icu_beds": 0,
        "oxygen_beds": 2,
        "general_beds": 6,
        "specialist": "General Physician & Obstetrics (Dr. P. Nair)",
        "capacity_status": "CONGESTED",
        "address": "Market Yard Road, Ward 12",
        "phone": "+91 11 2781 4411",
    },
    {
        "id": "fac-green-valley",
        "name": "Green Valley Urban Primary Health Clinic (PHC)",
        "type": "Primary Health Clinic",
        "lat": 28.5672,
        "lng": 77.2433,
        "icu_beds": 0,
        "oxygen_beds": 0,
        "general_beds": 1,
        "specialist": "Duty Medical Officer (MBBS)",
        "capacity_status": "NO_BEDS",
        "address": "Block B, Colony Road, Near Post Office",
        "phone": "+91 11 2542 9011",
    },
    {
        "id": "fac-apex-super",
        "name": "Apex Multispeciality Referral Institute",
        "type": "Tertiary Medical College",
        "lat": 28.4895,
        "lng": 77.0866,
        "icu_beds": 12,
        "oxygen_beds": 20,
        "general_beds": 45,
        "specialist": "Cardiothoracic Surgery & Neuro (Dr. S. Kulkarni)",
        "capacity_status": "AMPLE",
        "address": "NH-48 Tech Corridor, Cyber City",
        "phone": "+91 11 4100 7700",
    }
]


def init_db(seed_referrals: Optional[Dict[str, dict]] = None):
    """Initializes the database schema (3 tables) and seeds initial records if empty."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Referrals Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                facility_id TEXT NOT NULL,
                facility_name TEXT NOT NULL,
                risk_tier TEXT NOT NULL,
                predicted_tier TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                outcome_severity TEXT,
                outcome_notes TEXT,
                confirmed_at TEXT,
                tier_mismatch INTEGER,
                transport_mode TEXT DEFAULT 'Ambulance'
            )
        """)

        # 2. Facilities Table (Live Bed Inventory)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS facilities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                icu_beds INTEGER NOT NULL DEFAULT 0,
                oxygen_beds INTEGER NOT NULL DEFAULT 0,
                general_beds INTEGER NOT NULL DEFAULT 0,
                specialist TEXT NOT NULL,
                capacity_status TEXT NOT NULL DEFAULT 'AMPLE',
                address TEXT,
                phone TEXT,
                last_updated TEXT NOT NULL
            )
        """)

        # 3. Audit Logs Table (Medical-Legal Audit Trail)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                patient_id TEXT,
                description TEXT NOT NULL,
                payload_json TEXT,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()

        # Seed Referrals if empty
        cursor.execute("SELECT COUNT(*) FROM referrals")
        if cursor.fetchone()[0] == 0 and seed_referrals:
            for item in seed_referrals.values():
                cursor.execute("""
                    INSERT INTO referrals (
                        id, patient_id, facility_id, facility_name, risk_tier,
                        predicted_tier, created_at, status, outcome_severity,
                        outcome_notes, confirmed_at, tier_mismatch, transport_mode
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item.get("id"),
                    item.get("patient_id"),
                    item.get("facility_id"),
                    item.get("facility_name"),
                    item.get("risk_tier"),
                    item.get("predicted_tier"),
                    item.get("created_at"),
                    item.get("status"),
                    item.get("outcome_severity"),
                    item.get("outcome_notes"),
                    item.get("confirmed_at"),
                    1 if item.get("tier_mismatch") is True else (0 if item.get("tier_mismatch") is False else None),
                    item.get("transport_mode", "Ambulance")
                ))
            conn.commit()

        # Seed Facilities if empty
        cursor.execute("SELECT COUNT(*) FROM facilities")
        if cursor.fetchone()[0] == 0:
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            for fac in _SEED_FACILITIES:
                cursor.execute("""
                    INSERT INTO facilities (
                        id, name, type, lat, lng, icu_beds, oxygen_beds, general_beds,
                        specialist, capacity_status, address, phone, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    fac["id"], fac["name"], fac["type"], fac["lat"], fac["lng"],
                    fac["icu_beds"], fac["oxygen_beds"], fac["general_beds"],
                    fac["specialist"], fac["capacity_status"], fac["address"],
                    fac["phone"], now_iso
                ))
            conn.commit()

        # Seed initial audit log entry if empty
        cursor.execute("SELECT COUNT(*) FROM audit_logs")
        if cursor.fetchone()[0] == 0:
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            cursor.execute("""
                INSERT INTO audit_logs (case_id, event_type, patient_id, description, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                "SYSTEM-INIT",
                "DATABASE_INITIALIZED",
                "SYSTEM",
                "SetuHealth 3-table SQLite persistent schema initialized (referrals, facilities, audit_logs)",
                json.dumps({"engine": "SQLite3", "version": "3.0", "status": "active"}),
                now_iso
            ))
            conn.commit()


# ==========================================
# REFERRAL OPERATIONS
# ==========================================
def db_get_all_referrals() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM referrals ORDER BY created_at DESC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["tier_mismatch"] = bool(d["tier_mismatch"]) if d["tier_mismatch"] is not None else None
            result.append(d)
        return result


def db_insert_referral(record: Dict[str, Any]) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO referrals (
                id, patient_id, facility_id, facility_name, risk_tier,
                predicted_tier, created_at, status, outcome_severity,
                outcome_notes, confirmed_at, tier_mismatch, transport_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.get("id"),
            record.get("patient_id"),
            record.get("facility_id"),
            record.get("facility_name"),
            record.get("risk_tier"),
            record.get("predicted_tier"),
            record.get("created_at"),
            record.get("status", "sent"),
            record.get("outcome_severity"),
            record.get("outcome_notes"),
            record.get("confirmed_at"),
            1 if record.get("tier_mismatch") is True else (0 if record.get("tier_mismatch") is False else None),
            record.get("transport_mode", "Ambulance")
        ))

        # Dynamically decrement facility bed inventory
        fac_id = record.get("facility_id")
        tier = record.get("risk_tier", "Low")
        if fac_id:
            if tier == "Critical":
                cursor.execute("UPDATE facilities SET icu_beds = MAX(0, icu_beds - 1) WHERE id = ?", (fac_id,))
            elif tier == "High":
                cursor.execute("UPDATE facilities SET oxygen_beds = MAX(0, oxygen_beds - 1) WHERE id = ?", (fac_id,))
            else:
                cursor.execute("UPDATE facilities SET general_beds = MAX(0, general_beds - 1) WHERE id = ?", (fac_id,))

        # Log into audit_logs table
        cursor.execute("""
            INSERT INTO audit_logs (case_id, event_type, patient_id, description, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            record.get("id", "CASE-NEW"),
            "REFERRAL_DISPATCHED",
            record.get("patient_id"),
            f"Referral dispatched to {record.get('facility_name')} for {record.get('risk_tier')} Tier",
            json.dumps(record),
            record.get("created_at") or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        ))
        conn.commit()

    return record


def db_confirm_outcome(referral_id: str, outcome_severity: str, notes: Optional[str]) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM referrals WHERE id = ?", (referral_id,))
        row = cursor.fetchone()
        if not row:
            return None

        record = dict(row)
        confirmed_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        tier_order = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        pred_ord = tier_order.get(record["predicted_tier"], 0)
        actual_ord = tier_order.get(outcome_severity, 0)
        tier_mismatch = (pred_ord != actual_ord)

        cursor.execute("""
            UPDATE referrals
            SET status = 'outcome_known',
                outcome_severity = ?,
                outcome_notes = ?,
                confirmed_at = ?,
                tier_mismatch = ?
            WHERE id = ?
        """, (
            outcome_severity,
            notes,
            confirmed_at,
            1 if tier_mismatch else 0,
            referral_id
        ))

        # Record audit log
        cursor.execute("""
            INSERT INTO audit_logs (case_id, event_type, patient_id, description, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            referral_id,
            "OUTCOME_CONFIRMED",
            record.get("patient_id"),
            f"Clinical arrival confirmed with actual severity: {outcome_severity} (Mismatch: {tier_mismatch})",
            json.dumps({"predicted_tier": record["predicted_tier"], "actual_severity": outcome_severity, "notes": notes}),
            confirmed_at
        ))
        conn.commit()

        cursor.execute("SELECT * FROM referrals WHERE id = ?", (referral_id,))
        updated = dict(cursor.fetchone())
        updated["tier_mismatch"] = bool(updated["tier_mismatch"])
        return updated


def db_get_count() -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM referrals")
        return cursor.fetchone()[0]


# ==========================================
# FACILITY BED INVENTORY OPERATIONS
# ==========================================
def db_get_all_facilities() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM facilities ORDER BY name ASC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def db_update_facility_beds(facility_id: str, icu_delta: int = 0, o2_delta: int = 0, gen_delta: int = 0) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE facilities
            SET icu_beds = MAX(0, icu_beds + ?),
                oxygen_beds = MAX(0, oxygen_beds + ?),
                general_beds = MAX(0, general_beds + ?),
                last_updated = ?
            WHERE id = ?
        """, (
            icu_delta, o2_delta, gen_delta,
            datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            facility_id
        ))
        conn.commit()

        cursor.execute("SELECT * FROM facilities WHERE id = ?", (facility_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


# ==========================================
# AUDIT LOG OPERATIONS
# ==========================================
def db_insert_audit_log(case_id: str, event_type: str, patient_id: Optional[str], description: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (case_id, event_type, patient_id, description, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            case_id,
            event_type,
            patient_id,
            description,
            json.dumps(payload or {}),
            now_iso
        ))
        log_id = cursor.lastrowid
        conn.commit()

    return {
        "id": log_id,
        "case_id": case_id,
        "event_type": event_type,
        "patient_id": patient_id,
        "description": description,
        "payload": payload or {},
        "created_at": now_iso
    }


def db_get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["payload"] = json.loads(d["payload_json"]) if d["payload_json"] else {}
            except Exception:
                d["payload"] = {}
            result.append(d)
        return result
