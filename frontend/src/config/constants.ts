export const CONTRACT_ADDRESS = "0x1128BdaDdf8717319BBf6086d70455B0b99ce9ef";

export const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

export interface EncryptedPrivateKey {
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
}

// Styles
export const styles = {
  card: { background: '#18181b', padding: '24px', borderRadius: '12px', border: '1px solid #27272a' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #27272a', fontSize: '14px', background: '#18181b', color: '#e4e4e7' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#a1a1aa' },
  button: { padding: '12px 24px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  buttonSecondary: { padding: '10px 20px', background: '#27272a', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  buttonDanger: { padding: '10px 20px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
};

