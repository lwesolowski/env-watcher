# Aplikacja - EnvWatcher (MVP)

### Główny problem
Podczas wytwarzania oprogramowania, utrzymanie spójności między środowiskami (develop, staging i production)
nie jest łatwe i wymaga regularnych testów i weryfikacji.

### Najmniejszy zestaw funkcjonalności
- Generowanie zestawienia różnic między środowiskami przez AI na podstawie zdefiniowanego projektu
- Prosty system kont użytkowników do przechowywania projektów użytkownika
- Prosty system zarządzania projektami (dodaj, usuń, edytuj)
- W ramach projektu obsługa tylko 3 środowisk (develop, staging i production)
- Parametry każdego ze środowisk (wersja OS, wersje biliotek, ustawione limity) wprowadzamy ręcznie w postaci tekstu
- Raport różnic między środowiskami w formacie tabelarycznym

### Co NIE wchodzi w zakres MVP
- Pobieranych parametrów środowiska automatycznie (np. via REST API)
- Import parametrów z plików
- Eksport rapotu do pliku

### Kryteria sukcesu
- W 90% przypadków AI wykrywa poprawnie wszystkie różnice pomiędzy środowiskami
