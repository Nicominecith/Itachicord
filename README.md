# Itachicord auf Netlify

1. Ordner auf GitHub pushen -> Netlify: "Add new site > Import from Git" (Build-Einstellungen kommen aus netlify.toml). Alternativ: `npx netlify-cli deploy --prod`.
2. Netlify Blobs braucht keine Einrichtung.
3. Optional (Konten-Verknüpfung): Site settings > Environment variables:
   OAUTH_GITHUB_ID / _SECRET, OAUTH_SPOTIFY_ID / _SECRET, OAUTH_TWITCH_ID / _SECRET, OAUTH_REDDIT_ID / _SECRET, OAUTH_YOUTUBE_ID / _SECRET (Google), STEAM_KEY (optional, für den Steam-Namen).
   Redirect-URL beim jeweiligen Anbieter: https://DEINE-SEITE.netlify.app/api?a=cb&p=github (p = spotify, twitch, reddit, youtube). Steam braucht keine Registrierung.
4. Desktop: `cd desktop && npm i && ITACHICORD_URL=https://DEINE-SEITE.netlify.app npm start`
5. Handy-App: `cd mobile`, URL in capacitor.config.json eintragen, dann `npm i @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios && npx cap add android`.
