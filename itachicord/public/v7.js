/* ===== Pulsecord v7: Ende-zu-Ende-Verschlüsselung (DMs), Sprachnachrichten, 30 Profilbild-Dekorationen, Discord-Navigation ===== */

/*E2E-BEGIN*/
const E2={ks:{},ok:{},ready:false,started:false},E2C={},ENC=new TextEncoder(),DEC=new TextDecoder();
const b64=u=>{const a=new Uint8Array(u);let s="";for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const cat8=(...p)=>{const o=new Uint8Array(p.reduce((n,x)=>n+x.byteLength,0));let k=0;for(const x of p){o.set(new Uint8Array(x.buffer||x),k);k+=x.byteLength}return o};
const ECDH={name:"ECDH",namedCurve:"P-256"},e2sk=()=>"e2k:"+ME.name;
const pkStr=j=>JSON.stringify({kty:"EC",crv:"P-256",x:j.x,y:j.y});

async function e2gen(){const kp=await crypto.subtle.generateKey(ECDH,true,["deriveBits"]);return{priv:await crypto.subtle.exportKey("jwk",kp.privateKey),pk:pkStr(await crypto.subtle.exportKey("jwk",kp.publicKey))}}
async function e2load(){try{const o=JSON.parse(localStorage[e2sk()]||"null");if(!o)return null;E2.priv=await crypto.subtle.importKey("jwk",o.priv,ECDH,false,["deriveBits"]);E2.pk=o.pk;E2.jwk=o.priv;return o}catch(e){return null}}
async function e2set(o){localStorage[e2sk()]=JSON.stringify(o);await e2load();E2.ks={};E2.ready=true;window.E2V=(window.E2V||0)+1}
const e2on=c=>!!(E2.ready&&c&&c.startsWith("dm:")&&!c.startsWith("dm:g"));
const e2peer=c=>c.slice(3).split(":").find(x=>x!=ME.name);

async function e2key(c){
  const peer=e2peer(c),u=U[peer];if(!E2.ready||!u||!u.pk)return null;
  const id=peer+"|"+u.pk+"|"+E2.pk;if(E2.ks[id])return E2.ks[id];
  const pub=await crypto.subtle.importKey("jwk",JSON.parse(u.pk),ECDH,false,[]);
  const bits=await crypto.subtle.deriveBits({name:"ECDH",public:pub},E2.priv,256);
  const hk=await crypto.subtle.importKey("raw",bits,"HKDF",false,["deriveKey"]);
  return E2.ks[id]=await crypto.subtle.deriveKey({name:"HKDF",hash:"SHA-256",salt:ENC.encode("pulsecord-e2e-v1"),info:ENC.encode([ME.name,peer].sort().join(":"))},hk,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
const e2seal=async(k,buf)=>{const iv=crypto.getRandomValues(new Uint8Array(12));return cat8(iv,await crypto.subtle.encrypt({name:"AES-GCM",iv},k,buf))};
const e2open=async(k,u)=>new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},k,u.slice(12)));

/* null = abbrechen, true = verschlüsseln, false = unverschlüsselt (bestätigt oder kein E2E-Kanal) */
async function e2gate(c){
  if(!e2on(c))return false;if(await e2key(c))return true;if(E2.ok[c])return false;
  if(!await yes("Nicht verschlüsselt senden?",e2peer(c)+" hat die Verschlüsselung noch nicht eingerichtet (z. B. ältere App-Version). Dein Inhalt würde unverschlüsselt gesendet."))return null;
  E2.ok[c]=1;return false;
}
async function e2enc(c,t){
  const g=await e2gate(c);if(g===null)return null;if(!g)return t;
  const out="e2e1:"+b64(await e2seal(await e2key(c),ENC.encode(t)));
  if(out.length>3990){toast("Nachricht zu lang für einen verschlüsselten Chat (max. ca. 2900 Zeichen)");return null}
  return out;
}
async function e2dec(m,c){
  if(!c||!c.startsWith("dm:"))return;
  for(const x of m){
    if(typeof x.text!="string"||!x.text.startsWith("e2e1:"))continue;x.e2=1;
    const ck=x.id+":"+x.text.length;if(E2C[ck]!==undefined){x.text=E2C[ck];continue}
    try{const k=await e2key(c);if(!k)throw 0;x.text=E2C[ck]=DEC.decode(await e2open(k,unb64(x.text.slice(5))))}
    catch(e){x.text="*🔒 Nachricht kann auf diesem Gerät nicht entschlüsselt werden*"}
  }
}
async function e2dchunk(c,u){try{return await e2open(await e2key(c),u)}catch(e){toast("Datei kann nicht entschlüsselt werden");throw e}}

