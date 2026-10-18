/* ===== Itachicord v4 ===== */
(function(){
"use strict";
const Q=s=>document.querySelector(s);
const E=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- Kopieren ---------- */
async function copy(t,msg){
  try{await navigator.clipboard.writeText(t)}
  catch(e){const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;opacity:0";document.body.append(a);a.select();try{document.execCommand("copy")}catch(_){}a.remove()}
  toast(msg||"Kopiert");
}
window.copyText=copy;
const uidOf=n=>((typeof U!="undefined"&&U[n])||{}).uid||(typeof ME!="undefined"&&ME&&ME.name==n?ME.uid:"")||"";

/* ---------- Rechtsklick-/Long-Press-Menü ---------- */
function ctxClose(){const m=Q("#ctxm");if(m)m.remove()}
function ctxOpen(n,x,y){
  ctxClose();
  const me=typeof ME!="undefined"&&ME&&ME.name==n,id=uidOf(n);
  const m=document.createElement("div");m.id="ctxm";
  m.innerHTML=`<div class="ct">${E(n)}</div>`+
    (id?`<button data-a="id">🆔 ID kopieren <small style="margin-left:auto;color:var(--mu)">${E(id.slice(0,6))}…</small></button>`:"")+
    `<button data-a="nm">📋 Benutzernamen kopieren</button><hr><button data-a="pf">👤 Profil ansehen</button>`+
    (me?"":`<button data-a="dm">💬 Nachricht senden</button>`);
  document.body.append(m);
  const w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+"px";m.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+"px";
  m.onclick=e=>{
    const b=e.target.closest("button");if(!b)return;const a=b.dataset.a;ctxClose();
    if(a=="id")copy(id,"ID kopiert: "+id);
    else if(a=="nm")copy(n,"Name kopiert");
    else if(a=="pf")card(n);
    else if(a=="dm")dmTo(n);
  };
}
function nameAt(el){
  if(!el||!el.closest)return null;
  if(el.closest("#me")&&typeof ME!="undefined"&&ME)return ME.name;
  const c=el.closest("[onclick*=\"card('\"]");
  if(c){const m=/card\('([^']+)'\)/.exec(c.getAttribute("onclick")||"");if(m)return m[1]}
  const m=el.closest(".m");
  if(m&&el.closest(".n,.av")){const a=m.querySelector(".av[onclick]");const r=a&&/card\('([^']+)'\)/.exec(a.getAttribute("onclick")||"");if(r)return r[1]}
  return null;
}
document.addEventListener("contextmenu",e=>{
  if(e.target.closest("input,textarea,#ctxm"))return;
  const n=nameAt(e.target);if(!n)return;
  e.preventDefault();ctxOpen(n,e.clientX,e.clientY);
});
// Handy/Tablet: lange drücken
let LP=null,LX=0,LY=0;
document.addEventListener("touchstart",e=>{
  const t=e.touches[0];LX=t.clientX;LY=t.clientY;clearTimeout(LP);
  const n=nameAt(e.target);if(!n)return;
  LP=setTimeout(()=>{ctxOpen(n,LX,LY);try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}},550);
},{passive:true});
["touchend","touchcancel"].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(LP),{passive:true}));
document.addEventListener("touchmove",e=>{const t=e.touches[0];if(Math.abs(t.clientX-LX)>10||Math.abs(t.clientY-LY)>10)clearTimeout(LP)},{passive:true});
document.addEventListener("pointerdown",e=>{if(!e.target.closest("#ctxm"))ctxClose()});
addEventListener("scroll",ctxClose,true);addEventListener("resize",ctxClose);
addEventListener("keydown",e=>{if(e.key=="Escape"){ctxClose();vzoomOff()}});

