/*
  Specifies the client for running a virtual node that contributes for a proof of work blockchain
*/

const {Transaction, Output, Ledger, BlockData} = require("./Blockchain.js");
const st = require('./StandardTools.js');
const fs = require('fs');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const Wallet = require("./wallet.js");

// Contributing node on the blockchain that mines blocks
class Node {
  /*
    @param connectedNode The node that this node gets its record of the blockchain from
  */
  constructor(peer, address, config, id, wallet) {
    this.address = address;
    this.peers = [];
    this.ledger = new Ledger([]);
    this.config = config;
    this._wallet = wallet;
    this.id = id;
    this._createNewLedger();
    // if(peer) _fromPeer(peer);
    // else if(!(_uploadFromState())) {
    //   _createNewLedger();
    // }
  }

  /*
    Saves the state of this node to its state path
  */
  saveState() {
    let node = {};
    for(let key in this) {
      if(key.charAt(0)!='_' && key!="ledger")
        node[key] = this[key];
    }
    let state = {
      node: node,
      ledger: this.ledger.blocks
    };
    let toSave = JSON.stringify(state);
    let filePath = 'state/node' + this.id + '.json';
    return fsPromises.writeFile(filePath, toSave).then(()=>(true))
      .catch((err) => {
        console.log(err.code);
        console.log(err.message);
        return false;
      });
  }

  /*
    Gets the node's state from the json file in the path
    @returns a boolean value. True if there is a state to upload from. False if otherwise.
  */
  _uploadFromState() {

  }

  /*
    Creates a new node with the ledger and rules from a node already on the network
    @param peer the peer node on the network
  */
  _fromPeer(peer) {
    this.ledger = peer.ledger;
    this.config = peer.config;
    this.peers.add(peer);
  }

  /*
    Creates the genesis block for a new blockchain
  */
  _createNewLedger() {
    this.address = this._wallet.createAddress();
    let outputs = [
      new Output(this.config.startingAmount, this.address.pubKey)
    ];
    let transaction = new Transaction([], outputs, "");
    transaction.hash = st.findHash(JSON.stringify(transaction.data));
    let newBlock = new BlockData(
      0,
      "",
      [transaction],
      "",
      0
      );
    let _hash = st.findNonce(newBlock, this.config.LEAD);
    let blocks = [{data:newBlock,hash:_hash}];
    this.ledger = new Ledger(blocks);
  }

  // Adds to the list of this node's open transactions
  addTransaction(transaction) {
    this.transactions.push(transaction);
  }

  // Mines a block, adds it to this node's ledger, and broadcasts the ledger
  mineBlock() {
    let previousHash = this.ledger.blocks[this.ledger.blocks.length-1].hash;
    let myBlockData = new BlockData(previousHash, this.transactions, 0, 0);
    let hash = st.findNonce(myBlockData, this.config.LEAD);
    let block =
      {
        data: myBlockData,
        hash: hash
      };
    this.ledger.addBlock(block);
    this.broadcastBlock(block);
  }

  /*
    Broadcast block to peers
    @param block the block to broadcast
  */
  broadcastBlock(block) {
    this.peers.forEach((peer) => {
      peer.receiveBlock(block);
    });
  }

  /*
   Receives a block from a peer and checks to make sure it is valid
   @param block block being received
  */
  receiveBlock(block) {
    let errors = verify(block);
    if(errors.length === 0)
      this.ledger.addBlock(block);
    else
      for (let error of errors)
        console.warn(error);
  }

  /*
    Verifies to make sure the block is valid
    @param block the block to be verified
    @returns an array of error messages
  */
  verify(block) {
    let errorMessages = [];
    //this works for now. Fix this later
    if(!(block.data instanceof BlockData && typeof block.hash === "string")) {
      errorMessages.push("Block data is formatted incorrectly.");
      return errorMessages;
    }

    let data = block.data;
    let hash = block.hash;

    //previous block hash of the block must match the actual block has of the last block in this node's ledger
    if(data.blockNumber != 0 && data.previousBlockHash != this.ledger.getLastBlock().hash)
      errorMessages.push("Hash does not match previous hash: "+ data.previousBlockHash + " != " + this.ledger.getLastBlock().hash);

    //must hash correctly
    if (st.findHash(JSON.stringify(data)) != hash)
      errorMessages.push("Hash is incorrect. The block hash is: " + hash + ". The correct hash is: " + st.findHash(JSON.stringify(data)));

    // must have the correct number of leading digits
    if(hash.substring(0, this.config.LEAD.length) !== this.config.LEAD)
      errorMessages.push("Hash does not have correct leading digits.");

    return errorMessages;
  }

  /*
    @returns the ledger this node maintains
  */
  getLedger() {
    return this.ledger;
  }
}

//Testing for this
const config = {
  LEAD: "0000"
}
let wallet = new Wallet([], eventEmitter, null);
console.log(JSON.stringify(wallet));
let testNode = new Node(0, "", config, 1, wallet);
let replacer = function(key, value) {
  if(key === "wallet")
    return undefined;
  return value;
}
console.log(JSON.stringify(testNode, replacer, ' '));
console.log(Object.getPrototypeOf(testNode.ledger.getLastBlock().data));
console.log(BlockData.prototype);
//console.log(block.data instanceof BlockData);
console.log(testNode.verify(testNode.ledger.getLastBlock()));
