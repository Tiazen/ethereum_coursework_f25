import { styles } from "../config/constants";

interface VaultManagementProps {
  vaultExists: boolean;
  isVaultUnlocked: boolean;
  masterPassword: string;
  setMasterPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  onCreate: () => void;
  onUnlock: () => void;
  loading: boolean;
}

export function VaultManagement({
  vaultExists,
  isVaultUnlocked,
  masterPassword,
  setMasterPassword,
  confirmPassword,
  setConfirmPassword,
  onCreate,
  onUnlock,
  loading,
}: VaultManagementProps) {
  if (!vaultExists && !isVaultUnlocked) {
    return (
      <div style={styles.card}>
        <h2 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '24px', fontWeight: '600' }}>Create Vault</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '14px' }}>
          Create a master password to encrypt all your credentials on the blockchain.
        </p>
        <div style={{ marginBottom: '16px' }}>
          <label style={styles.label}>Master Password</label>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            style={styles.input}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            style={styles.input}
          />
        </div>
        <button
          onClick={onCreate}
          disabled={loading}
          style={{ ...styles.button, width: '100%', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Creating...' : 'Create Vault'}
        </button>
      </div>
    );
  }

  if (!isVaultUnlocked) {
    return (
      <div style={styles.card}>
        <h2 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '24px', fontWeight: '600' }}>Unlock Vault</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '14px' }}>Enter your master password to access credentials.</p>
        <div style={{ marginBottom: '24px' }}>
          <label style={styles.label}>Master Password</label>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Enter password"
            onKeyPress={(e) => e.key === 'Enter' && onUnlock()}
            style={styles.input}
          />
        </div>
        <button
          onClick={onUnlock}
          disabled={loading}
          style={{ ...styles.button, width: '100%', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>
    );
  }

  return null;
}

