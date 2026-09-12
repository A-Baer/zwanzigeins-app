# Zwanzigeins

Zwanzigeins ist eine Lern-App für deutsche Zahlen. Sie macht den Unterschied
zwischen der traditionellen deutschen Zahlensprechweise (zum Beispiel
„einundzwanzig“) und der stellenwertgerechten Sprechweise „zwanzigeins“
erfahrbar.

Die Anwendung kann als statische Web-App beziehungsweise PWA im Browser und
als iOS-App auf Basis von Capacitor ausgeführt werden. Die iOS-App verwendet
native Funktionen für Text-to-Speech und Spracherkennung.

## Funktionen

Die App enthält Übungen für:

- Hören & Schreiben
- Sehen & Sprechen
- Kopfrechnen
- eigene Level und verschiedene Sprechweisen
- Auswertung von Bearbeitungszeit und Fehlern

Die Spracherkennung im Modus „Sehen & Sprechen“ verwendet auf iOS das native
`SpeechRecognition`-Plugin. Die Sprachausgabe verwendet das native
`TextToSpeech`-Plugin. Im Browser werden, sofern verfügbar, die Web Speech APIs
verwendet.

## Voraussetzungen

Für die Web-App:

- Git
- Node.js und npm

Für die iOS-App zusätzlich:

- macOS
- Xcode
- ein Apple-Developer-Team für Signierung und Geräteinstallation
- ein angeschlossenes iPhone oder ein iOS-Simulator

## Installation

```bash
git clone https://github.com/zwanzigeins-app/zwanzigeins-app.git
cd zwanzigeins-app
npm install
```

## Web-App lokal starten

```bash
npx ws
```

Danach im Browser öffnen:

<http://localhost:8000/zwanzigeins-app.html>

Die Dateien im Repository sind die Quellversion. Der Ordner `web/` wird für
Capacitor erzeugt und ist deshalb von Git ausgeschlossen.

## Tests

Die JavaScript-Tests werden mit Jasmine ausgeführt:

```bash
npm test
```

Das Marketing-Beispiel inklusive SVG-Grafik kann separat erzeugt werden:

```bash
npm run marketing:statistics-example
```

## Capacitor und iOS

Vor dem Öffnen des iOS-Projekts müssen die Web-Dateien in den Capacitor-
Ordner synchronisiert werden:

```bash
npm run cap:sync:ios
npm run cap:open:ios
```

Das native iOS-Projekt liegt unter `ios/App/`. Die wichtigsten Dateien sind:

- `ios/App/App/SpeechRecognition.swift`: native iOS-Spracherkennung
- `ios/App/App/TextToSpeech.swift`: native iOS-Sprachausgabe
- `ios/App/App/Info.plist`: App-Name, Berechtigungsbegründungen und Bundle-
  Standardsprache
- `ios/App/App.xcodeproj/`: Xcode-Projekt und Build-Einstellungen

Beim ersten Start auf einem echten iPhone müssen in Xcode das Apple-Team,
Signing sowie das angeschlossene Gerät ausgewählt werden. iOS fragt beim
ersten Zugriff nach Mikrofon- und Spracherkennungsberechtigungen.

## Release für TestFlight oder den App Store

1. Web-Dateien synchronisieren:

   ```bash
   npm run cap:sync:ios
   ```

2. In Xcode unter **Signing & Capabilities** das richtige Team und Gerät
   prüfen.
3. Für ein Update die Marketing-Version und die Build-Nummer erhöhen. Beide
   Werte stehen in Xcode unter den Build Settings als `MARKETING_VERSION` und
   `CURRENT_PROJECT_VERSION`.
4. Als Ziel **Any iOS Device** auswählen und **Product → Archive** ausführen.
5. Im Organizer **Distribute App → App Store Connect → Upload** wählen.
6. In App Store Connect die neue Version anlegen, den verarbeiteten Build
   auswählen, Metadaten und Screenshots prüfen und die Version zur Prüfung
   einreichen.

Die Sprache des iOS-Bundles und die Sprache der App-Store-Metadaten werden
getrennt verwaltet. Für die deutsche Veröffentlichung müssen daher sowohl die
Xcode-/Bundle-Sprache als auch die Primärsprache beziehungsweise Lokalisierung
in App Store Connect geprüft werden.

## Projektstruktur

- `zwanzigeins-app.html`, `manual.html`: zentrale Web-Oberflächen
- `js/`: Spiele, Zahlensprechweisen, Audio- und Statistiklogik
- `css/`: Stylesheets
- `img/`, `mp3/`, `res/`: App- und Audio-Ressourcen
- `spec/`: Jasmine-Tests
- `marketing/`: reproduzierbare Beispiele für Marketing-Grafiken
- `ios/App/`: Capacitor-iOS-Projekt und native Plugins
- `doc/`: zusätzliche Veröffentlichungsdokumentation

## Sicherheit und Beiträge

Das Repository ist öffentlich. Änderungen an `master` erfolgen über Pull
Requests und müssen den automatischen Testlauf bestehen. Abhängigkeiten werden
von Dependabot überwacht und aktualisiert.

Sicherheitslücken bitte nicht in öffentlichen Issues melden. Die vertrauliche
Meldung ist über GitHubs **Private vulnerability reporting** möglich. Weitere
Hinweise stehen in [SECURITY.md](SECURITY.md).

Apple-Signing-Zertifikate, Provisioning-Profile, App-Store-Connect-Schlüssel
und andere Zugangsdaten gehören niemals in dieses Repository.

## Entwicklungshinweise

Die Web-App ist bewusst frameworkarm und verwendet ES-Module. Änderungen an
der Web-App werden erst nach `npm run cap:sync:ios` in die iOS-App übernommen.
Native Swift-Änderungen liegen dagegen direkt im Xcode-Projekt und benötigen
einen neuen iOS-Build.

Projekt- und Issue-Kommunikation erfolgt überwiegend auf Deutsch. Quellcode
und technische Dokumentation verwenden, soweit sinnvoll, englische
Bezeichner.
