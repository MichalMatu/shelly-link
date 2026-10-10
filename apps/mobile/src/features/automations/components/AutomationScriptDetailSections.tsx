import { IonicActionButton } from '../../../components/IonicActionButton.js';
import { DiagnosticRow, FeedbackPanel, ScriptPreview } from '@lcl/ui';

export type AutomationScriptDiagnosticRow = {
  label: string;
  value: string;
};

export type AutomationScriptDiagnosticsSectionProps = {
  title: string;
  rows: readonly AutomationScriptDiagnosticRow[];
};

export const AutomationScriptDiagnosticsSection = ({
  title,
  rows
}: AutomationScriptDiagnosticsSectionProps) => (
  <section className="plug-script-diagnostics plug-detail-framed-section">
    <h3 className="plug-detail-framed-section__title">{title}</h3>
    <div className="plug-info-grid">
      {rows.map((row) => (
        <DiagnosticRow key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  </section>
);

export type AutomationScriptDetailSectionProps = {
  attentionMessage?: string;
  attentionTitle: string;
  copyAriaLabel: string;
  copyLabel: string;
  error: boolean;
  errorTitle: string;
  loading: boolean;
  loadingLabel: string;
  previewLabel: string;
  retryLabel: string;
  source?: string;
  onCopy(): void;
  onRetry(): void;
};

export const AutomationScriptDetailSection = ({
  attentionMessage,
  attentionTitle,
  copyAriaLabel,
  copyLabel,
  error,
  errorTitle,
  loading,
  loadingLabel,
  previewLabel,
  retryLabel,
  source,
  onCopy,
  onRetry
}: AutomationScriptDetailSectionProps) => (
  <section>
    {attentionMessage && (
      <FeedbackPanel tone="warning" title={attentionTitle}>
        {attentionMessage}
      </FeedbackPanel>
    )}
    {loading && (
      <div className="plug-detail-loading plug-detail-loading--section" role="status">
        <span className="plug-detail-loading__spinner" aria-hidden="true" />
        <span>{loadingLabel}</span>
      </div>
    )}
    {error && (
      <FeedbackPanel tone="danger" title={errorTitle}>
        <IonicActionButton className="secondary-action" type="button" onClick={onRetry}>
          {retryLabel}
        </IonicActionButton>
      </FeedbackPanel>
    )}
    {source !== undefined && (
      <ScriptPreview
        code={source}
        copyAriaLabel={copyAriaLabel}
        copyLabel={copyLabel}
        label={previewLabel}
        variant="fill"
        onCopy={onCopy}
      />
    )}
  </section>
);
