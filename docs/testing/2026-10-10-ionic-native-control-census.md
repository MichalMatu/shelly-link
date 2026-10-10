# Native HTML control census — Ionic React, 2026-10-10

Zakres: `apps/mobile/src` produkcyjne TSX na kodzie `c71845097ac448eaf1b5d4a80c246f6c167fdb63` (`work/ux-evolution`). Testy TSX nie są liczone. Znaczniki natywne to `<button>`, `<input>`, `<select>`, `<textarea>`; jeden element JSX w pętli jest liczony raz, nie per urządzenie. **74 = 64 przyciski + 10 input**, w **33 plikach**.

**Wynik klasyfikacji:** 30 zwykłych przycisków do migracji (z czego 8 na zamrożonych powierzchniach Climate), 34 celowe przyciski z własnymi interakcjami, 10 input w zamrożonym Climate. "Zwykła" to zadanie otwarte, nie automatyczny nakaz zamiany 1:1. "Celowa" oznacza pozostawienie do czasu, aż pełny odpowiednik zachowa wizualną geometrię, ARIA i gesty; wymaga odrębnych testów dostępności.

| Ścieżka pod `apps/mobile/src/` | Liczba | Klasa | Uzasadnienie / dalsza praca |
|---|---:|---|---|
| `app/DevCommandPalette.tsx` | 4 | 2 zwykłe + 2 celowe | Reset all i Clear errors: akcje; wybór języka i motywu: własne przyciski stanu aria-pressed |
| `app/StandalonePulseInstallationDetail.tsx` | 3 | 3 zwykłe | Usuwanie/odinstalowanie automatyki, w tym potwierdzenia; zachować blokadę pending i wyłączenie przekaźnika |
| `components/AppBottomNavigation.tsx` | 3 | 3 celowe | Trwała nawigacja Plugs / Thermometers / Settings |
| `components/AppPageBack.tsx` | 1 | 1 celowa | Nawigacja zagnieżdżonego ekranu |
| `components/EditablePlugName.tsx` | 1 | 1 celowa | Ikonowa akcja wejścia w edycję nazwy |
| `components/RefreshIconButton.tsx` | 1 | 1 celowa | Wspólny ikonowy refresh ze stanem busy |
| `features/automations/components/ClimateInstallationDetailSections.tsx` | 2 | 2 zwykłe (Climate) | Odzyskiwanie/akcja i skanowanie, wizualnie chronione |
| `features/automations/components/ClimateRuleAdvancedSettings.tsx` | 5 | 4 chronione input + 1 zwykła | Numeryczne limity Climate oraz akcja przywrócenia wartości domyślnych |
| `features/automations/components/ClimateRuleDeviceSelectors.tsx` | 1 | 1 chroniony input | Checkbox wyboru urządzenia Climate |
| `features/automations/components/ClimateRuleEditor.tsx` | 7 | 4 chronione input + 3 zwykłe | Progi i VPD; podgląd/wczytanie skryptu oraz instalacja w zamrożonym układzie |
| `features/automations/components/PulseCycleEditor.tsx` | 1 | 1 chroniony input | Numeryczne pole współdzielonego edytora w trybie Climate |
| `features/plugs/components/PlugAddSpeedDial.tsx` | 3 | 3 celowe | Geometria i gesty dedykowanego speed dial Wi-Fi/Bluetooth |
| `features/plugs/components/PlugAutomationModeControl.tsx` | 2 | 2 celowe | AUTO/MANUAL: sprzężenie wizualne ze stanem bezpieczeństwa |
| `features/plugs/components/PlugDashboardCardShell.tsx` | 1 | 1 celowa | Ikonowe otwarcie szczegółów, zachować ochronę przed klikami w IonInput |
| `features/plugs/components/PlugDeleteConfirmModal.tsx` | 1 | 1 zwykła | Potwierdzenie zapomnienia Pluga, wymaga bezpiecznej obsługi focus w Modal |
| `features/plugs/components/PlugDetailTabs.tsx` | 1 | 1 celowa | Dedykowane zakładki szczegółów i aria-current |
| `features/plugs/components/PlugLedColorEditor.tsx` | 4 | 3 celowe + 1 zwykła | Próbki kolorów jako przyciski wyboru; Apply w modalu to zwykła akcja |
| `features/plugs/components/PlugRelayControls.tsx` | 2 | 2 celowe | Fizyczne ON/OFF; nie zmieniać semantyki ani runtime |
| `features/plugs/components/PlugRemovalBlockedModal.tsx` | 1 | 1 zwykła | Przejście do automatyki blokującej zapomnienie Pluga |
| `features/plugs/screens/BlePlugDetailScreen.tsx` | 1 | 1 zwykła | Usuwanie zapisanego BLE Pluga |
| `features/plugs/screens/WifiPlugDetailScreen.tsx` | 1 | 1 zwykła | Usuwanie zapisanego Wi-Fi Pluga |
| `features/thermometers/components/SavedSensorCard.tsx` | 4 | 4 celowe | Ikonowe edytuj/szczegóły/synchronizuj/usuń z etykietami |
| `features/thermometers/components/SensorRemovalBlockedModal.tsx` | 2 | 2 zwykłe | Przejście do właściciela lub potwierdzenie usunięcia termometru |
| `screens/InstallationDetailScreen.tsx` | 3 | 3 zwykłe | Akcje usunięcia automatyki i potwierdzenia; weryfikacja tożsamości zostaje w flow |
| `screens/SetupIntentScreen.tsx` | 2 | 2 celowe | Przyciski-karty wyboru intencji nawigacyjnej |
| `screens/TimeInstallationDetail.tsx` | 3 | 3 zwykłe | Usunięcie automatyki Time i potwierdzenia |
| `screens/hardware-setup/pages/RuleSetupPage.tsx` | 2 | 2 zwykłe (Climate) | Wczytywanie/skanowanie i bezpieczny test przekaźnika; frozen master |
| `screens/hardware-setup/pages/SensorSetupPage.tsx` | 1 | 1 celowa | Fab/gest dodawania sensora |
| `screens/hardware-setup/pages/ShellyBleDiscoveryModal.tsx` | 1 | 1 zwykła | Restart BLE w stopce modalnej, nie powielać nieudanego globalnego refaktoru |
| `screens/hardware-setup/pages/ShellySettingsContent.tsx` | 2 | 2 zwykłe | Rozpoczęcie BLE scan oraz usunięcie urządzenia, ekran Device |
| `screens/hardware-setup/pages/ShellySetupPage.tsx` | 1 | 1 celowa | Fab dodawania Shelly; odrębny zwykły retry przeniesiony do IonButton w c7184509 |
| `screens/hardware-setup/pages/ShellySetupPresentation.tsx` | 4 | 3 celowe + 1 zwykła | Ikonowe edytuj/ustawienia/usuń i zwykła akcja BLE scan |
| `screens/hardware-setup/pages/TimeScheduleSetupPage.tsx` | 3 | 3 celowe | Pokrętło czasu + dwa triggery dialogu HH/MM |

