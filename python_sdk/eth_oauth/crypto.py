"""
Cryptographic utilities for JWT verification.
"""

import base64
from typing import Union

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def base64url_encode(data: Union[str, bytes]) -> str:
    """
    Base64URL encode data.
    
    Args:
        data: String or bytes to encode
        
    Returns:
        Base64URL encoded string
    """
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    encoded = base64.b64encode(data).decode('utf-8')
    # Convert to Base64URL format
    encoded = encoded.rstrip('=')
    encoded = encoded.replace('+', '-')
    encoded = encoded.replace('/', '_')
    return encoded


def base64url_decode(data: str) -> bytes:
    """
    Base64URL decode data.
    
    Args:
        data: Base64URL encoded string
        
    Returns:
        Decoded bytes
    """
    # Convert from Base64URL format
    data = data.replace('-', '+')
    data = data.replace('_', '/')
    
    # Add padding if needed
    padding = len(data) % 4
    if padding:
        data += '=' * (4 - padding)
    
    return base64.b64decode(data)


def hex_to_bytes(hex_string: str) -> bytes:
    """
    Convert hex string to bytes.
    
    Args:
        hex_string: Hex string (with or without 0x prefix)
        
    Returns:
        Bytes representation
    """
    hex_string = hex_string.lstrip('0x')
    return bytes.fromhex(hex_string)


def bytes_to_hex(data: bytes, prefix: bool = False) -> str:
    """
    Convert bytes to hex string.
    
    Args:
        data: Bytes to convert
        prefix: Whether to include '0x' prefix
        
    Returns:
        Hex string
    """
    hex_str = data.hex()
    if prefix:
        return '0x' + hex_str
    return hex_str


def verify_ed25519_signature(
    signature: bytes,
    message: bytes,
    public_key: bytes
) -> bool:
    """
    Verify an Ed25519 signature.
    
    Args:
        signature: 64-byte Ed25519 signature
        message: Message that was signed
        public_key: 32-byte Ed25519 public key
        
    Returns:
        True if signature is valid, False otherwise
        
    Raises:
        ValueError: If key or signature sizes are incorrect
    """
    if len(public_key) != 32:
        raise ValueError(f"Public key must be 32 bytes, got {len(public_key)}")
    if len(signature) != 64:
        raise ValueError(f"Signature must be 64 bytes, got {len(signature)}")
    
    try:
        ed25519_public_key = Ed25519PublicKey.from_public_bytes(public_key)
        ed25519_public_key.verify(signature, message)
        return True
    except InvalidSignature:
        return False
    except Exception as e:
        raise ValueError(f"Signature verification failed: {e}")

