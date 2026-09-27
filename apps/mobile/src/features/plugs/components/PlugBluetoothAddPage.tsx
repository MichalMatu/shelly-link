import { usePlugBleAddFlow } from '../flows/usePlugBleAddFlow.js';
import { useSavedPlugStore } from '../state/savedPlugStore.js';
import { PlugBluetoothAddPanel } from './PlugBluetoothAddPanel.js';

export const PlugBluetoothAddPage = () => {
  const bluetooth = usePlugBleAddFlow();
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const saveCandidate = useSavedPlugStore((state) => state.saveBleCandidate);

  return (
    <main className="demo-shell hardware-shell">
      <section className="device-add-page shelly-add-page">
        <PlugBluetoothAddPanel
          scanning={bluetooth.scanning}
          candidates={bluetooth.candidates}
          inspectingDeviceId={bluetooth.inspectingDeviceId}
          verifiedCandidates={bluetooth.verifiedCandidates}
          savedPhysicalIds={savedPlugs.map((plug) => plug.physicalId)}
          error={bluetooth.error}
          onStart={bluetooth.startScan}
          onStop={bluetooth.stopScan}
          onAdd={(candidate) => {
            void bluetooth.verifyCandidate(candidate).then((verified) => {
              if (verified) saveCandidate(verified);
            });
          }}
        />
      </section>
    </main>
  );
};
