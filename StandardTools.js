//Standard (not malicious) tools for adding a block to the blockchain

const crypto = require("crypto");

var findHash = function(data) {
  let hashObj = crypto.createHash('sha256');
  hashObj.update(data);
  let hash = hashObj.digest('hex');
  return hash;
}

//finds the hash of data
module.exports.findHash = findHash;

//finds the nonce of a blockchain and returns the hash once the nonce is found
module.exports.findNonce = function(block, LEAD) {
  block.nonce = 0;
  let hash = findHash(JSON.stringify(block));
  while(hash.substring(0, LEAD.length) !== LEAD) {
    block.nonce++;
    hash = findHash(JSON.stringify(block));
  }
  return hash;
}
