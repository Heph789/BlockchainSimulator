const {randomBytes} = require('crypto');
const ec = require('secp256k1');
const fs = require("fs");
const Blockchain = require("./Blockchain.js");
const { Network } = require("./Network.js");

const Output = Blockchain.Output;
const Input = Blockchain.Input;
const Transaction = Blockchain.Transaction;

const st = require("./StandardTools.js");

class Wallet {
  constructor(addresses, eventEmitter, blockchain) {
    this.addresses = addresses;
    if(this.addresses.length > 0)
      this.setAddress(0);
    this.eventEmitter = eventEmitter;
    // references to outputs with other relevant transaction data
    this.outputs = {};
    this.blockchain = blockchain;
    this.peers = [];
  }

  addPeer(peer) {
    if(this.peers.length === 0) {
      Network.listen(this, peer.networkID, "newBlock", this.receiveBlock);
    }
    this.peers.push(peer);
  }

  receiveBlock(rawBlock) {
    let block = JSON.parse(rawBlock);
    let transactions = block.data.transactions;
    // console.log("Transactions: ", transactions);
    for(let fullTransaction of transactions) {
      let transaction = fullTransaction.data;
      let outputs = transaction.outputs;

      for (let i in outputs) {
        for(let address of this.addresses) {
          if(outputs[i].pubKey == address.pubKey) {
            if(this.outputs[address.pubKey] instanceof Array) {
              this.outputs[address.pubKey].push({
                txHash: fullTransaction.hash,
                index: i,
                value: outputs[i].value
              });
            }
            else {
              this.outputs[address.pubKey] = [{
                txHash: fullTransaction.hash,
                index: i,
                value: outputs[i].value
              }];
            }
          }
        }
      }
    }
  }

  createAddress() {
      let privKey;
      do {
        privKey = randomBytes(32)
      } while (!ec.privateKeyVerify(privKey));
      const pubKey = ec.publicKeyCreate(privKey);
      this.addresses.push({privKey: privKey.toString('hex'), pubKey: pubKey.toString('hex')});
      this.setAddress(this.addresses.length-1);
      return this.currentAddress;
  }
  setAddress(index) {
    this.currentAddress = this.addresses[index];
  }

  transact(toAddress, value) {
    let fromAddress = this.currentAddress.pubKey;
    let privKey = this.currentAddress.privKey;
    // the list of output references belonging to the address trying to send money
    let potInputs = this.outputs[fromAddress];
    if (!potInputs || potInputs < 0)
      throw new Error("No inputs belonging to address: " + fromAddress);

    // change: the difference between amount needed and total amount from outputs
    // inputs: the inputs to be used in the transaction
    let { change, inputs } = this._getSufficientOutputs(potInputs, value);
    //array of transaction outputs
    let outputs = [];

    if(change < 0)
      throw new Error("Insufficient amount. Has: " + (value+change) + ". Needs: " + value);
    if(change == 0)
      outputs.push(new Output(value, toAddress));
    else {
      outputs = [new Output(value, toAddress), new Output(change, fromAddress)];
    }

    let transaction = new Transaction(inputs, outputs, null);
    transaction.hash = st.findHash(JSON.stringify(transaction.data));
    this.broadcastTransaction(transaction);
    // removes the used outputs from the wallet's list
    this.outputs[fromAddress].splice(0, inputs.length);
    return true;
  }

  getBalance() {
    let balance = 0;
    this.outputs[this.currentAddress.pubKey].forEach(function addBalance(output) {balance+=parseInt(output.value)});
    return balance;
  }

  /*
    @desc gets sufficient outputs to meet the value and returns change and inputs
    @param totalOutputs the list of outputs available
    @returns object with change and inputs
  */
  _getSufficientOutputs(totalOutputs, value) {

    let theseInputs = [];
    let valueSum = 0;
    let i = 0;
    let privKey = this.currentAddress.privKey;

    while(valueSum < value && i < totalOutputs.length) {
      let output = totalOutputs[i];
      valueSum += totalOutputs[i].value;
      // signs transaction hash of referenced output with private key
      let sigObj = ec.sign(Buffer.from(privKey, 'hex'), Buffer.from(output.txHash, 'hex'));
      let sig = Buffer.from(sigObj.signature).toString('hex');
      let input = new Input(output.txHash, output.index, sig);
      theseInputs.push(input);
      i++;
    }
    return {change: valueSum - value, inputs: theseInputs};
  }

  broadcastTransaction(transaction) {
    this.peers.forEach(function bc(peer) {
      Network.send(peer.networkID, "transaction", transaction);
    });
  }

  uploadData(path) {
    let walletData = JSON.parse(fs.readFileSync(path));
    this.addresses = walletData.addresses;
    if(walletData.currentAddress)
      this.currentAddress = walletData.currentAddress;
    this.outputs = walletData.outputs;
  }

  saveData(path) {
    let walletData = {
      addresses: this.addresses,
      outputs: this.outputs,
      currentAddress: this.currentAddress
    };
    fs.writeFileSync(path, JSON.stringify(walletData));
  }
}

module.exports = Wallet;
