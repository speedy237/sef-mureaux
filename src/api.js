 /**
 * SEF Mureaux — API client
 * src/api.js
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";
const IS_DEV = import.meta.env.DEV;

function getBase() {
  if (!APPS_SCRIPT_URL) return null;
  if (IS_DEV) {
    try {
      const url = new URL(APPS_SCRIPT_URL);
      return "/api" + url.pathname;
    } catch { return "/api"; }
  }
  return APPS_SCRIPT_URL;
}
const BASE = getBase();

async function get(params = {}) {
  if (!BASE) throw new Error("VITE_APPS_SCRIPT_URL non défini dans .env");

  const url = new URL(BASE, IS_DEV ? window.location.origin : undefined);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  // ✅ credentials:"omit" → Google renvoie Access-Control-Allow-Origin:*
  //    au lieu du domaine précis → résout l'erreur CORS sur GitHub Pages
  const r = await fetch(url.toString(), {
    redirect:    "follow",
    credentials: "omit",
  });

  const text = await r.text();
  try {
    const d = JSON.parse(text);
    if (d.error) throw new Error(d.error);
    return d;
  } catch { throw new Error("Réponse invalide : " + text.slice(0, 200)); }
}

async function post(body = {}) {
  if (!APPS_SCRIPT_URL) throw new Error("VITE_APPS_SCRIPT_URL non défini dans .env");

  // ── Dev : proxy Vite ne gère pas bien les redirections 302 de Google.
  //    On poste directement + mode no-cors. L'état est mis à jour optimistement.
  if (IS_DEV) {
    await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      mode:    "no-cors",
      redirect:"follow",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(body),
    });
    return { status: "ok" };
  }

  // ── Production : appel direct, credentials omit pour éviter CORS
  const r = await fetch(APPS_SCRIPT_URL, {
    method:      "POST",
    redirect:    "follow",
    credentials: "omit",
    headers:     { "Content-Type": "text/plain" },
    body:        JSON.stringify(body),
  });

  const text = await r.text();
  try {
    const d = JSON.parse(text);
    if (d.error) throw new Error(d.error);
    return d;
  } catch { throw new Error("Réponse invalide : " + text.slice(0, 200)); }
}

// ─── LECTURE ────────────────────────────────────────────
export const ping        = ()      => get({ action: "ping" });
export const loadAll     = ()      => get({ action: "readAll" });
export const loadStats   = ()      => get({ action: "stats" });
export const loadSheet   = (sheet) => get({ action: "read", sheet });

// ─── ÉCRITURE ───────────────────────────────────────────
export const addEntree          = (entree, mouvements) => post({ action: "addEntree",          entree,    mouvements });
export const addDistribution    = (sortie, mouvements) => post({ action: "addDistribution",    sortie,    mouvements });
export const addProduit         = (data)               => post({ action: "addProduit",         data });
export const addBeneficiaire    = (data)               => post({ action: "addBeneficiaire",    data });
export const addDonateur        = (data)               => post({ action: "addDonateur",        data });
export const addPartenaire      = (data)               => post({ action: "addPartenaire",      data });
export const addCategorie       = (data)               => post({ action: "addCategorie",       data });
export const addBenevole        = (data)               => post({ action: "addBenevole",        data });
export const updateProduit      = (data)               => post({ action: "updateProduit",      data });
export const updateCategorie    = (data)               => post({ action: "updateCategorie",    data });
export const updateBeneficiaire = (data)               => post({ action: "updateBeneficiaire", data });
export const updateBenevole     = (data)               => post({ action: "updateBenevole",     data });
export const updateDonateur     = (data)               => post({ action: "updateDonateur",     data });
export const updatePartenaire   = (data)               => post({ action: "updatePartenaire",   data });

// ─── MAPPERS ────────────────────────────────────────────
export function mapProduit(r) {
  return {
    ref:    r["Référence"]     || "",
    label:  r["Libellé"]       || "",
    cat:    r["Categorie"]     || "",
    nature: r["Nature"]        || "",
    dlc:    r["DLC"]           || "",
    stock:  Number(r["Quantité_stock"]) || 0,
    seuil:  Number(r["Seuil_alerte"])   || 0,
    actif:  r["Actif"] === true || r["Actif"] === "TRUE" || r["Actif"] === "VRAI",
  };
}

export function mapCategorie(r) {
  return {
    ref:   r["Référence"] || "",
    label: r["Libellé"]   || "",
    actif: r["Actif"] === true || r["Actif"] === "TRUE" || r["Actif"] === "VRAI",
  };
}

export function mapBeneficiaire(r) {
  return {
    horodateur:   r["Horodateur"]                                        || "",
    nom:          r["Nom du Bénéficiaire"]                               || "",
    prenom:       r["Prénom du Bénéficiaire"]                            || "",
    tel:          r["Numéro de téléphone du Bénéficiaire"]               || "",
    age:          r["Tranche d'âge du Bénéficiaire"]                     || "",
    sexe:         r["Sexe"]                                              || "",
    ville:        r["Dans quelle ville habitez-vous ( Bénéficiaire) ?"]  || "",
    situation:    r["Situation Matrimonial"]                             || "",
    nbPersonnes:  Number(r["Nbre Pers Foyers"]) || 0,
    nbEnfants:    Number(r["Enfants"])          || 0,
    restrictions: r["restrictions alimentaires"] || "",
    bebes:        r["Produits Bébés"]            || "",
    revenus:      r["source régulière de revenus ?"] || "",
    canal:        r["Canal"]                         || "",
  };
}

export function mapBenevole(r) {
  return {
    matricule: r["Matricule"]  || "",
    nom:       r["Nom"]        || "",
    prenom:    r["Prénom"]     || "",
    email:     r["Email"]      || "",
    pseudo:    r["Pseudonyme"] || "",
    mdp:       r["MotDePasse"] || "",
    tel:       r["Téléphone"]  || "",
    pole:      r["Pôle"]       || "",
    statut:    r["Statut"]     || "Bénévole",
    actif:     r["Actif"] === true || r["Actif"] === "TRUE" || r["Actif"] === "VRAI",
  };
}

export function mapMouvement(r) {
  return {
    date:        r["Date"]        || "",
    type:        r["Type"]        || "",
    produit:     r["Produits"]    || "",
    qte:         Number(r["Quantité"]) || 0,
    benevole:    r["Benevole"]    || "",
    commentaire: r["Commentaire"] || "",
    id:          r["MouvementId"] || "",
    dlc:         r["DLC Entrées"] || "",
  };
}

export function mapEntree(r) {
  return {
    horodatage:   r["Horodatage"]   || "",
    id:           r["MouvementId"]  || "",
    type:         r["Type"]         || "",
    fournisseur:  r["Fournisseur"]  || "",
    commentaires: r["Commentaires"] || "",
  };
}

export function mapSortie(r) {
  return {
    horodatage:     r["Horodatage"]     || "",
    beneficiaireId: r["BeneficiaireID"] || "",
    id:             r["MouvementId"]    || "",
    commentaires:   r["Commentaires"]   || "",
  };
}

export function mapDonateur(r) {
  return {
    nom:     r["Nom"]       || "",
    prenom:  r["Prenom"]    || "",
    adresse: r["adresse"]   || "",
    ville:   r["Ville"]     || "",
    tel:     r["Telephone"] || "",
    fi:      r["FI"]        || "",
    stars:   r["STARS"] === true || r["STARS"] === "OUI" || r["STARS"] === "TRUE",
  };
}

export function mapPartenaire(r) {
  return {
    raisonSociale: r["Raison Sociale"] || "",
    siret:         r["SIRET"]          || "",
    adresse:       r["Adresse"]        || "",
    ville:         r["Ville"]          || "",
    tel:           r["Telephone"]      || "",
  };
}
