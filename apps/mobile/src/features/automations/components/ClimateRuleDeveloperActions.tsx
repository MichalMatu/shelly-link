import { useTranslation } from '../../../app/i18n.js';
import { CodeIcon } from '../../../components/icons/CodeIcon.js';
import type { ClimateRuleEditorProps } from './ClimateRuleEditor.js';

type Props = Pick<
  ClimateRuleEditorProps,
  | 'canPreviewScript'
  | 'hasSelectedShelly'
  | 'loadScriptPending'
  | 'openScriptPreview'
  | 'loadScriptFromShelly'
>;

export const ClimateRuleDeveloperActions = (props: Props) => {
  const { t } = useTranslation();
  return (
    <div className="action-row rule-developer-actions rule-developer-actions--compact">
      <button
        className="secondary-action"
        type="button"
        disabled={!props.canPreviewScript}
        title={t('hardware.rule.scriptPreviewTitle')}
        onClick={props.openScriptPreview}
      >
        <CodeIcon />
        {t('hardware.rule.scriptPreview')}
      </button>
      <button
        className="secondary-action"
        type="button"
        aria-busy={props.loadScriptPending}
        disabled={!props.hasSelectedShelly || props.loadScriptPending}
        title={t('hardware.rule.loadScriptFromShellyTitle')}
        onClick={props.loadScriptFromShelly}
      >
        {props.loadScriptPending
          ? t('hardware.rule.loadingScriptFromShelly')
          : t('hardware.rule.loadScriptFromShelly')}
      </button>
    </div>
  );
};
