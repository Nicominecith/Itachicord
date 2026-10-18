// Desktop-App (Windows/macOS/Linux) mit automatischer Spiele-Erkennung.
// Start: ITACHICORD_URL=https://deine-seite.netlify.app npm start   |   Installer bauen: npm run dist
const { app, BrowserWindow } = require("electron");
const { exec } = require("child_process");
const URL = process.env.ITACHICORD_URL || "https://DEINE-SEITE.netlify.app";
const GAMES = { valorant: "Valorant", fortniteclient: "Fortnite", eldenring: "Elden Ring", minecraft: "Minecraft", cs2: "Counter-Strike 2", leagueclient: "League of Legends", dota2: "Dota 2", gta5: "GTA V" }; // beliebig erweitern
app.whenReady().then(() => {
  const w = new BrowserWindow({ width: 1280, height: 800, backgroundColor: "#0b0b0e", autoHideMenuBar: true, webPreferences: { backgroundThrottling: false } });
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
