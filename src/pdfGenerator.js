/**
 * SEF Mureaux — Générateur de documents PDF
 * src/pdfGenerator.js
 *
 * Nécessite : npm install jspdf jspdf-autotable
 *
 * Documents générés :
 *  - pvEntree()          Procès-verbal d'entrée (Collecte / Dons / Caddie Solidaire)
 *  - recuSource()        Reçu pour donateur ou fournisseur
 *  - pvDistribution()    Procès-verbal de distribution
 *  - carteBeneficiaire() Carte bénéficiaire (format A6)
 *  - datamartMensuel()   Rapport d'activité mensuel (KPIs + graphiques)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Palette SEF ──
const GREEN  = [28,  74,  53];
const GREEN2 = [45, 107,  79];
const AMBER  = [212, 135,  10];
const LIGHT  = [245, 240, 232];
const GRAY   = [120, 120, 120];
const WHITE  = [255, 255, 255];
const BLACK  = [26,  26,  26];

const fmt   = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtLg = d => d ? new Date(d).toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"}) : "—";
const todayStr = () => new Date().toLocaleDateString("fr-FR");

// ══════════════════════════════════════════════════════
//  HELPERS COMMUNS
// ══════════════════════════════════════════════════════

function entete(doc, titre, sous="", width=210) {
  // Bandeau vert
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, width, 28, "F");

  // Croix / logo texte
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica","bold");
  doc.text("✝", 12, 18);

  doc.setFontSize(13);
  doc.text("Secours Évangélique de France", 22, 13);
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.text("Association Loi 1901  •  RNA n° W943003928 •  Aide alimentaire et sociale", 22, 20);

  // Titre document (bandeau amber)
  doc.setFillColor(...AMBER);
  doc.rect(0, 28, width, 10, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica","bold");
  doc.setFontSize(11);
  doc.text(titre.toUpperCase(), width/2, 35, {align:"center"});

  if (sous) {
    doc.setFontSize(8);
    doc.setFont("helvetica","normal");
    doc.text(sous, width/2, 40, {align:"center"});
  }

  // Reset color
  doc.setTextColor(...BLACK);
  return sous ? 46 : 42;
}

function pied(doc, pageNum=1, total=1, width=210, height=297) {
  doc.setFillColor(...LIGHT);
  doc.rect(0, height-12, width, 12, "F");
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont("helvetica","normal");
  doc.text("SEF Les Mureaux • Document généré le "+todayStr(), 10, height-4);
  doc.text(`Page ${pageNum}/${total}`, width-10, height-4, {align:"right"});
  doc.setTextColor(...BLACK);
}

function bloc(doc, label, value, x, y, w=80) {
  doc.setFontSize(7);
  doc.setFont("helvetica","bold");
  doc.setTextColor(...GRAY);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(10);
  doc.setFont("helvetica","normal");
  doc.setTextColor(...BLACK);
  doc.text(String(value||"—"), x, y+5);
}

function signatureBox(doc, label, x, y, w=70) {
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, 20);
  doc.setFontSize(7);
  doc.setFont("helvetica","normal");
  doc.setTextColor(...GRAY);
  doc.text(label, x+2, y+5);
  doc.text("Signature :", x+2, y+16);
  doc.setTextColor(...BLACK);
}

// ══════════════════════════════════════════════════════
//  1. PROCÈS-VERBAL D'ENTRÉE
// ══════════════════════════════════════════════════════
/**
 * @param {Object} entree   { id, type, fournisseur, horodatage, commentaires, benevole }
 * @param {Array}  produits [{label, qte, dlc}]
 */
