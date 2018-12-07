/*
  Author: Chase Jeter
  Date: Dec 7, 2018
  Description: A simulated and interactive proof of work blockchain
*/

const bc = require("./Blockchain.js");
const st = require("./StandardTools.js")

var addresses = ["Chase", "Duncan", "Wesley", "Justin"]
var currentAddress = addresses[0];

var blockchain = new bc.Blockchain(addresses[0], 1000000);
var previousHash = blockchain.blocks[blockchain.blocks.length-1].hash;
blockchain.sendMoney(10000, currentAddress, addresses[1]);
let myBlockData = new bc.BlockData(previousHash, blockchain.transactions, 0, 0);
let hash = st.findNonce(myBlockData, blockchain.LEAD);
blockchain.addBlock(
  {
    data: myBlockData,
    hash: hash
  }
);
console.log(blockchain.blocks);
