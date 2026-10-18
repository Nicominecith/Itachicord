# Itachicord auf Netlify

1. Ordner auf GitHub pushen -> Netlify: "Add new site > Import from Git" (Build-Einstellungen kommen aus netlify.toml). Alternativ: `npx netlify-cli deploy --prod`.
2. Netlify Blobs braucht keine Einrichtung.
3. Optional (Konten-Verknüpfung): Site settings > Environment variables:
   OAUTH_GITHUB_ID / _SECRET, OAUTH_SPOTIFY_ID / _SECRET, OAUTH_TWITCH_ID / _SECRET, OAUTH_REDDIT_ID / _SECRET, OAUTH_YOUTUBE_ID / _SECRET (Google), STEAM_KEY (optional, für den Steam-Namen).
   Redirect-URL beim jeweiligen Anbieter: https://DEINE-SEITE.netlify.app/api?a=cb&p=github (p = spotify, twitch, reddit, youtube). Steam braucht keine Registrierung.
4. Desktop: `cd desktop && npm i && ITACHICORD_URL=https://DEINE-SEITE.netlify.app npm start`
5. Handy-App: `cd mobile`, URL in capacitor.config.json eintragen, dann `npm i @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios && npx cap add android`.

## GIFs (GIPHY)
Key auf https://developers.giphy.com holen (App erstellen > API) und in Netlify als Environment variable `GIPHY_KEY` eintragen, danach neu deployen. Der Key bleibt serverseitig (netlify/functions/giphy.mjs).

## E-Mails über Gmail (Passwort-Reset)
1. Beim Google-Konto die 2-Schritt-Bestätigung aktivieren (myaccount.google.com > Sicherheit).
2. Dort "App-Passwörter" öffnen, ein App-Passwort erstellen (16 Zeichen).
3. In Netlify > Environment variables: `GMAIL_USER` = deine Gmail-Adresse, `GMAIL_APP_PASS` = das App-Passwort. Danach neu deployen.
Nutzer können beim Registrieren oder im Profil (📧 E-Mail) eine Adresse hinterlegen; "Passwort vergessen?" schickt einen 6-stelligen Code (15 Min. gültig, 1 Mail/Minute, max. 5 Versuche).

## Neu: Freundschaftsanfragen, Servermenü & Servereinstellungen
- **Freunde wie bei Discord:** Freund hinzufügen sendet nur eine *Anfrage*. Erst wenn die Person annimmt, seid ihr befreundet. Startseite = Freunde-Seite mit Tabs *Online / Alle / Ausstehend / Blockiert / Freund hinzufügen*, Badge bei neuen Anfragen und Benachrichtigung. Gegenseitige Anfragen werden automatisch angenommen; Blockieren entfernt Freundschaft und Anfragen.
- **Servermenü:** Klick auf den Servernamen oben in der Seitenleiste öffnet das Menü (Einladen, Servereinstellungen, Kanal/Kategorie/Event erstellen, Server-Profil, stummschalten, Boost, Insights, Verlassen/Löschen).
- **Servereinstellungen** mit Unterkategorien: Übersicht (Name, Icon, Willkommenstext, öffentlich), Kanäle (Kategorie, Slowmode, Sichtbarkeit, Schreibrechte, NSFW, umbenennen, löschen), Kategorien, Rollen, Mitglieder (Mod, Timeout, Kick, Bann, Besitz übertragen), Einladungen (Link `/?join=ID`), Bans & Timeouts, Onboarding, Emojis, Soundboard, Events, Befehle, Integrationen (Webhooks), Moderation & AutoMod, Audit-Log, Insights, Boost, Server verlassen/löschen.
- **Schneller laden:** Bilder (Avatare, Banner, Server-Icons) kommen nicht mehr als Base64 in jeder Antwort, sondern als cache-bare Bilddateien (`/api?a=img`); `me`/`users` laufen parallel und werden schon im `<head>` vorgeladen; Server-Antworten werden parallel gelesen; nach Änderungen wird nur noch das Nötige neu geladen; Service Worker mit Cache für Shell und Bilder.

