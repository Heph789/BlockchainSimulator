/*
  Author: Chase Jeter
  Date: Dec 7, 2018
  Description: A simulated and interactive proof of work blockchain
*/

const {Blockchain, BlockData} = require("./Blockchain.js");
const st = require("./StandardTools.js");
const fs = require("fs");
const program = require("commander");

var addresses = ["Chase", "Duncan", "Wesley", "Justin"];
var currentAddress = addresses[0];

var blockchain = new Blockchain(currentAddress, 1);
var obj = JSON.parse(fs.readFileSync("./blockchain.json"));
for (var prop in obj) {
  blockchain[prop] = obj[prop];
}

function createNewBlockchain(amount) {
  let intAmount = parseInt(amount);
  blockchain = new Blockchain(currentAddress, intAmount);
}

function printBlockchain() {
  console.log(blockchain);
}

//blockchain.sendMoney(100, currentAddress, "Duncan");

function transact(amount, toAddress) {
  let intAmount = parseInt(amount);
  blockchain.sendMoney(intAmount, currentAddress, toAddress);
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
    transact(amount, toAddress);
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
  .description('adds a custom block to the blockchain using custom <hash> and <nonce>. <previousHash is supposed to be the hash of the previous block')
  .action((hash, nonce, previousHash) => {
    addCustomBlock(hash, nonce, previousHash);
  });

program.parse(process.argv);

fs.writeFileSync("./blockchain.json", JSON.stringify(blockchain));
