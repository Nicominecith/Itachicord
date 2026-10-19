import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
const J = (d, c = 200) => new Response(JSON.stringify(d), { status: c, headers: { "content-type": "application/json" } });
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString("hex");
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32d = (s) => { let bits = "", o = []; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, "0"); for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };
const totp = (sec, t) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 30000))); const h = crypto.createHmac("sha1", b32d(sec)).update(c).digest(), o = h[19] & 15; return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0"); };
const okTotp = (sec, c) => [-1, 0, 1].some((d) => totp(sec, Date.now() + d * 30000) === String(c).trim());
const eh = (e) => crypto.createHash("sha256").update(e).digest("hex").slice(0, 32);
const id = () => crypto.randomBytes(6).toString("hex");
const wo = (l, x) => (l || []).filter((y) => y !== x);
// Feste 18-stellige Nutzer-ID (wie bei Discord) – wird aus Name + Erstellzeit berechnet, braucht keine Migration
const uidOf = (u) => String(100000000000000000n + (BigInt("0x" + crypto.createHash("sha256").update("itachicord:" + u.name + ":" + (u.created || 0)).digest("hex").slice(0, 14)) % 800000000000000000n));
// Diese Aktionen darf auch ein gebannter Nutzer (nur lesen)
const READONLY = ["me", "users", "msgs", "inbox", "rels", "discover", "dl", "export", "vlist", "unring", "vleave", "adm_me", "pushkey", "pushsub", "pushunsub"];
// Gmail-SMTP: Netlify env GMAIL_USER (deine Gmail-Adresse) + GMAIL_APP_PASS (16-stelliges App-Passwort)
const mailOn = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
const mail = async (to, subject, text) => {
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS.replace(/\s/g, "") } });
  await t.sendMail({ from: `Pulsecord <${process.env.GMAIL_USER}>`, to, subject, text });
};
const okMail = (e) => e.length <= 120 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e);
// ---- Web-Push: Benachrichtigungen auch bei geschlossener App (VAPID-Schlüssel werden automatisch erzeugt und gespeichert) ----
const vapid = async (st) => {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) return { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE };
  let k = await st.get("cfg/vapid", { type: "json" });
  if (!k) { const w = (await import("web-push")).default; k = w.generateVAPIDKeys(); await st.setJSON("cfg/vapid", k); }
  return k;
};
const sendPush = async (st, user, payload) => {
  try {
    let subs = (await st.get("ps/" + user, { type: "json" })) || [];
    const srvId = String(payload.ch || "").split("/")[0];
    subs = subs.filter((x) => !(payload.ch && !String(payload.ch).startsWith("dm:") && (x.mu || []).includes(srvId)));
    if (!subs.length) return;
    const w = (await import("web-push")).default, k = await vapid(st);
    w.setVapidDetails("https://pulsecords.netlify.app", k.publicKey, k.privateKey);
    const body = JSON.stringify(payload), dead = [];
    await Promise.all(subs.map(async (x) => {
      try { await w.sendNotification({ endpoint: x.endpoint, keys: x.keys }, body, { TTL: payload.k === "call" ? 30 : 3600, urgency: "high" }); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) dead.push(x.endpoint); }
    }));
    if (dead.length) { const all = (await st.get("ps/" + user, { type: "json" })) || []; await st.setJSON("ps/" + user, all.filter((x) => !dead.includes(x.endpoint))); }
  } catch (e) { /* Push darf nie etwas blockieren */ }
};
export const config = { path: "/api" };

