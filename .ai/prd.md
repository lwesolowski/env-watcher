# Dokument wymagań produktu (PRD) – EnvWatcher

## 1. Przegląd produktu

EnvWatcher to aplikacja typu MVP (Minimum Viable Product), której celem jest wsparcie zespołów programistycznych i DevOps w utrzymaniu spójności między środowiskami (Develop, Staging, Production).

Narzędzie wykorzystuje sztuczną inteligencję do analizy wprowadzonych ręcznie konfiguracji środowisk i generowania czytelnych raportów różnic w formacie tabelarycznym. Aplikacja skupia się na prostocie, eliminując skomplikowane integracje na rzecz szybkiej weryfikacji tekstowej („wklej i sprawdź”).

## 2. Problem użytkownika

Ręczne porównywanie konfiguracji środowisk jest procesem czasochłonnym i podatnym na błędy. W cyklu wytwarzania oprogramowania często dochodzi do sytuacji, w której wersje bibliotek, systemów operacyjnych lub limity zasobów różnią się między środowiskiem deweloperskim, testowym a produkcyjnym.

Prowadzi to do błędów, które pojawiają się dopiero po wdrożeniu na wyższe środowisko. Użytkownicy potrzebują narzędzia, które szybko wskaże różnice i potencjalne zagrożenia (np. przestarzałe biblioteki), bez konieczności żmudnej analizy plików konfiguracyjnych.

## 3. Wymagania funkcjonalne

### 3.1 Uwierzytelnianie i zarządzanie kontem

- System rejestracji i logowania oparty na parze Email / Hasło
- Brak logowania społecznościowego (Google, GitHub itp.) w wersji MVP
- Bezpieczne przechowywanie haseł użytkowników

### 3.2 Dashboard i onboarding

- Wyświetlanie listy projektów użytkownika, posortowanej chronologicznie
- Obsługa stanu pustego (Empty State) dla nowych użytkowników
- Wbudowany (hardcoded) projekt DEMO dostępny z poziomu Empty State
- Projekt DEMO umożliwia szybkie zapoznanie się z funkcjonalnością
- Język interfejsu aplikacji: **angielski**

### 3.3 Edytor projektu

- Formularz zawierający trzy sztywne pola tekstowe (`textarea`) dla środowisk:
    - Develop
    - Staging
    - Production
- Każde pole posiada placeholder sugerujący oczekiwany format danych
- Limit znaków dla każdego pola: **10 000**
- Brak walidacji składniowej (np. JSON / YAML) – analiza oparta wyłącznie na tekście przez AI

### 3.4 Silnik AI i raportowanie

- Analiza wprowadzonych tekstów przez model AI
- Generowanie bezpośredniego kodu HTML tabeli różnic przez model
- Tabela różnic zawiera kolumnę **„Fragment źródłowy”**, cytującą fragment tekstu, na podstawie którego wykryto różnicę (mitygacja halucynacji)
- Sekcja **„Rekomendacje”** generowana osobno
- Rekomendacje są istotne również wtedy, gdy nie wykryto różnic (np. sugestia aktualizacji przestarzałych bibliotek)
- Wiedza o wersjach bibliotek oparta na wewnętrznej bazie modelu (Knowledge Cutoff)
- Brak live-search
- Raporty generowane w języku angielskim

### 3.5 Weryfikacja i akceptacja

- Możliwość edycji danych wejściowych po wygenerowaniu raportu
- Możliwość ponownego uruchomienia analizy
- Przycisk **„Akceptuj raport”**, który:
    - zmienia status projektu na „Zweryfikowany”
    - stanowi sygnał dla metryk KPI

## 4. Granice produktu (poza zakresem MVP)

- Obsługa urządzeń mobilnych (tylko Desktop Web)
- Automatyczne pobieranie konfiguracji (API, SSH itp.)
- Import plików konfiguracyjnych (upload)
- Eksport raportów (PDF, CSV)
- Historia zmian i wersjonowanie projektów
- Obsługa błędów sieciowych typu timeout / retry
- Wyszukiwanie w czasie rzeczywistym najnowszych wersji bibliotek
- Dynamiczne dodawanie lub usuwanie środowisk  
  (tylko 3 sztywne: Develop, Staging, Production)

