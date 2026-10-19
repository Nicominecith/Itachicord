/* ===== Pulsecord v2: Freundschaftsanfragen, Servermenü, Servereinstellungen, schnelleres Laden ===== */
const IMG=(t,i,v,n)=>"/api?a=img&t="+t+"&i="+encodeURIComponent(i)+"&v="+(v||0)+(n?"&n="+encodeURIComponent(n):"");
const nu=u=>{u.avatar=u.hasav?IMG("av",u.name,u.imv):"";u.banner=u.hasbn?IMG("bn",u.name,u.imv):"";return u};
const ns=s=>{s.icon=s.hasicon?IMG("si",s.id,s.iv):"";for(const n in s.prof||{}){const p=s.prof[n];p.avatar=p.hasav?IMG("pa",s.id,p.v,n):"";p.banner=p.hasbn?IMG("pb",s.id,p.v,n):""}return s};
function setServers(l){S=l.map(ns);EMO={};SND={};S.forEach(v=>{Object.assign(EMO,v.emoji||{});Object.assign(SND,v.sounds||{})})}
const isOwn=()=>srv&&srv.owner==ME.name,isMod=()=>isOwn()||(srv.mods||[]).includes(ME.name);
const SMU=()=>srv&&localStorage["mu"+srv.id];
const cpy=t=>{try{navigator.clipboard.writeText(t);toast("Kopiert ✔")}catch(e){toast("Bitte manuell kopieren")}};

/* ---------- Start / Laden ---------- */
async function init(){
  if(!T)return;$("#auth").classList.add("hide");document.documentElement.classList.add("hast");
  const pf=window.__pf;window.__pf=null;
  const [r,us]=await(pf||Promise.all([api("me"),api("users")]));
  if(!r||!r.me){if(r&&r.error=="auth"){localStorage.removeItem("t");location.reload();return}$("#boot").innerHTML='<div>Verbindung fehlgeschlagen</div><button class="pri" onclick="location.reload()">Erneut versuchen</button>';return}
  ME=nu(r.me);setServers(r.servers);(Array.isArray(us)?us:[]).forEach(u=>U[u.name]=nu(u));
  document.documentElement.style.setProperty("--red",ME.color||"#7b6cff");
  if(!ch)showHome();rail();me();document.documentElement.classList.remove("hast");
  try{Notification.requestPermission()}catch(e){}
  joinLink();
}
async function refresh(){
  const r=await api("me");if(!r.me)return;ME=nu(r.me);setServers(r.servers);
  U[ME.name]=Object.assign(U[ME.name]||{},ME,{pres:ME.pst=="invisible"?"offline":ME.pst||"online"});me();
  if(srv){const s=S.find(x=>x.id==srv.id);if(s){srv=s;srvUi()}else{srv=null;ch=null;showHome();return}}
  rail();if(!srv&&!FV)home();
}
function upd(r){const i=S.findIndex(x=>x.id==r.id);if(i<0)return;S[i]=r;setServers(S);if(srv&&srv.id==r.id){srv=S[i];if(ch&&ch.startsWith(srv.id+"/")&&!srv.channels.some(c=>c.id==ch.slice(srv.id.length+1).split("~")[0])){ch=null;openSrv(srv.id)}else srvUi()}else rail()}
async function joinLink(){
  const j=new URLSearchParams(location.search).get("join");if(!j)return;history.replaceState(0,"","/");
  const id=j.replace(/\W/g,"");if(S.some(s=>s.id==id))return openSrv(id);
  if(!(await yes("Server beitreten","Möchtest du diesem Server beitreten?")))return;
  const r=await api("join",{id});if(r.error)return toast(r.error);await refresh();openSrv(id);
}
async function userPoll(){
  if(!T||!ME||document.hidden)return;const u=await api("users");if(!Array.isArray(u))return;
  u.forEach(x=>U[x.name]=nu(x));if(FV)frPage(true);if(!srv)home();else{const m=$("#mlist");if(m)m.innerHTML=memBlock()}
}

