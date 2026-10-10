import { IonInput } from '@ionic/react';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../app/i18n.js';

type EditablePlugNameProps = {
  name: string;
  variant: 'card' | 'detail';
  onCommit(value: string): void;
};

export const EditablePlugName = ({ name, variant, onCommit }: EditablePlugNameProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const startEditing = () => {
    setDraft(name);
    setEditing(true);
  };

  const finishEditing = (value: string) => {
    const normalized = value.trim();
    setEditing(false);
    setDraft(normalized || name);
    if (normalized && normalized !== name) {
      onCommit(normalized);
    }
  };

  if (editing) {
    return (
      <IonInput
        autofocus
        className={`plug-name-editor__input plug-name-editor__input--${variant}`}
        aria-label={t('hardware.shelly.deviceNameLabel')}
        type="text"
        value={draft}
        onIonInput={(event) => setDraft(String(event.detail.value ?? ''))}
        onIonBlur={() => finishEditing(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') finishEditing(draft);
          if (event.key === 'Escape') finishEditing(name);
        }}
      />
    );
  }

  const Heading = variant === 'detail' ? 'h1' : 'h2';
  return (
    <div className={`plug-name-editor plug-name-editor--${variant}`}>
      <Heading>{name}</Heading>
      <button
        className="icon-action rule-summary-icon-action plug-name-editor__action"
        type="button"
        aria-label={t('hardware.shelly.deviceNameLabel')}
        title={t('hardware.shelly.deviceNameLabel')}
        onClick={startEditing}
      >
        <IconPencil className="icon-action__svg" aria-hidden="true" />
      </button>
    </div>
  );
};
