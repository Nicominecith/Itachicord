# Pulsecord auf Netlify

1. Ordner auf GitHub pushen -> Netlify: "Add new site > Import from Git" (Build-Einstellungen kommen aus netlify.toml). Alternativ: `npx netlify-cli deploy --prod`.
2. Netlify Blobs braucht keine Einrichtung.
3. Optional (Konten-Verknüpfung): Site settings > Environment variables:
   OAUTH_GITHUB_ID / _SECRET, OAUTH_SPOTIFY_ID / _SECRET, OAUTH_TWITCH_ID / _SECRET, OAUTH_REDDIT_ID / _SECRET, OAUTH_YOUTUBE_ID / _SECRET (Google), STEAM_KEY (optional, für den Steam-Namen).
   Redirect-URL beim jeweiligen Anbieter: https://pulsecords.netlify.app/api?a=cb&p=github (p = spotify, twitch, reddit, youtube). Steam braucht keine Registrierung.
4. Desktop: `cd desktop && npm i && PULSECORD_URL=https://pulsecords.netlify.app npm start`
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
- **Logo/Icons:** Neues App-Logo (`public/logo.png`, `icon-192/512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, Favicons). Es gibt keine SVG-Grafiken mehr; das Knoten-Emblem (`emblem.png`) ist als zweites App-Icon wählbar. Splash/Ladebildschirm und Anmeldefenster zeigen das Logo. Desktop: `desktop/icon.png`. Handy (Capacitor): `mobile/assets/icon-only.png` + `splash.png` → `npx @capacitor/assets generate`.
- **Nutzer-ID:** Jeder hat eine feste 18-stellige ID. Zu sehen im Profil (Klick oder Rechtsklick = kopieren). Rechtsklick (am Handy: lange drücken) auf Avatar/Namen öffnet ein Menü: ID kopieren, Name kopieren, Profil, Nachricht.
- **Management (`/management.html`):** Nur für Admins. Konten suchen (Name, ID, E-Mail), **bannen/entbannen** (Gebannte können nur noch lesen: keine Nachrichten, keine Server erstellen/beitreten, keine Änderungen) und **Konten löschen** (inkl. eigener Server). Admin ist standardmäßig das Konto `nicominecith`; weitere Admins über die Netlify-Variable `ADMIN_USERS` (Namen, Komma-getrennt). Admins sehen im Profil den Knopf „Management öffnen“.
- **Hintergrundbild:** Profil/Einstellungen → Hintergrundbild (wird pro Gerät gespeichert, Abdunkeln einstellbar).
- **Call:** Auf ein Video klicken = vergrößern (Esc/Klick schließt), Doppelklick oder ⛶ = Vollbild.
- **Nicht stören:** Keine Töne mehr (auch Join/Leave/Senden), keine Popups, keine Anrufe.

## Neu (v5): Fehlende Yapper-Features nachgerüstet
Datei `public/v5.js` (+ Erweiterungen in `netlify/functions/api.mjs`). Nach dem Deploy einmal hart neu laden (Service-Worker-Cache heißt jetzt `pulsecord-v6`).
- **Crop-Tool:** Beim Hochladen von Avatar, Banner, Server-Icon/-Banner und Gruppenbild öffnet sich ein Zuschnitt-Fenster (ziehen + zoomen). GIFs bleiben unverändert animiert (kein Zuschnitt, damit die Animation nicht verloren geht).
- **Anzeigenamen:** Profil → „Anzeigename“. Der @Benutzername bleibt eindeutig; der Anzeigename erscheint in Nachrichten, Profilkarte, Mitgliederliste, Gruppen.
- **Verifiziert-Haken (✔):** Admins setzen/entfernen ihn über die Profilkarte eines Nutzers („Verifizieren (Admin)“; API `adm_verify`).
- **Status „Abwesend“ (gelb):** manuell wählbar und automatisch nach 5 Min. ohne Aktivität.
- **Gruppenchats:** In der DM-Liste „Gruppe erstellen“ (3–10 Mitglieder, Name, Gruppenbild). Umbenennen, Bild ändern, Mitglieder hinzufügen, verlassen über ⚙ in der Kopfzeile.
- **„schreibt …“-Anzeige** in allen Chats (API `typing` / `tyl`).
- **Umfragen (📊):** mehrere Antworten, nur eine Stimme pro Person (Wechsel möglich), automatisches Ende (1 Std. bis 7 Tage).
- **Suche (🔍):** in Kopfzeile jedes Chats – diesen Kanal oder den ganzen Server (durchsucht die letzten 200 Nachrichten je Kanal).
- **Drag & Drop für Kanäle:** Kanäle in der Seitenleiste per Maus verschieben, auch in andere Kategorien (Besitzer / Mods mit Recht „Kanäle“; nur Desktop-Maus).
- **Detaillierte Mod-Berechtigungen:** Servermenü → „Mod-Berechtigungen“ (Besitzer): Fremde Nachrichten löschen, kicken, bannen, Timeouts, Rollen, Kanäle verwalten. Mods dürfen jetzt (mit Recht) fremde Nachrichten löschen.
- **Erscheinungsbild:** Profil → Dunkel / Hell / AMOLED + eigene App-Akzentfarbe.
- **Profil-Themes:** Presets Sunset, Neon, Ocean, Cyberpunk + freie Farben (Hintergrund 1/2, Akzent, Schrift) – sichtbar auf deiner Profilkarte für alle.
- **Emoji:** Suche, Favoriten (Rechtsklick bzw. lange drücken auf ein Emoji, Tab ⭐).
- **Mikrofon- & Echo-Test:** Profil → „Mikrofon- & Echo-Test“ (5 s aufnehmen, Pegelanzeige, Wiedergabe).

### Fix (v5.1)
- Kanal-Zahnrad ⚙ war durch Drag&Drop blockiert (Firefox): Zeilen sind jetzt nur noch beim Greifen verschiebbar, Buttons bleiben immer klickbar.
- Gruppenchats starteten beim Klick auf 🎤 einen Klingelton, der nie aufhörte: Sprachanrufe sind in Gruppen jetzt gesperrt (Client + Server).

### Sound-Fixes (v5.2)
- Nachrichtenton funktioniert jetzt auch in Kanälen mit ≥200 Nachrichten (vorher verstummte er dort).
- Töne werden entprellt (kein Überlappen/Stottern bei vielen Nachrichten), der AudioContext wird bei Fokus-/Sichtbarkeitswechsel zuverlässig geweckt.
- Soundboard-/Eintrittssounds: Autoplay-Fehler abgefangen, respektieren „Töne aus“ und „Nicht stören“.
- Klingelton: startet nie doppelt, stoppt sofort, wenn du im Anruf bist oder auf „Nicht stören“ gehst.
- Fehlende/kaputte Sound-Dateien (HTTP-Fehler) werden sauber erkannt.

### Android-App
Siehe `pulsecord-android-src.zip` (Build mit `./build.sh`). Die App lädt https://pulsecords.netlify.app.

### Umbenennung zu Pulsecord
- Neues Logo (Knoten-Emblem), blau-violettes Design, alle Itachi-/Sharingan-/Naruto-Bezüge entfernt (App-Themes heißen jetzt Rot, Korall, Bernstein … Karmesin).
- Alte rote Standard-Akzentfarben werden automatisch auf das neue Blau-Violett umgestellt.
- Der interne Datenspeicher heißt weiterhin `itachicord` (nur im Code, unsichtbar) – bitte NICHT ändern, sonst sind bestehende Konten/Server weg.
- Netlify: Site-Namen unter *Site configuration → Change site name* auf `pulsecord` ändern, dann ist die Seite unter https://pulsecord.netlify.app erreichbar. Die Daten bleiben erhalten.

## Neu (v6): Push-Benachrichtigungen, Anrufe als Benachrichtigung, Design-Update
**Benachrichtigungen bei geschlossener App**
- **Web/PWA (Chrome, Edge, Firefox, Safari ab iOS 16.4 als installierte App):** Beim ersten Start fragt eine Leiste „Benachrichtigungen aktivieren". Danach kommen Nachrichten, @Erwähnungen, Antworten, Freundschaftsanfragen und Anrufe per **Web-Push** – auch wenn der Tab/die App zu ist. Der Server (`netlify/functions/api.mjs`) erzeugt die VAPID-Schlüssel beim ersten Mal selbst und speichert sie – **keine Einrichtung nötig**. Optional eigene Schlüssel: Netlify-Variablen `VAPID_PUBLIC` / `VAPID_PRIVATE`. Neue Abhängigkeit: `web-push` (wird von Netlify automatisch installiert).
- **Anrufe:** Die Benachrichtigung zeigt „📞 Anruf von …" mit den Knöpfen **Annehmen / Ablehnen**, vibriert und bleibt stehen, bis du reagierst. „Annehmen" öffnet Pulsecord und tritt dem Anruf direkt bei.
- Ist die App offen und sichtbar, gibt es kein doppeltes System-Popup (dort erscheint wie bisher die Karte in der App). „Nicht stören" und stummgeschaltete Server werden respektiert.
- **Android-App (`pulsecord-android-src.zip`, v1.1):** Neuer Hintergrunddienst (`PollService`). Er läuft nach der Anmeldung dauerhaft (leise Dauer-Benachrichtigung „Bereit für Nachrichten und Anrufe"), fragt den Server alle 3 s ab und zeigt Nachrichten gebündelt pro Chat. **Anrufe klingeln** (Klingelton `res/raw/call.mp3` + Vibration, je nach Klingelmodus), mit Annehmen/Ablehnen und Vollbild über dem Sperrbildschirm. Startet nach Neustart/Update automatisch (`BootReceiver`). Beim ersten Start wird einmalig gefragt, die Akku-Optimierung auszuschalten – das ist wichtig, damit Android den Dienst nicht einschläft. Android 13+: Benachrichtigungen beim ersten Start erlauben.
- Server-Erweiterungen: `a=pushkey`, `a=pushsub`, `a=pushunsub`; `a=inbox` liefert zusätzlich `ring`, `dnd` und `fin` (offene Freundschaftsanfragen).

**Design (`public/v6.css`)**: ruhiges Aurora-Licht im Hintergrund, Glas-Flächen mit feinem Lichtrand, weichere Animationen (Server-Icons, Kanalliste, Eingabefeld mit Glow-Fokus, Karten/Fenster), überarbeitete Buttons, **neuer Vollbild-Anrufbildschirm** (pulsierender Avatar, runde Annehmen-/Ablehnen-Knöpfe), neue Hinweisleiste für Benachrichtigungen. Der Service-Worker-Cache heißt jetzt `pulsecord-v7` – nach dem Deploy einmal hart neu laden.

## Neu (v7): Sprachnachrichten, Ende-zu-Ende-Verschlüsselung, 30 Dekorationen, Discord-Navigation
Dateien: `public/v7.js`, `public/v7.css` (+ kleine Hooks in `index.html`, `v3.js`, `netlify/functions/api.mjs`). Keine neuen Abhängigkeiten. Service-Worker-Cache heißt jetzt `pulsecord-v8` – nach dem Deploy einmal hart neu laden.

**Sprachnachrichten 🎤**
- Mikrofon-Knopf rechts im Eingabefeld (verschwindet, sobald Text getippt wird). Tippen = Aufnahme starten (Live-Wellenform, max. 5 Min.), ⏹ beenden, ▶ vorhören, ➤ senden, 🗑 verwerfen.
- Im Chat: Player mit Wellenform, Fortschritt, Antippen der Welle = spulen, Tempo 1× / 1,5× / 2×, automatisch die nächste Sprachnachricht abspielen. Format: WebM/Opus (Chrome, Firefox, Android) bzw. MP4/AAC (Safari/iOS).
- Speicherung über den vorhandenen Chunk-Upload (`a=up` / `a=dl`); die Nachricht trägt `voice`, `dur`, `wf` (Wellenform).

**Ende-zu-Ende-Verschlüsselung 🔒 (1:1-Direktnachrichten)**
- Pro Konto ein ECDH-P-256-Schlüsselpaar, erzeugt beim ersten Start im Browser. Der private Schlüssel verlässt das Gerät nie (localStorage `e2k:<name>`); der öffentliche liegt am Konto (`pk`). Pro Chat wird per ECDH + HKDF ein AES-256-GCM-Schlüssel abgeleitet.
- Verschlüsselt werden Text, Bearbeitungen, Sprachnachrichten und Dateien (je Chunk) in 1:1-DMs. Der Server und Push-Benachrichtigungen sehen nur „🔒 Verschlüsselte Nachricht“.
- Schloss-Symbol in der Kopfzeile → Sicherheitsnummer zum Vergleichen mit dem Gegenüber. Hat jemand noch keinen Schlüssel, fragt die App vor dem unverschlüsselten Senden nach.
- **Neue Geräte:** Profil → 🔐 Verschlüsselung → „Jetzt sichern“. Die Passphrase verschlüsselt den Schlüssel (PBKDF2 250 000 Runden + AES-GCM); nur die verschlüsselte Sicherung liegt auf dem Server (`ek`). Ohne Sicherung gehen alte Nachrichten bei Geräteverlust verloren.
- **Grenzen:** Server-Kanäle und Gruppenchats sind *nicht* Ende-zu-Ende-verschlüsselt. Absender, Zeit, Dateiname/-größe bleiben sichtbar. Max. ca. 2900 Zeichen pro verschlüsselter Nachricht. Weil die Web-App vom Server geladen wird, schützt E2E nicht vor einem manipulierten Server-Code (wie bei jeder Web-App). Anrufe laufen ohnehin per WebRTC (DTLS-SRTP).

**30 Profilbild-Dekorationen ✨**
- Profil → „Profilbild-Dekoration“: Neon, Regenbogen, Feuer, Eis, Gold, Aurora, Toxic, Lava, Ozean, Galaxie, Sonnenuntergang, Radar, Puls, Glitch, Matrix, Pixel, Schatten, Blitz, Kirschblüte, Herzen, Krone, Heiligenschein, Teufelshörner, Katzenohren, Hasenohren, Engelsflügel, Blätterkranz, Sternenstaub, Mond, Schneefall.
- Reines CSS (kein Bild-Upload nötig), skaliert mit jeder Avatargröße, respektiert „Bewegung reduzieren“. Für alle sichtbar (Feld `deco`, nur Kennung wird gespeichert). Emoji-Elemente sehen je nach Gerät leicht anders aus.

**Navigation wie bei Discord**
- *Alle Geräte:* Schnellwechsler (**Strg/Cmd + K** bzw. Tab „Suche“ / Suchfeld in der Seitenleiste) mit `@Person`, `#Kanal`, `*Server`. Tooltips an der Serverleiste, 🧭 „Server entdecken“.
- *PC:* **Alt + ↑/↓** Kanal/Chat wechseln, **Strg + Alt + ↑/↓** Server wechseln, **Strg + Umschalt + M** Mitgliederliste, **Strg + /** Übersicht. Feste Mitgliederspalte rechts (ab 1100 px, 👥 schaltet sie ein/aus).
- *Tablet:* Server + Kanäle als Schublade, Mitglieder als Schublade von rechts.
- *Handy:* Wischen mit Finger-Tracking – nach rechts = Server & Chats, nach links = Mitglieder (auch am Rand zum Schließen). Neue Tab-Leiste: Server · Freunde · Suche · Du. Die alten Wisch-Handler wurden entfernt.

## Neu (v12): Einstellungs-Hub, Profile wechseln, Startanimation, Benachrichtigungs-Optionen, Insights
Dateien: `public/v12.js`, `public/v12.css` (+ kleine Änderungen in `index.html`, `v3.js`, `v6.js`, `sw.js`, `netlify/functions/api.mjs`). Service-Worker-Cache heißt jetzt `pulsecord-v14` – nach dem Deploy einmal hart neu laden.

**Einstellungs-Hub (Profil → öffnet jetzt ein Vollbild-Menü mit Bereichen)**
- *Mein Konto:* Vorschau, Anzeigename, Status, Aktivität, Pronomen, Über mich, Farbe, Namensstil, Avatar/Banner/Beitritts-Sound, Dekoration, Profil-Theme, Verknüpfungen, ein Speichern-Knopf.
- *Profile wechseln:* mehrere Konten pro Gerät (Wechseln, Entfernen, „Weiteres Konto hinzufügen“). Schneller Wechsler über **⇄** neben deinem Namen unten links. Auf der Login-Seite erscheinen gespeicherte Konten als „Weiter als …“. Beim Wechsel wird die Push-Anmeldung des alten Kontos entfernt, das neue registriert sich selbst.
- *Benachrichtigungen:* Arten (DMs, @Erwähnungen, Antworten, @everyone, Freundschaftsanfragen, Anrufe), Popups an/aus, Position (Desktop), Dauer, Textvorschau an/aus, System-Benachrichtigung im Hintergrund, Tab-Zähler, Ton, Lautstärke, Vibration, **Ruhezeiten** (inkl. „Anrufe durchlassen“), Server einzeln stummschalten, Test-Knöpfe. Die Auswahl wird mit dem Push-Abo an den Server geschickt (`a=pushsub`, Feld `ns`) – Push bei geschlossener App hält sich daran.
- *Darstellung:* Modus, Akzent, Theme, App-Icon, Schrift, Sättigung, Kontrast, **Kompakt**, **Bewegung reduzieren**, Streamer-Modus, Hintergrundbild, **Startanimation** (Voll / Schlicht / Keine, mit Vorschau).
- *Sprache & Ton*, *Sicherheit & Datenschutz* (2FA, E-Mail, Schlüssel, Status, Export), *Gerät & App* (Overlay, Management, Cache leeren, Abmelden).
- **Abmelden** meldet jetzt nur noch das aktuelle Konto ab (neu: `a=logout` macht den Token serverseitig ungültig). „Alle Konten abmelden & Gerätedaten löschen“ ersetzt das frühere `localStorage.clear()`.

**Startanimation:** Logo mit pulsierenden Ringen, Glanz-Schriftzug, Statusmeldungen („Verbinde …“, „Lade Server …“) und weichem Ausblenden, während die Oberfläche einfliegt. Respektiert „Bewegung reduzieren“.

**Server-Insights (Dashboard):** Zeitraum 7/14/30 Tage, Kennzahlen mit Trend, Nachrichten pro Tag, Aktivität nach Uhrzeit (lokale Zeit), Top-Kanäle (mit Namen), aktivste Mitglieder, aktive Nutzer, Beitritte/Austritte, Online/Rollen. Neue Messwerte werden ab dem Deploy erfasst (Uhrzeiten, Mitglieder, aktive Nutzer, Beitritte/Austritte, Dateien); ältere Tages- und Kanalsummen bleiben erhalten. In den Servereinstellungen → Übersicht gibt es zusätzlich einen Schalter für deine Benachrichtigungen dieses Servers.

**Grenze:** Der native Android-Hintergrunddienst (`pulsecord-android-src.zip`) kennt die neuen Benachrichtigungs-Optionen noch nicht; für ihn gelten weiter nur die stummgeschalteten Server und „Nicht stören“.

## Neu (v14): Sprachchat im Discord-Stil, Bildschirmfreigabe repariert
Dateien: `public/v13.js`, `public/v13.css`, Icons in `public/icons/vc/` (aus den Discord-Assets).
- **Design:** Kachel-Raster mit farbigem Hintergrund, Avatar in der Mitte, Name unten links, Stumm-/Kopfhörer-Symbol unten rechts, grüner Rahmen beim Sprechen. Auf dem Desktop liegt der Anruf links, der Text-Chat des Kanals rechts. Auf dem Handy Vollbild (Minimieren-Knopf zeigt den Chat), bei einem anderen offenen Kanal ein kleines Fenster.
- **Steuerleiste:** Mikrofon, Kopfhörer (Deafen), Kamera, Bildschirm teilen, ⋯ (Push-to-Talk, Gemeinsam schauen, Hand heben, Soundboard), Auflegen.
- **Mikrofon-Symbole:** vorher zeigten 🎤 (Stumm) und 🎙 (Push-to-Talk) dasselbe Icon. Jetzt: Mikrofon / Mikrofon durchgestrichen, Kopfhörer, und Push-to-Talk steht im ⋯-Menü. Der Knopf „Sprache“ in der Kopfzeile ist ein Telefon.
- **Bildschirmfreigabe:** Der Stream erscheint als eigene Kachel mit „Stream ansehen“ (Klick = große Ansicht, Doppelklick/⛶ = Vollbild). Wer nach dem Start beitritt, sieht den Stream ebenfalls. Fehler werden angezeigt statt verschluckt. Die Signalisierung läuft nicht mehr überlappend, schickt höchstens 60 Nachrichten pro Anfrage und wiederholt bei Netzfehlern.
- **Desktop-App:** `desktop/main.js` hat jetzt einen Handler für `getDisplayMedia` (Auswahl Bildschirm/Fenster). Ohne ihn schlägt die Freigabe in Electron still fehl.
- Service-Worker-Cache: `pulsecord-v15` (einmal hart neu laden).

## Neu (v14)
- **Registrierung mit E-Mail-Bestätigung:** Nach „Weiter“ kommt eine Mail mit 6-stelligem Code *oder* Bestätigungslink (30 Min. gültig, 5 Versuche, 1 Mail/Minute). Das Konto wird erst danach angelegt. Braucht `GMAIL_USER` + `GMAIL_APP_PASS` (siehe oben); ohne diese Variablen wird wie bisher direkt registriert.
- **E2E wie bei WhatsApp:** Der DM-Schlüssel wird automatisch mit deinem Login-Passwort verschlüsselt auf dem Server gesichert. Auf einem neuen Gerät genügt die Anmeldung, die alten DMs sind wieder lesbar. Passwort ändern → danach unter Profil → 🔐 Verschlüsselung → „Jetzt sichern“ einmal erneuern.
- **Anrufe:** Freizeichen beim Anrufer (bis zur Annahme, nach 45 s „keine Antwort“), Klingelton + Vibration + blinkender Titel beim Angerufenen, Join-Ton bei Annahme.
- **Ungespeichert-Leiste** in Server- und Konto-Einstellungen („Zurücksetzen“ / „Änderungen speichern“); Schließen und Abschnittswechsel sind blockiert, bis gespeichert.
- **Farbwähler** repariert (zeigte nur einen Strich), **Icons** korrigiert (✔ war ein Lautsprecher; untere Leiste mit Discord-Icons).
- **Bildschirm teilen** gibt es im Anruf (Knopf mit Stream-Symbol). Handy-Browser erlauben die Funktion technisch nicht – dort erscheint ein Hinweis.

## Neu (v15): Bildschirm-Knopf, Anrufdauer, Netzwerkpolizei, 182 Dekorationen
Dateien: `public/v15.js`, `public/v15.css` (+ kleine Änderungen in `v5.js`, `v13.js`, `v14.js`, `index.html`, `sw.js`, `netlify/functions/api.mjs`). Service-Worker-Cache: `pulsecord-v17` – nach dem Deploy einmal hart neu laden.
- **Bildschirm teilen:** `v5.js` hat den Knopf auf Geräten ohne `getDisplayMedia` (Handy-Browser, Android-WebView) per CSS versteckt – deshalb fehlte er neben der Kamera. Er ist jetzt immer sichtbar (Icons `stream` / `stream-stop` = „Start stream“ / „Stop stream“ aus den Discord-Assets). Auf Handys erscheint ein Hinweis, weil dort der Browser die Freigabe technisch nicht erlaubt; am PC/Laptop/Tablet funktioniert sie.
- **Privater Anruf (1:1-DM):** Der Anrufer hört den Anrufton `sounds/call.mp3` in Schleife, bis der andere beitritt – höchstens **2 Minuten**. Der Angerufene sieht die Anruf-Karte ebenfalls 2 Minuten (`RING_MS` im Server). Danach keine weitere Reaktion: der Ton endet, der Anrufer bleibt allein im Anruf.
- **Netzwerkpolizei:** Wer **15 Minuten allein** in einem privaten 1:1-Anruf ist, wird entfernt (Hinweisfenster 🚓). Geprüft im Client und zusätzlich im Server (`vsync`, `ALONE_MS`). **Gruppenchats und Server-Sprachkanäle sind ausgenommen** – dort gibt es weder Klingeln noch Rauswurf.
- **Dekorationen:** 182 statt 30 (Ringe 73, Effekte 38, Kopfschmuck 17, Abzeichen 54) mit Suche und Kategorien. Das Menü war kaputt, weil `v9.css` das `.dgrid`-Raster der „Öffentliche Server“-Karten überschrieben hat; das Menü nutzt jetzt ein eigenes Raster (`.dgrid7`), bleibt beim Auswählen offen und zeigt eine Vorschau. Krone/Heiligenschein ruckelten durch eine überschriebene `translate`-Animation – behoben. Gespeichert wird nur die Kennung (`a-z0-9`, max. 20 Zeichen), neue Dekorationen brauchen also keine Serveränderung.
