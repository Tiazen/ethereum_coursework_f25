"""
JWT token verification for ETH OAuth tokens.
"""

import json
import time
from typing import Any, Dict, Optional

from .blockchain import BlockchainClient, get_public_key
from .crypto import (
    base64url_decode,
    base64url_encode,
    hex_to_bytes,
    verify_ed25519_signature,
)


class JWTVerificationError(Exception):
    """Exception raised when JWT verification fails."""
    pass


def parse_jwt(token: str) -> Dict[str, Any]:
    """
    Parse a JWT token into its components.
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary with 'header', 'payload', and 'signature' keys
        
    Raises:
        JWTVerificationError: If token format is invalid
    """
    parts = token.split('.')
    if len(parts) != 3:
        raise JWTVerificationError("Invalid JWT format: expected 3 parts separated by '.'")
    
    try:
        header_data = base64url_decode(parts[0])
        payload_data = base64url_decode(parts[1])
        signature_data = base64url_decode(parts[2])
        
        header = json.loads(header_data.decode('utf-8'))
        payload = json.loads(payload_data.decode('utf-8'))
        
        return {
            'header': header,
            'payload': payload,
            'signature': signature_data,
            'raw_header': parts[0],
            'raw_payload': parts[1],
        }
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as e:
        raise JWTVerificationError(f"Failed to parse JWT: {e}")


def verify_jwt(
    token: str,
    public_key: bytes,
    expected_audience: Optional[str] = None,
    expected_issuer: Optional[str] = None,
    leeway: int = 0
) -> Dict[str, Any]:
    """
    Verify a JWT token signature and claims.
    
    Args:
        token: JWT token string
        public_key: 32-byte Ed25519 public key
        expected_audience: Expected audience (aud claim), if None, not validated
        expected_issuer: Expected issuer (iss claim), if None, not validated
        leeway: Time leeway in seconds for expiration check
        
    Returns:
        Decoded payload dictionary if verification succeeds
        
    Raises:
        JWTVerificationError: If verification fails
    """
    # Parse token
    parsed = parse_jwt(token)
    header = parsed['header']
    payload = parsed['payload']
    
    # Verify algorithm
    if header.get('alg') != 'EdDSA':
        raise JWTVerificationError(f"Unsupported algorithm: {header.get('alg')}")
    
    if header.get('typ') != 'JWT':
        raise JWTVerificationError(f"Invalid token type: {header.get('typ')}")
    
    # Verify signature
    message = f"{parsed['raw_header']}.{parsed['raw_payload']}".encode('utf-8')
    signature = parsed['signature']
    
    if not verify_ed25519_signature(signature, message, public_key):
        raise JWTVerificationError("Invalid signature")
    
    # Verify expiration
    exp = payload.get('exp')
    if exp is None:
        raise JWTVerificationError("Token missing 'exp' claim")
    
    current_time = int(time.time())
    if current_time > (exp + leeway):
        raise JWTVerificationError(f"Token expired at {exp}, current time: {current_time}")
    
    # Verify issued at (optional check)
    iat = payload.get('iat')
    if iat is not None:
        if iat > (current_time + leeway):
            raise JWTVerificationError(f"Token issued in the future: {iat}")
    
    # Verify audience if provided
    if expected_audience is not None:
        aud = payload.get('aud')
        if aud != expected_audience:
            raise JWTVerificationError(f"Audience mismatch: expected '{expected_audience}', got '{aud}'")
    
    # Verify issuer if provided
    if expected_issuer is not None:
        iss = payload.get('iss')
        if iss != expected_issuer:
            raise JWTVerificationError(f"Issuer mismatch: expected '{expected_issuer}', got '{iss}'")
    
    return payload


class JWTVerifier:
    """
    High-level JWT verifier that retrieves public keys from blockchain.
    """
    
    def __init__(self, contract_address: str, rpc_url: str):
        """
        Initialize JWT verifier.
        
        Args:
            contract_address: Ethereum address of the UserVault contract
            rpc_url: RPC URL for blockchain connection
        """
        self.blockchain_client = BlockchainClient(contract_address, rpc_url)
    
    def verify(
        self,
        token: str,
        expected_website: Optional[str] = None,
        expected_wallet: Optional[str] = None,
        leeway: int = 0
    ) -> Dict[str, Any]:
        """
        Verify a JWT token by retrieving public key from blockchain.
        
        Args:
            token: JWT token string
            expected_website: Expected website (aud claim), if None, not validated
            expected_wallet: Expected wallet address (iss claim), if None, extracted from token
            leeway: Time leeway in seconds for expiration check
            
        Returns:
            Decoded payload dictionary if verification succeeds
            
        Raises:
            JWTVerificationError: If verification fails
        """
        # Parse token to get issuer (wallet address)
        parsed = parse_jwt(token)
        wallet_address = parsed['payload'].get('iss')
        
        if not wallet_address:
            raise JWTVerificationError("Token missing 'iss' (issuer) claim")
        
        # Use expected_wallet if provided, otherwise use issuer from token
        if expected_wallet is not None:
            if wallet_address.lower() != expected_wallet.lower():
                raise JWTVerificationError(
                    f"Wallet address mismatch: expected '{expected_wallet}', got '{wallet_address}'"
                )
            wallet_address = expected_wallet
        
        # Retrieve public key from blockchain
        public_key = self.blockchain_client.get_public_key(wallet_address)
        if public_key is None:
            raise JWTVerificationError(f"No public key found for wallet address: {wallet_address}")
        
        # Verify token
        return verify_jwt(
            token,
            public_key,
            expected_audience=expected_website,
            expected_issuer=wallet_address,
            leeway=leeway
        )
    
    def verify_with_public_key(
        self,
        token: str,
        public_key: bytes,
        expected_website: Optional[str] = None,
        expected_wallet: Optional[str] = None,
        leeway: int = 0
    ) -> Dict[str, Any]:
        """
        Verify a JWT token with a provided public key.
        
        Args:
            token: JWT token string
            public_key: 32-byte Ed25519 public key (hex string or bytes)
            expected_website: Expected website (aud claim), if None, not validated
            expected_wallet: Expected wallet address (iss claim), if None, extracted from token
            leeway: Time leeway in seconds for expiration check
            
        Returns:
            Decoded payload dictionary if verification succeeds
            
        Raises:
            JWTVerificationError: If verification fails
        """
        # Parse token to get issuer
        parsed = parse_jwt(token)
        wallet_address = parsed['payload'].get('iss')
        
        if not wallet_address:
            raise JWTVerificationError("Token missing 'iss' (issuer) claim")
        
        # Convert public key if needed
        if isinstance(public_key, str):
            public_key = hex_to_bytes(public_key)
        
        # Use expected_wallet if provided
        if expected_wallet is not None:
            if wallet_address.lower() != expected_wallet.lower():
                raise JWTVerificationError(
                    f"Wallet address mismatch: expected '{expected_wallet}', got '{wallet_address}'"
                )
            wallet_address = expected_wallet
        
        # Verify token
        return verify_jwt(
            token,
            public_key,
            expected_audience=expected_website,
            expected_issuer=wallet_address,
            leeway=leeway
        )

