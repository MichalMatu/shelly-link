# Shelly Link — aktualny handoff Ionic React / UX Evolution (2026-10-11)

> **Przeczytaj ten plik jako pierwszy dla migracji Ionic.** W `docs/HANDOFF_NEXT_CHAT.md` i datowanych audytach znajdują się historyczne etapy oraz starsze liczniki. Najświeższy stan repozytorium i wyniki CI mają pierwszeństwo przed starymi fragmentami.

## Cel aktywnego zadania

Autonomicznie i krytycznie **domknij migrację kontrolek Ionic React** w `MichalMatu/shelly-link`, **wyłącznie na `work/ux-evolution`**. Nie modyfikuj `main`, nie merguj bez wyraźnej zgody. Migracja nie polega na mechanicznym zastąpieniu każdej kontrolki natywnej: pozostaw celowo własne nawigacje, gesty, swatche LED, AUTO/MANUAL, fizyczne ON/OFF i kółka czasu, dopóki zamiennik nie zachowuje UX, ARIA, gestów i bezpieczeństwa. Zamrożony wizualnie Climate pozostaje nienaruszony: eksperymentalna migracja jego 10 pól wejściowych spowodowała widoczne różnice i została wycofana. **Nie aktualizuj snapshotów dla ukrycia regresji.**

## Fresh source of truth (11 października 2026, 05:27 CEST)

- Repo: `MichalMatu/shelly-link`.
- Roboczy HEAD `work/ux-evolution`: **`b439478ba9a8ba8c3c65b4d928d188318631c915`**.
- `main`: `7e9fdaa5f7d7c514313d2c962a2cc02bb26615b7`; nie zmieniany przez tę pracę.
- GitHub Actions na HEAD: **CI success**, **Sandbox Pack success**. `33dc6da218ab` miał **CI failure**; następny commit `b439478ba9a8` naprawił nieaktualny selektor w `apps/mobile/src/__tests__/hardware-setup.test.tsx`. Nie klasyfikuj starego failed CI jako obecnej blokady.
- **Ostatni w pełni zatwierdzony produkt:** `bc0b1a9e806c080648d635943e2ce5bd3f17f4f6` — `pnpm check` PASS (555/555 testów mobilnych), canonical responsive/visual E2E **50/50 PASS** (bez nowych snapshotów), Capacitor Android `sync` + Gradle debug **PASS**. APK 5 179 520 B, SHA-256 `a5283ed32fb042a7fa66e322e93cae9d3d17a0545cd1c73baf71c41f436ba5cd`.
- **Zmiany po tym zatwierdzeniu**: `33dc6da218ab` migruje **potwierdzenie usunięcia termometru** do `IonButton`, zachowując callback `onConfirm`, osobny Cancel oraz wizualny danger-outline; `b439478ba9a8` aktualizuje integracyjny test termometru do natywnego hosta Ionic. **Brak potwierdzenia pełnych 50/50 E2E, `pnpm check` i nowego APK dokładnie na HEAD `b439478`**; zielone GitHub CI i Sandbox Pack są istotnym, ale nie równoważnym dowodem.
- Poprzednia inwentaryzacja na `bc0b1a9e`: **65 natywnych kontrolek = 55 button + 10 chronionych Climate input; 21 zwykłych akcji, 34 celowo własne przyciski**. Po najnowszej migracji termometru oczekiwane **64 = 54 + 10** (20 zwykłych + 34 własne); **przelicz ze źródeł** i zaktualizuj tabelę, zamiast traktować liczbę oczekiwaną jako pomiar.
- Budżet produkcyjny JS hard gate przechodzi; pozostaje **otwarte ostrzeżenie review**: około 2,370,425 B JS, największy inicjalny chunk `ion-icon` 1,043,584 B; CSS 154,517 B; 20 JS chunks. Zmiany rozmiaru mierz, nie wyciszaj gate.

## Stan techniczny i ograniczenia

- Wspólny `packages/ui/src/primitives/Modal.tsx` obsługuje fokus kontrolek Ionic w Shadow DOM oraz Tab/Shift+Tab (commit `3b8756a62`, testy); pozostaw ten kontrakt. Dotychczas migrowano m.in. akcje LED Apply, BLE scan/restart, polecenia developerskie, przejścia do właściciela blokady usunięcia oraz potwierdzenia Plug i termometru.
- Fizyczny Samsung S22+ / Android 16 **nie jest obecnie dostępny dla zadania**. Nie oczekuj, że dawny port Wireless ADB będzie aktualny; nie instaluj/nie czyść danych telefonu bez aktualnej autoryzowanej sesji. `medium_phone` (Android 16 ARM64) ma AVD, ale próba uruchomienia headless nie osiągnęła `sys.boot_completed=1` przed limitem i emulator wyłączono. **Brak odbioru APK na emulatorze**.
- Niefatalny błąd `Cannot read properties of undefined (reading 'triggerEvent')` z natywnego mostu Capacitor 7.6.7 jest intermittent, pojawiał się m.in. przy `App stopped`; nie ma potwierdzonej przyczyny. Nie stosuj spekulacyjnego patcha.
- Mac host ma **8 GB RAM** i przy nakładających się testach load wzrastał 40–150, powodując timeouty niezwiązanych z migracją E2E. Testy uruchamiaj **sekwencyjnie**, ogranicz zasoby zgodnie z repo, w razie timeoutu odtwórz dokładnie przypadek; nie zwiększaj bez dowodów timeoutów, nie ignoruj nieudanych pełnych zestawów.
- Nie naruszaj safe-OFF, stale-sensor fail-OFF, fizycznego identyfikatora Shelly, ownership instalacji, skryptów runtime ani danych trwałych. Praca nad UI **bez ingerencji w urządzenia/relays**. Wartość fizycznego testu relaya wymaga osobnej właściwej ścieżki i jasnego stanu końcowego.

