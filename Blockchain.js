const crypto = require('crypto');

class Transaction {
  constructor(fromAdd, toAdd, amount) {
    this.fromAdd = fromAdd;
    this.toAdd = toAdd;
    this.amount = amount;
  }
}
class Block {
  constructor(previousBlockHash, transactions, merkleRoot) {
    this.previousBlockHash = previousBlockHash;
    this.transactions = transactions;
    this.merkleRoot = merkleRoot;
  }
}

class Blockchain {
  const LEAD = "0000";
  constructor(address, total) {
    let newBlock = new Block(
      0,
      new Transaction(0, address, total),
      0
      );
    let nonce = findNonce(JSON.stringify(newBlock));
  }
  /*addBlock(block, nonce) {

  }
  sendMoney(amount, address) {

  }*/
  findNonce(data) {
    let hashObj = crypto.createHash('sha256');
    let hash = "";
    let nonce = 0;
    do {
      if(!hashObj.write(data+nonce))
        hash.once('drain',
          function() {hashObj.write(data)}
        );
      hash = hashObj.read().toString('hex');
      nonce++;
    } while(hash.substring(0, 4) !== "0000");
    return [nonce, hash];
  }

}
