#!/usr/bin/env python3
"""
Import des données réelles depuis Excel vers data/records.json.

Usage :
    pip install openpyxl
    python3 data/import_excel.py chemin/vers/fichier.xlsx

Le script :
  1. lit la première feuille (ou celle nommée) du classeur ;
  2. associe automatiquement les colonnes aux champs de la fiche
     (correspondance souple entre en-têtes, avec ou sans accents) ;
  3. imprime le tableau de correspondance pour vérification humaine ;
  4. signale les cellules problématiques (âge non numérique, date invalide…) ;
  5. écrit data/records.json + data/records_from_excel.csv (copie brute pour
     référence) sans jamais écraser silencieusement un fichier existant
     (une copie .bak est conservée).

Champs de la fiche (cible) :
    id, nomEnregistre, nomChinois, sexe, ageDepart, anneeNaissanceEstimee,
    navire, portDepart, dateEmbarquement, dateArrivee, dureeContratAns,
    villageOrigine, habitationAffectation, commune, metierDeclare,
    etatMatrimonial, datePlacement, statutFinEngagement, sources, notes,
    confiance

Colonnes Excel reconnues (variantes acceptées, traitement des accents) :
    tout synonyme raisonnable est essayé (ex. « nom », « nom transcrit »,
    « transcription », « nom en registre » pour nomEnregistre…).
"""

import csv
import json
import re
import shutil
import sys
import unicodedata
from datetime import date, datetime

from openpyxl import load_workbook

# ---- correspondance champ -> variantes d'en-tête acceptées ----------------

FIELD_SYNONYMS = {
    "nomEnregistre": ["nom enregistre", "nom transcrit", "nom", "transcription", "nom de famille", "nom en registre"],
    "nomChinois": ["nom chinois", "chinois", "caracteres chinois", "nom d'origine"],
    "sexe": ["sexe", "genre"],
    "ageDepart": ["age", "age au depart", "age - depart", "age depart"],
    "anneeNaissanceEstimee": ["annee de naissance", "naissance", "annee naissance", "annee de naissance estimee"],
    "navire": ["navire", "bateau", "vessel", "convoi"],
    "portDepart": ["port", "port de depart", "port d'embarquement", "lieu d'embarquement", "provenance"],
    "dateEmbarquement": ["date d'embarquement", "date embarquement", "embarquement"],
    "dateArrivee": ["date d'arrivee", "date arrivee", "arrivee", "date de debarquement", "debarquement"],
    "dureeContratAns": ["duree du contrat", "duree contrat", "contrat", "duree engagement"],
    "villageOrigine": ["village", "village d'origine", "lieu d'origine", "district", "district d'origine", "province"],
    "habitationAffectation": ["habitation", "affectation", "habitation d'affectation", "attribution", "employer"],
    "commune": ["commune"],
    "metierDeclare": ["metier", "metier declare", "profession", "occupation"],
    "etatMatrimonial": ["etat matrimonial", "statut matrimonial", "situation familiale"],
    "datePlacement": ["date de placement", "date placement", "placement"],
    "statutFinEngagement": ["statut", "statut final", "sort", "statut de fin d'engagement"],
    "sources": ["source", "sources", "reference", "references", "cote"],
    "notes": ["notes", "note", "observations", "remarques", "commentaire", "commentaires"],
    "confiance": ["confiance", "fiabilite", "qualite"],
}

# champs dont on attend un nombre / une date
NUMERIC_FIELDS = {"ageDepart", "anneeNaissanceEstimee", "dureeContratAns"}
DATE_FIELDS = {"dateEmbarquement", "dateArrivee", "datePlacement"}


