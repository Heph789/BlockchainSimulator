#!/usr/bin/env node

/*
  Author: Chase Jeter
  Date: April 2019
  Description: A simulated and interactive proof of work blockchain
*/

const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

const {Blockchain, BlockData} = require("./Blockchain.js");
const st = require("./StandardTools.js");
const fs = require("fs");
const program = require("commander");
const Wallet = require("./wallet.js");

const _pubKey = "036302e5b318785148af1eb7744a4d2cbd5380d4d8faab29b1f80cd7665f066c9e";
const _privKey = "d287fd14ea6f15635804fa633b6c0ca31598641faa20f50d09d2e147c6106be5";




var blockchain = new Blockchain("", 1, eventEmitter);
var data = JSON.parse(fs.readFileSync("state/blockchain.json"));
if(data) {
  var blockchainObj = data.blockchain;
  var addresses = data.addresses;
  for (var prop in blockchainObj) {
    blockchain[prop] = blockchainObj[prop];
  }
}
blockchain.eventEmitter = eventEmitter;

let wallet = new Wallet([], eventEmitter, blockchain);
wallet.uploadData("state/wallet.json");

function createNewBlockchain(amount) {
  let intAmount = parseInt(amount);
  let address = wallet.createAddress();
  wallet = new Wallet([address], eventEmitter, null);
  blockchain = new Blockchain(address.pubKey, intAmount, eventEmitter);
  wallet.blockchain = blockchain;
}

function printBlockchain() {
  console.log(blockchain);
}

//blockchain.sendMoney(100, currentAddress, "Duncan");

function transact(amount, toAddress) {
  let intAmount = parseInt(amount);
  return wallet.transact(toAddress, intAmount);
}

function addBlock() {
  let previousHash = blockchain.blocks[blockchain.blocks.length-1].hash;
  let myBlockData = new BlockData(previousHash, blockchain.transactions, 0, 0);
  let hash = st.findNonce(myBlockData, blockchain.LEAD);
  blockchain.addBlock(
    {
      data: myBlockData,
      hash: hash
    }
  );
}

function addCustomBlock(hash, nonce, previousHash) {
  let myBlockData = new BlockData(previousHash, blockchain.transactions, 0, nonce);
  blockchain.addBlock(
    {
      data: myBlockData,
      hash: hash
    }
  );
}

/*blockchain = new Blockchain(addresses[0], 1000000);
var previousHash = blockchain.blocks[blockchain.blocks.length-1].hash;
blockchain.sendMoney(10000, currentAddress, addresses[1]);
let myBlockData = new BlockData(previousHash, blockchain.transactions, 0, 0);
let hash = st.findNonce(myBlockData, blockchain.LEAD);
blockchain.addBlock(
  {
    data: myBlockData,
    hash: hash
  }
);
console.log(blockchain.blocks);*/

program
  .version('1.0')
  .description('A simulated and interactive proof of work blockchain');

program
  .command('createNewBlockchain <amount>')
  .alias('cb')
  .description('creates a new blockchain')
  .action((amount) => {
    createNewBlockchain(amount);
  });

program
  .command('printBlockchain')
  .alias('pb')
  .description('prints out the blockchain')
  .action(() => {
    printBlockchain();
  });

program
  .command('sendMoney <toAddress> <amount>')
  .alias('sm')
  .description('sends money to <toAdress> with the amount <amount>')
  .action((toAddress, amount) => {
    if(!transact(amount, toAddress))
      console.log("Something went wrong");
  });

program
  .command('addBlock')
  .alias('ab')
  .description('adds a block')
  .action(() => {
    addBlock();
  });

program
  .command('verifyBlockchain')
  .alias('v')
  .description('verifies the blockchain')
  .action(() => {
    console.log(blockchain.verify());
  });

program
  .command('addCustomBlock <hash> <nonce> <previousHash>')
  .alias('acb')
  .description('adds a custom block to the blockchain using custom <hash> and <nonce>. <previousHash> is supposed to be the hash of the previous block')
  .action((hash, nonce, previousHash) => {
    addCustomBlock(hash, nonce, previousHash);
  });

program
  .command('createAddress')
  .alias('ca')
  .description('creates a public-private key pair and prints it out')
  .action(() => {
    wallet.createAddress();
    console.log(wallet.addresses);
  });

program
  .command('listAddresses')
  .alias('la')
  .description('list all of the addresses in the wallet and the current address')
  .action(() => {
    console.log(wallet.addresses);
    console.log("Current address: ");
    console.log(wallet.currentAddress);
  })

program
  .command('setAddress <index>')
  .alias('sa')
  .description('sets the current address to the <index> address with the first being 0')
  .action((index) => {
    wallet.setAddress(index);
    console.log(wallet.currentAddress);
  })

program.parse(process.argv);
const obj = {
  blockchain: blockchain,
  addresses: addresses
}
fs.writeFileSync("state/blockchain.json", JSON.stringify(obj));
wallet.saveData("state/wallet.json");
