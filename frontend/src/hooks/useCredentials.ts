import { ethers } from "ethers";
import { useState } from "react";
import type { StoredCredential } from "../services/VaultService";
import { vaultService } from "../services/VaultService";

interface UseCredentialsProps {
  contract: ethers.Contract | undefined;
  signer: ethers.Wallet | null;
  provider: ethers.JsonRpcProvider | null;
  isVaultUnlocked: boolean;
  loadWebsites: () => Promise<void>;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  setLoading: (loading: boolean) => void;
}

export function useCredentials({
  contract,
  signer,
  provider,
  isVaultUnlocked,
  loadWebsites,
  setError,
  setSuccess,
  setLoading,
}: UseCredentialsProps) {
  const [credentialForm, setCredentialForm] = useState({
    website: "",
    username: "",
    password: "",
    notes: "",
  });
  const [viewingCredential, setViewingCredential] = useState<StoredCredential | null>(null);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const [showGasEstimate, setShowGasEstimate] = useState<boolean>(false);
  const [gasEstimate, setGasEstimate] = useState<{ gasLimit: bigint; gasPrice: bigint; cost: string } | null>(null);
  const [pendingCredential, setPendingCredential] = useState<Omit<StoredCredential, 'createdAt' | 'updatedAt'> | null>(null);

  const estimateGasForCredential = async (credential: Omit<StoredCredential, 'createdAt' | 'updatedAt'>): Promise<{ gasLimit: bigint; gasPrice: bigint; cost: string }> => {
    if (!contract || !signer || !isVaultUnlocked) {
      throw new Error("Wallet not connected or vault not unlocked");
    }

    const fullCredential: StoredCredential = {
      ...credential,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const credentialStr = JSON.stringify(fullCredential);
    const estimatedEncryptedSize = Math.ceil(credentialStr.length * 1.5); 
    const placeholderEncrypted = 'A'.repeat(Math.max(estimatedEncryptedSize, 200)); 
    const placeholderIV = 'B'.repeat(16);
    
    const encryptedData = {
      encryptedData: placeholderEncrypted,
      iv: placeholderIV,
    };

    try {
      const gasLimit = await contract.storeCredential.estimateGas(
        credential.website,
        JSON.stringify(encryptedData)
      );

      const feeData = await provider!.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);

      const cost = ethers.formatEther(gasLimit * gasPrice);

      return { gasLimit, gasPrice, cost };
    } catch (err: any) {
      console.warn('Gas estimation failed, using default:', err);
      const defaultGasLimit = BigInt(100000); 
      const feeData = await provider!.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const cost = ethers.formatEther(defaultGasLimit * gasPrice);
      return { gasLimit: defaultGasLimit, gasPrice, cost };
    }
  };

  const saveCredential = async () => {
    if (!credentialForm.website || !credentialForm.username || !credentialForm.password) {
      setError("Website, username, and password are required");
      return;
    }

    if (!contract || !isVaultUnlocked) {
      setError("Please connect wallet and unlock vault first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Estimate gas first
      const estimate = await estimateGasForCredential(credentialForm);
      setGasEstimate(estimate);
      setPendingCredential(credentialForm);
      setShowGasEstimate(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to estimate gas");
      setLoading(false);
    }
  };

  const confirmSaveCredential = async () => {
    if (!pendingCredential) {
      return;
    }

    setLoading(true);
    setError("");
    setShowGasEstimate(false);

    try {
      await vaultService.storeCredential(pendingCredential);
      setSuccess("Credential saved successfully");
      setCredentialForm({ website: "", username: "", password: "", notes: "" });
      setPendingCredential(null);
      setGasEstimate(null);
      loadWebsites();
    } catch (err: any) {
      setError(err.message || "Failed to save credential");
    } finally {
      setLoading(false);
    }
  };

  const cancelSaveCredential = () => {
    setShowGasEstimate(false);
    setPendingCredential(null);
    setGasEstimate(null);
  };

  const viewCredential = async (website: string) => {
    setLoading(true);
    setError("");

    try {
      const cred = await vaultService.getCredential(website);
      setViewingCredential(cred);
      setSelectedWebsite(website);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve credential");
    } finally {
      setLoading(false);
    }
  };

  const deleteCredential = async (website: string) => {
    if (!confirm(`Delete credentials for ${website}?`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await vaultService.deleteCredential(website);
      setSuccess("Credential deleted");
      setViewingCredential(null);
      loadWebsites();
    } catch (err: any) {
      setError(err.message || "Failed to delete credential");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async (website: string) => {
    setLoading(true);
    setError("");

    try {
      const token = await vaultService.generateAuthToken(website, 3600);
      setGeneratedToken(token);
      setSuccess("JWT token generated");
    } catch (err: any) {
      setError(err.message || "Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  const fillOnPage = async (website: string) => {
    // Check if vault is unlocked
    if (!isVaultUnlocked) {
      setError('Please unlock your vault first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let cred = viewingCredential;
      
      if (!cred || cred.website !== website) {
        cred = await vaultService.getCredential(website);
        if (!cred) {
          setError('Credential not found');
          setLoading(false);
          return;
        }
      }

      console.log('[Popup] Attempting to fill credentials for:', website);

      const tabs = await browser.tabs.query({});
      console.log('[Popup] Found tabs:', tabs.length);
      
      const targetTab = tabs.find(tab => 
        tab.url && 
        tab.url.includes(website.replace(/^https?:\/\//, '').split('/')[0])
      ) || tabs.find(tab => tab.active);

      if (!targetTab || !targetTab.id) {
        setError('No suitable tab found. Please open the website first.');
        setLoading(false);
        return;
      }

      console.log('[Popup] Sending to tab:', targetTab.id, targetTab.url);

      const response = await browser.tabs.sendMessage(targetTab.id, {
        type: 'FILL_CREDENTIALS',
        username: cred.username,
        password: cred.password,
      });

      console.log('[Popup] Response from content script:', response);

      if (response && response.success) {
        setSuccess('Credentials filled on page!');
      } else if (response && response.error) {
        setError(response.error);
      } else {
        setSuccess('Credentials sent to page');
      }
    } catch (err: any) {
      console.error('[Popup] Fill on page error:', err);
      if (err.message && err.message.includes('Receiving end does not exist')) {
        setError('Content script not loaded. Please reload the page and try again.');
      } else {
        setError(err.message || 'Failed to fill credentials. Make sure the page is loaded.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard");
  };

  return {
    credentialForm,
    setCredentialForm,
    viewingCredential,
    setViewingCredential,
    selectedWebsite,
    setSelectedWebsite,
    generatedToken,
    setGeneratedToken,
    showGasEstimate,
    gasEstimate,
    saveCredential,
    confirmSaveCredential,
    cancelSaveCredential,
    viewCredential,
    deleteCredential,
    generateToken,
    fillOnPage,
    copyToClipboard,
  };
}

