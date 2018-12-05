const crypto = require('crypto');

class Transaction {
  constructor(fromAdd, toAdd, amount) {
    this.fromAdd = fromAdd;
    this.toAdd = toAdd;
    this.amount = amount;
  }
}
class BlockData {
  constructor(previousBlockHash, transactions, merkleRoot) {
    this.previousBlockHash = previousBlockHash;
    this.transactions = transactions;
    this.merkleRoot = merkleRoot;
  }
}


class Blockchain {
  constructor(address, total) {
    let newBlock = new BlockData(
      0,
      new Transaction(0, address, total),
      0
      );
    this.LEAD = "0000";
    let _hash = this.findNonce(newBlock);
    this.blocks = [{data:newBlock, hash:_hash}];
  }
  addBlock(block) {
    if(block.data instanceof BlockData && hash.length>0)
      this.blocks.push(block);
  }
  sendMoney(amount, address) {

  }
  findNonce(block) {
    let hash = "";
    block.nonce = 0;
    do {
      hash = this.findHash(JSON.stringify(block));
      block.nonce++;
    } while(hash.substring(0, this.LEAD.length) !== this.LEAD);
    return hash;
  }
  findHash(data) {
    let hashObj = crypto.createHash('sha256');
    hashObj.update(data);
    let hash = hashObj.digest('hex');
    return hash;
  }

}

var blockchain = new Blockchain("origin", 1000000);
console.log(blockchain.blocks);
