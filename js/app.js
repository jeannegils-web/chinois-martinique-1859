/* ============================================================
   Engagés chinois de Martinique · 1859–1860
   Application monopage (SPA) — aucune dépendance externe.
   Données : data/records.json (données d'exemple, remplacées
   progressivement par les relevés d'archives).
   Contributions :  stockées localement (localStorage) dans cette
   version gratuite de démonstration + export JSON pour modération.
   ============================================================ */

"use strict";

const STATE = {
  records: [],
  contributorName: "",
  query: "",
  filters: { navire: "", port: "", sexe: "", commune: "", metier: "", statut: "" },
  ageMin: "",
  ageMax: "",
  sortKey: "id",
  sortDir: "asc",
  page: 1,
  perPage: 25,
};

const LS_KEY = "contrib-chinois-martinique-v1";

/* ---------------- utilitaires ---------------- */

const $app = document.getElementById("app");
const $modal = document.getElementById("modal-root");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getContribs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveContribs(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

function contribsForRecord(id, kind) {
  return getContribs().filter((c) => c.recordId === id && (!kind || c.status === kind));
}

function frDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function confianceTag(c) {
  if (c === "verifie") return '<span class="tag tag-ok">corpus vérifié</span>';
  if (c === "probable") return '<span class="tag tag-warn">probable</span>';
  return '<span class="tag tag-accent">données d\'exemple</span>';
}

function setNav(current) {
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.toggleAttribute("aria-current", a.dataset.nav === current);
    if (a.dataset.nav === current) a.setAttribute("aria-current", "page");
  });
  document.body.classList.remove("nav-open");
}

function navigate(hash) { location.hash = hash; }

function updateFooterContribCount() {
  const list = getContribs();
  const el = document.getElementById("footer-contrib-count");
  if (el) el.textContent = list.length
    ? `${list.length} contribution(s) déposée(s) sur l'appareil · ${list.filter((c) => c.status === "valide").length} validée(s)`
    : "Aucune contribution déposée pour l'instant — soyez le premier.";
}

/* ---------------- chargement des données ---------------- */

async function loadData() {
  try {
    const res = await fetch("data/records.json");
    const json = await res.json();
    STATE.records = json.records;
  } catch {
    $app.innerHTML = `<section class="block"><div class="callout">Impossible de charger
      <code>data/records.json</code>. Si vous ouvrez le fichier en double-cliquant (protocole
      file://), servez le dossier via un petit serveur local
      (<code>python3 -m http.server</code>) ou déployez-le sur un hébergement statique.</div></section>`;
  }
}

/* ---------------- moteur de recherche / filtres ---------------- */

function norm(s) { return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function applyQuery() {
  const q = norm(STATE.query.trim());
  let list = STATE.records.filter((r) => {
    const f = STATE.filters;
    if (f.navire && r.navire !== f.navire) return false;
    if (f.port && r.portDepart !== f.port) return false;
    if (f.sexe && r.sexe !== f.sexe) return false;
    if (f.commune && r.commune !== f.commune) return false;
    if (f.metier && r.metierDeclare !== f.metier) return false;
    if (f.statut && r.statutFinEngagement !== f.statut) return false;
    if (STATE.ageMin !== "" && r.ageDepart < +STATE.ageMin) return false;
    if (STATE.ageMax !== "" && r.ageDepart > +STATE.ageMax) return false;
    if (q) {
      const hay = norm([r.id, r.nomEnregistre, r.villageOrigine, r.habitationAffectation, r.commune, r.metierDeclare].join(" "));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const dir = STATE.sortDir === "asc" ? 1 : -1;
  const key = STATE.sortKey;
  list.sort((a, b) => {
    const va = a[key], vb = b[key];
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va ?? "").localeCompare(String(vb ?? ""), "fr") * dir;
  });
  return list;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), "fr"));
}

/* ---------------- vue : accueil ---------------- */

