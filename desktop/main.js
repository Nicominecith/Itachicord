// Desktop-App (Windows/macOS/Linux) mit automatischer Spiele-Erkennung.
// Start: PULSECORD_URL=https://deine-seite.netlify.app npm start   |   Installer bauen: npm run dist
const { app, BrowserWindow, session, desktopCapturer, Menu } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const URL = process.env.PULSECORD_URL || "https://pulsecords.netlify.app";
const GAMES = { valorant: "Valorant", fortniteclient: "Fortnite", eldenring: "Elden Ring", minecraft: "Minecraft", cs2: "Counter-Strike 2", leagueclient: "League of Legends", dota2: "Dota 2", gta5: "GTA V" }; // beliebig erweitern
app.whenReady().then(() => {
  // Bildschirmfreigabe: Electron braucht einen eigenen Handler, sonst schlägt getDisplayMedia() still fehl.
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(["media", "display-capture", "notifications", "fullscreen", "clipboard-sanitized-write"].includes(perm)));
  ses.setDisplayMediaRequestHandler(async (req, cb) => {
    try {
      const src = await desktopCapturer.getSources({ types: ["screen", "window"], thumbnailSize: { width: 0, height: 0 } });
      if (!src.length) return cb({});
      if (src.length === 1) return cb({ video: src[0] });
      let done = false;
      const pick = (s) => { if (done) return; done = true; s ? cb(s.audio === false ? { video: s.src } : { video: s.src, audio: process.platform === "win32" ? "loopback" : undefined }) : cb({}); };
      const menu = Menu.buildFromTemplate([
        { label: "Was möchtest du teilen?", enabled: false }, { type: "separator" },
        ...src.slice(0, 25).map((s) => ({ label: (s.id.startsWith("screen") ? "🖥  " : "🗔  ") + s.name.slice(0, 60), click: () => pick({ src: s, audio: s.id.startsWith("screen") }) })),
        { type: "separator" }, { label: "Abbrechen", click: () => pick(null) },
      ]);
      menu.popup({ callback: () => pick(null) });
    } catch (e) { cb({}); }
  }, { useSystemPicker: true });
  const w = new BrowserWindow({ width: 1280, height: 800, backgroundColor: "#09061a", icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true, webPreferences: { backgroundThrottling: false } });
  w.loadURL(URL);
  let last = "";
  setInterval(() => exec(process.platform === "win32" ? "tasklist" : "ps -A -o comm", (e, out) => {
    if (e) return;
    const o = out.toLowerCase(), g = Object.keys(GAMES).find((k) => o.includes(k)), a = g ? "Spielt " + GAMES[g] : "";
    if (a === last) return; last = a;
    w.webContents.executeJavaScript(`fetch('/api?a=profile',{method:'POST',headers:{'x-token':localStorage.t},body:JSON.stringify({activity:${JSON.stringify(a)}})})`).catch(() => {});
  }), 30000);
});
app.on("window-all-closed", () => app.quit());