/* Schlüssel-Sicherung mit Passphrase (PBKDF2 → AES-GCM), liegt nur verschlüsselt auf dem Server */
const e2pbk=async(p,salt)=>crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},await crypto.subtle.importKey("raw",ENC.encode(p),"PBKDF2",false,["deriveKey"]),{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
async function e2wrap(pass){const salt=crypto.getRandomValues(new Uint8Array(16)),k=await e2pbk(pass,salt);return b64(cat8(salt,await e2seal(k,ENC.encode(JSON.stringify({priv:E2.jwk,pk:E2.pk})))))}
async function e2unwrap(pass,s){const u=unb64(s);return JSON.parse(DEC.decode(await e2open(await e2pbk(pass,u.slice(0,16)),u.slice(16))))}
async function e2fp(peer){const h=new Uint8Array(await crypto.subtle.digest("SHA-256",ENC.encode([E2.pk,(U[peer]||{}).pk||""].sort().join("|"))));const o=[];for(let i=0;i<6;i++)o.push(String(((h[i*4]<<24|h[i*4+1]<<16|h[i*4+2]<<8|h[i*4+3])>>>0)%100000).padStart(5,"0"));return o.join(" ")}
/*E2E-END*/

async function e2setup(){
  const loc=await e2load(),same=loc&&ME.pk&&loc.pk===ME.pk;
  if(same){E2.ready=true;hdFix();return}
  if(loc&&!ME.ek){ // lokaler Schlüssel ≠ Konto-Schlüssel, keine Sicherung
    if(!ME.pk||await yes("Schlüssel abweichend","Dieses Gerät nutzt einen anderen Schlüssel als dein Konto. Diesen Schlüssel für dein Konto verwenden?")){await api("profile",{pk:loc.pk});ME.pk=loc.pk;U[ME.name]&&(U[ME.name].pk=loc.pk);E2.ready=true}
    hdFix();return;
  }
  if(ME.ek){
    for(;;){
      const p=await ask("🔐 Chats entschlüsseln","",{type:"password",msg:"Gib die Passphrase deiner Schlüssel-Sicherung ein, um deine verschlüsselten Chats auf diesem Gerät zu lesen."});
      if(p===null)break;
      try{await e2set(await e2unwrap(p,ME.ek));toast("Schlüssel wiederhergestellt ✔");hdFix();return}catch(e){toast("Falsche Passphrase")}
    }
    if(!await yes("Neuen Schlüssel erzeugen?","Ältere verschlüsselte Nachrichten bleiben dann auf diesem Konto unlesbar. Trotzdem neuen Schlüssel erzeugen?"))return;
  }else if(ME.pk&&!await yes("Neuen Schlüssel erzeugen?","Für dein Konto existiert bereits ein Schlüssel auf einem anderen Gerät (ohne Sicherung). Sichere ihn dort unter Profil → Verschlüsselung. Hier trotzdem einen neuen erzeugen? (ersetzt den anderen)"))return;
  const g=await e2gen();await e2set(g);await api("profile",{pk:g.pk,ek:""});ME.pk=g.pk;ME.ek="";U[ME.name]&&(U[ME.name].pk=g.pk);
  toast("🔒 Ende-zu-Ende-Verschlüsselung aktiv");hdFix();
}
async function e2backup(){
  if(!E2.ready)return;
  const p=await ask("🔐 Schlüssel sichern","",{type:"password",msg:"Lege eine Passphrase (mind. 8 Zeichen) fest. Damit liest du deine verschlüsselten Chats auch auf neuen Geräten. Ohne Passphrase ist der Schlüssel nicht wiederherstellbar."});
  if(p===null)return;if(p.length<8)return toast("Mindestens 8 Zeichen");
  const ek=await e2wrap(p),r=await api("profile",{ek});if(r.error)return toast(r.error);ME.ek=ek;toast("Schlüssel gesichert ✔");
}
async function e2reset(){
  if(!await yes("Neuen Schlüssel erzeugen?","Bisherige verschlüsselte Nachrichten werden für dich unlesbar (auch auf anderen Geräten). Fortfahren?"))return;
  const g=await e2gen();await e2set(g);await api("profile",{pk:g.pk,ek:""});ME.pk=g.pk;ME.ek="";U[ME.name]&&(U[ME.name].pk=g.pk);last="";toast("Neuer Schlüssel aktiv");e2ui();
}
async function e2ui(c){
  const peer=c&&e2peer(c);let fp="";if(peer&&E2.ready&&(U[peer]||{}).pk)fp=await e2fp(peer);
  modal(`<h3>🔐 Verschlüsselung</h3><div class="dm">Direktnachrichten (1:1) und Sprachnachrichten/Dateien darin sind Ende-zu-Ende-verschlüsselt (ECDH P-256 + AES-256-GCM). Der Server sieht nur Schlüsseltext. Server-Kanäle und Gruppenchats sind nicht Ende-zu-Ende-verschlüsselt. Absender, Zeit, Dateigröße und -name bleiben sichtbar.</div>
  ${peer?(fp?`<div class="sw" style="flex-direction:column;align-items:flex-start"><b>Sicherheitsnummer mit ${esc(peer)}</b><code style="font-size:15px;letter-spacing:.04em">${fp}</code><small class="dm">Vergleicht diese Zahlen persönlich oder per Anruf. Sind sie bei beiden gleich, liest niemand mit.</small></div>`:`<div class="sw">🔓 ${esc(peer)} hat noch keinen Schlüssel – Nachrichten gehen unverschlüsselt.</div>`):""}
  <div class="sw"><span>${E2.ready?"✅ Schlüssel auf diesem Gerät aktiv":"⚠️ Kein Schlüssel auf diesem Gerät"}</span></div>
  <div class="sw"><span>${ME.ek?"✅ Sicherung vorhanden":"Keine Sicherung"}</span><button onclick="e2backup()">${ME.ek?"Passphrase ändern":"Jetzt sichern"}</button></div>
  <button onclick="e2reset()">Neuen Schlüssel erzeugen</button>`);
}
const _initWait=setInterval(()=>{if(typeof ME!="undefined"&&ME&&ME.name&&!E2.started){E2.started=1;clearInterval(_initWait);e2setup().catch(e=>console.error(e))}},400);
setInterval(()=>{try{if(ch&&ch.startsWith("dm:")&&M.some(x=>x.e2&&/nicht entschlüsselt/.test(x.text)))last=""}catch(e){}},15000);

/* ---------- Upload (Dateien + Sprachnachrichten, in 1:1-DMs verschlüsselt) ---------- */
async function upFile(f,name,type){
  const g=await e2gate(ch);if(g===null)return null;const k=g?await e2key(ch):null;
  const fid=[...crypto.getRandomValues(new Uint8Array(8))].map(x=>x.toString(16).padStart(2,"0")).join(""),C=3e6,n=Math.ceil(f.size/C)||1;
  for(let i=0;i<n;i++){
    const buf=new Uint8Array(await f.slice(i*C,(i+1)*C).arrayBuffer()),d=b64(k?await e2seal(k,buf):buf),r=await api("up",{fid,i,d});
    if(r.error){alert(r.error);$("#rpb").textContent="";return null}
    $("#rpb").textContent="Upload "+Math.round((i+1)/n*100)+"%";
  }
  $("#rpb").textContent="";return{name,fid,n,size:f.size,type:type||f.type,...(k?{enc:1}:{})};
}

/* ===================== Sprachnachrichten ===================== */
let VR=null;const VM={a:null,id:null,url:{},spd:1};
const vfmt=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const vbars=(wf,n)=>(wf||"").padEnd(n,"0").slice(0,n).split("").map(c=>parseInt(c,36)||0);
async function vrecStart(){
  if(VR||!ch)return;
  if(!navigator.mediaDevices||!window.MediaRecorder)return toast("Aufnahme wird von diesem Browser nicht unterstützt");
  let st;try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(e){return toast("Mikrofon nicht verfügbar – bitte Zugriff erlauben")}
  const mt=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"].find(t=>MediaRecorder.isTypeSupported(t))||"";
  const rec=new MediaRecorder(st,mt?{mimeType:mt,audioBitsPerSecond:32000}:{}),AC2=window.AudioContext||window.webkitAudioContext,ac=new AC2(),an=ac.createAnalyser();
  an.fftSize=512;ac.createMediaStreamSource(st).connect(an);
  VR={st,rec,ac,an,ch,chunks:[],amp:[],t0:Date.now(),mime:rec.mimeType||mt||"audio/webm",buf:new Uint8Array(an.fftSize)};
  rec.ondataavailable=e=>{if(e.data&&e.data.size&&VR)VR.chunks.push(e.data)};
  rec.start(250);sfx("unmute");
  $("#in").classList.add("rec");let v=$("#vrec");if(v)v.remove();v=document.createElement("div");v.id="vrec";
  v.innerHTML=`<button class="vx" aria-label="Verwerfen" onclick="vrecCancel()">🗑</button><i class="vdot"></i><b class="vt">0:00</b><div class="vlive"></div><button class="pri vs" aria-label="Aufnahme beenden" onclick="vrecStop()">⏹</button>`;
  $("#in").append(v);VR.tm=setInterval(vtick,80);
}
function vtick(){
  if(!VR||VR.done)return;if(VR.ch!=ch)return vrecCancel();
  VR.an.getByteTimeDomainData(VR.buf);let m=0;for(const x of VR.buf)m=Math.max(m,Math.abs(x-128));VR.amp.push(m/128);
  const s=(Date.now()-VR.t0)/1000,t=document.querySelector("#vrec .vt");if(t)t.textContent=vfmt(s);
  const L=document.querySelector("#vrec .vlive");if(L)L.innerHTML=VR.amp.slice(-36).map(a=>`<i style="height:${10+Math.min(1,a*1.7)*90}%"></i>`).join("");
  if(s>=300)vrecStop();
}
function vrecFree(){if(!VR)return;clearInterval(VR.tm);try{VR.st.getTracks().forEach(t=>t.stop())}catch(e){}try{VR.ac.close()}catch(e){}}
function vrecCancel(){if(!VR)return;VR.done=1;try{VR.rec.state!="inactive"&&VR.rec.stop()}catch(e){}vrecFree();vrecClose()}
function vrecClose(){VR=null;const v=$("#vrec");if(v)v.remove();$("#in").classList.remove("rec");if(VM.prev){try{VM.prev.pause()}catch(e){}VM.prev=null}}
function vrecStop(){
  if(!VR||VR.done)return;const v=VR;v.done=1;v.dur=(Date.now()-v.t0)/1000;
  v.rec.onstop=()=>{
    vrecFree();if(VR!==v)return;
    if(v.dur<.8){toast("Zu kurz – gedrückt halten ist nicht nötig, einfach länger sprechen");return vrecClose()}
    v.blob=new Blob(v.chunks,{type:v.mime});
    const n=40,a=v.amp,w=[];for(let i=0;i<n;i++){const s=Math.floor(i*a.length/n),e=Math.max(s+1,Math.floor((i+1)*a.length/n));let m=0;for(let j=s;j<e&&j<a.length;j++)m=Math.max(m,a[j]);w.push(Math.round(Math.min(1,m*1.7)*35).toString(36))}
    v.wf=w.join("");v.url=URL.createObjectURL(v.blob);
    const el=$("#vrec");if(!el)return;
    el.innerHTML=`<button class="vx" aria-label="Verwerfen" onclick="vrecCancel()">🗑</button><button class="vpl" aria-label="Vorhören" onclick="vprev()">▶</button><div class="vwv vstat">${vbars(v.wf,n).map(h=>`<i style="height:${12+h/35*88}%"></i>`).join("")}</div><span class="vtm">${vfmt(v.dur)}</span><button class="pri vs" aria-label="Senden" onclick="vrecSend()">➤</button>`;
  };
  try{v.rec.stop()}catch(e){vrecCancel()}
}
function vprev(){
  const v=VR;if(!v||!v.url)return;const b=document.querySelector("#vrec .vpl");
  if(VM.prev){VM.prev.paused?VM.prev.play():VM.prev.pause();return}
  const a=new Audio(v.url);VM.prev=a;a.onplay=()=>b&&(b.textContent="⏸");a.onpause=()=>b&&(b.textContent="▶");a.onended=()=>{b&&(b.textContent="▶");VM.prev=null};a.play().catch(()=>{});
}
async function vrecSend(){
  const v=VR;if(!v||!v.blob||v.sending)return;v.sending=1;const el=$("#vrec");el&&el.classList.add("busy");
  const ext=/mp4/.test(v.mime)?"m4a":/ogg/.test(v.mime)?"ogg":"webm",m=await upFile(v.blob,"sprachnachricht."+ext,v.mime.split(";")[0]);
  if(!m){v.sending=0;el&&el.classList.remove("busy");return}
  m.voice=1;m.dur=Math.round(v.dur);m.wf=v.wf;await send(m);vrecClose();
}
function vmsg(x){
  const f=x.file;
  return `<div class="vm" data-vm="${x.id}"><button class="vpl" aria-label="Abspielen" onclick="event.stopPropagation();vplay('${x.id}')">▶</button><div class="vwv" onclick="event.stopPropagation();vseek(event,'${x.id}')">${vbars(f.wf,40).map(h=>`<i style="height:${12+h/35*88}%"></i>`).join("")}</div><span class="vtm">${vfmt(f.dur||0)}</span><button class="vsp" aria-label="Geschwindigkeit" onclick="event.stopPropagation();vspeed()">${VM.spd}×</button>${f.enc?'<span class="vlk" title="Ende-zu-Ende-verschlüsselt">🔒</span>':""}</div>`;
}
async function vload(x){
  const f=x.file,P=[];
  for(let i=0;i<f.n;i++){const r=await api("dl",0,"&fid="+f.fid+"&i="+i);if(r.error)throw 0;let u=unb64(r.d);if(f.enc)u=await e2dchunk(ch,u);P.push(u)}
  return URL.createObjectURL(new Blob(P,{type:f.type||"audio/webm"}));
}
function vui(id,s){
  const el=document.querySelector(`[data-vm="${id}"]`);if(!el)return;const b=el.querySelector(".vpl");
  b.textContent={load:"⏳",play:"⏸",pause:"▶",end:"▶"}[s]||"▶";el.classList.toggle("playing",s=="play"||s=="load");
  if(s=="end"||s=="stop"){el.querySelectorAll(".vwv i").forEach(i=>i.classList.remove("on"));const x=M.find(m=>m.id==id);el.querySelector(".vtm").textContent=vfmt(x?x.file.dur:0)}
}
function vprog(id){
  const a=VM.a,el=document.querySelector(`[data-vm="${id}"]`),x=M.find(m=>m.id==id);if(!a||!el||!x)return;
  const d=isFinite(a.duration)&&a.duration>0?a.duration:(x.file.dur||1),p=Math.min(1,a.currentTime/d),bs=el.querySelectorAll(".vwv i"),k=Math.round(p*bs.length);
  bs.forEach((b,i)=>b.classList.toggle("on",i<k));el.querySelector(".vtm").textContent=vfmt(a.currentTime);
}
function vstop(){if(VM.a){try{VM.a.pause()}catch(e){}VM.a.onended=VM.a.onpause=VM.a.ontimeupdate=null;const o=VM.id;VM.a=null;VM.id=null;o&&vui(o,"stop")}}
async function vplay(id){
  const x=M.find(m=>m.id==id);if(!x||!x.file)return;
  if(VM.id==id&&VM.a){VM.a.paused?VM.a.play():VM.a.pause();return}
  vstop();VM.id=id;vui(id,"load");
  try{
    const url=VM.url[id]||(VM.url[id]=await vload(x));if(VM.id!=id)return;
    const a=new Audio(url);a.playbackRate=VM.spd;VM.a=a;
    a.ontimeupdate=()=>vprog(id);a.onplay=()=>vui(id,"play");a.onpause=()=>{if(!a.ended)vui(id,"pause")};
    a.onended=()=>{vui(id,"end");VM.a=null;VM.id=null;const i=M.findIndex(m=>m.id==id),n=M.slice(i+1).find(m=>m.file&&m.file.voice&&m.u!=ME.name);n&&vplay(n.id)};
    await a.play();
  }catch(e){delete VM.url[id];toast("Sprachnachricht kann nicht abgespielt werden");VM.id=null;vui(id,"stop")}
}
function vseek(e,id){
  if(VM.id!=id||!VM.a)return vplay(id);const r=e.currentTarget.getBoundingClientRect(),x=M.find(m=>m.id==id),d=isFinite(VM.a.duration)&&VM.a.duration>0?VM.a.duration:(x.file.dur||1);
  try{VM.a.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*d}catch(er){}
}
function vspeed(){VM.spd=VM.spd==1?1.5:VM.spd==1.5?2:1;if(VM.a)VM.a.playbackRate=VM.spd;document.querySelectorAll(".vsp").forEach(b=>b.textContent=VM.spd+"×")}
function vreapply(){if(VM.id&&VM.a){vui(VM.id,VM.a.paused?"pause":"play");vprog(VM.id)}}
if(!navigator.mediaDevices||!window.MediaRecorder)document.body.classList.add("novm");

/* ===================== Profilbild-Dekorationen (30) ===================== */
const DECO=[["neon","Neon"],["rainbow","Regenbogen"],["fire","Feuer"],["ice","Eis"],["gold","Gold"],["aurora","Aurora"],["toxic","Toxic"],["lava","Lava"],["ocean","Ozean"],["galaxy","Galaxie"],
["sunset","Sonnenuntergang"],["radar","Radar"],["pulse","Puls"],["glitch","Glitch"],["matrix","Matrix"],["pixel","Pixel"],["shadow","Schatten"],["electric","Blitz"],["sakura","Kirschblüte"],["hearts","Herzen"],
["crown","Krone"],["halo","Heiligenschein"],["devil","Teufelshörner"],["cat","Katzenohren"],["bunny","Hasenohren"],["wings","Engelsflügel"],["laurel","Blätterkranz"],["star","Sternenstaub"],["moon","Mond"],["snow","Schneefall"]];
function decoUI(){
  const u=ME,img=u.avatar&&!u.avvid?`background-image:url('${u.avatar}')`:"";
  modal(`<h3>✨ Profilbild-Dekoration</h3><div class="dm">Die Dekoration siehst du und alle anderen überall dort, wo dein Avatar erscheint.</div><div class="dgrid">${[["","Keine"],...DECO].map(([k,n])=>`<button class="dsel ${(ME.deco||"")==k?"on":""}" onclick="decoPick('${k}')"><div class="av ${img?"":"ph"} ${k?"dc dc-"+k:""}" style="--c:${ME.color||"#7b6cff"};--h:250;${img}">${img?"":esc((ME.name[0]||"?").toUpperCase())}</div><span>${n}</span></button>`).join("")}</div><button onclick="prof()">← Zurück zum Profil</button>`);
}
async function decoPick(k){
  const r=await api("profile",{deco:k});if(r&&r.error)return toast(r.error);
  ME.deco=k;(U[ME.name]||(U[ME.name]={name:ME.name})).deco=k;last="";decoUI();me();if(typeof home=="function"&&!srv)home();toast(k?"Dekoration gespeichert ✔":"Dekoration entfernt");
}

/* ---------- Profilfenster erweitern ---------- */
const _prof7=prof;
prof=function(){
  _prof7.apply(this,arguments);
  const h=document.querySelector("#mc h3");if(!h)return;
  const d=document.createElement("div");d.className="v7p";
  d.innerHTML=`<button onclick="decoUI()">✨ Profilbild-Dekoration${ME.deco?" · "+esc((DECO.find(x=>x[0]==ME.deco)||["",ME.deco])[1]):""}</button><button onclick="e2ui()">🔐 Verschlüsselung &amp; Schlüssel-Sicherung</button>`;
  h.after(d);
};

/* ===================== Navigation (Discord-Stil) ===================== */
const wide=()=>matchMedia("(min-width:1100px)").matches,drw=()=>matchMedia("(max-width:900px)").matches;
(function(){
  const mp=document.createElement("aside");mp.id="mpanel";mp.setAttribute("aria-label","Mitglieder");$("#main").after(mp);
  const sc=document.createElement("div");sc.id="scrim7";sc.onclick=()=>navClose();document.body.append(sc);
  const tip=document.createElement("div");tip.id="rtip";document.body.append(tip);
  const sb=document.createElement("button");sb.id="qsb";sb.className="qsb";sb.innerHTML='<span>🔍 Suchen</span><kbd>Strg K</kbd>';sb.onclick=()=>qs();$("#st").after(sb);
  if(localStorage.mpon===undefined)localStorage.mpon="1";
  document.body.classList.toggle("mp-on",localStorage.mpon!="0");
})();
function navClose(){$("#side").classList.remove("open");document.body.classList.remove("mp-open");$("#scrim7").classList.remove("on")}
function mpToggle(){
  if(wide()){localStorage.mpon=localStorage.mpon=="0"?"1":"0";document.body.classList.toggle("mp-on",localStorage.mpon!="0")}
  else{const o=!document.body.classList.contains("mp-open");$("#side").classList.remove("open");document.body.classList.toggle("mp-open",o);$("#scrim7").classList.toggle("on",o)}
}
let MPH="";
function mpSync(){const p=$("#mpanel");if(!p||typeof srv=="undefined"||!srv)return;const h=memBlock();if(h!=MPH){MPH=h;p.innerHTML=h}}
function hdFix(){
  const hd=$("#hd");if(!hd)return;hd.querySelectorAll(".v7b").forEach(e=>e.remove());
  const hs=hd.querySelector(".hs")||hd,add=(h)=>hs.insertAdjacentHTML("afterbegin",h);
  if(ch&&e2on(ch)&&!ME.ek&&!localStorage["e2ask:"+ME.name]){localStorage["e2ask:"+ME.name]=1;setTimeout(e2backup,700)} /* einmalig beim ersten verschlüsselten Chat */
  if(ch&&ch.startsWith("dm:")&&!ch.startsWith("dm:g")){const on=e2on(ch)&&((U[e2peer(ch)]||{}).pk);add(`<button class="v7b" title="${on?"Ende-zu-Ende-verschlüsselt":"Nicht verschlüsselt"}" aria-label="Verschlüsselung" onclick="e2ui('${ch}')">${on?"🔒":"🔓"}</button>`)}
  if(srv&&ch)add(`<button class="v7b" title="Mitgliederliste" aria-label="Mitglieder" onclick="mpToggle()">👥</button>`);
}
function railFix(){
  const r=$("#rail");if(!r)return;
  r.querySelectorAll(".ic[title]").forEach(e=>{e.dataset.t=e.title;e.removeAttribute("title")});
  if(!r.querySelector(".ic.cmp")){const c=document.createElement("div");c.className="ic add cmp";c.dataset.t="Öffentliche Server entdecken";c.textContent="🧭";c.onclick=()=>discUI();r.append(c)}
}
function tabFix(){
  const b=$("#bn");if(!b||typeof ME=="undefined"||!ME)return;const n=pend(),on=document.body.classList.contains("onhome");
  const k=b.dataset.v7=="1";
  if(!k){b.dataset.v7="1";b.innerHTML=`<button data-t="srv" onclick="tabGo('srv')"><b>🏠</b>Server</button><button data-t="fr" onclick="tabGo('fr')"><b>👥<i class="bdg fbd hide"></i></b>Freunde</button><button data-t="qs" onclick="tabGo('qs')"><b>🔍</b>Suche</button><button data-t="me" onclick="tabGo('me')"><b>👤</b>Du</button>`}
  b.querySelectorAll(".fbd").forEach(e=>{e.textContent=n;e.classList.toggle("hide",!n)});
  b.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.t=="fr"&&on&&FV));
}
function tabGo(t){
  if(t=="srv"){document.body.classList.remove("mp-open");$("#side").classList.add("open");$("#scrim7").classList.remove("on")}
  else if(t=="fr")showHome();else if(t=="qs")qs();else prof();
}
function navSync(){
  document.body.classList.toggle("insrv",!!(typeof srv!="undefined"&&srv));hdFix();railFix();tabFix();mpSync();
}
new MutationObserver(navSync).observe($("#hd"),{childList:true});
new MutationObserver(navSync).observe($("#rail"),{childList:true});
new MutationObserver(()=>requestAnimationFrame(mpSync)).observe($("#list"),{childList:true,subtree:true});
new MutationObserver(()=>vreapply()).observe($("#msgs"),{childList:true});
setInterval(()=>{tabFix();mpSync()},3000);navSync();

