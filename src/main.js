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
const Node = require("./POW_Node.js");
const assert = require('assert').strict;
const { Network } = require('./Network.js');

const _pubKey = "036302e5b318785148af1eb7744a4d2cbd5380d4d8faab29b1f80cd7665f066c9e";
const _privKey = "d287fd14ea6f15635804fa633b6c0ca31598641faa20f50d09d2e147c6106be5";

const CONFIG = {
  LEAD: "0"
}

// casts obj (Object) to toCast (Object)
function _cast(toCast, obj) {
  for (let prop in obj)
    toCast[prop] = obj[prop];
}

let wallet = new Wallet([], eventEmitter, null);
try {
  wallet.uploadData("state/wallet.json");
  var availWallet = true;
} catch(err) {
  var availWallet = false;
}

var data, nodes, count, currentNode;
var loadedNodes = [];
data = {nodes: [], count: 0, currentNode: null};

let rawData = fs.readFileSync("state/state.json");
if(rawData.length > 0)
  data = JSON.parse(rawData);
data.nodes.forEach(function loadNode(node) {
  let loadedNode = new Node(null, null, null, node, wallet, "u");
  loadedNodes.push(loadedNode);
  Network.addNode(loadedNode, loadedNode.id);
  wallet.addPeer(loadedNode);
  if(node == data.currentNode) {
    currentNode = loadedNode;
  }
});

({nodes, count} = data);

function _addNode(node) {
  count++;
  nodes.push(node.id);
  loadedNodes.push(node);
}

// Prints status items including: list of nodes,
function printStatus() {
  console.log("Nodes: " + JSON.stringify(nodes, ["id"]));
  console.log("Current node: " + currentNode.id);
  console.log("Current address: " + JSON.stringify(wallet.currentAddress, null, ' '));
  printLedger();
}

// creates a new node not connected to an existing network.
function createNewBlockchain(amount) {
  let intAmount = parseInt(amount);
  let config = CONFIG;
  config.startingAmount = amount;
  wallet = new Wallet([], eventEmitter, null);
  nodes = [];
  loadedNodes = [];
  Network.reset();
  Network.addNode(wallet);
  count = 0;
  const ID = count+1;
  let node = new Node(null, null, config, ID, wallet, "c");
  Network.addNode(node, node.id);
  _addNode(node);
  wallet.addPeer(node);
  currentNode = node;
  printStatus();
}

// prints the ledger of the current node
function printLedger() {
  console.log("Ledger: " + currentNode.ledger.toString());
}

// adds a new node using the current node as the peer
// adds the new node as a peer of all existing nodes
function addNode() {
  let newNode = new Node(currentNode.networkID, null, null, count+1, wallet, "p");
  Network.addNode(newNode, newNode.id);
  loadedNodes.forEach((node) => {
    node.addPeer(newNode.networkID);
  });
  _addNode(newNode);
}

function transact(toAddress, amount) {
  let intAmount = parseInt(amount);
  let retVal = "success";
  try {
    wallet.transact(toAddress, intAmount);
  }
  catch (err) {
    retVal = err.message;
  }
  return retVal;
}

function mineBlock() {
  currentNode.mineBlock();
}

function getNodes() {
  return nodes;
}

function setNode(index) {
  currentNode = loadedNodes[index];
}

//
// function addBlock() {
//   let previousHash = blockchain.blocks[blockchain.blocks.length-1].hash;
//   let myBlockData = new BlockData(previousHash, blockchain.transactions, 0, 0);
//   let hash = st.findNonce(myBlockData, blockchain.LEAD);
//   blockchain.addBlock(
//     {
//       data: myBlockData,
//       hash: hash
//     }
//   );
// }
//
// function addCustomBlock(hash, nonce, previousHash) {
//   let myBlockData = new BlockData(previousHash, blockchain.transactions, 0, nonce);
//   blockchain.addBlock(
//     {
//       data: myBlockData,
//       hash: hash
//     }
//   );
// }


program
  .version('1.0')
  .description('A simulated and interactive proof of work blockchain');

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
    console.log("Addresses: " + JSON.stringify(wallet.addresses, null, " "));
    console.log("Current address: " + JSON.stringify(wallet.currentAddress, null, " "));
  });

program
  .command('createNewBlockchain <amount>')
  .alias('cb')
  .description('creates a new blockchain')
  .action((amount) => {
    createNewBlockchain(amount);
  });

program
  .command('createNewNode')
  .alias('cn')
  .description('creates a new node with the current node as a peer')
  .action(() => {
    addNode();
  });

program
  .command('getBalance')
  .alias('gb')
  .description('gets current balance of current account')
  .action(() => {console.log(wallet.getBalance())});

program
  .command('listAddresses')
  .alias('la')
  .description('list all of the addresses in the wallet and the current address')
  .action(() => {
    console.log(wallet.addresses);
    //console.log("Current address: ");
    console.log("Current address:\n", wallet.currentAddress);
  })

program
  .command('listNodes')
  .alias('ln')
  .description('list all of the nodes')
  .action(() => {
    console.log("Nodes: ", getNodes());
  })

program
  .command('mineBlock')
  .alias('mb')
  .description('mines a block')
  .action(() => {
    mineBlock();
  });

program
  .command('sendMoney <toAddress> <amount>')
  .alias('sm')
  .description('sends money to <toAddress> with the amount <amount>')
  .action((toAddress, amount) => {
    console.log(transact(toAddress, amount));
  });

program
  .command('setAddress <index>')
  .alias('sa')
  .description('sets the current address to the <index> address with the first being 0')
  .action((index) => {
    wallet.setAddress(index);
    console.log(wallet.currentAddress);
  });

program
  .command('setNode <index>')
  .alias('sn')
  .description('sets the current node to the node at <index>')
  .action((index) => {
    setNode(index);
  });

program
  .command('status')
  .description('prints out the blockchain')
  .action(() => {
    printStatus();
  });

program
  .command('verifyBlockchain')
  .alias('v')
  .description('verifies the blockchain')
  .action(() => {
    console.log(blockchain.verify());
  });

program.parse(process.argv);
const obj = {
  blockchain: blockchain,
  addresses: addresses
}

async function saveState() {
  data = {nodes: nodes};
  loadedNodes.forEach((node) => {
    node.saveState();
  });
  data.count = count;
  data.currentNode = currentNode.id;
  fs.writeFile("state/state.json", JSON.stringify(data), (err) => {if(err) console.log("\n" + err.stack);});
  wallet.saveData("state/wallet.json");
}
saveState()
.catch((err) => console.log("\n" + err.stack));





// Some testing
function testPassWallet() {
  let config = {
    LEAD: "0",
    startingAmount: 100
  }
  wallet = new Wallet([], eventEmitter, null);
  let node = new Node(null, null, config, 0, wallet);
  currentNode = node;
  wallet.random = [0, 1];
  assert.deepEqual(wallet, node._wallet);
  assert(wallet.addresses.length>0);
  printStatus();
}
// testPassWallet();
// .catch((err) => console.log("\n" + err.stack));
