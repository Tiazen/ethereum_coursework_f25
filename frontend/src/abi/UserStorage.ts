export const userStorage_contranct_abi = [
  {
    type: "function",
    name: "deleteCredential",
    inputs: [{ name: "website", type: "string", internalType: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCredential",
    inputs: [{ name: "website", type: "string", internalType: "string" }],
    outputs: [
      { name: "encryptedData", type: "string", internalType: "string" },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCredentialInfo",
    inputs: [{ name: "website", type: "string", internalType: "string" }],
    outputs: [
      { name: "encryptedData", type: "string", internalType: "string" },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
      { name: "exists", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserWebsites",
    inputs: [],
    outputs: [{ name: "websites", type: "string[]", internalType: "string[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWebsiteCount",
    inputs: [],
    outputs: [{ name: "count", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasCredential",
    inputs: [{ name: "website", type: "string", internalType: "string" }],
    outputs: [{ name: "exists", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "storeCredential",
    inputs: [
      { name: "website", type: "string", internalType: "string" },
      { name: "encryptedData", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CredentialDeleted",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "website",
        type: "string",
        indexed: true,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CredentialStored",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "website",
        type: "string",
        indexed: true,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CredentialUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "website",
        type: "string",
        indexed: true,
        internalType: "string",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
];