function viewAccueil() {
  const stats = [
    [STATE.records.length || "977", "personnes recensées"],
    ["3", "convois maritimes"],
    ["2", "ports : Shanghai & Canton"],
    ["8 ans", "durée des contrats"],
    ["100", "placés en Guyane dès 1860"],
  ];
  return `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">Mémoire &amp; archives</p>
      <h1>Les engagés chinois en Martinique, 1859–1860</h1>
      <p class="lead">Dix ans après l'abolition de l'esclavage, 977 hommes, femmes et enfants — embarqués
      à Shanghai et à Canton — débarquent en Martinique sous contrat d'engagement pour les habitations.
      Ce site reconstitue leur passage, personne par personne.</p>
      <form class="quick-search" onsubmit="return handleQuickSearch(event)">
        <input type="search" placeholder="Rechercher un nom, un lieu, un navire…" aria-label="Recherche rapide">
        <button class="btn btn-accent" type="submit">Rechercher</button>
      </form>
      <div class="hero-actions">
        <a class="btn btn-ghost" href="#/histoire">Découvrir l'histoire</a>
        <a class="btn btn-ghost" href="#/contribuer">Proposer une contribution</a>
      </div>
      <p class="hero-credit">Illustration d'arrière-plan créée par intelligence artificielle</p>
    </div>
  </section>

  <section class="block container">
    <h2>Le corpus en chiffres</h2>
    <div class="stats-grid">
      ${stats.map(([n, l]) => `<div class="stat-card"><div class="num">${esc(n)}</div><div class="lbl">${esc(l)}</div></div>`).join("")}
    </div>
  </section>

  <section class="block container">
    <div class="two-col">
      <div>
        <h2>Trois convois, un destin collectif</h2>
        <div class="timeline">
          <div class="t-item"><span class="t-date">Septembre 1859</span><br>Le <strong>Fulton</strong> et l'<strong>Amiral Baudin</strong>, partis de <strong>Shanghai</strong>, amènent les premiers convois dans la rade de Fort-de-France.</div>
          <div class="t-item"><span class="t-date">3 juillet 1860</span><br>Le <strong>Galilée</strong> arrive de <strong>Canton</strong> ; une centaine de ses passagers sera rapidement « placée » en Guyane.</div>
          <div class="t-item"><span class="t-date">1860–1868</span><br>Sous contrats de huit ans, victimes d'une forte mortalité et d'un climat éprouvant, les engagés terminent leurs contrats, rachètent leur engagement ou disparaissent des registres.</div>
          <div class="t-item"><span class="t-date">Après l'engagement</span><br>Beaucoup rejoignent les bourgs et le petit commerce : la communauté sino-martiniquaise, les « Chins », prend racine.</div>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Pourquoi ce site ?</h3>
        <p class="muted small" style="margin-bottom:.5rem">Sur les 37 008 engagés arrivés dans l'île après 1848, la part chinoise — un peu moins d'un millier de personnes — est la moins documentée. Pourtant chaque registre nominatif garde une trace : un nom transcrit, un âge, un village, une habitation d'affectation.</p>
        <p class="muted small">Cette base de données veut rendre ces traces <strong>consultables par tous</strong> : familles, chercheurs, enseignants, curieux. Elle est gratuite et collaborative.</p>
        <a class="btn btn-line" href="#/methodologie">Comment le corpus a-t-il été constitué ?</a>
      </div>
    </div>
  </section>

  <section class="block container">
    <h2>Contribuer aux fiches</h2>
    <div class="steps">
      <div class="step"><div class="num">1</div><strong>Trouvez une fiche</strong><br><span class="muted small">Recherchez une personne et proposez un complément ou une correction, source à l'appui.</span></div>
      <div class="step"><div class="num">2</div><strong>Instruction</strong><br><span class="muted small">Chaque proposition est horodatée et passe en file de vérification.</span></div>
      <div class="step"><div class="num">3</div><strong>Vérification croisée</strong><br><span class="muted small">Un binôme contrôle la source citée avant toute publication.</span></div>
      <div class="step"><div class="num">4</div><strong>Publication</strong><br><span class="muted small">La contribution validée apparaît nommée sur la fiche ; l'historique complet reste consultable.</span></div>
    </div>
  </section>`;
}

function handleQuickSearch(e) {
  e.preventDefault();
  const q = e.target.querySelector("input").value;
  sessionStorage.setItem("quickQuery", q);
  navigate("#/base");
  return false;
}

/* ---------------- vue : base de données ---------------- */

