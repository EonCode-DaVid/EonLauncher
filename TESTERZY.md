# EonLauncher — wersja testowa Windows x64

## Uruchomienie

Otwórz `EonLauncher-portable.exe`. Nie trzeba instalować Node.js ani używać terminala. Alternatywnie użyj `EonLauncher-Setup.exe`, aby zainstalować aplikację i utworzyć skrót.

Do pobierania Minecrafta, modyfikacji oraz podglądu skinów potrzebny jest Internet. Pierwsze uruchomienie gry może trwać dłużej, ponieważ launcher pobiera wymagane pliki. Wersja testowa nie ma podpisu cyfrowego wydawcy.

## Co sprawdzić

1. Wpisz nick, sprawdź postać 3D i obróć ją myszą. Podgląd używa publicznego skina profilu o tym nicku; w grze offline wygląd może być inny.
2. Utwórz profil Minecraft Vanilla. Sprawdź zalecenie RAM, przebieg instalacji i komunikat „Gotowe do gry”. Instalacja nie powinna uruchomić gry. Następnie kliknij „Graj”. Przy problemie z siecią ponów instalację tego samego profilu.
3. Otwórz konsolę: menu powinno się schować. Po zamknięciu konsoli wraca do poprzedniego stanu. Przycisk w lewym górnym rogu pozwala niezależnie chować i pokazywać menu.
4. Sprawdź stronę główną przy najmniejszym rozmiarze okna (900 × 640). Powinna mieścić się bez przewijania.
5. Zamknij aplikację, uruchom ją ponownie i sprawdź zapisane instancje.

## Zakres testów

Automatyczne testy i kontrola wyglądu nie potwierdzają jeszcze uruchomienia gry na każdym komputerze. Logowanie Microsoft wymaga skonfigurowanego identyfikatora aplikacji. Automatyczne aktualizacje EonCode są wyłączone do czasu skonfigurowania kanału publikacji. Monitoring i EonAnalyzer pozostają planowanymi funkcjami.

Podgląd 3D korzysta z biblioteki [skinview3d](https://github.com/bs-community/skinview3d) i publicznego API [Minotar](https://minotar.net). Do API przekazywany jest nick lub UUID, bez tokenu konta Microsoft.

Zgłoszenie błędu powinno zawierać wersję Windows, kroki odtworzenia, wersję Minecrafta i loadera oraz istotny fragment konsoli. Przed przekazaniem logów usuń prywatne dane i tokeny, jeśli się w nich znalazły.

W wersji 0.9.6 kategoria Znajomi jest niedostępna. Sprawdź ostrość tekstu po najechaniu na karty oraz ikonę aplikacji i skrótu po instalacji nowej wersji.