export function pvEntree(entree, produits) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, H = 297;
  const typIcon = entree.type==="Collecte" ? "🚐" : entree.type==="Dons" ? "💝" : "🛒";

  let y = entete(doc, `Procès-Verbal d'Entrée — ${entree.type}`, `Réf. ${entree.id}`);

  // Infos principales
  doc.setFillColor(...LIGHT);
  doc.rect(10, y, W-20, 26, "F");
  bloc(doc, "Date", fmtLg(entree.horodatage), 14, y+7);
  bloc(doc, "Type d'entrée", `${typIcon} ${entree.type}`, 80, y+7);
  bloc(doc, "Bénévole responsable", entree.benevole||"—", 14, y+17);
  bloc(doc, entree.type==="Collecte"?"Fournisseur / Partenaire":"Donateur", entree.fournisseur||"—", 80, y+17);
  y += 32;

  if (entree.commentaires) {
    doc.setFillColor(255,248,220);
    doc.rect(10, y, W-20, 10, "F");
    doc.setFontSize(8); doc.setFont("helvetica","italic"); doc.setTextColor(...GRAY);
    doc.text("Commentaires : " + entree.commentaires, 14, y+6);
    doc.setTextColor(...BLACK); doc.setFont("helvetica","normal");
    y += 14;
  }

  // Tableau des produits
  doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.setTextColor(...GREEN);
  doc.text("Détail des produits reçus", 10, y+1);
  doc.setTextColor(...BLACK);
  y += 4;

  const totalQte = produits.reduce((s,p)=>s+(+p.qte||0),0);

  autoTable(doc, {
    startY: y,
    margin: {left:10, right:10},
    head: [["#","Produit","Quantité","DLC","Observations"]],
    body: produits.map((p,i) => [i+1, p.label, p.qte, fmt(p.dlc)||"—", ""]),
    foot: [["","TOTAL",totalQte,"",""]],
    headStyles: { fillColor:GREEN2, textColor:WHITE, fontSize:9, fontStyle:"bold" },
    footStyles: { fillColor:LIGHT, textColor:BLACK, fontStyle:"bold", fontSize:9 },
    bodyStyles: { fontSize:9 },
    columnStyles: {
      0:{cellWidth:8,halign:"center"},
      2:{cellWidth:22,halign:"center"},
      3:{cellWidth:28,halign:"center"},
    },
    alternateRowStyles: { fillColor:[250,248,244] },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Résumé
  doc.setFillColor(...GREEN);
  doc.rect(10, y, W-20, 10, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text(`${produits.length} référence(s) • ${totalQte} article(s) réceptionnés`, W/2, y+6.5, {align:"center"});
  doc.setTextColor(...BLACK);
  y += 18;

  // Signatures
  if (y > H-60) { doc.addPage(); y = 20; }
  doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text("Signatures", 10, y); y += 4;
  signatureBox(doc, "Bénévole réceptionnaire", 10, y);
  signatureBox(doc, entree.type==="Collecte"?"Représentant fournisseur":"Donateur", 100, y);
  y += 24;
  doc.setFontSize(7); doc.setTextColor(...GRAY);
  doc.text("Document à conserver — Archives SEF Les Mureaux", W/2, y, {align:"center"});

  pied(doc, 1, 1, W, H);
  doc.save(`PV_Entree_${entree.type.replace(/ /g,"_")}_${entree.id}.pdf`);
}

// ══════════════════════════════════════════════════════
//  2. REÇU DONATEUR / FOURNISSEUR
// ══════════════════════════════════════════════════════
/**
 * @param {Object} source  { nom, type:"donateur"|"fournisseur", adresse, ville, tel }
 * @param {Object} entree  { id, type, horodatage, benevole }
 * @param {Array}  produits [{label, qte, dlc}]
 */
export function recuSource(source, entree, produits) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, H = 297;

  let y = entete(doc, source.type==="donateur"?"Reçu de Don":"Reçu de Fournisseur",
    `N° ${entree.id} — ${todayStr()}`);

  // Bloc source
  doc.setFillColor(...GREEN);
  doc.rect(10, y, W-20, 6, "F");
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text(source.type==="donateur"?"INFORMATIONS DONATEUR":"INFORMATIONS FOURNISSEUR", 14, y+4.5);
  doc.setTextColor(...BLACK);
  y += 8;

  doc.setFillColor(...LIGHT);
  doc.rect(10, y, W-20, 20, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(13);
  doc.text(source.nom, 14, y+8);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  if (source.adresse) doc.text(source.adresse, 14, y+14);
  if (source.ville)   doc.text(source.ville, 14, y+18.5);
  if (source.tel)     doc.text("Tél : "+source.tel, 110, y+14);
  doc.setTextColor(...BLACK);
  y += 26;

  // Bloc attestation
  doc.setFontSize(10); doc.setFont("helvetica","normal");
  const attestation = source.type==="donateur"
    ? `L'Association Secours Évangélique de France (SEF) certifie avoir reçu de la part de ${source.nom} le ${fmtLg(entree.horodatage)}, les dons en nature listés ci-dessous, dans le cadre de son action d'aide alimentaire et sociale.`
    : `L'Association Secours Évangélique de France (SEF) certifie avoir réceptionné de la part de ${source.nom} le ${fmtLg(entree.horodatage)}, les produits listés ci-dessous.`;

  const lines = doc.splitTextToSize(attestation, W-24);
  doc.text(lines, 12, y);
  y += lines.length * 5 + 8;

  // Tableau
  const totalQte = produits.reduce((s,p)=>s+(+p.qte||0),0);
  autoTable(doc, {
    startY: y,
    margin: {left:10, right:10},
    head: [["Désignation","Quantité","DLC"]],
    body: produits.map(p => [p.label, p.qte, fmt(p.dlc)||"—"]),
    foot: [["TOTAL",totalQte,""]],
    headStyles: { fillColor:GREEN2, textColor:WHITE, fontSize:9, fontStyle:"bold" },
    footStyles: { fillColor:LIGHT, textColor:BLACK, fontStyle:"bold" },
    bodyStyles: { fontSize:9 },
    columnStyles: {
      1:{cellWidth:28,halign:"center"},
      2:{cellWidth:28,halign:"center"},
    },
    alternateRowStyles: { fillColor:[250,248,244] },
  });

  y = doc.lastAutoTable.finalY + 14;

  // Mention légale (donateur uniquement)
  if (source.type==="donateur") {
    doc.setFillColor(232,242,236);
    doc.rect(10, y, W-20, 14, "F");
    doc.setFontSize(8); doc.setFont("helvetica","italic"); doc.setTextColor(...GREEN);
    const mention = "Ce reçu peut être utilisé à titre de justificatif de don. L'association SEF est habilitée à recevoir des dons. Conformément à la réglementation en vigueur, les dons en nature ne donnent pas lieu à réduction fiscale, sauf évaluation agréée.";
    const mLines  = doc.splitTextToSize(mention, W-28);
    doc.text(mLines, 14, y+5);
    doc.setTextColor(...BLACK); doc.setFont("helvetica","normal");
    y += 18;
  }

  // Signatures
  if (y > H-55) { doc.addPage(); y = 20; }
  doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.text("Signatures", 10, y); y+=4;
  signatureBox(doc, "Pour SEF — Responsable", 10, y);
  signatureBox(doc, source.type==="donateur"?"Donateur":"Fournisseur", 100, y);

  pied(doc, 1, 1, W, H);
  doc.save(`Recu_${source.type}_${source.nom.replace(/ /g,"_")}_${entree.id}.pdf`);
}

// ══════════════════════════════════════════════════════
//  3. PROCÈS-VERBAL DE DISTRIBUTION
// ══════════════════════════════════════════════════════
/**
 * @param {Object} sortie       { id, horodatage, benevole, commentaires }
 * @param {Object} beneficiaire { nom, prenom, ville, nbPersonnes, nbEnfants, restrictions, bebes }
 * @param {Array}  produits     [{label, qte}]
 */
export function pvDistribution(sortie, beneficiaire, produits) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, H = 297;

  let y = entete(doc, "Procès-Verbal de Distribution", `Réf. ${sortie.id}`);

  // Infos distribution
  doc.setFillColor(...LIGHT);
  doc.rect(10, y, W-20, 16, "F");
  bloc(doc, "Date de distribution", fmtLg(sortie.horodatage), 14, y+7);
  bloc(doc, "Bénévole responsable", sortie.benevole||"—", 110, y+7);
  y += 21;

  // Bénéficiaire
  doc.setFillColor(...GREEN);
  doc.rect(10, y, W-20, 6, "F");
  doc.setTextColor(...WHITE); doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text("BÉNÉFICIAIRE", 14, y+4.5);
  doc.setTextColor(...BLACK); y += 8;

  doc.setFillColor(245,250,247);
  doc.rect(10, y, W-20, 22, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text(`${beneficiaire.prenom} ${beneficiaire.nom}`, 14, y+9);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
  doc.text(`Ville : ${beneficiaire.ville||"—"}`, 14, y+15);
  doc.text(`Foyer : ${beneficiaire.nbPersonnes||1} pers. dont ${beneficiaire.nbEnfants||0} enfant(s)`, 80, y+15);
  if (beneficiaire.bebes==="Oui") { doc.setTextColor(...AMBER); doc.text("🍼 Bébé(s) dans le foyer", 14, y+20); doc.setTextColor(...GRAY); }
  if (beneficiaire.restrictions) { doc.setTextColor(192,57,43); doc.text("⚠ Restrictions : "+beneficiaire.restrictions, 80, y+20); }
  doc.setTextColor(...BLACK); y += 28;

  // Tableau produits
  doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN);
  doc.text("Composition du colis", 10, y); doc.setTextColor(...BLACK); y+=4;

  const totalQte = produits.reduce((s,p)=>s+(+p.qte||0),0);
  autoTable(doc, {
    startY: y,
    margin: {left:10, right:10},
    head: [["#","Article distribué","Quantité","Observations"]],
    body: produits.map((p,i)=>[i+1, p.label, p.qte, ""]),
    foot: [["","TOTAL",totalQte,""]],
    headStyles: { fillColor:GREEN2, textColor:WHITE, fontSize:9, fontStyle:"bold" },
    footStyles: { fillColor:LIGHT, textColor:BLACK, fontStyle:"bold" },
    bodyStyles: { fontSize:9 },
    columnStyles: {
      0:{cellWidth:8,halign:"center"},
      2:{cellWidth:24,halign:"center"},
    },
    alternateRowStyles: { fillColor:[250,248,244] },
  });

  y = doc.lastAutoTable.finalY + 8;

  if (sortie.commentaires) {
    doc.setFillColor(255,248,220);
    doc.rect(10, y, W-20, 10, "F");
    doc.setFontSize(8); doc.setFont("helvetica","italic"); doc.setTextColor(...GRAY);
    doc.text("Commentaires : "+sortie.commentaires, 14, y+6);
    doc.setTextColor(...BLACK); y += 14;
  }

  // Résumé colis
  doc.setFillColor(...GREEN);
  doc.rect(10, y, W-20, 10, "F");
  doc.setTextColor(...WHITE); doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text(`Colis : ${produits.length} référence(s) — ${totalQte} article(s) distribués`, W/2, y+6.5, {align:"center"});
  doc.setTextColor(...BLACK); y += 18;

  // Attestation bénéficiaire
  const attestation = `Je soussigné(e) ${beneficiaire.prenom} ${beneficiaire.nom} atteste avoir reçu le ${todayStr()} le colis alimentaire détaillé ci-dessus, remis par l'association SEF Les Mureaux.`;
  const aLines = doc.splitTextToSize(attestation, W-24);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text(aLines, 12, y); y += aLines.length*5+10;

  if (y > H-55) { doc.addPage(); y = 20; }
  signatureBox(doc, "Bénévole distributeur", 10, y);
  signatureBox(doc, "Signature du bénéficiaire", 100, y);

  pied(doc, 1, 1, W, H);
  doc.save(`PV_Distribution_${beneficiaire.nom}_${sortie.id}.pdf`);
}

// ══════════════════════════════════════════════════════
//  4. CARTE BÉNÉFICIAIRE (format A6 paysage)
// ══════════════════════════════════════════════════════
/**
 * @param {Object} ben { nom, prenom, ville, nbPersonnes, nbEnfants, restrictions, bebes, horodateur }
 */
export function carteBeneficiaire(ben) {
  // A6 paysage: 148 x 105mm
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a6" });
  const W = 148, H = 105;

  // Fond
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, H, "F");

  // Zone blanche principale
  doc.setFillColor(...WHITE);
  doc.roundedRect(4, 4, W-8, H-8, 4, 4, "F");

  // Bandeau titre
  doc.setFillColor(...GREEN);
  doc.rect(4, 4, W-8, 16, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.text("✝ SECOURS ÉVANGÉLIQUE DE FRANCE", W/2, 11, {align:"center"});
  doc.setFontSize(7); doc.setFont("helvetica","normal");
  doc.text("CARTE BÉNÉFICIAIRE — Les Mureaux", W/2, 17, {align:"center"});

  // Avatar initiales
  doc.setFillColor(...LIGHT);
  doc.circle(22, 38, 11, "F");
  doc.setFillColor(...GREEN2);
  doc.circle(22, 38, 10, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text((ben.prenom?.[0]||"")+(ben.nom?.[0]||""), 22, 42, {align:"center"});
  doc.setTextColor(...BLACK);

  // Nom
  doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text(`${ben.prenom} ${ben.nom}`, 38, 31);
  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY);
  doc.text(`📍 ${ben.ville||"—"}`, 38, 38);
  doc.setTextColor(...BLACK);

  // Badges infos
  const badges = [
    `👨‍👩‍👧 ${ben.nbPersonnes||1} pers.`,
    ben.nbEnfants>0 ? `${ben.nbEnfants} enfant(s)` : null,
    ben.bebes==="Oui" ? "🍼 Bébé" : null,
  ].filter(Boolean);

  let bx = 10;
  badges.forEach(b => {
    doc.setFillColor(...LIGHT);
    doc.roundedRect(bx, 47, b.length*2.2+6, 7, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica","normal");
    doc.text(b, bx+3, 52.5);
    bx += b.length*2.2+9;
  });

  // Restrictions
  if (ben.restrictions) {
    doc.setFillColor(253,236,234);
    doc.roundedRect(10, 57, W-18, 8, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(192,57,43);
    doc.text("⚠ Restrictions : "+ben.restrictions, 13, 62.5);
    doc.setTextColor(...BLACK);
  }

  // Séparateur
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.5);
  doc.line(10, 69, W-10, 69);

  // ID & date
  const id = ben.horodateur ? new Date(ben.horodateur).getFullYear()+"/"+(new Date(ben.horodateur).getMonth()+1).toString().padStart(2,"0") : todayStr().slice(6);
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY);
  doc.text("Enregistré : "+fmt(ben.horodateur), 10, 74);

  // Barcode-like (visuel décoratif)
  for (let i=0; i<20; i++) {
    const h = 2+Math.random()*7;
    const barColor = i%3===0 ? GREEN : i%3===1 ? GREEN2 : LIGHT;
    doc.setFillColor(...barColor);
    doc.rect(W-34+(i*1.5), 70, 1, h, "F");
  }

  // Footer
  doc.setFillColor(...GREEN);
  doc.rect(4, H-12, W-8, 8, "F");
  doc.setTextColor(...WHITE); doc.setFontSize(7); doc.setFont("helvetica","normal");
  doc.text("Association loi 1901 • Aide alimentaire et sociale", W/2, H-6, {align:"center"});

  doc.save(`Carte_Beneficiaire_${ben.nom}_${ben.prenom}.pdf`);
}

// ══════════════════════════════════════════════════════
//  5. DATAMART MENSUEL
// ══════════════════════════════════════════════════════
/**
 * @param {Object} data {
 *   mois, annee,
 *   produits, categories, mouvements, entrees, sorties, beneficiaires
 * }
 */
export function datamartMensuel(data) {
  const { mois, annee, produits, categories, mouvements, entrees, sorties, beneficiaires } = data;
  const doc  = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, H = 297;

  const nomMois = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"][mois-1]||"";

  // Filtrer sur le mois
  const filterMois = arr => (arr||[]).filter(x => {
    const d = new Date(x.horodatage||x.date||"");
    return d.getMonth()+1===mois && d.getFullYear()===annee;
  });

  const entreesMois   = filterMois(entrees);
  const sortiesMois   = filterMois(sorties);
  const mvtsMois      = filterMois(mouvements);
  const mvtsEntree    = mvtsMois.filter(m=>m.type!=="Sortie");
  const mvtsSortie    = mvtsMois.filter(m=>m.type==="Sortie");
  const totalEntrees  = mvtsEntree.reduce((s,m)=>s+(+m.qte||0),0);
  const totalSorties  = mvtsSortie.reduce((s,m)=>s+(+m.qte||0),0);
  const benServies    = new Set(sortiesMois.map(s=>s.beneficiaireId)).size;
  const stockTotal    = produits.reduce((s,p)=>s+(+p.stock||0),0);
  const alertes       = produits.filter(p=>p.actif&&p.stock<=p.seuil).length;

  // ── PAGE 1 — SYNTHÈSE ──
  let y = entete(doc, `Rapport d'activité — ${nomMois} ${annee}`, "Datamart mensuel SEF Les Mureaux");

  // KPIs en grid
  const kpis = [
    {label:"Entrées (articles)", value:totalEntrees, sub:`${entreesMois.length} opérations`, color:GREEN},
    {label:"Sorties (articles)", value:totalSorties, sub:`${sortiesMois.length} distributions`, color:AMBER},
    {label:"Bénéficiaires servis", value:benServies, sub:"familles", color:[26,107,154]},
    {label:"Stock total actuel", value:stockTotal, sub:`${alertes} alertes`, color:alertes>0?[192,57,43]:GREEN2},
  ];

  kpis.forEach((k,i) => {
    const kx = 10 + (i%2)*100, ky = y + Math.floor(i/2)*26;
    doc.setFillColor(...k.color);
    doc.roundedRect(kx, ky, 92, 22, 3, 3, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(22); doc.setFont("helvetica","bold");
    doc.text(String(k.value), kx+8, ky+14);
    doc.setFontSize(9); doc.setFont("helvetica","bold");
    doc.text(k.label, kx+8, ky+7);
    doc.setFontSize(7); doc.setFont("helvetica","normal");
    doc.text(k.sub, kx+8, ky+19);
    doc.setTextColor(...BLACK);
  });
  y += 56;

  // ── Graphique barres — Stock par catégorie ──
  const catStocks = categories.filter(c=>c.actif).map(cat => ({
    label: cat.label,
    value: produits.filter(p=>p.cat===cat.ref||p.cat===cat.label).reduce((s,p)=>s+(+p.stock||0),0),
  })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value).slice(0,8);

  if (catStocks.length > 0) {
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN);
    doc.text("Stock actuel par catégorie", 10, y); y+=2;
    doc.setTextColor(...BLACK);

    const maxVal = Math.max(...catStocks.map(c=>c.value),1);
    const barW = 170, barH = 40, barX = 10, barY = y+2;

    // Fond
    doc.setFillColor(248,246,242);
    doc.rect(barX, barY, barW, barH, "F");

    const colW = barW/catStocks.length;
    catStocks.forEach((cat,i) => {
      const h   = (cat.value/maxVal) * (barH-8);
      const bx  = barX + i*colW + colW*0.15;
      const bw  = colW*0.7;
      const by  = barY + barH - 6 - h;
      const col = [28+i*18, 74+i*8, 53+i*5].map(v=>Math.min(255,v));
      doc.setFillColor(...col);
      doc.rect(bx, by, bw, h, "F");
      doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.setTextColor(...GREEN);
      doc.text(String(cat.value), bx+bw/2, by-1, {align:"center"});
      doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY);
      const lbl = doc.splitTextToSize(cat.label, colW-2);
      doc.text(lbl[0], bx+bw/2, barY+barH-2, {align:"center"});
    });
    doc.setTextColor(...BLACK);
    y += barH+10;
  }

  // ── Tableau top produits sortis ──
  const prodSorties = {};
  mvtsSortie.forEach(m=>{ prodSorties[m.produit]=(prodSorties[m.produit]||0)+(+m.qte||0); });
  const topProd = Object.entries(prodSorties).sort((a,b)=>b[1]-a[1]).slice(0,10);

  if (topProd.length>0) {
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN);
    doc.text("Top produits distribués", 10, y); y+=3;
    doc.setTextColor(...BLACK);

    autoTable(doc, {
      startY: y,
      margin: {left:10, right:10},
      head: [["Produit","Qté sortie","% du total"]],
      body: topProd.map(([label,qte])=>[label,qte,totalSorties>0?`${Math.round(qte/totalSorties*100)}%`:"—"]),
      headStyles: { fillColor:GREEN2, textColor:WHITE, fontSize:9 },
      bodyStyles: { fontSize:9 },
      columnStyles: {
        1:{cellWidth:28,halign:"center"},
        2:{cellWidth:24,halign:"center"},
      },
      alternateRowStyles: { fillColor:[250,248,244] },
    });
    y = doc.lastAutoTable.finalY+10;
  }

  // ── PAGE 2 — DÉTAIL OPÉRATIONS ──
  doc.addPage();
  y = entete(doc, `Rapport d'activité — ${nomMois} ${annee}`, "Détail des opérations");

  // Tableau entrées du mois
  if (entreesMois.length>0) {
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN);
    doc.text(`Entrées du mois (${entreesMois.length})`, 10, y); y+=3;
    doc.setTextColor(...BLACK);
    autoTable(doc, {
      startY: y,
      margin:{left:10,right:10},
      head:[["Date","N° Mouvement","Type","Source"]],
      body: entreesMois.map(e=>[fmt(e.horodatage),e.id,e.type,e.fournisseur||"—"]),
      headStyles:{fillColor:GREEN2,textColor:WHITE,fontSize:8},
      bodyStyles:{fontSize:8},
      alternateRowStyles:{fillColor:[250,248,244]},
    });
    y = doc.lastAutoTable.finalY+8;
  }

  // Tableau distributions du mois
  if (sortiesMois.length>0) {
    if (y > H-60) { doc.addPage(); y=20; }
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...AMBER);
    doc.text(`Distributions du mois (${sortiesMois.length})`, 10, y); y+=3;
    doc.setTextColor(...BLACK);
    autoTable(doc, {
      startY: y,
      margin:{left:10,right:10},
      head:[["Date","N° Mouvement","Bénéficiaire","Commentaires"]],
      body: sortiesMois.map(s=>[fmt(s.horodatage),s.id,s.beneficiaireId||"—",s.commentaires||"—"]),
      headStyles:{fillColor:[180,100,5],textColor:WHITE,fontSize:8},
      bodyStyles:{fontSize:8},
      alternateRowStyles:{fillColor:[255,248,235]},
    });
    y = doc.lastAutoTable.finalY+8;
  }

  // Produits en alerte
  const alertProd = produits.filter(p=>p.actif&&p.stock<=p.seuil);
  if (alertProd.length>0) {
    if (y > H-50) { doc.addPage(); y=20; }
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(192,57,43);
    doc.text(`Alertes de stock (${alertProd.length})`, 10, y); y+=3;
    doc.setTextColor(...BLACK);
    autoTable(doc, {
      startY: y,
      margin:{left:10,right:10},
      head:[["Produit","Catégorie","Stock actuel","Seuil alerte","Écart"]],
      body: alertProd.map(p=>[p.label,p.cat,p.stock,p.seuil,p.stock-p.seuil]),
      headStyles:{fillColor:[192,57,43],textColor:WHITE,fontSize:8},
      bodyStyles:{fontSize:8},
      columnStyles:{
        2:{halign:"center"},3:{halign:"center"},
        4:{halign:"center", textColor:[192,57,43], fontStyle:"bold"},
      },
      alternateRowStyles:{fillColor:[253,236,234]},
    });
  }

  // Pied sur toutes les pages
  const nbPages = doc.internal.getNumberOfPages();
  for (let i=1; i<=nbPages; i++) {
    doc.setPage(i);
    pied(doc, i, nbPages, W, H);
  }

  doc.save(`Datamart_${nomMois}_${annee}.pdf`);
}

