import { CONTRACT_ADDRESS, styles } from "../config/constants";

interface VaultSettingsTabProps {
  address: string | null;
  onLock: () => void;
  onDisconnect: () => void;
  onCopy: (text: string) => void;
}

export function VaultSettingsTab({ address, onLock, onDisconnect, onCopy }: VaultSettingsTabProps) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Vault Settings</h3>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ padding: '16px', background: '#27272a', borderRadius: '10px', border: '1px solid #3f3f46' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#e4e4e7', fontSize: '16px', fontWeight: '600' }}>Security</h4>
          <button
            onClick={onLock}
            style={{ ...styles.buttonSecondary, width: '100%', marginBottom: '12px' }}
          >
            Lock Vault
          </button>
          <button
            onClick={onDisconnect}
            style={{ ...styles.buttonDanger, width: '100%' }}
          >
            Disconnect Wallet
          </button>
        </div>
        <div style={{ padding: '16px', background: '#27272a', borderRadius: '10px', border: '1px solid #3f3f46' }}>
          <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#e4e4e7', fontSize: '16px', fontWeight: '600' }}>Contract Address</h4>
          <div style={{ fontSize: '13px', wordBreak: 'break-all', color: '#a1a1aa', fontFamily: 'monospace', marginBottom: '12px' }}>
            {CONTRACT_ADDRESS}
          </div>
          <button
            onClick={() => onCopy(CONTRACT_ADDRESS)}
            style={{ ...styles.buttonSecondary, fontSize: '12px', padding: '6px 12px' }}
          >
            Copy Address
          </button>
        </div>
        <div style={{ padding: '16px', background: '#27272a', borderRadius: '10px', border: '1px solid #3f3f46' }}>
          <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#e4e4e7', fontSize: '16px', fontWeight: '600' }}>Wallet Address</h4>
          <div style={{ fontSize: '13px', wordBreak: 'break-all', color: '#a1a1aa', fontFamily: 'monospace' }}>
            {address || 'Not connected'}
          </div>
        </div>
      </div>
    </div>
  );
}

