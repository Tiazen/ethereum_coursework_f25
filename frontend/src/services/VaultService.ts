import { ethers } from "ethers";
import * as crypto from "../utils/crypto";
import { generateJWT } from "../utils/jwt";

export interface StoredCredential {
  website: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  salt: string;
  passwordHash: string;
  encryptedPrivateKey: string;
  privateKeyIV: string;
  publicKey: string;
  version: number;
}

export interface EncryptedCredentialData {
  encryptedData: string;
  iv: string;
}

class VaultService {
  private masterKey: CryptoKey | null = null;
  private signingKey: Uint8Array | null = null;
  private isUnlocked: boolean = false;
  private walletAddress: string | null = null;
  private contract: ethers.Contract | null = null;

  setContract(contract: ethers.Contract, walletAddress: string) {
    this.contract = contract;
    this.walletAddress = walletAddress;
  }

  async vaultExists(): Promise<boolean> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const result = await this.contract.getCredential("__VAULT_DATA__");
      return result && result.encryptedData && result.encryptedData.length > 0;
    } catch (error) {
      return false;
    }
  }

  async createVault(masterPassword: string): Promise<void> {
    if (!this.contract || !this.walletAddress) {
      throw new Error("Contract not initialized");
    }

    const exists = await this.vaultExists();
    if (exists) {
      throw new Error("Vault already exists");
    }

    const salt = crypto.generateSalt();

    this.masterKey = await crypto.deriveKey(masterPassword, salt);

    const keyPair = await crypto.generateSigningKeyPair();
    this.signingKey = keyPair.privateKey;

    const privateKeyHex = crypto.keyToHex(keyPair.privateKey);

    const encryptedPrivateKey = await crypto.encrypt(
      privateKeyHex,
      this.masterKey
    );

    const passwordHash = await crypto.hashPassword(masterPassword, salt);

    const publicKey = crypto.keyToHex(keyPair.publicKey);

    const vaultData: VaultData = {
      salt: crypto.ab2base64(salt as unknown as ArrayBuffer),
      passwordHash,
      encryptedPrivateKey: encryptedPrivateKey.encrypted,
      privateKeyIV: encryptedPrivateKey.iv,
      publicKey,
      version: 1,
    };

    const vaultDataStr = JSON.stringify(vaultData);
    const tx = await this.contract.storeCredential(
      "__VAULT_DATA__",
      vaultDataStr
    );
    await tx.wait();

    this.isUnlocked = true;
  }

  async unlockVault(masterPassword: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const result = await this.contract.getCredential("__VAULT_DATA__");
      const vaultData: VaultData = JSON.parse(result.encryptedData);

      const salt = new Uint8Array(crypto.base642ab(vaultData.salt));

      const passwordHash = await crypto.hashPassword(masterPassword, salt);
      if (passwordHash !== vaultData.passwordHash) {
        return false;
      }

      this.masterKey = await crypto.deriveKey(masterPassword, salt);

      const privateKeyHex = await crypto.decrypt(
        vaultData.encryptedPrivateKey,
        vaultData.privateKeyIV,
        this.masterKey
      );

      this.signingKey = crypto.importPrivateKey(privateKeyHex);

      this.isUnlocked = true;
      return true;
    } catch (error) {
      console.error("Error unlocking vault:", error);
      return false;
    }
  }

  lockVault(): void {
    this.masterKey = null;
    this.signingKey = null;
    this.isUnlocked = false;
  }

  isVaultUnlocked(): boolean {
    return this.isUnlocked;
  }

  async storeCredential(
    credential: Omit<StoredCredential, "createdAt" | "updatedAt">
  ): Promise<void> {
    if (!this.isUnlocked || !this.masterKey || !this.contract) {
      throw new Error("Vault is locked or not initialized");
    }

    const fullCredential: StoredCredential = {
      ...credential,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const credentialStr = JSON.stringify(fullCredential);
    const encrypted = await crypto.encrypt(credentialStr, this.masterKey);

    const encryptedData: EncryptedCredentialData = {
      encryptedData: encrypted.encrypted,
      iv: encrypted.iv,
    };

    const tx = await this.contract.storeCredential(
      credential.website,
      JSON.stringify(encryptedData)
    );
    await tx.wait();
  }

  async getCredential(website: string): Promise<StoredCredential | null> {
    if (!this.isUnlocked || !this.masterKey || !this.contract) {
      throw new Error("Vault is locked or not initialized");
    }

    try {
      const result = await this.contract.getCredential(website);
      const encryptedData: EncryptedCredentialData = JSON.parse(
        result.encryptedData
      );

      const credentialStr = await crypto.decrypt(
        encryptedData.encryptedData,
        encryptedData.iv,
        this.masterKey
      );

      return JSON.parse(credentialStr);
    } catch (error) {
      console.error("Error retrieving credential:", error);
      return null;
    }
  }

  async getAllWebsites(): Promise<string[]> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const websites = await this.contract.getUserWebsites();
      return websites.filter((w: string) => w !== "__VAULT_DATA__");
    } catch (error) {
      console.error("Error getting websites:", error);
      return [];
    }
  }

  async deleteCredential(website: string): Promise<void> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    const tx = await this.contract.deleteCredential(website);
    await tx.wait();
  }

  async generateAuthToken(
    website: string,
    expiresIn?: number
  ): Promise<string> {
    if (
      !this.isUnlocked ||
      !this.signingKey ||
      !this.walletAddress ||
      !this.contract
    ) {
      throw new Error("Vault is locked or not initialized");
    }

    const credential = await this.getCredential(website);
    if (!credential) {
      throw new Error("No credential found for this website");
    }

    const token = await generateJWT(this.signingKey, {
      website,
      username: credential.username,
      walletAddress: this.walletAddress,
      expiresIn,
    });

    return token;
  }
}

export const vaultService = new VaultService();
