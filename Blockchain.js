//Classes for blockchain interaction

const st = require('./StandardTools.js');

//@desc The class for a transaction object
//@param fromAdd The address the transaction is from
//@param toAdd The address the transaction goes to
//@param amount Self-explanatory
class Transaction {
  constructor(fromAdd, toAdd, amount) {
    this.fromAdd = fromAdd;
    this.toAdd = toAdd;
    this.amount = amount;
  }
}

//@desc class for a block's data excluding it's hash
class BlockData {
  constructor(previousBlockHash, transactions, merkleRoot, nonce) {
    this.previousBlockHash = previousBlockHash;
    this.transactions = transactions;
    this.merkleRoot = merkleRoot;
    this.nonce = nonce;
  }
}
//@des class for a Blockchain
//@param address Address for the starting money
//@param total Amount of money to start the blockchain with
class Blockchain {
  constructor(address, total) {
    let newBlock = new BlockData(
      0,
      new Transaction(0, address, total),
      0
      );
    this.LEAD = "0000";
    let _hash = st.findNonce(newBlock, this.LEAD);
    this.blocks = [{data:newBlock, hash:_hash}];
    this.transactions = [];
  }

  addBlock(block) {
    if(block.data instanceof BlockData && block.hash.length>0)
      this.blocks.push(block);
      this.transactions = [];
  }
  sendMoney(amount, currentAddress, address) {
    this.transactions.push(new Transaction(currentAddress, address, amount));
  }
  verify() {
    let errorMessages = [];
    for(let i = 0; i<this.blocks.length; i++) {

      let data = this.blocks[i].data;
      let hash = this.blocks[i].hash;

      if(i>0 && data.previousHash != this.blocks[i-1].hash)
        errorMessages.push("Hash does not match previous hash at " + i + ": "+ data.previousBlockHash + "!=" + this.blocks[i-1].hash);

      if (st.findHash(JSON.stringify(data)) !== hash)
        errorMessages.push("Hash is incorrect" + " at " + i + ": " + st.findHash(JSON.stringify(data)));

      if(hash.substring(0, this.LEAD.length) !== this.LEAD)
        errorMessages.push("Hash does not have leading digits" + " at " + i);

    }
    return errorMessages;
  }
}

module.exports = {
  Blockchain: Blockchain,
  BlockData: BlockData
}
