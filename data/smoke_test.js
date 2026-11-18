/* Smoke test : exécute chaque route avec un DOM minimal simulé. */
const fs = require("fs");
const path = require("path");

function el(id) {
  return {
    innerHTML: "",
    textContent: "",
    dataset: {},
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    toggleAttribute() {},
    setAttribute() {},
    focus() {},
  };
}

global.document = {
  getElementById: (id) => (global.__els[id] ??= el(id)),
  querySelectorAll: () => [],
  createElement: () => ({ href: "", click() {}, set href(v) {} }),
  addEventListener() {},
  body: { classList: { remove() {}, toggle() {} } },
};
global.__els = {};
global.window = { scrollTo() {}, addEventListener() {} };
global.location = { hash: "#/accueil" };
global.history = {};
global.sessionStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };
const store = {};
global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.alert = () => {};
global.prompt = () => null;
global.fetch = async (url) => ({
  json: async () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data/records.json"), "utf8")),
});

const code = fs.readFileSync(path.join(__dirname, "..", "js/app.js"), "utf8");
eval(code + "\n; global.__api = { router, applyQuery, STATE,decide, exportContribs };");

(async () => {
  await new Promise((r) => setTimeout(r, 200)); // laisse loadData se terminer
  const routes = ["#/accueil", "#/histoire", "#/methodologie", "#/base", "#/fiche/C0001", "#/fiche/C0977", "#/fiche/NOPE", "#/contribuer", "#/validation", "#/inconnu"];
  let failures = 0;
  for (const r of routes) {
    try {
      global.location.hash = r;
      __api.router();
      const html = document.getElementById("app").innerHTML;
      if (!html || (html.length < 200 && !r.includes("NOPE") && r !== "#/inconnu")) throw new Error("HTML trop court");
      if (html.includes("undefined") && !r.includes("NOPE")) throw new Error("contient 'undefined'");
      console.log(`OK  ${r}  (${html.length} chars)`);
    } catch (e) {
      failures++;
      console.error(`FAIL ${r}: ${e.message}`);
    }
  }

  // test du moteur de recherche
  global.location.hash = "#/base";
  __api.router();
  Object.assign(__api.STATE, { query: "" }, { filters: { navire: "Galilée", port: "", sexe: "", commune: "", metier: "", statut: "" } });
  const gal = __api.applyQuery();
  console.log(`Recherche navire=Galilée -> ${gal.length} fiches (attendu 364)`);
  __api.STATE.query = "fulton";
  const fult = __api.applyQuery();
  console.log(fult.length === 0 ? "OK  filtre combiné exclusif" : `FAIL filtre combiné: ${fult.length}`);
  __api.STATE.query = "";
  __api.STATE.filters = { navire: "", port: "", sexe: "", commune: "", metier: "", statut: "" };
  const search = __api.applyQuery();
  console.log(`Total sans filtre -> ${search.length} (attendu 977)`);
  if (gal.length !== 364 || search.length !== 977) failures++;

  console.log(failures ? `\n${failures} échec(s)` : "\nTOUS LES TESTS PASSENT");
  process.exit(failures ? 1 : 0);
})();
