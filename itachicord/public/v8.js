/* v8: Discord-Icons statt UI-Emojis (Chat-Emojis, Picker, Reaktionen & Nachrichtentext bleiben echte Emojis) */
(function(){
var MAP={"🎤": "mic", "🎙": "mic", "🔊": "volume", "🔇": "mute", "🔕": "no-notifications", "🔔": "notifications", "📢": "announcement-channels", "🗂": "browse-channels", "🖼": "images", "✅": "check", "✔": "check", "❌": "close", "✕": "close", "✖": "close", "📌": "pinned-message", "📎": "attachment", "✨": "super-reactions", "🎮": "games", "💬": "message", "🔒": "locked", "🔐": "locked", "🔓": "padlock", "🧵": "threads", "✏": "edit", "📞": "call", "📹": "video-call", "🖥": "desktop", "👥": "members", "👤": "my-account", "🗑": "delete", "🔗": "link", "🚫": "block", "🔞": "text-channel-nsfw", "🪝": "webhooks", "⬇": "donwload", "📧": "inbox", "📦": "products", "⚙": "settings", "🛡": "moderator", "🔨": "ban", "🚪": "leave", "👑": "owner", "⭐": "favorite", "☆": "favorite", "🎉": "events", "📅": "calendar", "📁": "create-category", "📊": "insights", "📨": "invite", "⏳": "timeout", "⏱": "timeout", "👁": "view", "🪪": "id", "🌐": "domain", "🏠": "create-home", "🎭": "role", "📜": "rules", "⚡": "trending", "⚠": "warns-yellow", "🔍": "search", "➕": "add", "🧭": "explore", "⏸": "stop", "⏹": "stop", "↩": "back", "↪": "arrow-right", "⛶": "full-screen", "📋": "copy-username", "🎁": "gift", "🚀": "simple-boost", "🪟": "popout"};
var st=document.createElement("style");
st.textContent=".di{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.22em;object-fit:contain;pointer-events:none;-webkit-user-drag:none;user-select:none}";
document.head.appendChild(st);
var RE=new RegExp("("+Object.keys(MAP).join("|")+")\\uFE0F?","g");
var SKIP=".rx,.eg,.etabs,textarea,input,script,style,option,select,noscript,[data-keep]";
function skip(n){var p=n.parentElement;if(!p)return true;if(p.closest(SKIP))return true;
 var m=p.closest(".m");if(m&&!p.closest(".pin,.rp,.tm,.ac"))return true;return false}
function fix(n){
 var t=n.nodeValue;if(!t||!RE.test(t)){RE.lastIndex=0;return}RE.lastIndex=0;
 if(skip(n))return;
 var f=document.createDocumentFragment(),last=0,m;
 while((m=RE.exec(t))){
  if(m.index>last)f.appendChild(document.createTextNode(t.slice(last,m.index)));
  var i=document.createElement("img");i.className="di";i.alt=m[1];i.draggable=false;i.src="/icons/"+MAP[m[1]]+".png";f.appendChild(i);
  last=m.index+m[0].length}
 RE.lastIndex=0;
 if(last<t.length)f.appendChild(document.createTextNode(t.slice(last)));
 n.parentNode.replaceChild(f,n)}
function scan(r){
 if(r.nodeType==3){fix(r);return}
 if(r.nodeType!=1)return;
 var w=document.createTreeWalker(r,4),a=[],n;
 while((n=w.nextNode()))a.push(n);
 a.forEach(fix)}
var q=[],sched=false;
function flush(){sched=false;var l=q;q=[];l.forEach(function(n){if(n.isConnected)scan(n)})}
var mo=new MutationObserver(function(ms){
 ms.forEach(function(m){
  if(m.type=="characterData")q.push(m.target);
  else m.addedNodes.forEach(function(n){q.push(n)})});
 if(!sched){sched=true;requestAnimationFrame(flush)}});
function start(){scan(document.body);mo.observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
})();
