// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserVault {
    struct Credential {
        string encryptedData;      
        uint256 timestamp;         
        bool exists;               
    }

    mapping(address => mapping(string => Credential)) private userCredentials;
     
    mapping(address => string[]) private userWebsites;
    
    mapping(address => mapping(string => uint256)) private websiteIndex;

    event CredentialStored(
        address indexed user,
        string indexed website,
        uint256 timestamp
    );
    
    event CredentialUpdated(
        address indexed user,
        string indexed website,
        uint256 timestamp
    );
    
    event CredentialDeleted(
        address indexed user,
        string indexed website,
        uint256 timestamp
    );

    function storeCredential(
        string memory website,
        string memory encryptedData
    ) external {
        require(bytes(website).length > 0, "Website cannot be empty");
        require(bytes(encryptedData).length > 0, "Encrypted data cannot be empty");
        
        address user = msg.sender;
        bool isNew = !userCredentials[user][website].exists;
        
        userCredentials[user][website] = Credential({
            encryptedData: encryptedData,
            timestamp: block.timestamp,
            exists: true
        });

        if (isNew) {
            userWebsites[user].push(website);
            websiteIndex[user][website] = userWebsites[user].length - 1;
            emit CredentialStored(user, website, block.timestamp);
        } else {
            emit CredentialUpdated(user, website, block.timestamp);
        }
    }

    function getCredential(
        string memory website
    ) external view returns (string memory encryptedData, uint256 timestamp) {
        address user = msg.sender;
        require(userCredentials[user][website].exists, "Credential does not exist");
        
        Credential memory cred = userCredentials[user][website];
        return (cred.encryptedData, cred.timestamp);
    }

    function hasCredential(string memory website) external view returns (bool exists) {
        return userCredentials[msg.sender][website].exists;
    }

    function deleteCredential(string memory website) external {
        address user = msg.sender;
        require(userCredentials[user][website].exists, "Credential does not exist");
        
        delete userCredentials[user][website];
        
        uint256 index = websiteIndex[user][website];
        uint256 lastIndex = userWebsites[user].length - 1;
        
        if (index != lastIndex) {
            string memory lastWebsite = userWebsites[user][lastIndex];
            userWebsites[user][index] = lastWebsite;
            websiteIndex[user][lastWebsite] = index;
        }
        
        userWebsites[user].pop();
        delete websiteIndex[user][website];
        
        emit CredentialDeleted(user, website, block.timestamp);
    }

    function getUserWebsites() external view returns (string[] memory websites) {
        return userWebsites[msg.sender];
    }

    
    function getWebsiteCount() external view returns (uint256 count) {
        return userWebsites[msg.sender].length;
    }

    
    function getCredentialInfo(
        string memory website
    ) external view returns (
        string memory encryptedData,
        uint256 timestamp,
        bool exists
    ) {
        Credential memory cred = userCredentials[msg.sender][website];
        return (cred.encryptedData, cred.timestamp, cred.exists);
    }
}

