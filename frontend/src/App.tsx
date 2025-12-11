import { useEffect, useState } from "react";
import "./App.css";
import { CredentialsTab } from "./components/CredentialsTab";
import { GasEstimateModal } from "./components/GasEstimateModal";
import { StatusBar } from "./components/StatusBar";
import { TokensTab } from "./components/TokensTab";
import { VaultManagement } from "./components/VaultManagement";
import { VaultSettingsTab } from "./components/VaultSettingsTab";
import { WalletConnection } from "./components/WalletConnection";
import { useCredentials } from "./hooks/useCredentials";
import { useVault } from "./hooks/useVault";
import { useWallet } from "./hooks/useWallet";
import { vaultService } from "./services/VaultService";

interface PendingLoginRequest {
  requestId: string;
  callbackUrl: string;
  website: string;
  currentUrl: string;
}

function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "vault" | "credentials" | "tokens"
  >("credentials");
  const [pendingLoginRequest, setPendingLoginRequest] =
    useState<PendingLoginRequest | null>(null);

  const wallet = useWallet();

  const vault = useVault({
    signer: wallet.signer,
    address: wallet.address,
    contract: wallet.contract,
    isWalletConnected: wallet.isWalletConnected,
    setProvider: wallet.setProvider,
    setSigner: wallet.setSigner,
    setAddress: wallet.setAddress,
    setContract: wallet.setContract,
    setIsWalletConnected: wallet.setIsWalletConnected,
  });

  const loadWebsites = async () => {
    try {
      const sites = await vaultService.getAllWebsites();
      vault.setWebsites(sites);
      console.log("[App] Loaded websites:", sites.length);
    } catch (err: any) {
      if (err.message && err.message.includes("Contract not initialized")) {
        console.log("[App] Contract not ready yet, will retry later");
        return;
      }
      console.error("[App] Failed to load websites:", err);
      setError(err.message || "Failed to load websites");
    }
  };

  const credentials = useCredentials({
    contract: wallet.contract,
    signer: wallet.signer,
    provider: wallet.provider,
    isVaultUnlocked: vault.isVaultUnlocked,
    loadWebsites,
    setError,
    setSuccess,
    setLoading,
  });

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    if (vault.isVaultUnlocked && wallet.isWalletConnected) {
      const checkPendingRequests = async () => {
        try {
          console.log("[App] Checking for pending login requests...");
          const response = (await browser.runtime.sendMessage({
            type: "GET_PENDING_LOGIN_REQUESTS",
          })) as { requests?: any[] } | undefined;
          console.log("[App] Received response:", response);

          if (response?.requests && response.requests.length > 0) {
            console.log(
              `[App] Found ${response.requests.length} pending request(s)`
            );
            if (!pendingLoginRequest) {
              console.log(
                "[App] Setting pending login request:",
                response.requests[0]
              );
              setPendingLoginRequest(response.requests[0]);
            }
          } else {
            if (pendingLoginRequest) {
              console.log("[App] Clearing pending login request");
              setPendingLoginRequest(null);
            }
          }
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          if (errorMsg && errorMsg !== "Extension context invalidated.") {
            console.error(
              "[App] Failed to check pending login requests:",
              errorMsg
            );
          }
        }
      };

      checkPendingRequests();

      const interval = setInterval(checkPendingRequests, 2000);
      return () => clearInterval(interval);
    } else {
      if (pendingLoginRequest) {
        setPendingLoginRequest(null);
      }
    }
  }, [vault.isVaultUnlocked, wallet.isWalletConnected]);

  const handleConnectWallet = () => {
    wallet.connectWallet(
      vault.isVaultUnlocked,
      setError,
      setSuccess,
      setLoading
    );
  };

  const handleDisconnectWallet = () => {
    wallet.disconnectWallet(
      vault.setVaultExists,
      vault.setIsVaultUnlocked,
      vault.setWebsites,
      credentials.setViewingCredential,
      credentials.setGeneratedToken,
      setSuccess
    );
  };

  const handleCreateVault = () => {
    vault.createVault(setError, setSuccess, setLoading);
  };

  const handleUnlockVault = () => {
    vault.unlockVault(setError, setSuccess, setLoading);
  };

  const handleLockVault = () => {
    vault.lockVault(
      credentials.setViewingCredential,
      credentials.setGeneratedToken,
      setSuccess
    );
  };

  const handleConfirmLogin = async () => {
    if (!pendingLoginRequest) return;

    setLoading(true);
    setError("");

    try {
      const token = await vaultService.generateAuthToken(
        pendingLoginRequest.website
      );

      await browser.runtime.sendMessage({
        type: "CONFIRM_LOGIN",
        requestId: pendingLoginRequest.requestId,
        token: token,
      });

      setSuccess("Login confirmed! Token sent to callback URL.");
      setPendingLoginRequest(null);
    } catch (err: any) {
      console.error("[App] Failed to confirm login:", err);
      setError(err.message || "Failed to confirm login");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLogin = async () => {
    if (!pendingLoginRequest) return;

    try {
      await browser.runtime.sendMessage({
        type: "CANCEL_LOGIN",
        requestId: pendingLoginRequest.requestId,
      });

      setPendingLoginRequest(null);
    } catch (error) {
      console.error("[App] Failed to cancel login:", error);
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100vh",
        background: "#0a0a0f",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
          padding: "24px 32px",
          borderRadius: "16px",
          marginBottom: "24px",
          border: "1px solid #6d28d9",
          boxShadow: "0 4px 24px rgba(124, 58, 237, 0.2)",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: "28px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
            color: "#fff",
          }}
        >
          G-Auth
        </h1>
        <p
          style={{
            margin: 0,
            opacity: 0.85,
            fontSize: "14px",
            color: "#e9d5ff",
            fontWeight: "400",
          }}
        >
          Decentralized credential vault on blockchain
        </p>
      </div>

      <StatusBar
        network={wallet.network}
        address={wallet.address}
        isVaultUnlocked={vault.isVaultUnlocked}
        isWalletConnected={wallet.isWalletConnected}
        onDisconnect={handleDisconnectWallet}
      />

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#fca5a5",
            padding: "14px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            color: "#6ee7b7",
            padding: "14px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            fontSize: "14px",
          }}
        >
          {success}
        </div>
      )}

      <GasEstimateModal
        show={credentials.showGasEstimate}
        estimate={credentials.gasEstimate}
        onConfirm={credentials.confirmSaveCredential}
        onCancel={credentials.cancelSaveCredential}
        loading={loading}
      />

      {pendingLoginRequest && vault.isVaultUnlocked && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#1a1a1f",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              border: "1px solid #27272a",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: "#fff",
              }}
            >
              Confirm Login Request
            </h2>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                color: "#a1a1aa",
              }}
            >
              Website:
            </p>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "14px",
                color: "#fff",
                wordBreak: "break-all",
              }}
            >
              {pendingLoginRequest.website}
            </p>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                color: "#a1a1aa",
              }}
            >
              Callback URL:
            </p>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "12px",
                color: "#71717a",
                wordBreak: "break-all",
              }}
            >
              {pendingLoginRequest.callbackUrl}
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelLogin}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogin}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!wallet.isWalletConnected ? (
        <WalletConnection
          privateKey={wallet.privateKey}
          setPrivateKey={wallet.setPrivateKey}
          onConnect={handleConnectWallet}
          loading={loading}
        />
      ) : !vault.isVaultUnlocked ? (
        <VaultManagement
          vaultExists={vault.vaultExists}
          isVaultUnlocked={vault.isVaultUnlocked}
          masterPassword={vault.masterPassword}
          setMasterPassword={vault.setMasterPassword}
          confirmPassword={vault.confirmPassword}
          setConfirmPassword={vault.setConfirmPassword}
          onCreate={handleCreateVault}
          onUnlock={handleUnlockVault}
          loading={loading}
        />
      ) : null}

      {vault.isVaultUnlocked && wallet.isWalletConnected && (
        <>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "24px",
              borderBottom: "1px solid #27272a",
            }}
          >
            <button
              onClick={() => setActiveTab("credentials")}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === "credentials"
                    ? "2px solid #7c3aed"
                    : "2px solid transparent",
                color: activeTab === "credentials" ? "#7c3aed" : "#71717a",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Credentials
            </button>
            <button
              onClick={() => setActiveTab("tokens")}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === "tokens"
                    ? "2px solid #7c3aed"
                    : "2px solid transparent",
                color: activeTab === "tokens" ? "#7c3aed" : "#71717a",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              JWT Tokens
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === "vault"
                    ? "2px solid #7c3aed"
                    : "2px solid transparent",
                color: activeTab === "vault" ? "#7c3aed" : "#71717a",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Settings
            </button>
          </div>

          {activeTab === "credentials" && (
            <CredentialsTab
              credentialForm={credentials.credentialForm}
              setCredentialForm={credentials.setCredentialForm}
              websites={vault.websites}
              viewingCredential={credentials.viewingCredential}
              selectedWebsite={credentials.selectedWebsite}
              onSave={credentials.saveCredential}
              onView={credentials.viewCredential}
              onDelete={credentials.deleteCredential}
              onFillOnPage={credentials.fillOnPage}
              onCopy={credentials.copyToClipboard}
              loading={loading}
            />
          )}

          {activeTab === "tokens" && (
            <TokensTab
              websites={vault.websites}
              selectedWebsite={credentials.selectedWebsite}
              setSelectedWebsite={credentials.setSelectedWebsite}
              generatedToken={credentials.generatedToken}
              onGenerate={credentials.generateToken}
              onCopy={credentials.copyToClipboard}
              loading={loading}
            />
          )}

          {activeTab === "vault" && (
            <VaultSettingsTab
              address={wallet.address}
              onLock={handleLockVault}
              onDisconnect={handleDisconnectWallet}
              onCopy={credentials.copyToClipboard}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
