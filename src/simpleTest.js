
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

let blockData = new BlockData();

for (key in blockData) {
  console.log(key);
}

console.log(blockData);
