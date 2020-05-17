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
const sc = st.simpleCrypto;
const fs = require("fs");
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

let wallet;
var data, nodes, count, currentNode;
var loadedNodes = [];
data = {nodes: [], count: 0, currentNode: null};

wallet = new Wallet([], eventEmitter, null);
try {
  wallet.uploadData("state/wallet.json");
  var availWallet = true;
} catch(err) {
  var availWallet = false;
}

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


// creates a new node not connected to an existing network.
function createNewBlockchain(amount) {
  let intAmount = parseInt(amount);
  let config = CONFIG;
  config.startingAmount = parseInt(amount);
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
  return true;
}

// returns the ledger of the current node
function getLedger() {
  return currentNode.ledger;
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

function transact(toAddress, amount, changeState) {
  let intAmount = parseInt(amount);
  let retVal;
  try {
    retVal = wallet.transact(toAddress, intAmount, changeState);
  }
  catch (err) {
    retVal = err.message;
  }
  return retVal;
}

function mineBlock() {
  currentNode.mineBlock();
}

function getLoadedNodes() {
  return loadedNodes;
}

function getNodes() {
  return nodes;
}

function getWallet() {
  return wallet;
}

function getCurrentNode() {
  return currentNode;
}

function setNode(index) {
  currentNode = loadedNodes[index];
}

module.exports.addNode = () => {
  addNode();
  saveState();
};

module.exports.createNewAddress = () => {
  wallet.createAddress();
  saveState()
}

module.exports.createNewBlockchain = (amount) => {
  createNewBlockchain(amount);
  saveState();
}

module.exports.mineBlock = () => {
  mineBlock();
  saveState();
}

module.exports.broadcastTransaction = (transaction) => {
  wallet.broadcastTransaction(transaction);
  saveState();
}

module.exports.setAddress = (index) => {
  wallet.setAddress(index);
  saveState();
  return wallet.currentAddress;
}

module.exports.transact = (toAddress, amount, changeState) => {
  let ret = transact(toAddress, amount, changeState);
  saveState();
  return ret;
}

module.exports.getNodes = getNodes;
module.exports.getWallet = getWallet;
module.exports.getCurrentNode = getCurrentNode;
module.exports.getLedger = getLedger;
module.exports.getLoadedNodes = getLoadedNodes;
module.exports.setNode = setNode;


// const obj = {
//   blockchain: blockchain,
//   addresses: addresses
// }

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
