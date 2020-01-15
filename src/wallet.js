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

    this.eventEmitter.on('block', (block) => {
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
    });
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
    if (!this.inputs[fromAddress])
      return false;
    let inputs = this.inputs[fromAddress];
    let theseInputs = [];
    let valueSum = 0;
    let i = 0;
    while(valueSum < value && i < inputs.length) {
      valueSum += inputs[i].value;
      theseInputs.push(new Input(inputs[i].txHash, inputs[i].index, ec.sign(Buffer.from(privKey, 'hex'), Buffer.from(inputs[i].txHash, 'hex'))));
      i++;
    }
    let change = valueSum - value;
    let outputs = [];
    console.log(change);
    if(change < 0)
      return false
    if(change == 0)
      outputs.push(new Output(value, toAddress));
    else {
      outputs = [new Output(value, toAddress), new Output(change, fromAddress)];
    }
    let transaction = new Transaction(theseInputs, outputs, null);
    transaction.hash = st.findHash(JSON.stringify(transaction.data));
    this.blockchain.broadcastTransaction(transaction);
    inputs.splice(0, i);
    return true;
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
