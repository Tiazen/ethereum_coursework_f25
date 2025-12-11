import { ethers } from "ethers";
import { userStorage_contranct_abi as userStorage_contract_abi } from "../abi/UserStorage";
import { CONTRACT_ADDRESS, RPC_URL, type EncryptedPrivateKey } from "../config/constants";
import * as crypto from "./crypto";


export async function encryptPrivateKey(
  privateKey: string,
  masterPassword: string
): Promise<EncryptedPrivateKey> {
  const salt = crypto.generateSalt();
  const key = await crypto.deriveKey(masterPassword, salt);
  const encrypted = await crypto.encrypt(privateKey, key);
  
  return {
    encryptedPrivateKey: encrypted.encrypted,
    iv: encrypted.iv,
    salt: crypto.ab2base64(salt.buffer as ArrayBuffer),
  };
}


export async function decryptPrivateKey(
  encryptedData: EncryptedPrivateKey,
  masterPassword: string
): Promise<string> {
  const salt = new Uint8Array(crypto.base642ab(encryptedData.salt));
  const key = await crypto.deriveKey(masterPassword, salt);
  return await crypto.decrypt(encryptedData.encryptedPrivateKey, encryptedData.iv, key);
}

  
export async function restoreWalletConnection(privateKey: string) {
  try {
    const wallet = new ethers.Wallet(privateKey.trim());
    const prov = new ethers.JsonRpcProvider(RPC_URL);
    const connectedWallet = wallet.connect(prov);
    const addr = await connectedWallet.getAddress();
    
    const cont = new ethers.Contract(CONTRACT_ADDRESS, userStorage_contract_abi, connectedWallet);
    
    return {
      provider: prov,
      signer: connectedWallet,
      address: addr,
      contract: cont,
    };
  } catch (err: any) {
    throw new Error(`Failed to restore wallet: ${err.message}`);
  }
}

