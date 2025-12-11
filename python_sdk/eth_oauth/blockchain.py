"""
Blockchain interaction utilities for retrieving public keys.
"""

import json
from typing import Optional

from web3 import Web3

from .crypto import hex_to_bytes

# Contract ABI for UserVault contract
USER_VAULT_ABI = [
    {
        "type": "function",
        "name": "getCredential",
        "inputs": [{"name": "website", "type": "string", "internalType": "string"}],
        "outputs": [
            {"name": "encryptedData", "type": "string", "internalType": "string"},
            {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
        ],
        "stateMutability": "view",
    },
    {
        "type": "function",
        "name": "getCredentialInfo",
        "inputs": [{"name": "website", "type": "string", "internalType": "string"}],
        "outputs": [
            {"name": "encryptedData", "type": "string", "internalType": "string"},
            {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
            {"name": "exists", "type": "bool", "internalType": "bool"},
        ],
        "stateMutability": "view",
    },
]


class BlockchainClient:
    """
    Client for interacting with the UserVault blockchain contract.
    """
    
    def __init__(self, contract_address: str, rpc_url: str):
        """
        Initialize blockchain client.
        
        Args:
            contract_address: Ethereum address of the UserVault contract
            rpc_url: RPC URL for blockchain connection (e.g., Infura, Alchemy)
        """
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=USER_VAULT_ABI
        )
    
    def get_vault_data(self, wallet_address: str) -> Optional[dict]:
        """
        Retrieve vault data for a wallet address.
        
        Args:
            wallet_address: Ethereum wallet address
            
        Returns:
            VaultData dictionary with publicKey, or None if not found
            
        Raises:
            ValueError: If contract call fails
        """
        try:
            wallet_address = Web3.to_checksum_address(wallet_address)
            result = self.contract.functions.getCredentialInfo("__VAULT_DATA__").call(
                {"from": wallet_address}
            )
            
            encrypted_data, timestamp, exists = result
            
            if not exists:
                return None
            
            # Parse the JSON vault data
            vault_data = json.loads(encrypted_data)
            return vault_data
            
        except Exception as e:
            raise ValueError(f"Failed to retrieve vault data: {e}")
    
    def get_public_key(self, wallet_address: str) -> Optional[bytes]:
        """
        Retrieve Ed25519 public key for a wallet address.
        
        Args:
            wallet_address: Ethereum wallet address
            
        Returns:
            32-byte Ed25519 public key, or None if not found
        """
        vault_data = self.get_vault_data(wallet_address)
        if not vault_data:
            return None
        
        public_key_hex = vault_data.get("publicKey")
        if not public_key_hex:
            return None
        
        return hex_to_bytes(public_key_hex)


def get_public_key(
    wallet_address: str,
    contract_address: str,
    rpc_url: str
) -> Optional[bytes]:
    """
    Convenience function to retrieve public key from blockchain.
    
    Args:
        wallet_address: Ethereum wallet address
        contract_address: Ethereum address of the UserVault contract
        rpc_url: RPC URL for blockchain connection
        
    Returns:
        32-byte Ed25519 public key, or None if not found
    """
    client = BlockchainClient(contract_address, rpc_url)
    return client.get_public_key(wallet_address)

