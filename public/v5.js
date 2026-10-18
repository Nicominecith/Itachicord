/* ===== Itachicord v5: fehlende Features aus der Yapper-Liste =====
   Crop-Tool · Anzeigenamen · Verifiziert-Haken · Status "Abwesend" · Gruppenchats · "schreibt…" · Umfragen
   Nachrichtensuche · Drag&Drop-Kanäle · Mod-Berechtigungen · Hell/AMOLED/Akzent · Profil-Themes
   Emoji-Favoriten/-Suche · Mikrofon-/Echo-Test */

/* ---------- Styles ---------- */
(function () {
  const s = document.createElement("style");
  s.textContent = `
.pd.idle,.pd2.idle{background:#f0b232}
.vf{display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;font-size:10px;font-weight:800;color:#fff;background:#3b82f6;border-radius:50%;margin-left:4px;vertical-align:middle}
#tyi{min-height:18px;padding:0 16px 2px;font-size:12px;color:var(--mu)}
#tyi b{color:var(--tx)}
.poll5{margin-top:6px;padding:10px;border:1px solid #ffffff22;border-radius:10px;background:#ffffff08;max-width:380px;display:flex;flex-direction:column;gap:6px}
.po5{position:relative;display:flex;justify-content:space-between;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid #ffffff22;overflow:hidden;cursor:pointer;z-index:0}
.po5.off{cursor:default}.po5.me{border-color:var(--red)}
.po5 i{position:absolute;inset:0 auto 0 0;background:var(--red);opacity:.28;z-index:-1;transition:width .3s}
.crop5{position:fixed;inset:0;background:#000c;display:grid;place-items:center;z-index:99}
.crop5 .card{align-items:center}
.crop5 canvas{background:#000;touch-action:none;cursor:grab}
.crop5 input[type=range]{width:100%}
.dg5{outline:2px dashed var(--red);outline-offset:-2px}
.g5l{max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:4px}
.g5r{display:flex;gap:8px;align-items:center;padding:4px 2px;cursor:pointer}
.g5i{width:24px;height:24px;border-radius:50%;background:var(--bg3) center/cover;display:inline-grid;place-items:center;font-size:13px;flex:none}
#sr5{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}
.sr5i{padding:8px;border-radius:8px;background:var(--bg3);cursor:pointer;font-size:14px}
.sr5i small{color:var(--mu)}
.sr5i mark{background:#f0b23277;color:inherit;border-radius:3px}
.mt5{height:12px;border-radius:6px;background:var(--bg3);overflow:hidden}.mt5 i{display:block;height:100%;width:0;background:#23a55a;transition:width .08s}
.p5s{border:1px solid #ffffff22;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px}
.p5c{display:flex;gap:6px;flex-wrap:wrap}.p5c button{flex:1;min-width:70px}
body.light #rail{background:#dfe1e6}body.light #side,body.light #hd,body.light #side h3{border-color:#0002}
body.light #me{background:#e4e6ea}body.light button,body.light input,body.light textarea,body.light select{border-color:#0003}
body.light #auth,body.light #modal{background:#0007}body.light .poll5,body.light .po5{border-color:#0003}
`;
  document.head.appendChild(s);
})();

/* ---------- Hilfen ---------- */
const dnOf = n => { const u = U[n]; return (u && u.dname) || n; };
const vfB = n => (U[n] && U[n].verified) ? '<span class="vf" title="Verifiziert">✔</span>' : "";
const hex = c => /^#[0-9a-f]{6}$/i.test(c || "");
const canDelOthers = () => !!srv && ch && ch.startsWith(srv.id + "/") && (isOwn() || (isMod() && (srv.perms || {}).del !== false));
const canReorder = () => !!srv && (isOwn() || (isMod() && (srv.perms || {}).channels !== false));

/* ---------- Status "Abwesend" (manuell + automatisch nach 5 Min.) ---------- */
PL.idle = "Abwesend";
stUI = function () {
  modal(`<h3>Status</h3>${[["online", "Online", "Für alle sichtbar"], ["idle", "Abwesend", "Gelber Punkt – du bist gerade nicht da"], ["dnd", "Nicht stören", "Keine Töne, Anrufe und Benachrichtigungen"], ["invisible", "Unsichtbar", "Du erscheinst offline, kannst aber alles nutzen"]].map(([v, l, d]) => `<div class="sw" style="cursor:pointer;${(ME.pst || "online") == v ? "border-color:var(--red)" : ""}" onclick="setSt5('${v}')"><span><i class="pd2 ${v == "invisible" ? "offline" : v}"></i> <b>${l}</b><br><small class="dm">${d}</small></span></div>`).join("")}<small class="dm">Nach 5 Minuten ohne Aktivität wirst du automatisch auf „Abwesend“ gesetzt.</small>`);
};
function setSt5(v) { localStorage.midle = v === "idle" ? "1" : ""; setSt(v); }
let lastAct = Date.now(), autoIdle = false;
["mousemove", "keydown", "pointerdown", "touchstart", "scroll"].forEach(e => addEventListener(e, () => {
  lastAct = Date.now();
  if (ME && ME.pst === "idle" && !localStorage.midle) { autoIdle = false; ME.pst = "online"; api("pst", { v: "online" }); me(); }
}, { passive: true }));
setInterval(() => {
  if (!ME || !T || autoIdle) return;
  if ((ME.pst || "online") === "online" && Date.now() - lastAct > 5 * 60000) { autoIdle = true; ME.pst = "idle"; api("pst", { v: "idle" }); me(); }
}, 30000);

