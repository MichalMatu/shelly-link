from pathlib import Path

path = Path('apps/mobile/src/__tests__/app-routes.test.tsx')
text = path.read_text()
start = text.index("const addTimeInstallation =")
end = text.index("describe('AppRoutes navigation shell'", start)
path.write_text(text[:start] + text[end:])