function viewBase() {
  const q = sessionStorage.getItem("quickQuery") || "";
  sessionStorage.removeItem("quickQuery");
  if (q && !STATE.query) STATE.query = q;

  const recs = applyQuery();
  const pages = Math.max(1, Math.ceil(recs.length / STATE.perPage));
  STATE.page = Math.min(STATE.page, pages);
  const slice = recs.slice((STATE.page - 1) * STATE.perPage, STATE.page * STATE.perPage);

  const opt = (v, l, sel) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l ?? v)}</option>`;

  const navires = uniqueSorted(STATE.records.map((r) => r.navire));
  const ports = uniqueSorted(STATE.records.map((r) => r.portDepart));
  const communes = uniqueSorted(STATE.records.map((r) => r.commune));
  const metiers = uniqueSorted(STATE.records.map((r) => r.metierDeclare));
  const statuts = uniqueSorted(STATE.records.map((r) => r.statutFinEngagement));

  const th = (key, label) =>
    `<th onclick="sortBy('${key}')" class="${STATE.sortKey === key ? (STATE.sortDir === "asc" ? "sort-asc" : "sort-desc") : ""}">${label}</th>`;

  return `
  <div class="back-link" style="margin-bottom:0"></div>
  <section class="block">
    <h2>Base de données nominative</h2>
    <p class="muted">Recherchez par nom transcrit, identifiant, village, habitation ou commune. Combinez le
    texte libre avec les filtres pour affiner. Cliquez sur une ligne pour ouvrir la fiche complète.</p>

    <div class="db-toolbar">
      <div class="search-box">
        <input type="search" id="db-q" placeholder="Nom, n° de fiche, village, habitation, commune…" value="${esc(STATE.query)}" oninput="onQueryInput(this.value)" aria-label="Recherche dans la base">
        <button class="btn btn-line" onclick="resetFilters()">Réinitialiser</button>
      </div>
      <div class="db-filters">
        <label>Navire <select onchange="setFilter('navire', this.value)">${opt("", "Tous", STATE.filters.navire)}${navires.map((v) => opt(v, v, STATE.filters.navire)).join("")}</select></label>
        <label>Port d'embarquement <select onchange="setFilter('port', this.value)">${opt("", "Tous", STATE.filters.port)}${ports.map((v) => opt(v, v, STATE.filters.port)).join("")}</select></label>
        <label>Sexe <select onchange="setFilter('sexe', this.value)">${opt("", "Tous", STATE.filters.sexe)}${opt("M", "Hommes", STATE.filters.sexe)}${opt("F", "Femmes", STATE.filters.sexe)}</select></label>
        <label>Commune d'affectation <select onchange="setFilter('commune', this.value)">${opt("", "Toutes", STATE.filters.commune)}${communes.map((v) => opt(v, v, STATE.filters.commune)).join("")}</select></label>
        <label>Métier déclaré <select onchange="setFilter('metier', this.value)">${opt("", "Tous", STATE.filters.metier)}${metiers.map((v) => opt(v, v, STATE.filters.metier)).join("")}</select></label>
        <label>Statut final <select onchange="setFilter('statut', this.value)">${opt("", "Tous", STATE.filters.statut)}${statuts.map((v) => opt(v, v, STATE.filters.statut)).join("")}</select></label>
        <label>Âge minimum <input type="number" min="0" max="99" value="${esc(STATE.ageMin)}" onchange="setAge('min', this.value)" placeholder="ex. 18"></label>
        <label>Âge maximum <input type="number" min="0" max="99" value="${esc(STATE.ageMax)}" onchange="setAge('max', this.value)" placeholder="ex. 40"></label>
      </div>
      <div class="db-meta">
        <span><span class="count-strong">${recs.length}</span> fiche(s) sur ${STATE.records.length}</span>
        <span class="small">Boutons de colonne pour trier · 25 fiches par page</span>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table class="records">
        <thead><tr>
          ${th("id", "N° fiche")}
          ${th("nomEnregistre", "Nom enregistré")}
          ${th("ageDepart", "Âge")}
          ${th("navire", "Navire")}
          ${th("portDepart", "Port de départ")}
          ${th("commune", "Commune")}
          ${th("metierDeclare", "Métier")}
          ${th("statutFinEngagement", "Statut final")}
          <th>Fiabilité</th>
        </tr></thead>
        <tbody>
        ${slice.length ? slice.map((r) => `
          <tr>
            <td data-th="N° fiche"><a class="record-link" href="#/fiche/${r.id}">${esc(r.id)}</a></td>
            <td data-th="Nom enregistré"><a class="record-link" style="text-decoration:none" href="#/fiche/${r.id}">${esc(r.nomEnregistre)}</a></td>
            <td data-th="Âge">${esc(r.ageDepart)} ans</td>
            <td data-th="Navire">${esc(r.navire)}</td>
            <td data-th="Port de départ">${esc(r.portDepart)}</td>
            <td data-th="Commune">${esc(r.commune)}</td>
            <td data-th="Métier">${esc(r.metierDeclare)}</td>
            <td data-th="Statut final">${esc(r.statutFinEngagement)}</td>
            <td data-th="Fiabilité">${confianceTag(r.confiance)}</td>
          </tr>`).join("") : `<tr><td colspan="9" class="no-result">Aucune fiche ne correspond à cette recherche. Essayez d'élargir les filtres.</td></tr>`}
        </tbody>
      </table>
    </div>

    ${pages > 1 ? pagerHTML(pages) : ""}
  </section>`;
}

function pagerHTML(pages) {
  const p = STATE.page;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - p) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return `<div class="pager">
    <button ${p === 1 ? "disabled" : ""} onclick="goPage(${p - 1})">‹ Précédent</button>
    ${nums.map((n) => n === "…" ? `<span>…</span>` : `<button class="${n === p ? "active" : ""}" onclick="goPage(${n})">${n}</button>`).join("")}
    <button ${p === pages ? "disabled" : ""} onclick="goPage(${p + 1})">Suivant ›</button>
  </div>`;
}

/* ---------------- vue : fiche ---------------- */

function viewFiche(id) {
  const r = STATE.records.find((x) => x.id === id);
  if (!r) return `<section class="block"><div class="callout">Fiche introuvable : ${esc(id)}.</div><a class="btn btn-line" href="#/base">← Retour à la base</a></section>`;

  const validated = contribsForRecord(id, "valide");
  const pending = contribsForRecord(id, "en_verification");

  const item = (dt, dd) => `<div class="detail-item"><dt>${dt}</dt><dd>${dd}</dd></div>`;

  return `
  <a class="back-link" href="#/base">← Retour à la base de données</a>
  <section class="block" style="padding-top:.6rem">
    <div class="record-head">
      <div>
        <span class="kicker">Fiche ${esc(r.id)} · registre du ${esc(r.navire)}</span>
        <h2>${esc(r.nomEnregistre)}</h2>
        <p class="muted" style="margin:.3rem 0 0">${esc(r.metierDeclare)} · arrivé(e) à la Martinique le ${frDate(r.dateArrivee)}</p>
      </div>
      <div style="margin-left:auto;text-align:right">
        ${confianceTag(r.confiance)}<br>
        <button class="btn btn-accent" style="margin-top:.8rem" onclick="openContributionForm('${esc(r.id)}')">Proposer une correction ou un complément</button>
      </div>
    </div>

    <div class="detail-grid">
      ${item("Identifiant", esc(r.id))}
      ${item("Sexe", r.sexe === "M" ? "Homme" : r.sexe === "F" ? "Femme" : "—")}
      ${item("Âge au départ", esc(r.ageDepart) + " ans")}
      ${item("Année de naissance estimée", esc(r.anneeNaissanceEstimee))}
      ${item("Navire", esc(r.navire))}
      ${item("Port d'embarquement", esc(r.portDepart))}
      ${item("Date d'embarquement", frDate(r.dateEmbarquement))}
      ${item("Date d'arrivée", frDate(r.dateArrivee))}
      ${item("Durée du contrat", esc(r.dureeContratAns) + " ans")}
      ${item("Village / district d'origine", esc(r.villageOrigine))}
      ${item("Affectation", esc(r.habitationAffectation))}
      ${item("Commune", esc(r.commune))}
      ${item("Métier déclaré", esc(r.metierDeclare))}
      ${item("État matrimonial", esc(r.etatMatrimonial))}
      ${item("Date de placement", frDate(r.datePlacement))}
      ${item("Statut final", esc(r.statutFinEngagement))}
    </div>

    <div class="callout">
      <strong>Sources de la fiche</strong>
      <ul style="margin:.4rem 0 0">${r.sources.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <p class="small muted" style="margin:.5rem 0 0">${esc(r.notes)}</p>
    </div>

    ${pending.length ? `<div class="validated-contribs"><h3>Contributions en cours de vérification (${pending.length})</h3>
      <ul>${pending.map((c) => `<li><strong>${esc(c.field)}</strong> → « ${esc(c.proposedValue)} » <span class="status-pill status-en_verification">en vérification</span></li>`).join("")}</ul></div>` : ""}

    ${validated.length ? `<div class="validated-contribs"><h3>Contributions validées (${validated.length})</h3>
      <ul>${validated.map((c) => `<li><strong>${esc(c.field)}</strong> → « ${esc(c.proposedValue)} » · contribution de ${esc(c.contributorName)} <span class="status-pill status-valide">validée</span></li>`).join("")}</ul></div>` : ""}

    <div class="two-col" style="margin-top:1.8rem">
      <div class="card">
        <h3 style="margin-top:0">Contexte du convoi</h3>
        <p class="muted small" style="margin:0">Le <strong>${esc(r.navire)}</strong> a quitté ${esc(r.portDepart)} avec à son bord un contingent d'engagés destinés aux
        habitations de l'île. Les contrats stipulent huit années de travail contre salaire, nourriture, logement
        et — en principe — un retour au pays. À l'arrivée, les immigrants sont cantonnés à l'infirmerie ou au dépôt,
        puis « placés » sur les habitations.</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Vous reconnaissez ce nom ?</h3>
        <p class="muted small" style="margin:0 0 .8rem">Nom transcrit par le greffe ; des variantes orthographiques sont fréquentes (A-, At-, assibilation du mandarin ou du hakka). Une variante familiale, une photo d'archive, un acte d'état civil sont bienvenus.</p>
        <button class="btn btn-line" onclick="openContributionForm('${esc(r.id)}')">Enrichir cette fiche</button>
      </div>
    </div>
  </section>`;
}

/* ---------------- formulaire de contribution ---------------- */

const CONTRIBUTABLE_FIELDS = [
  ["nomEnregistre", "Nom enregistré (transcription)"],
  ["sexe", "Sexe"],
  ["ageDepart", "Âge au départ"],
  ["villageOrigine", "Village / district d'origine"],
  ["habitationAffectation", "Habitation d'affectation"],
  ["commune", "Commune"],
  ["metierDeclare", "Métier déclaré"],
  ["etatMatrimonial", "État matrimonial"],
  ["statutFinEngagement", "Statut final"],
  ["notes", "Note biographique / autre"],
];

function openContributionForm(recordId) {
  const r = STATE.records.find((x) => x.id === recordId);
  if (!r) return;
  const fieldOptions = CONTRIBUTABLE_FIELDS.map(([k, l]) =>
    `<option value="${k}">${esc(l)} — valeur actuelle : « ${esc(r[k] ?? "—")} »</option>`).join("");

  $modal.innerHTML = `
  <div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="contrib-title">
      <button class="close-x" onclick="closeModal()" aria-label="Fermer">✕</button>
      <span class="kicker">Fiche ${esc(r.id)} · ${esc(r.nomEnregistre)}</span>
      <h3 id="contrib-title">Proposer une contribution</h3>
      <p class="muted small">Votre proposition sera examinée avant publication. Une <strong>source vérifiable</strong>
      (acte d'état civil, registre d'archives, presse d'époque, tradition familiale documentée) est obligatoire.</p>
      <form id="contrib-form" data-record-id="${esc(r.id)}" novalidate>
        <div class="form-grid">
          <div class="field full">
            <label for="cf-field">Champ à compléter ou corriger</label>
            <select id="cf-field" name="field">${fieldOptions}</select>
          </div>
          <div class="field full">
            <label for="cf-value">Valeur proposée</label>
            <input id="cf-value" name="proposedValue" type="text" required placeholder="Votre correction ou complément">
            <div class="field-error" data-err="proposedValue"></div>
          </div>
          <div class="field">
            <label for="cf-name">Votre nom ou pseudo</label>
            <input id="cf-name" name="contributorName" type="text" required>
            <div class="field-error" data-err="contributorName"></div>
          </div>
          <div class="field">
            <label for="cf-email">Courriel (pour le suivi)</label>
            <input id="cf-email" name="email" type="email" required placeholder="utilisateur@exemple.org">
            <div class="field-error" data-err="email"></div>
          </div>
          <div class="field full">
            <label for="cf-source">Source (obligatoire) — cote d'archives, référence, lien, ou description précise</label>
            <textarea id="cf-source" name="source" required placeholder="Ex. : AD Martinique, 4 U 12, acte de mariage du 14 mai 1867… ou tradition orale familiale avec détails"></textarea>
            <div class="field-error" data-err="source"></div>
          </div>
          <div class="field full">
            <label class="consent"><input type="checkbox" id="cf-consent" required>
              Je comprends que ma contribution sera publiée (avec attribution) si elle est
              validée, et que le prénom du contributeur apparaîtra sur la fiche.</label>
            <div class="field-error" data-err="consent"></div>
          </div>
          <div class="full" style="display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-accent" type="submit">Soumettre à vérification</button>
            <button class="btn btn-line" type="button" onclick="closeModal()">Annuler</button>
          </div>
        </div>
      </form>
    </div>
  </div>`;

  document.getElementById("contrib-form").addEventListener("submit", submitContribution);
}

function submitContribution(e) {
  e.preventDefault();
  const f = e.target;
  const val = (n) => f[n].value.trim();
  const errs = {};
  const show = (n, msg) => { errs[n] = msg; };

  if (val("proposedValue").length < 2) show("proposedValue", "Indiquez une valeur d'au moins 2 caractères.");
  if (val("contributorName").length < 2) show("contributorName", "Nom ou pseudo requis.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) show("email", "Adresse électronique invalide.");
  if (val("source").length < 15) show("source", "Une source précise (≥ 15 caractères) est obligatoire.");
  if (!f.consent.checked) show("consent", "Vous devez accepter les conditions de publication.");

  f.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  f.querySelectorAll(".field").forEach((el) => el.classList.remove("invalid"));
  let firstBad = null;
  for (const [n, msg] of Object.entries(errs)) {
    const el = f[n];
    const wrap = el.closest(".field");
    if (wrap) wrap.classList.add("invalid");
    const errEl = f.querySelector(`[data-err="${n}"]`);
    if (errEl) errEl.textContent = msg;
    if (!firstBad) firstBad = el;
  }
  if (firstBad) { firstBad.focus(); return; }

  const recordId = f.dataset.recordId;
  const contrib = {
    id: "P" + Date.now().toString(36).toUpperCase(),
    recordId,
    recordName: STATE.records.find((r) => r.id === recordId)?.nomEnregistre ?? "",
    field: val("field"),
    proposedValue: val("proposedValue"),
    contributorName: val("contributorName"),
    email: val("email"),
    source: val("source"),
    status: "en_verification",
    submittedAt: new Date().toISOString(),
    reviewLog: [],
  };
  const list = getContribs();
  list.push(contrib);
  saveContribs(list);
  updateFooterContribCount();

  $modal.innerHTML = `
  <div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
    <div class="modal" role="dialog" aria-modal="true">
      <h3>✅ Proposition enregistrée sous la référence ${contrib.id}</h3>
      <p class="muted small">Statut : <span class="status-pill status-en_verification">en vérification</span> — elle sera contrôlée par un binôme avant publication sur la fiche ${esc(recordId)}.</p>
      <p class="muted small">Dans cette version gratuite de démonstration, les propositions sont conservées
      localement sur cet appareil et exportables en JSON pour la modération. La version en ligne utilisera
      un backend collaboratif équivalent.</p>
      <button class="btn btn-accent" onclick="closeModal()">Fermer</button>
    </div>
  </div>`;
  if (location.hash.startsWith("#/fiche/")) router();
}

function closeModal() { $modal.innerHTML = ""; }

/* ---------------- vue : contributions & modération ---------------- */

function viewContribuer() {
  const pending = getContribs().filter((c) => c.status !== "valide").length;
  return `
  <section class="block">
    <span class="kicker">Participer</span>
    <h2>Aider à compléter les 977 fiches</h2>
    <p class="muted" style="max-width:52rem">Genealogistes, chercheurs, familles : chacun peut proposer des corrections
    (orthographe d'un nom transcrit), des compléments (sort final, descendants, photo d'archive) ou signer une trace
    nouvelle. <strong>${pending ? `Vous avez déjà ${pending} proposition(s) en cours sur cet appareil.` : "Toutes les propositions passent par la même filière de validation."}</strong></p>

    <div class="two-col" style="margin-top:1.6rem">
      <div class="card">
        <h3 style="margin-top:0">Ce que l'on attend</h3>
        <ul class="muted small">
          <li>Une <strong>source vérifiable</strong> : cote d'archives, acte, presse d'époque, référence publiée.</li>
          <li>Une correction ciblée sur <strong>un champ</strong> de la fiche (nom, âge, village, habitation…).</li>
          <li>Pour la tradition orale : le lien de parenté et le contexte qui appuient l'information.</li>
        </ul>
        <h3>Ce qui est exclu</h3>
        <ul class="muted small">
          <li>Données sensibles sur des personnes vivantes, spéculations sans source.</li>
          <li>Réutilisation commerciale du corpus (usage pédagogique et historique encouragé).</li>
        </ul>
        <a class="btn btn-accent" href="#/base">Parcourir la base et choisir une fiche</a>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Votre fonctionnement garantit l'exactitude</h3>
        <ol class="muted small" style="padding-left:1.2rem">
          <li><strong>Instruction immédiate</strong> : horodatage, référence, enregistrement.</li>
          <li><strong>Vérification croisée</strong> : deux relecteurs contrôlent la source citée indépendamment.</li>
          <li><strong>Décision motivée</strong> : validation, ou rejet avec motif notifié ; l'historique complet est conservé.</li>
          <li><strong>Publication attribuée</strong> : le nom du contributeur figure sur la fiche.</li>
        </ol>
        <p class="small">Les propositions déjà déposées sur cet appareil peuvent être exportées puis importées dans l'interface de modération :
        <a href="#/validation">accéder à la file de vérification</a>.</p>
      </div>
    </div>
  </section>`;
}

function viewValidation() {
  const list = getContribs();
  const pending = list.filter((c) => c.status === "en_verification");
  const done = list.filter((c) => c.status !== "en_verification");

  return `
  <section class="block">
    <span class="kicker">Modération · démonstration locale</span>
    <h2>File de vérification des contributions</h2>
    <p class="muted small">Chaque contribution est contrôlée : la source est confrontée à la fiche, la cohérence
    des fields est relectée, puis la décision est tracée. Cette démo fonctionne localement ; en production, la
    file est partagée entre modérateurs identifiés.</p>

    <div style="margin:1rem 0">
      <button class="btn btn-line" onclick="exportContribs()">⬇ Exporter toutes les contributions (JSON)</button>
      <label class="btn btn-line" style="margin-left:.4rem">⬆ Importer un JSON<input type="file" accept="application/json" style="display:none" onchange="importContribs(event)"></label>
    </div>

    <h3>En attente de vérification · ${pending.length}</h3>
    ${pending.length ? pending.map(qiHTML).join("") : '<p class="muted small">Aucune contribution en attente.</p>'}

    <h3 style="margin-top:2rem">Décisions enregistrées · ${done.length}</h3>
    ${done.length ? done.map(qiHTML).join("") : '<p class="muted small">Aucune décision enregistrée.</p>'}
  </section>`;
}

function qiHTML(c) {
  return `
  <div class="queue-item">
    <div class="qi-head">
      <div><strong>${c.id}</strong> · fiche <a class="record-link" href="#/fiche/${c.recordId}">${esc(c.recordName)}</a>
        <span class="status-pill status-${c.status.replace(" ", "_")}">${esc(c.status)}</span></div>
      <div class="small muted">${new Date(c.submittedAt).toLocaleString("fr-FR")}</div>
    </div>
    <p class="small" style="margin:.5rem 0 0"><strong>Champ :</strong> ${esc(c.field)} · <strong>Valeur proposée :</strong> « ${esc(c.proposedValue)} »</p>
    <p class="small" style="margin:.3rem 0 0"><strong>Source citée :</strong> ${esc(c.source)}</p>
    <p class="small muted" style="margin:.3rem 0 0">Contributeur : ${esc(c.contributorName)} · ${esc(c.email)}</p>
    ${c.reviewLog.map((l) => `<p class="small muted" style="margin:.3rem 0 0">— ${esc(l)}</p>`).join("")}
    ${c.status === "en_verification" ? `
    <div class="queue-actions">
      <button class="btn btn-accent" onclick="decide('${c.id}', true)">✓ Valider et publier</button>
      <button class="btn btn-danger" onclick="decide('${c.id}', false)">✗ Rejeter</button>
    </div>` : ""}
  </div>`;
}

function decide(id, approve) {
  const list = getContribs();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  const motif = prompt(
    approve
      ? "Référence de la vérification (cote contrôlée, nom du relecteur) :"
      : "Motif du rejet (sera conservé dans l'historique) :"
  );
  if (motif === null) return;
  c.status = approve ? "valide" : "rejete";
  c.reviewLog.push(`${approve ? "VALIDÉ" : "REJETÉ"} le ${new Date().toLocaleString("fr-FR")} — ${motif || "sans précision"}`);
  saveContribs(list);
  updateFooterContribCount();
  router();
}

function exportContribs() {
  const blob = new Blob([JSON.stringify(getContribs(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "contributions-chinois-martinique.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importContribs(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const arr = JSON.parse(reader.result);
      if (!Array.isArray(arr)) throw new Error("format");
      const existing = getContribs();
      for (const c of arr) {
        if (!existing.some((x) => x.id === c.id)) existing.push(c);
      }
      saveContribs(existing);
      updateFooterContribCount();
      router();
    } catch {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
}

/* ---------------- vue : histoire (détaille le contexte) ---------------- */

function viewHistoire() {
  return `
  <section class="block">
    <span class="kicker">Le contexte</span>
    <h2>Les « Chins » : une immigration chinoise peu visible</h2>
    <div class="two-col">
      <div>
        <figure class="illus">
          <img src="photos/histoire-chins.jpg" alt="Illustration d'un engagé chinois du XIXe siècle en Martinique">
          <figcaption class="small muted">Illustration créée par intelligence artificielle</figcaption>
        </figure>
        <p>Dix ans après l'abolition de l'esclavage de 1848, les planteurs de Martinique cherchent une main-d'œuvre de
        substitution. Sur les 37 008 engagés amenés dans l'île dans la seconde moitié du XIXᵉ siècle
        (25 509 Indiens, 10 521 Congos), les Chinois forment le contingent le plus restreint : environ
        <strong>978 embarqués</strong>, dont une centaine est immédiatement replacée vers la Guyane dès 1860.</p>
        <p>Trois convois suffisent : <strong>Fulton</strong> et <strong>Amiral Baudin</strong> depuis <strong>Shanghai</strong>
        (septembre 1859), <strong>Galilée</strong> depuis <strong>Canton</strong> (3 juillet 1860). L'expérience cesse
        aussitôt — trop coûteuse, et les engagés, souvent recrutés en ville, peinent dans les travaux de la canne,
        face au climat et à une terrible mortalité.</p>
        <p>À l'issue de leurs huit ans de contrat, des engagés rachètent leur engagement ou patientent : nombreux
        rejoignent les bourgs pour le petit commerce. C'est là que naît la figure du « Chin », boutiquier des
        communes, avant la seconde vague migratoire (Hakkas des années 1940) qui réoriente la communauté vers
        la restauration, les bazars puis le commerce de gros.</p>
        <div class="callout">
          <strong>Une page d'histoire à réhabiliter.</strong> La discrétion démographique de cette communauté
          contraste avec son rôle dans la société martiniquaise. Comprendre cette histoire, c'est comprendre
          la pluralité du « melting-pot » antillais.
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Repères</h3>
        <ul class="small muted" style="padding-left:1.1rem; margin:0">
          <li><strong>1848</strong> — Abolition de l'esclavage en Martinique.</li>
          <li><strong>Sept. 1859</strong> — Arrivée des Fulton et Amiral Baudin (Shanghai).</li>
          <li><strong>3 juil. 1860</strong> — Arrivée du Galilée (Canton) ; 100 passagers placés en Guyane.</li>
          <li><strong>1860</strong> — Fin des contingents chinois vers les Antilles françaises : l'expérience n'est pas reconduite.</li>
          <li><strong>1867-1868</strong> — Terme des contrats de 8 ans ; recomposition des trajectoires.</li>
          <li><strong>Années 1940</strong> — Seconde vague hakka ; essor du commerce de détail.</li>
        </ul>
        <p class="small muted" style="margin-top:1rem">Pistes de lecture : B. David, « Immigrations et main d'œuvre
        à la Martinique » ; H. Domenach &amp; M. Picouet, <em>La population de la Martinique</em> ; travaux de
        l'association Tous Créoles ; archives coloniales (ANOM).</p>
      </div>
    </div>
  </section>`;
}

/* ---------------- vue : méthodologie ---------------- */

function viewMethodologie() {
  return `
  <section class="block">
    <span class="kicker">Faire la science transparente</span>
    <h2>Méthodologie de constitution du corpus</h2>
    <div class="two-col">
      <div>
        <h3 style="font-size:1.1rem">1. Constitution de la liste nominative</h3>
        <p class="muted small">Le point de départ est le dépouillement des registres d'immigration et d'engagement
        conservés aux <strong>Archives départementales de la Martinique</strong> (série 7Mi et sous-série 5 Mi),
        complétés par les archives coloniales du Ministère de la Marine (ANOM) et par la presse locale d'époque.
        Chaque ligne des registres devient une <strong>fiche</strong> : nom transcrit, âge, sexe, lieu d'origine,
        navire, dates, habitation d'affectation.</p>

        <h3 style="font-size:1.1rem">2. Normalisation et enrichissement</h3>
        <p class="muted small">Les transcriptions de greffe (Akam, Assam, Afong…) sont conservées telles quelles —
        ce sont des <strong>faits documentaires</strong>. Les districts d'origine sont normalisés selon la
        géographie administrative des années 1850 (préfectures et comtés du Guangdong, préfectures du Jiangsu).
        Les âges manifestement approximatifs sont signalés.</p>

        <h3 style="font-size:1.1rem">3. Grille de fiabilité</h3>
        <ul class="muted small">
          <li><span class="tag tag-ok">corpus vérifié</span> — champ renseigné par une source primaire contrôlée.</li>
          <li><span class="tag tag-warn">probable</span> — information déduite, à confirmer (ex. : année de naissance estimée à partir de l'âge).</li>
          <li><span class="tag tag-accent">données d'exemple</span> — champ de démonstration, en attente des relevés d'archives.</li>
        </ul>

        <h3 style="font-size:1.1rem">4. Contributions citoyennes</h3>
        <p class="muted small">La base reste ouverte aux familles et aux chercheurs. Chaque contribution est
        instruite : vérification de la source par binôme, décision motivée, publication attribuée et historique
        complet conservé. Voir la <a href="#/contribuer">page contributions</a>.</p>
      </div>
      <div class="card">
        <h3 style="margin-top:0">Limites reconnues</h3>
        <ul class="muted small" style="padding-left:1.1rem">
          <li>Les transcriptions de noms chinois sont approximatives et comportent des variantes (A-, At-, assibilation).</li>
          <li>L'orthographe de la même personne peut varier entre deux registres ; le rapprochement est signalé mais jamais forcé.</li>
          <li>Les femmes sont très minoritaires dans les registres (≈ 12 % du corpus) ; cette asymétrie doit être interprétée avec prudence.</li>
          <li>Certains engagés sont « illisibles » (registre abîmé) : les lacunes sont indiquées, jamais comblées.</li>
          <li>Le chiffre de 978 embarqués contre 977 fiches correspond à l'écart entre listes de bord et registres de la colonie.</li>
        </ul>
        <h3>Version gratuite de test</h3>
        <p class="muted small">Ce site est hébergé statiquement (gratuit) pour mesurer l'intérêt du public. Les
        indicateurs d'usage, et surtout les premières contributions, décideront de la poursuite et du passage à
        une infrastructure de modération partagée.</p>
      </div>
    </div>
  </section>`;
}

/* ---------------- routeur ---------------- */

function router() {
  const hash = location.hash || "#/accueil";
  const parts = hash.slice(2).split("/");
  const route = parts[0] || "accueil";
  $modal.innerHTML = "";
  window.scrollTo(0, 0);

  let html = "";
  switch (route) {
    case "accueil": html = viewAccueil(); break;
    case "histoire": html = viewHistoire(); break;
    case "methodologie": html = viewMethodologie(); break;
    case "base": html = viewBase(); break;
    case "fiche": html = viewFiche(decodeURIComponent(parts[1] || "")); break;
    case "contribuer": html = viewContribuer(); break;
    case "validation": html = viewValidation(); break;
    default:
      html = `<section class="block"><div class="callout">Page introuvable.</div><a href="#/accueil" class="btn btn-line">← Accueil</a></section>`;
  }
  setNav(route === "fiche" ? "base" : route);
  $app.innerHTML = html;
  updateFooterContribCount();
  if (route === "base") attachSearchDebounce();
}

/* ---------------- événements de la base ---------------- */

let debounceTimer = null;
function attachSearchDebounce() {
  const q = document.getElementById("db-q");
  if (!q) return;
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitQuery(q.value); }
  });
}
function onQueryInput(v) { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => commitQuery(v), 300); }
function commitQuery(v) { STATE.query = v; STATE.page = 1; router(); const q = document.getElementById("db-q"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }

function setFilter(k, v) { STATE.filters[k] = v; STATE.page = 1; router(); }
function setAge(which, v) { STATE.ageMin = which === "min" ? v : STATE.ageMin; STATE.ageMax = which === "max" ? v : STATE.ageMax; STATE.page = 1; router(); }
function sortBy(k) {
  if (STATE.sortKey === k) STATE.sortDir = STATE.sortDir === "asc" ? "desc" : "asc";
  else { STATE.sortKey = k; STATE.sortDir = "asc"; }
  router();
}
function goPage(n) { STATE.page = Math.max(1, n); router(); window.scrollTo(0, 0); }
function resetFilters() {
  STATE.query = ""; STATE.filters = { navire: "", port: "", sexe: "", commune: "", metier: "", statut: "" };
  STATE.ageMin = ""; STATE.ageMax = ""; STATE.page = 1; STATE.sortKey = "id"; STATE.sortDir = "asc";
  router();
}

/* ---------------- démarrage ---------------- */

window.addEventListener("hashchange", router);
loadData().then(() => router());
