# Les engagés chinois en Martinique · 1859–1860

Site interactif présentant le corpus nominatif des **977 Chinois ayant immigré en
Martinique entre 1859 et 1860** (convois *Fulton* et *Amiral Baudin* depuis
Shanghai en septembre 1859 ; *Galilée* depuis Canton le 3 juillet 1860).

Version gratuite et statique de **test d'intérêt** : aucune dépendance, aucun
serveur, aucun coût d'hébergement.

## Fonctionnalités

- **Accueil** : contexte historique, repères chronologiques, recherche rapide.
- **Histoire** : l'engagisme post-abolition, les trois convois, les « Chins ».
- **Méthodologie** : sources dépouillées, normalisation, grille de fiabilité
  (corpus vérifié / probable / données d'exemple), limites reconnues.
- **Base de données** : 977 fiches avec recherche plein texte (nom transcrit,
  n° de fiche, village, habitation, commune), filtres (navire, port,
  sexe, commune, métier, statut final, tranche d'âge), tri par colonne,
  pagination — le tout côté navigateur, sans backend.
- **Fiche individuelle** : 16 champs documentaires (identité, convoi, dates,
  origine, affectation, statut), sources citées, contributions validées
  affichées.
- **Contributions** : formulaire (champ visé, valeur proposée,
  contributeur, source **obligatoire**) avec validation de saisie en direct,
  puis fil de modération.
- **Système de validation** : file de vérification (instruction → vérification
  croisée par binôme → décision motivée tracée → publication attribuée),
  export/import JSON des propositions.

## ⚠️ Statut des données

Les fiches de `data/records.json` sont des **données d'exemple** générées par
`data/generate_records.py` : elles respectent la structure documentaire (navires,
ports, habitation, profils d'âge plausibles) mais les nom/valeurs sont des
placeholders. Un bandeau permanent le signale aux visiteurs. Elles doivent être
remplacées par les relevés des registres conservés aux Archives départementales
de la Martinique (série 7 Mi, sous-série 5 Mi) et des archives coloniales (ANOM).

## Tests

```bash
node --check js/app.js      # syntaxe
node data/smoke_test.js     # rendu de toutes les routes + moteur de recherche
```

## Servir en local

Le site lit `data/records.json` via `fetch` : il faut un serveur HTTP (pas
d'ouverture en `file://`).

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Déployer gratuitement

- **GitHub Pages** : pousser ce dossier dans un dépôt, Settings → Pages →
  branche `main`, dossier racine. (Le `fetch` relatif de
  `data/records.json` fonctionne tel quel.)
- **Netlify / Cloudflare Pages** : glisser-déposer le dossier (build: aucun,
  répertoire de publication : la racine).

## Passer aux contributions partagées

Dans cette démo, les propositions sont stockées dans le `localStorage` du
navigateur du visiteur et exportables en JSON (bouton sur la page
*Modération*). Pour la version en ligne multi-utilisateurs, brancher
`submitContribution()` et `viewValidation()` sur un petit backend gratuit :
Netlify Forms, un Google Form en relais, ou une API serverless (Supabase)
— la structure de la contribution est déjà stable et exportable.
