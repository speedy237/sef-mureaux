import React, { useState, useEffect, useRef, useMemo } from "react";
import { pvEntree, recuSource, pvDistribution, carteBeneficiaire, datamartMensuel, listeStock } from "./pdfGenerator.js";
import {
  loadAll, addEntree, addDistribution,
  addProduit, addBeneficiaire, addDonateur,
  addPartenaire, addCategorie, addBenevole,
  updateProduit, updateCategorie, updateBeneficiaire,
  updateBenevole, updateDonateur, updatePartenaire,
  mapProduit, mapCategorie, mapBeneficiaire, mapBenevole,
  mapMouvement, mapEntree, mapSortie, mapDonateur, mapPartenaire,
} from "./api.js";

/* ══════════════════════════════════════
   STYLES GLOBAUX
══════════════════════════════════════ */
const Css = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    :root{
      --bg:#f5f0e8;--bg2:#ede8df;--card:#fff;
      --green:#1c4a35;--green2:#2d6b4f;--green-light:#e8f2ec;
      --amber:#d4870a;--amber-light:#fef3e0;
      --red:#c0392b;--red-light:#fdecea;
      --blue:#1a6b9a;--blue-light:#e8f4fb;
      --purple:#6b3fa0;--purple-light:#f3eeff;
      --text:#1a1a1a;--text2:#5a5a5a;--border:#e0d8cc;
      --shadow:0 2px 12px rgba(28,74,53,0.08);
      --shadow-lg:0 8px 32px rgba(28,74,53,0.15);
    }
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);}
    h1,h2,h3{font-family:'Lora',serif;}

    input, select, textarea { color: var(--text); }
    input::placeholder, textarea::placeholder { color: #9e9e9e; opacity: 1; }
    option { color: var(--text); background: var(--card); }
    ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--green2)!important;box-shadow:0 0 0 3px rgba(45,107,79,0.1);}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes pop{0%{transform:scale(.93)}60%{transform:scale(1.02)}100%{transform:scale(1)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .page{animation:fadeUp .2s ease both;}
    .hover-card{transition:all .15s ease;} .hover-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)!important;}
    .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:150;}
    .mobile-header{display:none;position:fixed;top:0;left:0;right:0;height:52px;background:var(--green);z-index:110;align-items:center;padding:0 14px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.2);}
    @media(max-width:768px){
      .sidebar{transform:translateX(-100%);transition:transform .25s ease;}
      .sidebar.open{transform:translateX(0)!important;}
      .sidebar-overlay.open{display:block;}
      .main-content{margin-left:0!important;max-width:100vw!important;padding:70px 14px 24px!important;}
      .top-bar-error{padding-left:16px!important;top:52px!important;}
      .mobile-header{display:flex;}
      .rg2{grid-template-columns:1fr!important;}
      .rg3{grid-template-columns:1fr!important;}
      .rg4{grid-template-columns:1fr 1fr!important;}
    }
    @media(max-width:420px){
      .rg4{grid-template-columns:1fr!important;}
    }
  `}</style>
);

/* ══════════════════════════════════════
   COMPTES LOCAUX (identifiants en dur)
══════════════════════════════════════ */
const BENEVOLES_LOCAL = [
  {matricule:"BEN-0001",nom:"Yiyueme",prenom:"Jordan",  email:"joryiyueme@gmail.com",  pseudo:"jordan",  mdp:"admin123",  pole:"Coordination",statut:"Membre",  actif:true},
  {matricule:"BEN-0002",nom:"Oulia",  prenom:"Fidele",  email:"fidele@sef.org",          pseudo:"fidele",  mdp:"fidele2026", pole:"Distribution", statut:"Membre",actif:true},
  {matricule:"BEN-0003",nom:"Oulia",  prenom:"Aurore",  email:"aurore@sef.org",          pseudo:"aurore",  mdp:"aurore@1979", pole:"Collecte",     statut:"Membre",actif:true},
  {matricule:"BEN-0004",nom:"Minsi",  prenom:"Estelle", email:"estelle@sef.org",         pseudo:"estelle", mdp:"estelle123",pole:"Coordination",statut:"Membre",  actif:true},
  {matricule:"BEN-0005",nom:"Santos", prenom:"Germaine",   email:"germaine@sef.org",     pseudo:"germaine",   mdp:"Germaine123",  pole:"Distribution", statut:"Membre",actif:true},
];

const today    = new Date();
const fmtDate  = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtHora  = () => new Date().toISOString();
const newId    = pfx => `${pfx}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const isMembre = u => u?.statut === "Membre";

/* ══════════════════════════════════════
   UI ATOMS
══════════════════════════════════════ */
const Badge = ({children, color="green"}) => {
  const C = {
    green:{bg:"var(--green-light)",c:"var(--green2)"},
    amber:{bg:"var(--amber-light)",c:"var(--amber)"},
    red:  {bg:"var(--red-light)",  c:"var(--red)"},
    blue: {bg:"var(--blue-light)", c:"var(--blue)"},
    purple:{bg:"var(--purple-light)",c:"var(--purple)"},
    gray: {bg:"#f0ede8",c:"#666"},
  };
  const s = C[color]||C.green;
  return <span style={{background:s.bg,color:s.c,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;
};

const Btn = ({children,onClick,variant="primary",disabled=false,full=false,sm=false,style:sx={}}) => {
  const V = {
    primary:  {bg:"var(--green)",c:"#fff"},
    secondary:{bg:"var(--bg2)",  c:"var(--text)"},
    amber:    {bg:"var(--amber)",c:"#fff"},
    danger:   {bg:"var(--red-light)",c:"var(--red)"},
    ghost:    {bg:"transparent",c:"var(--green)",border:"1.5px solid var(--green)"},
  };
  const v = V[variant]||V.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:sm?"7px 16px":"10px 22px",borderRadius:10,border:v.border||"none",
      cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",
      fontSize:sm?13:14,fontWeight:600,background:v.bg,color:v.c,
      opacity:disabled?.5:1,width:full?"100%":"auto",transition:"all .15s",...sx
    }}>{children}</button>
  );
};

const Field = ({label,children}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.4}}>{label}</label>}
    {children}
  </div>
);

