import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { userStorage_contranct_abi as userStorage_contract_abi } from "../abi/UserStorage";
import { CONTRACT_ADDRESS, RPC_URL } from "../config/constants";
import { vaultService } from "../services/VaultService";
import { decryptPrivateKey, encryptPrivateKey, restoreWalletConnection } from "../utils/wallet";

export function useWallet() {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Wallet | null>(null);
  const [network, setNetwork] = useState<ethers.Network | null>(null);
  const [contract, setContract] = useState<ethers.Contract>();
  const [privateKey, setPrivateKey] = useState<string>("");
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);

  useEffect(() => {
    const getNetwork = async () => {
      if (provider && signer) {
        try {
          const network = await provider.getNetwork();
          setNetwork(network);
        } catch (err) {
          console.error('Failed to get network:', err);
        }
      }
    };
    getNetwork();
  }, [provider, signer]);

  useEffect(() => {
    const initContract = async () => {
      if (signer && address && contract) {
        vaultService.setContract(contract, address);
      }
    };
    initContract();
  }, [signer, address, contract]);

  const connectWallet = async (
    isVaultUnlocked: boolean,
    setError: (msg: string) => void,
    setSuccess: (msg: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!privateKey.trim()) {
      setError("Please enter your private key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let wallet: ethers.Wallet;
      try {
        wallet = new ethers.Wallet(privateKey.trim());
      } catch (err: any) {
        throw new Error("Invalid private key format");
      }

      const prov = new ethers.JsonRpcProvider(RPC_URL);
      
      const connectedWallet = wallet.connect(prov);
      
      const addr = await connectedWallet.getAddress();
      await prov.getBalance(addr); 
      
      setProvider(prov);
      setSigner(connectedWallet);
      setAddress(addr);
      setIsWalletConnected(true);

      const cont = new ethers.Contract(CONTRACT_ADDRESS, userStorage_contract_abi, connectedWallet);
      setContract(cont);

      await browser.storage.local.set({
        walletAddress: addr,
      });

      if (isVaultUnlocked) {
        try {
          const stored = await browser.storage.local.get(['masterPassword']);
          if (stored.masterPassword) {
            const encryptedKey = await encryptPrivateKey(privateKey.trim(), stored.masterPassword);
            await browser.storage.local.set({
              encryptedWalletPrivateKey: encryptedKey
            });
            console.log('[App] Encrypted and stored wallet private key');
          }
        } catch (err) {
          console.error('[App] Failed to encrypt and store private key:', err);
        }
      }

      setSuccess(`Connected to wallet ${addr.slice(0, 6)}...${addr.slice(-4)}`);
      setPrivateKey(""); 
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async (
    setVaultExists: (exists: boolean) => void,
    setIsVaultUnlocked: (unlocked: boolean) => void,
    setWebsites: (websites: string[]) => void,
    setViewingCredential: (cred: any) => void,
    setGeneratedToken: (token: string) => void,
    setSuccess: (msg: string) => void
  ) => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setContract(undefined);
    setIsWalletConnected(false);
    setVaultExists(false);
    setIsVaultUnlocked(false);
    setWebsites([]);
    setViewingCredential(null);
    setGeneratedToken("");
    
    await browser.storage.local.remove(['walletAddress', 'encryptedWalletPrivateKey']);
    
    setSuccess("Wallet disconnected");
  };

  const restoreWalletFromEncrypted = async (
    encryptedKey: any,
    masterPassword: string,
    setVaultExists: (exists: boolean) => void
  ) => {
    try {
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
      
      vaultService.setContract(walletData.contract, walletData.address);
      
      try {
        const exists = await vaultService.vaultExists();
        setVaultExists(exists);
      } catch (err) {
        console.error('Failed to check vault existence:', err);
      }
      
      console.log('[App] Wallet connection restored from encrypted private key');
      return walletData;
    } catch (err: any) {
      throw new Error(`Failed to restore wallet: ${err.message}`);
    }
  };

  return {
    provider,
    setProvider,
    address,
    setAddress,
    signer,
    setSigner,
    network,
    contract,
    setContract,
    privateKey,
    setPrivateKey,
    isWalletConnected,
    setIsWalletConnected,
    connectWallet,
    disconnectWallet,
    restoreWalletFromEncrypted,
  };
}

