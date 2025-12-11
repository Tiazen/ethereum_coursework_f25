import { styles } from "../config/constants";

interface WalletConnectionProps {
  privateKey: string;
  setPrivateKey: (key: string) => void;
  onConnect: () => void;
  loading: boolean;
}

export function WalletConnection({ privateKey, setPrivateKey, onConnect, loading }: WalletConnectionProps) {
  return (
    <div style={styles.card}>
      <h2 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '24px', fontWeight: '600' }}>Connect Wallet</h2>
      <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '14px' }}>
        Enter your private key to connect your wallet.
      </p>
      <div style={{ marginBottom: '24px' }}>
        <label style={styles.label}>Private Key</label>
        <input
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="0x..."
          style={styles.input}
        />
      </div>
      <button
        onClick={onConnect}
        disabled={loading}
        style={{ ...styles.button, width: '100%', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}

