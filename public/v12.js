/* ===== Pulsecord v12 =====
   - Neuer Einstellungs-Hub (Profil, Konten, Benachrichtigungen, Darstellung, Ton, Sicherheit, Gerät)
   - Profilwechsel (mehrere Konten auf einem Gerät)
   - Startanimation (Stile, Statusmeldungen, Ausblenden)
   - Benachrichtigungs-Einstellungen (Arten, Ruhezeiten, Popups, Ton, Vorschau) – gilt auch für Web-Push
   - Insights-Dashboard für Server                                                              */
(() => {
"use strict";
const gME = () => { try { return ME; } catch (e) { return null; } }, gCH = () => { try { return ch; } catch (e) { return ""; } }, gS = () => { try { return S; } catch (e) { return []; } };
const H = document.documentElement, G = id => document.getElementById(id);
const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const val = id => { const e = G(id); return e ? e.value : ""; };
const nf = n => Number(n || 0).toLocaleString("de-DE");
const E = s => { s = String(s == null ? "" : s); return typeof esc == "function" ? esc(s) : s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); };

/* =====================================================================
   1) Benachrichtigungs-Einstellungen
   ===================================================================== */
const ND = { pop: true, pos: "br", dur: 6, prev: true, badge: true, native: true, sound: true, vib: true, dm: true, mention: true, reply: true, everyone: true, friend: true, call: true, quiet: { on: false, from: "22:00", to: "07:00", calls: true } };
const ncfg = () => { const o = J("pcn", {}); return Object.assign({}, ND, o, { quiet: Object.assign({}, ND.quiet, (o && o.quiet) || {}) }); };
const nsave = c => W("pcn", c);
const mins = t => { const p = String(t || "0:0").split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); };
function quietNow(c) {
  const q = c.quiet; if (!q || !q.on) return false;
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes(), f = mins(q.from), t = mins(q.to);
  return f === t ? false : f < t ? m >= f && m < t : m >= f || m < t;
}
function napply() {
  const c = ncfg(), b = document.body; if (!b) return;
  ["tl", "tr", "bl", "br"].forEach(p => b.classList.toggle("np-" + p, c.pos === p));
  H.style.setProperty("--npd", Math.max(3, Math.min(20, +c.dur || 6)) + "s");
}
window.pcNtf = {
  cfg: ncfg,
  plan(x) {
    const c = ncfg(); let k = x && x.k || "dm"; if (k === "here") k = "everyone";
    const off = c[k] === false || quietNow(c);
    return { pop: !off && c.pop, snd: !off && c.sound, nat: !off && c.native, prev: c.prev };
  },
  ns() { const c = ncfg(); return { dm: c.dm, mention: c.mention, reply: c.reply, everyone: c.everyone, friend: c.friend, call: c.call, preview: c.prev, tz: new Date().getTimezoneOffset(), quiet: c.quiet }; },
  test() {
    const it = { i: "t" + Date.now(), t: Date.now(), ch: gCH() || "", u: (gME() && gME().name) || "Pulsecord", k: "mention", tx: "Das ist eine Test-Benachrichtigung 🔔", s: "Pulsecord", c: "test" };
    if (typeof window.ntfPop == "function") window.ntfPop(it, { prev: ncfg().prev });
    try { if (ncfg().sound) sfx("msg"); } catch (e) {}
    try { if (ncfg().vib && navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
  },
  testNative() {
    if (typeof Notification == "undefined") return toast("Dieser Browser unterstützt keine Systembenachrichtigungen");
    if (Notification.permission !== "granted") return toast("Erst „Benachrichtigungen erlauben“ antippen");
    if (typeof window.ntfNative == "function") window.ntfNative({ i: "tn", t: Date.now(), ch: "", u: (gME() && gME().name) || "Pulsecord", k: "mention", tx: "System-Test: So sieht eine Benachrichtigung aus.", s: "Pulsecord", c: "test" });
  }
};
// Anrufe lassen sich abschalten (Benachrichtigung bleibt in der Seitenleiste sichtbar)
if (typeof window.ringShow == "function") {
  const _rs = window.ringShow;
  window.ringShow = function (r) { if (ncfg().call === false) return; return _rs.apply(this, arguments); };
}
function nsync() { try { napply(); if (window.pcPushSync) window.pcPushSync(); } catch (e) {} }

/* =====================================================================
   2) Konten / Profilwechsel
   ===================================================================== */
const accs = () => { const a = J("pcacc", []); return Array.isArray(a) ? a.filter(x => x && x.n && x.t) : []; };
const accSave = a => W("pcacc", a);
let accSig = "";
function accNote() {
  const ME = gME(); if (!ME || !ME.name || !localStorage.t) return;
  const e = { n: ME.name, t: localStorage.t, c: ME.color || "", d: ME.dname || "", h: ME.hasav ? 1 : 0, v: ME.imv || 0 }, sig = JSON.stringify(e);
  if (sig === accSig) return; accSig = sig;
  const a = accs(), i = a.findIndex(x => x.n === e.n);
  if (i < 0) a.push(e); else a[i] = Object.assign(a[i], e);
  accSave(a);
  try { sessionStorage.removeItem("pcTry"); } catch (e2) {}
}
setInterval(accNote, 2500);
// Veraltetes Konto (Token ungültig) aus der Liste nehmen
if (!localStorage.t) { try { const tr = sessionStorage.pcTry; if (tr) { accSave(accs().filter(x => x.n !== tr)); sessionStorage.removeItem("pcTry"); } } catch (e) {} }

function unpush() {
  return new Promise(res => {
    const t = setTimeout(res, 1500), done = () => { clearTimeout(t); res(); };
    try {
      if (!("serviceWorker" in navigator)) return done();
      navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => s ? api("pushunsub", { endpoint: s.endpoint }).then(done, done) : done()).catch(done);
    } catch (e) { done(); }
  });
}
async function switchTo(n) {
  const a = accs().find(x => x.n === n); if (!a || (gME() && a.n === gME().name)) return;
  accNote(); toast("Wechsle zu @" + n + " …");
  await unpush();
  try { sessionStorage.pcTry = n; } catch (e) {}
  localStorage.t = a.t; location.reload();
}
async function logout(wipe) {
  const cur = gME() && gME().name, all = accs();
  await unpush();
  if (wipe) {
    await Promise.all(all.map(x => fetch("/api?a=logout", { method: "POST", headers: { "x-token": x.t }, body: "{}" }).catch(() => {})));
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    return location.reload();
  }
  try { await api("logout", {}); } catch (e) {}
  const rest = all.filter(x => x.n !== cur); accSave(rest);
  if (rest.length) { try { sessionStorage.pcTry = rest[0].n; } catch (e) {} localStorage.t = rest[0].t; } else localStorage.removeItem("t");
  location.reload();
}
function addAccount() {
  accNote();
  const m = G("modal"); if (m) m.classList.add("hide"); close();
  const a = G("auth"); if (!a) return;
  a.classList.remove("hide"); a.dataset.add = "1";
  if (typeof amode == "function") amode("login");
  if (!a.querySelector(".u12back")) { const b = document.createElement("button"); b.className = "lnk u12back"; b.textContent = "← Zurück zu @" + ((gME() && gME().name) || "deinem Konto"); b.onclick = () => { a.classList.add("hide"); a.dataset.add = ""; b.remove(); }; a.querySelector(".card").append(b); }
  const f = G("an"); if (f) f.focus();
}
function accAvatar(a) {
  const url = a.h && typeof IMG == "function" ? IMG("av", a.n, a.v) : "";
  return `<div class="u12av" style="--c:${E(a.c || "#7b6cff")};${url ? `background-image:url('${url}')` : ""}">${url ? "" : E((a.n[0] || "?").toUpperCase())}</div>`;
}
function accList(compact) {
  const a = accs(), cur = gME() && gME().name;
  return a.map(x => `<div class="u12a ${x.n === cur ? "cur" : ""}">${accAvatar(x)}<div class="u12i"><b>${E(x.d || x.n)}</b><small>@${E(x.n)}</small></div>${x.n === cur ? '<span class="u12tag">Aktiv</span>' : `<button class="pri" onclick="U12.sw('${E(x.n)}')">Wechseln</button>`}${compact ? "" : `<button class="dng" onclick="U12.rm('${E(x.n)}')" title="Von diesem Gerät entfernen">${x.n === cur ? "Abmelden" : "Entfernen"}</button>`}</div>`).join("")
    + `<div class="u12a add" onclick="U12.add()">＋ Weiteres Konto hinzufügen</div>`;
}
function openSwitch() { accNote(); modal(`<h3>🔁 Konto wechseln</h3><div style="display:flex;flex-direction:column;gap:8px">${accList(true)}</div><small class="dm">Konten bleiben auf diesem Gerät gespeichert. Verwalten: Profil → Profile wechseln.</small>`); }
// Login-Seite: gespeicherte Konten zur Auswahl
function accPicker() {
  const a = accs(), card = document.querySelector("#auth .card"); if (!card || localStorage.t || !a.length || G("accpick")) return;
  const d = document.createElement("div"); d.id = "accpick";
  d.innerHTML = `<div class="hd">Gespeicherte Konten</div>` + a.map(x => `<button class="u12a" onclick="U12.sw('${E(x.n)}')">${accAvatar(x)}<span class="u12i"><b>${E(x.d || x.n)}</b><small>Weiter als @${E(x.n)}</small></span><span>→</span></button>`).join("");
  const sub = G("as"); (sub || card.firstChild).after(d);
}
accPicker();
window.auth = async function () {
  const r = await api(AM, { name: val("an"), pass: val("ap"), code: val("ac"), email: val("am") });
  if (r && r.token) { localStorage.t = r.token; try { sessionStorage.removeItem("pcTry"); } catch (e) {} location.reload(); return; }
  if (/2FA/.test((r && r.error) || "")) G("lc").classList.remove("hide");
  G("ae").style.color = "#ff7b8a"; G("ae").textContent = (r && r.error) || "Fehler";
};
// ⇄-Knopf in der Profilleiste unten links
const meBar = G("me");
if (meBar) new MutationObserver(() => {
  if (!meBar.querySelector(".u12sw") && meBar.querySelector(".stb")) {
    const b = document.createElement("button"); b.className = "u12sw"; b.title = "Konto wechseln"; b.setAttribute("aria-label", "Konto wechseln"); b.textContent = "⇄";
    b.onclick = e => { e.stopPropagation(); openSwitch(); }; meBar.append(b);
  }
}).observe(meBar, { childList: true });

/* =====================================================================
   3) Darstellung
   ===================================================================== */
function applyLook() {
  const b = document.body; if (!b) return;
  b.classList.toggle("cmp", !!localStorage.cmp);
  b.classList.toggle("nomotion", !!localStorage.nmo);
  const sp = localStorage.splash; if (sp) H.setAttribute("data-splash", sp); else H.removeAttribute("data-splash");
}
/* =====================================================================
   4) Startanimation
   ===================================================================== */
const BM = [[0, "Pulsecord wird geladen …"], [900, "Verbinde mit dem Server …"], [2200, "Lade Server & Freunde …"], [4200, "Synchronisiere Nachrichten …"], [7500, "Das dauert heute etwas länger …"]];
let bt = [];
function bootStart() {
  bootStop(); const el = G("btmsg"); if (!el) return;
  BM.forEach(([ms, tx]) => bt.push(setTimeout(() => { const e = G("btmsg"); if (!e) return; e.classList.add("sw"); setTimeout(() => { e.textContent = tx; e.classList.remove("sw"); }, 200); }, ms)));
}
function bootStop() { bt.forEach(clearTimeout); bt = []; }
let wasHast = H.classList.contains("hast");
if (wasHast) bootStart();
new MutationObserver(() => {
  const now = H.classList.contains("hast");
  if (!wasHast && now) bootStart();
  if (wasHast && !now) { bootStop(); H.classList.add("bootout"); setTimeout(() => H.classList.remove("bootout"), 640); }
  wasHast = now;
}).observe(H, { attributes: true, attributeFilter: ["class"] });
function splashPreview() {
  close(); H.classList.add("hast"); setTimeout(() => H.classList.remove("hast"), 2600);
}

/* =====================================================================
   5) Einstellungs-Hub
   ===================================================================== */
const row = (t, d, c) => `<div class="u12r"><div class="u12t"><b>${t}</b>${d ? `<small>${d}</small>` : ""}</div><div class="u12c">${c}</div></div>`;
const tg = (on, fn) => `<label class="u12s"><input type="checkbox" ${on ? "checked" : ""} onchange="${fn}"><i></i></label>`;
const card = (h, b) => `<div class="scd">${h ? `<h3>${h}</h3>` : ""}${b}</div>`;
const sl = (id, v, min, max, fn, unit) => `<input type="range" id="${id}" min="${min}" max="${max}" value="${v}" oninput="document.getElementById('${id}o').textContent=this.value+'${unit || ""}';${fn}"><output id="${id}o">${v}${unit || ""}</output>`;
const selH = (cur, opts, fn) => `<select onchange="${fn}">${opts.map(([v, l]) => `<option value="${E(v)}" ${String(v) === String(cur) ? "selected" : ""}>${E(l)}</option>`).join("")}</select>`;
const nt = (k, label, d) => row(label, d, tg(ncfg()[k] !== false, `U12.n('${k}',this.checked)`));

const SECS = [
  ["g", "Benutzer"], ["acc", "👤", "Mein Konto"], ["prof", "🔁", "Profile wechseln"],
  ["g", "App"], ["ntf", "🔔", "Benachrichtigungen"], ["look", "🎨", "Darstellung"], ["snd", "🔊", "Sprache & Ton"],
  ["g", "Sicherheit"], ["sec", "🔒", "Sicherheit & Datenschutz"],
  ["g", "Gerät"], ["dev", "⚙️", "Gerät & App"]
];
const TITLES = { acc: "Mein Konto", prof: "Profile wechseln", ntf: "Benachrichtigungen", look: "Darstellung", snd: "Sprache & Ton", sec: "Sicherheit & Datenschutz", dev: "Gerät & App" };
let cur = "acc", themeTouched = false;

const R = {
  acc() {
    const p = (typeof ptOf == "function" && ptOf(ME)) || { b1: "#0f1b4d", b2: "#6d3fd9", a: "#5aa9ff", t: "#ffffff" };
    const ds = [["n", "Normal"], ["glow", "Leuchten"], ["fire", "Feuer"], ["grad", "Verlauf"], ["rainbow", "Regenbogen"], ["shake", "Wackeln"], ["mono", "Monospace"], ["serif", "Serif"]];
    const conn = ["github", "spotify", "twitch", "reddit", "youtube", "steam"].map(x => `<button onclick="location.href='/api?a=${x == "steam" ? "steam" : "oauth&p=" + x}&t='+T">🔗 ${x}${(ME.links || {})[x] ? " ✅" : ""}</button>`).join("");
    const presets = typeof PT5 != "undefined" ? Object.keys(PT5).map(k => `<button onclick="p5pre('${k}');U12.tt()">${k}</button>`).join("") : "";
    return `<div class="u12prev"><div class="bn" style="${ME.banner ? `background-image:url('${ME.banner}')` : ""}"></div><div class="bd">${av(ME.name, "glow")}<div class="nm"><b>${E(ME.dname || ME.name)}</b><small>@${E(ME.name)}${ME.pron ? " · " + E(ME.pron) : ""}</small></div></div></div>`
      + (typeof uidRow == "function" ? uidRow(ME.name) : "")
      + card("Profil", `<div class="u12g"><label>Anzeigename<input id="p5dn" maxlength="32" placeholder="${E(ME.name)}" value="${E(ME.dname || "")}"></label><label>Custom Status<input id="ps" maxlength="60" value="${E(ME.status || "")}"></label><label>Aktivität<input id="pt" maxlength="60" placeholder="z. B. Spielt Minecraft" value="${E(ME.activity || "")}"></label><label>Pronomen<input id="pr" maxlength="20" value="${E(ME.pron || "")}"></label></div><label style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--mu);font-weight:600">Über mich<textarea id="pb" rows="3" maxlength="300" style="resize:vertical">${E(ME.bio || "")}</textarea></label>`)
      + card("Aussehen", `<div class="u12g"><label>Akzentfarbe<input id="pc" type="color" value="${ME.color || "#7b6cff"}"></label><label>Namensstil<select id="pd">${ds.map(([k, l]) => `<option value="${k}" ${(ME.dstyle || "n") == k ? "selected" : ""}>${l}</option>`).join("")}</select></label><label>Avatar (auch GIF)<input id="pa" type="file" accept="image/*,video/*"></label><label>Banner<input id="pn" type="file" accept="image/*"></label><label>Beitritts-Sound<input id="pe" type="file" accept="audio/*"></label></div><div class="u12bar"><button onclick="decoUI()">✨ Profilbild-Dekoration${ME.deco ? " · aktiv" : ""}</button></div>`)
      + card("Profil-Theme (für alle sichtbar)", `<div class="u12bar">${presets}</div><div class="u12g"><label>Hintergrund 1<input id="p5b1" type="color" value="${p.b1}" oninput="U12.tt()"></label><label>Hintergrund 2<input id="p5b2" type="color" value="${p.b2}" oninput="U12.tt()"></label><label>Akzent<input id="p5a" type="color" value="${p.a}" oninput="U12.tt()"></label><label>Schrift<input id="p5t" type="color" value="${p.t}" oninput="U12.tt()"></label></div><div class="u12bar"><button onclick="U12.resetTheme()">Profil-Theme zurücksetzen</button></div>`)
      + card("Verknüpfte Konten", `<div class="u12bar">${conn}</div><textarea id="pcn" rows="3" placeholder="Verknüpfungen, eine pro Zeile: dienst=name (spotify, steam, twitch, youtube, github, reddit, x, tiktok, xbox, psn)">${E(ME.conn || "")}</textarea>`)
      + `<div class="u12bar"><button class="pri" onclick="U12.saveAll()">💾 Alles speichern</button></div>`;
  },
  prof() {
    accNote();
    return `<p class="u12sub">Mehrere Konten auf einem Gerät – wechsle per Fingertipp, ohne dich jedes Mal neu anzumelden.</p>` + card("Konten auf diesem Gerät", `<div style="display:flex;flex-direction:column;gap:8px">${accList(false)}</div>`)
      + `<div class="u12note">🔐 Beim Wechsel wird die App neu geladen. Jedes Konto hat eigene Server, Chats, Verschlüsselungs-Schlüssel und Benachrichtigungen. „Entfernen“ löscht das Konto nur von diesem Gerät und macht den gespeicherten Zugang ungültig.</div>`
      + `<div class="u12note">Tipp: Der Knopf <b>⇄</b> unten links neben deinem Namen öffnet den schnellen Wechsler.</div>`;
  },
  ntf() {
    const c = ncfg(), perm = typeof Notification == "undefined" ? "unsupported" : Notification.permission, app = !!(window.AndroidApp && window.AndroidApp.isApp);
    const st = app ? `<div class="u12note ok">✅ Android-App: Der Hintergrunddienst liefert Nachrichten und Anrufe.</div>`
      : perm === "granted" ? `<div class="u12note ok">✅ Systembenachrichtigungen sind erlaubt – auch bei geschlossener App (Web-Push).</div>`
      : perm === "denied" ? `<div class="u12note warn">⚠ Benachrichtigungen sind im Browser blockiert. Erlaube sie in den Website-Einstellungen (Schloss-Symbol neben der Adresse) und lade die Seite neu.</div>`
      : perm === "unsupported" ? `<div class="u12note warn">Dieser Browser unterstützt keine Systembenachrichtigungen. Auf dem iPhone: Pulsecord zum Home-Bildschirm hinzufügen (iOS 16.4+).</div>`
      : `<div class="u12note warn">Benachrichtigungen sind noch nicht erlaubt.</div><div class="u12bar"><button class="pri" onclick="U12.perm()">🔔 Benachrichtigungen erlauben</button></div>`;
    const sv = gS().map(s => row("🛡 " + E(s.name), "", tg(!localStorage["mu" + s.id], `U12.mu('${s.id}',this.checked)`))).join("") || `<div class="dm">Du bist noch auf keinem Server.</div>`;
    return `<p class="u12sub">Lege fest, wann und wie Pulsecord dich benachrichtigt. Die Einstellungen gelten für Popups in der App und für Push-Nachrichten auf diesem Gerät.</p>` + st
      + card("Wobei soll ich benachrichtigt werden?", nt("dm", "Direktnachrichten & Gruppen", "Jede neue Nachricht in deinen Chats") + nt("mention", "@Erwähnungen", "Wenn dich jemand mit @name erwähnt") + nt("reply", "Antworten", "Wenn jemand auf deine Nachricht antwortet") + nt("everyone", "@everyone / @here", "Server-weite Pings") + nt("friend", "Freundschaftsanfragen", "") + nt("call", "Anrufe", "Klingelton und Anruf-Karte (Nicht stören schaltet alles stumm)"))
      + card("Anzeige", nt("pop", "Popups in der App", "Karte oben/unten, solange Pulsecord geöffnet ist")
        + row("Position (Desktop)", "Am Handy erscheinen Popups immer oben", selH(c.pos, [["br", "Unten rechts"], ["tr", "Oben rechts"], ["tl", "Oben links"], ["bl", "Unten links"]], "U12.n('pos',this.value)"))
        + row("Anzeigedauer", "Wie lange ein Popup stehen bleibt", sl("u12dur", c.dur, 3, 20, "U12.n('dur',+this.value)", " s"))
        + nt("prev", "Nachrichtentext anzeigen", "Aus = nur „Neue Nachricht“ (auch in Push-Nachrichten)")
        + nt("native", "System-Benachrichtigung im Hintergrund", "Wenn Pulsecord nicht im Vordergrund ist")
        + nt("badge", "Zähler im Tab-Titel", "z. B. „(3) Pulsecord“"))
      + card("Ton & Vibration", nt("sound", "Benachrichtigungston", "Kurzer Ton bei neuen Hinweisen")
        + row("Lautstärke aller Töne", "Betrifft Benachrichtigungen, Klingelton, Beitritts-Sounds", sl("u12vol", localStorage.vol === undefined ? 100 : localStorage.vol, 0, 100, "U12.vol(this.value)", " %"))
        + nt("vib", "Vibration", "Nur auf Geräten mit Vibrationsmotor")
        + `<div class="u12bar"><button onclick="pcNtf.test()">▶ Popup testen</button><button onclick="pcNtf.testNative()">🔔 Systembenachrichtigung testen</button></div>`)
      + card("Ruhezeiten", row("Ruhezeiten aktivieren", "In dieser Zeit bleiben Töne, Popups und Push stumm (ungelesen-Zähler läuft weiter)", tg(c.quiet.on, "U12.q('on',this.checked)"))
        + row("Von", "", `<input type="time" value="${c.quiet.from}" onchange="U12.q('from',this.value)">`)
        + row("Bis", "", `<input type="time" value="${c.quiet.to}" onchange="U12.q('to',this.value)">`)
        + row("Anrufe durchlassen", "Anrufe klingeln trotz Ruhezeit", tg(c.quiet.calls !== false, "U12.q('calls',this.checked)")))
      + card("Server stummschalten", sv)
      + `<div class="u12bar"><button onclick="stUI()">🌙 Status / Nicht stören ändern</button></div>`;
  },
  look() {
    const m = localStorage.mode || "dark", ic = Object.keys(typeof ICONS != "undefined" ? ICONS : {});
    const th = typeof NM != "undefined" ? [["", "Pulse (Standard)"], ...NM.map((n, i) => [i * 18, n])] : [["", "Pulse (Standard)"]];
    return card("Farben", row("Erscheinungsbild", "", selH(m, [["dark", "Dunkel"], ["light", "Hell"], ["amoled", "AMOLED-Schwarz"]], "localStorage.mode=this.value;applyMode()"))
      + row("App-Akzentfarbe", "", `<input type="color" value="${typeof hex == "function" && hex(localStorage.acx) ? localStorage.acx : (ME.color || "#7b6cff")}" oninput="localStorage.acx=this.value;applyMode()"><button onclick="localStorage.acx='';document.documentElement.style.setProperty('--red',ME.color||'#7b6cff');applyMode()">Zurücksetzen</button>`)
      + row("App-Theme", "Farbton der ganzen Oberfläche", selH(localStorage.th === undefined ? "" : localStorage.th, th, "theme(this.value)"))
      + (ic.length > 1 ? row("App-Icon", "", selH(localStorage.ic || "Pulsecord", ic.map(k => [k, k]), "appIcon(this.value)")) : ""))
      + card("Text & Bedienung", row("Schriftgröße", "", sl("u12fs", localStorage.fs || 15, 12, 22, "acc('fs',this.value)", " px"))
        + row("Sättigung", "", sl("u12sat", localStorage.sat || 100, 0, 100, "acc('sat',this.value)", " %"))
        + row("Hoher Kontrast", "", tg(!!localStorage.hc, "acc('hc',this.checked?1:'')"))
        + row("Kompakte Nachrichten", "Weniger Abstand, mehr Inhalt auf dem Bildschirm", tg(!!localStorage.cmp, "U12.ls('cmp',this.checked)"))
        + row("Bewegung reduzieren", "Weniger Animationen (hilfreich bei Schwindel oder schwachen Geräten)", tg(!!localStorage.nmo, "U12.ls('nmo',this.checked)"))
        + row("Streamer-Modus", "Blendet sensible Daten aus (auch automatisch bei Bildschirmfreigabe)", tg(!!localStorage.sm, "localStorage.sm=this.checked?1:'';applySM()")))
      + card("Startanimation", row("Stil beim Start", "Gilt für den Ladebildschirm beim Öffnen der App", selH(localStorage.splash || "full", [["full", "Voll (Ringe, Glanz, Status)"], ["min", "Schlicht (nur Logo)"], ["off", "Keine"]], "U12.splash(this.value)"))
        + `<div class="u12bar"><button onclick="U12.pv()">▶ Vorschau</button></div>`)
      + (typeof bgBlock == "function" ? card("", bgBlock()) : "");
  },
  snd() {
    const rn = localStorage.rn !== "0";
    return card("Töne", row("Soundeffekte", "Senden, Mikro, Beitreten, Verlassen …", tg(localStorage.sfx !== "0", "U12.ls('sfx',this.checked,'1','0')"))
      + row("Lautstärke aller Töne", "", sl("u12vol2", localStorage.vol === undefined ? 100 : localStorage.vol, 0, 100, "U12.vol(this.value)", " %"))
      + `<div class="u12bar"><button onclick="sfx('msg')">▶ Nachrichtenton</button><button onclick="sfx('join')">▶ Beitreten</button><button onclick="sfx('ring')">▶ Klingeln</button></div>`)
      + card("Mikrofon", row("KI-Rauschfilter (RNNoise)", "Filtert Tastatur, Lüfter und Hintergrundlärm", tg(rn, "U12.ls('rn',this.checked,'1','0')"))
        + `<div class="u12bar"><button class="pri" onclick="micSettings()">🎙 Mikrofon-Einstellungen &amp; Test</button><button onclick="micTest()">🎙 Echo-Test (5 s)</button></div>`);
  },
  sec() {
    return card("Konto absichern", row("Zwei-Faktor-Authentifizierung", ME.tfa ? "Aktiv – dein Konto ist zusätzlich geschützt" : "Zusätzlicher Code beim Anmelden", `<button onclick="tfaUI()">${ME.tfa ? "✅ Verwalten" : "Einrichten"}</button>`)
      + row("E-Mail-Adresse", "Für „Passwort vergessen?“", `<button onclick="setmail()">${ME.email ? E(ME.email) : "Hinzufügen"}</button>`)
      + row("Ende-zu-Ende-Verschlüsselung", "Schlüssel-Sicherung für neue Geräte", `<button onclick="e2ui()">Schlüssel verwalten</button>`))
      + card("Sichtbarkeit", row("Online-Status", "Online, Abwesend, Nicht stören oder Unsichtbar", `<button onclick="stUI()">Status ändern</button>`))
      + card("Deine Daten", row("Daten-Export", "Lädt eine JSON-Datei mit deinen Daten herunter", `<button onclick="expo()">📦 Exportieren</button>`));
  },
  dev() {
    return card("App", row("Overlay (Mini-Fenster)", "Chat in einem kleinen Fenster über anderen Programmen", `<button onclick="overlay()">🪟 Öffnen</button>`)
      + (ME.admin ? row("Management", "Nur für Admins", `<button class="pri" onclick="location.href='/management.html'">🛡 Öffnen</button>`) : "")
      + row("Neu laden & Cache leeren", "Hilft, wenn nach einem Update etwas komisch aussieht", `<button onclick="U12.hard()">🔄 Neu laden</button>`))
      + card("Konto", row("Abmelden", "Nur dieses Konto auf diesem Gerät", `<button class="dng" onclick="U12.out()">Abmelden</button>`)
        + row("Alle Konten abmelden & Gerätedaten löschen", "Entfernt alle gespeicherten Konten, Schlüssel und Einstellungen von diesem Gerät", `<button class="dng" onclick="U12.wipe()">Alles löschen</button>`))
      + `<div class="u12note">Pulsecord v12 · ${E(location.host)}</div>`;
  }
};

function open_(sec) {
  close();
  if (!gME()) return;
  const d = document.createElement("div"); d.id = "uset"; d.className = "sset"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Einstellungen");
  d.innerHTML = `<div class="snav"><div class="sh1">${E(ME.dname || ME.name)}</div>${SECS.map(s => s[0] === "g" ? `<div class="sg">${s[1]}</div>` : `<button class="sn" data-k="${s[0]}" onclick="U12.go('${s[0]}')"><i>${s[1]}</i>${s[2]}${s[0] === "prof" && accs().length > 1 ? `<span class="u12n">${accs().length}</span>` : ""}</button>`).join("")}</div><div class="sbody"><div id="usc"></div></div><button class="sx" onclick="U12.close()" aria-label="Schließen">✕</button>`;
  document.body.appendChild(d); go(sec || cur);
}
function close() { const d = G("uset"); if (d) d.remove(); }
function go(k) {
  const box = G("usc"); if (!box || !R[k]) return; cur = k;
  document.querySelectorAll("#uset .sn").forEach(b => b.classList.toggle("on", b.dataset.k === k));
  const y = box.parentNode.scrollTop; box.innerHTML = `<h2>${TITLES[k]}</h2>` + R[k](); box.parentNode.scrollTop = y;
  if (k === "look" && typeof bgWire == "function") try { bgWire(); } catch (e) {}
}
window.prof = function (sec) { open_(typeof sec == "string" ? sec : null); };
addEventListener("keydown", e => {
  if (e.key === "Escape" && G("uset") && G("modal") && G("modal").classList.contains("hide") && !document.querySelector(".dlg,.crop5")) close();
}, true);

/* ---------- Aktionen (aus den Inline-Handlern aufrufbar) ---------- */
window.U12 = {
  go, close, sw: switchTo, add: addAccount,
  rm: async n => {
    if (gME() && n === gME().name) return U12.out();
    if (!(await (typeof yes == "function" ? yes("Konto entfernen", "@" + n + " von diesem Gerät entfernen? Du musst dich danach neu anmelden.") : confirm("Konto entfernen?")))) return;
    const a = accs().find(x => x.n === n); accSave(accs().filter(x => x.n !== n));
    if (a) fetch("/api?a=logout", { method: "POST", headers: { "x-token": a.t }, body: "{}" }).catch(() => {});
    go("prof");
  },
  out: async () => { if (await (typeof yes == "function" ? yes("Abmelden", "Von @" + ME.name + " abmelden?") : confirm("Abmelden?"))) logout(false); },
  wipe: async () => { if (await (typeof yes == "function" ? yes("Alles löschen", "Alle Konten, Einstellungen und lokalen Schlüssel von diesem Gerät löschen? Verschlüsselte Chats sind ohne Schlüssel-Sicherung danach nicht mehr lesbar.") : confirm("Alles löschen?"))) logout(true); },
  hard: async () => { try { const r = await navigator.serviceWorker.getRegistrations(); await Promise.all(r.map(x => x.unregister())); const k = await caches.keys(); await Promise.all(k.map(x => caches.delete(x))); } catch (e) {} location.reload(); },
  n(k, v) { const c = ncfg(); c[k] = v; nsave(c); nsync(); if (k === "badge" && typeof ttl == "function") try { ttl(); } catch (e) {} },
  q(k, v) { const c = ncfg(); c.quiet[k] = v; nsave(c); nsync(); },
  mu(id, on) { if (on) delete localStorage["mu" + id]; else localStorage["mu" + id] = 1; if (window.pcPushSync) window.pcPushSync(); },
  vol(v) { localStorage.vol = v; ["u12vol", "u12vol2"].forEach(i => { const e = G(i), o = G(i + "o"); if (e && e.value != v) e.value = v; if (o) o.textContent = v + " %"; }); },
  ls(k, on, a, b) { localStorage[k] = on ? (a === undefined ? "1" : a) : (b === undefined ? "" : b); if (k === "cmp" || k === "nmo") applyLook(); },
  splash(v) { if (v === "full") localStorage.removeItem("splash"); else localStorage.splash = v; applyLook(); },
  pv: splashPreview,
  tt() { themeTouched = true; },
  perm: async () => { let p = "denied"; try { p = await Notification.requestPermission(); } catch (e) {} if (p === "granted") { if (window.pcPushSync) window.pcPushSync(1); toast("🔔 Benachrichtigungen aktiviert"); } else toast("Nicht erlaubt – in den Browser-Einstellungen freigeben"); go("ntf"); },
  resetTheme: async () => { themeTouched = false; await api("profile", { ptheme: "" }); toast("Profil-Theme zurückgesetzt"); await refresh(); go("acc"); },
  saveAll: async () => {
    if (typeof saveP != "function") return;
    await saveP();
    const b = { dname: val("p5dn") };
    if (themeTouched) b.ptheme = JSON.stringify({ b1: val("p5b1"), b2: val("p5b2"), a: val("p5a"), t: val("p5t") });
    const r = await api("profile", b);
    if (r && r.error) return toast(r.error);
    themeTouched = false;
    try { const u = await api("users"); if (Array.isArray(u)) u.forEach(x => U[x.name] = Object.assign(U[x.name] || {}, nu(x))); } catch (e) {}
    await refresh();
    if (!(typeof hex == "function" && hex(localStorage.acx))) H.style.setProperty("--red", ME.color || "#7b6cff");
    toast("Gespeichert ✔"); go("acc");
  }
};

/* =====================================================================
   6) Server-Insights (Dashboard) + Benachrichtigungs-Karte in den Servereinstellungen
   ===================================================================== */
const dkey = ms => new Date(ms).toISOString().slice(0, 10);
const pct = (a, b) => b > 0 ? Math.round((a - b) / b * 100) : null;
const trend = (a, b) => { const p = pct(a, b); return p === null ? `<em>${a ? "neu" : "–"}</em>` : `<em class="${p >= 0 ? "up" : "dn"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p)} % zum Zeitraum davor</em>`; };
const bars = (rows, cls) => rows.length ? rows.map(r => `<div class="ins-row"><span class="nm">${r[0]}</span><span class="tr"><i style="width:${Math.max(2, r[1])}%"></i></span><span class="n">${nf(r[2])}</span></div>`).join("") : `<div class="dm">Noch keine Daten.</div>`;
function insDash() {
  const s = srv.stats || {}, D = [7, 14, 30].includes(+localStorage.insd) ? +localStorage.insd : 7, now = Date.now(), keys = [], prev = [];
  for (let i = D - 1; i >= 0; i--) keys.push(dkey(now - i * 864e5));
  for (let j = 2 * D - 1; j >= D; j--) prev.push(dkey(now - j * 864e5));
  const sum = (o, ks) => ks.reduce((a, k) => a + ((o || {})[k] || 0), 0);
  const msgs = sum(s.d, keys), pm = sum(s.d, prev), jn = sum(s.j, keys), lv = sum(s.l, keys);
  const act = {}; keys.forEach(k => ((s.a || {})[k] || []).forEach(u => act[u] = 1));
  const online = srv.members.filter(m => typeof PR == "function" && PR(m) != "offline").length;
  const per = keys.map(k => (s.d || {})[k] || 0), mx = Math.max(1, ...per), pk = per.indexOf(Math.max(...per));
  const dayLab = k => { const d = new Date(k + "T12:00:00"); return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); };
  const chart = `<div class="ins-bars">${per.map((n, i) => `<div class="${n && i === pk ? "pk" : ""}" title="${dayLab(keys[i])}: ${nf(n)} Nachrichten"><i style="height:${Math.max(2, n / mx * 100)}%;animation-delay:${i * 18}ms"></i></div>`).join("")}</div><div class="ins-lab"><span>${dayLab(keys[0])}</span><span>Heute</span></div>`;
  // Uhrzeiten (UTC -> lokal)
  const off = Math.round(new Date().getTimezoneOffset() / 60), hh = Array(24).fill(0);
  (s.h || []).forEach((n, u) => { hh[(u - off + 48) % 24] += n || 0; });
  const hmx = Math.max(1, ...hh), hp = hh.indexOf(Math.max(...hh)), hasH = hh.some(Boolean);
  const hchart = `<div class="ins-bars" style="height:96px">${hh.map((n, i) => `<div class="${hasH && i === hp ? "pk" : ""}" title="${i}–${(i + 1) % 24} Uhr: ${nf(n)}"><i style="height:${Math.max(2, n / hmx * 100)}%;animation-delay:${i * 12}ms"></i></div>`).join("")}</div><div class="ins-lab"><span>0 Uhr</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
  const chs = Object.entries(s.c || {}).sort((a, b) => b[1] - a[1]).slice(0, 6), cmx = chs.length ? chs[0][1] : 1;
  const chRows = chs.map(([id, n]) => { const c = (srv.channels || []).find(x => x.id === id); return [E((c ? "# " + c.name : "# gelöscht")), n / cmx * 100, n]; });
  const us = Object.entries(s.u || {}).sort((a, b) => b[1] - a[1]).slice(0, 8), umx = us.length ? us[0][1] : 1;
  const uRows = us.map(([n, c]) => [(typeof av == "function" ? av(n) : "") + E(n), c / umx * 100, c]);
  const roles = {}; Object.values(srv.roles || {}).forEach(r => { if (r && r.n) roles[r.n] = (roles[r.n] || 0) + 1; });
  const rr = Object.entries(roles).sort((a, b) => b[1] - a[1]), rmx = rr.length ? rr[0][1] : 1;
  const ob = typeof PR == "function" ? online : 0;
  return `<div class="ins-top"><div class="u12chips">${[7, 14, 30].map(n => `<button class="u12chip ${D === n ? "on" : ""}" onclick="U12.insR(${n})">${n} Tage</button>`).join("")}</div></div>`
    + `<div class="ins-k"><div><span>Mitglieder</span><b>${nf(srv.members.length)}</b><em>${nf(ob)} online</em></div><div><span>Nachrichten</span><b>${nf(msgs)}</b>${trend(msgs, pm)}</div><div><span>Aktive Nutzer</span><b>${s.a ? nf(Object.keys(act).length) : "–"}</b><em>${s.a ? "im Zeitraum" : "wird ab jetzt erfasst"}</em></div><div><span>Beigetreten</span><b>${nf(jn)}</b><em>${nf(lv)} ausgetreten</em></div></div>`
    + card("Nachrichten pro Tag", chart + `<div class="dm">Ø ${nf(Math.round(msgs / D))} pro Tag${msgs ? ` · stärkster Tag: ${dayLab(keys[pk])} (${nf(per[pk])})` : ""}</div>`)
    + card("Aktivität nach Uhrzeit", hchart + `<div class="dm">${hasH ? `Meistens los: ${hp}–${(hp + 1) % 24} Uhr` : "Wird ab jetzt automatisch erfasst."}</div>`)
    + `<div class="ins-two">${card("Top-Kanäle (gesamt)", bars(chRows))}${card("Aktivste Mitglieder", s.u ? bars(uRows) : `<div class="dm">Wird ab jetzt automatisch erfasst.</div>`)}</div>`
    + card("Community", `<div class="ins-row"><span class="nm">Online</span><span class="tr"><i style="width:${Math.max(2, ob / Math.max(1, srv.members.length) * 100)}%"></i></span><span class="n">${nf(ob)}</span></div>`
      + (rr.length ? rr.map(([n, c]) => `<div class="ins-row"><span class="nm">🏷 ${E(n)}</span><span class="tr"><i style="width:${Math.max(2, c / rmx * 100)}%"></i></span><span class="n">${nf(c)}</span></div>`).join("") : "")
      + `<div class="dm">${nf(srv.channels.length)} Kanäle${s.f ? ` · ${nf(s.f)} Dateien geteilt` : ""}</div>`);
}
U12.insR = n => { localStorage.insd = n; if (G("sc") && G("sset") && typeof setSec == "function") setSec("ins"); else window.insights(); };
if (typeof SR != "undefined") {
  SR.ins = () => insDash();
  const _ov = SR.ov;
  SR.ov = () => _ov() + card("Meine Benachrichtigungen für diesen Server", row("Benachrichtigungen aktiv", "Aus = Erwähnungen und Popups dieses Servers stumm (nur für dich)", tg(!localStorage["mu" + srv.id], `U12.mu('${srv.id}',this.checked)`)));
}
window.insights = function () { modal(`<h3>📊 Insights</h3><div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow:auto">${insDash()}</div>`); };

/* ---------- Start ---------- */
applyLook(); napply();
document.addEventListener("visibilitychange", () => { if (!document.hidden) napply(); });
})();