/* Tooltip der Serverleiste (Desktop) */
{const tip=$("#rtip");
 $("#rail").addEventListener("mouseover",e=>{const i=e.target.closest(".ic[data-t]");if(!i||!matchMedia("(hover:hover)").matches)return;const r=i.getBoundingClientRect();tip.textContent=i.dataset.t;tip.style.top=(r.top+r.height/2)+"px";tip.style.left=(r.right+12)+"px";tip.classList.add("on")});
 $("#rail").addEventListener("mouseout",()=>tip.classList.remove("on"));
 $("#rail").addEventListener("scroll",()=>tip.classList.remove("on"),{passive:true})}

/* ---------- Schnellwechsler (Strg/Cmd+K, Tab „Suche“) ---------- */
let QL=[],QI=0;
function qsItems(){
  const o=[],dms=new Set([...(ME.dms||[]),...(ME.friends||[])]);
  dms.forEach(n=>o.push({k:"@",ic:"👤",t:n,s:"Direktnachricht",go:()=>dmTo(n)}));
  Object.keys(U).forEach(n=>{if(n!=ME.name&&!dms.has(n))o.push({k:"@",ic:"👤",t:n,s:"Nutzer",go:()=>dmTo(n)})});
  S.forEach(s=>{o.push({k:"*",ic:"🏠",t:s.name,s:"Server",go:()=>openSrv(s.id)});
    s.channels.filter(c=>!c.view&&c.type!="voice"&&c.type!="stage").forEach(c=>o.push({k:"#",ic:IC[c.type]||"#",t:c.name,s:s.name,go:()=>{openSrv(s.id);open_(s.id+"/"+c.id,"# "+c.name)}}))});
  return o;
}
function qs(){
  if(!ME)return;QI=0;modal(`<div class="qsw"><input id="qsi" class="qsi" placeholder="Wohin möchtest du?  @Person  #Kanal  *Server" autocomplete="off" autocapitalize="none" spellcheck="false" oninput="qsr()" onkeydown="qsk(event)"><div id="qsl" class="qsl"></div><small class="dm">↑ ↓ wählen · Enter öffnen · Esc schließen</small></div>`);
  qsr();setTimeout(()=>{const i=$("#qsi");i&&i.focus()},30);
}
function qsr(){
  const raw=($("#qsi")||{value:""}).value.trim().toLowerCase(),k="@#*".includes(raw[0]||" ")?raw[0]:"",q=k?raw.slice(1):raw;
  const sc=i=>{const t=i.t.toLowerCase();if(!q)return 1;if(t==q)return 4;if(t.startsWith(q))return 3;if(t.includes(q))return 2;if(i.s.toLowerCase().includes(q))return 1;return 0};
  QL=qsItems().filter(i=>(!k||i.k==k)&&sc(i)).map(i=>({i,s:sc(i)})).sort((a,b)=>b.s-a.s).slice(0,12).map(x=>x.i);QI=0;qsd();
}
function qsd(){const l=$("#qsl");if(l)l.innerHTML=QL.map((i,n)=>`<div class="qsr ${n==QI?"on":""}" onclick="qsgo(${n})"><span class="qic">${i.ic}</span><b>${esc(i.t)}</b><small>${esc(i.s)}</small></div>`).join("")||'<div class="dm" style="padding:12px">Nichts gefunden</div>'}
function qsk(e){
  if(e.key=="ArrowDown"||e.key=="ArrowUp"){e.preventDefault();QI=(QI+(e.key=="ArrowDown"?1:QL.length-1))%Math.max(1,QL.length);qsd();const o=document.querySelector(".qsr.on");o&&o.scrollIntoView({block:"nearest"})}
  else if(e.key=="Enter"){e.preventDefault();qsgo(QI)}
}
function qsgo(n){const i=QL[n];if(!i)return;$("#modal").classList.add("hide");navClose();i.go()}