## 5. Historyjki użytkowników

### US-001: Rejestracja i logowanie

**Tytuł:** Dostęp do aplikacji za pomocą e-maila i hasła  
**Opis:**  
Jako nowy użytkownik chcę móc założyć konto i zalogować się, aby bezpiecznie przechowywać swoje projekty.

**Kryteria akceptacji:**

1. Użytkownik może zarejestrować się podając email i hasło
2. Użytkownik może zalogować się podając poprawne dane
3. System wyświetla komunikat błędu przy błędnych danych logowania
4. Sesja użytkownika jest utrzymywana po odświeżeniu strony

### US-002: Onboarding z projektem Demo

**Tytuł:** Załadowanie projektu demonstracyjnego  
**Opis:**  
Jako nowy użytkownik widzę opcję załadowania projektu demo, gdy nie mam jeszcze własnych projektów.

**Kryteria akceptacji:**

1. Na Empty State widoczny jest przycisk **„Załaduj Demo”**
2. Kliknięcie przycisku tworzy nowy projekt z przykładowymi danymi
3. Projekt Demo jest w pełni funkcjonalny

### US-003: Tworzenie projektu i wprowadzanie danych

**Tytuł:** Definiowanie konfiguracji środowisk  
**Opis:**  
Jako DevOps chcę wkleić konfigurację dla środowisk Develop, Staging i Production.

**Kryteria akceptacji:**

1. Formularz zawiera 3 pola: Develop, Staging, Production
2. Każde pole posiada placeholder
3. Limit znaków: 10 000
4. Aplikacja blokuje zapis/generowanie przy przekroczeniu limitu

### US-004: Generowanie raportu różnic

**Tytuł:** Analiza różnic przez AI  
**Opis:**  
Jako użytkownik chcę otrzymać tabelę różnic między środowiskami.

**Kryteria akceptacji:**

1. Kliknięcie **„Generuj raport”** wysyła dane do AI
2. Wynik prezentowany jest jako tabela HTML
3. Tabela zawiera kolumnę **„Fragment źródłowy”**
4. Raport jest w języku angielskim

### US-005: Przegląd rekomendacji

**Tytuł:** Wyświetlanie rekomendacji  
**Opis:**  
Jako użytkownik chcę widzieć rekomendacje nawet, gdy środowiska są spójne.

**Kryteria akceptacji:**

1. Sekcja **„Rekomendacje”** wyświetlana jest pod tabelą
2. Rekomendacje oparte są na wiedzy modelu

### US-006: Weryfikacja źródła (mitygacja halucynacji)

**Tytuł:** Weryfikacja fragmentu źródłowego  
**Opis:**  
Jako użytkownik chcę widzieć cytat źródłowy dla każdej różnicy.

**Kryteria akceptacji:**

1. Tabela zawiera fragment tekstu wejściowego użyty do detekcji różnicy

### US-007: Akceptacja raportu

**Tytuł:** Zatwierdzenie zgodności środowisk  
**Opis:**  
Jako użytkownik chcę oznaczyć projekt jako zweryfikowany.

**Kryteria akceptacji:**

1. Dostępny jest przycisk **„Akceptuj raport”**
2. Status projektu zmienia się na „Zweryfikowany”
3. Zdarzenie jest rejestrowane w systemie

### US-008: Obsługa błędów limitu znaków

**Tytuł:** Walidacja długości tekstu  
**Opis:**  
Jako użytkownik chcę zostać poinformowany o przekroczeniu limitu znaków.

**Kryteria akceptacji:**

1. Pole przekraczające limit jest podświetlone na czerwono
2. Wyświetlany jest komunikat błędu
3. Przycisk generowania raportu jest nieaktywny

## 6. Metryki sukcesu

### 6.1 Skuteczność AI

- **Cel:** 90% poprawnie wykrytych różnic
- **Miernik:**  
  Stosunek liczby raportów zakończonych kliknięciem **„Akceptuj raport”**  
  do całkowitej liczby wygenerowanych raportów
