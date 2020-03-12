const {randomBytes} = require('crypto');
const ec = require('secp256k1');
const fs = require("fs");
const Blockchain = require("./Blockchain.js");

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
    this.inputs = {};
    this.blockchain = blockchain;
    this.peers = [];

    this.eventEmitter.on('block', (block) => {
    });
  }

  receiveBlock(block) {
    let transactions = block.data.transactions;
    for(let fullTransaction of transactions) {
      let transaction = fullTransaction.data;
      let outputs = transaction.outputs;

      for (let i in outputs) {

        for(let address of this.addresses) {
          if(outputs[i].pubKey == address.pubKey) {
            if(this.inputs[address]) {
              this.inputs[address.pubKey].push({
                txHash: fullTransaction.hash,
                index: i,
                value: outputs[i].value
              });
            }
            else {
              this.inputs[address.pubKey] = [{
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
    let inputs = this.inputs[fromAddress];
    if (!inputs || inputs < 0)
      throw new Error("No inputs belonging to address: " + fromAddress);

    let neededInputs = [];
    let change = _getSufficientInputs(this.inputs[fromAddress], value, neededInputs);
    let outputs = [];
    console.log(change);

    if(change < 0)
      throw new Error("Insufficient amount. Has: " + valueSum + ". Needs: " + value);
    if(change == 0)
      outputs.push(new Output(value, toAddress));
    else {
      outputs = [new Output(value, toAddress), new Output(change, fromAddress)];
    }

    let transaction = new Transaction(theseInputs, outputs, null);
    transaction.hash = st.findHash(JSON.stringify(transaction.data));
    this.broadcastTransaction(transaction);
    inputs.splice(0, neededInputs.length);
    return true;
  }
  _getSufficientInputs(totalInputs, value, neededInputs) {
    let theseInputs = [];
    let valueSum = 0;
    let i = 0;
    while(valueSum < value && i < totalInputs.length) {
      valueSum += inputs[i].value;
      neededInputs.push(new Input(totalInputs[i].txHash, totalInputs[i].index, ec.sign(Buffer.from(privKey, 'hex'), Buffer.from(totalInputs[i].txHash, 'hex'))));
      i++;
    }
    return valueSum - value;
  }

  broadcastTransaction(transaction) {
    for (let peer in this.peers) {
      peer.addTransaction(transaction);
    }
  }

  uploadData(path) {
    let walletData = JSON.parse(fs.readFileSync(path));
    this.addresses = walletData.addresses;
    if(walletData.currentAddress)
      this.currentAddress = walletData.currentAddress;
    this.inputs = walletData.inputs;
  }

  saveData(path) {
    let walletData = {
      addresses: this.addresses,
      inputs: this.inputs,
      currentAddress: this.currentAddress
    };
    fs.writeFileSync(path, JSON.stringify(walletData));
  }
}

module.exports = Wallet;