/* ---------- Tastenkürzel ---------- */
function navStep(d){
  if(srv){const l=vis().filter(c=>c.type!="voice"&&c.type!="stage"),cur=(ch||"").split("/")[1]?.split("~")[0],i=l.findIndex(c=>c.id==cur),n=l[(i+d+l.length)%l.length];n&&open_(srv.id+"/"+n.id,"# "+n.name)}
  else{const l=(ME.dms||[]).filter(n=>!(ME.blocked||[]).includes(n));if(!l.length)return;const i=l.findIndex(n=>dm(n)==ch),n=l[(i+d+l.length)%l.length];open_(dm(n),"@"+n)}
}
function srvStep(d){const l=[null,...S],i=srv?l.findIndex(s=>s&&s.id==srv.id):0,n=l[(i+d+l.length)%l.length];n?openSrv(n.id):showHome()}
function keyHelp(){modal(`<h3>⌨️ Tastenkürzel</h3><div class="khl">${[["Strg/Cmd + K","Schnellwechsler"],["Alt + ↑ / ↓","Vorheriger / nächster Kanal bzw. Chat"],["Strg/Cmd + Alt + ↑ / ↓","Vorheriger / nächster Server"],["Strg/Cmd + Umschalt + M","Mitgliederliste ein/aus"],["Strg/Cmd + /","Diese Übersicht"],["Esc","Fenster schließen"],["V","Push-to-Talk (im Anruf)"]].map(([a,b])=>`<div><kbd>${a}</kbd><span>${b}</span></div>`).join("")}</div>`)}
addEventListener("keydown",e=>{
  if(!ME||document.querySelector("#auth:not(.hide)"))return;const m=e.ctrlKey||e.metaKey,k=e.key;
  if(m&&k.toLowerCase()=="k"){e.preventDefault();qs()}
  else if(m&&e.altKey&&(k=="ArrowUp"||k=="ArrowDown")){e.preventDefault();srvStep(k=="ArrowDown"?1:-1)}
  else if(e.altKey&&!m&&(k=="ArrowUp"||k=="ArrowDown")){e.preventDefault();navStep(k=="ArrowDown"?1:-1)}
  else if(m&&e.shiftKey&&k.toLowerCase()=="m"&&srv){e.preventDefault();mpToggle()}
  else if(m&&k=="/"){e.preventDefault();keyHelp()}
  else if(k=="Escape"&&drw())navClose();
});