/* ---------- ID-Zeile in Profilkarten ---------- */
function uidRow(n){
  const id=uidOf(n);if(!id)return"";
  return `<div class="uidrow" data-uid="${E(id)}" title="Klicken oder Rechtsklick: ID kopieren"><span>ID</span><b>${E(id)}</b><small>kopieren</small></div>`;
}
document.addEventListener("click",e=>{const r=e.target.closest(".uidrow");if(r)copy(r.dataset.uid,"ID kopiert")});
document.addEventListener("contextmenu",e=>{const r=e.target.closest(".uidrow");if(r){e.preventDefault();copy(r.dataset.uid,"ID kopiert")}},true);

const _card=window.card;
if(typeof _card=="function")window.card=function(n){
  const r=_card.apply(this,arguments);
  try{const mc=Q("#mc");if(mc)mc.insertAdjacentHTML("beforeend",uidRow(n))}catch(e){}
  return r;
};

/* ---------- Hintergrundbild ---------- */
function bgApply(){
  const d=localStorage.bg,r=document.documentElement.style;
  if(d){r.setProperty("--bgimg",`url("${d}")`);r.setProperty("--bgdim",String((+localStorage.bgd||55)/100))}
  else{r.removeProperty("--bgimg");r.removeProperty("--bgdim")}
  document.body.classList.toggle("hasbg",!!d);
}
function bgPrep(f){
  return new Promise((ok,no)=>{
    if(!/^image\//.test(f.type))return no(new Error("Bitte ein Bild wählen"));
    if(f.size>30e6)return no(new Error("Bild zu groß (max. 30 MB)"));
    const u=URL.createObjectURL(f),im=new Image();
    im.onload=()=>{
      for(const[mx,q]of[[1920,.82],[1600,.74],[1280,.68],[960,.6]]){
        const s=Math.min(1,mx/Math.max(im.width,im.height)),c=document.createElement("canvas");
        c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
        c.getContext("2d").drawImage(im,0,0,c.width,c.height);
        const out=c.toDataURL("image/jpeg",q);
        try{localStorage.bg=out;URL.revokeObjectURL(u);return ok()}catch(e){localStorage.removeItem("bg")}
      }
      URL.revokeObjectURL(u);no(new Error("Bild zu groß für den Speicher"));
    };
    im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Bild konnte nicht gelesen werden"))};
    im.src=u;
  });
}
function bgBlock(){
  const has=!!localStorage.bg;
  return `<div class="bgset" id="bgset"><b>🖼 Hintergrundbild</b>
<div class="bgp" id="bgp" style="${has?`background-image:url('${localStorage.bg}')`:""}">${has?"":"Kein Hintergrundbild"}</div>
<label>Abdunkeln: <span id="bgdv">${localStorage.bgd||55}</span> %<input type="range" id="bgd" min="0" max="90" value="${localStorage.bgd||55}"></label>
<div class="bgr"><button id="bgpick">Bild wählen</button><button id="bgdel" ${has?"":"disabled"}>Entfernen</button></div>
<input type="file" id="bgf" accept="image/*" class="hide"></div>`;
}
function bgWire(){
  const f=Q("#bgf"),p=Q("#bgp");if(!f)return;
  Q("#bgpick").onclick=()=>f.click();
  f.onchange=async()=>{
    const x=f.files&&f.files[0];if(!x)return;
    try{await bgPrep(x);bgApply();p.style.backgroundImage=`url('${localStorage.bg}')`;p.textContent="";Q("#bgdel").disabled=false;toast("Hintergrundbild gesetzt")}
    catch(e){toast(e.message||"Fehler")}
    f.value="";
  };
  Q("#bgdel").onclick=()=>{localStorage.removeItem("bg");bgApply();p.style.backgroundImage="";p.textContent="Kein Hintergrundbild";Q("#bgdel").disabled=true;toast("Hintergrundbild entfernt")};
  Q("#bgd").oninput=e=>{localStorage.bgd=e.target.value;Q("#bgdv").textContent=e.target.value;bgApply()};
}
bgApply();

/* ---------- Profil-/Einstellungsfenster erweitern ---------- */
const _prof=window.prof;
if(typeof _prof=="function")window.prof=function(){
  const r=_prof.apply(this,arguments);
  try{
    const mc=Q("#mc"),h=mc&&mc.querySelector("h3");
    if(h){
      const x=document.createElement("div");x.style.cssText="display:flex;flex-direction:column;gap:10px";
      x.innerHTML=uidRow(ME.name)+bgBlock()+(ME.admin?`<button class="pri" onclick="location.href='/management.html'">🛡 Management öffnen</button>`:"");
      h.after(x);bgWire();
    }
  }catch(e){console.error(e)}
  return r;
};

/* ---------- Call: Videos vergrößern ---------- */
function vzoomOff(){
  document.querySelectorAll("#vg video.vzoom").forEach(v=>v.classList.remove("vzoom"));
  const b=Q("#vzb");if(b)b.remove();const c=Q("#vzc");if(c)c.remove();
}
function vzoomOn(v){
  vzoomOff();v.classList.add("vzoom");
  const b=document.createElement("div");b.id="vzb";b.onclick=vzoomOff;
  const c=document.createElement("div");c.id="vzc";
  c.innerHTML=`<button title="Vollbild" aria-label="Vollbild">⛶</button><button title="Schließen" aria-label="Schließen">✕</button>`;
  c.children[0].onclick=()=>{try{(v.requestFullscreen||v.webkitRequestFullscreen).call(v)}catch(e){}};
  c.children[1].onclick=vzoomOff;
  document.body.append(b,c);
}
document.addEventListener("click",e=>{
  const v=e.target.closest&&e.target.closest("#vg video");if(!v)return;
  v.classList.contains("vzoom")?vzoomOff():vzoomOn(v);
});
document.addEventListener("dblclick",e=>{
  const v=e.target.closest&&e.target.closest("#vg video");if(!v)return;
  try{(v.requestFullscreen||v.webkitRequestFullscreen).call(v)}catch(_){}
});
// Wenn ein Video aus dem Call verschwindet, Zoom schließen
new MutationObserver(()=>{if(Q("#vzb")&&!Q("#vg video.vzoom"))vzoomOff()}).observe(document.body,{childList:true,subtree:true});


/* ---------- Sprache-Knopf nur in DMs sowie Sprach- und Stage-Kanälen ---------- */
function callOk(c){
  if(!c)return true;c=String(c);if(c.startsWith("dm:"))return true;
  const x=typeof srv!="undefined"&&srv&&srv.channels.find(k=>k.id==(c.split("/")[1]||"").split("~")[0]);
  return !!x&&(x.type=="voice"||x.type=="stage");
}
setInterval(()=>{
  try{const b=document.querySelector('#hd button[title="Sprache"]');if(b)b.classList.toggle("hide",!callOk(typeof ch!="undefined"?ch:null))}catch(e){}
},300);

/* ---------- Gebannt: nur lesen ---------- */
let BN=null;
function banUI(){
  if(typeof ME=="undefined"||!ME)return;
  const b=!!ME.banned;
  if(b===BN&&(!b||Q("#banbar")))return;BN=b;
  document.body.classList.toggle("banned",b);
  let bar=Q("#banbar");
  if(b){
    if(!bar){bar=document.createElement("div");bar.id="banbar";bar.setAttribute("role","alert");const t=Q("#rpb")||Q("#in");t&&t.before(bar)}
    bar.textContent="🚫 Dein Konto wurde gesperrt. Du kannst Nachrichten nur noch lesen – Schreiben und Server erstellen ist nicht möglich."+(ME.banreason?" Grund: "+ME.banreason:"");
  }else if(bar)bar.remove();
}
async function banPoll(){
  try{
    if(typeof T=="undefined"||!T||typeof ME=="undefined"||!ME)return;
    const r=await api("me");
    if(r&&r.me){ME.banned=!!r.me.banned;ME.banreason=r.me.banreason||"";ME.admin=!!r.me.admin;ME.uid=r.me.uid;banUI()}
  }catch(e){}
}
setInterval(banUI,800);
setInterval(banPoll,20000);
})();
