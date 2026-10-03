# Logowanie Microsoft w EonLauncher

Użytkownik końcowy nie wpisuje Client ID. W instalatorze musi znajdować się konfiguracja aplikacji Microsoft przygotowana przez twórcę launchera.

## Konfiguracja twórcy

1. W Microsoft Entra utwórz rejestrację aplikacji `EonLauncher`.
2. Wybierz konta obejmujące osobiste konta Microsoft.
3. W `Authentication` dodaj platformę `Public client/native (mobile & desktop)` z adresem:

   `https://login.microsoftonline.com/common/oauth2/nativeclient`

4. Włącz publiczny przepływ klienta. Nie twórz ani nie umieszczaj Client Secret w launcherze.
5. Zgłoś Client ID do dostępu do usług Minecraft przez formularz `https://aka.ms/mce-reviewappid`.
6. Skopiuj `build/secrets.example.json` do `build/secrets.json` i wpisz własny `clientId`:

   `{ "clientId": "TWÓJ-APPLICATION-CLIENT-ID" }`

   Plik `build/secrets.json` jest ignorowany przez Git i zostanie dołączony tylko do lokalnie zbudowanego instalatora.
7. Zbuduj instalator po zapisaniu pliku. W gotowej aplikacji Client ID nie jest pokazywany zwykłym użytkownikom.

## Przebieg dla gracza

Gracz przechodzi do `Moje konto`, wybiera `Zaloguj przez Microsoft`, wybiera konto w oknie Microsoft i wraca do launchera. Tokeny sesji są przechowywane z ochroną systemową Windows, a wygasła sesja jest odnawiana przy ponownym uruchomieniu.

Jeżeli `build/secrets.json` nie zawiera Client ID, launcher pokaże komunikat, że logowanie nie zostało skonfigurowane przez twórcę. Pole awaryjne znajduje się pod `Ustawienia dla twórcy launchera`.