export default async (req) => {
  const st = getStore({ name: "itachicord", consistency: "strong" });
  const get = async (k, d) => (await st.get(k, { type: "json" })) ?? d;
  const put = (k, v) => st.setJSON(k, v);
  const a = new URL(req.url).searchParams.get("a");
  const q = new URL(req.url).searchParams;
  const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const clean = (n) => String(n || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  // Login/Reset: Benutzername ODER E-Mail (wie bei Discord)
  const who = async (x) => String(x || "").includes("@") ? ((await get("e/" + eh(String(x).trim().toLowerCase()), "")) || "") : clean(x);

  if (a === "reg") {
    const n = clean(b.name);
    if (n.length < 2 || !b.pass || b.pass.length < 4) return J({ error: "Name (min. 2) / Passwort (min. 4)" }, 400);
    if (await get("u/" + n)) return J({ error: "Name vergeben" }, 400);
    const em = String(b.email || "").trim().toLowerCase();
    if (!em || !okMail(em)) return J({ error: "Bitte eine gültige E-Mail-Adresse angeben" }, 400);
    if (await get("e/" + eh(em), "")) return J({ error: "Diese E-Mail ist schon registriert" }, 400);
    const salt = id();
    await put("u/" + n, { name: n, salt, h: hash(b.pass, salt), status: "", bio: "", email: em, color: "#7b6cff", avatar: "", banner: "", created: Date.now(), servers: [] });
    await put("e/" + eh(em), n);
  }
  if (a === "reg" || a === "login") {
    const n = a === "login" ? await who(b.name) : clean(b.name), u = n ? await get("u/" + n) : null;
    if (!u || u.h !== hash(b.pass || "", u.salt)) return J({ error: "Falsche Daten" }, 401);
    if (u.tfa && !okTotp(u.tfa, b.code)) return J({ error: "2FA-Code nötig" }, 401);
    const t = crypto.randomBytes(24).toString("hex");
    await put("t/" + t, n);
    return J({ token: t });
  }

  if (a === "forgot") {
    if (!mailOn()) return J({ error: "E-Mail-Versand ist nicht eingerichtet" }, 503);
    const n = await who(b.name), u = n ? await get("u/" + n) : null;
    if (u && u.email && Date.now() - (await get("rl/" + n, 0)) > 60000) {
      await put("rl/" + n, Date.now());
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0"), sl = id();
      await put("pr/" + n, { h: hash(code, sl), s: sl, exp: Date.now() + 15 * 60000, tries: 0 });
      try { await mail(u.email, "Pulsecord – Passwort zurücksetzen", `Hallo ${n},\n\ndein Code zum Zurücksetzen: ${code}\n\nEr ist 15 Minuten gültig. Warst du das nicht, ignoriere diese Mail einfach.`); } catch (e) { console.error("mail", e.message); }
    }
    return J({ ok: 1 });
  }
  if (a === "reset") {
    const n = await who(b.name), r = n ? await get("pr/" + n, null) : null;
    if (!b.pass || b.pass.length < 4) return J({ error: "Passwort min. 4 Zeichen" }, 400);
    if (!r || r.exp < Date.now() || r.tries >= 5) return J({ error: "Code ungültig oder abgelaufen" }, 400);
    if (r.h !== hash(String(b.code || "").trim(), r.s)) { r.tries++; await put("pr/" + n, r); return J({ error: "Code falsch" }, 400); }
    const u = await get("u/" + n);
    if (!u) return J({ error: "Code ungültig oder abgelaufen" }, 400);
    u.salt = id(); u.h = hash(b.pass, u.salt);
    await put("u/" + n, u); await st.delete("pr/" + n);
    return J({ ok: 1 });
  }

  if (a === "hook") {
    const h = await get("h/" + q.get("k"), null);
    if (!h) return J({ error: "hook" }, 404);
    const m = await get("m/" + h.ch, []);
    m.push({ id: id(), u: "🪝 " + String(b.name || h.name).slice(0, 20), t: Date.now(), text: String(b.text || "").slice(0, 4000), reply: null, file: null, react: {}, pin: false });
    await put("m/" + h.ch, m.slice(-200));
    return J({ ok: 1 });
  }
  const OA = {
    github: { auth: "https://github.com/login/oauth/authorize", tok: "https://github.com/login/oauth/access_token", me: "https://api.github.com/user", scope: "read:user", name: (j) => j.login },
    spotify: { auth: "https://accounts.spotify.com/authorize", tok: "https://accounts.spotify.com/api/token", me: "https://api.spotify.com/v1/me", scope: "user-read-private", name: (j) => j.display_name || j.id, basic: 1 },
    twitch: { auth: "https://id.twitch.tv/oauth2/authorize", tok: "https://id.twitch.tv/oauth2/token", me: "https://api.twitch.tv/helix/users", scope: "user:read:email", name: (j) => j.data?.[0]?.login, hdr: 1 },
    reddit: { auth: "https://www.reddit.com/api/v1/authorize", tok: "https://www.reddit.com/api/v1/access_token", me: "https://oauth.reddit.com/api/v1/me", scope: "identity", name: (j) => j.name, basic: 1 },
    youtube: { auth: "https://accounts.google.com/o/oauth2/v2/auth", tok: "https://oauth2.googleapis.com/token", me: "https://www.googleapis.com/oauth2/v3/userinfo", scope: "openid profile", name: (j) => j.name },
  };
  const origin = new URL(req.url).origin;
  if (a === "oauth") {
    const p = q.get("p"), o = OA[p], who = await get("t/" + q.get("t"), null), P = String(p).toUpperCase();
    if (!o || !who) return J({ error: "ungültig" }, 400);
    const cid = process.env["OAUTH_" + P + "_ID"];
    if (!cid) return J({ error: "Umgebungsvariable OAUTH_" + P + "_ID fehlt in Netlify" }, 400);
    const state = id() + id(); await put("o/" + state, who);
    const u = new URL(o.auth);
    u.search = new URLSearchParams({ client_id: cid, redirect_uri: origin + "/api?a=cb&p=" + p, response_type: "code", scope: o.scope, state, duration: "temporary" });
    return Response.redirect(u.toString(), 302);
  }
  if (a === "cb") {
    const p = q.get("p"), o = OA[p], P = String(p).toUpperCase(), who = await get("o/" + q.get("state"), null);
    if (!o || !who || !q.get("code")) return new Response("Fehler", { status: 400 });
    await st.delete("o/" + q.get("state"));
    const cid = process.env["OAUTH_" + P + "_ID"], sec = process.env["OAUTH_" + P + "_SECRET"];
    const body = new URLSearchParams({ grant_type: "authorization_code", code: q.get("code"), redirect_uri: origin + "/api?a=cb&p=" + p });
    const hd = { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": "pulsecord/1.0" };
    if (o.basic) hd.authorization = "Basic " + Buffer.from(cid + ":" + sec).toString("base64"); else { body.set("client_id", cid); body.set("client_secret", sec); }
    const tk = await (await fetch(o.tok, { method: "POST", headers: hd, body })).json();
    const mh = { authorization: "Bearer " + tk.access_token, "user-agent": "pulsecord/1.0", accept: "application/json" };
    if (o.hdr) mh["client-id"] = cid;
    const nm = o.name(await (await fetch(o.me, { headers: mh })).json());
    if (!nm) return new Response("Verknüpfung fehlgeschlagen", { status: 400 });
    const u = await get("u/" + who); (u.links ||= {})[p] = nm; await put("u/" + who, u);
    return Response.redirect(origin + "/?linked=" + p, 302);
  }
  if (a === "steam") {
    const who = await get("t/" + q.get("t"), null);
    if (!who) return J({ error: "auth" }, 400);
    const state = id() + id(); await put("o/" + state, who);
    return Response.redirect("https://steamcommunity.com/openid/login?" + new URLSearchParams({ "openid.ns": "http://specs.openid.net/auth/2.0", "openid.mode": "checkid_setup", "openid.return_to": origin + "/api?a=steamcb&state=" + state, "openid.realm": origin, "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select", "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select" }), 302);
  }
  if (a === "steamcb") {
    const who = await get("o/" + q.get("state"), null);
    if (!who) return new Response("Fehler", { status: 400 });
    await st.delete("o/" + q.get("state"));
    const pp = new URLSearchParams(); for (const [k, v] of q) if (k.startsWith("openid.")) pp.set(k, v);
    pp.set("openid.mode", "check_authentication");
    const v = await (await fetch("https://steamcommunity.com/openid/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: pp })).text();
    const sid = (q.get("openid.claimed_id") || "").split("/").pop();
    if (!v.includes("is_valid:true") || !/^\d+$/.test(sid)) return new Response("Steam-Verifizierung fehlgeschlagen", { status: 400 });
    let nm = sid;
    if (process.env.STEAM_KEY) { const j = await (await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_KEY}&steamids=${sid}`)).json(); nm = j.response?.players?.[0]?.personaname || sid; }
    const u = await get("u/" + who); (u.links ||= {}).steam = nm; await put("u/" + who, u);
    return Response.redirect(origin + "/?linked=steam", 302);
  }
  if (a === "img") {
    const t = q.get("t"), i = String(q.get("i") || "").replace(/[^\w-]/g, ""), n = clean(q.get("n"));
    let d = null;
    if (t === "av" || t === "bn") { const u = await get("u/" + clean(i), null); d = u && (t === "av" ? u.avatar : u.banner); }
    else if (t === "si") d = (await get("s/" + i, null))?.icon;
    else if (t === "gi") d = (await get("g/" + i, null))?.icon;
    else if (t === "pa" || t === "pb") { const p = (await get("s/" + i, null))?.prof?.[n]; d = p && (t === "pa" ? p.avatar : p.banner); }
    const m = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(d || "");
    if (!m) return new Response("", { status: 404, headers: { "cache-control": "public, max-age=60" } });
    return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
  }
  const me = await get("t/" + (req.headers.get("x-token") || "x"), null);
  if (!me) return J({ error: "auth" }, 401);
  const U = await get("u/" + me);
  if (!U) return J({ error: "auth" }, 401); // Konto wurde gelöscht
  if (Date.now() - (U.seen || 0) > 30000) { U.seen = Date.now(); await put("u/" + me, U); }

  // ---- Admin / Management ----
  // Admin ist standardmäßig "nicominecith". Weitere/andere Admins: Netlify-Variable ADMIN_USERS (Namen, Komma-getrennt).
  const admins = async () => {
    const env = String(process.env.ADMIN_USERS || "").split(",").map(clean).filter(Boolean);
    return env.length ? env : ["nicominecith"];
  };
  const IS_ADMIN = (await admins()).includes(me);
  if (a.startsWith("adm_")) {
    if (a === "adm_me") return J({ admin: IS_ADMIN, name: me });
    if (!IS_ADMIN) return J({ error: "Kein Zugriff" }, 403);
    const adm = await admins();
    if (a === "adm_users") {
      const { blobs } = await st.list({ prefix: "u/" });
      const all = (await Promise.all(blobs.map((x) => get(x.key, null)))).filter(Boolean);
      const sv = (await st.list({ prefix: "s/" })).blobs.length;
      return J({ servers: sv, users: all.map((u) => ({ name: u.name, uid: uidOf(u), email: u.email || "", created: u.created || 0, seen: u.seen || 0, pst: u.pst || "online", banned: !!u.banned, reason: u.banreason || "", servers: (u.servers || []).length, admin: adm.includes(u.name), tfa: !!u.tfa, hasav: !!u.avatar })).sort((x, y) => y.created - x.created) });
    }
    if (a === "adm_verify") {
      const vn = clean(b.name), VU = vn ? await get("u/" + vn, null) : null;
      if (!VU) return J({ error: "Nutzer nicht gefunden" }, 404);
      if (b.on) VU.verified = true; else delete VU.verified;
      await put("u/" + vn, VU);
      return J({ ok: 1, verified: !!VU.verified });
    }
    const tn = clean(b.name), T = tn ? await get("u/" + tn, null) : null;
    if (!T) return J({ error: "Nutzer nicht gefunden" }, 404);
    if (adm.includes(T.name)) return J({ error: "Admins können nicht gebannt oder gelöscht werden" }, 400);
    if (a === "adm_ban") {
      if (b.on) { T.banned = true; T.banreason = String(b.reason || "").slice(0, 200); T.bannedAt = Date.now(); } else { delete T.banned; delete T.banreason; delete T.bannedAt; }
      await put("u/" + T.name, T);
      return J({ ok: 1 });
    }
    if (a === "adm_del") {
      for (const sid of T.servers || []) {
        const sv = await get("s/" + sid, null); if (!sv) continue;
        if (sv.owner === T.name) {
          await Promise.all(sv.members.filter((m) => m !== T.name).map(async (m) => { const u = await get("u/" + m, null); if (u) { u.servers = wo(u.servers, sv.id); await put("u/" + m, u); } }));
          const { blobs } = await st.list({ prefix: `m/${sv.id}/` });
          await Promise.all([...blobs.map((k) => st.delete(k.key)), st.delete("s/" + sv.id)]);
        } else { sv.members = wo(sv.members, T.name); sv.mods = wo(sv.mods, T.name); if (sv.roles) delete sv.roles[T.name]; await put("s/" + sv.id, sv); }
      }
      if (T.email && (await get("e/" + eh(T.email), "")) === T.name) await st.delete("e/" + eh(T.email));
      await Promise.all([st.delete("u/" + T.name), st.delete("n/" + T.name), st.delete("r/" + T.name), st.delete("pr/" + T.name), st.delete("ps/" + T.name)]);
      return J({ ok: 1 });
    }
    return J({ error: "?" }, 404);
  }
  // Gebannte Konten: nur lesen – keine Nachrichten, keine Server, keine Änderungen
  if (U.banned && !READONLY.includes(a)) return J({ error: "Dein Konto ist gesperrt – du kannst nur noch lesen." + (U.banreason ? " Grund: " + U.banreason : ""), banned: true }, 403);

  const allowed = async (ch) => {
    if (ch.startsWith("dm:")) {
      const gm = /^dm:g([0-9a-f]{12})$/.exec(ch);
      if (gm) { const g = await get("g/" + gm[1], null); return !!g && g.members.includes(me); }
      return ch.split(":").slice(1).includes(me);
    }
    const s = await get("s/" + ch.split("/")[0]);
    if (!s || !s.members.includes(me)) return false;
    const c = s.channels.find((x) => x.id === (ch.split("/")[1] || "").split("~")[0]);
    if (c?.view && s.owner !== me && !(s.mods || []).includes(me) && !(c.view !== "mods" && s.roles?.[me]?.n === c.view)) return false;
    return true;
  };
  const pub = (u) => ({ name: u.name, uid: uidOf(u), status: u.status, activity: u.activity, pron: u.pron, dstyle: u.dstyle, links: u.links, conn: u.conn, created: u.created, dname: u.dname || "", ptheme: u.ptheme || "", verified: !!u.verified, bio: u.bio, color: (u.color || "").toLowerCase() === "#c8102e" ? "#7b6cff" : u.color, hasav: !!u.avatar, avvid: !!u.avatar?.startsWith("data:video"), hasbn: !!u.banner, imv: u.imv || 0 });
  const srvPub = (s) => {
    const o = { ...s, icon: undefined, hasicon: !!s.icon };
    if (s.prof) { o.prof = {}; for (const [k, p] of Object.entries(s.prof)) o.prof[k] = { name: p.name, bio: p.bio, hasav: !!p.avatar, hasbn: !!p.banner, avvid: !!p.avatar?.startsWith("data:video"), v: p.v || 0 }; }
    return o;
  };
  const relOut = () => ({ friends: U.friends || [], fin: U.fin || [], fout: U.fout || [], blocked: U.blocked || [] });
  const uniq = (l, x) => (l || []).includes(x) ? l : [...(l || []), x];

  if (a === "me") {
    const servers = (await Promise.all(U.servers.map((sid) => get("s/" + sid, null)))).filter(Boolean).map(srvPub);
    const groups = (await Promise.all((U.groups || []).map((gid) => get("g/" + gid, null)))).filter((g) => g && g.members.includes(me)).map((g) => ({ id: g.id, ch: "dm:g" + g.id, name: g.name, members: g.members, owner: g.owner, hasicon: !!g.icon, iv: g.iv || 0 }));
    return J({ me: { ...pub(U), groups, email: U.email || "", tfa: !!U.tfa, pst: U.pst || "online", banned: !!U.banned, banreason: U.banreason || "", admin: IS_ADMIN, dms: U.dms || [], ...relOut(), entrance: U.entrance }, servers });
  }
  if (a === "users") {
    const { blobs } = await st.list({ prefix: "u/" });
    const out = (await Promise.all(blobs.map((x) => get(x.key, null)))).filter(Boolean).map((u) => ({ ...pub(u), pres: u.pst === "invisible" || Date.now() - (u.seen || 0) > 90000 ? "offline" : u.pst || "online" }));
    return J(out);
  }
  if (a === "profile") {
    for (const k of ["status", "activity", "pron", "dstyle", "entrance", "conn", "bio", "color", "avatar", "banner"]) if (typeof b[k] === "string") U[k] = b[k].slice(0, k === "entrance" || !["avatar", "banner"].includes(k) ? 700000 : 4500000);
    if (typeof b.dname === "string") U.dname = b.dname.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 32);
    if (typeof b.ptheme === "string") U.ptheme = b.ptheme.slice(0, 220);
    if (b.avatar || b.banner) U.imv = Date.now();
    await put("u/" + me, U);
    return J({ ok: 1 });
  }
  if (a === "mksrv" || a === "join") {
    if (U.servers.length >= 200) return J({ error: "Max. 200 Server" }, 400);
    let s;
    if (a === "mksrv") {
      s = { id: id(), name: String(b.name || "Server").slice(0, 40), owner: me, members: [me], channels: [{ id: "allgemein", name: "allgemein" }] };
    } else {
      s = await get("s/" + b.id);
      if (!s) return J({ error: "Server nicht gefunden" }, 404);
      if (s.bans?.includes(me)) return J({ error: "Gebannt" }, 403);
      const nw = Date.now();
      if ((s.lock || 0) > nw) return J({ error: "Server im Raid-Schutz (gesperrt)" }, 403);
      if (s.minage && nw - (U.created || nw) < s.minage * 60000) return J({ error: `Verifizierung: Konto muss ${s.minage} Min. alt sein` }, 403);
      if (s.raid && !s.members.includes(me)) { s.joins = (s.joins || []).filter((t) => nw - t < 60000); s.joins.push(nw); if (s.joins.length > 5) { s.lock = nw + 600000; await put("s/" + s.id, s); return J({ error: "Raid-Schutz aktiviert" }, 403); } }
      if (!s.members.includes(me)) s.members.push(me);
    }
    await put("s/" + s.id, s);
    if (!U.servers.includes(s.id)) U.servers.push(s.id);
    await put("u/" + me, U);
    return J(srvPub(s));
  }
  if (a === "mkch") {
    const s = await get("s/" + b.srv);
    if (!s || s.owner !== me) return J({ error: "Nur Besitzer" }, 403);
    const n = clean(b.name) || "kanal";
    if (s.channels.find((c) => c.id === n)) return J({ error: "Kanal existiert schon" }, 400);
    if (s.channels.length >= 100) return J({ error: "Max. 100 Kanäle" }, 400);
    const cat = String(b.cat || "").trim().slice(0, 20), ch = { id: n, name: n, type: ["text", "voice", "forum", "announce", "stage", "media"].includes(b.type) ? b.type : "text" };
    if (cat) { ch.cat = cat; if (!(s.cats || []).includes(cat)) (s.cats ||= []).push(cat); }
    s.channels.push(ch);
    await put("s/" + s.id, s);
    return J(srvPub(s));
  }
  if (a === "leave") {
    const s = await get("s/" + b.srv, null);
    if (!s || !s.members.includes(me)) return J({ error: "nf" }, 404);
    if (s.owner === me) return J({ error: "Besitzer können nicht gehen – übertrage den Server oder lösche ihn" }, 400);
    s.members = wo(s.members, me); s.mods = wo(s.mods, me); if (s.roles) delete s.roles[me];
    (s.log ||= []).push({ t: Date.now(), u: me, x: "hat den Server verlassen" });
    U.servers = wo(U.servers, s.id);
    await Promise.all([put("s/" + s.id, s), put("u/" + me, U)]);
    return J({ ok: 1 });
  }
  if (a === "delsrv") {
    const s = await get("s/" + b.srv, null);
    if (!s || s.owner !== me) return J({ error: "Nur Besitzer" }, 403);
    if (String(b.confirm || "") !== s.name) return J({ error: "Servername stimmt nicht überein" }, 400);
    await Promise.all(s.members.map(async (m) => { const u = await get("u/" + m, null); if (u) { u.servers = wo(u.servers, s.id); await put("u/" + m, u); } }));
    const { blobs } = await st.list({ prefix: `m/${s.id}/` });
    await Promise.all([...blobs.map((k) => st.delete(k.key)), st.delete("s/" + s.id)]);
    return J({ ok: 1 });
  }
  if (a === "setmail") {
    const em = String(b.email || "").trim().toLowerCase();
    if (!em || !okMail(em)) return J({ error: "Bitte eine gültige E-Mail-Adresse angeben" }, 400);
    if (U.h !== hash(b.pass || "", U.salt)) return J({ error: "Passwort falsch" }, 403);
    const o = await get("e/" + eh(em), "");
    if (o && o !== me) return J({ error: "Diese E-Mail ist schon registriert" }, 400);
    if (U.email && U.email !== em && (await get("e/" + eh(U.email), "")) === me) await st.delete("e/" + eh(U.email));
    U.email = em; await put("u/" + me, U); await put("e/" + eh(em), me);
    return J({ ok: 1 });
  }
  if (a === "tfa") {
    if (b.op === "gen") { U.tmp = Array.from(crypto.randomBytes(16), (x) => B32[x % 32]).join(""); await put("u/" + me, U); return J({ secret: U.tmp, uri: `otpauth://totp/Pulsecord:${me}?secret=${U.tmp}&issuer=Pulsecord` }); }
    if (b.op === "on" && U.tmp && okTotp(U.tmp, b.code)) { U.tfa = U.tmp; delete U.tmp; await put("u/" + me, U); return J({ ok: 1 }); }
    if (b.op === "off" && U.tfa && okTotp(U.tfa, b.code)) { delete U.tfa; await put("u/" + me, U); return J({ ok: 1 }); }
    return J({ error: "Code falsch" }, 400);
  }
  if (a === "pst") { if (["online", "idle", "dnd", "invisible"].includes(b.v)) { U.pst = b.v; U.seen = Date.now(); await put("u/" + me, U); } return J({ ok: 1 }); }
  if (a === "mkgrp") {
    const mem = [...new Set([me, ...(Array.isArray(b.members) ? b.members : []).map(clean)])].filter(Boolean);
    const us = await Promise.all(mem.map((n) => get("u/" + n, null)));
    if (us.some((x) => !x)) return J({ error: "Unbekannter Nutzer" }, 400);
    if (mem.length < 3 || mem.length > 10) return J({ error: "Gruppen brauchen 3–10 Mitglieder (inkl. dir)" }, 400);
    if (us.some((x) => x.name !== me && x.blocked?.includes(me))) return J({ error: "Ein Mitglied hat dich blockiert" }, 403);
    const gid = crypto.randomBytes(6).toString("hex"), name = String(b.name || "").trim().slice(0, 40) || "Gruppe";
    let icon = "";
    if (b.icon) { if (!/^data:image\//.test(b.icon) || b.icon.length > 150000) return J({ error: "Gruppenbild zu groß (max ~100 KB)" }, 400); icon = b.icon; }
    await put("g/" + gid, { id: gid, name, owner: me, members: mem, icon, iv: Date.now(), created: Date.now() });
    await Promise.all(us.map((x) => { (x.groups ||= []).push(gid); return put("u/" + x.name, x); }));
    return J({ ok: 1, ch: "dm:g" + gid });
  }
  if (a === "grp") {
    const g = await get("g/" + String(b.id || "").replace(/[^0-9a-f]/g, ""), null);
    if (!g || !g.members.includes(me)) return J({ error: "Gruppe nicht gefunden" }, 404);
    if (b.op === "rename") { const n = String(b.val || "").trim().slice(0, 40); if (!n) return J({ error: "Name fehlt" }, 400); g.name = n; }
    else if (b.op === "icon") { if (!b.val) g.icon = ""; else { if (!/^data:image\//.test(b.val) || b.val.length > 150000) return J({ error: "Bild zu groß (max ~100 KB)" }, 400); g.icon = b.val; } g.iv = Date.now(); }
    else if (b.op === "add") {
      const n = clean(b.val), nu = n && (await get("u/" + n, null));
      if (!nu) return J({ error: "Nutzer nicht gefunden" }, 404);
      if (nu.blocked?.includes(me)) return J({ error: "Dieser Nutzer hat dich blockiert" }, 403);
      if (g.members.length >= 10) return J({ error: "Max. 10 Mitglieder" }, 400);
      if (!g.members.includes(n)) { g.members.push(n); (nu.groups ||= []).push(g.id); await put("u/" + n, nu); }
    }
    else if (b.op === "leave") {
      g.members = wo(g.members, me); U.groups = wo(U.groups, g.id); await put("u/" + me, U);
      if (!g.members.length) { await st.delete("g/" + g.id); await st.delete("m/dm:g" + g.id); return J({ ok: 1 }); }
      if (g.owner === me) g.owner = g.members[0];
    }
    else return J({ error: "Unbekannte Aktion" }, 400);
    await put("g/" + g.id, g);
    return J({ ok: 1 });
  }
  if (a === "typing") {
    if (!b.ch || !(await allowed(b.ch))) return J({ error: "forbidden" }, 403);
    await put(`ty/${b.ch}/${me}`, Date.now());
    return J({ ok: 1 });
  }
  if (a === "tyl") {
    const c = q.get("ch");
    if (!c || !(await allowed(c))) return J({ error: "forbidden" }, 403);
    const { blobs } = await st.list({ prefix: `ty/${c}/` }), now = Date.now(), out = [];
    await Promise.all(blobs.map(async (k) => { const u = k.key.split("/").pop(); if (u === me) return; const t = await get(k.key, 0); if (now - t < 6000 && !(U.blocked || []).includes(u)) out.push(u); }));
    return J(out);
  }
  if (a === "dmx") { U.dms = (U.dms || []).filter((x) => x !== clean(b.target)); await put("u/" + me, U); return J({ ok: 1 }); }
  if (a === "rel") {
    // Nur noch Blockieren/Entsperren – Freunde laufen über Anfragen (frq/fac/fdec/frm)
    const t = clean(b.target);
    if (b.op !== "block" || t === me || !(await get("u/" + t, null))) return J({ error: "?" }, 400);
    if ((U.blocked || []).includes(t)) U.blocked = wo(U.blocked, t);
    else {
      U.blocked = uniq(U.blocked, t); U.friends = wo(U.friends, t); U.fin = wo(U.fin, t); U.fout = wo(U.fout, t);
      const T = await get("u/" + t, null);
      if (T) { T.friends = wo(T.friends, me); T.fin = wo(T.fin, me); T.fout = wo(T.fout, me); await put("u/" + t, T); }
    }
    await put("u/" + me, U);
    return J(relOut());
  }
  if (a === "rels") return J(relOut());
  if ([ "frq", "fac", "fdec", "frm" ].includes(a)) {
    const t = clean(b.target);
    if (!t || t === me) return J({ error: "Das bist du selbst" }, 400);
    const T = await get("u/" + t, null);
    if (!T) return J({ error: "Nutzer nicht gefunden" }, 404);
    const accept = () => { U.friends = uniq(U.friends, t); T.friends = uniq(T.friends, me); U.fin = wo(U.fin, t); U.fout = wo(U.fout, t); T.fin = wo(T.fin, me); T.fout = wo(T.fout, me); };
    let auto = false;
    if (a === "frq") {
      if ((U.friends || []).includes(t)) return J({ error: "Ihr seid schon befreundet" }, 400);
      if ((U.blocked || []).includes(t)) return J({ error: "Du hast diesen Nutzer blockiert – erst entsperren" }, 400);
      if ((T.blocked || []).includes(me)) return J({ error: "Anfrage konnte nicht gesendet werden" }, 403);
      if ((U.fout || []).includes(t)) return J({ error: "Anfrage wurde schon gesendet" }, 400);
      if ((U.fout || []).length >= 100) return J({ error: "Zu viele offene Anfragen" }, 429);
      if ((U.fin || []).includes(t)) { accept(); auto = true; }
      else { U.fout = uniq(U.fout, t); T.fin = uniq(T.fin, me); }
    } else if (a === "fac") {
      if (!(U.fin || []).includes(t)) return J({ error: "Keine Anfrage von diesem Nutzer" }, 400);
      accept();
    } else if (a === "fdec") { U.fin = wo(U.fin, t); U.fout = wo(U.fout, t); T.fin = wo(T.fin, me); T.fout = wo(T.fout, me); }
    else { U.friends = wo(U.friends, t); T.friends = wo(T.friends, me); }
    await Promise.all([put("u/" + me, U), put("u/" + t, T)]);
    if (a === "frq" && !auto && T.pst !== "dnd") await sendPush(st, t, { k: "friend", u: me, ch: "", tx: "hat dir eine Freundschaftsanfrage geschickt", i: "fr" + Date.now(), t: Date.now() });
    return J({ ...relOut(), auto });
  }
  if (a === "export") return J({ ...U, h: undefined, salt: undefined, tfa: undefined, tmp: undefined });
  if (a === "discover") {
    const all = await Promise.all((await st.list({ prefix: "s/" })).blobs.map((x) => get(x.key, null)));
    return J(all.filter((sv) => sv && sv.public).map((sv) => ({ id: sv.id, name: sv.name, n: sv.members.length, icon: sv.icon ? "/api?a=img&t=si&i=" + sv.id + "&v=" + (sv.iv || 0) : "" })));
  }
  if (a === "onb") {
    const sv = await get("s/" + b.srv, null);
    if (!sv || !sv.members.includes(me) || !sv.onb?.opts.includes(b.opt)) return J({ error: "ungültig" }, 400);
    (sv.roles ||= {})[me] = { n: b.opt, c: "#" + crypto.createHash("md5").update(b.opt).digest("hex").slice(0, 6) };
    await put("s/" + sv.id, sv);
    return J({ ok: 1 });
  }
  if (a === "up") {
    const f = String(b.fid || "").replace(/\W/g, "");
    if (f.length < 8 || !(+b.i >= 0) || +b.i > 400 || String(b.d || "").length > 4200000) return J({ error: "Upload ungültig" }, 400);
    await st.set(`f/${f}/${+b.i}`, b.d);
    return J({ ok: 1 });
  }
  if (a === "dl") {
    const d = await st.get(`f/${String(q.get("fid")).replace(/\W/g, "")}/${+q.get("i")}`);
    return d == null ? J({ error: "nf" }, 404) : J({ d });
  }
  if (a === "sprof") {
    const sv = await get("s/" + b.srv, null);
    if (!sv || !sv.members.includes(me)) return J({ error: "nf" }, 404);
    if ([b.avatar, b.banner].some((x) => x && x.length > 300000)) return J({ error: "Bild max. ~200 KB" }, 400);
    (sv.prof ||= {})[me] = { name: String(b.name || "").slice(0, 32), bio: String(b.bio || "").slice(0, 200), avatar: b.avatar || "", banner: b.banner || "", v: Date.now() };
    await put("s/" + sv.id, sv);
    return J({ ok: 1 });
  }
  if (a === "boost") {
    const sv = await get("s/" + b.srv, null);
    if (!sv || !sv.members.includes(me)) return J({ error: "nf" }, 404);
    sv.boosts = (sv.boosts || 0) + 1;
    await put("s/" + sv.id, sv);
    return J({ boosts: sv.boosts });
  }
  if (a === "mkhook") {
    const sv = !b.ch.startsWith("dm:") && (await get("s/" + b.ch.split("/")[0], null));
    if (!sv || sv.owner !== me) return J({ error: "Nur Server-Besitzer" }, 403);
    const k = crypto.randomBytes(16).toString("hex");
    await put("h/" + k, { ch: b.ch, name: String(b.name || "Webhook") });
    return J({ url: "/api?a=hook&k=" + k });
  }
  if (a === "ring") {
    const to = clean(b.to); const tu = to ? await get("u/" + to, null) : null;
    if (!to || !String(b.room).startsWith("dm:") || /^dm:g/.test(String(b.room)) || !tu || !(await allowed(b.room))) return J({ error: "forbidden" }, 403);
    await put("r/" + to, { from: me, room: b.room, t: Date.now() });
    if (tu.pst !== "dnd" && !(tu.blocked || []).includes(me)) await sendPush(st, to, { k: "call", u: me, ch: b.room, tx: "ruft dich an …", i: "ring" + Date.now(), t: Date.now() });
    return J({ ok: 1 });
  }
  if (a === "rings") { const r = await get("r/" + me, null); return J(r && Date.now() - r.t < 30000 ? r : {}); }
  if (a === "unring") { await st.delete("r/" + me); return J({ ok: 1 }); }
  if (a === "ringx") { const to = clean(b.to), r = await get("r/" + to, null); if (r && r.from === me) await st.delete("r/" + to); return J({ ok: 1 }); }
  if (a === "vlist") {
    const sv = await get("s/" + b.srv, null); if (!sv || !sv.members.includes(me)) return J({ error: "forbidden" }, 403);
    const o = {}, now = Date.now();
    for (const c of sv.channels.filter((c) => c.type === "voice")) { o[c.id] = []; for (const k of (await st.list({ prefix: `v/${sv.id}/${c.id}/` })).blobs) if (now - +(await st.get(k.key)) < 8000) o[c.id].push(k.key.split("/").pop()); }
    return J(o);
  }
  if (a === "vsync") {
    const room = b.room;
    if (!room || !(await allowed(room))) return J({ error: "forbidden" }, 403);
    if (!room.startsWith("dm:")) { const sv = await get("s/" + room.split("/")[0], null), c = sv?.channels.find((x) => x.id === (room.split("/")[1] || "").split("~")[0]); if (c?.type !== "voice" && c?.type !== "stage") return J({ error: "Anrufe gehen nur in Sprach- und Stage-Kanälen" }, 400); }
    const now = Date.now();
    await st.set(`v/${room}/${me}`, String(now));
    let i = 0;
    for (const o of (b.out || []).slice(0, 60)) await st.setJSON(`g/${room}/${clean(o.to)}/${now}${String(i++).padStart(3, "0")}${id()}`, { from: me, data: o.data });
    const users = [];
    for (const x of (await st.list({ prefix: `v/${room}/` })).blobs) {
      if (now - +(await st.get(x.key)) < 8000) users.push(x.key.split("/").pop()); else await st.delete(x.key);
    }
    const inbox = [];
    for (const x of (await st.list({ prefix: `g/${room}/${me}/` })).blobs.sort((p, q) => (p.key < q.key ? -1 : 1))) { inbox.push(await get(x.key)); await st.delete(x.key); }
    return J({ users, inbox });
  }
  if (a === "vleave") { await st.delete(`v/${b.room}/${me}`); return J({ ok: 1 }); }
  if (a === "mod") {
    const s = await get("s/" + b.srv);
    if (!s) return J({ error: "nf" }, 404);
    const own = s.owner === me;
    if (!own && !(s.mods || []).includes(me)) return J({ error: "Keine Rechte" }, 403);
    const t = clean(b.target), op = b.op, v = b.val; s.log ||= [];
    const lg = (x) => s.log.push({ t: Date.now(), u: me, x });
    const ch = () => s.channels.find((x) => x.id === clean(b.ch));
    const roleOf = (n) => Object.keys(s.roles || {}).filter((m) => s.roles[m].n === n);
    const PERMS = ["del", "kick", "ban", "timeout", "roles", "channels"];
    const need = { kick: "kick", ban: "ban", timeout: "timeout", role: "roles", rmrole: "roles", delrole: "roles", reorder: "channels", chname: "channels", cat: "channels", mkcat: "channels", rencat: "channels", delcat: "channels", delch: "channels" };
    if (!own && need[op] && s.perms?.[need[op]] === false) return J({ error: "Diese Berechtigung wurde dir vom Besitzer entzogen" }, 403);
    if (["kick", "ban", "timeout"].includes(op)) {
      if (t === s.owner || !s.members.includes(t)) return J({ error: "Ungültiges Ziel" }, 400);
      if (!own && (s.mods || []).includes(t)) return J({ error: "Mods können keine Mods bestrafen" }, 403);
      if (op === "timeout") (s.to ||= {})[t] = Date.now() + 60000 * Math.min(40320, +v || 10);
      else {
        s.members = wo(s.members, t); s.mods = wo(s.mods, t); if (s.roles) delete s.roles[t];
        const tu = await get("u/" + t, null); if (tu) { tu.servers = wo(tu.servers, s.id); await put("u/" + t, tu); }
        if (op === "ban") s.bans = uniq(s.bans, t);
      }
      lg(op + " " + t);
    } else if (op === "unban") { s.bans = wo(s.bans, t); lg("unban " + t); }
    else if (op === "untimeout") { if (s.to) delete s.to[t]; lg("timeout aufgehoben " + t); }
    else if (!own) return J({ error: "Nur Besitzer" }, 403);
    else if (op === "mod") { if (t === s.owner || !s.members.includes(t)) return J({ error: "Ungültiges Ziel" }, 400); s.mods = (s.mods || []).includes(t) ? wo(s.mods, t) : [...(s.mods || []), t]; lg("mod " + t); }
    else if (op === "transfer") { if (t === me || !s.members.includes(t)) return J({ error: "Ungültiges Ziel" }, 400); s.owner = t; s.mods = wo(s.mods, t); lg("besitz an " + t + " übertragen"); }
    else if (op === "rename") { const n = String(v || "").trim().slice(0, 40); if (!n) return J({ error: "Name fehlt" }, 400); s.name = n; lg("server umbenannt: " + n); }
    else if (op === "icon") { if (!b.data) { delete s.icon; } else { if (!/^data:image\//.test(b.data) || b.data.length > 150000) return J({ error: "Icon zu groß (max ~100 KB)" }, 400); s.icon = b.data; } s.iv = Date.now(); lg("server-icon"); }
    else if (op === "slow") { (s.slow ||= {})[clean(b.ch)] = Math.min(21600, +v || 0); lg("slowmode " + b.ch + " " + v + "s"); }
    else if (op === "words") { s.words = String(v).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean); lg("automod aktualisiert"); }
    else if (op === "role") { if (!s.members.includes(t)) return J({ error: "Ungültiges Ziel" }, 400); (s.roles ||= {})[t] = { n: String(b.n || "").slice(0, 20), c: /^#[0-9a-f]{6}$/i.test(b.c) ? b.c : "#7b6cff" }; lg("rolle " + t); }
    else if (op === "rmrole") { if (s.roles) delete s.roles[t]; lg("rolle entfernt " + t); }
    else if (op === "delrole") { for (const m of roleOf(String(v))) delete s.roles[m]; lg("rolle gelöscht " + v); }
    else if (op === "cmd") { const [n, ...r] = String(v).split("="); (s.cmds ||= {})[clean(n)] = r.join("=").slice(0, 500); lg("command /" + n); }
    else if (op === "delcmd") { if (s.cmds) delete s.cmds[clean(v)]; lg("command gelöscht /" + v); }
    else if (op === "emoji") { if (!b.data || b.data.length > 150000) return J({ error: "Bild zu groß (max 100 KB)" }, 400); (s.emoji ||= {})[clean(v)] = b.data; lg("emoji " + v); }
    else if (op === "delemoji") { if (s.emoji) delete s.emoji[clean(v)]; lg("emoji gelöscht " + v); }
    else if (op === "sound") { if (!b.data || b.data.length > 250000) return J({ error: "Audio zu groß (max ~180 KB)" }, 400); (s.sounds ||= {})[clean(v)] = b.data; lg("sound " + v); }
    else if (op === "delsound") { if (s.sounds) delete s.sounds[clean(v)]; lg("sound gelöscht " + v); }
    else if (op === "minage") { s.minage = Math.max(0, +v || 0); lg("verifizierung " + s.minage + " min"); }
    else if (op === "raid") { s.raid = !s.raid; s.lock = 0; lg("raid-schutz " + s.raid); }
    else if (op === "onboarding") { const [qq, os] = String(v).split("|"); s.onb = qq ? { q: qq.slice(0, 100), opts: String(os || "").split(",").map((x) => x.trim().slice(0, 20)).filter(Boolean).slice(0, 8) } : null; lg("onboarding"); }
    else if (op === "chperm") {
      const c = ch(); if (!c) return J({ error: "Kanal nicht gefunden" }, 400);
      const [k, w] = String(v).split(":"); if (["view", "write"].includes(k)) c[k] = !w || w === "all" ? undefined : w.slice(0, 20);
      lg("rechte " + c.id);
    }
    else if (op === "nsfw") { const c = ch(); if (!c) return J({ error: "Kanal nicht gefunden" }, 400); c.nsfw = !c.nsfw; lg("nsfw " + c.id); }
    else if (op === "cat") { const c = ch(); if (!c) return J({ error: "Kanal nicht gefunden" }, 400); c.cat = String(v || "").slice(0, 20); if (c.cat && !(s.cats || []).includes(c.cat)) (s.cats ||= []).push(c.cat); lg("kategorie " + c.id); }
    else if (op === "chname") { const c = ch(); if (!c) return J({ error: "Kanal nicht gefunden" }, 400); c.name = String(v || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_\-äöüß]/g, "").slice(0, 30) || c.name; lg("kanal umbenannt " + c.id); }
    else if (op === "delch") {
      const c = ch(); if (!c) return J({ error: "Kanal nicht gefunden" }, 400);
      if (s.channels.length <= 1) return J({ error: "Mindestens ein Kanal muss bleiben" }, 400);
      s.channels = s.channels.filter((x) => x !== c);
      const { blobs } = await st.list({ prefix: `m/${s.id}/${c.id}` });
      await Promise.all(blobs.filter((k) => k.key === `m/${s.id}/${c.id}` || k.key.startsWith(`m/${s.id}/${c.id}~`)).map((k) => st.delete(k.key)));
      lg("kanal gelöscht " + c.id);
    }
    else if (op === "mkcat") { const n = String(v || "").trim().slice(0, 20); if (!n) return J({ error: "Name fehlt" }, 400); if ((s.cats || []).length >= 30) return J({ error: "Max. 30 Kategorien" }, 400); s.cats = uniq(s.cats, n); lg("kategorie erstellt " + n); }
    else if (op === "rencat") { const n = String(b.n || "").trim().slice(0, 20); if (!n) return J({ error: "Name fehlt" }, 400); s.cats = uniq(wo(s.cats, v), n); s.channels.forEach((c) => { if (c.cat === v) c.cat = n; }); lg("kategorie " + v + " → " + n); }
    else if (op === "delcat") { s.cats = wo(s.cats, v); s.channels.forEach((c) => { if (c.cat === v) c.cat = ""; }); lg("kategorie gelöscht " + v); }
    else if (op === "event") { const [t0, w] = String(v).split("|"); if (!t0.trim()) return J({ error: "Titel fehlt" }, 400); (s.events ||= []).push({ title: t0.slice(0, 60), time: w || "" }); s.events = s.events.slice(-20); lg("event " + t0); }
    else if (op === "delevent") { (s.events ||= []).splice(+v, 1); lg("event gelöscht"); }
    else if (op === "public") { s.public = !s.public; lg("öffentlich: " + s.public); }
    else if (op === "perm") {
      if (!own) return J({ error: "Nur der Besitzer kann Berechtigungen ändern" }, 403);
      const k = String(v); if (!PERMS.includes(k)) return J({ error: "Unbekannte Berechtigung" }, 400);
      (s.perms ||= {})[k] = s.perms[k] === false; lg("berechtigung " + k + ": " + (s.perms[k] !== false));
    }
    else if (op === "reorder") {
      const order = String(v || "").split(",").map(clean).filter(Boolean), idx = (c) => { const i = order.indexOf(c.id); return i < 0 ? 9999 : i; };
      s.channels = s.channels.map((c, i) => [c, i]).sort((x, y) => idx(x[0]) - idx(y[0]) || x[1] - y[1]).map((x) => x[0]);
      if (b.ch && typeof b.cat === "string") { const c = ch(); if (c) { const nc = b.cat.trim().slice(0, 20); if (nc) { c.cat = nc; if (!(s.cats || []).includes(nc)) (s.cats ||= []).push(nc); } else delete c.cat; } }
      lg("kanäle neu sortiert");
    }
    else if (op === "welcome") { s.welcome = String(v).slice(0, 300); lg("willkommenstext"); }
    else return J({ error: "Unbekannte Aktion" }, 400);
    s.log = s.log.slice(-100);
    await put("s/" + s.id, s);
    return J(srvPub(s));
  }
  if (a === "inbox") {
    const since = +q.get("since") || 0;
    const rg = await get("r/" + me, null), ring = rg && Date.now() - rg.t < 30000 ? rg : null, dnd = U.pst === "dnd";
    if (!since) return J({ now: Date.now(), items: [], ring, dnd, fin: U.fin || [] });
    return J({ now: Date.now(), items: (await get("n/" + me, [])).filter((x) => x.t >= since), ring, dnd, fin: U.fin || [] });
  }
  if (a === "pushkey") return J({ key: (await vapid(st)).publicKey });
  if (a === "pushsub") {
    const sub = b.sub;
    if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return J({ error: "Ungültiges Abo" }, 400);
    const list = ((await get("ps/" + me, [])) || []).filter((x) => x.endpoint !== sub.endpoint);
    list.push({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }, mu: (Array.isArray(b.mu) ? b.mu : []).slice(0, 100).map((x) => String(x).slice(0, 40)), t: Date.now() });
    await put("ps/" + me, list.slice(-5));
    return J({ ok: 1 });
  }
  if (a === "pushunsub") { await put("ps/" + me, ((await get("ps/" + me, [])) || []).filter((x) => x.endpoint !== b.endpoint)); return J({ ok: 1 }); }
  if (a === "msgs") {
    const ch = q.get("ch");
    if (!(await allowed(ch))) return J({ error: "forbidden" }, 403);
    return J(await get("m/" + ch, []));
  }
  if (["send", "edit", "del", "react", "pin", "vote"].includes(a)) {
    const ch = b.ch;
    if (!ch || !(await allowed(ch))) return J({ error: "forbidden" }, 403);
    let m = await get("m/" + ch, []);
    if (a === "send") {
      const text = String(b.text || "").slice(0, 4000);
      if (!text && !b.file && !b.poll) return J({ error: "leer" }, 400);
      let poll = null;
      if (b.poll) {
        const pq = String(b.poll.q || "").trim().slice(0, 200), po = (Array.isArray(b.poll.opts) ? b.poll.opts : []).map((x) => String(x || "").trim().slice(0, 80)).filter(Boolean).slice(0, 8);
        if (!pq || po.length < 2) return J({ error: "Umfrage braucht eine Frage und mindestens 2 Antworten" }, 400);
        const hrs = Math.min(720, Math.max(0.25, +b.poll.hours || 24));
        poll = { q: pq, opts: po.map((t) => ({ t, v: [] })), end: Date.now() + hrs * 3600000 };
      }
      if (ch.startsWith("dm:")) { const o = ch.split(":").slice(1).find((n) => n !== me), ou = o && (await get("u/" + o, null)); if (ou?.blocked?.includes(me)) return J({ error: "Du wurdest blockiert" }, 403);
        if (ou) { if (!(ou.dms || []).includes(me)) { (ou.dms ||= []).push(me); await put("u/" + o, ou); } if (!(U.dms || []).includes(o)) { (U.dms ||= []).push(o); await put("u/" + me, U); } } }
      if (!ch.startsWith("dm:")) {
        const [sid, cid] = ch.split("/"); const sv = await get("s/" + sid), now = Date.now();
        if (sv.bans?.includes(me)) return J({ error: "Gebannt" }, 403);
        if ((sv.to?.[me] || 0) > now) return J({ error: "Timeout aktiv" }, 403);
        { const ct = sv.channels.find((c) => c.id === cid.split("~")[0]); if ((ct?.type === "announce" || ct?.write === "mods") && sv.owner !== me && !(sv.mods || []).includes(me)) return J({ error: "Nur Mods dürfen hier posten" }, 403); }
        if (sv.owner !== me && !(sv.mods || []).includes(me)) {
          if ((sv.words || []).some((w) => text.toLowerCase().includes(w))) return J({ error: "AutoMod: Nachricht blockiert" }, 400);
          const sl = (sv.slow?.[cid] || 0) * 1000, lm = [...m].reverse().find((i) => i.u === me);
          if (sl && lm && now - lm.t < sl) return J({ error: "Slowmode aktiv" }, 429);
        }
      }
      const msg = { id: id(), u: me, t: Date.now(), text, reply: b.reply || null, file: b.file ? (b.file.fid ? { name: String(b.file.name).slice(0, 80), fid: String(b.file.fid).replace(/\W/g, ""), n: +b.file.n, size: +b.file.size, type: String(b.file.type).slice(0, 60) } : { name: String(b.file.name).slice(0, 80), data: String(b.file.data).slice(0, 4000000) }) : null, react: {}, pin: false };
      if (poll) msg.poll = poll;
      m.push(msg);
      const sv2 = await get("s/" + ch.split("/")[0], null);
      if (sv2 && !ch.startsWith("dm:")) { const dk = new Date().toISOString().slice(0, 10), c2 = ch.split("/")[1].split("~")[0], stt = (sv2.stats ||= { d: {}, c: {} }); stt.d[dk] = (stt.d[dk] || 0) + 1; stt.c[c2] = (stt.c[c2] || 0) + 1; await put("s/" + sv2.id, sv2); }
      const cm = text.startsWith("/") && sv2?.cmds?.[text.slice(1).split(" ")[0]];
      if (cm) m.push({ id: id(), u: "🤖 Bot", t: Date.now(), text: cm, reply: null, file: null, react: {}, pin: false });
      // --- Benachrichtigungen: DM, @name, @everyone/@here, Antwort -> Inbox der Empfänger (Popups im Client) ---
      try {
        const tg = new Map(), add = (u, k) => { if (u && u !== me && !tg.has(u)) tg.set(u, k); };
        let sname = "", cname = "";
        const names = new Set([...text.matchAll(/(?:^|[^\w@/.:=-])@(\w+)/g)].map((x) => x[1].toLowerCase()));
        if (ch.startsWith("dm:g")) { const gg = await get("g/" + ch.slice(4), null); (gg?.members || []).forEach((n) => add(n, "dm")); sname = gg?.name || ""; }
        else if (ch.startsWith("dm:")) ch.split(":").slice(1).forEach((n) => add(n, "dm"));
        else if (sv2) {
          const cid = ch.split("/")[1].split("~")[0], ct = sv2.channels.find((c) => c.id === cid);
          sname = sv2.name; cname = ct?.name || cid;
          const see = (u) => !ct?.view || sv2.owner === u || (sv2.mods || []).includes(u) || (ct.view !== "mods" && sv2.roles?.[u]?.n === ct.view);
          names.forEach((n) => { if (n !== "everyone" && n !== "here" && sv2.members.includes(n) && see(n)) add(n, "mention"); });
          const rp = b.reply && m.find((i) => i.id === b.reply); if (rp && sv2.members.includes(rp.u) && see(rp.u)) add(rp.u, "reply");
          if (names.has("everyone") || names.has("here")) sv2.members.filter(see).forEach((u) => add(u, names.has("everyone") ? "everyone" : "here"));
        }
        const item = { i: msg.id, t: msg.t, ch, u: me, k: "", tx: (text || (msg.file ? "📎 " + msg.file.name : "")).slice(0, 160), s: sname, c: cname };
        await Promise.all([...tg].slice(0, 150).map(async ([t, k]) => {
          const tu = await get("u/" + t, null);
          if (!tu || tu.blocked?.includes(me)) return;
          if (k === "here" && (tu.pst === "invisible" || Date.now() - (tu.seen || 0) > 90000)) return;
          const ib = await get("n/" + t, []), it = { ...item, k: k === "here" ? "everyone" : k };
          ib.push(it);
          await Promise.all([put("n/" + t, ib.slice(-30)), tu.pst === "dnd" ? null : sendPush(st, t, it)]);
        }));
      } catch (e) { /* Benachrichtigungen dürfen das Senden nie blockieren */ }
      m = m.slice(-200);
    } else {
      const x = m.find((i) => i.id === b.id);
      if (!x) return J({ error: "nf" }, 404);
      if (a === "edit" && x.u === me) { x.text = String(b.text).slice(0, 4000); x.edited = true; }
      if (a === "del") {
        let okDel = x.u === me;
        if (!okDel && !ch.startsWith("dm:")) { const sv3 = await get("s/" + ch.split("/")[0], null); okDel = !!sv3 && (sv3.owner === me || ((sv3.mods || []).includes(me) && sv3.perms?.del !== false)); }
        if (!okDel) return J({ error: "Keine Rechte zum Löschen" }, 403);
        m = m.filter((i) => i !== x);
      }
      if (a === "vote") {
        if (!x.poll) return J({ error: "Keine Umfrage" }, 400);
        if (Date.now() > x.poll.end) return J({ error: "Umfrage ist beendet" }, 400);
        const oi = +b.i; if (!(oi >= 0 && oi < x.poll.opts.length)) return J({ error: "Ungültige Antwort" }, 400);
        const had = x.poll.opts[oi].v.includes(me);
        x.poll.opts.forEach((o) => { o.v = wo(o.v, me); });
        if (!had) x.poll.opts[oi].v.push(me);
      }
      if (a === "pin") x.pin = !x.pin;
      if (a === "react") {
        const l = (x.react[b.emoji] ||= []);
        x.react[b.emoji] = l.includes(me) ? l.filter((n) => n !== me) : [...l, me];
        if (!x.react[b.emoji].length) delete x.react[b.emoji];
      }
    }
    await put("m/" + ch, m);
    return J({ ok: 1 });
  }
  return J({ error: "?" }, 404);
};
