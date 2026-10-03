# Aktualizacje EonLauncher

Aktualizator sprawdza wydania po uruchomieniu aplikacji, co 4 godziny i na żądanie w Ustawieniach. Pobieranie wymaga kliknięcia „Pobierz aktualizację”, a instalacja — „Uruchom ponownie”. Nie instaluje niczego automatycznie przy zamknięciu. Uruchomiona gra lub lokalny serwer blokują instalację.

Mechanizm obsługuje wersję z instalatora NSIS. Portable wymaga ręcznego zastąpienia pliku EXE. Bez skonfigurowanego kanału aplikacja pokazuje ten brak, zamiast błędnie twierdzić, że jest aktualna.

## Podłączenie kanału

Uruchom `node scripts/configure-updates.js ADRES`, podając publiczny adres repozytorium GitHub (w postaci `https://github.com/właściciel/repozytorium`) albo katalog HTTPS serwera aktualizacji. Następnie zbuduj nowy instalator. Adres zostanie zapisany w jego konfiguracji.

Przy każdym wydaniu zwiększ `version` w package.json i package-lock.json, uruchom `npm run docs:version`, testy oraz `npm run dist`. Opublikuj instalator, jego plik `.blockmap` i `latest.yml` wygenerowane w tym samym przebiegu. Metadane opublikuj na końcu, po plikach aplikacji. Nie edytuj ręcznie sum kontrolnych.

Dla GitHub umieść pliki w opublikowanym wydaniu z tagiem odpowiadającym wersji. Dla serwera HTTPS umieść je w skonfigurowanym katalogu.

## Sprawdzenie przed dystrybucją

Zainstaluj starszą wersję z podłączonym kanałem na testowym Windows. Opublikuj nowszą wersję w tym kanale, sprawdź pobranie, ponowne uruchomienie i zachowanie istniejących profili. Testy automatyczne sprawdzają stany i blokady aktualizatora; nie zastępują tej próby z rzeczywistym wydaniem.

Dokumentacja: https://www.electron.build/v26/docs/features/auto-update/