## Obowiązujący przebieg w nowym czacie

1. Odczytaj świeży `AGENTS.md`, `apps/mobile/AGENTS.md`, `apps/mobile/src/features/AGENTS.md` (dla właściwej funkcji), `packages/AGENTS.md` / `packages/ui/AGENTS.md` (dla `@lcl/ui`), `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/UX_VISUAL_CONTRACT.md`, `docs/CHECKPOINT_2026-10-08_UX_EVOLUTION.md`, ten dokument i `docs/testing/2026-10-10-ionic-native-control-census.md`.
2. Sprawdź LIVE `work/ux-evolution`, `main`, CI i status Local Agenta; nie zakładaj, że powyższe SHA pozostaje HEAD. **Chat Bridge jest transportem, nie execution bindingiem**. Każde wykonywalne zadanie dla repo wymaga sprawdzenia runtime catalog, execution-enabled target i jego **aktualnego kanonicznego `agent_binding`**; NIE zapisuj UUID bindingu w dokumentacji. Zadania Mac/ADB/Gradle przez Local Agent do `agent-control:.agent/tasks/` właściwego repo; małe dokładne edycje także przez GitHub Connector. Nie uruchamiaj drugiego zadania dopóki trwa pierwsze.
3. **Pierwsze zadanie:** pełna weryfikacja aktualnego `b439478`: `pnpm check`; 50 canonical macOS Playwright responsive/visual E2E (bez odświeżania screenshotów); Capacitor `sync android` + Gradle `assembleDebug`, hash APK; raz jeszcze sprawdź GitHub CI. Można wcześniej wykonać skoncentrowane testy `SensorRemovalBlockedModal` i `hardware-setup`. Jeżeli pełne E2E nie przejdą, raportuj dokładne scenariusze i obciążenie; nie twierdź, że problem zniknął po wyizolowanym teście.
4. Następnie przelicz natywne kontrolki z **produkcyjnych TSX**, sklasyfikuj wyjątki (Climate, gestures, relay). Migruj **jedną małą bezpieczną grupę zwykłych akcji naraz** z testem na Ionic host, zachowaniem i18n, a11y, pending/disabled, focus, wizualnych tokenów i bezpieczeństwa. Nie powtarzaj starego globalnego `IonicActionButton` batcha — spowodował 17 regresji testowych.
5. Po każdej partii sprawdzaj zmienione testy, `pnpm check`, E2E i wizualne różnice, Android build gdy istotny. Dokumentuj osobno nieukończone: JS chunk, prawdziwe TalkBack/keyboard/overlay i błąd background `triggerEvent`. `main` bez zmian.
6. Jeśli w nowym czacie aktywny Chat Bridge obsługuje dzieci, deleguj 1–4 **niezależne, ograniczone analizy** jako research/verification (tylko dowody i rekomendacje), ale wszystkie egzekucje repo pozostaw jawnie do właściwego Local Agenta z target-bound bindingiem.

## Odsyłacze

- `docs/HANDOFF_NEXT_CHAT.md` — szeroki, historyczny handoff Stage 9, zawiera sekcje ze **starymi licznikami**; ten plik jest punktem startowym dla najnowszego Ionic UX.
- `docs/testing/2026-10-10-ionic-independent-audit.md` — historia audytu i dowody dot. WebView/fokusu/Androida.
- `docs/testing/2026-10-10-ionic-native-control-census.md` — lista plików i klasy kontrolek (póki co na starszym zatwierdzonym `bc0b1a9e`).
- `docs/PHONE_WIRELESS_ADB.md` — kiedy telefon znów będzie dostępny.
- `docs/UX_VISUAL_CONTRACT.md` — chronione baseline'y i zatwierdzone wyjątki.

**Kryterium sukcesu:** nie „0 native button” za wszelką cenę, lecz poprawnie zakończone standardowe akcje Ionic, zachowane świadome własne widgety i Climate, brak regresji zachowania/bezpieczeństwa/wizualizacji, z jawnymi lukami Androida i budżetu.