## Neu: Sounds, @Erwähnungen, Discord-Popups, bessere Handy-/Tablet-Oberfläche
- **Sounds (`public/sounds/`):** `join.mp3` (Sprachkanal beitreten), `leave.mp3` (verlassen), `call.mp3` (Anruf-Klingelton, läuft in Schleife bis angenommen/abgelehnt), `notification.mp3` (neue Nachricht, Erwähnung, DM, Freundschaftsanfrage). Mikro an/aus, Senden, Fehler und Kamera nutzen weiterhin kurze Synth-Töne (dafür gab es keine Dateien). Ton aus: `localStorage.sfx="0"`; bei „Nicht stören“ bleibt alles stumm.
- **@Erwähnungen:** `@benutzername` und `@everyone` / `@here` (nur Online-Mitglieder). Beim Tippen von `@` erscheint wie bei Discord eine Vorschlagsliste (Pfeiltasten/Tab/Enter oder antippen). Erwähnungen sind farbig markiert, Nachrichten an dich bekommen einen orangen Balken, ein Klick auf `@name` öffnet das Profil. Gepingt werden auch Leute, denen du antwortest. In Kanälen mit eingeschränkter Sichtbarkeit werden nur berechtigte Mitglieder benachrichtigt.
- **Popups wie bei Discord:** DMs, Erwähnungen, Antworten und Freundschaftsanfragen poppen als Karte auf (Desktop: unten rechts, Handy/Tablet: oben als Banner, 6 s mit Fortschrittsbalken, Hover/Halten pausiert, Klick öffnet den Chat, Wischen schließt). Zusätzlich rote Badges an Server-Icons, DMs und Kanälen sowie `(3)` im Tab-Titel. Ist die App im Hintergrund, kommt eine Systembenachrichtigung (Klick öffnet den richtigen Chat). Server-seitig landen die Ereignisse im Postfach `n/<nutzer>` (`/api?a=inbox`), der Client fragt alle 3 s ab.
- **Handy/Tablet:** Wisch vom linken Rand öffnet das Menü (Scrim zum Antippen-zum-Schließen funktioniert jetzt), Tastatur schiebt das Eingabefeld auf iOS nicht mehr weg, beim Tippen klappen „+“ und GIF ein, größere Touch-Flächen, Tablet hochkant nutzt das Drawer-Layout mit zentrierter Chat-Spalte.
- **Grenze:** Systembenachrichtigungen kommen, solange die App/der Tab läuft (auch im Hintergrund). Bei komplett geschlossener App bräuchte es Web-Push (VAPID-Schlüssel + `web-push`) – das ist nicht eingebaut.

## Neu (v4): Logo, Management, Bann, Nutzer-ID, Hintergrundbild
- **Logo/Icons:** Neues App-Logo (`public/logo.png`, `icon-192/512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, Favicons). Es gibt keine SVG-Grafiken mehr; das Sharingan-Zeichen (`sharingan.png`) ist als zweites App-Icon wählbar. Splash/Ladebildschirm und Anmeldefenster zeigen das Logo. Desktop: `desktop/icon.png`. Handy (Capacitor): `mobile/assets/icon-only.png` + `splash.png` → `npx @capacitor/assets generate`.
- **Nutzer-ID:** Jeder hat eine feste 18-stellige ID. Zu sehen im Profil (Klick oder Rechtsklick = kopieren). Rechtsklick (am Handy: lange drücken) auf Avatar/Namen öffnet ein Menü: ID kopieren, Name kopieren, Profil, Nachricht.
- **Management (`/management.html`):** Nur für Admins. Konten suchen (Name, ID, E-Mail), **bannen/entbannen** (Gebannte können nur noch lesen: keine Nachrichten, keine Server erstellen/beitreten, keine Änderungen) und **Konten löschen** (inkl. eigener Server). Admin ist standardmäßig das Konto `nicominecith`; weitere Admins über die Netlify-Variable `ADMIN_USERS` (Namen, Komma-getrennt). Admins sehen im Profil den Knopf „Management öffnen“.
- **Hintergrundbild:** Profil/Einstellungen → Hintergrundbild (wird pro Gerät gespeichert, Abdunkeln einstellbar).
- **Call:** Auf ein Video klicken = vergrößern (Esc/Klick schließt), Doppelklick oder ⛶ = Vollbild.
- **Nicht stören:** Keine Töne mehr (auch Join/Leave/Senden), keine Popups, keine Anrufe.
