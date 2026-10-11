from pathlib import Path

path = Path('apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx')
source = path.read_text()
old = "  const { t } = useTranslation();\n\n  useEffect(() => {\n"
new = """  const { t } = useTranslation();
  const latest = latestSample(samples);
  const latestSeenAtMs = latest?.seenAtMs ?? null;
  const previousSeenAtMsRef = useRef<number | null>(latestSeenAtMs);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSamplePulseActive, setIsSamplePulseActive] = useState(false);
  const [samplePulseSequence, setSamplePulseSequence] = useState(0);

  useEffect(() => {
"""
count = source.count(old)
if count != 1:
    raise SystemExit(f'expected one SavedSensorCard state insertion point, got {count}')
path.write_text(source.replace(old, new, 1))
