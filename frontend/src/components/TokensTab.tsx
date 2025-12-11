import { styles } from "../config/constants";

interface TokensTabProps {
  websites: string[];
  selectedWebsite: string;
  setSelectedWebsite: (website: string) => void;
  generatedToken: string;
  onGenerate: (website: string) => void;
  onCopy: (text: string) => void;
  loading: boolean;
}

export function TokensTab({
  websites,
  selectedWebsite,
  setSelectedWebsite,
  generatedToken,
  onGenerate,
  onCopy,
  loading,
}: TokensTabProps) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '18px', fontWeight: '600' }}>Generate JWT Token</h3>
      <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '20px' }}>
        Generate a signed JWT token for authentication using your stored credentials.
      </p>
      <div style={{ marginBottom: '20px' }}>
        <label style={styles.label}>Select Website</label>
        <select
          value={selectedWebsite}
          onChange={(e) => setSelectedWebsite(e.target.value)}
          style={styles.input}
        >
          <option value="">Select a website</option>
          {websites.map((website) => (
            <option key={website} value={website}>{website}</option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onGenerate(selectedWebsite)}
        disabled={!selectedWebsite || loading}
        style={{ ...styles.button, opacity: (!selectedWebsite || loading) ? 0.5 : 1, cursor: (!selectedWebsite || loading) ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Generating...' : 'Generate Token'}
      </button>

      {generatedToken && (
        <div style={{ marginTop: '24px', padding: '16px', background: '#27272a', borderRadius: '10px', border: '1px solid #3f3f46' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: '500' }}>Generated Token</span>
            <button
              onClick={() => onCopy(generatedToken)}
              style={{ padding: '6px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
            >
              Copy
            </button>
          </div>
          <textarea
            value={generatedToken}
            readOnly
            rows={8}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', fontSize: '12px', fontFamily: 'monospace', background: '#18181b', color: '#a1a1aa', resize: 'vertical' }}
          />
        </div>
      )}
    </div>
  );
}

