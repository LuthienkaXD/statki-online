# Statki Online (Bitwa Morska 10×10) ⚓

Nowoczesna aplikacja webowa do gry w statki online dla dwóch graczy oraz przeciwko komputerowi, zaprojektowana na wzór i w oparciu o mechaniki znane z serwisu **battleship-game.org**.

---

## 🎮 Zaimplementowane Mechaniki i Zasady Gry

1. **Plansza**:
   - Wymiary: **10 × 10 pól**
   - Poziomo u góry: kolumny podpisane literami **A – J**
   - Pionowo po lewej: wiersze podpisane cyframi **1 – 10**

2. **Flota (10 statków – łącznie 20 masztów)**:
   - **1 × 4 kratki** (Czteromasztowiec)
   - **2 × 3 kratki** (Trójmasztowce)
   - **3 × 2 kratki** (Dwumasztowce)
   - **4 × 1 kratka** (Jednomasztowce)

3. **Zasada Odstępów (Odległość min. 1 kratki)**:
   - Statki **nie mogą się ze sobą stykać ani bokami, ani rogami (po skosie)**.
   - Pomiędzy każdymi dwiema jednostkami zawsze zachowany jest co najmniej 1-polowy pas wody.
   - Walidator na bieżąco sprawdza poprawność rozstawienia podczas przeciągania / klikania.

4. **Rozstawianie Statków**:
   - Wybór statków z doku floty i kliknięcie na planszę
   - Obracanie statków poziomo/pionowo (przycisk na ekranie lub klawisz **`R`**)
   - Kliknięcie w już postawiony statek usuwa go z powrotem do doku
   - Przycisk **„Rozmieść losowo”** – natychmiast generuje w 100% legalną planszę z 10 statkami

5. **Przebieg Bitwy (Walka Tura po Turze)**:
   - **Dodatkowy strzał po trafieniu**: Gracz, który trafi we wrogi maszt, natychmiast **otrzymuje kolejny strzał** (strzela tak długo, aż chybi lub wygra).
   - **Automatyczne zaznaczanie `✕` (pudło) dookoła trafień**:
     - **Na skosach**: Po trafieniu segmentu okrętu, 4 pola po przekątnej same oznaczają się jako sprawdzone/pudło (`✕`), ponieważ żaden statek nie może tam stać.
     - **Po zatopieniu**: Po zniszczeniu wszystkich masztów danego statku, **cały 1-kratkowy obrys wokół statku automatycznie oznacza się na `✕` (pudło)**, dzięki czemu gracz nie traci cennych ruchów na puste pola.

6. **Gra Wieloosobowa Online (Link do Pokoju)**:
   - Opcja „Zagraj ze znajomym” generuje unikalny kod pokoju i bezpośredni link (np. `http://localhost:3000/?room=ABC123`).
   - Wystarczy wysłać link drugiej osobie – po wejściu automatycznie dołącza do bitwy.
   - Stan synchronizowany w czasie rzeczywistym przez **WebSockets (Socket.IO)**.
   - Bezpieczeństwo: pozycje ukrytych statków wroga **nie są przesyłane do przeglądarki** (brak możliwości podglądania w kodzie źródłowym / devtools).

7. **Gra z Komputerem (Smart Bot)**:
   - Tryb solo z botem Kapitan Morgan – działa w trybie *Hunt & Target* (po trafieniu szuka kolejnych masztów w linii prostej).

8. **Konta Użytkowników i Rankingi Dzienne**:
   - Rejestracja i logowanie (hasła haszowane przez `bcryptjs`, autoryzacja `JWT`).
   - Statystyki gracza: liczba rozegranych bitew, wygrane, porażki, win rate %, trafienia, strzały.
   - **Ranking Dzienny**: Tabela wyników dla wybranego dnia z liczbą zwycięstw i skutecznością dziś.
   - **Ranking Ogólny**: Klasyfikacja wszech czasów najlepszych kapitanów.
   - Historia rozegranych bitew zapisywana trwale w lokalnej bazie danych SQLite.

9. **Efekty Dźwiękowe (Web Audio API)**:
   - Dźwięki wystrzału armatniego, plusku wody (pudło), eksplozji (trafienie), syreny okrętowej (zatopienie) oraz fanfary zwycięstwa / dżingla porażki – generowane syntezatorem przeglądarki bez konieczności ładowania plików MP3. Możliwość wyciszenia jednym kliknięciem (🔊/🔇).

---

## 🚀 Jak Uruchomić Aplikację

Projekt znajduje się w katalogu:
`C:\Users\User\.gemini\antigravity\scratch\battleship-game`

### 1. Uruchomienie Serwera Gry:
W terminalu (PowerShell / cmd):
```powershell
cd C:\Users\User\.gemini\antigravity\scratch\battleship-game
npm start
```
Serwer wystartuje na porcie **3000**:
👉 Otwórz w przeglądarce: **`http://localhost:3000`**

### 2. Jak zagrać ze znajomym:
1. Otwórz `http://localhost:3000`.
2. Kliknij **„Stwórz Nowy Pokój i Skopiuj Link”**.
3. Kliknij **„Skopiuj link do pokoju”** i wyślij go znajomemu (lub otwórz w drugiej karcie / oknie incognito).
4. Obaj gracze rozstawiają swoje statki (lub klikają „Rozmieść losowo”) i klikają **„Gotowy do bitwy!”**.
5. Rozpoczyna się bitwa morska!