## Osobny pakiet `@lcl/ui`

W `packages/ui/src` pozostaje **7 własnych przycisków** (niezaliczonych do 74): `InfoPopover` 1, `ToastViewport` 1, `Modal` 1, `ScriptPreview` 1, `SegmentedControl` 1, `SelectField` 2. To współdzielone prymitywy ikonowe/klawiatury/focus/listbox; `@lcl/ui` nie powinno importować Ionic wyłącznie dla statystycznego zera. Najpierw zweryfikować współpracę focus trap `Modal` z hostami Ionic. Nie zmieniać pakietowej warstwy na podstawie samego skanu regex.

## Ograniczenia i kryterium ukończenia

- Regresja `16-climate-setup` podczas poprzedniej migracji pól Climate (~15,000 pikseli różnicy) została wycofana; nie aktualizować baseline by ją ukryć.
- Poprzedni szeroki refaktor przycisków i focus trap modalnego spowodował 17 błędów testowych i został wycofany. Zmieniać tylko testowane grupy funkcjonalne.
- Ukończenie wymaga rozpatrzenia wszystkich 30 zwykłych przycisków, a nie tylko zielonego TypeScriptu; sprawdzić w szczególności modale, klawiaturę i czytniki ekranu Androida.
- Źródłem wyników integracyjnych i pomiaru bundla pozostaje `docs/testing/2026-10-10-ionic-independent-audit.md`; ostatni wynik źródłowego `pnpm check` sprzed tej partii był 549/549, E2E 50/50. Po zmianie `c7184509` pełna rekwalifikacja jest wykonywana osobno.
