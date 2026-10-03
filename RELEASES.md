# Publikowanie aktualizacji EonLauncher

Launcher pobiera aktualizacje z publicznych wydań repozytorium
`EonCode-DaVid/EonLauncher-Releases`. Kod źródłowy może pozostać prywatny.

## Jednorazowa konfiguracja GitHub

1. Utwórz fine-grained personal access token dla właściciela `EonCode-DaVid`.
2. Ogranicz dostęp tokenu wyłącznie do repozytorium `EonLauncher-Releases`.
3. Nadaj uprawnienie `Contents: Read and write`.
4. W repozytorium z kodem launchera otwórz `Settings → Secrets and variables → Actions`.
5. Dodaj sekret o nazwie `EON_RELEASE_TOKEN` i wklej token.

Token służy wyłącznie GitHub Actions. Nie wolno wpisywać go do `package.json`,
plików aplikacji ani repozytorium wydań.

## Publikowanie wersji

1. Zmień `version` w `package.json` i `package-lock.json`, np. na `0.9.14`.
2. Uruchom `npm run docs:version`.
3. Zapisz i wyślij zmiany do repozytorium z kodem.
4. Utwórz i wyślij tag zgodny z wersją, np. `v0.9.14`.
5. Workflow `Publikuj EonLauncher` zbuduje i opublikuje wydanie.

W jednym wydaniu muszą znaleźć się co najmniej `EonLauncher-Setup.exe`,
`EonLauncher-Setup.exe.blockmap` oraz `latest.yml`. Wersja portable jest plikiem
do pobrania ręcznego i nie aktualizuje się automatycznie.
