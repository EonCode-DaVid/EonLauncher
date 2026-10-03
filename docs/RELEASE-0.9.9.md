# EonLauncher 0.9.9

- Wbudowany Client ID aplikacji Microsoft EonLauncher; użytkownik nie wpisuje konfiguracji OAuth.
- Panel kont: zapis i aktywacja nicku offline, przełączanie z Microsoft bez usuwania zapisanego konta.
- Usunięta lokalna blokada nicków premium w trybie offline. Pozostają offline UUID i brak tokenu Microsoft; serwery online-mode nadal wymagają prawidłowej sesji.
- Ustawienia bez sekcji „O aplikacji” i przycisku GitHub; odnośnik Discord prowadzi do https://dc.eoncode.fun.
- Dla Developerów: eksport bieżącej zawartości konsoli wybranego serwera do pliku log.

Weryfikacja: build poprawny, 63 testy poprawne, 1 pominięty na Windows. Pełne logowanie kontem Microsoft i uruchomienie Minecraft wymagają testu użytkownika. Rejestracja aplikacji Microsoft nie potwierdza jeszcze zatwierdzenia dostępu do usług Minecraft.