def norm_header(h) -> str:
    s = unicodedata.normalize("NFD", str(h or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # accents
    s = s.lower().strip()
    s = re.sub(r"[\s_\-]+", " ", s)
    return s


def unify_sexe(v):
    s = str(v or "").strip().lower()
    if s in {"m", "masculin", "h", "homme", "garcon"}:
        return "M"
    if s in {"f", "feminin", "femme", "fille"}:
        return "F"
    return None


def to_number(v):
    if v in (None, ""):
        return None
    if isinstance(v, (int, float)):
        n = int(v)
    else:
        m = re.search(r"\d{1,3}", str(v))
        if not m:
            return None
        n = int(m.group())
    return n if 0 <= n <= 120 else None


def to_year(v):
    m = re.search(r"\b(1[7-9]\d\d|20\d\d)\b", str(v or ""))
    return int(m.group()) if m else None


def to_date_iso(v):
    """Retourne la date en ISO (YYYY-MM-DD) si interprétable, sinon None."""
    if v in (None, ""):
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v).strip()
    if re.fullmatch(r"\d{4}", s):
        return f"{s}-01-01"
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d %m %Y",
                "%m/%d/%Y", "%Y/%m/%d", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def map_headers(headers):
    """Associe chaque colonne du classeur à un champ de la fiche."""
    mapping = {}
    used = set()
    for idx, raw in enumerate(headers):
        h = norm_header(raw)
        if not h:
            continue
        match = None
        for field, syns in FIELD_SYNONYMS.items():
            if field in used:
                continue
            for s in syns + [field]:
                if h == s or h == s.replace(" ", ""):
                    match = field
                    break
            if match:
                break
        if not match:  # correspondance par inclusion
            for field, syns in FIELD_SYNONYMS.items():
                if field in used:
                    continue
                for s in syns + [field]:
                    if s and s in h:
                        match = field
                        break
                if match:
                    break
        if match:
            mapping[idx] = match
            used.add(match)
    return mapping


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit("Usage : python3 data/import_excel.py fichier.xlsx")
    path = sys.argv[1]

    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        sys.exit("Feuille vide.")

    headers = rows[0]
    mapping = map_headers(headers)

    print("=== Correspondance des colonnes ===")
    for idx, h in enumerate(headers):
        field = mapping.get(idx)
        label = field if field else "(ignoree)"
        print(f"  {chr(65 + idx) if idx < 26 else '?':<3} «{h}»  ->  {label}")

    missing = set(FIELD_SYNONYMS) - set(mapping.values())
    optional_absent = {"nomChinois", "confiance"} & missing
    print("\nChamps du site non alimentés par cet Excel :", 
          sorted(missing - optional_absent) or "aucun")

    records, warnings = [], []
    for row_no, row in enumerate(rows[1:], start=2):
        if not any(v not in (None, "") for v in row):
            continue
        r = {
            "nomChinois": None,
            "dureeContratAns": 8,
            "etatMatrimonial": "non renseigné",
            "sources": [],
            "notes": "Importé depuis le fichier de relevés de la recherche.",
            "confiance": "verifie",
        }
        for idx, field in mapping.items():
            if idx >= len(row):
                continue
            v = row[idx]
            if field == "sexe":
                s = unify_sexe(v)
                if s:
                    r["sexe"] = s
                elif v not in (None, ""):
                    warnings.append(f"L{row_no}: sexe illisible «{v}»")
            elif field in NUMERIC_FIELDS:
                n = to_number(v)
                if n is not None:
                    r[field] = n
                elif v not in (None, ""):
                    warnings.append(f"L{row_no}: {field} non numérique «{v}»")
            elif field in DATE_FIELDS:
                iso = to_date_iso(v)
                if iso:
                    r[field] = iso
                elif v not in (None, ""):
                    warnings.append(f"L{row_no}: {field} date illisible «{v}»")
            elif field == "sources":
                if v not in (None, ""):
                    parts = re.split(r"[;\n]+", str(v))
                    r["sources"] = [p.strip() for p in parts if p.strip()]
            elif field == "confiance":
                c = norm_header(v)
                r["confiance"] = {"verifie": "verifie", "v": "verifie",
                                  "probable": "probable", "p": "probable",
                                  "exemple": "exemple"}.get(c.split()[0] if c else "", "verifie") \
                    if str(v or "").strip() else "verifie"
            else:
                if v not in (None, ""):
                    r[field] = str(v).strip() if not isinstance(v, (int, float)) else v

        r["id"] = r.get("id") or f"C{len(records) + 1:04d}"
        if not r.get("nomEnregistre"):
            warnings.append(f"L{row_no}: nom manquant — ligne ignorée")
            continue
        if "sexe" not in r:
            r["sexe"] = "non renseigné"
        if "ageDepart" not in r:
            r["ageDepart"] = None
            r["confiance"] = "probable" if r.get("confiance") == "verifie" else r.get("confiance", "probable")
        records.append(r)

    print(f"\n=== Résultat : {len(records)} fiches ===")
    if warnings:
        print(f"--- {len(warnings)} avertissement(s) ---")
        for w in warnings[:30]:
            print("  !", w)
        if len(warnings) > 30:
            print(f"  … et {len(warnings) - 30} autres (voir data/import_warnings.txt)")

    meta = {
        "titre": "Corpus des engagés chinois en Martinique, 1859-1860",
        "nombreFiches": len(records),
        "statut": "Corpus relevé par le chercheur (import Excel, " + date.today().isoformat() + ")",
        "source_import": path,
        "convois": [],
    }
    navires = sorted({r.get("navire") for r in records if r.get("navire")})
    for nav in navires:
        sub = [r for r in records if r.get("navire") == nav]
        meta["convois"].append({
            "navire": nav,
            "depart": sub[0].get("portDepart"),
            "date_arrivee": next((r.get("dateArrivee") for r in sub if r.get("dateArrivee")), None),
            "effectif": len(sub),
        })

    out = {"meta": meta, "records": records}

    try:
        shutil.copy("data/records.json", "data/records.json.bak")
    except FileNotFoundError:
        pass
    with open("data/records.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    with open("data/records_from_excel.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for row in rows[1:]:
            if any(v not in (None, "") for v in row):
                w.writerow(row)

    if warnings:
        with open("data/import_warnings.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(warnings))

    print("Écrit : data/records.json (+ copie .bak, + CSV brut, + avertissements)")
    print("Vérifiez la correspondance ci-dessus, puis testez : node data/smoke_test.js")


if __name__ == "__main__":
    main()
