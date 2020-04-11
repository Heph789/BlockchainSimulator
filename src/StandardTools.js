//Standard (not malicious) tools for adding a block to the blockchain

const crypto = require("crypto");
const ec = require('secp256k1');

let simpleCrypto = {};

/*
  @desc Creates a sha256 hash with data. 256 bits = 32 bytes.
  @param data data to hash
  @returns sha256 hex encoded hash from data
*/
simpleCrypto.findHash = function(data) {
  let hashObj = crypto.createHash('sha256');
  hashObj.update(data);
  let hash = hashObj.digest('hex');
  return hash;
}

/*
  @desc creates public-private key pair using elliptic curve cryptography
  @returns Object account
  account: {privKey: hex encoded private key, publicKey: hex encoded public key}
*/
simpleCrypto.createAccount = function() {
  let privKey;
  do {
    privKey = crypto.randomBytes(32)
  } while (!ec.privateKeyVerify(privKey));
  const pubKey = ec.publicKeyCreate(privKey);
  return {privKey: privKey, pubKey: pubKey};
}
/*
  @desc signs a 32-byte hex encoded message
  @param message 32-byte hex encoded message to sign
  @param privKey hex-encoded private key to sign message with
  @returns hex-encoded signature
*/
simpleCrypto.sign = function(message, privKey) {
  // sign function requires buffer
  const pkBuf = Buffer.from(privKey, 'hex');
  const messBuf = Buffer.from(message, 'hex');
  // Type: Buffer
  const sigBuf = ec.sign(messBuf, pkBuf).signature;
  // Returns hex-encoded string
  return sigBuf.toString('hex');
}
/*
  @desc verifies a hex-encoded signature
  @param message hex-encoded 32-byte message to verify against
  @param sig hex-encoded signature to verify
  @param pubKey hex-encoded public key
  @returns boolean true if succeeds. false if invalid.
*/
simpleCrypto.verify = function(message, sig, pubKey) {
  // verify function requires buffer
  const messBuf = Buffer.from(message, 'hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const pkBuf = Buffer.from(pubKey, 'hex');
  return ec.verify(messBuf, sigBuf, pkBuf);
}

module.exports.simpleCrypto = simpleCrypto;

//finds the nonce of a blockchain and returns the hash once the nonce is found
module.exports.findNonce = function(block, LEAD) {
  block.nonce = 0;
  let hash = simpleCrypto.findHash(JSON.stringify(block));
  while(hash.substring(0, LEAD.length) !== LEAD) {
    block.nonce++;
    hash = simpleCrypto.findHash(JSON.stringify(block));
  }
  return hash;
}