/* ---------- Hell-/AMOLED-Modus + eigene Akzentfarbe ---------- */
function applyMode() {
  const m = localStorage.mode || "dark", st = document.documentElement.style, set = (o) => Object.keys(o).forEach(k => st.setProperty(k, o[k]));
  document.body.classList.toggle("light", m === "light");
  ["--tx", "--mu", "--ln"].forEach(k => st.removeProperty(k));
  if (m === "light") set({ "--bg": "#f3f4f7", "--bg2": "#e8eaee", "--bg3": "#dcdfe5", "--tx": "#1b1c22", "--mu": "#5b5e6b", "--ln": "#00000018" });
  else if (m === "amoled") set({ "--bg": "#000", "--bg2": "#050507", "--bg3": "#0e0e12" });
  else applyTheme();
  if (hex(localStorage.acx)) st.setProperty("--red", localStorage.acx);
}
const _me5 = me;
me = function () {
  _me5();
  applyMode();
  if (ME && ME.dname) { const b = document.querySelector("#me b"); if (b) b.textContent = ME.dname; }
};

/* ---------- Crop-Tool für Avatare, Banner und Icons ---------- */
const _img5 = img;
function cropUI(f, mx) {
  return new Promise(async (res, rej) => {
    const url = await rd(f), im = new Image(); im.src = url;
    try { await im.decode(); } catch (e) { return rej(new Error("Bild konnte nicht gelesen werden")); }
    const ban = mx >= 1000, asp = ban ? 3 : 1, VW = Math.min(320, innerWidth - 70), VH = Math.round(VW / asp);
    const minS = Math.max(VW / im.width, VH / im.height);
    let s = minS, cx = im.width / 2, cy = im.height / 2;
    const d = document.createElement("div"); d.className = "crop5";
    d.innerHTML = `<div class="card"><h3 style="margin:0">Zuschneiden</h3><canvas width="${VW}" height="${VH}" style="width:${VW}px;height:${VH}px;border-radius:${ban ? 8 : 12}px"></canvas><label style="width:100%">Zoom<input type="range" min="1" max="4" step="0.01" value="1"></label><small class="dm">Ziehen = verschieben · Regler/Mausrad = zoomen${/gif/.test(f.type) ? "" : ""}</small><div class="hr"><button class="c5x">Abbrechen</button><button class="c5o">Ohne Zuschnitt</button><button class="pri c5k">Übernehmen</button></div></div>`;
    document.body.appendChild(d);
    const cv = d.querySelector("canvas"), x = cv.getContext("2d"), rg = d.querySelector("input");
    const clamp = () => { cx = Math.min(Math.max(cx, VW / 2 / s), im.width - VW / 2 / s); cy = Math.min(Math.max(cy, VH / 2 / s), im.height - VH / 2 / s); };
    const draw = () => { clamp(); x.fillStyle = "#000"; x.fillRect(0, 0, VW, VH); x.drawImage(im, VW / 2 - cx * s, VH / 2 - cy * s, im.width * s, im.height * s); };
    draw();
    rg.oninput = () => { s = minS * +rg.value; draw(); };
    cv.addEventListener("wheel", e => { e.preventDefault(); rg.value = Math.min(4, Math.max(1, +rg.value + (e.deltaY < 0 ? .1 : -.1))); rg.oninput(); }, { passive: false });
    let px = null, py = null;
    cv.onpointerdown = e => { px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; };
    cv.onpointermove = e => { if (px == null) return; cx -= (e.clientX - px) / s; cy -= (e.clientY - py) / s; px = e.clientX; py = e.clientY; draw(); };
    cv.onpointerup = () => { px = null; cv.style.cursor = "grab"; };
    d.querySelector(".c5x").onclick = () => { d.remove(); rej(new Error("Zuschnitt abgebrochen")); };
    d.querySelector(".c5o").onclick = async () => { d.remove(); try { res(await _img5(f, mx)); } catch (e) { rej(e); } };
    d.querySelector(".c5k").onclick = () => {
      const k = mx / VW, oc = document.createElement("canvas"); oc.width = Math.round(VW * k); oc.height = Math.round(VH * k);
      const o = oc.getContext("2d"); o.fillStyle = "#000"; o.fillRect(0, 0, oc.width, oc.height);
      o.drawImage(im, (VW / 2 - cx * s) * k, (VH / 2 - cy * s) * k, im.width * s * k, im.height * s * k);
      let q = .88, out = oc.toDataURL("image/jpeg", q);
      while (out.length > 140000 && q > .35 && mx <= 512) { q -= .1; out = oc.toDataURL("image/jpeg", q); }
      d.remove(); res(out);
    };
  });
}
img = async function (f, mx) {
  if (!/^image\//.test(f.type) || /gif|svg/.test(f.type) || mx <= 128) return _img5(f, mx); // GIFs bleiben animiert
  return cropUI(f, mx);
};

/* ---------- Modal: Profil-Theme zurücksetzen, Profil-Theme + Anzeigename auf der Karte ---------- */
const _modal5 = modal;
modal = function (h) { const m = document.getElementById("mc"); if (m) m.removeAttribute("style"); return _modal5(h); };

const PT5 = {
  Sunset: { b1: "#ff7e5f", b2: "#6a1b4d", a: "#feb47b", t: "#ffffff" },
  Neon: { b1: "#0f0c29", b2: "#302b63", a: "#00ffd5", t: "#eaffff" },
  Ocean: { b1: "#0f3057", b2: "#00909e", a: "#67e8f9", t: "#f0fdff" },
  Cyberpunk: { b1: "#1a0b2e", b2: "#ff0080", a: "#f5e000", t: "#fff8e1" }
};
const ptOf = u => { try { const p = JSON.parse((u && u.ptheme) || ""); return p && hex(p.b1) && hex(p.b2) && hex(p.a) && hex(p.t) ? p : null; } catch (e) { return null; } };
const _card5 = card;
card = function (n) {
  _card5(n);
  const u = U[n] || {}, mc = document.getElementById("mc"); if (!mc) return;
  const p = ptOf(u);
  if (p) { mc.style.background = `linear-gradient(160deg,${p.b1},${p.b2})`; mc.style.color = p.t; mc.style.borderColor = p.a; mc.style.setProperty("--red", p.a); mc.style.setProperty("--mu", p.t + "bb"); }
  const h = mc.querySelector("h3");
  if (h) {
    if (u.dname && !(typeof sp === "function" && sp(n).name)) { const t = h.childNodes[0]; if (t && t.nodeType === 3) t.textContent = u.dname + " "; h.insertAdjacentHTML("afterend", `<small style="opacity:.7">@${esc(n)}</small>`); }
    if (u.verified) h.insertAdjacentHTML("beforeend", '<span class="vf" title="Verifiziert">✔</span>');
  }
  if (ME && ME.admin) mc.insertAdjacentHTML("beforeend", `<button onclick="admVf('${esc(n)}',${u.verified ? 0 : 1})">${u.verified ? "✔ Haken entfernen" : "✔ Verifizieren (Admin)"}</button>`);
};
async function admVf(n, on) {
  const r = await api("adm_verify", { name: n, on: !!on });
  if (r.error) return toast(r.error);
  if (U[n]) U[n].verified = !!on; if (ME && n === ME.name) ME.verified = !!on;
  toast(on ? "Verifiziert ✔" : "Haken entfernt"); card(n);
}

/* ---------- Profil-Einstellungen: Anzeigename, Profil-Theme, Erscheinungsbild, Mikrofon-Test ---------- */
const _prof5 = prof;
prof = function () {
  _prof5();
  const mc = document.getElementById("mc"), h = mc && mc.querySelector("h3"); if (!h) return;
  const p = ptOf(ME) || { b1: "#1a0b2e", b2: "#c8102e", a: "#ff4d6d", t: "#ffffff" }, m = localStorage.mode || "dark";
  h.insertAdjacentHTML("afterend", `<div class="p5s"><b>✨ Neu: Anzeigename &amp; Themes</b>
<input id="p5dn" maxlength="32" placeholder="Anzeigename (dein @${esc(ME.name)} bleibt dein Benutzername)" value="${esc(ME.dname || "")}">
<div class="p5c">${Object.keys(PT5).map(k => `<button onclick="p5pre('${k}')">${k}</button>`).join("")}</div>
<div class="p5c"><label>Hintergrund 1<input id="p5b1" type="color" value="${p.b1}"></label><label>Hintergrund 2<input id="p5b2" type="color" value="${p.b2}"></label><label>Akzent<input id="p5a" type="color" value="${p.a}"></label><label>Schrift<input id="p5t" type="color" value="${p.t}"></label></div>
<button class="pri" onclick="p5save()">💾 Anzeigename &amp; Profil-Theme speichern</button><button onclick="p5reset()">Profil-Theme zurücksetzen</button>
<label>Erscheinungsbild <select onchange="localStorage.mode=this.value;applyMode()"><option value="dark" ${m == "dark" ? "selected" : ""}>Dunkel</option><option value="light" ${m == "light" ? "selected" : ""}>Hell</option><option value="amoled" ${m == "amoled" ? "selected" : ""}>AMOLED-Schwarz</option></select></label>
<label>App-Akzentfarbe <input type="color" value="${hex(localStorage.acx) ? localStorage.acx : (ME.color || "#c8102e")}" oninput="localStorage.acx=this.value;applyMode()"></label><button onclick="localStorage.acx='';document.documentElement.style.setProperty('--red',ME.color||'#c8102e');applyMode()">Akzentfarbe zurücksetzen</button>
<button onclick="micTest()">🎙 Mikrofon- &amp; Echo-Test</button></div>`);
};
function p5pre(k) { const p = PT5[k]; $("#p5b1").value = p.b1; $("#p5b2").value = p.b2; $("#p5a").value = p.a; $("#p5t").value = p.t; }
async function p5save() {
  const p = { b1: $("#p5b1").value, b2: $("#p5b2").value, a: $("#p5a").value, t: $("#p5t").value };
  const r = await api("profile", { dname: $("#p5dn").value, ptheme: JSON.stringify(p) });
  if (r && r.error) return toast(r.error);
  toast("Gespeichert ✔"); await refresh(); const u = await api("users"); if (Array.isArray(u)) u.forEach(x => U[x.name] = Object.assign(U[x.name] || {}, nu(x)));
}
async function p5reset() { await api("profile", { ptheme: "" }); toast("Profil-Theme zurückgesetzt"); await refresh(); }

/* ---------- Mikrofon- & Echo-Test ---------- */
async function micTest() {
  modal(`<h3>🎙 Mikrofon- &amp; Echo-Test</h3><small class="dm">Sprich 5 Sekunden lang – danach hörst du deine Aufnahme (Echo-Test). Kopfhörer empfohlen.</small><div class="mt5"><i id="mtl"></i></div><div id="mts" class="dm">Bereit.</div><button class="pri" id="mtb" onclick="micRun()">Test starten</button>`);
}
async function micRun() {
  const b = $("#mtb"), s = $("#mts"), l = $("#mtl"); b.disabled = true; s.textContent = "Mikrofon wird angefragt …";
  let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (e) { s.textContent = "Kein Zugriff auf das Mikrofon: " + e.message; b.disabled = false; return; }
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(st).connect(an);
  const buf = new Uint8Array(an.fftSize), chunks = [], rec = new MediaRecorder(st); let peak = 0, run = true;
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  (function tick() { if (!run) return; an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); peak = Math.max(peak, m); if (l) l.style.width = Math.min(100, m / 90 * 100) + "%"; requestAnimationFrame(tick); })();
  rec.start(); let left = 5; s.textContent = "Aufnahme … " + left + " s";
  const iv = setInterval(() => { left--; if (left > 0) s.textContent = "Aufnahme … " + left + " s"; }, 1000);
  await new Promise(r => setTimeout(r, 5000)); clearInterval(iv); run = false;
  await new Promise(r => { rec.onstop = r; rec.stop(); }); st.getTracks().forEach(t => t.stop()); try { ac.close(); } catch (e) {}
  if (l) l.style.width = "0";
  if (peak < 6) { s.textContent = "⚠ Es kam fast kein Ton an – Mikrofon prüfen oder lauter sprechen."; b.disabled = false; b.textContent = "Nochmal testen"; return; }
  s.textContent = "▶ Wiedergabe deiner Aufnahme … (Pegel-Spitze " + Math.round(peak / 128 * 100) + " %)";
  const a = new Audio(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }))); a.onended = () => { s.textContent = "✔ Fertig. Hast du dich gut gehört, funktioniert dein Mikrofon."; b.disabled = false; b.textContent = "Nochmal testen"; };
  a.play().catch(() => { s.textContent = "Wiedergabe blockiert – Tippe nochmal auf Start."; b.disabled = false; });
}