/* ---------- Freunde: Anfrage senden, annehmen, ablehnen ---------- */
let FT="online",FV=false;
const pend=()=>(ME.fin||[]).length;
const fst=n=>(ME.friends||[]).includes(n)?"friend":(ME.fin||[]).includes(n)?"in":(ME.fout||[]).includes(n)?"out":(ME.blocked||[]).includes(n)?"blocked":"none";
const FI=n=>({friend:"⭐",in:"📨",out:"⏳",blocked:"🚫",none:"☆"})[fst(n)];
function setRels(r){
  ME.friends=r.friends;ME.fin=r.fin;ME.fout=r.fout;ME.blocked=r.blocked;
  document.querySelectorAll(".fbd").forEach(e=>{e.textContent=pend();e.classList.toggle("hide",!pend())});
  rail();if(!srv)home();
  const h=$("#hdf");if(h&&ch&&ch.startsWith("dm:"))h.textContent=FI(ch.slice(3).split(":").find(x=>x!=ME.name));
}
async function fdo(op,n){
  const r=await api(op,{target:n});if(r.error){toast(r.error);sfx("err");return r}
  setRels(r);toast({frq:r.auto?`Du und ${n} seid jetzt befreundet 🎉`:`Freundschaftsanfrage an ${n} gesendet`,fac:`Du und ${n} seid jetzt befreundet 🎉`,fdec:"Erledigt",frm:`${n} wurde entfernt`}[op]);
  sfx(op=="fac"||r.auto?"join":"send");frPage(true);return r;
}
async function fremove(n){if(await yes("Freund entfernen",`Möchtest du ${n} aus deiner Freundesliste entfernen?`))fdo("frm",n)}
async function fbtn(n){
  const s=fst(n);if(s=="none")return fdo("frq",n);if(s=="in")return fdo("fac",n);
  if(s=="out"){if(await yes("Anfrage zurückziehen",`Anfrage an ${n} abbrechen?`))fdo("fdec",n);return}
  if(s=="friend")return fremove(n);toast("Nutzer ist blockiert – erst entsperren");
}
async function rel(op,t){const r=await api("rel",{op,target:t});if(r.error)return toast(r.error);setRels(r);toast(r.blocked.includes(t)?`${t} blockiert`:`${t} entsperrt`);last="";if(ch)poll();frPage(true)}
async function faddGo(){
  const i=$("#fadd"),o=$("#fres"),n=i.value.trim().replace(/^@/,"").toLowerCase();
  if(!n){o.className="fres err";o.textContent="Bitte gib einen Benutzernamen ein.";return}
  const r=await api("frq",{target:n});
  if(r.error){o.className="fres err";o.textContent=r.error;sfx("err");return}
  setRels(r);o.className="fres ok";o.textContent=r.auto?`Du und ${n} seid jetzt befreundet! 🎉`:`Freundschaftsanfrage an ${n} wurde gesendet.`;i.value="";sfx("send");
}
async function relpoll(){
  if(!T||!ME)return;const r=await api("rels");if(r.error||!r.friends)return;
  const key=x=>JSON.stringify([x.friends||[],x.fin||[],x.fout||[],x.blocked||[]]);if(key(r)==key(ME))return;
  const nin=r.fin.filter(x=>!(ME.fin||[]).includes(x)),nfr=r.friends.filter(x=>!(ME.friends||[]).includes(x)),q=ME.pst!="dnd";
  setRels(r);
  nin.forEach(n=>{const x={u:n,k:"friend",tx:"hat dir eine Freundschaftsanfrage gesendet",ch:"@friends"};if(q&&!document.hidden&&window.ntfPop)ntfPop(x);else if(!q||!window.ntfPop)toast("📨 "+n+" hat dir eine Freundschaftsanfrage gesendet");q&&sfx("msg");document.hidden&&q&&window.ntfNative&&ntfNative(x)});
  nfr.forEach(n=>{toast("✅ "+n+" ist jetzt dein Freund");q&&sfx("join")});
  if(FV)frPage(true);
}
const fbt=(i,t,fn,c="")=>`<button class="fb ${c}" title="${t}" onclick="event.stopPropagation();${fn}">${i}</button>`;
const fsub=n=>{const u=U[n]||{};return esc(u.activity?"🎮 "+u.activity:u.status||PL[PR(n)])};
const frow=(n,sub,acts)=>`<div class="fr" onclick="card('${n}')">${av(n)}<div class="fi"><b class="${ds(U[n])}">${esc(n)}</b><small>${sub}</small></div><div class="fa">${acts}</div></div>`;
const srt=l=>[...l].sort((a,b)=>((PR(b)!="offline")-(PR(a)!="offline"))||a.localeCompare(b));
function frPage(soft){
  if(!FV||!ME)return;const f=$("#fadd");
  if(soft&&FT=="add"&&f&&(f.value||document.activeElement==f))return;
  const F=ME.friends||[],In=ME.fin||[],Out=ME.fout||[],B=ME.blocked||[],on=F.filter(n=>PR(n)!="offline");
  const tabs=[["online","Online"],["all","Alle"],["pending","Ausstehend"],["blocked","Blockiert"]];
  const empty=(i,t,d)=>`<div class="empty"><b>${i}</b>${t}<br><small>${d}</small></div>`;
  const fr=n=>frow(n,fsub(n),fbt("💬","Nachricht",`dmTo('${n}')`)+fbt("✕","Freund entfernen",`fremove('${n}')`,"no"));
  let h=`<div class="ftabs">${tabs.map(([k,l])=>`<button class="${FT==k?"on":""}" onclick="FT='${k}';frPage()">${l}${k=="pending"&&In.length?`<i class="bdg">${In.length}</i>`:""}</button>`).join("")}<button class="fadd ${FT=="add"?"on":""}" onclick="FT='add';frPage()">＋ Freund hinzufügen</button></div>`;
  if(FT=="online")h+=on.length?`<h4>Online — ${on.length}</h4>`+srt(on).map(fr).join(""):empty("🌙","Gerade ist keiner deiner Freunde online.","Schau unter „Alle“ vorbei oder füge neue Freunde hinzu.");
  else if(FT=="all")h+=F.length?`<h4>Alle Freunde — ${F.length}</h4>`+srt(F).map(fr).join(""):empty("⭐","Noch keine Freunde.","Tippe oben auf „Freund hinzufügen“ und sende eine Anfrage.");
  else if(FT=="pending"){
    h+=In.length?`<h4>Eingehende Anfragen — ${In.length}</h4>`+In.map(n=>frow(n,"Möchte mit dir befreundet sein",fbt("✔","Annehmen",`fdo('fac','${n}')`,"ok")+fbt("✕","Ablehnen",`fdo('fdec','${n}')`,"no"))).join(""):"";
    h+=Out.length?`<h4>Gesendete Anfragen — ${Out.length}</h4>`+Out.map(n=>frow(n,"Wartet auf Antwort …",fbt("✕","Anfrage zurückziehen",`fdo('fdec','${n}')`,"no"))).join(""):"";
    if(!In.length&&!Out.length)h+=empty("📭","Keine offenen Anfragen.","Neue Anfragen erscheinen hier – mit Benachrichtigung.");
  }
  else if(FT=="blocked")h+=B.length?`<h4>Blockiert — ${B.length}</h4>`+B.map(n=>frow(n,"Blockiert",fbt("↩","Entsperren",`rel('block','${n}')`))).join(""):empty("🚫","Du hast niemanden blockiert.","");
  else{
    const sug=Object.keys(U).filter(n=>n!=ME.name&&fst(n)=="none").slice(0,12);
    h+=`<div class="fbox"><h3>Freund hinzufügen</h3><div class="dm">Gib den Benutzernamen ein. Die Person muss deine Anfrage annehmen, bevor ihr befreundet seid.</div><div class="frm"><input id="fadd" placeholder="Benutzername" autocapitalize="none" autocomplete="off" spellcheck="false" onkeydown="if(event.key=='Enter')faddGo()"><button class="pri" onclick="faddGo()">Anfrage senden</button></div><div id="fres" class="fres"></div></div>`;
    if(sug.length)h+=`<h4>Nutzer auf Pulsecord</h4>`+sug.map(n=>frow(n,fsub(n),fbt("＋","Anfrage senden",`fdo('frq','${n}')`,"ok"))).join("");
  }
  $("#msgs").innerHTML=h;if(FT=="add"&&!soft)setTimeout(()=>$("#fadd")&&$("#fadd").focus(),50);
}
function showHome(tab){
  if(typeof tab=="string")FT=tab;
  document.body.classList.add("onhome");ch=null;srv=null;last="";FV=true;smx();
  $("#side").classList.remove("open");$("#in").classList.add("hide");$("#rpb").textContent="";
  $("#hd").innerHTML=`<button class="hb" onclick="$('#side').classList.toggle('open')">☰</button><b>👥 Freunde</b>`;
  home();frPage();
}
function rail(){
  const n=ME?pend():0;
  $("#rail").innerHTML=`<div class="ic ${!srv?"on":""}" onclick="showHome()" style="background:var(--red)" title="Start & Freunde">👁${n?`<i class="bdg">${n}</i>`:""}</div>`
  +S.map(s=>`<div class="ic ${srv&&srv.id==s.id?"on":""} ${s.icon?"hi":""}" onclick="openSrv('${s.id}')" title="${esc(s.name)}" ${s.icon?`style="background-image:url('${s.icon}')"`:""}>${s.icon?"":esc(s.name[0]).toUpperCase()}</div>`).join("")
  +`<div class="ic add" onclick="addSrv()" title="Server erstellen oder beitreten">+</div>`;
}
function home(){
  srv=null;smx();$("#st").innerHTML='<div class="shd static"><span class="nm">Direktnachrichten</span></div>';
  const L=(ME.dms||[]).filter(n=>!(ME.blocked||[]).includes(n)),p=pend();
  $("#list").innerHTML=`<div class="it ${!ch?"on":""}" onclick="showHome()">👥 <span class="nm">Freunde</span>${p?`<i class="bdg fbd">${p}</i>`:""}</div><div class="sec">Direktnachrichten</div>`
  +(L.map(n=>`<div class="it ${ch==dm(n)?"on":""}" onclick="open_('${dm(n)}','@${n}')">${av(n)}<span class="nm">${esc(n)}</span><button class="x" title="Schließen" onclick="event.stopPropagation();dmx('${n}')">✕</button></div>`).join("")||`<div class="dm" style="padding:10px 12px;font-size:13px">Noch keine Unterhaltungen. Öffne das Profil eines Freundes und schreib ihm.</div>`);
  rail();
}
function card(n){
  const u=U[n]||{name:n},o=sp(n),ba=o.banner||u.banner,s=fst(n);
  const F={none:`<button onclick="cfr('frq','${n}')">⭐ Freundschaftsanfrage senden</button>`,out:`<button onclick="cfr('fdec','${n}')">⏳ Anfrage zurückziehen</button>`,in:`<button class="pri" onclick="cfr('fac','${n}')">✔ Annehmen</button><button onclick="cfr('fdec','${n}')">✕ Ablehnen</button>`,friend:`<button onclick="cfr('frm','${n}')">✅ Befreundet · Entfernen</button>`,blocked:""}[s];
  modal(`<div style="height:100px;border-radius:14px;background:${ba?`url('${ba}') center/cover,`:""}${u.color||"#7b6cff"}"></div><div style="display:flex;gap:10px;align-items:center">${av(n)}<h3 class="${ds(u)}" style="margin:0">${esc(o.name||u.name)} ${badge(u)}</h3></div><small>${esc(u.pron||"")} ${u.created?"· Mitglied seit "+new Date(u.created).toLocaleDateString():""}</small><div>${esc(o.bio||u.bio||"")}</div><div style="color:var(--mu)">${esc(u.activity?"🎮 "+u.activity:u.status||"")}</div><div>${conns2(u)}</div>${n==ME.name?"":`<div class="hr"><button class="pri" onclick="dmTo('${n}')">💬 Nachricht</button>${F}<button onclick="cblock('${n}')">${s=="blocked"?"✅ Entsperren":"🚫 Blockieren"}</button></div>`}`);
}
async function cfr(op,n){if(op=="frm"&&!(await yes("Freund entfernen",`Möchtest du ${n} aus deiner Freundesliste entfernen?`)))return;const r=await fdo(op,n);if(r&&!r.error)card(n)}
async function cblock(n){await rel("block",n);card(n)}

