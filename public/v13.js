/* v13: Sprachchat im Discord-Stil
   - Kachel-Raster mit Avatar, Name, Stumm-/Deafen-Symbolen und "spricht"-Rahmen
   - Bildschirmfreigabe repariert (Stream-Kachel mit "Stream ansehen", Fokus-Ansicht, Nachzügler sehen den Stream)
   - zwei unterschiedliche Mikro-Symbole -> Mikrofon (an/aus) und Kopfhörer (Deafen); Push-to-Talk im ⋯-Menü
   - robustere Signalisierung (keine überlappenden Anfragen, höchstens 60 Nachrichten pro Anfrage, Neuversuch bei Fehler)
   Überschreibt die Funktionen aus index.html (peer, sig, vloop, tile, mute, ptt, scr) und umhüllt vjoin/vleave/cam. */
(function () {
  var q = function (s) { return document.querySelector(s); };
  var IC = function (n) { return '<img src="/icons/vc/' + n + '.png" alt="">'; };
  var PAL = ["#cfdcff", "#5b7cf0", "#ff80a8", "#f7e6c0", "#ffb366", "#8fdcb4", "#b9a2ff", "#7fd3dc"];
  var hash = function (s) { var h = 0; for (var c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  var col = function (u) { return PAL[hash(u) % PAL.length]; };
  var nm = function (u) { var x = (typeof U != "undefined" && U[u]) || {}; return x.dname || u; };
  var pk = function () { return window.m9pk ? window.m9pk() : "v"; };

  /* ---------- Zustand, der an die anderen gesendet wird ---------- */
  function myState() {
    var a = V.stream.getAudioTracks()[0];
    return { m: a && !a.enabled ? 1 : 0, d: V.deaf ? 1 : 0, c: V.cam ? 1 : 0, s: V.scrId || "" };
  }
  function sendSt() {
    if (!V) return;
    var st = myState();
    V.lastSt = JSON.stringify(st); V.lastStT = Date.now();
    (V.users || []).filter(function (u) { return u != ME.name; }).forEach(function (u) { V.out.push({ to: u, data: { st: st } }); });
    kick();
  }
  function kick() {
    if (!V || V.kk) return;
    V.kk = setTimeout(function () { if (V) { V.kk = 0; window.vloop(); } }, 120);
  }

  /* ---------- Mikrofon-Logik ---------- */
  function applyMic() {
    if (!V) return;
    var on = !V.muted && !V.deaf && (!V.ptt || V.pttDown);
    V.stream.getAudioTracks().forEach(function (t) { t.enabled = on; });
  }
  window.mute = function () {
    if (!V) return;
    V.muted = !V.muted;
    if (!V.muted && V.deaf) { V.deaf = false; applyDeaf(); }
    applyMic(); sfx(V.muted ? "mute" : "unmute"); refreshCtl(); renderGrid(); sendSt();
  };
  function applyDeaf() { document.querySelectorAll("audio[data-u]").forEach(function (a) { a.muted = !!V.deaf; }); }
  window.vdeaf = function () {
    if (!V) return;
    V.deaf = !V.deaf; applyDeaf(); applyMic(); sfx(V.deaf ? "mute" : "unmute"); refreshCtl(); renderGrid(); sendSt();
  };
  window.ptt = function (b) {
    if (!V) return;
    V.ptt = !V.ptt; V.pttDown = false; if (V.ptt) V.muted = false;
    applyMic();
    if (b && b.textContent !== undefined) b.textContent = "Push-to-Talk (" + pk().toUpperCase() + "): " + (V.ptt ? "an" : "aus");
    refreshCtl(); sendSt();
  };
  addEventListener("keydown", function (e) {
    if (V && V.u13 && V.ptt && e.key == pk() && !e.repeat && !/INPUT|TEXTAREA/.test(e.target.tagName)) { V.pttDown = true; applyMic(); refreshCtl(); sendSt(); }
  });
  addEventListener("keyup", function (e) {
    if (V && V.u13 && V.ptt && e.key == pk()) { V.pttDown = false; applyMic(); refreshCtl(); sendSt(); }
  });

  /* ---------- Steuerleiste ---------- */
  function buildCtl() {
    q("#vc").innerHTML =
      '<button class="vb" id="vbm" title="Mikrofon stumm/an" onclick="mute(this)">' + IC("mic") + '</button>' +
      '<button class="vb" id="vbd" title="Ton aus/an (Deafen)" onclick="vdeaf()">' + IC("deaf") + '</button>' +
      '<button class="vb" id="vbc" title="Kamera" onclick="cam(this)">' + IC("video-off") + '</button>' +
      '<button class="vb" id="vbs" title="Bildschirm teilen" onclick="scr()">' + IC("stream") + '</button>' +
      '<button class="vb mo" id="vbx" title="Mehr" onclick="vmore()">···</button>' +
      '<button class="vb lv" title="Verlassen" onclick="vleave()">' + IC("end") + '</button>';
    refreshCtl();
  }
  function setIcon(id, name, on) {
    var b = q("#" + id); if (!b) return;
    var i = b.querySelector("img"); var src = "/icons/vc/" + name + ".png";
    if (i && i.getAttribute("src") != src) i.setAttribute("src", src);
    b.classList.toggle("on", !!on);
  }
  function refreshCtl() {
    if (!V || !q("#vbm")) return;
    var a = V.stream.getAudioTracks()[0], off = a && !a.enabled;
    setIcon("vbm", off ? "mic-off" : "mic", false);
    setIcon("vbd", V.deaf ? "deaf-off" : "deaf", false);
    setIcon("vbc", V.cam ? "video" : "video-off", !!V.cam);
    setIcon("vbs", V.myScr ? "stream-stop" : "stream", !!V.myScr);
  }
  window.vmore = function () {
    var old = q("#vmo"); if (old) { old.remove(); return; }
    if (!V) return;
    var m = document.createElement("div"); m.id = "vmo";
    function add(label, fn, keep) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = label;
      b.onclick = function () { fn(b); if (!keep) m.remove(); };
      m.append(b);
    }
    add("Push-to-Talk (" + pk().toUpperCase() + "): " + (V.ptt ? "an" : "aus"), function (b) { window.ptt(b); }, true);
    add("🎬 Gemeinsam schauen", function () { window.watch(); });
    add("✋ Hand heben", function () { api("send", { ch: V.room, text: "✋ Hand gehoben" }); });
    Object.keys(typeof SND != "undefined" ? SND : {}).forEach(function (n) { add("🔊 " + n, function () { window.snd(n); }); });
    q("#vp").append(m);
    setTimeout(function () {
      var off = function (e) { if (!m.contains(e.target) && e.target.id != "vbx") { m.remove(); document.removeEventListener("click", off, true); } };
      document.addEventListener("click", off, true);
    }, 0);
  };

  /* ---------- Fenster-Aufbau ---------- */
  function ensureUI() {
    var vp = q("#vp"); if (!vp || vp.querySelector("#vgx")) return;
    var h = document.createElement("div"); h.className = "vh";
    h.innerHTML = '<img src="/icons/volume.png" alt=""><b></b>' +
      '<button class="vbig" type="button" title="Vergrößern">' + IC("full") + '</button>' +
      '<button class="vmin" type="button" title="Minimieren (Chat anzeigen)">' + IC("full-exit") + '</button>';
    h.querySelector(".vbig").onclick = vexpand;
    h.querySelector(".vmin").onclick = function () { if (V) { V.mini = true; syncView(); } };
    var g = document.createElement("div"); g.id = "vgx";
    g.addEventListener("click", function (e) {
      var t = e.target.closest(".vt"); if (!t || !V) return;
      if (e.target.closest(".vwb")) {
        if (t.classList.contains("me")) stopShare(); else { V.focus = t.dataset.k; renderGrid(); }
        return;
      }
      if (e.target.closest(".vfx")) { V.focus = null; renderGrid(); return; }
      if (e.target.closest(".vfs")) { fs(t); return; }
    });
    g.addEventListener("dblclick", function (e) {
      var t = e.target.closest(".vt"); if (t && t.querySelector("video")) fs(t);
    });
    vp.insertBefore(h, vp.firstChild);
    vp.insertBefore(g, q("#vc"));
  }
  function fs(el) { try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) {} }
  async function vexpand() {
    if (!V) return;
    V.mini = false;
    if (ch != V.room) {
      try {
        if (!V.room.startsWith("dm:")) {
          var sid = V.room.split("/")[0];
          if (!srv || srv.id != sid) { if (typeof openSrv == "function") await openSrv(sid); }
        }
        open_(V.room, V.title || "Sprache");
      } catch (e) {}
    }
    syncView();
  }
  function syncView() {
    var full = !!V && !!V.u13 && ch == V.room && !V.mini;
    if (V && V.lastCh !== ch) { V.lastCh = ch; if (ch == V.room) V.mini = false; full = !!V.u13 && ch == V.room && !V.mini; }
    document.body.classList.toggle("vcall", full);
  }
  function fixHdr() {
    /* Kopfzeilen-Knopf "Sprache": Telefon statt drittes Mikrofon-Symbol */
    var i = q('#hd button[title="Sprache"] img.di');
    if (i && !i.dataset.x) { i.dataset.x = 1; i.src = "/icons/call.png"; i.alt = "📞"; }
  }
  setInterval(function () { try { syncView(); fixHdr(); if (V && V.u13) refreshCtl(); } catch (e) {} }, 400);

  /* ---------- Kacheln ---------- */
  window.tile = function () { return document.createElement("video"); }; /* alte Kacheln werden nicht mehr benutzt */

  function camOf(u) {
    if (u == ME.name) {
      if (!V.cam) return null;
      if (V._cmT !== V.cam) { V._cmT = V.cam; V._cm = new MediaStream([V.cam]); }
      return V._cm;
    }
    var s = (V.rs[u] || {}).s, l = (V.rv[u] || []).filter(function (x) { return x.sid != s && x.t.readyState != "ended"; });
    return l.length ? l[0].ms : null;
  }
  function scrOf(u) {
    if (u == ME.name) return V.myScr || null;
    var s = (V.rs[u] || {}).s; if (!s) return null;
    var l = (V.rv[u] || []).filter(function (x) { return x.sid == s && x.t.readyState != "ended"; });
    return l.length ? l[0].ms : null;
  }
  function mkTile(it) {
    var el = document.createElement("div");
    el.className = "vt" + (it.type == "s" ? " vs" : ""); el.dataset.k = it.k;
    if (it.type == "u") {
      el.innerHTML = '<div class="vav"></div><div class="vlive" style="display:none">LIVE</div><div class="vnm"><span></span></div><div class="vst"></div>';
    } else {
      el.innerHTML = '<div class="vwatch"><button class="vwb" type="button"></button></div>' +
        '<div class="vnm"><img src="/icons/vc/stream.png" alt=""><span></span></div>' +
        '<div class="vtools"><button class="vfs" type="button" title="Vollbild">' + IC("full") + '</button>' +
        '<button class="vfx" type="button" title="Zurück zur Übersicht">' + IC("full-exit") + '</button></div>';
    }
    return el;
  }
  function setVideo(el, ms, mirror) {
    var v = el.querySelector("video");
    if (!ms) { if (v) v.remove(); return; }
    if (!v) {
      v = document.createElement("video"); v.autoplay = true; v.muted = true; v.playsInline = true;
      el.insertBefore(v, el.firstChild);
    }
    if (v.srcObject !== ms) { v.srcObject = ms; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    v.classList.toggle("mir", !!mirror);
  }
  function updTile(el, it) {
    var u = it.u, mine = u == ME.name;
    if (it.type == "u") {
      var st = mine ? myState() : (V.rs[u] || {}), cam = camOf(u);
      el.style.setProperty("--tc", col(u));
      el.classList.toggle("hascam", !!cam);
      var h = avb(u, "vbig");
      if (el._av !== h) { el.querySelector(".vav").innerHTML = h; el._av = h; }
      setVideo(el, cam, mine);
      el.querySelector(".vnm span").textContent = nm(u);
      var ic = (st.m || st.d ? '<i title="Mikrofon aus">' + IC("mic-off") + '</i>' : "") + (st.d ? '<i title="Ton aus">' + IC("deaf-off") + '</i>' : "");
      var vs = el.querySelector(".vst"); if (vs._h !== ic) { vs.innerHTML = ic; vs._h = ic; }
      el.style.setProperty("--ns", (st.m || st.d ? 1 : 0) + (st.d ? 1 : 0));
      el.querySelector(".vlive").style.display = scrOf(u) ? "" : "none";
    } else {
      el.classList.toggle("me", mine);
      setVideo(el, it.ms, false);
      var b = el.querySelector(".vwb"), t = mine ? IC("stream-stop") + "Stream beenden" : "Stream ansehen";
      if (b._h !== t) { b.innerHTML = t; b._h = t; }
      el.querySelector(".vnm span").textContent = nm(u);
    }
    el.classList.toggle("vf", V.focus == it.k);
  }
  function renderGrid() {
    if (!V || !V.u13) return;
    var g = q("#vgx"); if (!g) return;
    var users = (V.users && V.users.length) ? V.users : [ME.name], items = [];
    users.forEach(function (u) {
      items.push({ k: "u:" + u, u: u, type: "u" });
      var s = scrOf(u); if (s) items.push({ k: "s:" + u, u: u, type: "s", ms: s });
    });
    var keys = {}; items.forEach(function (i) { keys[i.k] = 1; });
    if (V.focus && !keys[V.focus]) V.focus = null;
    V.tiles.forEach(function (el, k) { if (!keys[k]) { el.remove(); V.tiles.delete(k); } });
    items.forEach(function (it, idx) {
      var el = V.tiles.get(it.k);
      if (!el) { el = mkTile(it); V.tiles.set(it.k, el); }
      updTile(el, it);
      if (g.children[idx] !== el) g.insertBefore(el, g.children[idx] || null);
    });
    var n = items.length;
    g.style.setProperty("--cols", n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4);
    g.style.setProperty("--colsm", n <= 2 ? 1 : 2);
    g.style.setProperty("--colsc", n <= 1 ? 1 : 2);
    g.style.setProperty("--n", Math.max(1, Math.min(n - 1, 6)));
    g.classList.toggle("vfocus", !!V.focus);
    var t = q("#vp .vh b"); if (t) t.textContent = V.title || "Sprache";
  }

  /* ---------- "spricht"-Rahmen ---------- */
  function speakTick() {
    if (!V || !V.u13) return;
    try {
      if (!V.ac) V.ac = new (window.AudioContext || window.webkitAudioContext)();
      if (V.ac.state == "suspended") V.ac.resume().catch(function () {});
      var talk = {};
      var chk = function (u, st) {
        if (!st || !st.getAudioTracks().length) return;
        var a = V.an[u];
        if (!a || a.sid !== st.id) {
          try {
            var an = V.ac.createAnalyser(); an.fftSize = 512;
            V.ac.createMediaStreamSource(st).connect(an);
            a = V.an[u] = { sid: st.id, an: an, buf: new Uint8Array(512) };
          } catch (e) { return; }
        }
        a.an.getByteTimeDomainData(a.buf);
        var m = 0; for (var i = 0; i < a.buf.length; i++) m = Math.max(m, Math.abs(a.buf[i] - 128));
        if (m > 9) talk[u] = 1;
      };
      var a0 = V.stream.getAudioTracks()[0];
      if (a0 && a0.enabled) chk(ME.name, V.stream);
      for (var u in V.ra) if (V.users.indexOf(u) >= 0) chk(u, V.ra[u]);
      V.tiles.forEach(function (el, k) { if (k.charAt(0) == "u") el.classList.toggle("sp", !!talk[k.slice(2)]); });
    } catch (e) {}
  }

  /* ---------- Verbindungen (Perfect Negotiation) ---------- */
  window.peer = function (u) {
    if (V.pcs[u]) return V.pcs[u];
    var pc = new RTCPeerConnection(ICE);
    pc.polite = ME.name > u; pc.q = []; pc.making = false; pc.ign = false;
    var out = function (d) { if (!V) return; V.out.push({ to: u, data: d }); kick(); };
    V.pcs[u] = pc;
    out({ st: myState() }); /* Zustand zuerst: so weiß der andere, welcher Stream die Freigabe ist */
    V.stream.getTracks().forEach(function (t) { pc.addTrack(t, V.stream); });
    if (V.myScr) addScr(u, pc);
    pc.onicecandidate = function (e) { if (e.candidate) out({ c: e.candidate }); };
    pc.onnegotiationneeded = async function () {
      try { pc.making = true; await pc.setLocalDescription(); out({ d: pc.localDescription }); }
      catch (e) { console.warn("negotiation", e); }
      finally { pc.making = false; }
    };
    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState == "failed") { try { pc.restartIce(); } catch (e) {} }
    };
    pc.ontrack = function (e) {
      var t = e.track, st = e.streams[0] || new MediaStream([t]);
      if (t.kind == "audio") {
        var a = document.getElementById("a_" + st.id);
        if (!a) { a = new Audio(); a.id = "a_" + st.id; a.dataset.u = u; a.autoplay = true; document.body.append(a); }
        a.muted = !!V.deaf; a.srcObject = st; a.play().catch(function () {});
        if (st.id != (V.rs[u] || {}).s) V.ra[u] = st;
        st.addEventListener("removetrack", function () { if (!st.getAudioTracks().length) a.remove(); });
        t.onended = function () { if (!st.getAudioTracks().some(function (x) { return x.readyState != "ended"; })) a.remove(); };
        return;
      }
      var it = { t: t, sid: st.id, ms: new MediaStream([t]) };
      (V.rv[u] = V.rv[u] || []).push(it);
      var rm = function () { if (!V) return; V.rv[u] = (V.rv[u] || []).filter(function (x) { return x !== it; }); renderGrid(); };
      t.onended = rm;
      st.addEventListener("removetrack", function (ev) { if (ev.track === t) rm(); });
      renderGrid();
    };
    return pc;
  };

  window.sig = async function (from, d) {
    if (!V) return;
    if (d.act) { actw(d.act[0], d.act[1], 1); return; }
    if (d.snd) { playUrl(d.url); return; }
    if (d.st) {
      var old = V.rs[from] || {};
      V.rs[from] = d.st;
      if (old.s && old.s != d.st.s) V.rv[from] = (V.rv[from] || []).filter(function (x) { return x.sid != old.s; });
      renderGrid(); return;
    }
    var pc = window.peer(from);
    try {
      if (d.d) {
        var collision = d.d.type == "offer" && (pc.making || pc.signalingState != "stable");
        pc.ign = !pc.polite && collision;
        if (pc.ign) return;
        await pc.setRemoteDescription(d.d);
        pc.q.splice(0).forEach(function (c) { pc.addIceCandidate(c).catch(function () {}); });
        if (d.d.type == "offer") {
          await pc.setLocalDescription();
          V.out.push({ to: from, data: { d: pc.localDescription } }); kick();
        }
      } else if (d.c) {
        if (pc.remoteDescription) { try { await pc.addIceCandidate(d.c); } catch (e) { if (!pc.ign) console.warn("ice", e); } }
        else pc.q.push(d.c);
      }
    } catch (e) { console.warn("sig", e); }
  };

  window.vloop = async function () {
    if (!V || !V.u13 || V.busy) return;
    var v = V; v.busy = 1;
    var batch = v.out.splice(0, 60); /* Server nimmt höchstens 60 Nachrichten pro Anfrage */
    try {
      var r = await api("vsync", { room: v.room, out: batch });
      if (V !== v) return;
      if (!r || !r.users) { v.out.unshift.apply(v.out, batch); return; }
      if (!v.sent && ME.entrance) { v.sent = 1; r.users.filter(function (u) { return u != ME.name; }).forEach(function (u) { v.out.push({ to: u, data: { snd: 1, url: ME.entrance } }); }); }
      if (v.n && r.users.length > v.n) sfx("join");
      if (v.n && r.users.length < v.n) sfx("leave");
      v.n = r.users.length; v.users = r.users.slice();
      for (var i = 0; i < r.users.length; i++) if (r.users[i] != ME.name) window.peer(r.users[i]);
      for (var u in v.pcs) if (r.users.indexOf(u) < 0) {
        v.pcs[u].close(); delete v.pcs[u];
        document.querySelectorAll('[data-u="' + u + '"]').forEach(function (e) { e.remove(); });
        delete v.rv[u]; delete v.rs[u]; delete v.ra[u]; delete v.an[u];
      }
      var s = JSON.stringify(myState());
      if (s != v.lastSt || Date.now() - (v.lastStT || 0) > 8000) sendSt();
      renderGrid();
      for (var k = 0; k < r.inbox.length; k++) { await window.sig(r.inbox[k].from, r.inbox[k].data); if (V !== v) return; }
    } catch (e) {
      if (V === v) { v.out.unshift.apply(v.out, batch); console.warn("vloop", e); }
    } finally { if (V === v) v.busy = 0; }
  };

  /* ---------- Bildschirmfreigabe ---------- */
  function addScr(u, pc) {
    pc = pc || V.pcs[u]; var ss = V.myScr;
    if (!pc || !ss) return;
    ss.getTracks().forEach(function (t) { pc.addTrack(t, ss); });
    var tune = function () {
      pc.getSenders().filter(function (s) { return s.track && s.track.kind == "video" && ss.getTracks().indexOf(s.track) >= 0; }).forEach(async function (s) {
        try {
          var p = s.getParameters();
          if (!p.encodings || !p.encodings.length) p.encodings = [{}];
          p.encodings[0].maxBitrate = 6e6;
          await s.setParameters(p);
        } catch (e) {}
      });
    };
    setTimeout(tune, 1500); setTimeout(tune, 5000);
  }
  function stopShare() {
    var ss = V && V.myScr; if (!ss) return;
    V.myScr = null; V.scrId = "";
    for (var u in V.pcs) {
      var pc = V.pcs[u];
      pc.getSenders().filter(function (s) { return s.track && ss.getTracks().indexOf(s.track) >= 0; }).forEach(function (s) { try { pc.removeTrack(s); } catch (e) {} });
    }
    ss.getTracks().forEach(function (t) { t.onended = null; t.stop(); });
    if (V.focus == "s:" + ME.name) V.focus = null;
    applySM(); sendSt(); renderGrid(); refreshCtl(); sfx("cam");
  }
  window.scr = async function () {
    if (!V) return;
    if (V.myScr) { stopShare(); return; }
    if (V.scrB) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { toast("Bildschirmfreigabe wird auf diesem Gerät/Browser nicht unterstützt"); return; }
    V.scrB = 1;
    try {
      var d;
      try {
        d = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } }, audio: true });
      } catch (e) {
        if (e && e.name == "TypeError") d = await navigator.mediaDevices.getDisplayMedia({ video: true });
        else throw e;
      }
      if (!V) { d.getTracks().forEach(function (t) { t.stop(); }); return; }
      var vt = d.getVideoTracks()[0];
      try { vt.contentHint = "motion"; } catch (e) {}
      V.myScr = d; V.scrId = d.id;
      document.body.classList.add("streamer");
      sendSt(); /* zuerst Zustand (welcher Stream = Freigabe), dann die Spuren */
      for (var u in V.pcs) addScr(u);
      vt.onended = function () { if (V && V.myScr === d) stopShare(); };
      renderGrid(); refreshCtl(); sfx("cam");
    } catch (e) {
      if (e && e.name == "NotAllowedError") toast("Bildschirmfreigabe abgebrochen oder vom System blockiert");
      else if (e && e.name == "NotFoundError") toast("Keine Quelle zum Teilen gefunden");
      else toast("Bildschirmfreigabe fehlgeschlagen (" + (e && e.name || "Fehler") + ")");
      console.warn("getDisplayMedia", e);
    } finally { if (V) V.scrB = 0; }
  };

  /* ---------- Kamera: Original weiterverwenden, danach Ansicht aktualisieren ---------- */
  var _cam = window.cam;
  window.cam = async function () {
    var r = await _cam.apply(this, arguments);
    if (V && V.u13) { renderGrid(); refreshCtl(); sendSt(); }
    return r;
  };

  /* ---------- Beitreten / Verlassen ---------- */
  var _vj = window.vjoin;
  window.vjoin = async function () {
    var r = await _vj.apply(this, arguments);
    if (V && !V.u13) {
      V.u13 = 1; V.users = [ME.name]; V.rs = {}; V.rv = {}; V.ra = {}; V.an = {}; V.tiles = new Map();
      var a = V.stream.getAudioTracks()[0]; V.muted = !!(a && !a.enabled);
      var h = q("#hd b"); V.title = (h && h.textContent || "").trim() || "Sprache";
      V.lastCh = ch; V.mini = false;
      ensureUI(); buildCtl(); renderGrid(); syncView();
      V.sp = setInterval(speakTick, 150);
      window.vloop();
    }
    return r;
  };
  var _vl = window.vleave;
  window.vleave = function () {
    if (V) {
      try { if (V.myScr) V.myScr.getTracks().forEach(function (t) { t.onended = null; t.stop(); }); } catch (e) {}
      clearInterval(V.sp); clearTimeout(V.kk);
      try { if (V.ac) V.ac.close(); } catch (e) {}
      var g = q("#vgx"); if (g) g.innerHTML = "";
      var m = q("#vmo"); if (m) m.remove();
    }
    document.body.classList.remove("vcall");
    var r = _vl.apply(this, arguments);
    applySM();
    return r;
  };
})();