/* ---------- Wischgesten mit Finger-Tracking: links = Server & Chats, rechts = Mitglieder ---------- */
{
  let g=null;const sd=$("#side"),rl=$("#rail"),mpn=$("#mpanel"),sc=$("#scrim7");
  const blocked=t=>t.closest("input,textarea,select,pre,code,video,audio,iframe,canvas,.vwv,.vlive,[data-noswipe],#vp,.sset,.eg,.gg");
  document.addEventListener("touchstart",e=>{
    g=null;if(!drw()||e.touches.length!=1||document.querySelector("#modal:not(.hide),.dlg,.sset,#auth:not(.hide)")||blocked(e.target))return;
    const t=e.touches[0];g={x:t.clientX,y:t.clientY,t:Date.now(),L:sd.classList.contains("open"),R:document.body.classList.contains("mp-open"),dir:0,tg:"",p:0};
  },{passive:true});
  const apply=p=>{
    const L=g.tg=="L";(L?[rl,sd]:[mpn]).forEach(el=>{el.style.transition="none";el.style.transform=`translateX(${L?-140*(1-p):120*(1-p)}%)`});
    sc.classList.add("on");sc.style.opacity=p;g.p=p;
  };
  document.addEventListener("touchmove",e=>{
    if(!g)return;const t=e.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
    if(!g.dir){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;if(Math.abs(dx)<Math.abs(dy)*1.4){g=null;return}g.dir=1;
      if(g.L)g.tg="L";else if(g.R)g.tg="R";else if(dx>0)g.tg="L";else if(srv&&!g.L)g.tg="R";else{g=null;return}
      if(g.tg=="L")document.body.classList.remove("mp-open");else sd.classList.remove("open")}
    const W=g.tg=="L"?Math.min(340,innerWidth*.86):mpn.offsetWidth||300,base=(g.tg=="L"?g.L:g.R)?1:0;
    apply(Math.max(0,Math.min(1,base+(g.tg=="L"?dx:-dx)/W)));
  },{passive:true});
  const end=e=>{
    if(!g||!g.dir||!g.tg){g=null;return}
    const t=(e.changedTouches||[{clientX:g.x}])[0],dx=t.clientX-g.x,vx=dx/Math.max(1,Date.now()-g.t),L=g.tg=="L",dirv=L?vx:-vx;
    const open=dirv>.45?true:dirv<-.45?false:g.p>.5;
    [rl,sd,mpn].forEach(el=>{el.style.transition="";el.style.transform=""});sc.style.opacity="";
    if(L)sd.classList.toggle("open",open);else document.body.classList.toggle("mp-open",open);
    sc.classList.toggle("on",open&&!L);
    if(navigator.vibrate&&open!=(L?g.L:g.R))try{navigator.vibrate(8)}catch(er){}
    g=null;
  };
  document.addEventListener("touchend",end,{passive:true});document.addEventListener("touchcancel",end,{passive:true});
}