/* ---------- Server: Kanalliste, Mitglieder, Kopfzeile ---------- */
const vis=()=>{const mod=isMod();return srv.channels.filter(c=>!(c.view&&!mod&&!(c.view!="mods"&&(srv.roles||{})[ME.name]?.n==c.view)))};
const chl=()=>{
  const V=vis(),own=isOwn(),cats=[...new Set([...(srv.cats||[]),...V.map(c=>c.cat||"")])].filter(Boolean);
  const item=c=>`<div class="it ${ch==srv.id+"/"+c.id?"on":""}" onclick="${c.type=="voice"||c.type=="stage"?"vch":"open_"}('${srv.id}/${c.id}','# ${c.name}')">${c.nsfw?"🔞":IC[c.type]||"#"} <span class="nm">${esc(c.name)}</span>${own?`<button class="x gear" title="Kanal bearbeiten" onclick="event.stopPropagation();ssets('ch')">⚙</button>`:""}</div>`+(c.type=="voice"?(VL[c.id]||[]).map(u=>`<div class="it vu">${av(u)}${esc(u)}</div>`).join(""):"");
  let o=V.filter(c=>!c.cat).map(item).join("");
  for(const k of cats){const col=localStorage["c_"+srv.id+k];o+=`<div class="cat" data-c="${esc(k)}" onclick="tcat(this)"><span>${col?"▸":"▾"} ${esc(k).toUpperCase()}</span>${own?`<button class="x pl" title="Kanal in dieser Kategorie erstellen" onclick="event.stopPropagation();mkch(this.parentNode.dataset.c)">＋</button>`:""}</div>`+(col?"":V.filter(c=>c.cat==k).map(item).join(""))}
  return o||'<div class="dm" style="padding:10px 12px">Keine Kanäle sichtbar.</div>';
};
function tcat(e){const k="c_"+srv.id+e.dataset.c;localStorage[k]=localStorage[k]?"":1;srvUi()}
function tmem(){const k="mc"+srv.id;localStorage[k]=localStorage[k]?"":1;srvUi()}
const extras=()=>srv.welcome||(srv.events||[]).length?`<div class="wel">${srv.welcome?esc(srv.welcome):""}${(srv.events||[]).map(e=>`<div>📅 <b>${esc(e.title)}</b> ${esc(e.time)}</div>`).join("")}</div>`:"";
function memBlock(){
  const col=localStorage["mc"+srv.id],ms=srv.members,on=ms.filter(m=>PR(m)!="offline"),off=ms.filter(m=>PR(m)=="offline");
  const row=m=>{const r=(srv.roles||{})[m];return `<div class="mem ${PR(m)=="offline"?"off":""}" onclick="card('${m}')">${av(m)}<span class="nm" style="${r?"color:"+r.c:""}">${m==srv.owner?"👑 ":(srv.mods||[]).includes(m)?"🛡 ":""}${esc(sp(m).name||m)}</span></div>`};
  return `<div class="cat" onclick="tmem()"><span>${col?"▸":"▾"} MITGLIEDER — ${ms.length}</span></div>`+(col?"":(on.length?`<div class="sec">Online — ${on.length}</div>`:"")+srt(on).slice(0,80).map(row).join("")+(off.length?`<div class="sec">Offline — ${off.length}</div>`:"")+srt(off).slice(0,40).map(row).join("")+(off.length>40?`<div class="dm" style="padding:6px 12px;font-size:12px">+${off.length-40} weitere – siehe Servereinstellungen › Mitglieder</div>`:""));
}
function srvUi(){
  const n=$(".shd .nm");if(n&&srv)n.textContent=srv.name;
  const a=$("#chs"),b=$("#xtra"),c=$("#mlist");if(a)a.innerHTML=chl();if(b)b.innerHTML=extras();if(c)c.innerHTML=memBlock();rail();
}
function openSrv(id){
  const s=S.find(x=>x.id==id);if(!s)return showHome();srv=s;FV=false;document.body.classList.remove("onhome");smx();
  $("#st").innerHTML=`<div class="shd" onclick="smenu(event)" title="Servermenü"><span class="nm">${esc(srv.name)}</span><span class="chev"></span></div>`;
  $("#list").innerHTML=`<div id="chs">${chl()}</div><div id="xtra">${extras()}</div><div id="mlist">${memBlock()}</div>`;rail();
  if(!ch||!ch.startsWith(id+"/")){
    const V=vis(),lc=(localStorage["lc"+id]||"").split("|"),c=V.find(x=>id+"/"+x.id==lc[0])||V.find(x=>x.type!="voice")||V[0]||srv.channels[0];
    open_(id+"/"+c.id,"# "+c.name);
  }
  onb();
}
const _open=open_;open_=function(c,t){if(srv&&c.startsWith(srv.id+"/")&&!c.includes("~"))localStorage["lc"+srv.id]=c+"|"+t;return _open(c,t)};

