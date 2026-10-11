from pathlib import Path

path = Path('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx')
text = path.read_text()

replacements = [
    (
        "import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';",
        "import { I18nProvider, setLocalePreference, translate } from '../../../app/i18n.js';",
    ),
    (
        "screen.getByRole('button', { name: 'Ustawienia termometru Xiaomi salon' }).click();",
        "screen\n      .getByRole('button', {\n        name: translate('pl', 'hardware.sensor.settingsAria', { name: device.name })\n      })\n      .click();",
    ),
    (
        "expect(screen.queryByRole('button', { name: 'Nazwa termometru' })).toBeNull();",
        "expect(\n      screen.queryByRole('button', {\n        name: translate('pl', 'hardware.sensor.nameLabel')\n      })\n    ).toBeNull();",
    ),
    (
        "name: 'Ustaw czas Xiaomi/PVVX zgodnie z telefonem'",
        "name: translate('pl', 'hardware.sensor.pvvxSetTimeTitle')",
    ),
    (
        "expect(screen.queryByRole('button', { name: 'Usuń termometr tylko z aplikacji' })).toBeNull();",
        "expect(\n      screen.queryByRole('button', {\n        name: translate('pl', 'hardware.sensor.deleteTitle')\n      })\n    ).toBeNull();",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'expected one i18n test anchor, got {count}: {old}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('Replaced hardcoded Polish selectors in colocated sensor presentation test')
