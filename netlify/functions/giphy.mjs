// GIPHY-Proxy: der API-Key bleibt geheim (Netlify > Environment variables > GIPHY_KEY)
const J = (d, c = 200) => new Response(JSON.stringify(d), { status: c, headers: { "content-type": "application/json", "cache-control": "public, max-age=300" } });
export default async (req) => {
  const key = process.env.GIPHY_KEY;
  if (!key) return J({ error: "GIPHY_KEY fehlt (Netlify > Site settings > Environment variables)" }, 500);
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  const u = new URL("https://api.giphy.com/v1/gifs/" + (q ? "search" : "trending"));
  u.searchParams.set("api_key", key);
  u.searchParams.set("limit", "30");
  u.searchParams.set("rating", "pg-13");
  u.searchParams.set("lang", "de");
  if (q) u.searchParams.set("q", q);
  try {
    const r = await fetch(u);
    if (!r.ok) return J({ error: "GIPHY " + r.status }, 502);
    const d = await r.json();
    return J((d.data || []).map(g => ({ id: g.id, p: (g.images.fixed_width_small || g.images.fixed_width).url })));
  } catch (e) {
    return J({ error: "GIPHY nicht erreichbar" }, 502);
  }
};
export const config = { path: "/giphy" };