const Input = ({label,...p}) => (
  <Field label={label}>
    <input {...p} style={{width:"100%",padding:"9px 13px",borderRadius:9,border:"1.5px solid var(--border)",
      background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--text)",...p.style}}/>
  </Field>
);

const Select = ({label,children,...p}) => (
  <Field label={label}>
    <select {...p} style={{width:"100%",padding:"9px 13px",borderRadius:9,border:"1.5px solid var(--border)",
      background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--text)",...p.style}}>
      {children}
    </select>
  </Field>
);

const Textarea = ({label,...p}) => (
  <Field label={label}>
    <textarea {...p} style={{width:"100%",padding:"9px 13px",borderRadius:9,border:"1.5px solid var(--border)",
      background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--text)",resize:"vertical",minHeight:72,...p.style}}/>
  </Field>
);

const Modal = ({open,onClose,title,children,width=540}) => {
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"var(--card)",borderRadius:20,padding:28,width:`min(${width}px,95vw)`,boxShadow:"var(--shadow-lg)",maxHeight:"90vh",overflowY:"auto",animation:"pop .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontSize:18,color:"var(--green)"}}>{title}</h2>
          <button onClick={onClose} style={{border:"none",background:"var(--bg2)",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:17,color:"var(--text2)"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Empty = ({icon,title,sub,action}) => (
  <div style={{textAlign:"center",padding:"56px 20px",background:"var(--card)",borderRadius:16,border:"1.5px dashed var(--border)"}}>
    <div style={{fontSize:48,marginBottom:12}}>{icon}</div>
    <h3 style={{fontSize:18,color:"var(--green)",marginBottom:6}}>{title}</h3>
    <p style={{fontSize:13,color:"var(--text2)",maxWidth:300,margin:"0 auto 16px",lineHeight:1.7}}>{sub}</p>
    {action}
  </div>
);

const Toast = ({msg,ok=true}) => msg ? (
  <div style={{background:ok?"var(--green-light)":"var(--red-light)",border:`1px solid ${ok?"#b8dfc8":"#f5b8b2"}`,
    borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,
    color:ok?"var(--green2)":"var(--red)",display:"flex",gap:8,animation:"fadeUp .2s ease"}}>
    {ok?"✅":"❌"} {msg}
  </div>
) : null;

const Spinner = () => (
  <div style={{display:"inline-block",width:18,height:18,border:"2.5px solid rgba(255,255,255,.3)",
    borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
);

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
const LoginPage = ({onLogin}) => {
  // ── Connexion ──
  const [pseudo,setPseudo]   = useState("");
  const [mdp,setMdp]         = useState("");
  const [show,setShow]       = useState(false);
  const [err,setErr]         = useState("");
  // ── Mot de passe oublié ──
  const [mode,setMode]       = useState("login");     // "login" | "forgot" | "reset" | "done"
  const [fPseudo,setFPseudo] = useState("");
  const [fEmail,setFEmail]   = useState("");
  const [fErr,setFErr]       = useState("");
  const [fUser,setFUser]     = useState(null);
  const [newMdp,setNewMdp]   = useState("");
  const [confMdp,setConfMdp] = useState("");
  const [showNew,setShowNew] = useState(false);
  const [saving,setSaving]   = useState(false);

  const doLogin = () => {
    const u = BENEVOLES_LOCAL.find(b => b.pseudo===pseudo && b.mdp===mdp && b.actif);
    if(u) onLogin(u);
    else setErr("Identifiant ou mot de passe incorrect.");
  };

  const doForgotCheck = () => {
    setFErr("");
    const u = BENEVOLES_LOCAL.find(b =>
      b.pseudo.toLowerCase()===fPseudo.toLowerCase() &&
      b.email.toLowerCase()===fEmail.toLowerCase() &&
      b.actif
    );
    if(u) { setFUser(u); setMode("reset"); }
    else setFErr("Aucun compte trouvé avec ce pseudonyme et cet email.");
  };

  const doReset = async () => {
    if(!newMdp || newMdp!==confMdp) return;
    setSaving(true);
    try {
      await updateBenevole({
        "Matricule":  fUser.matricule,
        "Nom":        fUser.nom,
        "Prénom":     fUser.prenom,
        "Email":      fUser.email,
        "Téléphone":  fUser.tel||"",
        "Pseudonyme": fUser.pseudo,
        "Pôle":       fUser.pole,
        "Statut":     fUser.statut,
        "MotDePasse": newMdp,
      });
      setMode("done");
    } catch(e){ setFErr("Erreur : "+e.message); }
    setSaving(false);
  };

  const reset = () => {
    setMode("login"); setFPseudo(""); setFEmail(""); setFErr("");
    setFUser(null); setNewMdp(""); setConfMdp(""); setErr("");
  };

  // ── Styles partagés ──
  const cardStyle = {background:"var(--card)",borderRadius:24,padding:"40px 36px",width:"min(400px,94vw)",boxShadow:"var(--shadow-lg)",animation:"pop .3s ease"};
  const inputStyle = {width:"100%",padding:"10px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--text)",boxSizing:"border-box"};
  const labelStyle = {fontSize:12,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.4};
  const linkStyle  = {background:"none",border:"none",color:"var(--green)",fontSize:12,fontWeight:600,cursor:"pointer",textDecoration:"underline",padding:0,fontFamily:"'DM Sans',sans-serif"};

  const Logo = () => (
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{width:60,height:60,borderRadius:16,background:"var(--green)",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>✝️</div>
      <h1 style={{fontSize:20,color:"var(--green)"}}>Secours Évangélique de France</h1>
      <p style={{color:"var(--text2)",fontSize:12,marginTop:3,fontStyle:"italic"}}>Antenne Des Mureaux</p>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 14px"}}>

      {/* ─── CONNEXION ─── */}
      {mode==="login"&&(
        <div style={cardStyle}>
          <Logo/>
          {err&&<div style={{background:"var(--red-light)",border:"1px solid #f5b8b2",borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:13,color:"var(--red)"}}>⚠️ {err}</div>}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Pseudonyme</label>
            <input value={pseudo} onChange={e=>{setPseudo(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()}
              placeholder="Votre pseudo" style={inputStyle}/>
          </div>
          <div style={{marginBottom:8}}>
            <label style={labelStyle}>Mot de passe</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={mdp} onChange={e=>{setMdp(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                placeholder="••••••••" style={{...inputStyle,paddingRight:42}}/>
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:16}}>{show?"🙈":"👁️"}</button>
            </div>
          </div>
          <div style={{textAlign:"right",marginBottom:20}}>
            <button style={linkStyle} onClick={()=>{setMode("forgot");setErr("");}}>🔑 Mot de passe oublié ?</button>
          </div>
          <Btn full onClick={doLogin} style={{fontSize:15,padding:"12px"}}>Se connecter →</Btn>
          <div style={{marginTop:16,background:"var(--bg)",borderRadius:10,padding:"10px 13px",fontSize:12,color:"var(--text2)",display:"flex",gap:8}}>
            <span>ℹ️</span><span>Utilisez votre pseudonyme et mot de passe fournis par votre coordinateur.</span>
          </div>
        </div>
      )}

      {/* ─── MOT DE PASSE OUBLIÉ — étape 1 : vérification identité ─── */}
      {mode==="forgot"&&(
        <div style={cardStyle}>
          <Logo/>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:16,color:"var(--green)",marginBottom:4}}>🔑 Mot de passe oublié</h2>
            <p style={{fontSize:12,color:"var(--text2)"}}>Entrez votre pseudonyme et votre adresse email pour réinitialiser votre mot de passe.</p>
          </div>
          {fErr&&<div style={{background:"var(--red-light)",border:"1px solid #f5b8b2",borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:13,color:"var(--red)"}}>⚠️ {fErr}</div>}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Pseudonyme</label>
            <input value={fPseudo} onChange={e=>{setFPseudo(e.target.value);setFErr("");}} onKeyDown={e=>e.key==="Enter"&&doForgotCheck()}
              placeholder="Votre pseudo" style={inputStyle}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={labelStyle}>Adresse email</label>
            <input type="email" value={fEmail} onChange={e=>{setFEmail(e.target.value);setFErr("");}} onKeyDown={e=>e.key==="Enter"&&doForgotCheck()}
              placeholder="email@exemple.fr" style={inputStyle}/>
          </div>
          <Btn full onClick={doForgotCheck} disabled={!fPseudo||!fEmail}>Vérifier mon identité →</Btn>
          <div style={{textAlign:"center",marginTop:16}}>
            <button style={linkStyle} onClick={reset}>← Retour à la connexion</button>
          </div>
        </div>
      )}

      {/* ─── MOT DE PASSE OUBLIÉ — étape 2 : nouveau mot de passe ─── */}
      {mode==="reset"&&fUser&&(
        <div style={cardStyle}>
          <Logo/>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:16,color:"var(--green)",marginBottom:4}}>🔒 Nouveau mot de passe</h2>
            <div style={{background:"var(--green-light)",borderRadius:9,padding:"9px 13px",fontSize:13,color:"var(--green2)",fontWeight:600}}>
              Compte : {fUser.prenom} {fUser.nom} ({fUser.pseudo})
            </div>
          </div>
          {fErr&&<div style={{background:"var(--red-light)",border:"1px solid #f5b8b2",borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:13,color:"var(--red)"}}>⚠️ {fErr}</div>}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <div style={{position:"relative"}}>
              <input type={showNew?"text":"password"} value={newMdp} onChange={e=>setNewMdp(e.target.value)}
                placeholder="Minimum 6 caractères" style={{...inputStyle,paddingRight:42}}/>
              <button onClick={()=>setShowNew(!showNew)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:16}}>{showNew?"🙈":"👁️"}</button>
            </div>
          </div>
          <div style={{marginBottom:6}}>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input type="password" value={confMdp} onChange={e=>setConfMdp(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doReset()} placeholder="Répéter le mot de passe" style={inputStyle}/>
          </div>
          {newMdp&&confMdp&&newMdp!==confMdp&&(
            <p style={{fontSize:11,color:"var(--red)",marginBottom:8}}>⚠️ Les mots de passe ne correspondent pas.</p>
          )}
          {newMdp.length>0&&newMdp.length<6&&(
            <p style={{fontSize:11,color:"var(--amber)",marginBottom:8}}>⚠️ Minimum 6 caractères requis.</p>
          )}
          <div style={{marginTop:16}}>
            <Btn full onClick={doReset} disabled={!newMdp||newMdp.length<6||newMdp!==confMdp||saving}>
              {saving?<Spinner/>:"💾 Enregistrer le nouveau mot de passe"}
            </Btn>
          </div>
          <div style={{textAlign:"center",marginTop:14}}>
            <button style={linkStyle} onClick={()=>setMode("forgot")}>← Retour</button>
          </div>
        </div>
      )}

      {/* ─── SUCCÈS ─── */}
      {mode==="done"&&(
        <div style={cardStyle}>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:64,marginBottom:12}}>✅</div>
            <h2 style={{fontSize:20,color:"var(--green)",marginBottom:8}}>Mot de passe modifié !</h2>
            <p style={{fontSize:13,color:"var(--text2)",marginBottom:6}}>Votre mot de passe a été mis à jour dans le classeur Google Sheets.</p>
            <div style={{background:"var(--amber-light)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--amber)",marginBottom:20,textAlign:"left"}}>
              ⚠️ <b>Important :</b> Pour que la connexion fonctionne immédiatement, un coordinateur doit aussi mettre à jour <b>BENEVOLES_LOCAL</b> dans App.jsx avec le nouveau mot de passe.
            </div>
            <Btn full onClick={reset}>← Retour à la connexion</Btn>
          </div>
        </div>
      )}

    </div>
  );
};

/* ══════════════════════════════════════
   SIDEBAR
══════════════════════════════════════ */
const NAV = [
  {id:"dashboard",     icon:"📊",label:"Tableau de bord"},
  {id:"produits",      icon:"📦",label:"Produits & Stock"},
  {id:"categories",    icon:"🏷️",label:"Catégories"},
  {id:"entrees",       icon:"⬆️",label:"Entrées"},
  {id:"distribution",  icon:"🎁",label:"Distribution"},
  {id:"beneficiaires", icon:"👥",label:"Bénéficiaires"},
  {id:"benevoles",     icon:"🤝",label:"Bénévoles"},
  {id:"donateurs",     icon:"💝",label:"Donateurs"},
  {id:"fournisseurs",  icon:"🏢",label:"Fournisseurs"},
  {id:"rapports",      icon:"📈",label:"Rapports & PDF"},
];

const Sidebar = ({page,setPage,user,onLogout,alertCount,open,onClose}) => {
  const nav = isMembre(user) ? NAV : NAV.filter(n=>!["benevoles","categories"].includes(n.id));
  return (
    <>
      <div className={"sidebar-overlay"+(open?" open":"")} onClick={onClose}/>
      <aside className={"sidebar"+(open?" open":"")} style={{width:240,background:"var(--green)",minHeight:"100vh",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,zIndex:200}}>
      <div style={{padding:"18px 16px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>✝️</div>
          <div>
            <div style={{fontFamily:"'Lora',serif",color:"#fff",fontWeight:700,fontSize:12,lineHeight:1.3}}>Secours Évangélique de France</div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:10}}>Antenne Des Mureaux</div>
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"9px 11px",display:"flex",gap:9,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:50,background:isMembre(user)?"rgba(255,215,0,.25)":"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0}}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.prenom} {user?.nom}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.55)"}}>{isMembre(user)?"👑":"🤝"} {user?.statut} · {user?.pole}</div>
          </div>
        </div>
      </div>
      <nav style={{padding:"10px 8px",flex:1,overflowY:"auto"}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{
            width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 11px",
            borderRadius:9,border:"none",cursor:"pointer",marginBottom:2,
            background:page===n.id?"rgba(255,255,255,.17)":"transparent",
            color:page===n.id?"#fff":"rgba(255,255,255,.6)",
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:page===n.id?600:400,
            textAlign:"left",transition:"all .12s",
          }}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label}</span>
            {n.id==="produits"&&alertCount>0&&(
              <span style={{background:"var(--amber)",color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{alertCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div style={{padding:"10px 8px",borderTop:"1px solid rgba(255,255,255,.1)"}}>
        <button onClick={onLogout} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 11px",
          borderRadius:9,border:"none",cursor:"pointer",background:"rgba(255,255,255,.07)",
          color:"rgba(255,255,255,.65)",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500}}>
          🚪 Se déconnecter
        </button>
      </div>
    </aside>
    </>
  );
};

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
const Dashboard = ({produits,categories,beneficiaires,entrees,sorties,mouvements,user,setPage}) => {
  const alertes = produits.filter(p=>p.actif&&p.stock<=p.seuil);
  const totalStock = produits.reduce((s,p)=>s+p.stock,0);
  const recentMvts = [...mouvements].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);

  return (
    <div className="page">
      <div style={{marginBottom:22}}>
        <h1 style={{fontSize:26,color:"var(--green)",marginBottom:2}}>Bonjour, {user?.prenom} 👋</h1>
        <p style={{color:"var(--text2)",fontSize:13}}>{today.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
      </div>

      {/* KPIs */}
      <div className="rg4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"📦",label:"Références actives",v:produits.filter(p=>p.actif).length,c:"green"},
          {icon:"⚠️",label:"Alertes stock",     v:alertes.length,c:"amber"},
          {icon:"👥",label:"Bénéficiaires",      v:beneficiaires.length,c:"purple"},
          {icon:"↕️",label:"Mouvements",         v:mouvements.length,c:"blue"},
        ].map(k=>(
          <div key={k.label} style={{background:"var(--card)",borderRadius:14,padding:"14px 16px",boxShadow:"var(--shadow)",border:"1px solid var(--border)",display:"flex",gap:11,alignItems:"center"}}>
            <div style={{width:42,height:42,borderRadius:11,background:`var(--${k.c}-light)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:24,fontWeight:700,fontFamily:"'Lora',serif",color:`var(--${k.c})`}}>{k.v}</div>
              <div style={{fontSize:11,color:"var(--text2)",fontWeight:500}}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Raccourcis */}
      <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <button onClick={()=>setPage("distribution")} className="hover-card" style={{background:"var(--green)",color:"#fff",border:"none",borderRadius:14,padding:"16px 20px",cursor:"pointer",textAlign:"left",boxShadow:"var(--shadow)"}}>
          <div style={{fontSize:26,marginBottom:6}}>🎁</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:700,marginBottom:3}}>Nouvelle distribution</div>
          <div style={{fontSize:12,opacity:.8}}>Préparer un colis bénéficiaire</div>
        </button>
        <button onClick={()=>setPage("entrees")} className="hover-card" style={{background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:14,padding:"16px 20px",cursor:"pointer",textAlign:"left",boxShadow:"var(--shadow)"}}>
          <div style={{fontSize:26,marginBottom:6}}>⬆️</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:700,color:"var(--green)",marginBottom:3}}>Entrée de stock</div>
          <div style={{fontSize:12,color:"var(--text2)"}}>Collecte, caddie solidaire, dons</div>
        </button>
      </div>

      <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Stock par catégorie */}
        <div style={{background:"var(--card)",borderRadius:14,padding:20,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
          <h3 style={{fontSize:14,color:"var(--green)",marginBottom:14}}>Stock par catégorie</h3>
          {categories.filter(c=>c.actif).map((cat,i)=>{
            const t = produits.filter(p=>p.cat===cat.ref||p.cat===cat.label).reduce((s,p)=>s+p.stock,0);
            const mx= Math.max(1,...categories.map(c=>produits.filter(p=>p.cat===c.ref||p.cat===c.label).reduce((s,p)=>s+p.stock,0)));
            return (
              <div key={cat.ref||i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:500}}>{cat.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--green)"}}>{t}</span>
                </div>
                <div style={{height:6,background:"var(--bg2)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${(t/mx)*100}%`,height:"100%",background:`hsl(${148-i*18},52%,${42+i*3}%)`,borderRadius:3,transition:"width .5s"}}/>
                </div>
              </div>
            );
          })}
          {categories.length===0&&<p style={{fontSize:12,color:"var(--text2)"}}>Aucune catégorie chargée</p>}
        </div>

        {/* Derniers mouvements */}
        <div style={{background:"var(--card)",borderRadius:14,padding:20,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
          <h3 style={{fontSize:14,color:"var(--green)",marginBottom:14}}>Derniers mouvements</h3>
          {recentMvts.length===0&&<p style={{fontSize:12,color:"var(--text2)"}}>Aucun mouvement enregistré</p>}
          {recentMvts.map((m,i)=>(
            <div key={`${m.id||i}-${m.produit}-${i}`} style={{display:"flex",gap:9,alignItems:"center",padding:"8px 9px",background:"var(--bg)",borderRadius:8,marginBottom:6}}>
              <div style={{width:28,height:28,borderRadius:7,flexShrink:0,fontSize:12,
                background:m.type==="Sortie"?"var(--amber-light)":"var(--green-light)",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {m.type==="Sortie"?"⬇":"⬆"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.produit}</div>
                <div style={{fontSize:10,color:"var(--text2)"}}>{m.type} · {fmtDate(m.date)}</div>
              </div>
              <Badge color={m.type==="Sortie"?"amber":"green"}>{m.type==="Sortie"?"-":"+"}{m.qte}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes */}
      {alertes.length>0&&(
        <div style={{marginTop:16,background:"var(--amber-light)",borderRadius:12,padding:16,border:"1px solid #f5d499"}}>
          <h4 style={{fontSize:13,color:"var(--amber)",marginBottom:10}}>⚠️ Stock sous le seuil d'alerte</h4>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {alertes.map((p,i)=>(
              <span key={p.ref||i} style={{background:"#fff",border:"1px solid #f5d499",borderRadius:7,padding:"4px 11px",fontSize:12}}>
                📉 <b>{p.label}</b> — {p.stock}/{p.seuil}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


/* ── Utilitaire export CSV ── */
const dlCSV = (rows, filename) => {
  const header = Object.keys(rows[0]);
  const lines  = [header, ...rows.map(r => header.map(k => String(r[k]??'').replace(/,/g,'') ))];
  const blob   = new Blob([lines.map(l=>l.join(',')).join('\n')], {type:'text/csv;charset=utf-8;'});
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

/* ══════════════════════════════════════
   PRODUITS
══════════════════════════════════════ */
const ProduitsPage = ({produits,setProduits,categories,user}) => {
  const [search,setSearch]       = useState("");
  const [filtreCat,setFiltreCat] = useState("");
  const [alerteOnly,setAlerteOnly] = useState(false);
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [form,setForm]           = useState({label:"",cat:"",nature:"",seuil:5,actif:true});
  const [editForm,setEditForm]   = useState(null);

  const filtered = produits
    .filter(p=>{
      if(!p.actif) return false;
      if(alerteOnly&&p.stock>p.seuil) return false;
      if(filtreCat&&p.cat!==filtreCat) return false;
      if(search&&!p.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a,b)=>a.label.localeCompare(b.label,'fr'));

  const catLabel = ref => categories.find(c=>c.ref===ref||c.label===ref)?.label||ref;
  const showT = (msg,ok=true) => { setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const save = async () => {
    setSaving(true);
    try {
      const ref = newId("PRD");
      await addProduit({"Référence":ref,"Libellé":form.label,"Categorie":form.cat,"Nature":form.nature,"Quantité_stock":0,"Seuil_alerte":form.seuil,"Actif":"TRUE"});
      setProduits(prev=>[...prev,{ref,label:form.label,cat:form.cat,nature:form.nature,stock:0,seuil:form.seuil,actif:true}]);
      showT("Produit ajouté !"); setModal(false); setForm({label:"",cat:"",nature:"",seuil:5,actif:true});
    } catch(e) { showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  const openEdit = p => { setEditForm({ref:p.ref,label:p.label,cat:p.cat,nature:p.nature||"",seuil:p.seuil,stock:p.stock}); setEditModal(true); };

  const saveEdit = async () => {
    if(!editForm) return;
    setEditSaving(true);
    try {
      await updateProduit({"Référence":editForm.ref,"Libellé":editForm.label,"Categorie":editForm.cat,"Nature":editForm.nature,"Seuil_alerte":editForm.seuil,"Quantité_stock":editForm.stock});
      setProduits(prev=>prev.map(p=>p.ref===editForm.ref?{...p,label:editForm.label,cat:editForm.cat,nature:editForm.nature,seuil:editForm.seuil,stock:editForm.stock}:p));
      showT("Produit modifié !"); setEditModal(false); setEditForm(null);
    } catch(e){ showT("Erreur : "+e.message,false); }
    setEditSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontSize:26,color:"var(--green)"}}>Produits & Stock</h1>
          <p style={{color:"var(--text2)",fontSize:13}}>{filtered.length} produits · <b style={{color:"var(--green)"}}>{produits.filter(p=>p.actif).reduce((s,p)=>s+p.stock,0)}</b> unités en stock</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {/* Téléchargements */}
          {/* ── Boutons téléchargement ── */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {/* PDF */}
            <button onClick={()=>listeStock(produits,categories,"all")}
              style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,color:"var(--green)",fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              📄 PDF complet
            </button>
            <button onClick={()=>listeStock(produits,categories,"stock")}
              style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,color:"var(--green)",fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              📄 PDF en stock
            </button>
            <button onClick={()=>listeStock(produits,categories,"alertes")}
              style={{border:"1.5px solid var(--amber)",background:"var(--amber-light)",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,color:"var(--amber)",fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              📄 ⚠️ PDF alertes
            </button>
            {/* CSV */}
            <button onClick={()=>dlCSV(produits.filter(p=>p.actif).sort((a,b)=>a.label.localeCompare(b.label,'fr')).map(p=>({Référence:p.ref,Libellé:p.label,Catégorie:catLabel(p.cat),Stock:p.stock,Seuil:p.seuil})),'produits_stock.csv')}
              style={{border:"1.5px solid var(--border)",background:"var(--card)",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,color:"var(--text2)",fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              ⬇️ CSV complet
            </button>
            <button onClick={()=>dlCSV(produits.filter(p=>p.actif&&p.stock<=p.seuil).sort((a,b)=>a.label.localeCompare(b.label,'fr')).map(p=>({Référence:p.ref,Libellé:p.label,Catégorie:catLabel(p.cat),Stock:p.stock,Seuil:p.seuil})),'produits_alertes.csv')}
              style={{border:"1.5px solid var(--border)",background:"var(--card)",borderRadius:8,padding:"6px 11px",cursor:"pointer",fontSize:11,color:"var(--text2)",fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              ⬇️ CSV alertes
            </button>
          </div>
          {isMembre(user)&&<Btn onClick={()=>setModal(true)}>+ Nouveau produit</Btn>}
        </div>
      </div>

      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}

      <div style={{display:"flex",gap:9,marginBottom:16,flexWrap:"wrap"}}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:160,padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}/>
        <select value={filtreCat} onChange={e=>setFiltreCat(e.target.value)}
          style={{padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}>
          <option value="">Toutes catégories</option>
          {categories.map((c,i)=><option key={c.ref||i} value={c.ref||c.label}>{c.label}</option>)}
        </select>
        <button onClick={()=>setAlerteOnly(!alerteOnly)} style={{padding:"8px 14px",borderRadius:9,border:"1.5px solid",cursor:"pointer",
          borderColor:alerteOnly?"var(--amber)":"var(--border)",background:alerteOnly?"var(--amber-light)":"var(--card)",
          color:alerteOnly?"var(--amber)":"var(--text2)",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600}}>
          ⚠️ Alertes
        </button>
      </div>

      {filtered.length===0
        ? <Empty icon="📦" title="Aucun produit" sub={isMembre(user)?"Ajoutez votre premier produit.":"Aucun produit à afficher."}
            action={isMembre(user)&&<Btn onClick={()=>setModal(true)}>+ Nouveau produit</Btn>}/>
        : (
          <div style={{background:"var(--card)",borderRadius:14,boxShadow:"var(--shadow)",border:"1px solid var(--border)",overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Sans',sans-serif",minWidth:620}}>
              <thead>
                <tr style={{background:"var(--bg2)"}}>
                  {[..."Référence,Libellé,Catégorie,Stock,Seuil,DLC,Statut".split(","), ...(isMembre(user)?["Actions"]:[])].map(h=>(
                    <th key={h} style={{padding:"10px 13px",textAlign:h==="Actions"?"center":"left",fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p,i)=>{
                  const bas = p.stock<=p.seuil;
                  return (
                    <tr key={p.ref||i} style={{borderTop:"1px solid var(--border)",background:i%2?"var(--bg)":"var(--card)"}}>
                      <td style={{padding:"11px 13px",fontSize:11,fontFamily:"monospace",color:"var(--text2)"}}>{p.ref}</td>
                      <td style={{padding:"11px 13px",fontWeight:600,fontSize:14}}>{p.label}</td>
                      <td style={{padding:"11px 13px"}}><Badge color="blue">{catLabel(p.cat)}</Badge></td>
                      <td style={{padding:"11px 13px"}}>
                        <span style={{fontWeight:700,fontSize:16,color:bas?"var(--red)":"var(--green)"}}>{p.stock}</span>
                      </td>
                      <td style={{padding:"11px 13px",fontSize:13,color:"var(--text2)"}}>{p.seuil}</td>
                      <td style={{padding:"11px 13px"}}>{p.dlc?<Badge color="gray">{fmtDate(p.dlc)}</Badge>:"—"}</td>
                      <td style={{padding:"11px 13px"}}>
                        {bas?<Badge color="red">⚠ Bas</Badge>:<Badge color="green">✓ OK</Badge>}
                      </td>
                      {isMembre(user)&&(
                        <td style={{padding:"8px 13px",textAlign:"center"}}>
                          <button onClick={()=>openEdit(p)} style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:7,padding:"5px 11px",cursor:"pointer",fontSize:12,color:"var(--green)",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>✏️ Modifier</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      <Modal open={modal} onClose={()=>setModal(false)} title="Nouveau produit">
        <Input label="Libellé *" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="Ex : Pâtes 500g"/>
        <Select label="Catégorie" value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
          <option value="">-- Choisir --</option>
          {categories.map((c,i)=><option key={c.ref||i} value={c.ref||c.label}>{c.label}</option>)}
        </Select>
        <Input label="Nature" value={form.nature} onChange={e=>setForm(f=>({...f,nature:e.target.value}))} placeholder="Ex : Alimentaire"/>
        <Input label="Seuil alerte" type="number" min="0" value={form.seuil} onChange={e=>setForm(f=>({...f,seuil:+e.target.value}))}/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.label||saving}>{saving?<Spinner/>:"Enregistrer"}</Btn>
        </div>
      </Modal>

      {/* ── Modal Modifier produit ── */}
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Modifier le produit">
        {editForm&&(<>
          <div style={{background:"var(--bg)",borderRadius:8,padding:"7px 12px",marginBottom:14,fontSize:11,color:"var(--text2)",fontFamily:"monospace"}}>Réf : {editForm.ref}</div>
          <Input label="Libellé *" value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))}/>
          {isMembre(user)&&(
            <Select label="Catégorie" value={editForm.cat} onChange={e=>setEditForm(f=>({...f,cat:e.target.value}))}>
              <option value="">-- Choisir --</option>
              {categories.map((c,i)=><option key={c.ref||i} value={c.ref||c.label}>{c.label}</option>)}
            </Select>
          )}
          <Input label="Nature" value={editForm.nature} onChange={e=>setEditForm(f=>({...f,nature:e.target.value}))}/>
          <Input label="Seuil d'alerte" type="number" min="0" value={editForm.seuil} onChange={e=>setEditForm(f=>({...f,seuil:+e.target.value}))}/>
          <div style={{borderTop:"1.5px dashed var(--border)",paddingTop:12,marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--amber)",marginBottom:6,textTransform:"uppercase",letterSpacing:.4}}>📦 Correction de stock</div>
            <Input label="Quantité en stock" type="number" min="0" value={editForm.stock} onChange={e=>setEditForm(f=>({...f,stock:+e.target.value}))}/>
            <p style={{fontSize:11,color:"var(--text2)",marginTop:-8,marginBottom:10}}>⚠️ Modifie directement le stock dans le classeur sans créer de mouvement.</p>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn onClick={saveEdit} disabled={!editForm.label||editSaving}>{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   CATEGORIES
══════════════════════════════════════ */
const CategoriesPage = ({categories,setCategories,user}) => {
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [form,setForm]           = useState({label:""});
  const [editForm,setEditForm]   = useState(null);
  const showT = (msg,ok=true)=>{ setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const save = async () => {
    setSaving(true);
    try {
      const ref = newId("CAT");
      await addCategorie({"Référence":ref,"Libellé":form.label,"Actif":"TRUE"});
      setCategories(prev=>[...prev,{ref,label:form.label,actif:true}]);
      showT("Catégorie ajoutée !"); setModal(false); setForm({label:""});
    } catch(e){ showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h1 style={{fontSize:26,color:"var(--green)"}}>Catégories</h1>
        <Btn onClick={()=>setModal(true)}>+ Nouvelle catégorie</Btn>
      </div>
      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
        {categories.map((c,i)=>(
          <div key={c.ref||i} style={{background:"var(--card)",borderRadius:12,padding:"16px 18px",boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"monospace",fontSize:11,color:"var(--text2)",marginBottom:4}}>{c.ref}</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:10}}>{c.label}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <Badge color={c.actif?"green":"gray"}>{c.actif?"Actif":"Inactif"}</Badge>
              <button onClick={()=>{setEditForm({ref:c.ref,label:c.label});setEditModal(true);}} style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"var(--green)",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>✏️</button>
            </div>
          </div>
        ))}
        {categories.length===0&&<Empty icon="🏷️" title="Aucune catégorie" sub="Ajoutez une catégorie pour organiser vos produits."/>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Nouvelle catégorie">
        <Input label="Libellé *" value={form.label} onChange={e=>setForm({label:e.target.value})} placeholder="Ex : Épicerie"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.label||saving}>{saving?<Spinner/>:"Créer"}</Btn>
        </div>
      </Modal>
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Renommer la catégorie">
        {editForm&&(<>
          <div style={{background:"var(--bg)",borderRadius:8,padding:"7px 12px",marginBottom:14,fontSize:11,color:"var(--text2)",fontFamily:"monospace"}}>Réf : {editForm.ref}</div>
          <Input label="Nouveau libellé *" value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))}/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn onClick={async()=>{setEditSaving(true);try{await updateCategorie({"Référence":editForm.ref,"Libellé":editForm.label});setCategories(prev=>prev.map(c=>c.ref===editForm.ref?{...c,label:editForm.label}:c));showT("Catégorie modifiée !");setEditModal(false);setEditForm(null);}catch(e){showT("Erreur : "+e.message,false);}setEditSaving(false);}} disabled={!editForm.label||editSaving}>{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   ENTRÉES
══════════════════════════════════════ */
/* ── Autocomplete générique ── */
const Autocomplete = ({label, value, onChange, items, placeholder, renderItem, itemToString}) => {
  const [query, setQuery]     = useState(value || "");
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(-1);
  const ref = useRef(null);

  const filtered = query.trim()
    ? items.filter(i => itemToString(i).toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 8);

  const select = item => {
    const str = itemToString(item);
    setQuery(str);
    onChange(str, item);
    setOpen(false);
    setFocused(-1);
  };

  const onKey = e => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f+1, filtered.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => Math.max(f-1, 0)); }
    else if (e.key === "Enter" && focused >= 0) { select(filtered[focused]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  // Ferme au clic dehors
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Field label={label}>
      <div ref={ref} style={{position:"relative"}}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value, null); setOpen(true); setFocused(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          style={{width:"100%",padding:"9px 36px 9px 13px",borderRadius:9,border:"1.5px solid var(--border)",
            background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"var(--text)"}}
        />
        {/* Icône loupe */}
        <span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none",opacity:.5}}>🔍</span>
        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--card)",
            borderRadius:10,boxShadow:"var(--shadow-lg)",border:"1px solid var(--border)",zIndex:200,
            maxHeight:220,overflowY:"auto"}}>
            {filtered.map((item, i) => (
              <div key={i}
                onMouseDown={() => select(item)}
                style={{padding:"10px 13px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                  background:focused===i?"var(--green-light)":"transparent",
                  transition:"background .1s"}}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
        {/* Aucun résultat */}
        {open && query.trim() && filtered.length === 0 && (
          <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--card)",
            borderRadius:10,boxShadow:"var(--shadow-lg)",border:"1px solid var(--border)",zIndex:200,padding:"12px 13px",
            fontSize:13,color:"var(--text2)",fontStyle:"italic"}}>
            Aucun résultat pour « {query} »
          </div>
        )}
      </div>
    </Field>
  );
};

const EntreesPage = ({produits,setProduits,entrees,setEntrees,mouvements,setMouvements,partenaires,donateurs,user}) => {
  const [step,setStep]       = useState(1);
  const [type,setType]       = useState("Collecte");
  const [source,setSource]   = useState(""); // nom du fournisseur ou donateur sélectionné
  const [commentaires,setCommentaires] = useState("");
  const [items,setItems]     = useState({}); // {prdRef: {qte, dlc}}
  const [saving,setSaving]   = useState(false);
  const [done,setDone]       = useState(false);
  const [search,setSearch]   = useState("");

  const isCollecte = type === "Collecte";
  const srcLabel   = isCollecte ? "Fournisseur / Partenaire" : "Donateur";
  const srcIcon    = isCollecte ? "🏢" : "💝";

  const totalItems = Object.values(items).reduce((s,v)=>s+(+v.qte||0),0);
  const nbProds    = Object.keys(items).length;

  // Reset source quand le type change
  const changeType = t => { setType(t); setSource(""); };

  const toggleProd = ref => {
    setItems(prev => {
      const n = {...prev};
      if(n[ref]) delete n[ref]; else n[ref]={qte:1,dlc:""};
      return n;
    });
  };

  const reset = () => { setStep(1); setItems({}); setType("Collecte"); setSource(""); setCommentaires(""); };

  const confirm = async () => {
    setSaving(true);
    try {
      const id   = newId("ENT");
      const hora = fmtHora();
      const mvts = Object.entries(items).map(([ref,v])=>({
        "Produits":    produits.find(p=>p.ref===ref)?.label||ref,
        "Quantité":    +v.qte||0,
        "DLC Entrées": v.dlc||"",
      }));
      await addEntree({
        Horodatage:   hora,
        MouvementId:  id,
        Type:         type,
        Fournisseur:  source,
        Commentaires: commentaires,
        Benevole:     `${user.prenom} ${user.nom}`,
      }, mvts);
      // Mise à jour optimiste locale
      const newProds = [];
      setProduits(prev=>prev.map(p=>{
        if(!items[p.ref]) return p;
        const newStock = p.stock+(+items[p.ref].qte||0);
        newProds.push({ref:p.ref, stock:newStock, label:p.label, cat:p.cat, nature:p.nature||"", seuil:p.seuil});
        return {...p,stock:newStock};
      }));
      // ✅ Le stock est recalculé côté serveur par syncAllStocks() après addEntree
      const newMvts = Object.entries(items).map(([ref,v])=>({
        id,date:hora.slice(0,10),type,produit:produits.find(p=>p.ref===ref)?.label||ref,
        qte:+v.qte,benevole:`${user.prenom} ${user.nom}`,commentaire:commentaires,dlc:v.dlc
      }));
      setMouvements(prev=>[...newMvts,...prev]);
      setEntrees(prev=>[{horodatage:hora,id,type,fournisseur:source,commentaires},...prev]);
      // Stocker pour PDF (on normalise id = MouvementId pour pdfGenerator)
      setLastEntree({
        type, totalItems, nbProds,
        entree:{
          id:           id,
          MouvementId:  id,
          Horodatage:   hora,
          horodatage:   hora,
          Type:         type,
          type:         type,
          Fournisseur:  source,
          fournisseur:  source,
          Commentaires: commentaires,
          benevole:    `${user.prenom} ${user.nom}`,
          Benevole:    `${user.prenom} ${user.nom}`,
        },
        prods: Object.entries(items).map(([ref,v])=>({label:produits.find(p=>p.ref===ref)?.label||ref,qte:+v.qte,dlc:v.dlc})),
      });
      setDone(true);
      setTimeout(()=>{ setDone(false); reset(); setLastEntree(null); }, 10000);
    } catch(e){ alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const prods = produits.filter(p=>p.actif&&(!search||p.label.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>a.label.localeCompare(b.label,'fr'));

  // Références pour PDF (stockées au moment de confirm)
  const [lastEntree,setLastEntree] = useState(null);

  if(done && lastEntree) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",animation:"fadeUp .3s ease",gap:16}}>
      <div style={{fontSize:70}}>✅</div>
      <h2 style={{fontSize:26,color:"var(--green)"}}>Entrée enregistrée !</h2>
      <p style={{color:"var(--text2)"}}><b>{lastEntree.totalItems}</b> article(s) · {lastEntree.nbProds} produit(s) · {lastEntree.type}</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <Btn variant="ghost" sm onClick={()=>pvEntree(lastEntree.entree, lastEntree.prods)}>
          🖨️ Procès-verbal d'entrée (PDF)
        </Btn>
        <Btn variant="ghost" sm onClick={()=>recuSource(
          {nom:lastEntree.entree.Fournisseur, type:lastEntree.type==="Collecte"?"fournisseur":"donateur"},
          {id:lastEntree.entree.MouvementId, type:lastEntree.type, horodatage:lastEntree.entree.Horodatage},
          lastEntree.prods
        )}>
          🧾 Reçu {lastEntree.type==="Collecte"?"fournisseur":"donateur"} (PDF)
        </Btn>
      </div>
    </div>
  );
  if(done) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",animation:"fadeUp .3s ease"}}>
      <div style={{fontSize:70,marginBottom:12}}>✅</div>
      <h2 style={{fontSize:26,color:"var(--green)",marginBottom:8}}>Entrée enregistrée !</h2>
      <p style={{color:"var(--text2)"}}><b>{totalItems}</b> article(s) · {nbProds} produit(s) · {type}</p>
    </div>
  );

  return (
    <div className="page">
      <h1 style={{fontSize:26,color:"var(--green)",marginBottom:6}}>Entrée de stock</h1>
      <p style={{color:"var(--text2)",fontSize:13,marginBottom:22}}>Enregistrer une collecte, caddie solidaire ou don</p>

      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",marginBottom:24,maxWidth:380}}>
        {[{n:1,l:"Type & Source"},{n:2,l:"Produits"},{n:3,l:"Validation"}].map((s,i)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",flex:i<2?1:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,
                background:step>s.n?"var(--green)":step===s.n?"var(--green)":"var(--bg2)",
                color:step>=s.n?"#fff":"var(--text2)",
                outline:step===s.n?"3px solid rgba(28,74,53,.2)":"none",outlineOffset:2}}>
                {step>s.n?"✓":s.n}
              </div>
              <span style={{fontSize:12,fontWeight:step===s.n?700:400,color:step===s.n?"var(--green)":"var(--text2)",whiteSpace:"nowrap"}}>{s.l}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>s.n?"var(--green)":"var(--border)",margin:"0 8px",transition:"background .3s"}}/>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step===1&&(
        <div style={{maxWidth:500,background:"var(--card)",borderRadius:16,padding:24,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
          {/* Type */}
          <Field label="Type d'entrée *">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:4}}>
              {["Collecte","Caddie Solidaire","Dons"].map(t=>(
                <button key={t} onClick={()=>changeType(t)} style={{
                  padding:"11px 8px",borderRadius:10,border:`2px solid ${type===t?"var(--green)":"var(--border)"}`,
                  background:type===t?"var(--green-light)":"var(--bg)",cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:type===t?700:500,
                  color:type===t?"var(--green)":"var(--text2)",transition:"all .13s",textAlign:"center",lineHeight:1.3
                }}>
                  {t==="Collecte"?"🚐":t==="Caddie Solidaire"?"🛒":"💝"}<br/>{t}
                </button>
              ))}
            </div>
          </Field>

          {/* Source dynamique selon le type */}
          <div style={{marginTop:4}}>
            {isCollecte ? (
              <Autocomplete
                label={`${srcIcon} ${srcLabel} *`}
                value={source}
                onChange={(val) => setSource(val)}
                items={partenaires}
                placeholder="Rechercher un partenaire / fournisseur…"
                itemToString={p => p.raisonSociale || ""}
                renderItem={p => (
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{p.raisonSociale}</div>
                    {p.ville && <div style={{fontSize:11,color:"var(--text2)"}}>{p.ville}{p.siret?" · SIRET: "+p.siret:""}</div>}
                  </div>
                )}
              />
            ) : (
              <Autocomplete
                label={`${srcIcon} ${srcLabel} *`}
                value={source}
                onChange={(val) => setSource(val)}
                items={donateurs}
                placeholder="Rechercher un donateur…"
                itemToString={d => `${d.prenom} ${d.nom}`.trim()}
                renderItem={d => (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{d.prenom} {d.nom}</div>
                      {d.ville && <div style={{fontSize:11,color:"var(--text2)"}}>{d.ville}{d.tel?" · "+d.tel:""}</div>}
                    </div>
                    {d.stars && <span style={{fontSize:12}}>⭐</span>}
                  </div>
                )}
              />
            )}
            {/* Saisie libre si pas dans la liste */}
            {source && !partenaires.concat(donateurs).some(x=>(x.raisonSociale||`${x.prenom} ${x.nom}`.trim())===source) && (
              <div style={{fontSize:11,color:"var(--amber)",marginTop:-8,marginBottom:10}}>
                ℹ️ Source saisie manuellement (pas dans la liste)
              </div>
            )}
          </div>

          <Textarea label="Commentaires" value={commentaires} onChange={e=>setCommentaires(e.target.value)} placeholder="Remarques éventuelles…"/>
          <Btn onClick={()=>setStep(2)} disabled={!source.trim()}>Suivant →</Btn>
          {!source.trim() && <p style={{fontSize:11,color:"var(--text2)",marginTop:8}}>Veuillez sélectionner ou saisir {isCollecte?"un fournisseur":"un donateur"} pour continuer.</p>}
        </div>
      )}

      {/* Step 2 */}
      {step===2&&(
        <div>
          <input placeholder="🔍 Rechercher un produit…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",maxWidth:400,padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,marginBottom:16}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:9}}>
            {prods.map((p,i)=>{
              const checked = !!items[p.ref];
              return (
                <div key={p.ref||i} onClick={()=>toggleProd(p.ref)}
                  style={{background:checked?"var(--green-light)":"var(--card)",border:`1.5px solid ${checked?"var(--green2)":"var(--border)"}`,
                    borderRadius:11,padding:"12px 13px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:10,
                    boxShadow:checked?"0 0 0 3px rgba(45,107,79,.12)":"var(--shadow)",transition:"all .13s"}}>
                  <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?"var(--green)":"#ccc"}`,
                    background:checked?"var(--green)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                    {checked&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{p.label}</div>
                    <div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>Stock actuel : {p.stock}</div>
                    {checked&&(
                      <div style={{marginTop:8,display:"flex",gap:8}} onClick={e=>e.stopPropagation()}>
                        <input type="number" min="1" value={items[p.ref]?.qte||1}
                          onChange={e=>setItems(prev=>({...prev,[p.ref]:{...prev[p.ref],qte:e.target.value}}))}
                          placeholder="Qté" style={{width:60,padding:"4px 7px",borderRadius:7,border:"1.5px solid var(--green2)",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"var(--green)",textAlign:"center",background:"var(--bg)"}}/>
                        <input type="date" value={items[p.ref]?.dlc||""}
                          onChange={e=>setItems(prev=>({...prev,[p.ref]:{...prev[p.ref],dlc:e.target.value}}))}
                          style={{flex:1,padding:"4px 7px",borderRadius:7,border:"1.5px solid var(--border)",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"var(--text)",background:"var(--bg)"}}/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{position:"sticky",bottom:0,background:"linear-gradient(to top,var(--bg) 75%,transparent)",padding:"16px 0 4px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
            <span style={{fontSize:13,color:"var(--text2)"}}>
              {nbProds>0?<><b style={{color:"var(--green)",fontSize:15}}>{nbProds}</b> produit(s) · <b style={{color:"var(--green)"}}>{totalItems}</b> articles</>:"Sélectionnez les produits reçus"}
            </span>
            <div style={{display:"flex",gap:10}}>
              <Btn variant="secondary" onClick={()=>setStep(1)}>← Retour</Btn>
              <Btn disabled={nbProds===0} onClick={()=>setStep(3)}>Valider →</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step===3&&(
        <div style={{maxWidth:520}}>
          <div style={{background:"var(--card)",borderRadius:16,padding:22,boxShadow:"var(--shadow)",border:"1px solid var(--border)",marginBottom:16}}>
            <h3 style={{fontSize:15,color:"var(--green)",marginBottom:16}}>📋 Récapitulatif</h3>
            <div style={{background:"var(--bg)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>Type d'entrée</div>
              <div style={{fontSize:15,fontWeight:700}}>{type}</div>
              {source&&<div style={{fontSize:13,color:"var(--text2)",marginTop:2}}>📍 {source}</div>}
              {commentaires&&<div style={{fontSize:12,color:"var(--text2)",marginTop:3,fontStyle:"italic"}}>💬 {commentaires}</div>}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Produits ({nbProds})</div>
            {Object.entries(items).map(([ref,v])=>{
              const p = produits.find(x=>x.ref===ref);
              return (
                <div key={ref} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"var(--bg)",borderRadius:9,marginBottom:7}}>
                  <span style={{fontWeight:600,fontSize:13}}>{p?.label||ref}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {v.dlc&&<Badge color="gray">{fmtDate(v.dlc)}</Badge>}
                    <Badge color="green">+{v.qte}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="secondary" onClick={()=>setStep(2)}>← Modifier</Btn>
            <Btn variant="amber" full onClick={confirm} disabled={saving}>{saving?<Spinner/>:"✓ Enregistrer l'entrée"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════
   DISTRIBUTION
══════════════════════════════════════ */
const DistributionPage = ({produits,setProduits,mouvements,setMouvements,sorties,setSorties,beneficiaires,user,categories}) => {
  const [step,setStep]     = useState(1);
  const [ben,setBen]       = useState(null);
  const [sel,setSel]       = useState({});
  const [commentaires,setCommentaires] = useState("");
  const [saving,setSaving] = useState(false);
  const [done,setDone]     = useState(false);
  const [search,setSearch] = useState("");
  const [searchProd,setSearchProd]     = useState("");
  const [filtreCatDist,setFiltreCatDist] = useState("");

  const nbProds   = Object.keys(sel).length;
  const totalItems= Object.values(sel).reduce((s,v)=>s+(+v||0),0);

  const benFiltered = beneficiaires.filter(b=>!search||`${b.nom} ${b.prenom} ${b.ville}`.toLowerCase().includes(search.toLowerCase()));

  const toggleProd = ref => setSel(prev=>{ const n={...prev}; if(n[ref]) delete n[ref]; else n[ref]=1; return n; });
  const setQte    = (ref,v) => setSel(prev=>({...prev,[ref]:Math.max(1,+v)}));
  const catLabel  = ref => categories?.find(c=>c.ref===ref||c.label===ref)?.label||ref;

  const prodsFiltered = produits
    .filter(p => p.actif
      && (!searchProd || p.label.toLowerCase().includes(searchProd.toLowerCase()))
      && (!filtreCatDist || p.cat===filtreCatDist)
    )
    .sort((a,b) => a.label.localeCompare(b.label,'fr'));

  const confirm = async () => {
    setSaving(true);
    try {
      const id   = newId("SOR");
      const hora = fmtHora();
      const mvts = Object.entries(sel).map(([ref,qte])=>({
        "Produits": produits.find(p=>p.ref===ref)?.label||ref,
        "Quantité": +qte,
      }));
      await addDistribution({
        Horodatage:     hora,
        BeneficiaireID: `${ben.prenom} ${ben.nom}`,
        MouvementId:    id,
        Commentaires:   commentaires,
        Benevole:       `${user.prenom} ${user.nom}`,
      }, mvts);
      // Mise à jour optimiste locale + écriture classeur
      const updatedProds = [];
      setProduits(prev=>prev.map(p=>{
        if(!sel[p.ref]) return p;
        const newStock = Math.max(0, p.stock-(+sel[p.ref]));
        updatedProds.push({ref:p.ref, stock:newStock, label:p.label, cat:p.cat, nature:p.nature||"", seuil:p.seuil});
        return {...p,stock:newStock};
      }));
      // ✅ Le stock est recalculé côté serveur par syncAllStocks() après addDistribution
      const newMvts = Object.entries(sel).map(([ref,qte])=>({
        id,date:hora.slice(0,10),type:"Sortie",produit:produits.find(p=>p.ref===ref)?.label||ref,
        qte:+qte,benevole:`${user.prenom} ${user.nom}`,commentaire:commentaires,dlc:""
      }));
      setMouvements(prev=>[...newMvts,...prev]);
      setSorties(prev=>[{horodatage:hora,beneficiaireId:`${ben.prenom} ${ben.nom}`,id,commentaires},...prev]);
      setLastDistrib({
        totalItems, ben,
        sortie:{
          id,
          horodatage: hora,
          Horodatage: hora,
          benevole:  `${user.prenom} ${user.nom}`,
          commentaires,
        },
        prods: Object.entries(sel).map(([ref,qte])=>({label:produits.find(p=>p.ref===ref)?.label||ref,qte:+qte})),
      });
      setDone(true);
      setTimeout(()=>{setDone(false);setStep(1);setBen(null);setSel({});setCommentaires("");setLastDistrib(null);},10000);
    } catch(e){ alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const [lastDistrib,setLastDistrib] = useState(null);

  if(done && lastDistrib) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",animation:"fadeUp .3s ease",gap:16}}>
      <div style={{fontSize:70}}>🎉</div>
      <h2 style={{fontSize:26,color:"var(--green)"}}>Distribution enregistrée !</h2>
      <p style={{color:"var(--text2)"}}><b>{lastDistrib.totalItems}</b> article(s) remis à <b>{lastDistrib.ben?.prenom} {lastDistrib.ben?.nom}</b></p>
      <Btn variant="ghost" sm onClick={()=>pvDistribution(lastDistrib.sortie, lastDistrib.ben, lastDistrib.prods)}>
        🖨️ Procès-verbal de distribution (PDF)
      </Btn>
    </div>
  );
  if(done) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",animation:"fadeUp .3s ease"}}>
      <div style={{fontSize:70,marginBottom:12}}>🎉</div>
      <h2 style={{fontSize:26,color:"var(--green)",marginBottom:8}}>Distribution enregistrée !</h2>
      <p style={{color:"var(--text2)"}}><b>{totalItems}</b> article(s) remis à <b>{ben?.prenom} {ben?.nom}</b></p>
    </div>
  );

  return (
    <div className="page">
      <h1 style={{fontSize:26,color:"var(--green)",marginBottom:16}}>Distribution de colis</h1>

      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",marginBottom:24,maxWidth:420}}>
        {[{n:1,l:"Bénéficiaire"},{n:2,l:"Produits"},{n:3,l:"Validation"}].map((s,i)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",flex:i<2?1:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:50,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,
                background:step>s.n?"var(--green)":step===s.n?"var(--green)":"var(--bg2)",color:step>=s.n?"#fff":"var(--text2)",
                outline:step===s.n?"3px solid rgba(28,74,53,.2)":"none",outlineOffset:2}}>{step>s.n?"✓":s.n}</div>
              <span style={{fontSize:12,fontWeight:step===s.n?700:400,color:step===s.n?"var(--green)":"var(--text2)",whiteSpace:"nowrap"}}>{s.l}</span>
            </div>
            {i<2&&<div style={{flex:1,height:2,background:step>s.n?"var(--green)":"var(--border)",margin:"0 8px",transition:"background .3s"}}/>}
          </div>
        ))}
      </div>

      {/* Step 1 — Bénéficiaire */}
      {step===1&&(
        <div>
          <input placeholder="🔍 Rechercher un bénéficiaire…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",maxWidth:420,padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,marginBottom:16}}/>
          {benFiltered.length===0&&<Empty icon="👥" title="Aucun bénéficiaire" sub="Ajoutez des bénéficiaires avant de faire une distribution."/>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
            {benFiltered.map((b,i)=>(
              <div key={b.horodateur||i} className="hover-card" onClick={()=>{setBen(b);setStep(2);}}
                style={{background:"var(--card)",borderRadius:14,padding:16,boxShadow:"var(--shadow)",border:"1.5px solid var(--border)",cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{b.prenom} {b.nom}</div>
                    <div style={{fontSize:11,color:"var(--text2)"}}>{b.ville}</div>
                  </div>
                  <Badge color="blue">{b.nbPersonnes} pers.</Badge>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                  {b.situation&&<Badge color="gray">{b.situation}</Badge>}
                  {b.nbEnfants>0&&<Badge color="gray">{b.nbEnfants} enfant(s)</Badge>}
                  {b.bebes==="Oui"&&<Badge color="purple">🍼 Bébé</Badge>}
                </div>
                {b.restrictions&&<div style={{fontSize:11,color:"var(--red)"}}>⚠️ {b.restrictions}</div>}
                <div style={{marginTop:8,fontSize:11,color:"var(--green)",fontWeight:600}}>Sélectionner →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Produits */}
      {step===2&&(
        <div>
          {/* Récapitulatif bénéficiaire */}
          <div style={{background:"var(--green-light)",border:"1.5px solid #b8dfc8",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--green2)",textTransform:"uppercase",letterSpacing:.5}}>Bénéficiaire</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--green)"}}>{ben?.prenom} {ben?.nom}</div>
              <div style={{fontSize:12,color:"var(--text2)"}}>{ben?.ville} · {ben?.nbPersonnes} pers.</div>
              {ben?.restrictions&&<div style={{fontSize:11,color:"var(--red)",marginTop:2}}>⚠️ {ben.restrictions}</div>}
            </div>
            <button onClick={()=>{setStep(1);setSel({});}} style={{border:"none",background:"rgba(28,74,53,.1)",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:"var(--green)",fontWeight:600}}>Changer</button>
          </div>
          {/* Recherche + filtre catégorie */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <input placeholder="🔍 Rechercher un produit…" value={searchProd} onChange={e=>setSearchProd(e.target.value)}
              style={{flex:1,minWidth:150,padding:"7px 12px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}/>
            <select value={filtreCatDist} onChange={e=>setFiltreCatDist(e.target.value)}
              style={{padding:"7px 12px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}>
              <option value="">Toutes catégories</option>
              {categories?.map((c,i)=><option key={c.ref||i} value={c.ref||c.label}>{c.label}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:9}}>
            {prodsFiltered.map((p,i)=>{
              const checked = !!sel[p.ref];
              const bas     = p.stock<=0;
              return (
                <div key={p.ref||i} onClick={()=>!bas&&toggleProd(p.ref)}
                  style={{background:checked?"var(--green-light)":"var(--card)",border:`1.5px solid ${checked?"var(--green2)":"var(--border)"}`,
                    borderRadius:11,padding:"12px 13px",cursor:bas?"not-allowed":"pointer",opacity:bas?.4:1,
                    display:"flex",alignItems:"center",gap:10,transition:"all .13s",
                    boxShadow:checked?"0 0 0 3px rgba(45,107,79,.12)":"var(--shadow)"}}>
                  <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${checked?"var(--green)":"#ccc"}`,background:checked?"var(--green)":"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .13s"}}>
                    {checked&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:12,lineHeight:1.3}}>{p.label}</div>
                    <div style={{fontSize:11,color:bas?"var(--red)":checked?"var(--green2)":"var(--text2)",marginTop:2}}>{bas?"Rupture":"Stock : "+p.stock}</div>
                  </div>
                  {checked&&(
                    <input type="number" min="1" max={p.stock} value={sel[p.ref]||1}
                      onChange={e=>{e.stopPropagation();setQte(p.ref,e.target.value);}}
                      onClick={e=>e.stopPropagation()}
                      style={{width:46,padding:"4px 5px",borderRadius:7,border:"1.5px solid var(--green2)",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,color:"var(--green)",textAlign:"center",background:"var(--bg)"}}/>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{position:"sticky",bottom:0,background:"linear-gradient(to top,var(--bg) 75%,transparent)",padding:"14px 0 4px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
            <span style={{fontSize:13,color:"var(--text2)"}}>
              {nbProds>0?<><b style={{color:"var(--green)",fontSize:15}}>{nbProds}</b> produit(s) · <b style={{color:"var(--green)"}}>{totalItems}</b> articles</>:"Cochez les produits à distribuer"}
            </span>
            <Btn disabled={nbProds===0} onClick={()=>setStep(3)}>Confirmer →</Btn>
          </div>
        </div>
      )}

      {/* Step 3 — Validation */}
      {step===3&&(
        <div style={{maxWidth:520}}>
          <div style={{background:"var(--card)",borderRadius:16,padding:22,boxShadow:"var(--shadow)",border:"1px solid var(--border)",marginBottom:16}}>
            <h3 style={{fontSize:15,color:"var(--green)",marginBottom:16}}>📋 Récapitulatif du colis</h3>
            <div style={{background:"var(--bg)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>Bénéficiaire</div>
              <div style={{fontSize:15,fontWeight:700}}>{ben?.prenom} {ben?.nom}</div>
              <div style={{fontSize:12,color:"var(--text2)"}}>{ben?.ville} · {ben?.nbPersonnes} pers.</div>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Produits ({nbProds})</div>
            {Object.entries(sel).map(([ref,qte])=>{
              const p = produits.find(x=>x.ref===ref);
              return (
                <div key={ref} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"var(--bg)",borderRadius:9,marginBottom:7}}>
                  <span style={{fontWeight:600,fontSize:13}}>{p?.label||ref}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button onClick={()=>qte>1&&setQte(ref,qte-1)} style={{width:24,height:24,borderRadius:6,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",fontSize:14}}>−</button>
                    <span style={{fontWeight:700,fontSize:15,minWidth:24,textAlign:"center"}}>{qte}</span>
                    <button onClick={()=>qte<p?.stock&&setQte(ref,qte+1)} style={{width:24,height:24,borderRadius:6,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",fontSize:14}}>+</button>
                    <button onClick={()=>toggleProd(ref)} style={{width:24,height:24,borderRadius:6,border:"none",background:"var(--red-light)",cursor:"pointer",color:"var(--red)",fontSize:12}}>✕</button>
                  </div>
                </div>
              );
            })}
            <Textarea label="Commentaires (optionnel)" value={commentaires} onChange={e=>setCommentaires(e.target.value)} style={{marginTop:12}}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="secondary" onClick={()=>setStep(2)}>← Modifier</Btn>
            <Btn variant="amber" full onClick={confirm} disabled={saving}>{saving?<Spinner/>:`✓ Valider la distribution (${totalItems} art.)`}</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════
   BÉNÉFICIAIRES
══════════════════════════════════════ */
const BeneficiairesPage = ({beneficiaires,setBeneficiaires,user}) => {
  const [search,setSearch]       = useState("");
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [form,setForm]           = useState({nom:"",prenom:"",age:"",sexe:"",ville:"",situation:"",tel:"",nbPersonnes:1,nbEnfants:0,restrictions:"",bebes:"Non",revenus:"",canal:""});
  const [editForm,setEditForm]   = useState(null);
  const showT = (msg,ok=true)=>{ setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const filtered = beneficiaires.filter(b=>!search||`${b.nom} ${b.prenom} ${b.ville}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        "Horodateur":                                             new Date().toISOString(),
        "Nom du Bénéficiaire":                                    form.nom,
        "Prénom du Bénéficiaire":                                 form.prenom,
        "Numéro de téléphone du Bénéficiaire":                    form.tel,
        "Tranche d'âge du Bénéficiaire":                          form.age,
        "Sexe":                                                   form.sexe,
        "Dans quelle ville habitez-vous ( Bénéficiaire) ?":       form.ville,
        "Situation Matrimonial":                                  form.situation,
        "Nbre Pers Foyers":                                       form.nbPersonnes,
        "Enfants":                                                form.nbEnfants,
        "restrictions alimentaires":                              form.restrictions,
        "Produits Bébés":                                         form.bebes,
        "source régulière de revenus ?":                          form.revenus,
        "Canal":                                                  form.canal,
      };
      await addBeneficiaire(data);
      setBeneficiaires(prev=>[...prev,{...form,horodateur:data["Horodateur"]}]);
      showT("Bénéficiaire ajouté !"); setModal(false);
      setForm({nom:"",prenom:"",age:"",sexe:"",ville:"",situation:"",tel:"",nbPersonnes:1,nbEnfants:0,restrictions:"",bebes:"Non",revenus:"",canal:""});
    } catch(e){ showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:26,color:"var(--green)"}}>Bénéficiaires</h1>
          <p style={{color:"var(--text2)",fontSize:13}}>{beneficiaires.length} enregistrés</p>
        </div>
        {isMembre(user)&&<Btn onClick={()=>setModal(true)}>+ Nouveau</Btn>}
      </div>
      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}
      <input placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:"100%",maxWidth:420,padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,marginBottom:18}}/>
      {filtered.length===0
        ? <Empty icon="👥" title="Aucun bénéficiaire" sub="Ajoutez le premier bénéficiaire." action={isMembre(user)&&<Btn onClick={()=>setModal(true)}>+ Nouveau bénéficiaire</Btn>}/>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
            {filtered.map((b,i)=>(
              <div key={b.horodateur||i} style={{background:"var(--card)",borderRadius:14,padding:16,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{b.prenom} {b.nom}</div>
                    <div style={{fontSize:11,color:"var(--text2)"}}>{b.ville} · {b.age}</div>
                  </div>
                  <Badge color={b.sexe==="Homme"?"blue":"purple"}>{b.sexe||"—"}</Badge>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                  {b.situation&&<Badge color="gray">{b.situation}</Badge>}
                  <Badge color="gray">👨‍👩‍👧 {b.nbPersonnes} pers.</Badge>
                  {b.nbEnfants>0&&<Badge color="gray">{b.nbEnfants} enfant(s)</Badge>}
                  {b.bebes==="Oui"&&<Badge color="purple">🍼 Bébé</Badge>}
                </div>
                {b.restrictions&&<div style={{fontSize:11,color:"var(--red)"}}>⚠️ {b.restrictions}</div>}
                {b.tel&&<div style={{fontSize:11,color:"var(--text2)",marginTop:4}}>📞 {b.tel}</div>}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>carteBeneficiaire(b)} style={{border:"1px solid var(--green)",borderRadius:7,padding:"4px 10px",background:"var(--green-light)",color:"var(--green)",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>🪪 Carte PDF</button>
                  {isMembre(user)&&<button onClick={()=>{setEditForm({...b});setEditModal(true);}} style={{border:"1.5px solid var(--green)",borderRadius:7,padding:"4px 10px",background:"var(--green-light)",color:"var(--green)",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer"}}>✏️ Modifier</button>}
                </div>
              </div>
            ))}
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Nouveau bénéficiaire" width={620}>
        <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder="Nom de famille"/>
          <Input label="Prénom *" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} placeholder="Prénom"/>
        </div>
        <div className="rg3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Select label="Tranche d'âge *" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))}>
            <option value="">— Choisir —</option>
            {["18-25","26-35","36-45","46-55","56-65","65+"].map(a=><option key={a}>{a}</option>)}
          </Select>
          <Select label="Sexe *" value={form.sexe} onChange={e=>setForm(f=>({...f,sexe:e.target.value}))}>
            <option value="">— Choisir —</option><option>Homme</option><option>Femme</option>
          </Select>
          <Select label="Situation matrimoniale *" value={form.situation} onChange={e=>setForm(f=>({...f,situation:e.target.value}))}>
            <option value="">— Choisir —</option>
            {["Célibataire","Marié(e)","Divorcé(e)","Veuf(ve)","Union libre"].map(s=><option key={s}>{s}</option>)}
          </Select>
        </div>
        <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Ville *" value={form.ville} onChange={e=>setForm(f=>({...f,ville:e.target.value}))} placeholder="Ex : Les Mureaux"/>
          <Input label="Téléphone *" value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))} placeholder="06 XX XX XX XX"/>
        </div>
        <div className="rg3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Input label="Nb personnes foyer *" type="number" min="1" value={form.nbPersonnes} onChange={e=>setForm(f=>({...f,nbPersonnes:+e.target.value}))}/>
          <Input label="Dont enfants" type="number" min="0" value={form.nbEnfants} onChange={e=>setForm(f=>({...f,nbEnfants:+e.target.value}))}/>
          <Select label="Produits bébés" value={form.bebes} onChange={e=>setForm(f=>({...f,bebes:e.target.value}))}>
            <option>Non</option><option>Oui</option>
          </Select>
        </div>
        <Input label="Restrictions alimentaires" value={form.restrictions} onChange={e=>setForm(f=>({...f,restrictions:e.target.value}))} placeholder="Ex : Sans porc, sans gluten, diabétique…"/>
        <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Select label="Source régulière de revenus *" value={form.revenus} onChange={e=>setForm(f=>({...f,revenus:e.target.value}))}>
            <option value="">— Choisir —</option>
            {["RSA","AAH","Salaire","Retraite","ARE / Chômage","Sans revenus","Autre"].map(r=><option key={r}>{r}</option>)}
          </Select>
          <Select label="Canal d'orientation *" value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}>
            <option value="">— Choisir —</option>
            {["Direct / Spontané","Travailleur social","Association partenaire","Mairie / CCAS","Église / Communauté","Bouche à oreille","Autre"].map(c=><option key={c}>{c}</option>)}
          </Select>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.nom||!form.prenom||!form.age||!form.sexe||!form.ville||saving}>{saving?<Spinner/>:"Enregistrer"}</Btn>
        </div>
      </Modal>

      {/* ── Modal Modifier bénéficiaire ── */}
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Modifier le bénéficiaire" width={620}>
        {editForm&&(<>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Nom *" value={editForm.nom} onChange={e=>setEditForm(f=>({...f,nom:e.target.value}))}/>
            <Input label="Prénom *" value={editForm.prenom} onChange={e=>setEditForm(f=>({...f,prenom:e.target.value}))}/>
          </div>
          <div className="rg3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Select label="Tranche d'âge" value={editForm.age||""} onChange={e=>setEditForm(f=>({...f,age:e.target.value}))}>
              <option value="">—</option>{["18-25","26-35","36-45","46-55","56-65","65+"].map(a=><option key={a}>{a}</option>)}
            </Select>
            <Select label="Sexe" value={editForm.sexe||""} onChange={e=>setEditForm(f=>({...f,sexe:e.target.value}))}>
              <option value="">—</option><option>Homme</option><option>Femme</option>
            </Select>
            <Select label="Situation" value={editForm.situation||""} onChange={e=>setEditForm(f=>({...f,situation:e.target.value}))}>
              <option value="">—</option>{["Célibataire","Marié(e)","Divorcé(e)","Veuf(ve)","Union libre"].map(s=><option key={s}>{s}</option>)}
            </Select>
          </div>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Ville" value={editForm.ville||""} onChange={e=>setEditForm(f=>({...f,ville:e.target.value}))}/>
            <Input label="Téléphone" value={editForm.tel||""} onChange={e=>setEditForm(f=>({...f,tel:e.target.value}))}/>
          </div>
          <div className="rg3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Input label="Nb personnes" type="number" min="1" value={editForm.nbPersonnes||1} onChange={e=>setEditForm(f=>({...f,nbPersonnes:+e.target.value}))}/>
            <Input label="Nb enfants" type="number" min="0" value={editForm.nbEnfants||0} onChange={e=>setEditForm(f=>({...f,nbEnfants:+e.target.value}))}/>
            <Select label="Produits bébés" value={editForm.bebes||"Non"} onChange={e=>setEditForm(f=>({...f,bebes:e.target.value}))}>
              <option>Non</option><option>Oui</option>
            </Select>
          </div>
          <Input label="Restrictions alimentaires" value={editForm.restrictions||""} onChange={e=>setEditForm(f=>({...f,restrictions:e.target.value}))}/>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Select label="Source de revenus" value={editForm.revenus||""} onChange={e=>setEditForm(f=>({...f,revenus:e.target.value}))}>
              <option value="">—</option>{["RSA","AAH","Salaire","Retraite","ARE / Chômage","Sans revenus","Autre"].map(r=><option key={r}>{r}</option>)}
            </Select>
            <Select label="Canal d'orientation" value={editForm.canal||""} onChange={e=>setEditForm(f=>({...f,canal:e.target.value}))}>
              <option value="">—</option>{["Direct / Spontané","Travailleur social","Association partenaire","Mairie / CCAS","Église / Communauté","Bouche à oreille","Autre"].map(c=><option key={c}>{c}</option>)}
            </Select>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn onClick={async()=>{
              setEditSaving(true);
              try {
                await updateBeneficiaire({"Horodateur":editForm.horodateur,"Nom du Bénéficiaire":editForm.nom,"Prénom du Bénéficiaire":editForm.prenom,"Numéro de téléphone du Bénéficiaire":editForm.tel,"Tranche d'âge du Bénéficiaire":editForm.age,"Sexe":editForm.sexe,"Dans quelle ville habitez-vous ( Bénéficiaire) ?":editForm.ville,"Situation Matrimonial":editForm.situation,"Nbre Pers Foyers":editForm.nbPersonnes,"Enfants":editForm.nbEnfants,"restrictions alimentaires":editForm.restrictions,"Produits Bébés":editForm.bebes,"source régulière de revenus ?":editForm.revenus,"Canal":editForm.canal});
                setBeneficiaires(prev=>prev.map(b=>b.horodateur===editForm.horodateur?{...b,...editForm}:b));
                showT("Bénéficiaire modifié !"); setEditModal(false); setEditForm(null);
              } catch(e){ showT("Erreur : "+e.message,false); }
              setEditSaving(false);
            }} disabled={!editForm.nom||editSaving}>{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   BÉNÉVOLES
══════════════════════════════════════ */
const BenevolesPage = ({benevoles,setBenevoles,user}) => {
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [form,setForm]           = useState({nom:"",prenom:"",email:"",pseudo:"",mdp:"",tel:"",pole:"Distribution",statut:"Bénévole"});
  const [editForm,setEditForm]   = useState(null);
  const poles = ["Coordination","Distribution","Collecte"];
  const showT = (msg,ok=true)=>{ setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const save = async () => {
    setSaving(true);
    try {
      const matricule = newId("BEN");
      await addBenevole({
        "Matricule":   matricule,
        "Nom":         form.nom,
        "Prénom":      form.prenom,
        "Email":       form.email,
        "Pseudonyme":  form.pseudo,
        "MotDePasse":  form.mdp,
        "Téléphone":   form.tel,
        "Pôle":        form.pole,
        "Statut":      form.statut,
        "Actif":       "TRUE",
      });
      setBenevoles(prev=>[...prev,{matricule,...form,actif:true}]);
      showT("Bénévole ajouté !"); setModal(false);
      setForm({nom:"",prenom:"",email:"",pseudo:"",mdp:"",tel:"",pole:"Distribution",statut:"Bénévole"});
    } catch(e){ showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:26,color:"var(--green)"}}>Bénévoles</h1>
          <p style={{color:"var(--text2)",fontSize:13}}>{benevoles.filter(b=>b.actif).length} actifs</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Nouveau bénévole</Btn>
      </div>
      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}
      {poles.map(pole=>{
        const mb = benevoles.filter(b=>b.pole===pole&&b.actif);
        if(!mb.length) return null;
        return (
          <div key={pole} style={{marginBottom:22}}>
            <h3 style={{fontSize:12,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.6,marginBottom:10}}>
              {{"Coordination":"🎯","Distribution":"📦","Collecte":"🚐"}[pole]} Pôle {pole} ({mb.length})
            </h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
              {mb.map((b,i)=>(
                <div key={b.matricule||i} style={{background:"var(--card)",borderRadius:12,padding:14,boxShadow:"var(--shadow)",border:"1px solid var(--border)",display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:38,height:38,borderRadius:50,background:b.statut==="Membre"?"rgba(255,215,0,.2)":"var(--green-light)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,
                    color:b.statut==="Membre"?"#b8860b":"var(--green)",flexShrink:0}}>
                    {b.prenom?.[0]}{b.nom?.[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13}}>{b.prenom} {b.nom}</div>
                    <div style={{fontSize:11,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.email||b.pseudo}</div>
                    <div style={{marginTop:4,display:"flex",alignItems:"center",gap:6}}>
                      <Badge color={b.statut==="Membre"?"green":"blue"}>{b.statut}</Badge>
                      {isMembre(user)&&<button onClick={()=>{setEditForm({matricule:b.matricule,nom:b.nom,prenom:b.prenom,email:b.email||"",tel:b.tel||"",pseudo:b.pseudo||"",pole:b.pole||"Distribution",statut:b.statut||"Bénévole"});setEditModal(true);}} style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11,color:"var(--green)",fontWeight:600}}>✏️</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {benevoles.filter(b=>b.actif).length===0&&<Empty icon="🤝" title="Aucun bénévole" sub="Ajoutez le premier bénévole." action={<Btn onClick={()=>setModal(true)}>+ Nouveau bénévole</Btn>}/>}

      <Modal open={modal} onClose={()=>setModal(false)} title="Nouveau bénévole" width={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
          <Input label="Prénom *" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))}/>
        </div>
        <Input label="Email *" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        <Input label="Téléphone *" value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))} placeholder="06 XX XX XX XX"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Pseudonyme * (identifiant connexion)" value={form.pseudo} onChange={e=>setForm(f=>({...f,pseudo:e.target.value}))}/>
          <Input label="Mot de passe *" type="password" value={form.mdp} onChange={e=>setForm(f=>({...f,mdp:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Select label="Pôle" value={form.pole} onChange={e=>setForm(f=>({...f,pole:e.target.value}))}>
            {poles.map(p=><option key={p}>{p}</option>)}
          </Select>
          <Select label="Statut" value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>
            <option>Bénévole</option><option>Membre</option>
          </Select>
        </div>
        <div style={{background:"var(--amber-light)",borderRadius:9,padding:"9px 12px",fontSize:12,color:"var(--amber)",marginBottom:12}}>
          ⚠️ Le mot de passe sera également ajouté dans BENEVOLES_LOCAL dans App.jsx pour permettre la connexion.
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.nom||!form.prenom||!form.pseudo||!form.mdp||saving}>{saving?<Spinner/>:"Créer le compte"}</Btn>
        </div>
      </Modal>

      {/* ── Modal Modifier bénévole ── */}
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Modifier le bénévole" width={520}>
        {editForm&&(<>
          <div style={{background:"var(--bg)",borderRadius:8,padding:"7px 12px",marginBottom:14,fontSize:11,color:"var(--text2)",fontFamily:"monospace"}}>Matricule : {editForm.matricule}</div>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Nom *" value={editForm.nom} onChange={e=>setEditForm(f=>({...f,nom:e.target.value}))}/>
            <Input label="Prénom *" value={editForm.prenom} onChange={e=>setEditForm(f=>({...f,prenom:e.target.value}))}/>
          </div>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Email" type="email" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))}/>
            <Input label="Téléphone" value={editForm.tel} onChange={e=>setEditForm(f=>({...f,tel:e.target.value}))}/>
          </div>
          <Input label="Pseudonyme (identifiant connexion)" value={editForm.pseudo} onChange={e=>setEditForm(f=>({...f,pseudo:e.target.value}))}/>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Select label="Pôle" value={editForm.pole} onChange={e=>setEditForm(f=>({...f,pole:e.target.value}))}>
              {poles.map(p=><option key={p}>{p}</option>)}
            </Select>
            <Select label="Statut" value={editForm.statut} onChange={e=>setEditForm(f=>({...f,statut:e.target.value}))}>
              <option>Bénévole</option><option>Membre</option>
            </Select>
          </div>

          {/* ── Section changement de mot de passe ── */}
          <div style={{borderTop:"1.5px dashed var(--border)",paddingTop:12,marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--green2)",textTransform:"uppercase",letterSpacing:.4,marginBottom:8}}>🔑 Changer le mot de passe</div>
            <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Input label="Nouveau mot de passe" type="password"
                value={editForm.newMdp||""}
                onChange={e=>setEditForm(f=>({...f,newMdp:e.target.value}))}
                placeholder="Laisser vide = inchangé"/>
              <Input label="Confirmer le mot de passe" type="password"
                value={editForm.confirmMdp||""}
                onChange={e=>setEditForm(f=>({...f,confirmMdp:e.target.value}))}
                placeholder="Confirmer"/>
            </div>
            {editForm.newMdp&&editForm.confirmMdp&&editForm.newMdp!==editForm.confirmMdp&&(
              <p style={{fontSize:11,color:"var(--red)",marginTop:-6,marginBottom:8}}>⚠️ Les mots de passe ne correspondent pas</p>
            )}
            {editForm.newMdp&&editForm.newMdp===editForm.confirmMdp&&(
              <p style={{fontSize:11,color:"var(--green2)",marginTop:-6,marginBottom:8}}>✅ Mot de passe valide</p>
            )}
            <p style={{fontSize:11,color:"var(--text2)",marginTop:0}}>
              ⚠️ Après modification, mettez aussi à jour <b>BENEVOLES_LOCAL</b> dans App.jsx pour que la connexion fonctionne.
            </p>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn
              disabled={!editForm.nom||(editForm.newMdp&&editForm.newMdp!==editForm.confirmMdp)||editSaving}
              onClick={async()=>{
                setEditSaving(true);
                try {
                  const payload = {
                    "Matricule":  editForm.matricule,
                    "Nom":        editForm.nom,
                    "Prénom":     editForm.prenom,
                    "Email":      editForm.email,
                    "Téléphone":  editForm.tel,
                    "Pseudonyme": editForm.pseudo,
                    "Pôle":       editForm.pole,
                    "Statut":     editForm.statut,
                  };
                  // N'envoie le mot de passe que s'il est renseigné et confirmé
                  if (editForm.newMdp && editForm.newMdp === editForm.confirmMdp) {
                    payload["MotDePasse"] = editForm.newMdp;
                  }
                  await updateBenevole(payload);
                  setBenevoles(prev=>prev.map(b=>b.matricule===editForm.matricule
                    ? {...b,...editForm, mdp: editForm.newMdp&&editForm.newMdp===editForm.confirmMdp ? editForm.newMdp : b.mdp}
                    : b
                  ));
                  showT("Bénévole modifié !" + (editForm.newMdp===editForm.confirmMdp&&editForm.newMdp?" (mot de passe changé)":""));
                  setEditModal(false); setEditForm(null);
                } catch(e){ showT("Erreur : "+e.message,false); }
                setEditSaving(false);
              }}
            >{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   DONATEURS
══════════════════════════════════════ */
const DonateursPage = ({donateurs,setDonateurs,user}) => {
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [search,setSearch]       = useState("");
  const [form,setForm]           = useState({nom:"",prenom:"",adresse:"",ville:"",tel:"",fi:"",stars:false});
  const [editForm,setEditForm]   = useState(null);
  const showT = (msg,ok=true)=>{ setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const filtered = donateurs.filter(d=>!search||`${d.nom} ${d.prenom} ${d.ville}`.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    setSaving(true);
    try {
      await addDonateur({"Nom":form.nom,"Prenom":form.prenom,"adresse":form.adresse,"Ville":form.ville,"Telephone":form.tel,"FI":form.fi,"STARS":form.stars?"OUI":"NON"});
      setDonateurs(prev=>[...prev,{...form}]);
      showT("Donateur ajouté !"); setModal(false);
      setForm({nom:"",prenom:"",adresse:"",ville:"",tel:"",fi:"",stars:false});
    } catch(e){ showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:26,color:"var(--green)"}}>Donateurs</h1>
          <p style={{color:"var(--text2)",fontSize:13}}>{donateurs.length} enregistrés · {donateurs.filter(d=>d.stars).length} ⭐ STARS</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Nouveau donateur</Btn>
      </div>
      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}
      <input placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:"100%",maxWidth:380,padding:"8px 13px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--card)",fontFamily:"'DM Sans',sans-serif",fontSize:13,marginBottom:16}}/>
      {filtered.length===0
        ? <Empty icon="💝" title="Aucun donateur" sub="Ajoutez vos donateurs." action={<Btn onClick={()=>setModal(true)}>+ Nouveau donateur</Btn>}/>
        : <div style={{background:"var(--card)",borderRadius:14,boxShadow:"var(--shadow)",border:"1px solid var(--border)",overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Sans',sans-serif",minWidth:560}}>
              <thead>
                <tr style={{background:"var(--bg2)"}}>
                  {[..."Nom,Prénom,Ville,Téléphone,FI,STARS".split(","), ...(isMembre(user)?["Actions"]:[])].map(h=>(
                    <th key={h} style={{padding:"9px 13px",textAlign:h==="Actions"?"center":"left",fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.4}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d,i)=>(
                  <tr key={i} style={{borderTop:"1px solid var(--border)",background:i%2?"var(--bg)":"var(--card)"}}>
                    <td style={{padding:"10px 13px",fontWeight:600,fontSize:13}}>{d.nom}</td>
                    <td style={{padding:"10px 13px",fontSize:13}}>{d.prenom}</td>
                    <td style={{padding:"10px 13px",fontSize:13}}>{d.ville}</td>
                    <td style={{padding:"10px 13px",fontSize:12,color:"var(--text2)"}}>{d.tel||"—"}</td>
                    <td style={{padding:"10px 13px",fontSize:12}}>{d.fi||"—"}</td>
                    <td style={{padding:"10px 13px"}}>{d.stars?<Badge color="amber">⭐ OUI</Badge>:<Badge color="gray">NON</Badge>}</td>
                    {isMembre(user)&&<td style={{padding:"8px 13px",textAlign:"center"}}><button onClick={()=>{setEditForm({...d,stars:d.stars||false});setEditModal(true);}} style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"var(--green)",fontWeight:600}}>✏️</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Nouveau donateur">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Nom *" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/>
          <Input label="Prénom *" value={form.prenom} onChange={e=>setForm(f=>({...f,prenom:e.target.value}))} placeholder="Prénom"/>
        </div>
        <Input label="Adresse *" value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Ville" value={form.ville} onChange={e=>setForm(f=>({...f,ville:e.target.value}))}/>
          <Input label="Téléphone" value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))}/>
        </div>
        <Input label="FI (Fidélité / Référence)" value={form.fi} onChange={e=>setForm(f=>({...f,fi:e.target.value}))}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <input type="checkbox" id="stars" checked={form.stars} onChange={e=>setForm(f=>({...f,stars:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>
          <label htmlFor="stars" style={{fontSize:13,fontWeight:600,cursor:"pointer"}}>⭐ Donateur STARS</label>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.nom||!form.prenom||!form.ville||saving}>{saving?<Spinner/>:"Enregistrer"}</Btn>
        </div>
      </Modal>

      {/* ── Modal Modifier donateur ── */}
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Modifier le donateur" width={500}>
        {editForm&&(<>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Nom *" value={editForm.nom} onChange={e=>setEditForm(f=>({...f,nom:e.target.value}))}/>
            <Input label="Prénom *" value={editForm.prenom} onChange={e=>setEditForm(f=>({...f,prenom:e.target.value}))}/>
          </div>
          <Input label="Adresse" value={editForm.adresse||""} onChange={e=>setEditForm(f=>({...f,adresse:e.target.value}))}/>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Ville" value={editForm.ville||""} onChange={e=>setEditForm(f=>({...f,ville:e.target.value}))}/>
            <Input label="Téléphone" value={editForm.tel||""} onChange={e=>setEditForm(f=>({...f,tel:e.target.value}))}/>
          </div>
          <Input label="FI" value={editForm.fi||""} onChange={e=>setEditForm(f=>({...f,fi:e.target.value}))}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 13px",background:"var(--amber-light)",borderRadius:9}}>
            <input type="checkbox" id="edit-stars" checked={editForm.stars||false} onChange={e=>setEditForm(f=>({...f,stars:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>
            <label htmlFor="edit-stars" style={{fontSize:13,fontWeight:600,cursor:"pointer",color:"var(--amber)"}}>⭐ Donateur STARS</label>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn onClick={async()=>{setEditSaving(true);try{await updateDonateur({"Nom":editForm.nom,"Prenom":editForm.prenom,"adresse":editForm.adresse,"Ville":editForm.ville,"Telephone":editForm.tel,"FI":editForm.fi,"STARS":editForm.stars?"OUI":"NON"});setDonateurs(prev=>prev.map(d=>d.nom===editForm.nom&&d.prenom===editForm.prenom?{...d,...editForm}:d));showT("Donateur modifié !");setEditModal(false);setEditForm(null);}catch(e){showT("Erreur : "+e.message,false);}setEditSaving(false);}} disabled={!editForm.nom||editSaving}>{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   FOURNISSEURS / PARTENAIRES
══════════════════════════════════════ */
const FournisseursPage = ({partenaires,setPartenaires,user}) => {
  const [modal,setModal]         = useState(false);
  const [editModal,setEditModal] = useState(false);
  const [saving,setSaving]       = useState(false);
  const [editSaving,setEditSaving] = useState(false);
  const [toast,setToast]         = useState(null);
  const [toastOk,setToastOk]     = useState(true);
  const [form,setForm]           = useState({raisonSociale:"",siret:"",adresse:"",ville:"",tel:""});
  const [editForm,setEditForm]   = useState(null);
  const showT = (msg,ok=true)=>{ setToastOk(ok); setToast(msg); setTimeout(()=>setToast(null),3500); };

  const save = async () => {
    setSaving(true);
    try {
      await addPartenaire({"Raison Sociale":form.raisonSociale,"SIRET":form.siret,"Adresse":form.adresse,"Ville":form.ville,"Telephone":form.tel});
      setPartenaires(prev=>[...prev,{...form}]);
      showT("Fournisseur ajouté !"); setModal(false);
      setForm({raisonSociale:"",siret:"",adresse:"",ville:"",tel:""});
    } catch(e){ showT("Erreur : "+e.message,false); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:26,color:"var(--green)"}}>Fournisseurs & Partenaires</h1>
          <p style={{color:"var(--text2)",fontSize:13}}>{partenaires.length} enregistrés</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Nouveau</Btn>
      </div>
      {toast&&<div style={{background:toastOk?"var(--green-light)":"var(--red-light)",border:`1px solid ${toastOk?"#b8dfc8":"#f5b8b2"}`,borderRadius:10,padding:"11px 16px",marginBottom:16,fontSize:13,fontWeight:600,color:toastOk?"var(--green2)":"var(--red)",display:"flex",gap:8}}>{toastOk?"✅":"❌"} {toast}</div>}
      {partenaires.length===0
        ? <Empty icon="🏢" title="Aucun fournisseur" sub="Ajoutez vos partenaires et fournisseurs." action={<Btn onClick={()=>setModal(true)}>+ Nouveau fournisseur</Btn>}/>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
            {partenaires.map((p,i)=>(
              <div key={i} style={{background:"var(--card)",borderRadius:12,padding:16,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontWeight:700,fontSize:14}}>{p.raisonSociale}</div>
                  {isMembre(user)&&<button onClick={()=>{setEditForm({...p});setEditModal(true);}} style={{border:"1.5px solid var(--green)",background:"var(--green-light)",borderRadius:7,padding:"3px 9px",cursor:"pointer",fontSize:12,color:"var(--green)",fontWeight:600}}>✏️</button>}
                </div>
                {p.siret&&<div style={{fontSize:11,fontFamily:"monospace",color:"var(--text2)",marginBottom:8}}>SIRET : {p.siret}</div>}
                <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.6}}>
                  {p.adresse&&<div>📍 {p.adresse}</div>}
                  {p.ville&&<div>🏙️ {p.ville}</div>}
                  {p.tel&&<div>📞 {p.tel}</div>}
                </div>
              </div>
            ))}
          </div>
      }
      <Modal open={modal} onClose={()=>setModal(false)} title="Nouveau fournisseur / partenaire">
        <Input label="Raison sociale *" value={form.raisonSociale} onChange={e=>setForm(f=>({...f,raisonSociale:e.target.value}))}/>
        <Input label="SIRET" value={form.siret} onChange={e=>setForm(f=>({...f,siret:e.target.value}))}/>
        <Input label="Adresse *" value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Ville" value={form.ville} onChange={e=>setForm(f=>({...f,ville:e.target.value}))}/>
          <Input label="Téléphone" value={form.tel} onChange={e=>setForm(f=>({...f,tel:e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={()=>setModal(false)}>Annuler</Btn>
          <Btn onClick={save} disabled={!form.raisonSociale||!form.ville||saving}>{saving?<Spinner/>:"Enregistrer"}</Btn>
        </div>
      </Modal>

      {/* ── Modal Modifier fournisseur ── */}
      <Modal open={editModal} onClose={()=>{setEditModal(false);setEditForm(null);}} title="✏️ Modifier le fournisseur" width={480}>
        {editForm&&(<>
          <Input label="Raison sociale *" value={editForm.raisonSociale} onChange={e=>setEditForm(f=>({...f,raisonSociale:e.target.value}))}/>
          <Input label="SIRET" value={editForm.siret||""} onChange={e=>setEditForm(f=>({...f,siret:e.target.value}))}/>
          <Input label="Adresse" value={editForm.adresse||""} onChange={e=>setEditForm(f=>({...f,adresse:e.target.value}))}/>
          <div className="rg2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Ville" value={editForm.ville||""} onChange={e=>setEditForm(f=>({...f,ville:e.target.value}))}/>
            <Input label="Téléphone" value={editForm.tel||""} onChange={e=>setEditForm(f=>({...f,tel:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
            <Btn variant="secondary" onClick={()=>{setEditModal(false);setEditForm(null);}}>Annuler</Btn>
            <Btn onClick={async()=>{setEditSaving(true);try{await updatePartenaire({"Raison Sociale":editForm.raisonSociale,"SIRET":editForm.siret,"Adresse":editForm.adresse,"Ville":editForm.ville,"Telephone":editForm.tel});setPartenaires(prev=>prev.map(p=>p.raisonSociale===editForm.raisonSociale?{...p,...editForm}:p));showT("Fournisseur modifié !");setEditModal(false);setEditForm(null);}catch(e){showT("Erreur : "+e.message,false);}setEditSaving(false);}} disabled={!editForm.raisonSociale||editSaving}>{editSaving?<Spinner/>:"💾 Sauvegarder"}</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════
   RAPPORTS & PDF
══════════════════════════════════════ */
const RapportsPage = ({produits,categories,mouvements,entrees,sorties,beneficiaires,donateurs,partenaires}) => {
  const now = new Date();
  const [mois,setMois] = useState(now.getMonth()+1);
  const [annee,setAnnee] = useState(now.getFullYear());
  const [genPdf,setGenPdf] = useState(null);

  const genDatamart = () => {
    setGenPdf("datamart");
    setTimeout(()=>{
      datamartMensuel({mois,annee,produits,categories,mouvements,entrees,sorties,beneficiaires});
      setGenPdf(null);
    },200);
  };

  const moisNoms=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const mvtsMois = mouvements.filter(m=>{ const d=new Date(m.date||""); return d.getMonth()+1===mois&&d.getFullYear()===annee; });
  const entreesMois=entrees.filter(e=>{ const d=new Date(e.horodatage||""); return d.getMonth()+1===mois&&d.getFullYear()===annee; });
  const sortiesMois=sorties.filter(s=>{ const d=new Date(s.horodatage||""); return d.getMonth()+1===mois&&d.getFullYear()===annee; });
  const totalEntrees=mvtsMois.filter(m=>m.type!=="Sortie").reduce((s,m)=>s+(+m.qte||0),0);
  const totalSorties=mvtsMois.filter(m=>m.type==="Sortie").reduce((s,m)=>s+(+m.qte||0),0);

  return (
    <div className="page">
      <h1 style={{fontSize:26,color:"var(--green)",marginBottom:4}}>Rapports & Documents PDF</h1>
      <p style={{color:"var(--text2)",fontSize:13,marginBottom:22}}>Génération de documents officiels et rapports d'activité</p>

      {/* Datamart mensuel */}
      <div style={{background:"var(--card)",borderRadius:16,padding:22,boxShadow:"var(--shadow)",border:"1px solid var(--border)",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div>
            <h3 style={{fontSize:16,color:"var(--green)",marginBottom:3}}>📈 Datamart mensuel</h3>
            <p style={{fontSize:12,color:"var(--text2)"}}>Rapport d'activité complet avec KPIs, graphiques et tableaux</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <select value={mois} onChange={e=>setMois(+e.target.value)}
              style={{padding:"7px 11px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}>
              {moisNoms.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={annee} onChange={e=>setAnnee(+e.target.value)}
              style={{padding:"7px 11px",borderRadius:9,border:"1.5px solid var(--border)",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"var(--text)"}}>
              {[2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
            </select>
            <Btn onClick={genDatamart} disabled={genPdf==="datamart"}>
              {genPdf==="datamart"?<Spinner/>:"📄 Générer le PDF"}
            </Btn>
          </div>
        </div>
        {/* Aperçu chiffres */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {l:"Opérations entrées",v:entreesMois.length,c:"green"},
            {l:"Articles entrés",   v:totalEntrees,       c:"green"},
            {l:"Distributions",     v:sortiesMois.length, c:"amber"},
            {l:"Articles distribués",v:totalSorties,       c:"amber"},
          ].map(k=>(
            <div key={k.l} style={{background:`var(--${k.c}-light)`,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:`var(--${k.c})`,fontFamily:"'Lora',serif"}}>{k.v}</div>
              <div style={{fontSize:10,color:"var(--text2)",marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Autres documents */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[
          {icon:"📋",title:"Procès-verbaux d'entrée",desc:"Générés automatiquement après chaque enregistrement d'entrée de stock (Collecte, Dons, Caddie Solidaire).",page:"entrees"},
          {icon:"🧾",title:"Reçus donateurs & fournisseurs",desc:"Générés automatiquement après chaque entrée pour attestation du don ou de la livraison.",page:"entrees"},
          {icon:"📦",title:"Procès-verbaux de distribution",desc:"Générés automatiquement après chaque distribution. Inclut signature du bénéficiaire.",page:"distribution"},
          {icon:"🪪",title:"Cartes bénéficiaires",desc:"Générées depuis la liste des bénéficiaires. Format carte A6 avec infos essentielles et restrictions.",page:"beneficiaires"},
        ].map(d=>(
          <div key={d.title} style={{background:"var(--card)",borderRadius:14,padding:18,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
            <div style={{fontSize:28,marginBottom:8}}>{d.icon}</div>
            <h4 style={{fontSize:14,color:"var(--green)",marginBottom:6}}>{d.title}</h4>
            <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,marginBottom:10}}>{d.desc}</p>
            <div style={{fontSize:11,color:"var(--text2)",background:"var(--bg)",borderRadius:7,padding:"6px 10px"}}>
              ℹ️ Disponible via la page <b>{d.page==="entrees"?"Entrées":d.page==="distribution"?"Distribution":"Bénéficiaires"}</b>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   ACCÈS REFUSÉ
══════════════════════════════════════ */
const AccessDenied = () => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",textAlign:"center"}}>
    <div style={{fontSize:56,marginBottom:14}}>🔒</div>
    <h2 style={{fontSize:22,color:"var(--green)",marginBottom:8}}>Accès réservé aux membres</h2>
    <p style={{color:"var(--text2)",fontSize:13}}>Cette section est accessible uniquement aux membres de la coordination.</p>
  </div>
);

/* ══════════════════════════════════════
   APP PRINCIPALE
══════════════════════════════════════ */
export default function App() {
  const [user,setUser]           = useState(null);
  const [page,setPage]           = useState("dashboard");
  const [loading,setLoading]     = useState(false);
  const [apiError,setApiError]   = useState(null);
  const [sidebarOpen,setSidebarOpen] = useState(false);

  const [produits,setProduits]           = useState([]);
  const [categories,setCategories]       = useState([]);
  const [beneficiaires,setBeneficiaires] = useState([]);
  const [benevoles,setBenevoles]         = useState(BENEVOLES_LOCAL);
  const [mouvements,setMouvements]       = useState([]);
  const [entrees,setEntrees]             = useState([]);
  const [sorties,setSorties]             = useState([]);
  const [donateurs,setDonateurs]         = useState([]);
  const [partenaires,setPartenaires]     = useState([]);

  // Chargement depuis Google Sheets
  useEffect(() => {
    const url = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!url) { setApiError("VITE_APPS_SCRIPT_URL non défini — mode local."); return; }
    setLoading(true);
    loadAll()
      .then(res => {
        if (!res?.data) return;
        const d = res.data;

        const prods = d.produits?.length    ? d.produits.map(mapProduit)         : [];
        const mvts  = d.mouvements?.length  ? d.mouvements.map(mapMouvement)     : [];

        // ── Recalcul du stock depuis la table Mouvements ─────────────────
        // Le stock dans la feuille Produits (Quantité_stock) n'est pas mis à jour
        // par Apps Script à chaque mouvement. On le recalcule ici :
        //   • Entrées (type ≠ "Sortie") → +qte
        //   • Sorties (type === "Sortie") → -qte
        // On fait la correspondance via le libellé (Produits = label dans Mouvements)
        const stockMap = {};
        mvts.forEach(m => {
          const prod = prods.find(p => p.label === m.produit || p.ref === m.produit);
          if (!prod) return;
          const delta = m.type === "Sortie" ? -(m.qte || 0) : +(m.qte || 0);
          stockMap[prod.ref] = (stockMap[prod.ref] || 0) + delta;
        });
        // Appliquer le stock calculé (on garde p.stock si aucun mouvement trouvé)
        const prodsAvecStock = prods.map(p => ({
          ...p,
          stock: stockMap[p.ref] !== undefined ? Math.max(0, stockMap[p.ref]) : p.stock,
        }));

        setProduits(prodsAvecStock);
        setMouvements(mvts);
        if (d.categories?.length)    setCategories(d.categories.map(mapCategorie));
        if (d.beneficiaires?.length) setBeneficiaires(d.beneficiaires.map(mapBeneficiaire));
        if (d.entrees?.length)       setEntrees(d.entrees.map(mapEntree));
        if (d.sorties?.length)       setSorties(d.sorties.map(mapSortie));
        if (d.donateurs?.length)     setDonateurs(d.donateurs.map(mapDonateur));
        if (d.partenaires?.length)   setPartenaires(d.partenaires.map(mapPartenaire));
      })
      .catch(e => setApiError("Erreur chargement : " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const alertCount = useMemo(()=>produits.filter(p=>p.actif&&p.stock<=p.seuil).length,[produits]);

  const onLogin  = u => { setUser(u); setPage("dashboard"); setSidebarOpen(false); };
  const onLogout = () => { setUser(null); setPage("dashboard"); };
  const goPage   = p  => { setPage(p); setSidebarOpen(false); };

  const shared = {produits,setProduits,categories,setCategories,beneficiaires,setBeneficiaires,
    benevoles,setBenevoles,mouvements,setMouvements,entrees,setEntrees,
    sorties,setSorties,donateurs,setDonateurs,partenaires,setPartenaires,user};

  const PAGES = {
    dashboard:    <Dashboard {...shared} setPage={setPage}/>,
    produits:     <ProduitsPage {...shared}/>,
    categories:   isMembre(user)?<CategoriesPage {...shared}/>:<AccessDenied/>,
    entrees:      <EntreesPage {...shared}/>,
    distribution: <DistributionPage {...shared}/>,
    beneficiaires:<BeneficiairesPage {...shared}/>,
    benevoles:    isMembre(user)?<BenevolesPage {...shared}/>:<AccessDenied/>,
    donateurs:    <DonateursPage {...shared}/>,
    fournisseurs: <FournisseursPage {...shared}/>,
    rapports:     <RapportsPage {...shared}/>,
  };

  // Écran de chargement
  if(loading) return (
    <>
      <Css/>
      <div style={{minHeight:"100vh",background:"var(--green)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
        <div style={{width:56,height:56,borderRadius:14,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>✝️</div>
        <div style={{fontFamily:"'Lora',serif",color:"#fff",fontSize:17}}>Chargement en cours…</div>
        <div style={{width:180,height:3,background:"rgba(255,255,255,.1)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",background:"rgba(255,255,255,.5)",width:"60%",borderRadius:2,animation:"progress 1.2s ease infinite"}}/>
        </div>
        <style>{`@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
      </div>
    </>
  );

  if(!user) return (
    <>
      <Css/>
      {apiError&&(
        <div style={{background:"var(--amber-light)",borderBottom:"2px solid var(--amber)",padding:"10px 20px",
          display:"flex",gap:8,alignItems:"center",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
          ⚠️ <b>Hors-ligne :</b> {apiError}
        </div>
      )}
      <LoginPage onLogin={onLogin}/>
    </>
  );

  return (
    <>
      <Css/>
      {apiError&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:500,background:"var(--amber-light)",
          borderBottom:"2px solid var(--amber)",padding:"8px 20px",
          display:"flex",gap:8,alignItems:"center",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
          ⚠️ <b>Hors-ligne :</b> {apiError}
          <button onClick={()=>setApiError(null)} style={{marginLeft:"auto",border:"none",background:"none",cursor:"pointer",fontSize:16,color:"var(--amber)"}}>×</button>
        </div>
      )}
      <div className="mobile-header">
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:8,width:36,height:36,cursor:"pointer",fontSize:20,color:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>☰</button>
        <span style={{fontFamily:"'Lora',serif",color:"#fff",fontWeight:700,fontSize:13}}>SEF — Les Mureaux</span>
      </div>
      <div style={{display:"flex",marginTop:apiError?34:0}}>
        <Sidebar page={page} setPage={goPage} user={user} onLogout={onLogout} alertCount={alertCount} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>
        <main className="main-content" style={{marginLeft:240,flex:1,minHeight:"100vh",padding:"28px 32px",maxWidth:"calc(100vw - 240px)"}}>
          {PAGES[page]||PAGES.dashboard}
        </main>
      </div>
    </>
  );
}
