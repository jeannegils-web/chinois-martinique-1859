#!/usr/bin/env python3
"""
Génère le jeu de données structurel du corpus « Chinois en Martinique 1859-1860 ».

IMPORTANT : les fiches produites sont des DONNÉES D'EXEMPLE (placeholders) qui
respectent la structure documentaire du corpus : répartition par navire, ports
d'embarquement (Shanghai 1859, Canton 1860), profils d'âge et de sexe plausibles,
habitations saint par les Archives départementales de la Martinique.
Elles doivent être remplacées, champ par champ, par les relevés d'archives.
"""

import json
import random
from datetime import date, timedelta

random.seed(1859)

# --- Répartition par convoi (placeholders à confirmer par les relevés) -------
CONVOIS = [
    {
        "navire": "Fulton",
        "depart": "Shanghai",
        "pays_depart": "Chine",
        "date_embarquement": "1859-06-15",
        "date_arrivee": "1859-09-28",
        "effectif": 318,
    },
    {
        "navire": "Amiral Baudin",
        "depart": "Shanghai",
        "pays_depart": "Chine",
        "date_embarquement": "1859-07-05",
        "date_arrivee": "1859-10-12",
        "effectif": 295,
    },
    {
        "navire": "Galilée",
        "depart": "Canton",
        "pays_depart": "Chine",
        "date_embarquement": "1860-04-20",
        "date_arrivee": "1860-07-03",
        "effectif": 364,
    },
]

TROMBES = {
    "Shanghai": [
        "Tsé", "A-Ki", "A-Fou", "Chou-Lin", "Wang-Tchéou", "Li-Hing", "San-Pé",
        "A-Koué", "Tchao-Hai", "Ng-Sing", "Fou-Tsann", "A-Sing", "Tang-Pao",
        "A-Tchang", "Lin-Fou", "Foung-Tsé", "A-Soung", "Kiang-Pao", "A-Lin",
        "Tsing-Hiang",
    ],
    "Canton": [
        "Assam", "Afong", "Atsou", "Akam", "Afoo", "Atchou", "Asin", "Alin",
        "Apou", "Aka", "Assing", "Amoy", "Achun", "Aki", "Alé", "Apin",
        "Atao", "Asong", "Aking", "Afay",
    ],
}

NOMS = [
    "Chen", "Chan", "Tchang", "Tugny", "Lam", "Lim", "Ling", "Wang", "Ouang",
    "Li", "Ly", "Tchoang", "Tchao", "Ng", "Ong", "Fou", "Fong", "Hing",
    "Kiang", "Lin", "Tang", "Tsin", "Tsang", "Yang", "Yeung", "Ho", "Hoe",
    "Soung", "Song", "Tchiang", "Mou", "Mouly",
]

VILLAGES = {
    "Shanghai": [
        "district de Songjiang", "district de Jiading", "banlieue de Shanghai",
        "district de Chuansha", "district de Qingpu", "préfecture de Songjiang",
    ],
    "Canton": [
        "district de Panyu", "district de Shunde", "district de Dongguan",
        "district de Xiangshan", "préfecture de Canton", "district de Boluo",
        "district de Zengcheng", "comté de Xin'an (région hakka)",
    ],
}

COMMUNES = [
    ("Le Lamentin", 0.14), ("Le François", 0.12), ("Sainte-Marie", 0.11),
    ("Basse-Pointe", 0.09), ("Le Lorrain", 0.08), ("Le Marigot", 0.07),
    ("Saint-Pierre", 0.08), ("Fort-de-France", 0.07), ("Le Robert", 0.07),
    ("La Trinité", 0.06), ("Le Gros-Morne", 0.05), ("Saint-Joseph", 0.04),
    ("Case-Pilote", 0.02), ("Le Prêcheur", 0.02),
]

