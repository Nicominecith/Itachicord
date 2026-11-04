/* ===== Pulsecord v16: E2E nur für Voice (Text unverschlüsselt) + Funktions-Paket aus der Liste ===== */
(function () {
  "use strict";
  var $1 = function (s) { return document.querySelector(s); };
  var h = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var who = function () { try { return ME.name; } catch (e) { return "x"; } };
  var LS = function (k, d) { try { var v = JSON.parse(localStorage["p16." + who() + "." + k]); return v == null ? d : v; } catch (e) { return d; } };
  var SV = function (k, v) { localStorage["p16." + who() + "." + k] = JSON.stringify(v); };
  var say = function (m) { try { toast(m); } catch (e) { console.log(m); } };

  /* ---------- 1) E2E nur noch für Voice ---------- */
  // Text, Bearbeitungen und normale Dateien: unverschlüsselt. Alte verschlüsselte Nachrichten bleiben lesbar (e2dec bleibt aktiv).
  window.e2enc = async function (c, t) { return t; };
  var gate0 = window.e2gate, up0 = window.upFile, vu = false;
  window.e2gate = async function (c) { return vu ? gate0(c) : false; };
  window.upFile = async function (f, name, type) {
    vu = /^sprachnachricht\./.test(name || ""); // nur Sprachnachrichten werden verschlüsselt
    try { return await up0(f, name, type); } finally { vu = false; }
  };
  // Voice-Anrufe (1:1-DM): Audio-Frames per RTCRtpScriptTransform mit dem DM-Schlüssel (AES-GCM) verschlüsseln
  var WSRC = 'const K={};onmessage=e=>{K[e.data.room]=e.data.key};onrtctransform=e=>{const t=e.transformer,o=t.options,enc=o.op=="enc";' +
    't.readable.pipeThrough(new TransformStream({async transform(f,c){const k=K[o.room];if(k===undefined)return;if(k===false){c.enqueue(f);return}' +
    'try{const d=new Uint8Array(f.data);if(enc){const iv=crypto.getRandomValues(new Uint8Array(12)),x=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},k,d)),n=new Uint8Array(12+x.length);n.set(iv);n.set(x,12);f.data=n.buffer}' +
    'else{if(d.length<29)return;f.data=await crypto.subtle.decrypt({name:"AES-GCM",iv:d.slice(0,12)},k,d.slice(12))}c.enqueue(f)}catch(_){}}})).pipeTo(t.writable)};';
  var Wk = null, KS = {};
  function vx(x, op) {
    try {
      if (!window.RTCRtpScriptTransform || typeof V === "undefined" || !V || !V.room || !/^dm:/.test(V.room) || /^dm:g/.test(V.room)) return;
      if (!x.track || x.track.kind != "audio") return;
      var room = V.room;
      if (!Wk) Wk = new Worker(URL.createObjectURL(new Blob([WSRC])));
      if (!KS[room]) { KS[room] = 1; e2key(room).then(function (k) { Wk.postMessage({ room: room, key: k || false }); if (k) say("🔒 Voice ist Ende-zu-Ende-verschlüsselt"); }, function () { Wk.postMessage({ room: room, key: false }); }); }
      x.transform = new RTCRtpScriptTransform(Wk, { op: op, room: room });
    } catch (e) { console.warn("voice-e2e", e); }
  }
  var RPC = window.RTCPeerConnection;
  if (RPC) {
    var PC = function () {
      var pc = new (Function.prototype.bind.apply(RPC, [null].concat([].slice.call(arguments))))();
      pc.addEventListener("track", function (e) { vx(e.receiver, "dec"); });
      var at = pc.addTrack.bind(pc);
      pc.addTrack = function () { var s = at.apply(null, arguments); vx(s, "enc"); return s; };
      return pc;
    };
    PC.prototype = RPC.prototype; PC.generateCertificate = RPC.generateCertificate; window.RTCPeerConnection = PC;
  }

  /* ---------- 2) Nachrichten-Aktionen: 🔖 merken, 📌 persönlich anpinnen, ⭐ wichtig (#4, #15, #30) ---------- */
  var KIND = { bm: "🔖 Gemerkt", pin: "📌 Persönlich angepinnt", imp: "⭐ Wichtig" };
  function toggleMark(id, k) {
    var L = LS("marks", []), i = L.findIndex(function (x) { return x.id == id && x.k == k; });
    if (i >= 0) { L.splice(i, 1); say("Entfernt"); } else {
      var m = (typeof M !== "undefined" ? M : []).find(function (y) { return y.id == id; }); if (!m) return;
      L.unshift({ id: id, k: k, ch: ch, u: m.u, text: String(m.text || (m.file ? "📎 " + m.file.name : "")).slice(0, 400), t: m.t }); say(KIND[k] + " ✔");
    }
    SV("marks", L); tag();
  }
  window.p16mark = toggleMark;
  function tag() {
    var L = LS("marks", []);
    document.querySelectorAll("#msgs .m[data-v16]").forEach(function (el) {
      var id = el.dataset.v16; el.classList.toggle("p16imp", L.some(function (x) { return x.id == id && x.k == "imp"; }));
      el.classList.toggle("p16pin", L.some(function (x) { return x.id == id && x.k == "pin"; }));
    });
  }
  function decorate() {
    var box = $1("#msgs"); if (!box) return;
    box.querySelectorAll(".m:not([data-v16])").forEach(function (el) {
      var pb = el.querySelector('.ac button[onclick*="act(\'pin\'"]'), mm = pb && /act\('pin','([0-9a-f]+)'/.exec(pb.getAttribute("onclick")); if (!mm) return;
      el.dataset.v16 = mm[1]; var ac = el.querySelector(".ac"); if (!ac) return;
      ac.insertAdjacentHTML("beforeend", ["bm|🔖|Merken", "pin|📌|Nur für mich anpinnen", "imp|⭐|Als wichtig markieren"].map(function (s) { s = s.split("|"); return '<button title="' + s[2] + '" onclick="event.stopPropagation();p16mark(\'' + mm[1] + "','" + s[0] + '\')">' + s[1] + "</button>"; }).join(""));
    });
    tag(); keywords();
  }
  var seen = {}, seenCh = "";
  function keywords() { // #143 Stichwort-Benachrichtigungen (im geöffneten Kanal)
    var kw = LS("kw", []); if (typeof M === "undefined" || typeof ch === "undefined") return;
    if (seenCh != ch) { seenCh = ch; seen = {}; M.forEach(function (m) { seen[m.id] = 1; }); return; }
    M.forEach(function (m) {
      if (seen[m.id]) return; seen[m.id] = 1; if (m.u == who() || !kw.length) return;
      var t = String(m.text || "").toLowerCase(), k = kw.find(function (w) { return w && t.indexOf(w.toLowerCase()) >= 0; });
      if (k) { say("🔔 „" + k + "“ von " + m.u); try { sfx("msg"); } catch (e) { } }
    });
  }

  /* ---------- 3) Senden rückgängig (#9), geplant/wiederkehrend (#1, #8), Entwürfe (#7, #18) ---------- */
  var send0 = window.send;
  window.send = async function (file) {
    var s = LS("undo", 0), tx = $1("#tx");
    if (!s || file || !tx || !tx.value.trim() || /^\//.test(tx.value) || !ch) return send0.apply(this, arguments);
    var t = tx.value, c = ch, rp = typeof rep !== "undefined" ? rep : null, undone = false;
    tx.value = ""; try { rep = null; $1("#rpb").textContent = ""; } catch (e) { }
    var bar = document.createElement("div"); bar.className = "p16undo";
    bar.innerHTML = "<span>Wird gesendet in <b>" + s + "</b> s</span><button>Rückgängig</button>"; document.body.append(bar);
    var n = s, iv = setInterval(function () { n--; var b = bar.querySelector("b"); if (b) b.textContent = n; }, 1000);
    bar.querySelector("button").onclick = function () { undone = true; if (!tx.value) tx.value = t; bar.remove(); clearInterval(iv); };
    await new Promise(function (r) { setTimeout(r, s * 1000); }); clearInterval(iv); bar.remove(); if (undone) return;
    var r = await api("send", { ch: c, text: t, reply: rp }); if (r && r.error) say(r.error); else { try { sfx("send"); } catch (e) { } }
    last = ""; poll();
  };
  var NEXT = { d: 864e5, w: 6048e5 };
  setInterval(function () {
    var L = LS("sched", []), now = Date.now(), keep = [], ch0 = false;
    L.forEach(function (x) {
      if (x.at > now) return keep.push(x);
      api("send", { ch: x.ch, text: x.text }).then(function (r) { if (r && r.error) say("Geplante Nachricht: " + r.error); });
      if (x.rep && NEXT[x.rep]) { x.at += NEXT[x.rep]; keep.push(x); } ch0 = true;
    });
    if (ch0) SV("sched", keep);
  }, 15000);
  var lastCh = "";
  setInterval(function () {
    var tx = $1("#tx"); if (!tx || typeof ch === "undefined" || !who) return; var D = LS("drafts", {});
    if (lastCh != ch) { lastCh = ch; if (!tx.value && D[ch]) tx.value = D[ch]; return; }
    var v = tx.value; if ((D[ch] || "") != v) { if (v) D[ch] = v; else delete D[ch]; SV("drafts", D); }
    document.querySelectorAll(".v7b").forEach(function (b) { b.title = "Nur Voice & Sprachnachrichten sind Ende-zu-Ende-verschlüsselt (Text nicht). Klick: Sicherheitsnummer"; });
  }, 1000);

  /* ---------- 4) Darstellung (#157, #159, #162, #163, #167, #169) ---------- */
  var SIM = { p: [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]], d: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.01182, .04294, .968881]], t: [[1.255528, -.076749, -.178779], [-.078411, .930809, .147602], [.004733, .691367, .3039]] };
  function cbMatrix(k) { // Daltonisierung: C = I + M·(I − S)
    var S = SIM[k], M2 = [[0, 0, 0], [.7, 1, 0], [.7, 0, 1]], r = [];
    for (var i = 0; i < 3; i++) { r[i] = []; for (var j = 0; j < 3; j++) { var v = i == j ? 1 : 0; for (var q = 0; q < 3; q++) v += M2[i][q] * ((q == j ? 1 : 0) - S[q][j]); r[i][j] = v.toFixed(4); } }
    return r[0].join(" ") + " 0 0 " + r[1].join(" ") + " 0 0 " + r[2].join(" ") + " 0 0 0 0 0 1 0";
  }
  var FONTS = { "": "", lexend: "Lexend", atk: "Atkinson Hyperlegible", serif: "Georgia,serif", mono: "ui-monospace,Consolas,monospace" };
  function look() {
    var a = JSON.parse(localStorage.p16look || "{}"), r = document.documentElement, f = [];
    var st = $1("#p16svg"); if (!st) { document.body.insertAdjacentHTML("beforeend", '<svg id="p16svg" width="0" height="0" style="position:absolute"><filter id="p16cb" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=""/></filter></svg>'); st = $1("#p16svg"); }
    if (a.cb) { st.querySelector("feColorMatrix").setAttribute("values", cbMatrix(a.cb)); f.push("url(#p16cb)"); }
    if (a.hc) f.push("contrast(1.25)");
    r.style.filter = f.join(" ");
    if ((a.font == "lexend" || a.font == "atk") && !$1("#p16fnt")) document.head.insertAdjacentHTML("beforeend", '<link id="p16fnt" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&family=Atkinson+Hyperlegible:wght@400;700&display=swap">');
    var css = (a.font ? "body,button,input,textarea,select{font-family:" + (a.font == "serif" || a.font == "mono" ? FONTS[a.font] : "'" + FONTS[a.font] + "',sans-serif") + "!important}" : "") +
      (a.dys ? "body{letter-spacing:.04em;word-spacing:.12em;line-height:1.7}" : "") + (a.size ? "html{font-size:" + a.size + "%}" : "") + (a.css || "");
    var s = $1("#p16css"); if (!s) { s = document.createElement("style"); s.id = "p16css"; document.head.append(s); } s.textContent = css;
  }
  function autoTheme() { // #169
    var a = JSON.parse(localStorage.p16auto || "null"); if (!a || !a.on) return;
    var n = new Date(), m = n.getHours() * 60 + n.getMinutes(), t = function (x) { x = x.split(":"); return +x[0] * 60 + +x[1]; }, f = t(a.from), u = t(a.to);
    var dark = f < u ? (m >= f && m < u) : (m >= f || m < u), want = dark ? "dark" : "light";
    if (localStorage.mode != want) { localStorage.mode = want; try { applyMode(); } catch (e) { } }
  }
  setInterval(autoTheme, 60000);

  /* ---------- 5) Sicherheit: App-Sperre (#118), Link-Warnung (#134) ---------- */
  var sha = async function (s) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); };
  function lock() {
    var L = JSON.parse(localStorage.p16lock || "null"); if (!L || !L.h || $1("#p16lock")) return;
    var d = document.createElement("div"); d.id = "p16lock";
    d.innerHTML = '<div><h2>🔒 Pulsecord ist gesperrt</h2><input id="p16pin" type="password" inputmode="numeric" placeholder="PIN" autocomplete="off"><button id="p16ok">Entsperren</button><p id="p16er"></p></div>';
    document.body.append(d); var i = $1("#p16pin"); i.focus();
    var go = async function () { if (await sha(L.s + i.value) == L.h) { d.remove(); idle = Date.now(); } else { $1("#p16er").textContent = "Falsche PIN"; i.value = ""; } };
    $1("#p16ok").onclick = go; i.onkeydown = function (e) { if (e.key == "Enter") go(); };
  }
  var idle = Date.now();
  ["pointerdown", "keydown", "touchstart"].forEach(function (e) { addEventListener(e, function () { idle = Date.now(); }, { passive: true }); });
  setInterval(function () { var L = JSON.parse(localStorage.p16lock || "null"); if (L && L.min && Date.now() - idle > L.min * 6e4) lock(); }, 5000);
  var SHORT = /^(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|rb\.gy|goo\.gl|ow\.ly|shorturl\.at)$/i;
  document.addEventListener("click", async function (e) {
    var a = e.target.closest && e.target.closest("#msgs a[href]"); if (!a || a.dataset.p16ok || a.hasAttribute("download") || localStorage.p16links == "0") return;
    var u; try { u = new URL(a.href); } catch (x) { return; } if (u.origin == location.origin || !/^https?:$/.test(u.protocol)) return;
    var w = [], H = u.hostname, tx = a.textContent.trim();
    if (/xn--/i.test(H)) w.push("Die Adresse enthält Sonderzeichen-Tarnung (Punycode).");
    if (/^\d+\.\d+\.\d+\.\d+$/.test(H)) w.push("Die Adresse ist eine reine IP-Adresse.");
    if (SHORT.test(H)) w.push("Verkürzter Link – das Ziel ist nicht sichtbar.");
    if (/\.(zip|mov|tk|ml|ga|cf|gq)$/i.test(H)) w.push("Ungewöhnliche Domain-Endung.");
    if (/disc(o|0)rd|nitro|steamcommunity/i.test(H) && !/(^|\.)(discord\.com|discord\.gg|discordapp\.com|steamcommunity\.com)$/i.test(H)) w.push("Sieht aus wie eine Nachahmung von Discord/Steam.");
    var m = /^(https?:\/\/)?([\w.-]+\.[a-z]{2,})/i.exec(tx); if (m && m[2].toLowerCase() != H.toLowerCase() && tx.indexOf(" ") < 0) w.push("Angezeigter Link (" + m[2] + ") ≠ echtes Ziel (" + H + ").");
    if (u.protocol == "http:") w.push("Unverschlüsselte Verbindung (http).");
    if (!w.length) return; e.preventDefault(); e.stopPropagation();
    if (await yes("⚠️ Verdächtiger Link", w.join("\n") + "\n\nZiel: " + H + "\nTrotzdem öffnen?")) { a.dataset.p16ok = 1; window.open(a.href, "_blank", "noopener"); }
  }, true);

  /* ---------- 6) Panel „✨ Pulse+“ ---------- */
  var TABS = [["mk", "🔖 Gemerkt"], ["pl", "⏰ Planen"], ["dr", "📝 Entwürfe"], ["tp", "🧩 Vorlagen"], ["nt", "🗒 Notizen"], ["kw", "🔔 Stichwörter"], ["lk", "🎨 Darstellung"], ["sc", "🛡 Sicherheit"], ["ft", "📋 Funktionen"]];
  var tab = "mk", FT = null;
  var IMPL = { 1: "n", 4: "n", 7: "t", 8: "n", 9: "n", 15: "n", 17: "n", 18: "n", 30: "n", 41: "n", 118: "t", 134: "n", 143: "t", 157: "n", 159: "n", 162: "n", 163: "n", 167: "n", 169: "n", 60: "v", 71: "v", 74: "v", 82: "v", 127: "v", 140: "v", 141: "v", 156: "v", 158: "v", 168: "v", 170: "v" };
  var ICO = { n: "✅", t: "◐", v: "✔", o: "○" };
  var fmt = function (t) { return t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : ""; };
  function body() {
    var a = JSON.parse(localStorage.p16look || "{}");
    if (tab == "mk") { var L = LS("marks", []); return L.length ? L.map(function (x, i) { return '<div class="p16r"><div><b>' + KIND[x.k] + "</b> · " + h(x.u) + " · <small>" + h(x.ch) + " · " + fmt(x.t) + "</small><br>" + h(x.text) + '</div><button onclick="p16del(\'marks\',' + i + ')">✕</button></div>'; }).join("") : "<p>Noch nichts. Fahre über eine Nachricht (am Handy: tippen) und nutze 🔖 📌 ⭐.</p>"; }
    if (tab == "pl") { var S = LS("sched", []), tx = $1("#tx"); return '<textarea id="p16st" rows="3" placeholder="Nachricht für ' + h(typeof ch !== "undefined" ? ch : "") + '">' + h(tx ? tx.value : "") + '</textarea><div class="p16r"><input id="p16sd" type="datetime-local"><select id="p16sr"><option value="">einmalig</option><option value="d">täglich</option><option value="w">wöchentlich</option></select><button onclick="p16sched()">Planen</button></div><p><small>Wird gesendet, solange Pulsecord auf irgendeinem Gerät geöffnet ist (Zeitplan liegt nur auf diesem Gerät).</small></p>' + S.map(function (x, i) { return '<div class="p16r"><div>' + fmt(x.at) + (x.rep ? " ↻" : "") + " · " + h(x.ch) + "<br>" + h(x.text) + '</div><button onclick="p16del(\'sched\',' + i + ')">✕</button></div>'; }).join("") + '<hr><label>Senden rückgängig: <select onchange="SV16(\'undo\',+this.value)">' + [0, 3, 5, 10].map(function (s) { return '<option value="' + s + '"' + (LS("undo", 0) == s ? " selected" : "") + ">" + (s ? s + " s Bedenkzeit" : "aus") + "</option>"; }).join("") + "</select></label>"; }
    if (tab == "dr") { var D = LS("drafts", {}), k = Object.keys(D); return k.length ? k.map(function (c) { return '<div class="p16r"><div><b>' + h(c) + "</b><br>" + h(D[c]).slice(0, 200) + '</div><button onclick="p16deld(\'' + h(c) + '\')">✕</button></div>'; }).join("") : "<p>Keine offenen Entwürfe. Getippter Text wird pro Chat automatisch gespeichert (nur auf diesem Gerät).</p>"; }
    if (tab == "tp") { var T = LS("tpl", []); return '<div class="p16r"><input id="p16tn" placeholder="Name"><button onclick="p16addtpl()">Aktuellen Eingabetext als Vorlage</button></div>' + T.map(function (x, i) { return '<div class="p16r"><div><b>' + h(x.n) + "</b><br>" + h(x.t).slice(0, 160) + '</div><button onclick="p16use(' + i + ')">Einfügen</button><button onclick="p16del(\'tpl\',' + i + ')">✕</button></div>'; }).join(""); }
    if (tab == "nt") return '<textarea id="p16nt" rows="12" placeholder="Persönlicher Notizkanal – nur für dich, auf diesem Gerät" oninput="SV16(\'notes\',this.value)">' + h(LS("notes", "")) + "</textarea>";
    if (tab == "kw") return '<p>Benachrichtigung, wenn ein Wort im geöffneten Chat fällt (kommagetrennt):</p><input id="p16kw" value="' + h(LS("kw", []).join(", ")) + '" onchange="SV16(\'kw\',this.value.split(\',\').map(function(s){return s.trim()}).filter(Boolean))"><p><small>Prüft Nachrichten im aktuell geöffneten Kanal, nicht im Hintergrund.</small></p>';
    if (tab == "lk") { var A = JSON.parse(localStorage.p16auto || "{}"); var sel = function (k, o) { return "<select onchange=\"p16look('" + k + "',this.value)\">" + o.map(function (x) { return '<option value="' + x[0] + '"' + ((a[k] || "") == x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>"; };
      return "<label>Farbenblind-Hilfe " + sel("cb", [["", "aus"], ["p", "Rot-Schwäche (Protanopie)"], ["d", "Grün-Schwäche (Deuteranopie)"], ["t", "Blau-Gelb-Schwäche (Tritanopie)"]]) + "</label><label>Hoher Kontrast " + sel("hc", [["", "aus"], ["1", "an"]]) + "</label><label>Schrift " + sel("font", [["", "Standard"], ["lexend", "Lexend (leicht lesbar)"], ["atk", "Atkinson Hyperlegible"], ["serif", "Serif"], ["mono", "Monospace"]]) + "</label><label>Dyslexie-freundlich (Abstände) " + sel("dys", [["", "aus"], ["1", "an"]]) + "</label><label>Schriftgröße " + sel("size", [["", "100 %"], ["90", "90 %"], ["115", "115 %"], ["130", "130 %"], ["150", "150 %"]]) + '</label><label>Automatisch Hell/Dunkel: <input type="checkbox" ' + (A.on ? "checked" : "") + ' onchange="p16auto(\'on\',this.checked)"> dunkel von <input type="time" value="' + (A.from || "20:00") + '" onchange="p16auto(\'from\',this.value)"> bis <input type="time" value="' + (A.to || "07:00") + '" onchange="p16auto(\'to\',this.value)"></label><label>Eigenes CSS (nur für dich)<textarea rows="5" onchange="p16look(\'css\',this.value)" placeholder="z. B. .m{border-radius:12px}">' + h(a.css || "") + "</textarea></label>"; }
    if (tab == "sc") { var K = JSON.parse(localStorage.p16lock || "{}"); return "<p><b>App-Sperre</b> (PIN, nur auf diesem Gerät)</p><div class=\"p16r\"><input id=\"p16np\" type=\"password\" inputmode=\"numeric\" placeholder=\"Neue PIN (min. 4)\"><select id=\"p16lm\"><option value=\"0\">nur manuell</option><option value=\"1\">nach 1 Min.</option><option value=\"5\">nach 5 Min.</option><option value=\"15\">nach 15 Min.</option></select><button onclick=\"p16setpin()\">Aktivieren</button>" + (K.h ? '<button onclick="p16lockoff()">Aus</button><button onclick="p16lockNow()">Jetzt sperren</button>' : "") + "</div><p><small>Schützt vor neugierigen Blicken, ersetzt aber keine Geräte-Sperre (läuft im Browser).</small></p><label>Link-Warnung bei verdächtigen Links <input type=\"checkbox\" " + (localStorage.p16links != "0" ? "checked" : "") + " onchange=\"localStorage.p16links=this.checked?'1':'0'\"></label><hr><p><b>Verschlüsselung:</b> Voice-Anrufe (1:1) und Sprachnachrichten sind Ende-zu-Ende-verschlüsselt. Textnachrichten sind es bewusst nicht. Server-Sprachkanäle und Gruppenanrufe sind nicht E2E.</p>"; }
    return '<div id="p16ft">Lade …</div>';
  }
  function ftList() {
    var box = $1("#p16ft"); if (!box) return;
    var go = function (t) {
      var out = [], c = { n: 0, t: 0, v: 0 };
      t.split("\n").forEach(function (l) { var m = /^(\d+)\. (.*)/.exec(l); if (l.indexOf("===") == 0) out.push("<h4>" + h(l.replace(/=/g, "").trim()) + "</h4>"); else if (m) { var s = IMPL[m[1]] || "o"; if (c[s] != null) c[s]++; out.push('<div class="p16f ' + s + '">' + ICO[s] + " " + m[1] + ". " + h(m[2]) + "</div>"); } });
      box.innerHTML = "<p>✅ neu in v16: " + c.n + " · ◐ teilweise: " + c.t + " · ✔ schon vorhanden: " + c.v + " · ○ offen: " + (200 - c.n - c.t - c.v) + "</p>" + out.join("");
    };
    if (FT) go(FT); else fetch("/funktionen.txt").then(function (r) { return r.text(); }).then(function (t) { FT = t; go(t); }).catch(function () { box.textContent = "Liste nicht ladbar."; });
  }
  function draw() {
    var p = $1("#p16p"); if (!p) return;
    p.querySelector(".p16t").innerHTML = TABS.map(function (t) { return '<button class="' + (t[0] == tab ? "on" : "") + '" onclick="p16tab(\'' + t[0] + '\')">' + t[1] + "</button>"; }).join("");
    p.querySelector(".p16b").innerHTML = body(); if (tab == "ft") ftList();
  }
  function open() {
    if ($1("#p16p")) return; var p = document.createElement("div"); p.id = "p16p";
    p.innerHTML = '<div class="p16w"><div class="p16h"><b>✨ Pulse+</b><button onclick="p16close()">✕</button></div><div class="p16t"></div><div class="p16b"></div></div>'; document.body.append(p);
    p.onclick = function (e) { if (e.target == p) p16close(); }; draw();
  }
  window.p16close = function () { var p = $1("#p16p"); p && p.remove(); };
  window.p16tab = function (t) { tab = t; draw(); };
  window.SV16 = function (k, v) { SV(k, v); };
  window.p16del = function (k, i) { var L = LS(k, []); L.splice(i, 1); SV(k, L); tag(); draw(); };
  window.p16deld = function (c) { var D = LS("drafts", {}); delete D[c]; SV("drafts", D); draw(); };
  window.p16sched = function () {
    var t = $1("#p16st").value.trim(), d = $1("#p16sd").value; if (!t || !d || typeof ch === "undefined" || !ch) return say("Text und Zeit angeben");
    var at = new Date(d).getTime(); if (at < Date.now() + 5000) return say("Zeit liegt in der Vergangenheit");
    var L = LS("sched", []); L.push({ ch: ch, text: t, at: at, rep: $1("#p16sr").value }); SV("sched", L); var tx = $1("#tx"); if (tx && tx.value == t) tx.value = ""; say("Geplant ✔"); draw();
  };
  window.p16addtpl = function () { var tx = $1("#tx"), n = $1("#p16tn").value.trim(); if (!tx || !tx.value.trim() || !n) return say("Name + Text im Eingabefeld nötig"); var T = LS("tpl", []); T.push({ n: n, t: tx.value }); SV("tpl", T); draw(); };
  window.p16use = function (i) { var T = LS("tpl", []), tx = $1("#tx"); if (tx && T[i]) { tx.value += T[i].t; tx.focus(); } p16close(); };
  window.p16look = function (k, v) { var a = JSON.parse(localStorage.p16look || "{}"); if (v) a[k] = v; else delete a[k]; localStorage.p16look = JSON.stringify(a); look(); };
  window.p16auto = function (k, v) { var a = JSON.parse(localStorage.p16auto || "{}"); a[k] = v; localStorage.p16auto = JSON.stringify(a); autoTheme(); };
  window.p16setpin = async function () { var p = $1("#p16np").value; if (p.length < 4) return say("Mindestens 4 Zeichen"); var s = crypto.getRandomValues(new Uint8Array(8)).join(""); localStorage.p16lock = JSON.stringify({ s: s, h: await sha(s + p), min: +$1("#p16lm").value }); say("App-Sperre aktiv"); draw(); };
  window.p16lockoff = function () { localStorage.removeItem("p16lock"); draw(); };
  window.p16lockNow = function () { p16close(); lock(); };

  /* Start: Knopf, Tastenkürzel (Strg+Umschalt+P / Strg+L), Beobachter */
  function init() {
    if (!document.body) return setTimeout(init, 200);
    document.body.insertAdjacentHTML("beforeend", '<button id="p16fab" title="Pulse+ (Strg+Umschalt+P)" aria-label="Pulse+">✨</button>'); $1("#p16fab").onclick = open;
    addEventListener("keydown", function (e) { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() == "p") { e.preventDefault(); open(); } if (e.ctrlKey && e.key.toLowerCase() == "l" && localStorage.p16lock) { e.preventDefault(); lock(); } });
    var box = $1("#msgs"); if (box) new MutationObserver(decorate).observe(box, { childList: true });
    look(); autoTheme(); lock();
  }
  init();
})();
