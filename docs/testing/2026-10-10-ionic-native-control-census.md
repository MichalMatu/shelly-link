# Native HTML control census — Ionic React, 2026-10-10

Zakres: `apps/mobile/src` produkcyjne TSX na kodzie `bc0b1a9e806c080648d635943e2ce5bd3f17f4f6` (`work/ux-evolution`). Testy TSX nie są liczone. Znaczniki natywne to `<button>`, `<input>`, `<select>`, `<textarea>`; jeden element JSX w pętli jest liczony raz, nie per urządzenie. **65 = 55 przycisków + 10 input**, w **30 plikach**.

**Wynik klasyfikacji:** 21 zwykłych przycisków do migracji (z czego 8 na zamrożonych powierzchniach Climate), 34 celowe przyciski z własnymi interakcjami, 10 input w zamrożonym Climate. "Zwykła" to zadanie otwarte, nie automatyczny nakaz zamiany 1:1. "Celowa" oznacza pozostawienie do czasu, aż pełny odpowiednik zachowa wizualną geometrię, ARIA i gesty; wymaga odrębnych testów dostępności.

| Ścieżka pod `apps/mobile/src/`                                          | Liczba | Klasa                        | Uzasadnienie / dalsza praca                                                                                |
| ----------------------------------------------------------------------- | -----: | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `app/DevCommandPalette.tsx`                                             |      2 | 2 celowe                     | Reset all i Clear errors migrowano do IonButton; wybory języka i motywu zachowują własne aria-pressed      |
| `app/StandalonePulseInstallationDetail.tsx`                             |      3 | 3 zwykłe                     | Usuwanie/odinstalowanie automatyki, w tym potwierdzenia; zachować blokadę pending i wyłączenie przekaźnika |
| `components/AppBottomNavigation.tsx`                                    |      3 | 3 celowe                     | Trwała nawigacja Plugs / Thermometers / Settings                                                           |
| `components/AppPageBack.tsx`                                            |      1 | 1 celowa                     | Nawigacja zagnieżdżonego ekranu                                                                            |
| `components/EditablePlugName.tsx`                                       |      1 | 1 celowa                     | Ikonowa akcja wejścia w edycję nazwy                                                                       |
| `components/RefreshIconButton.tsx`                                      |      1 | 1 celowa                     | Wspólny ikonowy refresh ze stanem busy                                                                     |
| `features/automations/components/ClimateInstallationDetailSections.tsx` |      2 | 2 zwykłe (Climate)           | Odzyskiwanie/akcja i skanowanie, wizualnie chronione                                                       |
| `features/automations/components/ClimateRuleAdvancedSettings.tsx`       |      5 | 4 chronione input + 1 zwykła | Numeryczne limity Climate oraz akcja przywrócenia wartości domyślnych                                      |
| `features/automations/components/ClimateRuleDeviceSelectors.tsx`        |      1 | 1 chroniony input            | Checkbox wyboru urządzenia Climate                                                                         |
| `features/automations/components/ClimateRuleEditor.tsx`                 |      7 | 4 chronione input + 3 zwykłe | Progi i VPD; podgląd/wczytanie skryptu oraz instalacja w zamrożonym układzie                               |
| `features/automations/components/PulseCycleEditor.tsx`                  |      1 | 1 chroniony input            | Numeryczne pole współdzielonego edytora w trybie Climate                                                   |
| `features/plugs/components/PlugAddSpeedDial.tsx`                        |      3 | 3 celowe                     | Geometria i gesty dedykowanego speed dial Wi-Fi/Bluetooth                                                  |
| `features/plugs/components/PlugAutomationModeControl.tsx`               |      2 | 2 celowe                     | AUTO/MANUAL: sprzężenie wizualne ze stanem bezpieczeństwa                                                  |
| `features/plugs/components/PlugDashboardCardShell.tsx`                  |      1 | 1 celowa                     | Ikonowe otwarcie szczegółów, zachować ochronę przed klikami w IonInput                                     |
| `features/plugs/components/PlugDetailTabs.tsx`                          |      1 | 1 celowa                     | Dedykowane zakładki szczegółów i aria-current                                                              |
| `features/plugs/components/PlugLedColorEditor.tsx`                      |      3 | 3 celowe                     | Próbki kolorów pozostają własnymi przyciskami; Apply jest teraz IonButton                                  |
| `features/plugs/components/PlugRelayControls.tsx`                       |      2 | 2 celowe                     | Fizyczne ON/OFF; nie zmieniać semantyki ani runtime                                                        |
| `features/plugs/screens/BlePlugDetailScreen.tsx`                        |      1 | 1 zwykła                     | Usuwanie zapisanego BLE Pluga                                                                              |
| `features/plugs/screens/WifiPlugDetailScreen.tsx`                       |      1 | 1 zwykła                     | Usuwanie zapisanego Wi-Fi Pluga                                                                            |
| `features/thermometers/components/SavedSensorCard.tsx`                  |      4 | 4 celowe                     | Ikonowe edytuj/szczegóły/synchronizuj/usuń z etykietami                                                    |
| `features/thermometers/components/SensorRemovalBlockedModal.tsx`        |      1 | 1 zwykła                     | Nawigacja do automatyki używa IonButton; natywne potwierdzenie usunięcia pozostało                         |
| `screens/InstallationDetailScreen.tsx`                                  |      3 | 3 zwykłe                     | Akcje usunięcia automatyki i potwierdzenia; weryfikacja tożsamości zostaje w flow                          |
| `screens/SetupIntentScreen.tsx`                                         |      2 | 2 celowe                     | Przyciski-karty wyboru intencji nawigacyjnej                                                               |
| `screens/TimeInstallationDetail.tsx`                                    |      3 | 3 zwykłe                     | Usunięcie automatyki Time i potwierdzenia                                                                  |
| `screens/hardware-setup/pages/RuleSetupPage.tsx`                        |      2 | 2 zwykłe (Climate)           | Wczytywanie/skanowanie i bezpieczny test przekaźnika; frozen master                                        |
| `screens/hardware-setup/pages/SensorSetupPage.tsx`                      |      1 | 1 celowa                     | Fab/gest dodawania sensora                                                                                 |
| `screens/hardware-setup/pages/ShellySettingsContent.tsx`                |      1 | 1 zwykła                     | Skan BLE w ustawieniach jest IonButton z aria-label; usuwanie ma przycisk natywny                          |
| `screens/hardware-setup/pages/ShellySetupPage.tsx`                      |      1 | 1 celowa                     | Fab dodawania Shelly; odrębny zwykły retry przeniesiony do IonButton w c7184509                            |
| `screens/hardware-setup/pages/ShellySetupPresentation.tsx`              |      3 | 3 celowe                     | Ikonowe edytuj/ustawienia/usuń pozostają; skan BLE na zapisanej karcie używa IonButton                     |
| `screens/hardware-setup/pages/TimeScheduleSetupPage.tsx`                |      3 | 3 celowe                     | Pokrętło czasu + dwa triggery dialogu HH/MM                                                                |

