//Standard (not malicious) tools for adding a block to the blockchain

const crypto = require("crypto")

//finds the hash of data
function findHash(data) {
  let hashObj = crypto.createHash('sha256');
  hashObj.update(data);
  let hash = hashObj.digest('hex');
  return hash;
}

//finds the nonce of a blockchain and returns the hash once the nonce is found
module.exports.findNonce = function(block, LEAD) {
  let hash = "";
  block.nonce = 0;
  do {
    hash = findHash(JSON.stringify(block));
    block.nonce++;
  } while(hash.substring(0, LEAD.length) !== LEAD);
  return hash;
}