HABITATIONS = {
    "Le Lamentin": ["Beauregard", "La Jalousie", "Longpré", "Génipa"],
    "Le François": ["L'Assomption", "Lespalier", "Saint-Aubin", "Beaufond"],
    "Sainte-Marie": ["L'Écoute", "Beauséjour", "Pécoul", "La Maugée"],
    "Basse-Pointe": ["L'Héritage", "Acajou", "La Concorde", "Charlery"],
    "Le Lorrain": ["Charpentier", "La Marlaude", "Bellevue"],
    "Le Marigot": ["Petit-Havre", "Bezaudin", "Cluny"],
    "Saint-Pierre": ["La Ceyran", "Fond-Masson", "La Perinabault"],
    "Fort-de-France": ["Rivière Madame", "dépôt de la Rivière Madame"],
    "Le Robert": ["Fonds-Saint-Jacques", "La Houssaye", "Beaumont"],
    "La Trinité": ["La Dominante", "Le Chalvet", "Carillon"],
    "Le Gros-Morne": ["Belmont", "La Rose", "Morne Cabrit"],
    "Saint-Joseph": ["La Francescio", "Morne des Esses"],
    "Case-Pilote": ["La Guérinière", "Bellune"],
    "Le Prêcheur": ["Le Prêcheur", "Anse Couleuvre"],
}

METIERS = [
    ("laboureur", 0.34), ("cultivateur", 0.22), ("portefaix", 0.10),
    ("manœuvre", 0.09), ("menuisier", 0.05), ("tisserand", 0.04),
    ("cordonnier", 0.03), ("charpentier", 0.03), ("pêcheur", 0.03),
    ("cuisinier", 0.02), ("domestique", 0.02), ("praticien", 0.01),
    ("marin", 0.02),
]

STATUTS = [
    ("engagé", 0.66), ("placé en Guyane", 0.11), ("racheta son contrat", 0.09),
    ("décédé pendant l'engagement", 0.07), ("rapatrié", 0.05),
    ("destination inconnue", 0.02),
]

SOURCES = [
    "Registre d'immigration, AD Martinique, série 7Mi",
    "Registres d'engagements, AD Martinique, 5 Mi",
    "État nominatif des immigrants chinois, 1860",
    "Bulletins de la Société d'émigration, 1859-1861",
]


def weighted(pairs):
    r = random.random()
    acc = 0.0
    for val, w in pairs:
        acc += w
        if r <= acc:
            return val
    return pairs[-1][0]


def build_record(idx, convoi, cumul):
    sexe = "M" if random.random() < 0.88 else "F"
    age = max(12, min(55, int(random.gauss(24, 7))))
    commune = weighted(COMMUNES)
    hab = random.choice(HABITATIONS[commune])
    depart = convoi["depart"]
    accostage = date.fromisoformat(convoi["date_arrivee"])
    placement = accostage + timedelta(days=random.randint(3, 90))
    if commune == "Fort-de-France":
        affectation = "dépôt de la Rivière Madame, Fort-de-France"
    else:
        affectation = f"Habitation {hab}, {commune}"
    return {
        "id": f"C{idx:04d}",
        "nomEnregistre": f"{random.choice(NOMS)} {random.choice(TROMBES[depart])}",
        "nomChinois": None,
        "sexe": sexe,
        "ageDepart": age,
        "anneeNaissanceEstimee": int(convoi["date_arrivee"][:4]) - age,
        "navire": convoi["navire"],
        "portDepart": depart,
        "dateEmbarquement": convoi["date_embarquement"],
        "dateArrivee": convoi["date_arrivee"],
        "dureeContratAns": 8,
        "villageOrigine": random.choice(VILLAGES[depart]),
        "habitationAffectation": affectation,
        "commune": commune,
        "metierDeclare": weighted(METIERS),
        "etatMatrimonial": "célibataire" if random.random() < 0.93 else "non renseigné",
        "datePlacement": placement.isoformat(),
        "statutFinEngagement": weighted(STATUTS),
        "sources": random.sample(SOURCES, k=random.randint(1, 2)),
        "notes": (
            f"Entrée n° {cumul} du registre d'immigration du {convoi['navire']} ; "
            "données d'exemple à confirmer."
        ),
        "confiance": "exemple",
    }


def main():
    records = []
    idx = 1
    for convoi in CONVOIS:
        cumul_debut = idx
        for _ in range(convoi["effectif"]):
            records.append(build_record(idx, convoi, idx))
            idx += 1
        convoi_n = len(records) - cumul_debut + 1
        print(f"{convoi['navire']}: {convoi_n} fiches")

    with open("data/records.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "meta": {
                    "titre": "Corpus des engagés chinois en Martinique, 1859-1860",
                    "nombreFiches": len(records),
                    "statut": "DONNÉES D'EXEMPLE — en attente des relevés d'archives",
                    "convois": CONVOIS,
                },
                "records": records,
            },
            f,
            ensure_ascii=False,
            indent=1,
        )
    print(f"Total : {len(records)} fiches")


if __name__ == "__main__":
    main()