## Osobny pakiet `@lcl/ui`

W `packages/ui/src` pozostaje **7 własnych przycisków** (niezaliczonych do 67): `InfoPopover` 1, `ToastViewport` 1, `Modal` 1, `ScriptPreview` 1, `SegmentedControl` 1, `SelectField` 2. To współdzielone prymitywy ikonowe/klawiatury/focus/listbox; `@lcl/ui` nie powinno importować Ionic wyłącznie dla statystycznego zera. Najpierw zweryfikować współpracę focus trap `Modal` z hostami Ionic. Nie zmieniać pakietowej warstwy na podstawie samego skanu regex.

## Ograniczenia i kryterium ukończenia

- Regresja `16-climate-setup` podczas poprzedniej migracji pól Climate (~15,000 pikseli różnicy) została wycofana; nie aktualizować baseline by ją ukryć.
- Poprzedni szeroki refaktor przycisków i focus trap modalnego spowodował 17 błędów testowych i został wycofany. Zmieniać tylko testowane grupy funkcjonalne.
- Ukończenie wymaga rozpatrzenia wszystkich 22 zwykłe przyciski, a nie tylko zielonego TypeScriptu; sprawdzić w szczególności modale, klawiaturę i czytniki ekranu Androida.
- Źródłem wyników integracyjnych i pomiaru bundla pozostaje `docs/testing/2026-10-10-ionic-independent-audit.md`; ostatni wynik źródłowego `pnpm check` sprzed tej partii był 549/549, E2E 50/50. Po zmianie `c7184509` pełna rekwalifikacja jest wykonywana osobno.

## Uzupełnienie — 2026-10-10

Migracje: LED Apply (`227927674`), Plug blocked navigation (`69285bb259`) oraz Thermometer blocked navigation (`aa172d673`). Niezmieniona ochrona właściciela automatyki została zweryfikowana w osobnych testach.

Headless emulator medium_phone (Android 16, arm64) nie osiągnął boot_completed w limicie, przed instalacją APK. Emulator został wyłączony; telefon pozostał nietknięty.

## Latest small action migrations — 2026-10-10

The BLE discovery modal restart now uses IonButton and keeps busy semantics via aria-busy on the native dialog; hydration otherwise left aria-busy=false on the inner native ion-button. This issue was reproduced and fixed at commit c3e5033caab102a3b9c00d4b5691fe889b9a17fe. Two developer palette commands also use IonButton at 595ce2a3d67c02bda1c66f08f02896a09072be42. Intentional language/theme toggles retain aria-pressed. Historical checkpoint: 58 native buttons plus 10 protected Climate inputs.

## Shelly BLE settings action — 2026-10-10 (latest count)

Commit 1a6021e8 migrated only the settings-detail BLE scan action to Ionic, with explicit aria-label. A different same-labeled saved-device-card scan remains native. Both focused integration scenarios passed 2/2, alongside TypeScript and quality gates. Current count: 67 native JSX controls (57 buttons + 10 frozen Climate inputs), 23 ordinary pending actions, 34 intentional custom buttons, in 31 files.

## Saved Shelly BLE card — accepted 2026-10-11

Commit d4485ad76fdcf9b03d39270344e6df2561b86f81 migrated the compact saved-card BLE scan button to IonButton, retaining callback, busy-disabled semantics and card styling. The 58 hardware setup tests passed, as did a canonical phone-large BLE E2E with screenshot 04-plug-ble-discovery. Entire 50-case visual E2E passed without snapshot changes. Full pnpm check passed 554/554 mobile tests, Capacitor sync and Android debug assembly passed. Total remaining 66 native JSX controls (56 button, 10 frozen Climate inputs), with 22 ordinary actions and 34 intentional custom controls. No phone or physical Shelly device was contacted.

## Zatwierdzony checkpoint — 2026-10-11, Plug Delete IonButton

Commit produktu `bc0b1a9e806c080648d635943e2ce5bd3f17f4f6` kończy migrację przycisku potwierdzenia usunięcia Pluga. Ochrony identyfikacji, fizycznego safe-OFF i trwałe rekordy nie zostały zmienione.

65 natywnych kontrolek: 55 przycisków, 10 pól Climate, w 30 plikach. 21 zwykłych akcji pozostaje do rozpatrzenia; 34 celowe przyciski i 10 pól Climate są chronione kontraktem UX.
