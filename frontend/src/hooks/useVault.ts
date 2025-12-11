import { ethers } from "ethers";
import { useEffect, useState } from "react";
import type { EncryptedPrivateKey } from "../config/constants";
import { vaultService } from "../services/VaultService";
import { decryptPrivateKey, encryptPrivateKey, restoreWalletConnection } from "../utils/wallet";

interface UseVaultProps {
  signer: ethers.Wallet | null;
  address: string | null;
  contract: ethers.Contract | undefined;
  isWalletConnected: boolean;
  setProvider: (provider: ethers.JsonRpcProvider | null) => void;
  setSigner: (signer: ethers.Wallet | null) => void;
  setAddress: (address: string | null) => void;
  setContract: (contract: ethers.Contract | undefined) => void;
  setIsWalletConnected: (connected: boolean) => void;
}

export function useVault({
  signer,
  address,
  contract,
  setProvider,
  setSigner,
  setAddress,
  setContract,
  setIsWalletConnected,
}: UseVaultProps) {
  const [vaultExists, setVaultExists] = useState<boolean>(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [masterPassword, setMasterPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [websites, setWebsites] = useState<string[]>([]);

  useEffect(() => {
    const checkVaultState = async () => {
      try {
        const stored = await browser.storage.local.get(['vaultExists', 'vaultUnlockedAt', 'masterPassword']);
        if (stored.vaultExists === true) {
          setVaultExists(true);
        }

        if (stored.vaultUnlockedAt && stored.masterPassword) {
          const unlockedAt = stored.vaultUnlockedAt;
          const now = Date.now();
          const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

          if (now - unlockedAt < fifteenMinutes) {
            console.log('[App] Vault was unlocked recently, auto-unlocking...');
            try {
              const walletStored = await browser.storage.local.get(['encryptedWalletPrivateKey']);
              if (walletStored.encryptedWalletPrivateKey) {
                const encryptedKey = walletStored.encryptedWalletPrivateKey as EncryptedPrivateKey;
                const decryptedPrivateKey = await decryptPrivateKey(encryptedKey, stored.masterPassword);
                const walletData = await restoreWalletConnection(decryptedPrivateKey);
                
                setProvider(walletData.provider);
                setSigner(walletData.signer);
                setAddress(walletData.address);
                setContract(walletData.contract);
                setIsWalletConnected(true);
                
                vaultService.setContract(walletData.contract, walletData.address);
                
                console.log('[App] Wallet connection restored from encrypted private key');
                
                try {
                  const success = await vaultService.unlockVault(stored.masterPassword);
                  if (success) {
                    setIsVaultUnlocked(true);
                    console.log('[App] Vault auto-unlocked successfully');
                  } else {
                    // Password wrong or vault changed, clear stored password
                    await browser.storage.local.remove(['masterPassword', 'vaultUnlockedAt']);
                  }
                } catch (err) {
                  console.error('[App] Auto-unlock failed:', err);
                  await browser.storage.local.remove(['masterPassword', 'vaultUnlockedAt']);
                }
              } else {
                console.log('[App] No encrypted private key found, skipping auto-unlock');
              }
            } catch (err) {
              console.error('[App] Failed to restore wallet connection during auto-unlock:', err);
              await browser.storage.local.remove(['masterPassword', 'vaultUnlockedAt']);
            }
          } else {
            console.log('[App] Vault unlock expired, clearing stored password');
            await browser.storage.local.remove(['masterPassword', 'vaultUnlockedAt']);
          }
        }
      } catch (err) {
        console.error('Failed to check vault state:', err);
      }
    };
    checkVaultState();
  }, []);

  useEffect(() => {
    const initContract = async () => {
      if (signer && address && contract) {
        vaultService.setContract(contract, address);

        try {
          const exists = await vaultService.vaultExists();
          setVaultExists(exists);

          if (isVaultUnlocked) {
            console.log('[App] Contract ready and vault unlocked, loading websites');
            setTimeout(async () => {
              try {
                const sites = await vaultService.getAllWebsites();
                setWebsites(sites);
                console.log('[App] Loaded websites:', sites.length);
              } catch (err: any) {
                if (err.message && err.message.includes('Contract not initialized')) {
                  console.log('[App] Contract not ready yet, will retry later');
                  return;
                }
                console.error('[App] Failed to load websites:', err);
              }
            }, 100);
          }
        } catch (err) {
          console.error('Failed to check vault existence:', err);
        }
      }
    };
    initContract();
  }, [signer, address, contract, isVaultUnlocked]);

  const createVault = async (
    setError: (msg: string) => void,
    setSuccess: (msg: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!masterPassword || masterPassword.length < 8) {
      setError("Master password must be at least 8 characters");
      return;
    }
    if (masterPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await vaultService.createVault(masterPassword);
      setVaultExists(true);
      setIsVaultUnlocked(true);
      setSuccess("Vault created successfully");
      
      await browser.storage.local.set({
        vaultExists: true,
        masterPassword: masterPassword,
        vaultUnlockedAt: Date.now()
      });
      
      if (signer && address && signer instanceof ethers.Wallet) {
        try {
          const walletPrivateKey = signer.privateKey;
          const encryptedKey = await encryptPrivateKey(walletPrivateKey, masterPassword);
          await browser.storage.local.set({
            encryptedWalletPrivateKey: encryptedKey
          });
          console.log('[App] Encrypted and stored wallet private key');
        } catch (err) {
          console.error('[App] Failed to encrypt and store private key:', err);
        }
      }
      
      setMasterPassword("");
      setConfirmPassword("");

      browser.runtime.sendMessage({ type: 'VAULT_UNLOCKED' });
    } catch (err: any) {
      setError(err.message || "Failed to create vault");
    } finally {
      setLoading(false);
    }
  };

  const unlockVault = async (
    setError: (msg: string) => void,
    setSuccess: (msg: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!masterPassword) {
      setError("Please enter your master password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await vaultService.unlockVault(masterPassword);
      if (success) {
        setIsVaultUnlocked(true);
        setSuccess("Vault unlocked");
        
        await browser.storage.local.set({
          masterPassword: masterPassword,
          vaultUnlockedAt: Date.now()
        });
        
        setMasterPassword("");
        
        try {
          const stored = await browser.storage.local.get(['encryptedWalletPrivateKey']);
          if (stored.encryptedWalletPrivateKey) {
            const encryptedKey = stored.encryptedWalletPrivateKey as EncryptedPrivateKey;
            const decryptedPrivateKey = await decryptPrivateKey(encryptedKey, masterPassword);
            const walletData = await restoreWalletConnection(decryptedPrivateKey);
            
            setProvider(walletData.provider);
            setSigner(walletData.signer);
            setAddress(walletData.address);
            setContract(walletData.contract);
            setIsWalletConnected(true);
            
            await browser.storage.local.set({
              walletAddress: walletData.address,
            });
            
            console.log('[App] Wallet connection restored from encrypted private key');
            setSuccess("Vault unlocked and wallet restored");
          } else if (signer && address && signer instanceof ethers.Wallet) {
            try {
              const walletPrivateKey = signer.privateKey;
              const encryptedKey = await encryptPrivateKey(walletPrivateKey, masterPassword);
              await browser.storage.local.set({
                encryptedWalletPrivateKey: encryptedKey
              });
              console.log('[App] Encrypted and stored wallet private key after vault unlock');
            } catch (err) {
              console.error('[App] Failed to encrypt and store private key:', err);
            }
          }
        } catch (err: any) {
          console.error('[App] Failed to restore wallet connection:', err);
        }
        
        try {
          const sites = await vaultService.getAllWebsites();
          setWebsites(sites);
        } catch (err) {
          console.error('Failed to load websites after unlock:', err);
        }

        browser.runtime.sendMessage({ type: 'VAULT_UNLOCKED' });
      } else {
        setError("Incorrect master password");
      }
    } catch (err: any) {
      setError(err.message || "Failed to unlock vault");
    } finally {
      setLoading(false);
    }
  };

  const lockVault = async (
    setViewingCredential: (cred: any) => void,
    setGeneratedToken: (token: string) => void,
    setSuccess: (msg: string) => void
  ) => {
    vaultService.lockVault();
    setIsVaultUnlocked(false);
    setWebsites([]);
    setViewingCredential(null);
    setGeneratedToken("");
    setSuccess("Vault locked");

    await browser.storage.local.remove(['masterPassword', 'vaultUnlockedAt', 'encryptedWalletPrivateKey']);

    browser.runtime.sendMessage({ type: 'VAULT_LOCKED' });
  };

  return {
    vaultExists,
    setVaultExists,
    isVaultUnlocked,
    setIsVaultUnlocked,
    masterPassword,
    setMasterPassword,
    confirmPassword,
    setConfirmPassword,
    websites,
    setWebsites,
    createVault,
    unlockVault,
    lockVault,
  };
}