/* ---------- Server-Menü (Klick auf den Servernamen) ---------- */
function smx(){const m=$("#sm");if(m)m.remove();const h=$(".shd");if(h)h.classList.remove("open")}
function smenu(e){
  e&&e.stopPropagation();if($("#sm"))return smx();if(!srv)return;
  const o=isOwn(),m=isMod(),mu=localStorage["mu"+srv.id];
  const it=(ic,l,fn,c="")=>`<div class="mi ${c}" onclick="smx();${fn}"><span>${l}</span><i>${ic}</i></div>`,sep='<div class="ms"></div>';
  const d=document.createElement("div");d.id="sm";
  d.innerHTML=it("👥","Leute einladen","invUI()","acc")+sep
  +(m?it("⚙️","Servereinstellungen","ssets()"):"")
  +(o?it("＋","Kanal erstellen","mkch()")+it("📁","Kategorie erstellen","mkcat()")+it("📅","Event erstellen","ssets('evt')"):"")
  +(m&&!o?it("🛡","Mitglieder verwalten","ssets('mem')"):"")
  +(m?sep:"")
  +it("🪪","Server-Profil bearbeiten","sprofUI()")
  +it(mu?"🔕":"🔔",mu?"Stummschaltung aufheben":"Server stummschalten","tmute()")
  +it("🚀","Server boosten","boost()")
  +it("📊","Server-Insights","insights()")
  +sep+(o?it("🗑","Server löschen","ssets('del')","dng"):it("🚪","Server verlassen","leaveSrv()","dng"));
  $("#side").append(d);const h=$(".shd");if(h)h.classList.add("open");
}
addEventListener("click",e=>{if($("#sm")&&!e.target.closest("#sm,.shd"))smx()});
function tmute(){const k="mu"+srv.id;localStorage[k]=localStorage[k]?"":1;toast(localStorage[k]?"🔕 Server stummgeschaltet":"🔔 Benachrichtigungen aktiv")}
const inviteHTML=()=>{const l=location.origin+"/?join="+srv.id;return `<p class="dm">Teile den Link – wer ihn öffnet und angemeldet ist, kann direkt beitreten.</p><div class="cp"><input readonly value="${l}" onclick="this.select()"><button class="pri" onclick="cpy('${l}')">Kopieren</button></div><label>Oder die Server-ID<div class="cp"><input readonly value="${srv.id}" onclick="this.select()"><button onclick="cpy('${srv.id}')">Kopieren</button></div></label>`};
function invUI(){if(SM())return toast("Streamer-Modus aktiv");modal(`<h3>Leute zu ${esc(srv.name)} einladen</h3>${inviteHTML()}`)}
async function leaveSrv(){
  if(!(await yes("Server verlassen",`Möchtest du „${srv.name}“ wirklich verlassen?`)))return;
  const r=await api("leave",{srv:srv.id});if(r.error)return toast(r.error);
  ssclose();srv=null;ch=null;await refresh();showHome();toast("Du hast den Server verlassen");
}
async function boost(){const r=await api("boost",{srv:srv.id});if(r.error)return toast(r.error);srv.boosts=r.boosts;toast("🚀 Danke fürs Boosten!");srvUi();if($("#sc"))setSec(SEC)}

/* ---------- Server erstellen / beitreten / Kanäle / Kategorien ---------- */
function addSrv(){modal(`<h3>Server hinzufügen</h3><label>Eigenen Server erstellen<div class="cp"><input id="sn" placeholder="Servername" maxlength="40" onkeydown="if(event.key=='Enter')mk()"><button class="pri" onclick="mk()">Erstellen</button></div></label><label>Einem Server beitreten<div class="cp"><input id="sj" placeholder="Einladungslink oder ID" onkeydown="if(event.key=='Enter')jn()"><button onclick="jn()">Beitreten</button></div></label><button onclick="disc()">🌐 Öffentliche Server entdecken</button><div id="dc"></div>`)}
async function mk(){const n=$("#sn").value.trim();if(!n)return;const r=await api("mksrv",{name:n});if(r.error)return toast(r.error);$("#modal").classList.add("hide");await refresh();openSrv(r.id)}
async function jn(){let v=$("#sj").value.trim();const m=v.match(/join=(\w+)/);if(m)v=m[1];if(!v)return;const r=await api("join",{id:v});if(r.error)return toast(r.error);$("#modal").classList.add("hide");await refresh();openSrv(r.id)}
function mkch(cat){
  modal(`<h3>Kanal erstellen</h3><label>Kanaltyp<div class="seg" id="kt">${[["text","# Text"],["voice","🔊 Sprache"],["stage","🎙 Stage"],["announce","📢 Ankündigung"],["forum","🗂 Forum"],["media","🖼 Medien"]].map(([v,l],i)=>`<button class="${i?"":"on"}" data-v="${v}" onclick="document.querySelectorAll('#kt button').forEach(x=>x.classList.toggle('on',x==this))">${l}</button>`).join("")}</div></label><label>Kanalname<input id="kn" placeholder="neuer-kanal" maxlength="20" onkeydown="if(event.key=='Enter')mkch2()"></label><label>Kategorie<select id="kc"><option value="">Keine Kategorie</option>${(srv.cats||[]).map(c=>`<option value="${esc(c)}" ${c==cat?"selected":""}>${esc(c)}</option>`).join("")}</select></label><button class="pri" onclick="mkch2()">Kanal erstellen</button>`);
  setTimeout(()=>$("#kn")&&$("#kn").focus(),60);
}
async function mkch2(){
  const n=$("#kn").value.trim();if(!n)return;
  const r=await api("mkch",{srv:srv.id,name:n,type:$("#kt .on").dataset.v,cat:$("#kc").value});if(r.error)return toast(r.error);
  $("#modal").classList.add("hide");upd(r);if($("#sc"))setSec(SEC);toast("Kanal erstellt");
}
async function mkcat(){const n=await ask("Name der neuen Kategorie","");if(n&&n.trim())smod("mkcat",{val:n},"Kategorie erstellt")}

