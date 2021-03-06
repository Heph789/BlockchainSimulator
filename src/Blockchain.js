//Classes for blockchain interaction

const st = require('./StandardTools.js');

const _pubKey = "036302e5b318785148af1eb7744a4d2cbd5380d4d8faab29b1f80cd7665f066c9e";
const _privKey = "d287fd14ea6f15635804fa633b6c0ca31598641faa20f50d09d2e147c6106be5";

//@desc The class for a transaction object
//@param inputs The inputs of the transaction (see inputs class)
//@param outputs The outputs of the transaction (see outputs class)
//@param hash sha256 hash of transaction data
class Transaction {
  constructor(inputs, outputs, hash) {
    this.data = {
      inputs:inputs,
      outputs: outputs
    }
    this.hash = hash;
  }
}

/*
  @desc An Input references a previous output to prove ownership of coin.
  @param previousTx the hash of the transaction with the output
  @param index the index of the referenced output in the transaction
  @param sig the ECDSA signature of the referenced transaction hash
                   the signature is made with the private key of the redeemer, and can be verified with the public key of the redeemer
  @param redeemerKey the public key of the address trying to redeem the output
*/
class Input {
  constructor(previousTx, index, sig, redeemer) {
    this.previousTx = previousTx;
    this.index = index;
    // Change from scriptSig -> sig probably broke some things...
    this.sig = sig;
    this.redeemerKey = redeemer;
  }
}

/*
  @desc an output declares ownership of a certain number of coin by a referenced account
  @param the value given to the referenced account
  @param pubKey the public key of the referenced account
*/
class Output {
  constructor(value, pubKey) {
    this.value = value;
    this.pubKey = pubKey;
  }
}

//@desc class for a block's data excluding it's hash
class BlockData {
  constructor(blockNumber, previousBlockHash, transactions, merkleRoot, nonce) {
    this.blockNumber = blockNumber;
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
  constructor(address, total, eventEmitter) {
    let outputs = [
      new Output(total, address)
    ];
    let transaction = new Transaction(null, outputs, null);
    transaction.hash = st.findHash(JSON.stringify(transaction.data));
    let newBlock = new BlockData(
      0,
      [transaction],
      0
      );
    this.LEAD = "0";
    let _hash = st.findNonce(newBlock, this.LEAD);
    this.blocks = [];
    this.transactions = [];
    this.eventEmitter = eventEmitter;
    this.addBlock({data:newBlock, hash:_hash});
  }

  addBlock(block) {
    if(block.data instanceof BlockData && block.hash.length>0) {
      this.blocks.push(block);
      this.transactions = [];
      this.eventEmitter.emit('block', block);
    }
  }

  broadcastTransaction(transaction) {
    this.transactions.push(transaction);
  }

  verify() {
    let errorMessages = [];
    for(let i = 0; i<this.blocks.length; i++) {

      let data = this.blocks[i].data;
      let hash = this.blocks[i].hash;

      if(i>0 && data.previousBlockHash != this.blocks[i-1].hash)
        errorMessages.push("Hash does not match previous hash at block " + i + ": "+ data.previousBlockHash + "!=" + this.blocks[i-1].hash);

      if (st.findHash(JSON.stringify(data)) != hash)
        errorMessages.push("Hash is incorrect" + " at block " + i + ": " + st.findHash(JSON.stringify(data)));

      if(hash.substring(0, this.LEAD.length) !== this.LEAD)
        errorMessages.push("Hash does not have leading digits at block " + i);

    }
    return errorMessages;
  }
}

class Ledger {
  constructor(blocks) {
    this.blocks = [];
    if(blocks)
      this.blocks = blocks;
  }

  addBlock(block) {
    this.blocks.push(block);
  }

  chainSize() {
    return this.blocks.length;
  }

  getLastBlock() {
    if(this.chainSize() > 0)
      return this.blocks[this.chainSize()-1];
    throw new Error("Ledger size is 0");
  }

  toString() {
    return JSON.stringify(this.blocks, null, ' ');;
  }
}
module.exports = {
  Blockchain: Blockchain,
  BlockData: BlockData,
  Input: Input,
  Output: Output,
  Transaction: Transaction,
  Ledger: Ledger
}
