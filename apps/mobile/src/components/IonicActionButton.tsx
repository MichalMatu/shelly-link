import { IonButton } from '@ionic/react';
import type { ComponentProps } from 'react';
import './IonicActionButton.css';

type IonicActionButtonProps = Omit<ComponentProps<typeof IonButton>, 'fill'>;

/**
 * The standard Ionic action with LCL geometry. Purpose-built icon, wheel,
 * relay and navigation controls retain their existing semantic primitives.
 */
export const IonicActionButton = ({
  className,
  ...props
}: IonicActionButtonProps) => (
  <IonButton
    {...props}
    className={['lcl-ionic-action', className].filter(Boolean).join(' ')}
    fill="clear"
    role="button"
    tabIndex={props.disabled ? -1 : 0}
  />
);
