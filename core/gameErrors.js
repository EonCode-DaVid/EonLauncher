function explainGameError(message) {
  const text = String(message || '');
  const rules = [
    [/ENOSPC|no space left|za mało miejsca/i, 'Brak miejsca na dysku', 'Zwolnij miejsce na dysku z plikami Minecrafta i ponów pobieranie.'],
    [/OutOfMemoryError|Java heap space|Could not reserve|not enough memory|paging file|pamięć RAM/i, 'Za mało pamięci', 'Zamknij zbędne aplikacje. Przy błędzie rezerwacji zmniejsz RAM profilu; przy Java heap space zwiększ go, pozostawiając pamięć dla systemu.'],
    [/UnsupportedClassVersion|class file version|Niezgodna Java|Niepoprawna ścieżka własnej Javy|java.*ENOENT|java.*not found/i, 'Niezgodna lub brakująca Java', 'Otwórz ustawienia profilu i ustaw automatyczny wybór Javy. Launcher pobierze wymaganą wersję.'],
    [/Incompatible mods|Mod resolution|requires.*version|depends on|Missing.*dependenc|ModLoadingException/i, 'Mody mogą być niezgodne', 'Sprawdź wersję Minecrafta i loadera oraz wymagane zależności modów. Szczegóły w konsoli wskazują, który mod wymaga zmiany.'],
    [/ECONN|ENOTFOUND|ETIMEDOUT|fetch failed|HTTP 5\d\d|network|timeout/i, 'Nie udało się pobrać plików', 'Sprawdź połączenie z Internetem i ponów próbę. Profil pozostaje zapisany; istniejące poprawne pliki zostaną wykorzystane ponownie.'],
    [/premium|logowanie wymagane|unauthorized|HTTP 401|invalid.*session/i, 'Wymagane logowanie', 'Zaloguj się ponownie przez Microsoft lub wybierz własny nick dla konta offline.'],
    [/EACCES|EPERM|Access.*denied/i, 'Brak dostępu do plików', 'Sprawdź, czy plików nie blokuje inny proces i czy masz dostęp do katalogu profilu.'],
  ];
  const match = rules.find(([pattern]) => pattern.test(text));
  return { title: match?.[1] || 'Nie udało się przygotować lub uruchomić gry', advice: match?.[2] || 'Otwórz konsolę i sprawdź ostatnie komunikaty. Ponów próbę; jeśli błąd wróci, dołącz fragment logu do zgłoszenia.', detail: text.slice(-3000) };
}
module.exports = { explainGameError };
