import { ethers } from "ethers";
import { styles } from "../config/constants";

interface StatusBarProps {
  network: ethers.Network | null;
  address: string | null;
  isVaultUnlocked: boolean;
  isWalletConnected: boolean;
  onDisconnect: () => void;
}

export function StatusBar({ network, address, isVaultUnlocked, isWalletConnected, onDisconnect }: StatusBarProps) {
  return (
    <div style={{ background: '#18181b', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #27272a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#71717a' }}>Network:</span>
          <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: '12px' }}>{network?.chainId.toString() || 'Disconnected'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#71717a' }}>Address:</span>
          <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: '12px' }}>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isVaultUnlocked ? '#10b981' : '#71717a', display: 'inline-block' }}></span>
          <span style={{ color: isVaultUnlocked ? '#10b981' : '#71717a', fontWeight: '500' }}>
            {isVaultUnlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        {isWalletConnected && (
          <button
            onClick={onDisconnect}
            style={{ ...styles.buttonSecondary, padding: '6px 12px', fontSize: '12px' }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