/* ---------- Nachrichten nachbearbeiten: Anzeigename, Haken, Umfragen, Mod-Löschen ---------- */
function leftTxt(end) { const d = end - Date.now(); if (d <= 0) return "Beendet"; const h = d / 3600000; return "Endet in " + (h < 1 ? Math.ceil(d / 60000) + " Min." : h < 48 ? Math.ceil(h) + " Std." : Math.ceil(h / 24) + " Tagen"); }
function pollHtml(x) {
  const P = x.poll, tot = P.opts.reduce((a, o) => a + o.v.length, 0), over = Date.now() > P.end;
  return `<div class="poll5"><b>📊 ${esc(P.q)}</b>${P.opts.map((o, i) => { const pc = tot ? Math.round(o.v.length / tot * 100) : 0; return `<div class="po5 ${over ? "off" : ""} ${o.v.includes(ME.name) ? "me" : ""}" ${over ? "" : `onclick="event.stopPropagation();vote5('${x.id}',${i})"`}><i style="width:${pc}%"></i><span>${esc(o.t)}</span><b>${o.v.length} · ${pc}%</b></div>`; }).join("")}<small class="dm">${tot} Stimme${tot == 1 ? "" : "n"} · ${leftTxt(P.end)} · eine Antwort pro Person</small></div>`;
}
async function vote5(id, i) { const r = await api("vote", { ch, id, i }); if (r.error) toast(r.error); last = ""; poll(); }
function postMsgs() {
  const box = document.getElementById("msgs"); if (!box) return;
  box.querySelectorAll(".m:not([data-v5])").forEach(el => {
    el.dataset.v5 = 1;
    const pb = el.querySelector('.ac button[onclick*="act(\'pin\'"]'), mm = pb && /act\('pin','([0-9a-f]+)'/.exec(pb.getAttribute("onclick")), x = mm && (M || []).find(y => y.id == mm[1]); if (!x) return;
    const n = el.querySelector(".n");
    if (n) { const u = U[x.u]; if (u && u.dname && !(typeof sp === "function" && sp(x.u).name)) { n.textContent = u.dname; n.title = "@" + x.u; } if (u && u.verified) n.insertAdjacentHTML("afterend", '<span class="vf" title="Verifiziert">✔</span>'); }
    if (x.poll) { const t = el.querySelector(".b"), rx = t && t.lastElementChild; (rx || t).insertAdjacentHTML(rx ? "beforebegin" : "beforeend", pollHtml(x)); }
    const ac = el.querySelector(".ac");
    if (ac && x.u !== ME.name && canDelOthers()) ac.insertAdjacentHTML("beforeend", `<button title="Als Moderator löschen" onclick="event.stopPropagation();act('del','${x.id}')">🗑</button>`);
  });
}
new MutationObserver(postMsgs).observe(document.getElementById("msgs"), { childList: true });

/* ---------- Umfrage erstellen ---------- */
function pollNew() {
  if (!ch) return;
  modal(`<h3>📊 Umfrage erstellen</h3><input id="pl5q" maxlength="200" placeholder="Frage"><input class="pl5o" maxlength="80" placeholder="Antwort 1"><input class="pl5o" maxlength="80" placeholder="Antwort 2"><input class="pl5o" maxlength="80" placeholder="Antwort 3 (optional)"><input class="pl5o" maxlength="80" placeholder="Antwort 4 (optional)"><label>Dauer <select id="pl5h"><option value="1">1 Stunde</option><option value="6">6 Stunden</option><option value="24" selected>24 Stunden</option><option value="72">3 Tage</option><option value="168">7 Tage</option></select></label><small class="dm">Eine Stimme pro Person. Die Umfrage schließt automatisch.</small><button class="pri" onclick="pollGo()">Senden</button>`);
}
async function pollGo() {
  const q = $("#pl5q").value.trim(), opts = [...document.querySelectorAll(".pl5o")].map(i => i.value.trim()).filter(Boolean);
  if (!q || opts.length < 2) return toast("Frage und mindestens 2 Antworten nötig");
  const r = await api("send", { ch, text: "", poll: { q, opts, hours: +$("#pl5h").value } });
  if (r.error) { toast(r.error); sfx("err"); return; }
  $("#modal").classList.add("hide"); sfx("send"); last = ""; poll();
}
document.querySelector(".gf").insertAdjacentHTML("beforebegin", '<button title="Umfrage" onclick="pollNew()">📊</button>');

/* ---------- "schreibt …"-Anzeige ---------- */
document.getElementById("rpb").insertAdjacentHTML("afterend", '<div id="tyi"></div>');
let tyLast = 0;
document.getElementById("tx").addEventListener("input", e => {
  const v = e.target.value; if (!ch || !v || v.startsWith("/") || Date.now() - tyLast < 3000) return;
  tyLast = Date.now(); api("typing", { ch });
});
setInterval(async () => {
  const el = document.getElementById("tyi"); if (!el) return;
  if (!ch || !T || document.hidden) { el.innerHTML = ""; return; }
  const c = ch, l = await api("tyl", 0, "&ch=" + encodeURIComponent(c)); if (c !== ch) return;
  if (!Array.isArray(l) || !l.length) { el.innerHTML = ""; return; }
  const n = l.map(x => "<b>" + esc(dnOf(x)) + "</b>");
  el.innerHTML = (l.length == 1 ? n[0] + " schreibt" : l.length == 2 ? n[0] + " und " + n[1] + " schreiben" : "Mehrere schreiben") + " …";
}, 2500);

/* ---------- Suche (Kanal oder ganzer Server) ---------- */
let SH5 = [];
function srchUI() {
  modal(`<h3>🔍 Nachrichten durchsuchen</h3><input id="sq5" placeholder="Suchbegriff …" autocomplete="off" onkeydown="if(event.key=='Enter')srchGo()"><label>Bereich <select id="ss5"><option value="c">Dieser Kanal / Chat</option>${srv ? '<option value="s">Ganzer Server</option>' : ""}</select></label><button class="pri" onclick="srchGo()">Suchen</button><div id="sr5"></div>`);
  setTimeout(() => { const i = $("#sq5"); i && i.focus(); }, 50);
}
async function srchGo() {
  const q = $("#sq5").value.trim().toLowerCase(), box = $("#sr5"); if (q.length < 2) return toast("Mindestens 2 Zeichen");
  const all = $("#ss5").value === "s" && srv; let cs;
  if (all) cs = vis().filter(c => c.type !== "voice" && c.type !== "stage").map(c => ({ id: srv.id + "/" + c.id, t: "# " + c.name }));
  else cs = [{ id: ch, t: (document.querySelector("#hd b") || {}).textContent || "Chat" }];
  box.innerHTML = '<div class="dm">Suche …</div>';
  const res = await Promise.all(cs.slice(0, 40).map(async c => { const m = await api("msgs", 0, "&ch=" + encodeURIComponent(c.id)); return Array.isArray(m) ? m.filter(x => (x.text || "").toLowerCase().includes(q) || (x.poll && x.poll.q.toLowerCase().includes(q)) || (x.file && String(x.file.name || "").toLowerCase().includes(q))).map(x => Object.assign({}, x, { c })) : []; }));
  SH5 = res.flat().sort((a, b) => b.t - a.t).slice(0, 60);
  const re = new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  box.innerHTML = SH5.length ? SH5.map((x, i) => `<div class="sr5i" onclick="srchOpen(${i})"><small>${esc(x.c.t)} · ${esc(dnOf(x.u))} · ${ft(x.t)}</small><div>${esc((x.text || (x.poll ? "📊 " + x.poll.q : "📎 " + (x.file && x.file.name))).slice(0, 220)).replace(re, m => "<mark>" + m + "</mark>")}</div></div>`).join("") : '<div class="dm">Keine Treffer (es werden die letzten 200 Nachrichten pro Kanal durchsucht).</div>';
}
function srchOpen(i) { const h = SH5[i]; if (!h) return; $("#modal").classList.add("hide"); open_(h.c.id, h.c.t); }

/* ---------- Gruppenchats ---------- */
const GI = g => g.hasicon ? `<span class="g5i" style="background-image:url('/api?a=img&t=gi&i=${g.id}&v=${g.iv || 0}')"></span>` : '<span class="g5i">👥</span>';
const _home5 = home;
home = function () {
  _home5();
  if (srv) return;
  const list = document.getElementById("list"), sec = list && list.querySelector(".sec"); if (!sec) return;
  const gs = ME.groups || [];
  sec.insertAdjacentHTML("afterend", `<div class="it" onclick="grpNew()">➕ <span class="nm">Gruppe erstellen</span></div>` + gs.map(g => `<div class="it g5 ${ch == g.ch ? "on" : ""}" data-ch="${g.ch}" data-t="👥 ${esc(g.name)}">${GI(g)}<span class="nm">${esc(g.name)}</span></div>`).join(""));
};
document.getElementById("list").addEventListener("click", e => { const g = e.target.closest(".g5"); if (g) open_(g.dataset.ch, g.dataset.t); });
function grpNew() {
  const c = [...new Set([...(ME.friends || []), ...(ME.dms || [])])].filter(n => n !== ME.name && !(ME.blocked || []).includes(n));
  modal(`<h3>👥 Gruppe erstellen</h3><input id="g5n" maxlength="40" placeholder="Gruppenname"><label>Gruppenbild <input id="g5i" type="file" accept="image/*"></label><small class="dm">Wähle mindestens 2 Personen (max. 9):</small><div class="g5l">${c.map(n => `<label class="g5r"><input type="checkbox" value="${esc(n)}" style="width:auto"> ${esc(dnOf(n))} <small class="dm">@${esc(n)}</small></label>`).join("") || '<div class="dm">Füge zuerst Freunde hinzu oder schreib jemandem eine DM.</div>'}</div><button class="pri" onclick="grpMk()">Erstellen</button>`);
}
async function grpMk() {
  const members = [...document.querySelectorAll(".g5l input:checked")].map(i => i.value), name = $("#g5n").value.trim() || "Gruppe";
  if (members.length < 2) return toast("Mindestens 2 weitere Personen wählen");
  let icon = ""; const f = $("#g5i").files[0];
  if (f) { try { icon = await img(f, 256); } catch (e) { return toast(e.message); } }
  const r = await api("mkgrp", { name, members, icon });
  if (r.error) return toast(r.error);
  $("#modal").classList.add("hide"); await refresh(); open_(r.ch, "👥 " + name); home();
}
function grpSet(id) {
  const g = (ME.groups || []).find(x => x.id == id); if (!g) return;
  const addable = [...new Set([...(ME.friends || []), ...(ME.dms || [])])].filter(n => !g.members.includes(n) && !(ME.blocked || []).includes(n));
  modal(`<h3>👥 ${esc(g.name)}</h3><input id="g5r" maxlength="40" value="${esc(g.name)}"><button onclick="grpOp('${id}','rename',$('#g5r').value)">Umbenennen</button><label>Gruppenbild ändern <input type="file" accept="image/*" onchange="grpIcon('${id}',this.files[0])"></label><div><b>Mitglieder (${g.members.length}/10)</b><br>${g.members.map(n => esc(dnOf(n)) + (n == g.owner ? " 👑" : "")).join(", ")}</div>${addable.length ? `<label>Hinzufügen <select id="g5a"><option value="">–</option>${addable.map(n => `<option value="${esc(n)}">${esc(dnOf(n))}</option>`).join("")}</select></label><button onclick="grpOp('${id}','add',$('#g5a').value)">Hinzufügen</button>` : ""}<button style="border-color:#c8102e" onclick="grpLeave('${id}')">🚪 Gruppe verlassen</button>`);
}
async function grpOp(id, op, val) {
  if (!val && op !== "icon") return toast("Bitte etwas eingeben");
  const r = await api("grp", { id, op, val }); if (r.error) return toast(r.error);
  await refresh(); toast("Gespeichert ✔"); if (op != "leave") grpSet(id);
  const g = (ME.groups || []).find(x => x.id == id); if (g && ch == g.ch) $("#hd b").textContent = "👥 " + g.name;
}
async function grpIcon(id, f) { if (!f) return; try { await grpOp(id, "icon", await img(f, 256)); } catch (e) { toast(e.message); } }
async function grpLeave(id) {
  if (!(await yes("Gruppe verlassen", "Du kannst die Gruppe danach nicht mehr lesen."))) return;
  await grpOp(id, "leave", "x"); $("#modal").classList.add("hide"); showHome();
}

/* ---------- Kopfzeile: Suche + Gruppen-Menü ---------- */
const _open5 = open_;
open_ = function (c, t) {
  _open5.apply(this, arguments);
  if (ch !== c) return;
  const hs = document.querySelector("#hd .hs"); if (!hs || document.getElementById("srch5")) return;
  const g = c.startsWith("dm:g") ? (ME.groups || []).find(x => x.ch == c) : null;
  hs.insertAdjacentHTML("afterbegin", `<button id="srch5" title="Suchen" onclick="srchUI()">🔍</button>` + (g ? `<button title="Gruppe verwalten" onclick="grpSet('${g.id}')">⚙</button>` : ""));
  const tyi = document.getElementById("tyi"); if (tyi) tyi.innerHTML = "";
};

/* ---------- Drag & Drop: Kanäle sortieren ---------- */
const cid5 = el => { const m = /\('[^'\/]+\/([^'~]+)'/.exec(el.getAttribute("onclick") || ""); return m && m[1]; };
let dragId = null;
function mkDrag() {
  if (canReorder()) document.querySelectorAll("#chs .it").forEach(e => { if (!e.draggable && cid5(e)) e.draggable = true; });
  document.querySelectorAll("#mlist .mem:not([data-d5])").forEach(e => {
    e.dataset.d5 = 1; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { const k = t.nodeValue.trim(), u = U[k]; if (u && u.dname && !(srv && srv.prof && srv.prof[k] && srv.prof[k].name)) { t.nodeValue = t.nodeValue.replace(k, u.dname); break; } }
  });
}
new MutationObserver(mkDrag).observe(document.getElementById("list"), { childList: true, subtree: true });
const lst = document.getElementById("list");
lst.addEventListener("dragstart", e => { const t = e.target.closest && e.target.closest("#chs .it"); if (!t || !cid5(t) || !canReorder()) return; dragId = cid5(t); e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "move"; });
lst.addEventListener("dragover", e => { if (!dragId) return; const t = e.target.closest("#chs .it, #chs .cat"); if (!t) return; e.preventDefault(); lst.querySelectorAll(".dg5").forEach(x => x.classList.remove("dg5")); t.classList.add("dg5"); });
lst.addEventListener("dragend", () => { dragId = null; lst.querySelectorAll(".dg5").forEach(x => x.classList.remove("dg5")); });
lst.addEventListener("drop", e => {
  if (!dragId) return; const t = e.target.closest("#chs .it, #chs .cat"); if (!t) return; e.preventDefault();
  const id = dragId; dragId = null; lst.querySelectorAll(".dg5").forEach(x => x.classList.remove("dg5"));
  const ids = srv.channels.map(c => c.id).filter(i => i !== id); let cat;
  if (t.classList.contains("cat")) {
    cat = t.dataset.c; let idx = -1; ids.forEach((i, k) => { const c = srv.channels.find(x => x.id === i); if ((c.cat || "") === cat) idx = k; });
    ids.splice(idx < 0 ? ids.length : idx + 1, 0, id);
  } else {
    const tid = cid5(t); if (!tid || tid === id) return; const ti = srv.channels.find(c => c.id === tid); cat = ti.cat || ""; ids.splice(ids.indexOf(tid), 0, id);
  }
  api("mod", { srv: srv.id, op: "reorder", val: ids.join(","), ch: id, cat }).then(r => { if (r.error) toast(r.error); else upd(r); });
});

/* ---------- Server: Moderator-Berechtigungen ---------- */
const PERM5 = [["del", "Fremde Nachrichten löschen"], ["kick", "Mitglieder kicken"], ["ban", "Mitglieder bannen"], ["timeout", "Timeouts verhängen"], ["roles", "Rollen verwalten"], ["channels", "Kanäle verwalten & sortieren"]];
function permUI() {
  if (!srv || !isOwn()) return;
  modal(`<h3>🔐 Moderator-Berechtigungen</h3><small class="dm">Gilt für alle Moderatoren dieses Servers. Der Besitzer darf immer alles.</small>${PERM5.map(([k, l]) => `<label class="sw" style="cursor:pointer;justify-content:space-between"><span>${l}</span><input type="checkbox" style="width:auto" ${(srv.perms || {})[k] === false ? "" : "checked"} onchange="permSet('${k}')"></label>`).join("")}`);
}
async function permSet(k) { const r = await api("mod", { srv: srv.id, op: "perm", val: k }); if (r.error) toast(r.error); else upd(r); permUI(); }
const _smenu5 = smenu;
smenu = function (e) {
  _smenu5(e);
  const m = document.getElementById("sm");
  if (m && srv && isOwn() && !m.querySelector(".perm5")) m.insertAdjacentHTML("beforeend", '<div class="mi perm5" onclick="smx();permUI()"><span>Mod-Berechtigungen</span><i>🔐</i></div>');
};

/* ---------- Emoji: Favoriten (Rechtsklick / lange drücken) + Suche ---------- */
const EK5 = { lach: "😀 😂 🤣 😆", herz: "❤️ 💕 💖 💜 💙", daumen: "👍 👎", feuer: "🔥", party: "🎉 🎊 🥳", traur: "😢 😭", cool: "😎", denk: "🤔", hallo: "👋", danke: "🙏", stark: "💪", katze: "🐱", hund: "🐶", pizza: "🍕", spiel: "🎮", game: "🎮", geschenk: "🎁", stern: "⭐ ✨", laugh: "😂 🤣", heart: "❤️ 💜", thumb: "👍", fire: "🔥", sad: "😢 😭", cry: "😭", angry: "😡 🤬", love: "😍 🥰 ❤️", kiss: "😘", skull: "💀", ghost: "👻", clap: "👏", pray: "🙏", think: "🤔", eyes: "👀", hundred: "💯", wow: "😮 😲", sleep: "😴", money: "💰 🤑", rocket: "🚀", clown: "🤡", robot: "🤖" };
const efav = () => { try { return JSON.parse(localStorage.efav || "[]"); } catch (e) { return []; } };
let ET5 = 1;
function efavT(e) { let f = efav(); const had = f.includes(e); f = had ? f.filter(x => x !== e) : [e, ...f].slice(0, 40); localStorage.efav = JSON.stringify(f); toast(had ? "Favorit entfernt" : "⭐ Favorit gespeichert"); ecat(ET5); }
function efT5(el, e) { clearTimeout(window.EL5); window.EL5 = setTimeout(() => { window.LP5 = Date.now(); efavT(e); }, 550); }
epick = function (cb) {
  ECB = cb || null;
  modal(`<h3>Emojis</h3><input id="es5" placeholder="Suchen … (Rechtsklick / lange drücken = ⭐ Favorit)" oninput="ecat(ET5)" autocomplete="off"><div class="etabs" id="et"></div><div class="eg" id="eg"></div>${cb ? '<label><input type="checkbox" id="esup" style="width:auto"> ✨ Super-Reaktion</label>' : ""}`);
  ecat(efav().length ? 0 : 1);
};
ecat = function (i) {
  ET5 = i; const k = Object.keys(EMO), T = ["⭐", ...EM.map(x => x[0]), ...(k.length ? ["🧩"] : [])], q = (($("#es5") || {}).value || "").trim().toLowerCase();
  $("#et").innerHTML = T.map((t, j) => `<button class="${j == i && !q ? "on" : ""}" onclick="ecat(${j})">${t}</button>`).join("");
  const eb = e => `<button onclick="if(Date.now()-(window.LP5||0)<900)return;epush('${e}')" oncontextmenu="event.preventDefault();efavT('${e}')" ontouchstart="efT5(this,'${e}')" ontouchend="clearTimeout(window.EL5)" ontouchmove="clearTimeout(window.EL5)">${e}</button>`;
  const ci = n => `<img title="${n}" src="${EMO[n]}" onclick="epush(':${n}:')">`;
  let h;
  if (q) {
    const hit = new Set(); Object.keys(EK5).forEach(w => { if (w.includes(q)) EK5[w].split(" ").forEach(e => hit.add(e)); });
    EM.forEach(x => x[1].split(" ").forEach(e => { if (e.includes(q)) hit.add(e); }));
    h = [...hit].map(eb).join("") + k.filter(n => n.includes(q)).map(ci).join("");
    if (!h) h = '<div class="dm">Nichts gefunden</div>';
  } else if (i === 0) { const f = efav(); h = f.length ? f.map(eb).join("") : '<div class="dm">Noch keine Favoriten. Rechtsklick (am Handy: lange drücken) auf ein Emoji.</div>'; }
  else if (i <= EM.length) h = EM[i - 1][1].split(" ").map(eb).join("");
  else h = k.map(ci).join("");
  $("#eg").innerHTML = h;
};

applyMode();
