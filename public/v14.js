/* v14: Mail-Bestätigung, E2E-Auto-Sicherung, Anruf-Töne, Speichern-Leiste, Nav-Icons */
(function () {
  var $ = function (q) { return document.querySelector(q); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var say = function (m) { try { toast(m); } catch (e) { alert(m); } };

  /* ---------- 1) Registrierung: Code oder Link per E-Mail ---------- */
  var PV = null;
  function codeRow() {
    var r = $("#v14vr");
    if (!r) {
      r = document.createElement("label"); r.id = "v14vr"; r.className = "hide";
      r.innerHTML = '<span>Bestätigungscode aus der E-Mail</span><input id="v14c" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456">';
      var b = $("#ab"); if (b && b.parentNode) b.parentNode.insertBefore(r, b);
    }
    return r;
  }
  function done(r, pass) {
    var er = $("#ae");
    if (r.token) { window.PWK = pass; PV = null; localStorage.t = r.token; T = r.token; init(); return; }
    if (/2FA/.test(r.error || "")) $("#lc").classList.remove("hide");
    er.style.color = "#ff7b8a"; er.textContent = r.error || "Fehler";
  }
  window.auth = async function () {
    var er = $("#ae"), pass = $("#ap").value;
    if (PV) { done(await api("regverify", { name: PV, code: $("#v14c").value }), pass); return; }
    var r = await api(AM, { name: $("#an").value, pass: pass, code: $("#ac").value, email: $("#am").value });
    if (r.verify) {
      PV = r.name; codeRow().classList.remove("hide"); $("#ab").textContent = "Bestätigen";
      er.style.color = "#57f287"; er.textContent = "📧 Wir haben dir einen Code geschickt. Gib ihn ein oder tippe auf den Link in der Mail.";
      setTimeout(function () { var c = $("#v14c"); c && c.focus(); }, 50);
      return;
    }
    done(r, pass);
  };
  var _am = window.amode;
  window.amode = function (m) { PV = null; var r = $("#v14vr"); if (r) r.classList.add("hide"); return _am.apply(this, arguments); };
  var vq = new URLSearchParams(location.search).get("verified");
  if (vq !== null) {
    history.replaceState(null, "", location.pathname);
    setTimeout(function () { say(vq === "1" ? "✅ E-Mail bestätigt – du kannst dich jetzt anmelden" : "Link ungültig oder abgelaufen"); try { amode("login"); } catch (e) {} }, 600);
  }

  /* ---------- 2) E2E wie bei WhatsApp: Schlüssel-Sicherung automatisch mit dem Login-Passwort ---------- */
  var _es = window.e2setup;
  if (_es) window.e2setup = async function () {
    var p = window.PWK; window.PWK = null;
    if (p) try {
      var loc = await e2load(), same = loc && ME.pk && loc.pk === ME.pk;
      var bk = async function () { var ek = await e2wrap(p), r = await api("profile", { ek: ek }); if (!r.error) ME.ek = ek; };
      if (same) { E2.ready = true; if (!ME.ek) await bk(); if (typeof hdFix == "function") hdFix(); return; }
      if (!loc && ME.ek) {
        try { await e2set(await e2unwrap(p, ME.ek)); say("🔒 Schlüssel automatisch wiederhergestellt ✔"); if (typeof hdFix == "function") hdFix(); return; } catch (e) { /* andere Passphrase -> altes Fenster */ }
      } else if (!loc && !ME.pk) {
        var g = await e2gen(); await e2set(g); await api("profile", { pk: g.pk }); ME.pk = g.pk; if (U[ME.name]) U[ME.name].pk = g.pk;
        await bk(); say("🔒 Ende-zu-Ende-Verschlüsselung aktiv"); if (typeof hdFix == "function") hdFix(); return;
      }
    } catch (e) { console.warn("e2 auto", e); }
    return _es.apply(this, arguments);
  };

  /* ---------- 3) Anrufe: Freizeichen beim Anrufer, Klingeln + Titel beim Angerufenen ---------- */
  var RB = null, RING_MAX = 120000;
  function volOk() { return localStorage.sfx != "0" && !(typeof ME != "undefined" && ME && ME.pst == "dnd") && (typeof VOL != "function" || VOL() > 0); }
  function beep() {
    try {
      var c = acx(), t = c.currentTime, v = (typeof VOL == "function" ? VOL() : 1) * .22;
      [0, .5].forEach(function (d) {
        var o = c.createOscillator(), g = c.createGain(); o.frequency.value = 425; o.type = "sine"; o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(v, t + d + .03); g.gain.setValueAtTime(v, t + d + .38); g.gain.linearRampToValueAtTime(0, t + d + .42);
        o.start(t + d); o.stop(t + d + .45);
      });
    } catch (e) {}
  }
  /* Anrufer hört den Anrufton (sounds/call.mp3) in Schleife, bis der andere beitritt oder 2 Minuten um sind. Nur in privaten 1:1-Anrufen. */
  function privRing() { return V && V.ring && V.room && /^dm:/.test(V.room) && !/^dm:g/.test(V.room); }
  function startRB() {
    if (RB) return; V.ringT = Date.now();
    if (!volOk()) { RB = 1; return; }
    var s = null; try { s = sfx("ring", 1); } catch (e) {}
    if (s) { RB = { s: s }; } else { beep(); RB = { i: setInterval(function () { if (volOk()) beep(); }, 3000) }; }
  }
  function stopRB() { if (RB && RB !== 1) { try { RB.s && RB.s.stop(); } catch (e) {} if (RB.i) clearInterval(RB.i); } RB = null; }
  setInterval(function () {
    if (!privRing() || V.ringDone) { if (RB && !(privRing() && !V.ringDone)) stopRB(); return; }
    var joined = V.pcs && Object.keys(V.pcs).length > 0;
    if (joined) { stopRB(); V.ringDone = 1; try { sfx("join"); } catch (e) {} }
    else if (!RB) startRB();
    else if (Date.now() - V.ringT > RING_MAX) { stopRB(); V.ringDone = 1; try { api("ringx", { to: V.ring }); } catch (e) {} say("📵 " + V.ring + " hat nicht abgenommen – du bist allein im Anruf"); }
  }, 400);
  /* Netzwerkpolizei: nur privater 1:1-Anruf, 15 Min. allein -> raus (Server prüft zusätzlich). Gruppen und Server-Kanäle sind ausgenommen. */
  window.v15Kick = function () {
    try { if (V) window.vleave(); } catch (e) {}
    try { modal('<div style="text-align:center"><div style="font-size:54px">🚓</div><h3>Netzwerkpolizei</h3><p class="dm">Du warst 15 Minuten allein im privaten Anruf und wurdest daher entfernt.</p><button class="pri" onclick="document.getElementById(\'modal\').classList.add(\'hide\')">Verstanden</button></div>'); } catch (e) { say("🚓 Netzwerkpolizei: 15 Minuten allein im Anruf – du wurdest entfernt"); }
  };
  setInterval(function () {
    if (typeof V == "undefined" || !V || !V.room || !/^dm:/.test(V.room) || /^dm:g/.test(V.room)) return;
    var alone = !V.pcs || Object.keys(V.pcs).length == 0;
    if (!alone) { V.aloneSince = 0; return; }
    if (!V.aloneSince) V.aloneSince = Date.now();
    else if (Date.now() - V.aloneSince >= 15 * 60000) window.v15Kick();
  }, 1000);
  /* Angerufener: Titel blinkt + Vibration, solange das Klingel-Fenster offen ist */
  var T0 = document.title, tt = null;
  setInterval(function () {
    var rb = $("#ringbox");
    if (rb && !tt) {
      var who = (rb.querySelector("h3") || {}).textContent || "📞 Anruf"; var on = 0;
      tt = setInterval(function () { document.title = (on = !on) ? who : T0; }, 900);
      try { navigator.vibrate && localStorage.sfx != "0" && navigator.vibrate([400, 250, 400, 1200]); } catch (e) {}
    } else if (!rb && tt) { clearInterval(tt); tt = null; document.title = T0; try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }
  }, 500);
  /* Auto-Wiedergabe-Sperre: Klingel-Ton nach erster Berührung freischalten */
  ["pointerdown", "keydown"].forEach(function (ev) { addEventListener(ev, function () { try { acx().resume(); } catch (e) {} }, { once: true, passive: true }); });

  /* ---------- 4) Bildschirm teilen: klare Rückmeldung, wenn das Gerät es nicht kann ---------- */
  var _scr = window.scr;
  if (_scr) window.scr = function () {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
      say("🖥 Bildschirm teilen geht nur am PC/Laptop oder Tablet-Browser (Chrome, Edge, Firefox, Safari). Handy-Browser erlauben es nicht.");
      return;
    }
    return _scr.apply(this, arguments);
  };

  /* ---------- 5) Untere Leiste: passende Discord-Icons ---------- */
  var NAV = { srv: "nav-server", fr: "nav-friends", qs: "nav-search", me: "my-account" };
  function navIcons() {
    document.querySelectorAll("button[data-t] > b img").forEach(function (i) {
      var n = NAV[i.parentNode.parentNode.dataset.t]; if (!n) return;
      var s = "/icons/" + n + ".png"; if (i.getAttribute("src") != s) i.setAttribute("src", s);
    });
  }
  setInterval(navIcons, 700);

  /* ---------- 6) Ungespeichert-Leiste (Server- und Konto-Einstellungen) ---------- */
  var dirty = new Set(), bar = null;
  var defOf = function (t) { return t.type == "checkbox" || t.type == "radio" ? t.defaultChecked : t.tagName == "SELECT" ? ([].find.call(t.options, function (o) { return o.defaultSelected; }) || t.options[0] || {}).value : t.defaultValue; };
  var curOf = function (t) { return t.type == "checkbox" || t.type == "radio" ? t.checked : t.value; };
  function findSave(t) {
    var sc = document.getElementById("sc"), p = t.parentElement;
    while (p && p !== sc && p !== document.body && !p.classList.contains("sset")) {
      var b = [].find.call(p.querySelectorAll("button"), function (x) {
        var s = (x.getAttribute("onclick") || "") + " " + x.textContent;
        return /smod\(|save|speicher/i.test(s) && !/lösch|entfern|kick|bann|verlass/i.test(s);
      });
      if (b) return b; p = p.parentElement;
    }
    return null;
  }
  function eligible(t) {
    var o = t.closest && t.closest(".sset"); if (!o || t.type == "file" || t.type == "search" || t.type == "button" || t.dataset.nosave != null) return false;
    if (o.id == "sset") return !t.getAttribute("onchange") && !t.getAttribute("oninput") && !!findSave(t);
    return o.id == "uset" && (/^p/.test(t.id || "") || (!t.getAttribute("onchange") && !t.getAttribute("oninput")));
  }
  function paint() {
    [].slice.call(dirty).forEach(function (t) { if (!t.isConnected || curOf(t) === defOf(t)) dirty.delete(t); });
    var o = $("#sset") || $("#uset");
    if (dirty.size && o) {
      if (!bar || bar.parentNode !== o) {
        if (bar) bar.remove();
        bar = document.createElement("div"); bar.className = "u14bar";
        bar.innerHTML = '<span>Vorsicht – du hast ungespeicherte Änderungen!</span><button class="rs" type="button">Zurücksetzen</button><button class="pri sv" type="button">Änderungen speichern</button>';
        bar.querySelector(".rs").onclick = reset; bar.querySelector(".sv").onclick = save; o.appendChild(bar);
      }
    } else if (bar) { bar.remove(); bar = null; }
  }
  function onEdit(e) { var t = e.target; if (!t.matches || !t.matches("input,textarea,select") || !eligible(t)) return; if (curOf(t) === defOf(t)) dirty.delete(t); else dirty.add(t); paint(); }
  document.addEventListener("input", onEdit, true); document.addEventListener("change", onEdit, true);
  function reset() {
    dirty.forEach(function (t) {
      if (t.type == "checkbox" || t.type == "radio") t.checked = defOf(t); else t.value = defOf(t);
      t.dispatchEvent(new Event("input", { bubbles: true }));
    });
    dirty.clear(); paint();
  }
  var saving = false;
  async function save() {
    if (saving) return; saving = true; if (bar) bar.classList.add("busy");
    try {
      if ($("#uset") && window.U12 && U12.saveAll) { await U12.saveAll(); }
      else {
        for (var n = 0; n < 8 && dirty.size; n++) {
          var t = [].slice.call(dirty).find(function (x) { return x.isConnected; }); if (!t) break;
          var b = findSave(t); if (b) b.click();
          await sleep(500);
          if (t.isConnected) { if (t.type == "checkbox" || t.type == "radio") t.defaultChecked = t.checked; else t.defaultValue = t.value; }
          paint();
        }
      }
      [].slice.call(dirty).forEach(function (t) { if (t.isConnected) { if (t.type == "checkbox" || t.type == "radio") t.defaultChecked = t.checked; else if (t.tagName != "SELECT") t.defaultValue = t.value; } });
    } catch (e) { say("Speichern fehlgeschlagen"); }
    dirty.clear(); saving = false; paint();
  }
  function shake() { if (!bar) return; bar.classList.remove("shake"); void bar.offsetWidth; bar.classList.add("shake"); }
  window.v14Dirty = function () { return dirty.size > 0; };
  /* Schließen / Abschnitt wechseln blockieren, solange etwas ungespeichert ist */
  document.addEventListener("click", function (e) {
    if (!dirty.size || !e.target.closest) return;
    if (e.target.closest(".u14bar")) return;
    if (e.target.closest(".sset .sx, .sset .snav .sn, .sset .u12back, .sset [data-close]")) { e.stopImmediatePropagation(); e.preventDefault(); shake(); }
  }, true);
  var _sc = window.ssclose;
  if (_sc) window.ssclose = function () { if (dirty.size) { shake(); return; } dirty.clear(); paint(); return _sc.apply(this, arguments); };
  setInterval(paint, 600);
  /* Bildschirm-teilen-Knopf immer sicherstellen (zwischen Kamera und ···) */
  setInterval(function () {
    var c = $("#vc"); if (!c || $("#vbs")) return;
    var b = document.createElement("button"); b.className = "vb"; b.id = "vbs"; b.type = "button"; b.title = "Bildschirm teilen";
    b.setAttribute("onclick", "scr()"); b.innerHTML = '<img src="/icons/vc/stream.png" alt="">';
    var x = $("#vbx"); x ? c.insertBefore(b, x) : c.appendChild(b);
  }, 700);
})();
