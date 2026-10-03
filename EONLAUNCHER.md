# EonLauncher

Launcher Minecraft oparty na FerroLauncher (licencja MIT, zachowana w LICENSE), z interfejsem EonCode.

## Uruchomienie

- `npm install`
- `npm run electron:dev` — aplikacja desktopowa w trybie developerskim.
- `npm run build` i `npm start` — gotowy interfejs w Electron.
- `npm run dist` — instalator Windows i wersja portable.

Grafiki pochodzą z `images/brand.png`, `images/logo.png` i `images/background.png`.

## Wdrożone

- Kreator pobiera grę, loader, Javę, biblioteki i zasoby bez uruchamiania Minecrafta. Nieudane pobieranie można ponowić dla tego samego profilu.
- RAM sugerowany na podstawie rodzaju profilu oraz całkowitej i wolnej pamięci komputera.
- Czytelne podpowiedzi dla błędów Javy, pamięci, sieci, dysku i zgodności modów; nieznane błędy odsyłają do konsoli.
- Ikona EonCode wpisywana do pliku EXE podczas każdego pakowania. Kategoria Znajomi tymczasowo wyłączona.

- Statyczna strona główna bez przewijania (od 900 × 640), grafiki EonCode, proste przyciski, Font Awesome i konsola gry w osobnym oknie.
- Zachowane mechanizmy Ferro: konta Microsoft/offline, instancje, Vanilla/Fabric/Quilt/Forge/NeoForge, Modrinth, paczki zasobów, shadery, RAM i Java.
- Polski interfejs, kompletny słownik sprawdzany testem i polskie komunikaty launchera. Treści zewnętrzne oraz logi Minecraft i modyfikacji zachowują język autora. Logi launchera używają oznaczenia [eoncode]. Nowe kopie używają rozszerzenia .eoncode; starsze .ferro nadal można importować.
- Developers: profile lokalnych serwerów, RAM, Java, port, start/stop/restart, konsola z odświeżaniem co 1,5 s, komendy, otwieranie folderu, kopie i przywracanie.
- Purpur: automatyczne pobieranie z oficjalnego API: https://purpurmc.org/docs/purpur/ . Inne silniki wymagają własnego uruchamialnego JAR. Forge z instalatorem i run.bat nie jest jeszcze obsługiwany.
- Kopie powstają tylko na zatrzymanym serwerze, nie zawierają JAR ani profilu Eon. Przywrócenie poprzedza automatyczna kopia bieżących danych. Nieukończone kopie nie pojawiają się na liście.

## Granice obecnej wersji

- Monitoring TPS/MSPT, CPU/RAM, dysku i sieci, EonAnalyzer i EonAgent są planowane. Interfejs nie pokazuje fikcyjnych pomiarów.
- Brak automatycznego instalowania Paper/Fabric/Forge/Velocity, wyboru zewnętrznego katalogu serwera, edytora plików i graficznego panelu graczy/pluginów. Pliki otwiera się w folderze, a graczami zarządza przez komendy konsoli.
- Brak kanału ogłoszeń i aktualizacji EonCode. Aktualizator Ferro jest wyłączony do skonfigurowania własnego repozytorium publikacji w package.json.
- Logowanie Microsoft wymaga poprawnej konfiguracji identyfikatora aplikacji Microsoft zgodnie z mechanizmem odziedziczonym z Ferro.
- Testy automatyczne nie zastępują próby uruchomienia prawdziwej gry/serwera z odpowiednią Javą i kontem Microsoft.

Nie jest to oficjalny produkt Minecraft. Nie jest zatwierdzony przez Mojang ani Microsoft.
