import { styles } from "../config/constants";
import type { StoredCredential } from "../services/VaultService";

interface CredentialsTabProps {
  credentialForm: {
    website: string;
    username: string;
    password: string;
    notes: string;
  };
  setCredentialForm: (form: any) => void;
  websites: string[];
  viewingCredential: StoredCredential | null;
  selectedWebsite: string;
  onSave: () => void;
  onView: (website: string) => void;
  onDelete: (website: string) => void;
  onFillOnPage: (website: string) => void;
  onCopy: (text: string) => void;
  loading: boolean;
}

export function CredentialsTab({
  credentialForm,
  setCredentialForm,
  websites,
  viewingCredential,
  selectedWebsite,
  onSave,
  onView,
  onDelete,
  onFillOnPage,
  onCopy,
  loading,
}: CredentialsTabProps) {
  return (
    <div>
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '18px', fontWeight: '600' }}>Add Credential</h3>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={styles.label}>Website/Domain</label>
            <input
              type="text"
              value={credentialForm.website}
              onChange={(e) => setCredentialForm({ ...credentialForm, website: e.target.value })}
              placeholder="example.com"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Username/Email</label>
            <input
              type="text"
              value={credentialForm.username}
              onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
              placeholder="user@example.com"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={credentialForm.password}
              onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
              placeholder="••••••••"
              style={styles.input}
            />
          </div>
          <button
            onClick={onSave}
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Saving...' : 'Save Credential'}
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Saved Credentials <span style={{ color: '#71717a', fontSize: '16px', fontWeight: '400' }}>({websites.length})</span>
        </h3>
        {websites.length === 0 ? (
          <p style={{ color: '#71717a', textAlign: 'center', padding: '40px 0' }}>No credentials saved yet</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {websites.map((website) => (
              <div
                key={website}
                style={{ padding: '16px', border: '1px solid #27272a', borderRadius: '10px', background: selectedWebsite === website ? '#27272a' : '#18181b' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', color: '#e4e4e7', fontSize: '15px' }}>{website}</div>
                    {viewingCredential && selectedWebsite === website && (
                      <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '12px', display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#71717a', minWidth: '80px' }}>Username:</span>
                          <span style={{ color: '#e4e4e7' }}>{viewingCredential.username}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#71717a', minWidth: '80px' }}>Password:</span>
                          <span style={{ color: '#e4e4e7' }}>{'•'.repeat(12)}</span>
                          <button onClick={() => onCopy(viewingCredential.password)} style={{ marginLeft: '8px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px' }}>Copy</button>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                          <button onClick={() => onFillOnPage(website)} style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500' }}>
                            🔐 Fill on Active Page
                          </button>
                        </div>
                        {viewingCredential.notes && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: '#71717a', minWidth: '80px' }}>Notes:</span>
                            <span style={{ color: '#e4e4e7' }}>{viewingCredential.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      onClick={() => onView(website)}
                      style={{ ...styles.buttonSecondary, padding: '8px 16px', fontSize: '13px' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => onDelete(website)}
                      style={{ ...styles.buttonDanger, padding: '8px 16px', fontSize: '13px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

