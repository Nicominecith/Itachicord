# Itachicord auf Netlify

1. Ordner auf GitHub pushen -> Netlify: "Add new site > Import from Git" (Build-Einstellungen kommen aus netlify.toml). Alternativ: `npx netlify-cli deploy --prod`.
2. Netlify Blobs braucht keine Einrichtung.
3. Optional (Konten-Verknüpfung): Site settings > Environment variables:
   OAUTH_GITHUB_ID / _SECRET, OAUTH_SPOTIFY_ID / _SECRET, OAUTH_TWITCH_ID / _SECRET, OAUTH_REDDIT_ID / _SECRET, OAUTH_YOUTUBE_ID / _SECRET (Google), STEAM_KEY (optional, für den Steam-Namen).
   Redirect-URL beim jeweiligen Anbieter: https://DEINE-SEITE.netlify.app/api?a=cb&p=github (p = spotify, twitch, reddit, youtube). Steam braucht keine Registrierung.
4. Desktop: `cd desktop && npm i && ITACHICORD_URL=https://DEINE-SEITE.netlify.app npm start`
5. Handy-App: `cd mobile`, URL in capacitor.config.json eintragen, dann `npm i @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios && npx cap add android`.

## GIFs (GIPHY)
Key kostenlos auf https://developers.giphy.com holen (App erstellen > API) und in Netlify als Environment variable `GIPHY_KEY` eintragen, danach neu deployen. Der Key bleibt serverseitig (netlify/functions/giphy.mjs).

## E-Mails über Gmail (Passwort-Reset)
1. Beim Google-Konto die 2-Schritt-Bestätigung aktivieren (myaccount.google.com > Sicherheit).
2. Dort "App-Passwörter" öffnen, ein App-Passwort erstellen (16 Zeichen).
3. In Netlify > Environment variables: `GMAIL_USER` = deine Gmail-Adresse, `GMAIL_APP_PASS` = das App-Passwort. Danach neu deployen.
Nutzer können beim Registrieren oder im Profil (📧 E-Mail) eine Adresse hinterlegen; "Passwort vergessen?" schickt einen 6-stelligen Code (15 Min. gültig, 1 Mail/Minute, max. 5 Versuche).