// ══════════════════════════════════════════════════════
//  6. LISTE DES PRODUITS EN STOCK (PDF)
// ══════════════════════════════════════════════════════
/**
 * @param {Array}  produits   Liste complète des produits (mappés)
 * @param {Array}  categories Liste des catégories (mappées)
 * @param {string} mode       "all" | "stock" | "alertes"
 */
export function listeStock(produits, categories, mode = "stock") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297;

  // ── Filtrage et tri ──
  const catLabel = ref =>
    categories.find(c => c.ref === ref || c.label === ref)?.label || ref || "—";

  let filtered = produits.filter(p => p.actif);
  if (mode === "stock")   filtered = filtered.filter(p => p.stock > 0);
  if (mode === "alertes") filtered = filtered.filter(p => p.stock <= p.seuil);
  filtered = [...filtered].sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const titres = {
    all:     "Liste Complète des Produits",
    stock:   "Produits en Stock",
    alertes: "Produits en Alerte de Stock",
  };
  const sous = `Édité le ${todayStr()} · ${filtered.length} référence(s) · ${filtered.reduce((s, p) => s + p.stock, 0)} unités`;

  let y = entete(doc, titres[mode] || "Produits", sous);

  // ── Bandeau couleur selon mode ──
  const bandeauColor = mode === "alertes" ? AMBER : GREEN2;
  const labelMode = mode === "alertes"
    ? "⚠  ARTICLES SOUS SEUIL D'ALERTE"
    : mode === "stock"
    ? "✓  ARTICLES DISPONIBLES EN STOCK"
    : "  INVENTAIRE COMPLET";

  doc.setFillColor(...bandeauColor);
  doc.rect(10, y, W - 20, 8, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(labelMode, 14, y + 5.5);
  doc.setTextColor(...BLACK);
  y += 12;

  // ── Tableau principal ──
  if (filtered.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...GRAY);
    doc.text("Aucun produit à afficher pour ce filtre.", W / 2, y + 20, { align: "center" });
    doc.setTextColor(...BLACK);
  } else {
    // Grouper par catégorie
    const groupes = {};
    filtered.forEach(p => {
      const cat = catLabel(p.cat);
      if (!groupes[cat]) groupes[cat] = [];
      groupes[cat].push(p);
    });

    const body = [];
    Object.entries(groupes).forEach(([cat, prods]) => {
      // Ligne de catégorie
      body.push([{ content: cat.toUpperCase(), colSpan: 5, styles: { fillColor: [235, 245, 240], fontStyle: "bold", fontSize: 8, textColor: GREEN } }]);
      prods.forEach((p, i) => {
        const bas = p.stock <= p.seuil;
        body.push([
          p.ref || "—",
          p.label,
          { content: p.stock, styles: { halign: "center", fontStyle: "bold", textColor: bas ? [192, 57, 43] : GREEN2 } },
          { content: p.seuil, styles: { halign: "center" } },
          { content: bas ? "⚠ Bas" : "✓ OK", styles: { halign: "center", textColor: bas ? [192, 57, 43] : GREEN2, fontStyle: "bold" } },
        ]);
      });
    });

    const totalQte = filtered.reduce((s, p) => s + (p.stock || 0), 0);
    const totalAlert = filtered.filter(p => p.stock <= p.seuil).length;

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [["Référence", "Libellé", "Stock", "Seuil", "Statut"]],
      body,
      foot: [["", `${filtered.length} référence(s)`, { content: totalQte, styles: { halign: "center", fontStyle: "bold" } }, "", `${totalAlert} alerte(s)`]],
      headStyles: { fillColor: GREEN, textColor: WHITE, fontSize: 8, fontStyle: "bold" },
      footStyles: { fillColor: LIGHT, textColor: BLACK, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "italic", textColor: GRAY },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
      },
      alternateRowStyles: { fillColor: [252, 251, 249] },
      didParseCell: (data) => {
        // Ne pas appliquer alternateRow sur les lignes de catégorie
        if (data.row.raw?.[0]?.colSpan === 5) {
          data.cell.styles.fillColor = [235, 245, 240];
        }
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Résumé bas de page ──
  if (y < H - 30) {
    doc.setFillColor(...GREEN);
    doc.rect(10, y, W - 20, 10, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const totalUnites = filtered.reduce((s, p) => s + p.stock, 0);
    doc.text(
      `${filtered.length} produit(s)  •  ${totalUnites} unité(s) en stock  •  ${filtered.filter(p => p.stock <= p.seuil).length} alerte(s)`,
      W / 2, y + 6.5, { align: "center" }
    );
    doc.setTextColor(...BLACK);
  }

  // ── Pied sur toutes les pages ──
  const nbPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i);
    pied(doc, i, nbPages, W, H);
  }

  const suffixes = { all: "Complet", stock: "En_Stock", alertes: "Alertes" };
  const dateStr  = new Date().toISOString().slice(0, 10);
  doc.save(`SEF_Produits_${suffixes[mode] || "Stock"}_${dateStr}.pdf`);
}
