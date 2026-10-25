/* v11: Mikrofon-Einstellungen & Mikrofon-Test (Gerät, Lautstärke, Gate, Echo/Rausch/AGC, KI-Rauschfilter, PTT-Taste, Ausgabegerät) */
(function(){
var KEY="mic9",DEF={id:"",spk:"",ec:true,agc:true,ns:null,gain:1,gate:0};
function cfg(){var o={};try{o=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}return Object.assign({},DEF,o)}
function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
var md=navigator.mediaDevices;
/* ---- getUserMedia-Patch: Einstellungen gelten für Anrufe, Sprachnachrichten und den Test ---- */
if(md&&md.getUserMedia&&!md.__m9){
 var og=md.getUserMedia.bind(md);md.__m9=1;
 md.getUserMedia=async function(c){
  if(!c||!c.audio||c.video)return og(c);
  var S=cfg(),a=typeof c.audio=="object"?Object.assign({},c.audio):{};
  if(S.id)a.deviceId={exact:S.id};
  a.echoCancellation=S.ec;a.autoGainControl=S.agc;if(S.ns!==null)a.noiseSuppression=S.ns;
  var st;try{st=await og({audio:a})}catch(e){if(S.id){delete a.deviceId;st=await og({audio:a})}else throw e}
  return process(st,S)}}
function process(st,S){
 if(Math.abs(S.gain-1)<.01&&!S.gate)return st;
 var AC=window.AudioContext||window.webkitAudioContext,ac=new AC(),src=ac.createMediaStreamSource(st),g=ac.createGain(),gate=ac.createGain(),an=ac.createAnalyser(),dest=ac.createMediaStreamDestination();
 g.gain.value=S.gain;an.fftSize=1024;src.connect(g);g.connect(an);g.connect(gate);gate.connect(dest);
 var thr=.003+(S.gate/100)*.07,hold=0,buf=new Float32Array(an.fftSize),iv=null;
 if(S.gate)iv=setInterval(function(){an.getFloatTimeDomainData(buf);var s=0;for(var i=0;i<buf.length;i++)s+=buf[i]*buf[i];var r=Math.sqrt(s/buf.length),now=Date.now();
  if(r>thr)hold=now+250;gate.gain.setTargetAtTime(now<hold?1:0,ac.currentTime,.02)},25);
 if(ac.state=="suspended")ac.resume();
 var out=dest.stream,t=out.getAudioTracks()[0],os=t.stop.bind(t);
 t.stop=function(){clearInterval(iv);st.getTracks().forEach(function(x){x.stop()});try{ac.close()}catch(e){}os()};
 return out}
/* ---- Ausgabegerät auf alle Audio/Video-Elemente anwenden ---- */
function sink(el){var S=cfg();if(S.spk&&el.setSinkId&&el.sinkId!==S.spk)el.setSinkId(S.spk).catch(function(){})}
var op=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){sink(this);return op.apply(this,arguments)};
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!=1)return;if(/^(AUDIO|VIDEO)$/.test(n.tagName))sink(n);n.querySelectorAll&&n.querySelectorAll("audio,video").forEach(sink)})})}).observe(document.documentElement,{childList:true,subtree:true});
/* ---- Push-to-Talk-Taste ---- */
var pk=function(){return localStorage.pttk||"v"};
/* ---- UI ---- */
var $=function(q){return document.querySelector(q)};
var T=null,loop=false,capKey=false;
function esc9(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
async function micSettings(){
 var S=cfg(),rn=localStorage.rn!="0",ns=S.ns===null?!rn:S.ns;
 modal('<h3>🎙 Mikrofon-Einstellungen</h3><div id="m9">'+
 '<label>Eingabegerät<select id="m9i" onchange="m9set(\'id\',this.value)"><option value="">Standard</option></select></label>'+
 '<label id="m9ow">Ausgabegerät (Lautsprecher / Kopfhörer)<select id="m9o" onchange="m9set(\'spk\',this.value)"><option value="">Standard</option></select></label>'+
 '<div class="m9meter"><i id="m9l"></i><u id="m9pk"></u></div><div id="m9s" class="dm">Tippe auf „Mikrofon testen“, um deinen Pegel live zu sehen.</div>'+
 '<div class="m9row"><button class="pri" id="m9t" onclick="m9toggle()">🎙 Mikrofon testen</button><button id="m9e" onclick="m9echo()">⏺ Echo-Test (5 s)</button></div>'+
 '<label class="m9chk"><input type="checkbox" id="m9lb" onchange="m9loop(this.checked)"> Mich selbst hören (nur mit Kopfhörern!)</label><hr>'+
 '<label>Eingangslautstärke <b id="m9gv">'+Math.round(S.gain*100)+' %</b><input type="range" id="m9g" min="0" max="200" step="5" value="'+Math.round(S.gain*100)+'" oninput="$(\'#m9gv\').textContent=this.value+\' %\'" onchange="m9set(\'gain\',this.value/100)"></label>'+
 '<label>Rausch-Gate – leise Geräusche abschneiden <b id="m9tv">'+(S.gate?S.gate+" %":"Aus")+'</b><input type="range" id="m9th" min="0" max="100" step="5" value="'+S.gate+'" oninput="$(\'#m9tv\').textContent=this.value>0?this.value+\' %\':\'Aus\'" onchange="m9set(\'gate\',+this.value)"></label>'+
 '<label class="m9chk"><input type="checkbox" id="m9ec" '+(S.ec?"checked":"")+' onchange="m9set(\'ec\',this.checked)"> Echo-Unterdrückung</label>'+
 '<label class="m9chk"><input type="checkbox" id="m9ag" '+(S.agc?"checked":"")+' onchange="m9set(\'agc\',this.checked)"> Automatische Verstärkung</label>'+
 '<label class="m9chk"><input type="checkbox" id="m9ns" '+(ns?"checked":"")+' onchange="m9set(\'ns\',this.checked)"> Browser-Rauschfilter</label>'+
 '<label class="m9chk"><input type="checkbox" id="m9rn" '+(rn?"checked":"")+' onchange="m9set(\'rn\',this.checked)"> KI-Rauschunterdrückung (RNNoise, in Anrufen)</label>'+
 '<label>Push-to-Talk-Taste <button id="m9k" onclick="m9key()">'+esc9(pk().toUpperCase())+'</button></label>'+
 '<button onclick="m9reset()">Alles zurücksetzen</button></div>');
 var iv=setInterval(function(){if(!$("#m9")){clearInterval(iv);stop()}},500);
 devices()}
async function devices(){
 var S=cfg(),si=$("#m9i"),so=$("#m9o");if(!si)return;
 try{var t=await navigator.mediaDevices.getUserMedia({audio:true});t.getTracks().forEach(function(x){x.stop()})}catch(e){$("#m9s").textContent="Kein Zugriff auf das Mikrofon – bitte im Browser erlauben ("+e.name+").";}
 var d=[];try{d=await navigator.mediaDevices.enumerateDevices()}catch(e){}
 function fill(sel,kind,cur){d.filter(function(x){return x.kind==kind}).forEach(function(x,i){var o=document.createElement("option");o.value=x.deviceId;o.textContent=x.label||(kind=="audioinput"?"Mikrofon ":"Lautsprecher ")+(i+1);sel.appendChild(o)});sel.value=cur;if(sel.value!=cur)sel.value=""}
 fill(si,"audioinput",S.id);
 if(!HTMLMediaElement.prototype.setSinkId){$("#m9ow").innerHTML='Ausgabegerät <small class="dm">– wird von diesem Browser nicht unterstützt (nur Chrome/Edge/Android).</small>'}else fill(so,"audiooutput",S.spk)}
function setk(k,v){var S=cfg();
 if(k=="rn"){localStorage.rn=v?"1":"0";var n=$("#m9ns");if(n&&cfg().ns===null)n.checked=!v;return}
 S[k]=v;save(S);if(T)restart()}
async function start(){
 stop();var s=$("#m9s"),b=$("#m9t");if(s)s.textContent="Mikrofon wird angefragt …";
 var st;try{st=await navigator.mediaDevices.getUserMedia({audio:{}});if(localStorage.rn!="0"&&typeof denoise=="function")st=await denoise(st)}catch(e){if(s)s.textContent="Kein Zugriff auf das Mikrofon: "+e.message;return}
 var AC=window.AudioContext||window.webkitAudioContext,ac=new AC(),src=ac.createMediaStreamSource(st),an=ac.createAnalyser(),lg=ac.createGain();an.fftSize=1024;src.connect(an);src.connect(lg);lg.gain.value=loop?1:0;lg.connect(ac.destination);
 if(ac.state=="suspended")ac.resume();
 T={st:st,ac:ac,an:an,lg:lg,buf:new Float32Array(an.fftSize),peak:0,pt:0,quiet:Date.now()};
 if(b)b.textContent="⏹ Test beenden";tick()}
function tick(){
 if(!T)return;var t=T;t.an.getFloatTimeDomainData(t.buf);var s=0,m=0;for(var i=0;i<t.buf.length;i++){s+=t.buf[i]*t.buf[i];m=Math.max(m,Math.abs(t.buf[i]))}
 var r=Math.sqrt(s/t.buf.length),db=r>1e-5?20*Math.log10(r):-100,pct=Math.max(0,Math.min(100,(db+60)/60*100)),now=Date.now();
 if(pct>t.peak||now-t.pt>1200){if(pct>=t.peak){t.peak=pct;t.pt=now}else t.peak=Math.max(pct,t.peak-1.5)}
 if(db>-50)t.quiet=now;
 var l=$("#m9l"),p=$("#m9pk"),s2=$("#m9s");if(l){l.style.width=pct+"%";l.className=pct>85?"hot":pct>60?"mid":""}if(p)p.style.left=t.peak+"%";
 if(s2&&!t.rec)s2.textContent=now-t.quiet>4000?"⚠ Kaum Signal – sprich lauter, prüfe das Gerät oder erhöhe die Eingangslautstärke.":"Pegel: "+(db>-100?Math.round(db):"–∞")+" dB"+(m>=.99?"  ·  Übersteuert!":"");
 t.raf=requestAnimationFrame(tick)}
function stop(){
 if(!T)return;var t=T;T=null;cancelAnimationFrame(t.raf);try{t.st.getTracks().forEach(function(x){x.stop()})}catch(e){}try{t.ac.close()}catch(e){}
 var b=$("#m9t"),l=$("#m9l"),p=$("#m9pk");if(b)b.textContent="🎙 Mikrofon testen";if(l)l.style.width="0";if(p)p.style.left="0"}
async function restart(){await start()}
function toggle(){T?stop():start()}
async function echo(){
 if(!T)await start();if(!T||T.rec)return;var t=T,s=$("#m9s"),b=$("#m9e");
 if(!window.MediaRecorder){s.textContent="Aufnahme wird von diesem Browser nicht unterstützt.";return}
 var ch=[],rec=new MediaRecorder(t.st);t.rec=1;b.disabled=true;rec.ondataavailable=function(e){e.data.size&&ch.push(e.data)};
 rec.start();var left=5;s.textContent="⏺ Aufnahme … "+left+" s – sprich jetzt!";
 var iv=setInterval(function(){left--;if(left>0)s.textContent="⏺ Aufnahme … "+left+" s – sprich jetzt!"},1000);
 await new Promise(function(r){setTimeout(r,5000)});clearInterval(iv);
 await new Promise(function(r){rec.onstop=r;rec.stop()});
 if(T===t){t.lg.gain.value=0}
 var a=new Audio(URL.createObjectURL(new Blob(ch,{type:rec.mimeType||"audio/webm"})));s.textContent="▶ Wiedergabe deiner Aufnahme …";
 var done=function(){if(T===t)t.rec=0;b.disabled=false;if($("#m9s"))$("#m9s").textContent="✔ Fertig. Hast du dich gut gehört, passen deine Einstellungen."};
 a.onended=done;a.play().catch(done)}
function setLoop(v){loop=!!v;if(T)T.lg.gain.value=loop?1:0}
function key(){var b=$("#m9k");if(!b||capKey)return;capKey=true;b.textContent="Taste drücken …";
 var h=function(e){e.preventDefault();e.stopPropagation();document.removeEventListener("keydown",h,true);capKey=false;
  if(e.key!="Escape"){localStorage.pttk=e.key.length==1?e.key.toLowerCase():e.key;}b.textContent=pk().toUpperCase()};
 document.addEventListener("keydown",h,true)}
function reset(){try{localStorage.removeItem(KEY);localStorage.removeItem("pttk");localStorage.rn="1"}catch(e){}stop();micSettings()}
window.micSettings=micSettings;window.micTest=micSettings;
window.m9set=setk;window.m9toggle=toggle;window.m9echo=echo;window.m9loop=setLoop;window.m9key=key;window.m9reset=reset;window.m9pk=pk;
/* Einstieg: Button oben in „Profil & Einstellungen“ */
var _p=window.prof;
if(typeof _p=="function"){window.prof=function(){_p.apply(this,arguments);var mc=document.getElementById("mc"),h=mc&&mc.querySelector("h3");
 if(h&&!mc.querySelector(".m9entry"))h.insertAdjacentHTML("afterend",'<button class="pri m9entry" onclick="micSettings()">🎙 Mikrofon-Einstellungen &amp; Test</button>')}}
})();
