/* v15: Profilbild-Dekorationen (182) mit Suche & Kategorien, repariertes Menü, Netzwerkpolizei-Hook */
(function () {
  "use strict";
  var LIST = [["neon","Neon","fx"],["rainbow","Regenbogen","fx"],["fire","Feuer","fx"],["ice","Eis","fx"],["gold","Gold","ring"],["aurora","Aurora","fx"],["toxic","Toxic","fx"],["lava","Lava","fx"],["ocean","Ozean","fx"],["galaxy","Galaxie","fx"],["sunset","Sonnenuntergang","fx"],["radar","Radar","fx"],["pulse","Puls","fx"],["glitch","Glitch","fx"],["matrix","Matrix","fx"],["pixel","Pixel","fx"],["shadow","Schatten","fx"],["electric","Blitz","fx"],["sakura","Kirschblüte","pin"],["hearts","Herzen","pin"],["crown","Krone","top"],["halo","Heiligenschein","top"],["devil","Teufelshörner","top"],["cat","Katzenohren","top"],["bunny","Hasenohren","top"],["wings","Engelsflügel","top"],["laurel","Blätterkranz","top"],["star","Sternenstaub","pin"],["moon","Mond","pin"],["snow","Schneefall","fx"],["ruby","Rubin","ring"],["emerald","Smaragd","ring"],["sapphire","Saphir","ring"],["amethyst","Amethyst","ring"],["topaz","Topas","ring"],["coral","Koralle","ring"],["mint","Minze","ring"],["lilac","Flieder","ring"],["rose","Rosé","ring"],["sky","Himmel","ring"],["lime","Limette","ring"],["peach","Pfirsich","ring"],["indigo","Indigo","ring"],["teal","Petrol","ring"],["magenta","Magenta","ring"],["cyan","Cyan","ring"],["orange","Orange","ring"],["violet","Violett","ring"],["crimson","Karmesin","ring"],["silver","Silber","ring"],["bronze","Bronze","ring"],["copper","Kupfer","ring"],["pearl","Perle","ring"],["obsidian","Obsidian","ring"],["midnight","Mitternacht","ring"],["forest","Wald","ring"],["candy","Zuckerwatte","ring"],["bubblegum","Kaugummi","ring"],["mango","Mango","ring"],["berry","Beere","ring"],["ember","Glut","ring"],["glacier","Gletscher","ring"],["storm","Sturm","ring"],["sand","Sand","ring"],["jade","Jade","ring"],["lavender","Lavendel","ring"],["dashruby","Rubin gestrichelt","ring"],["dashemerald","Smaragd gestrichelt","ring"],["dashsapphire","Saphir gestrichelt","ring"],["dashamethyst","Amethyst gestrichelt","ring"],["dashtopaz","Topas gestrichelt","ring"],["dashcoral","Koralle gestrichelt","ring"],["dashmint","Minze gestrichelt","ring"],["dashlilac","Flieder gestrichelt","ring"],["dashrose","Rosé gestrichelt","ring"],["dashsky","Himmel gestrichelt","ring"],["dashlime","Limette gestrichelt","ring"],["dashpeach","Pfirsich gestrichelt","ring"],["glowindigo","Indigo Leuchten","ring"],["glowteal","Petrol Leuchten","ring"],["glowmagenta","Magenta Leuchten","ring"],["glowcyan","Cyan Leuchten","ring"],["gloworange","Orange Leuchten","ring"],["glowviolet","Violett Leuchten","ring"],["glowcrimson","Karmesin Leuchten","ring"],["glowsilver","Silber Leuchten","ring"],["glowbronze","Bronze Leuchten","ring"],["glowcopper","Kupfer Leuchten","ring"],["glowpearl","Perle Leuchten","ring"],["glowobsidian","Obsidian Leuchten","ring"],["dblmidnight","Mitternacht doppelt","ring"],["dblforest","Wald doppelt","ring"],["dblcandy","Zuckerwatte doppelt","ring"],["dblbubblegum","Kaugummi doppelt","ring"],["dblmango","Mango doppelt","ring"],["dblberry","Beere doppelt","ring"],["dblember","Glut doppelt","ring"],["dblglacier","Gletscher doppelt","ring"],["dblstorm","Sturm doppelt","ring"],["dblsand","Sand doppelt","ring"],["dbljade","Jade doppelt","ring"],["dbllavender","Lavendel doppelt","ring"],["tophat","Zylinder","top"],["gradcap","Abschlusshut","top"],["strawhat","Strohhut","top"],["cap","Kappe","top"],["disco","Discokugel","top"],["balloon","Ballon","top"],["cloud","Wolke","top"],["rainbowarc","Regenbogenbogen","top"],["planet","Planet","top"],["ufo","Ufo","top"],["star1","Stern","pin"],["dizzy","Funkeln","pin"],["bolt","Blitzchen","pin"],["clover","Kleeblatt","pin"],["sunflower","Sonnenblume","pin"],["rose1","Rose","pin"],["hibiscus","Hibiskus","pin"],["tulip","Tulpe","pin"],["mushroom","Pilz","pin"],["maple","Ahorn","pin"],["leaves","Blätter","pin"],["pumpkin","Kürbis","pin"],["ghost","Geist","pin"],["web","Spinnennetz","pin"],["skull","Totenkopf","pin"],["alien","Alien","pin"],["robot","Roboter","pin"],["unicorn","Einhorn","pin"],["dragon","Drache","pin"],["butterfly","Schmetterling","pin"],["bee","Biene","pin"],["ladybug","Marienkäfer","pin"],["xmastree","Tannenbaum","pin"],["gift","Geschenk","pin"],["ribbon","Schleife","pin"],["wand","Zauberstab","pin"],["crystal","Kristallkugel","pin"],["gamer","Gamer","pin"],["headset","Kopfhörer","pin"],["music","Musik","pin"],["guitar","Gitarre","pin"],["artist","Künstler","pin"],["camera","Kamera","pin"],["diamond","Diamant","pin"],["trophy","Pokal","pin"],["gold1","Goldmedaille","pin"],["shield","Schild","pin"],["swords","Schwerter","pin"],["rocket","Rakete","pin"],["coffee","Kaffee","pin"],["pizza","Pizza","pin"],["donut","Donut","pin"],["strawberry","Erdbeere","pin"],["melon","Melone","pin"],["paws","Pfoten","pin"],["bubble","Sprechblase","pin"],["bell","Glocke","pin"],["heartblue","Blaues Herz","pin"],["heartgreen","Grünes Herz","pin"],["heartpurple","Lila Herz","pin"],["rgbsweep","RGB-Welle","fx"],["plasma","Plasma","fx"],["nebula","Nebel","fx"],["heartbeat","Herzschlag","fx"],["breath","Atmen","fx"],["ripple","Welle","fx"],["sonar","Sonar","fx"],["shock","Schockwelle","fx"],["sparkring","Funkenring","fx"],["dots","Punkte","fx"],["barcode","Barcode","fx"],["candycane","Zuckerstange","fx"],["checker","Schachbrett","fx"],["hazard","Warnband","fx"],["pastel","Pastell","fx"],["sunrise","Sonnenaufgang","fx"],["moonlight","Mondlicht","fx"],["bloodmoon","Blutmond","fx"],["hologram","Hologramm","fx"],["circuit","Platine","fx"]];
  var CATS = [["all", "Alle"], ["ring", "Ringe"], ["fx", "Effekte"], ["top", "Kopfschmuck"], ["pin", "Abzeichen"]];
  var NAME = {}, CAT = {};
  LIST.forEach(function (d) { NAME[d[0]] = d[1]; CAT[d[0]] = d[2]; });
  /* v7.js kennt nur 30 – die Liste (const DECO) um alle erweitern, damit Profil-Anzeige & Namen passen */
  try {
    if (typeof DECO !== "undefined" && Array.isArray(DECO)) {
      var have = {}; DECO.forEach(function (d) { have[d[0]] = 1; });
      LIST.forEach(function (d) { if (!have[d[0]]) DECO.push([d[0], d[1]]); });
    }
  } catch (e) {}
  var q = "", cat = "all";
  var esc2 = function (s) { return typeof esc == "function" ? esc(s) : String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };
  function avatarStyle() {
    var u = ME || {}, img = u.avatar && !u.avvid ? "background-image:url('" + String(u.avatar).replace(/['"\\()<>\s]/g, encodeURIComponent) + "')" : "";
    return { img: img, ph: !img, ch: ((u.name || "?")[0] || "?").toUpperCase() };
  }
  function cell(k, n, a) {
    return '<button type="button" class="dsel7' + ((ME.deco || "") == k ? " on" : "") + '" data-k="' + k + '" onclick="decoPick(\'' + k + '\')" title="' + esc2(n) + '">' +
      '<div class="av' + (a.ph ? " ph" : "") + (k ? " dc dc-" + k : "") + '" style="--c:' + esc2(ME.color || "#7b6cff") + ';--h:250;' + a.img + '">' + (a.ph ? esc2(a.ch) : "") + '</div><span>' + esc2(n) + '</span></button>';
  }
  function grid() {
    var g = document.getElementById("dgrid7"); if (!g) return;
    var a = avatarStyle(), s = q.trim().toLowerCase();
    var items = [["", "Keine", "all"]].concat(LIST).filter(function (d) {
      if (!d[0]) return !s && cat == "all";
      return (cat == "all" || d[2] == cat || (cat == "pin" && d[2] == "pin")) && (!s || d[1].toLowerCase().indexOf(s) >= 0 || d[0].indexOf(s) >= 0);
    });
    g.innerHTML = items.length ? items.map(function (d) { return cell(d[0], d[1], a); }).join("") : '<div class="dempty7">Nichts gefunden</div>';
  }
  function chips() {
    var c = document.getElementById("dchips7"); if (!c) return;
    c.innerHTML = CATS.map(function (x) {
      var n = x[0] == "all" ? LIST.length : LIST.filter(function (d) { return d[2] == x[0]; }).length;
      return '<button type="button" class="' + (cat == x[0] ? "on" : "") + '" data-c="' + x[0] + '">' + x[1] + " · " + n + "</button>";
    }).join("");
  }
  function preview() {
    var p = document.getElementById("dprev7"); if (!p) return;
    var a = avatarStyle(), k = ME.deco || "";
    p.innerHTML = '<div class="av' + (a.ph ? " ph" : "") + (k ? " dc dc-" + k : "") + '" style="--c:' + esc2(ME.color || "#7b6cff") + ';--h:250;' + a.img + '">' + (a.ph ? esc2(a.ch) : "") + '</div><div><b>' + esc2(k ? (NAME[k] || k) : "Keine Dekoration") + '</b><small>' + LIST.length + ' Dekorationen · für alle sichtbar</small></div>';
  }
  window.decoUI = function () {
    modal('<div class="dpick7"><h3>✨ Profilbild-Dekoration</h3><div class="dprev7" id="dprev7"></div>' +
      '<input type="search" id="dq7" placeholder="Dekoration suchen …" autocomplete="off" value="' + esc2(q) + '">' +
      '<div class="dchips7" id="dchips7"></div><div class="dgrid7" id="dgrid7"></div>' +
      '<div class="dfoot7"><button type="button" onclick="document.getElementById(\'modal\').classList.add(\'hide\')">Fertig</button></div></div>');
    preview(); chips(); grid();
    document.getElementById("dq7").oninput = function (e) { q = e.target.value; grid(); };
    document.getElementById("dchips7").onclick = function (e) { var b = e.target.closest("button[data-c]"); if (!b) return; cat = b.dataset.c; chips(); grid(); };
  };
  var busy = false;
  window.decoPick = async function (k) {
    if (busy) return; busy = true;
    try {
      var r = await api("profile", { deco: k });
      if (r && r.error) { toast(r.error); return; }
      ME.deco = k; (U[ME.name] || (U[ME.name] = { name: ME.name })).deco = k;
      try { last = ""; } catch (e) {}
      document.querySelectorAll("#dgrid7 .dsel7").forEach(function (b) { b.classList.toggle("on", b.dataset.k == k); });
      preview();
      try { me(); } catch (e) {}
      try { if (typeof home == "function" && !srv) home(); } catch (e) {}
      document.querySelectorAll('button[onclick="decoUI()"]').forEach(function (b) { b.textContent = "✨ Profilbild-Dekoration" + (k ? " · " + (NAME[k] || k) : ""); });
      toast(k ? "Dekoration gespeichert ✔" : "Dekoration entfernt");
    } catch (e) { toast("Speichern fehlgeschlagen"); } finally { busy = false; }
  };
})();