/* ---------- Servereinstellungen (Overlay mit Unterkategorien) ---------- */
let SEC="ov";
const sb=(l,fn,c="")=>`<button class="${c}" onclick="${fn}">${l}</button>`;
const sc_=(h,t)=>`<div class="scd">${h?`<h3>${h}</h3>`:""}${t}</div>`;
const SS=()=>{const o=isOwn();return[
  ["Server",[["ov","🏠","Übersicht",o],["ch","#","Kanäle",o],["cat","📁","Kategorien",o],["rol","🎭","Rollen",o]]],
  ["Gemeinschaft",[["mem","👥","Mitglieder",1],["inv","🔗","Einladungen",1],["bans","🔨","Bans & Timeouts",1],["onb","👋","Onboarding",o]]],
  ["Inhalte",[["emo","😀","Emojis",o],["snd","🔊","Soundboard",o],["evt","📅","Events",o],["cmd","⚡","Befehle",o],["int","🪝","Integrationen",o]]],
  ["Sicherheit",[["sec","🛡","Moderation & AutoMod",o],["log","📜","Audit-Log",1]]],
  ["Mehr",[["ins","📊","Insights",1],["boo","🚀","Boost",1],["del","⚠️",o?"Server löschen":"Server verlassen",1]]]
]};
function ssets(sec){
  if(!srv||!isMod())return;smx();let d=$("#sset");if(!d){d=document.createElement("div");d.id="sset";d.className="sset";document.body.append(d)}
  const ok=SS().flatMap(g=>g[1]).filter(x=>x[3]).map(x=>x[0]);SEC=ok.includes(sec)?sec:ok.includes(SEC)?SEC:ok[0];
  d.innerHTML=`<aside class="snav"><div class="sh1">${esc(srv.name)}</div>${SS().map(([t,a])=>{const l=a.filter(x=>x[3]);return l.length?`<div class="sg">${t}</div>`+l.map(([k,i,n])=>`<button class="sn ${k==SEC?"on":""}" data-k="${k}" onclick="setSec('${k}')"><i>${i}</i>${n}</button>`).join(""):""}).join("")}</aside><main class="sbody"><div id="sc"></div></main><button class="sx" onclick="ssclose()" title="Schließen (Esc)">✕</button>`;
  setSec(SEC);
}
function ssclose(){const d=$("#sset");if(d)d.remove()}
addEventListener("keydown",e=>{if(e.key=="Escape"&&$("#sset")&&!document.querySelector(".dlg")&&$("#modal").classList.contains("hide"))ssclose()},true);
function setSec(k){
  const box=$("#sc");if(!box||!srv)return;SEC=k;
  const all=SS().flatMap(g=>g[1]).filter(x=>x[3]),cur=all.find(x=>x[0]==k)||all[0];
  document.querySelectorAll(".sn").forEach(b=>b.classList.toggle("on",b.dataset.k==cur[0]));
  const y=box.parentNode.scrollTop;box.innerHTML=`<h2>${cur[1]} ${cur[2]}</h2>`+SR[cur[0]]();box.parentNode.scrollTop=y;
  if(cur[0]=="mem")memList();
}
async function smod(op,o={},msg){
  const r=await api("mod",{srv:srv.id,op,...o});if(r.error){toast(r.error);sfx("err");return false}
  upd(r);if(msg)toast(msg);if($("#sc"))setSec(SEC);return true;
}
async function sicon(f){
  if(!f)return;
  try{const u=await rd(f),i=new Image;i.src=u;await i.decode();const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d"),k=Math.max(256/i.width,256/i.height);x.drawImage(i,(256-i.width*k)/2,(256-i.height*k)/2,i.width*k,i.height*k);let o=c.toDataURL("image/webp",.82);if(!o.startsWith("data:image/webp"))o=c.toDataURL("image/jpeg",.82);await smod("icon",{data:o},"Icon gespeichert")}catch(e){toast("Bild konnte nicht gelesen werden")}
}
const rn=()=>[...new Set(Object.values(srv.roles||{}).map(r=>r.n).filter(Boolean))];
const sel=(cur,opts,fn)=>`<select onchange="${fn}">${opts.map(([v,l])=>`<option value="${esc(String(v))}" ${v==cur?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
const SLOW=[[0,"Aus"],[5,"5 Sek."],[10,"10 Sek."],[30,"30 Sek."],[60,"1 Min."],[300,"5 Min."],[900,"15 Min."],[3600,"1 Std."]];
const CT={text:"Text",voice:"Sprache",stage:"Stage",announce:"Ankündigung",forum:"Forum",media:"Medien"};
const cset=(id,k,v)=>({cat:()=>smod("cat",{ch:id,val:v}),view:()=>smod("chperm",{ch:id,val:"view:"+(v||"all")}),write:()=>smod("chperm",{ch:id,val:"write:"+(v||"all")}),slow:()=>smod("slow",{ch:id,val:v}),nsfw:()=>smod("nsfw",{ch:id})})[k]();
async function cren(id){const c=srv.channels.find(x=>x.id==id),n=await ask("Kanal umbenennen",c.name);if(n&&n.trim())smod("chname",{ch:id,val:n},"Kanal umbenannt")}
async function cdel(id){const c=srv.channels.find(x=>x.id==id);if(await yes("Kanal löschen",`#${c.name} und alle Nachrichten darin werden unwiderruflich gelöscht.`))smod("delch",{ch:id},"Kanal gelöscht")}
async function rencat(i){const k=srv.cats[i],n=await ask("Kategorie umbenennen",k);if(n&&n.trim())smod("rencat",{val:k,n},"Kategorie umbenannt")}
async function delcat(i){const k=srv.cats[i];if(await yes("Kategorie löschen",`„${k}“ wird gelöscht. Die Kanäle darin bleiben erhalten.`))smod("delcat",{val:k},"Kategorie gelöscht")}
function rolGo(){const n=$("#r_n").value.trim();if(!n)return toast("Bitte einen Rollennamen eingeben");smod("role",{target:$("#r_m").value,n,c:$("#r_c").value},"Rolle zugewiesen")}
async function rdel(i){const n=rn()[i];if(await yes("Rolle löschen",`„${n}“ wird allen Mitgliedern entzogen.`))smod("delrole",{val:n},"Rolle gelöscht")}
function memList(){
  const el=$("#ml");if(!el)return;const q=($("#m_q")?.value||"").toLowerCase().trim(),o=isOwn(),now=Date.now();
  const L=srv.members.filter(m=>!q||m.includes(q)).sort((a,b)=>((b==srv.owner)-(a==srv.owner))||(((srv.mods||[]).includes(b))-((srv.mods||[]).includes(a)))||a.localeCompare(b));
  el.innerHTML=L.map(m=>{
    const r=(srv.roles||{})[m],mod=(srv.mods||[]).includes(m),to=(srv.to||{})[m]>now,tgt=m!=ME.name&&m!=srv.owner&&(o||!mod);
    const acts=tgt?(o?fbt("🛡",mod?"Mod-Status entfernen":"Zum Mod machen",`mact('mod','${m}')`):"")+(to?fbt("⏱","Timeout aufheben",`mact('untimeout','${m}')`):fbt("⏱","Timeout",`mact('timeout','${m}')`))+fbt("🚪","Kicken",`mact('kick','${m}')`,"no")+fbt("🔨","Bannen",`mact('ban','${m}')`,"no")+(o?fbt("👑","Besitz übertragen",`mact('transfer','${m}')`):""):"";
    return `<div class="mr" onclick="card('${m}')">${av(m)}<div class="fi"><b>${m==srv.owner?"👑 ":mod?"🛡 ":""}${esc(m)}</b><small>${PL[PR(m)]}${r?` · <span style="color:${r.c}">${esc(r.n)}</span>`:""}${to?" · ⏱ Timeout aktiv":""}</small></div><div class="fa">${acts}</div></div>`}).join("")||'<div class="empty">Keine Treffer.</div>';
}
async function mact(op,m){
  if(op=="timeout"){const v=await ask("Timeout für "+m+" (Minuten)","10");if(v===null)return;return smod("timeout",{target:m,val:+v||10},"Timeout gesetzt")}
  if((op=="kick"||op=="ban")&&!(await yes(op=="kick"?`${m} kicken?`:`${m} bannen?`,op=="ban"?"Gebannte Nutzer können nicht mehr beitreten, bis du sie unter „Bans & Timeouts“ entbannst.":"Die Person kann dem Server erneut beitreten.")))return;
  if(op=="transfer"&&!(await yes("Besitz übertragen",`Server wirklich an ${m} übergeben? Du verlierst die Besitzerrechte.`)))return;
  const ok=await smod(op,{target:m},{kick:"Gekickt",ban:"Gebannt",mod:"Mod-Status geändert",transfer:"Besitz übertragen",untimeout:"Timeout aufgehoben"}[op]);
  if(ok&&op=="transfer")ssclose();
}
async function emoGo(){const f=$("#e_f").files[0],n=$("#e_n").value.trim();if(!f||!n)return toast("Name und Bild wählen");try{await smod("emoji",{val:n,data:await img(f,128)},"Emoji hinzugefügt")}catch(e){toast(e.message)}}
async function sndGo(){const f=$("#s_f").files[0],n=$("#s_n").value.trim();if(!f||!n)return toast("Name und Audiodatei wählen");if(f.size>180000)return toast("Audio max. ~180 KB");smod("sound",{val:n,data:await rd(f)},"Sound hinzugefügt")}
function evtGo(){const t=$("#v_t").value.trim();if(!t)return toast("Titel fehlt");smod("event",{val:t+"|"+$("#v_d").value.replace("T"," ")},"Event erstellt")}
function cmdGo(){const n=$("#c_n").value.trim(),t=$("#c_t").value.trim();if(!n||!t)return toast("Name und Antwort eingeben");smod("cmd",{val:n+"="+t},"Befehl gespeichert")}
async function hookGo(){if(SM())return toast("Streamer-Modus aktiv");const r=await api("mkhook",{ch:srv.id+"/"+$("#h_c").value,name:$("#h_n").value||"Webhook"});if(r.error)return toast(r.error);const u=location.origin+r.url;$("#hk").innerHTML=`<div class="cp"><input readonly value="${u}" onclick="this.select()"><button class="pri" onclick="cpy('${u}')">Kopieren</button></div><small class="dm">POST mit JSON {"text":"…","name":"…"} an diese URL.</small>`}
async function delGo(){const r=await api("delsrv",{srv:srv.id,confirm:$("#d_c").value});if(r.error)return toast(r.error);ssclose();srv=null;ch=null;await refresh();showHome();toast("Server gelöscht")}
const insHTML=()=>{const s=srv.stats||{d:{},c:{}},days=[...Array(7)].map((_,i)=>new Date(Date.now()-i*864e5).toISOString().slice(0,10)).reverse(),mx=Math.max(1,...days.map(d=>s.d[d]||0));return `<div>Mitglieder: ${srv.members.length} · Boosts: ${srv.boosts||0} · Nachrichten: ${Object.values(s.d).reduce((a,b)=>a+b,0)}</div>${days.map(d=>`<div style="font-size:12px;display:flex;align-items:center;gap:8px">${d.slice(5)} <span style="display:inline-block;height:8px;border-radius:4px;width:${Math.max(2,(s.d[d]||0)/mx*60)}%;background:var(--red)"></span> ${s.d[d]||0}</div>`).join("")}<b>Top-Kanäle</b>${Object.entries(s.c).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`<div>#${esc(k)}: ${v}</div>`).join("")||'<span class="dm">Noch keine Daten.</span>'}`};
function insights(){modal(`<h3>📊 Insights</h3>${insHTML()}`)}
const SR={
  ov:()=>sc_("Servername",`<div class="cp"><input id="o_n" value="${esc(srv.name)}" maxlength="40"><button class="pri" onclick="smod('rename',{val:$('#o_n').value},'Name gespeichert')">Speichern</button></div>`)
    +sc_("Server-Icon",`<div class="cp"><div class="sico" style="${srv.icon?`background-image:url('${srv.icon}')`:""}">${srv.icon?"":esc(srv.name[0]).toUpperCase()}</div><label class="fl">Bild hochladen<input type="file" accept="image/*" hidden onchange="sicon(this.files[0])"></label>${srv.icon?sb("Entfernen","smod('icon',{},'Icon entfernt')"):""}</div>`)
    +sc_("Willkommensnachricht",`<textarea id="o_w" rows="3" maxlength="300" placeholder="Wird in der Seitenleiste angezeigt">${esc(srv.welcome||"")}</textarea>${sb("Speichern","smod('welcome',{val:$('#o_w').value},'Gespeichert')","pri")}`)
    +sc_("Sichtbarkeit",`<label class="sw"><span><b>Öffentlicher Server</b><br><small class="dm">Erscheint unter „Öffentliche Server entdecken“.</small></span><input type="checkbox" ${srv.public?"checked":""} onchange="smod('public')"></label>`)
    +sc_("Info",`<div class="dm">ID: <code>${srv.id}</code><br>Besitzer: ${esc(srv.owner)} · ${srv.members.length} Mitglieder · ${srv.channels.length} Kanäle · Boosts: ${srv.boosts||0}</div>`),
  ch:()=>sb("＋ Kanal erstellen","mkch()","pri")+srv.channels.map(c=>{const id=c.id;return `<div class="scd"><div class="chh"><b>${c.nsfw?"🔞":IC[c.type]||"#"} ${esc(c.name)}</b><small class="dm">${CT[c.type]||"Text"}</small><span class="sp1"></span>${sb("Umbenennen",`cren('${id}')`)}${sb("Löschen",`cdel('${id}')`,"dng")}</div><div class="cgrid"><label>Kategorie${sel(c.cat||"",[["","Keine"],...(srv.cats||[]).map(x=>[x,x])],`cset('${id}','cat',this.value)`)}</label><label>Slowmode${sel(srv.slow?.[id]||0,SLOW,`cset('${id}','slow',this.value)`)}</label><label>Sichtbar für${sel(c.view||"",[["","Alle"],["mods","Nur Mods"],...rn().map(x=>[x,"Rolle: "+x])],`cset('${id}','view',this.value)`)}</label><label>Schreiben dürfen${sel(c.write||"",[["","Alle"],["mods","Nur Mods"]],`cset('${id}','write',this.value)`)}</label></div><label class="sw"><span>🔞 Altersbeschränkt</span><input type="checkbox" ${c.nsfw?"checked":""} onchange="cset('${id}','nsfw')"></label></div>`}).join(""),
  cat:()=>sb("＋ Kategorie erstellen","mkcat()","pri")+((srv.cats||[]).length?sc_("",(srv.cats||[]).map((k,i)=>`<div class="sr"><b>📁 ${esc(k)}</b><small class="dm">${srv.channels.filter(c=>c.cat==k).length} Kanäle</small><span class="sp1"></span>${sb("Umbenennen",`rencat(${i})`)}${sb("Löschen",`delcat(${i})`,"dng")}</div>`).join("")):sc_("","<div class='dm'>Noch keine Kategorien. Kanäle lassen sich damit gruppieren und ein-/ausklappen.</div>")),
  rol:()=>sc_("Rolle zuweisen",`<div class="cgrid"><label>Mitglied<select id="r_m">${srv.members.map(m=>`<option>${esc(m)}</option>`).join("")}</select></label><label>Rollenname<input id="r_n" list="r_l" maxlength="20" placeholder="z. B. Moderator"><datalist id="r_l">${rn().map(n=>`<option value="${esc(n)}">`).join("")}</datalist></label><label>Farbe<input id="r_c" type="color" value="#8b5cf6"></label></div>${sb("Rolle zuweisen","rolGo()","pri")}<small class="dm">Mit Rollen lassen sich Kanäle freischalten (Kanäle › Sichtbar für).</small>`)
    +sc_("Mitglieder mit Rollen",Object.entries(srv.roles||{}).map(([m,r])=>`<div class="sr">${av(m)}<b>${esc(m)}</b><span class="rchip" style="--rc:${r.c}">${esc(r.n)}</span><span class="sp1"></span>${sb("Entfernen",`smod('rmrole',{target:'${m}'},'Rolle entfernt')`)}</div>`).join("")||"<div class='dm'>Noch keine Rollen vergeben.</div>")
    +(rn().length?sc_("Rollen löschen",rn().map((n,i)=>`<div class="sr"><b>${esc(n)}</b><span class="sp1"></span>${sb("Für alle löschen",`rdel(${i})`,"dng")}</div>`).join("")):""),
  mem:()=>`<input id="m_q" placeholder="Mitglieder suchen …" oninput="memList()"><small class="dm">🛡 Mod · ⏱ Timeout · 🚪 Kick · 🔨 Bann${isOwn()?" · 👑 Besitz übertragen":""}</small><div id="ml"></div>`,
  inv:()=>sc_("Einladungslink",inviteHTML()),
  bans:()=>{const now=Date.now(),to=Object.entries(srv.to||{}).filter(([,t])=>t>now);return sc_("Gebannte Nutzer ("+(srv.bans||[]).length+")",(srv.bans||[]).map(n=>`<div class="sr"><b>🔨 ${esc(n)}</b><span class="sp1"></span>${sb("Entbannen",`smod('unban',{target:'${n}'},'Entbannt')`)}</div>`).join("")||"<div class='dm'>Niemand gebannt.</div>")+sc_("Aktive Timeouts ("+to.length+")",to.map(([n,t])=>`<div class="sr"><b>⏱ ${esc(n)}</b><small class="dm">bis ${new Date(t).toLocaleTimeString()}</small><span class="sp1"></span>${sb("Aufheben",`smod('untimeout',{target:'${n}'},'Timeout aufgehoben')`)}</div>`).join("")||"<div class='dm'>Keine aktiven Timeouts.</div>")},
  onb:()=>sc_("Willkommensfrage",`<div class="dm">Neue Mitglieder wählen beim ersten Beitritt eine Option und erhalten die gleichnamige Rolle.</div><input id="b_q" placeholder="Frage, z. B. Welche Spiele spielst du?" value="${esc(srv.onb?.q||"")}"><input id="b_o" placeholder="Optionen, mit Komma getrennt" value="${esc((srv.onb?.opts||[]).join(", "))}">${sb("Speichern","smod('onboarding',{val:$('#b_q').value+'|'+$('#b_o').value},'Onboarding gespeichert')","pri")}${srv.onb?sb("Onboarding entfernen","smod('onboarding',{val:''},'Entfernt')","dng"):""}`),
  emo:()=>sc_("Neues Emoji",`<div class="cgrid"><label>Name<input id="e_n" maxlength="20" placeholder="z. B. pulse"></label><label>Bild (max. 100 KB)<input id="e_f" type="file" accept="image/*"></label></div>${sb("Hinzufügen","emoGo()","pri")}`)+sc_("Emojis ("+Object.keys(srv.emoji||{}).length+")",`<div class="eg2">${Object.entries(srv.emoji||{}).map(([k,d])=>`<div class="eit"><img src="${d}"><code>:${k}:</code>${sb("🗑",`smod('delemoji',{val:'${k}'},'Emoji gelöscht')`,"dng")}</div>`).join("")||"<div class='dm'>Noch keine Emojis.</div>"}</div>`),
  snd:()=>sc_("Neuer Sound",`<div class="cgrid"><label>Name<input id="s_n" maxlength="20" placeholder="z. B. airhorn"></label><label>Audiodatei (max. ~180 KB)<input id="s_f" type="file" accept="audio/*"></label></div>${sb("Hinzufügen","sndGo()","pri")}`)+sc_("Sounds ("+Object.keys(srv.sounds||{}).length+")",Object.keys(srv.sounds||{}).map(k=>`<div class="sr"><b>🔊 ${k}</b><span class="sp1"></span>${sb("▶",`try{new Audio(srv.sounds['${k}']).play().catch(()=>{})}catch(e){}`)}${sb("Löschen",`smod('delsound',{val:'${k}'},'Sound gelöscht')`,"dng")}</div>`).join("")||"<div class='dm'>Noch keine Sounds. Sie erscheinen als Buttons im Sprachchat.</div>"),
  evt:()=>sc_("Neues Event",`<div class="cgrid"><label>Titel<input id="v_t" maxlength="60" placeholder="z. B. Movie Night"></label><label>Datum & Uhrzeit<input id="v_d" type="datetime-local"></label></div>${sb("Event erstellen","evtGo()","pri")}`)+sc_("Geplante Events",(srv.events||[]).map((e,i)=>`<div class="sr"><b>📅 ${esc(e.title)}</b><small class="dm">${esc(e.time)}</small><span class="sp1"></span>${sb("Löschen",`smod('delevent',{val:${i}},'Event gelöscht')`,"dng")}</div>`).join("")||"<div class='dm'>Keine Events.</div>"),
  cmd:()=>sc_("Neuer Slash-Befehl",`<div class="cgrid"><label>Name<input id="c_n" maxlength="20" placeholder="regeln"></label><label>Antwort<input id="c_t" maxlength="500" placeholder="Text, den der Bot sendet"></label></div>${sb("Speichern","cmdGo()","pri")}`)+sc_("Befehle",Object.entries(srv.cmds||{}).map(([k,v])=>`<div class="sr"><b>/${k}</b><small class="dm nm">${esc(v)}</small>${sb("Löschen",`smod('delcmd',{val:'${k}'},'Befehl gelöscht')`,"dng")}</div>`).join("")||"<div class='dm'>Noch keine Befehle.</div>"),
  int:()=>sc_("Webhook erstellen",`<div class="dm">Externe Dienste (z. B. GitHub) können Nachrichten in einen Kanal senden.</div><div class="cgrid"><label>Kanal<select id="h_c">${srv.channels.filter(c=>c.type!="voice").map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label><label>Name<input id="h_n" value="Webhook" maxlength="20"></label></div>${sb("Webhook erstellen","hookGo()","pri")}<div id="hk"></div>`),
  sec:()=>sc_("AutoMod – verbotene Wörter",`<textarea id="a_w" rows="3" placeholder="wort1, wort2, wort3">${esc((srv.words||[]).join(", "))}</textarea>${sb("Speichern","smod('words',{val:$('#a_w').value},'AutoMod gespeichert')","pri")}`)
    +sc_("Verifizierung",`<div class="dm">Mindestalter des Kontos, bevor jemand beitreten darf.</div>${sel(srv.minage||0,[[0,"Keine"],[5,"5 Minuten"],[10,"10 Minuten"],[60,"1 Stunde"],[1440,"1 Tag"],[10080,"7 Tage"]],"smod('minage',{val:this.value},'Gespeichert')")}`)
    +sc_("Raid-Schutz",`<label class="sw"><span><b>Raid-Schutz</b><br><small class="dm">Sperrt den Server 10 Min., wenn >5 Nutzer pro Minute beitreten.${(srv.lock||0)>Date.now()?" <b style='color:#ff7b8a'>Aktuell gesperrt!</b>":""}</small></span><input type="checkbox" ${srv.raid?"checked":""} onchange="smod('raid')"></label>`),
  log:()=>sc_("",(srv.log||[]).slice().reverse().map(l=>`<div class="sr"><small class="dm" style="min-width:128px">${new Date(l.t).toLocaleString([],{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</small><b>${esc(l.u)}</b><span class="nm">${esc(l.x)}</span></div>`).join("")||"<div class='dm'>Noch keine Einträge.</div>"),
  ins:()=>sc_("",insHTML()),
  boo:()=>{const b=srv.boosts||0,lv=b>=14?3:b>=7?2:b>=2?1:0,nx=[2,7,14][lv];return sc_("",`<div style="font-size:42px">🚀</div><div><b>${b}</b> Boosts · Level ${lv}</div>${nx?`<div class="bar"><i style="width:${Math.min(100,b/nx*100)}%"></i></div><small class="dm">Noch ${nx-b} Boost(s) bis Level ${lv+1}</small>`:"<small class='dm'>Höchstes Level erreicht 🎉</small>"}${sb("🚀 Server boosten","boost()","pri")}`)},
  del:()=>isOwn()?sc_("Server löschen",`<div class="dm">Alle Kanäle, Nachrichten und Einstellungen von <b>${esc(srv.name)}</b> werden endgültig gelöscht. Alternativ kannst du den Besitz unter „Mitglieder“ übertragen.</div><input id="d_c" placeholder="Zur Bestätigung den Servernamen eingeben"><button class="dng" onclick="delGo()">🗑 Server endgültig löschen</button>`):sc_("Server verlassen",`<div class="dm">Du kannst jederzeit mit einem Einladungslink wieder beitreten.</div><button class="dng" onclick="leaveSrv()">🚪 Server verlassen</button>`)
};

setInterval(relpoll,6000);setInterval(userPoll,15000);init();
