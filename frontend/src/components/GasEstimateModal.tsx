import { ethers } from "ethers";
import { styles } from "../config/constants";

interface GasEstimateModalProps {
  show: boolean;
  estimate: { gasLimit: bigint; gasPrice: bigint; cost: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function GasEstimateModal({ show, estimate, onConfirm, onCancel, loading }: GasEstimateModalProps) {
  if (!show || !estimate) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#18181b',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid #27272a',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        <h2 style={{ marginTop: 0, color: '#e4e4e7', fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
          Gas Estimation
        </h2>
        <p style={{ color: '#a1a1aa', marginBottom: '24px', fontSize: '14px' }}>
          Estimated gas cost for saving this credential:
        </p>
        <div style={{ background: '#27272a', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #3f3f46' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#71717a', fontSize: '14px' }}>Gas Limit:</span>
            <span style={{ color: '#e4e4e7', fontFamily: 'monospace', fontSize: '14px' }}>
              {estimate.gasLimit.toString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#71717a', fontSize: '14px' }}>Gas Price:</span>
            <span style={{ color: '#e4e4e7', fontFamily: 'monospace', fontSize: '14px' }}>
              {ethers.formatUnits(estimate.gasPrice, 'gwei')} gwei
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #3f3f46' }}>
            <span style={{ color: '#a1a1aa', fontSize: '16px', fontWeight: '600' }}>Estimated Cost:</span>
            <span style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: '18px', fontWeight: '700' }}>
              {parseFloat(estimate.cost).toFixed(6)} ETH
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{ ...styles.buttonSecondary, flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ ...styles.button, flex: 1, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

