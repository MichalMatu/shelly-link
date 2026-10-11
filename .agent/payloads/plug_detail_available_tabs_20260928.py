from pathlib import Path

p = Path('apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx')
s = p.read_text()
s = s.replace(
"""type PlugDetailTabsProps = {\n  activeTab: PlugDetailTab;\n  onChange(tab: PlugDetailTab): void;\n  disabledTabs?: readonly PlugDetailTab[];\n};\n""",
"""type PlugDetailTabsProps = {\n  activeTab: PlugDetailTab;\n  onChange(tab: PlugDetailTab): void;\n  availableTabs?: readonly PlugDetailTab[];\n  disabledTabs?: readonly PlugDetailTab[];\n};\n""",
1)
s = s.replace(
"""export const PlugDetailTabs = ({\n  activeTab,\n  onChange,\n  disabledTabs = []\n}: PlugDetailTabsProps) => {\n  const { t } = useTranslation();\n\n  return (\n    <nav\n      className=\"plug-detail-tabs lcl-segmented-control\"\n      aria-label={t('hardware.shelly.actionsLabel')}\n    >\n      {tabs.map((tab) => {\n""",
"""export const PlugDetailTabs = ({\n  activeTab,\n  onChange,\n  availableTabs,\n  disabledTabs = []\n}: PlugDetailTabsProps) => {\n  const { t } = useTranslation();\n  const visibleTabs = availableTabs\n    ? tabs.filter((tab) => availableTabs.includes(tab.id))\n    : tabs;\n\n  return (\n    <nav\n      className=\"plug-detail-tabs lcl-segmented-control\"\n      aria-label={t('hardware.shelly.actionsLabel')}\n      data-tab-count={visibleTabs.length}\n    >\n      {visibleTabs.map((tab) => {\n""",
1)
p.write_text(s)

p = Path('apps/mobile/src/features/plugs/components/PlugDetailTop.tsx')
s = p.read_text()
s = s.replace(
"""type PlugDetailTopProps = {\n  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];\n  disabledTabs?: readonly PlugDetailTab[] | undefined;\n};\n\nexport const PlugDetailTop = ({ tabs, disabledTabs }: PlugDetailTopProps) => {\n""",
"""type PlugDetailTopProps = {\n  tabs: readonly [PlugDetailTab, (tab: PlugDetailTab) => void];\n  availableTabs?: readonly PlugDetailTab[] | undefined;\n  disabledTabs?: readonly PlugDetailTab[] | undefined;\n};\n\nexport const PlugDetailTop = ({\n  tabs,\n  availableTabs,\n  disabledTabs\n}: PlugDetailTopProps) => {\n""",
1)
s = s.replace(
"""      activeTab={activeTab}\n      onChange={onChange}\n      {...(disabledTabs ? { disabledTabs } : {})}\n""",
"""      activeTab={activeTab}\n      onChange={onChange}\n      {...(availableTabs ? { availableTabs } : {})}\n      {...(disabledTabs ? { disabledTabs } : {})}\n""",
1)
p.write_text(s)

p = Path('apps/mobile/src/features/plugs/components/PlugDetailTabs.css')
s = p.read_text()
anchor = """.plug-detail-tabs {\n  display: grid;\n  grid-template-columns: repeat(var(--plug-detail-tab-count, 5), minmax(0, 1fr));\n  position: sticky;\n  top: var(--lcl-spacing-sm);\n  z-index: var(--lcl-z-index-header);\n}\n"""
assert anchor in s
addition = anchor + """\n.plug-detail-tabs[data-tab-count='1'] {\n  --plug-detail-tab-count: 1;\n}\n\n.plug-detail-tabs[data-tab-count='2'] {\n  --plug-detail-tab-count: 2;\n}\n\n.plug-detail-tabs[data-tab-count='3'] {\n  --plug-detail-tab-count: 3;\n}\n\n.plug-detail-tabs[data-tab-count='4'] {\n  --plug-detail-tab-count: 4;\n}\n\n.plug-detail-tabs[data-tab-count='5'] {\n  --plug-detail-tab-count: 5;\n}\n"""
p.write_text(s.replace(anchor, addition, 1))
