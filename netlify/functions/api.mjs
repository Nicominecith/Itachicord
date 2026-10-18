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
// Gmail-SMTP: Netlify env GMAIL_USER (deine Gmail-Adresse) + GMAIL_APP_PASS (16-stelliges App-Passwort)
const mailOn = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
const mail = async (to, subject, text) => {
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS.replace(/\s/g, "") } });
  await t.sendMail({ from: `Itachicord <${process.env.GMAIL_USER}>`, to, subject, text });
};
const okMail = (e) => e.length <= 120 && /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(e);
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
    await put("u/" + n, { name: n, salt, h: hash(b.pass, salt), status: "", bio: "", email: em, color: "#c8102e", avatar: "", banner: "", created: Date.now(), servers: [] });
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
      try { await mail(u.email, "Itachicord – Passwort zurücksetzen", `Hallo ${n},\n\ndein Code zum Zurücksetzen: ${code}\n\nEr ist 15 Minuten gültig. Warst du das nicht, ignoriere diese Mail einfach.`); } catch (e) { console.error("mail", e.message); }
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
    const hd = { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": "itachicord/1.0" };
    if (o.basic) hd.authorization = "Basic " + Buffer.from(cid + ":" + sec).toString("base64"); else { body.set("client_id", cid); body.set("client_secret", sec); }
    const tk = await (await fetch(o.tok, { method: "POST", headers: hd, body })).json();
    const mh = { authorization: "Bearer " + tk.access_token, "user-agent": "itachicord/1.0", accept: "application/json" };
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
    else if (t === "pa" || t === "pb") { const p = (await get("s/" + i, null))?.prof?.[n]; d = p && (t === "pa" ? p.avatar : p.banner); }
    const m = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(d || "");
    if (!m) return new Response("", { status: 404, headers: { "cache-control": "public, max-age=60" } });
    return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
  }
  const me = await get("t/" + (req.headers.get("x-token") || "x"), null);
  if (!me) return J({ error: "auth" }, 401);
  const U = await get("u/" + me);
  if (U && Date.now() - (U.seen || 0) > 30000) { U.seen = Date.now(); await put("u/" + me, U); }

  const allowed = async (ch) => {
    if (ch.startsWith("dm:")) return ch.split(":").slice(1).includes(me);
    const s = await get("s/" + ch.split("/")[0]);
    if (!s || !s.members.includes(me)) return false;
    const c = s.channels.find((x) => x.id === (ch.split("/")[1] || "").split("~")[0]);
    if (c?.view && s.owner !== me && !(s.mods || []).includes(me) && !(c.view !== "mods" && s.roles?.[me]?.n === c.view)) return false;
    return true;
  };
  const pub = (u) => ({ name: u.name, status: u.status, activity: u.activity, pron: u.pron, dstyle: u.dstyle, links: u.links, conn: u.conn, created: u.created, bio: u.bio, color: u.color, hasav: !!u.avatar, avvid: !!u.avatar?.startsWith("data:video"), hasbn: !!u.banner, imv: u.imv || 0 });
  const srvPub = (s) => {
    const o = { ...s, icon: undefined, hasicon: !!s.icon };
    if (s.prof) { o.prof = {}; for (const [k, p] of Object.entries(s.prof)) o.prof[k] = { name: p.name, bio: p.bio, hasav: !!p.avatar, hasbn: !!p.banner, avvid: !!p.avatar?.startsWith("data:video"), v: p.v || 0 }; }
    return o;
  };
  const relOut = () => ({ friends: U.friends || [], fin: U.fin || [], fout: U.fout || [], blocked: U.blocked || [] });
  const uniq = (l, x) => (l || []).includes(x) ? l : [...(l || []), x];
  const wo = (l, x) => (l || []).filter((y) => y !== x);

  if (a === "me") {
    const servers = (await Promise.all(U.servers.map((sid) => get("s/" + sid, null)))).filter(Boolean).map(srvPub);
    return J({ me: { ...pub(U), email: U.email || "", tfa: !!U.tfa, pst: U.pst || "online", dms: U.dms || [], ...relOut(), entrance: U.entrance }, servers });
  }
  if (a === "users") {
    const { blobs } = await st.list({ prefix: "u/" });
    const out = (await Promise.all(blobs.map((x) => get(x.key, null)))).filter(Boolean).map((u) => ({ ...pub(u), pres: u.pst === "invisible" || Date.now() - (u.seen || 0) > 90000 ? "offline" : u.pst || "online" }));
    return J(out);
  }
  if (a === "profile") {
    for (const k of ["status", "activity", "pron", "dstyle", "entrance", "conn", "bio", "color", "avatar", "banner"]) if (typeof b[k] === "string") U[k] = b[k].slice(0, k === "entrance" || !["avatar", "banner"].includes(k) ? 700000 : 4500000);
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
    if (b.op === "gen") { U.tmp = Array.from(crypto.randomBytes(16), (x) => B32[x % 32]).join(""); await put("u/" + me, U); return J({ secret: U.tmp, uri: `otpauth://totp/Itachicord:${me}?secret=${U.tmp}&issuer=Itachicord` }); }
    if (b.op === "on" && U.tmp && okTotp(U.tmp, b.code)) { U.tfa = U.tmp; delete U.tmp; await put("u/" + me, U); return J({ ok: 1 }); }
    if (b.op === "off" && U.tfa && okTotp(U.tfa, b.code)) { delete U.tfa; await put("u/" + me, U); return J({ ok: 1 }); }
    return J({ error: "Code falsch" }, 400);
  }
  if (a === "pst") { if (["online", "dnd", "invisible"].includes(b.v)) { U.pst = b.v; U.seen = Date.now(); await put("u/" + me, U); } return J({ ok: 1 }); }
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
  if (a === "ring") { const to = clean(b.to); if (!to || !String(b.room).startsWith("dm:") || !(await allowed(b.room))) return J({ error: "forbidden" }, 403); await put("r/" + to, { from: me, room: b.room, t: Date.now() }); return J({ ok: 1 }); }
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
    else if (op === "role") { if (!s.members.includes(t)) return J({ error: "Ungültiges Ziel" }, 400); (s.roles ||= {})[t] = { n: String(b.n || "").slice(0, 20), c: /^#[0-9a-f]{6}$/i.test(b.c) ? b.c : "#c8102e" }; lg("rolle " + t); }
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
    else if (op === "welcome") { s.welcome = String(v).slice(0, 300); lg("willkommenstext"); }
    else return J({ error: "Unbekannte Aktion" }, 400);
    s.log = s.log.slice(-100);
    await put("s/" + s.id, s);
    return J(srvPub(s));
  }
  if (a === "msgs") {
    const ch = q.get("ch");
    if (!(await allowed(ch))) return J({ error: "forbidden" }, 403);
    return J(await get("m/" + ch, []));
  }
  if (["send", "edit", "del", "react", "pin"].includes(a)) {
    const ch = b.ch;
    if (!ch || !(await allowed(ch))) return J({ error: "forbidden" }, 403);
    let m = await get("m/" + ch, []);
    if (a === "send") {
      const text = String(b.text || "").slice(0, 4000);
      if (!text && !b.file) return J({ error: "leer" }, 400);
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
      m.push({ id: id(), u: me, t: Date.now(), text, reply: b.reply || null, file: b.file ? (b.file.fid ? { name: String(b.file.name).slice(0, 80), fid: String(b.file.fid).replace(/\W/g, ""), n: +b.file.n, size: +b.file.size, type: String(b.file.type).slice(0, 60) } : { name: String(b.file.name).slice(0, 80), data: String(b.file.data).slice(0, 4000000) }) : null, react: {}, pin: false });
      const sv2 = await get("s/" + ch.split("/")[0], null);
      if (sv2 && !ch.startsWith("dm:")) { const dk = new Date().toISOString().slice(0, 10), c2 = ch.split("/")[1].split("~")[0], stt = (sv2.stats ||= { d: {}, c: {} }); stt.d[dk] = (stt.d[dk] || 0) + 1; stt.c[c2] = (stt.c[c2] || 0) + 1; await put("s/" + sv2.id, sv2); }
      const cm = text.startsWith("/") && sv2?.cmds?.[text.slice(1).split(" ")[0]];
      if (cm) m.push({ id: id(), u: "🤖 Bot", t: Date.now(), text: cm, reply: null, file: null, react: {}, pin: false });
      m = m.slice(-200);
    } else {
      const x = m.find((i) => i.id === b.id);
      if (!x) return J({ error: "nf" }, 404);
      if (a === "edit" && x.u === me) { x.text = String(b.text).slice(0, 4000); x.edited = true; }
      if (a === "del" && x.u === me) m = m.filter((i) => i !== x);
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
