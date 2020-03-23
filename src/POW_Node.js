/*
  Specifies the client for running a virtual node that contributes for a proof of work blockchain
*/

const {Transaction, Output, Ledger, BlockData} = require("./Blockchain.js");
const st = require('./StandardTools.js');
const fs = require('fs');
const fsPromises = fs.promises;
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const Wallet = require("./wallet.js");
const assert = require('assert').strict;
const { Network } = require('./Network.js');

// Contributing node on the blockchain that mines blocks
class Node {
  /*
    @param connectedNode The node that this node gets its record of the blockchain from
  */
  constructor(peer, address, config, id, wallet, flag) {
    this.address = address;
    this.peers = [];
    this.ledger = new Ledger([]);
    this.config = config;
    this.transactions = [];
    this._wallet = wallet;
    this.id = id;
    if(flag === "p") this._fromPeer(peer);
    else if(flag==="u") this._uploadFromState();
    else if (flag==="c") this._createNewLedger();
    else throw new Error("Invalid flag.");

    //subscriptions
    Network.onRequest(this, "transaction", this.addTransaction);
    Network.onRequest(this, "block", this.receiveBlock);
    Network.onRequest(this, "ledger", this.getLedger);
    Network.onRequest(this, "peers", this.getPeers);
    Network.onRequest(this, "config", this.getConfig);
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
    return fsPromises.writeFile(filePath, toSave)
      .catch((err) => {
        console.log("\n" + err.stack);
        return false;
      });
  }

  /*
    Gets the node's state from the json file in the path
    @returns a boolean value. True if there is a state to upload from. False if otherwise.
  */
  _uploadFromState() {
    let rawState = "";
    try {
      rawState = fs.readFileSync('state/node' + this.id + '.json');
    } catch (err) {
      if (err.message.indexOf('ENOENT: no such file or directory') === -1)
        throw err;
    }
    if (rawState.length===0)
      return false;
    const state = JSON.parse(rawState);
    for (let prop in state.node)
      this[prop] = state.node[prop];
    this.ledger = new Ledger(state.ledger);
    return true;
  }

  /*
    Creates a new node with the ledger and rules from a node already on the network
    @param peer the peer node on the network
  */
  _fromPeer(peer) {
    this.ledger = Network.request(peer, "ledger");
    this.config = Network.request(peer, "config");
    this.peers = Network.request(peer, "peers");
    this.peers.push(peer);
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
    this._wallet.receiveBlock(blocks[0]);
  }

  // Adds to the list of this node's open transactions
  addTransaction(transaction) {
    this.transactions.push(transaction);
  }

  // Mines a block, adds it to this node's ledger, and broadcasts the ledger
  mineBlock() {
    let previousHash = this.ledger.getLastBlock().hash;
    let blockNum = this.ledger.getLastBlock().data.blockNumber+1;
    let myBlockData = new BlockData(blockNum, previousHash, this.transactions, 0, 0);
    let hash = st.findNonce(myBlockData, this.config.LEAD);
    let block =
      {
        data: myBlockData,
        hash: hash
      };
    this.ledger.addBlock(block);
    this.broadcastBlock(block);
    this.transactions = [];
  }

  /*
    Broadcast block to peers
    @param block the block to broadcast
  */
  broadcastBlock(block) {
    this.peers.forEach((peer) => {
      Network.send(peer.networkID, "block", block);
    });
    Network.emit(this, "newBlock", block);
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

    //previous block hash of the block must match the actual block hash of the last block in this node's ledger
    if(data.blockNumber != 0 && data.previousBlockHash != this.ledger.blocks[data.blockNumber-1].hash)
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

  getPeers() {
    return this.peers;
  }

  getConfig() {
    return this.config;
  }

  toString() {
    let toString = JSON.stringify(this, (key, value) => {
      if(key.charAt(0)==='_' || key==="ledger")
        return undefined;
      return value;
    }, ' ');
    return toString;
  }
}

const config = {
  LEAD: "0"
}
let wallet = new Wallet([], eventEmitter, null);
var state = {
  testNode: null,
  replacer: null,
  _maintain: false
}
var stateStack = [];

function createNewState() {
  if(state._maintain) {
    state._maintain = false;
    return false;
  }
  state.testNode = new Node(null, "", config, 1, wallet, "c");
  state.replacer = function(key, value) {
    if(key === "wallet")
      return undefined;
    return value;
  };
}

function maintainState() {
  state._maintain = true;
}

let testFuncs = [

  // Tests for creating a new node with ledger
  async function test_CreateNewLedger() {
    console.log("Does _createNewLedger() work?");
    let err = state.testNode.verify(state.testNode.ledger.getLastBlock());
    assert(!(err.length>0), err + "\nJSON: \n" + JSON.stringify(state.testNode, state.replacer, ' '))
    console.log("Yes.");
  },

  // TESTING MINING A BLOCK
  async function testMineBlock() {
    // broadcastBlock() has not been tested and is required for mineBlock(). Replaces it with a filler function.
    let broadcastBlock = state.testNode.broadcastBlock;
    state.testNode.broadcastBlock = (block) => {
      return;
    }
    console.log("Does mining a block work?")
    state.testNode.mineBlock();
    assert.equal(state.testNode.ledger.chainSize(), 2, "Block not added to ledger");
    err = state.testNode.verify(state.testNode.ledger.getLastBlock());
    let message = err + "\nJSON:\n"+JSON.stringify(state.testNode.ledger, state.replacer, ' ');
    assert(err.length===0, message);
    console.log("Yes.");
    state.testNode.broadcastBlock = broadcastBlock;
  },

  // TESTING ADDING NODE FROM PEER
  async function testFromPeer() {
    console.log("Does adding node from peer work?");
    let peerNode = new Node(state.testNode, "", null, 2, wallet, "p");
    assert.deepEqual(peerNode.ledger, state.testNode.ledger, "The ledger objects do not match");
    assert.deepEqual(peerNode.peers[0], state.testNode, "Node not added as a peer ");
    assert.deepEqual(peerNode.config, state.testNode.config, "Config objects do not match.");
    console.log("Yes.");
  },

  // TESTING SAVING TO STATE
  async function testSaveState() {
    let actualState;
    let expectedState;
    return state.testNode.saveState().then((success) => {
      console.log("Does saving to state work?");
      assert(!(success===false), "Saving to state did not succeed.");
      const path = 'state/node' + state.testNode.id + '.json';
      const as = fs.readFileSync(path, 'utf8');
      expectedState = {node: {}, ledger: state.testNode.ledger.blocks};
      for(let key in state.testNode) {
        if(key.charAt(0)!='_' && key!="ledger")
          expectedState.node[key] = state.testNode[key];
      };
      const es = JSON.stringify(expectedState);
      assert.equal(as, es, `Actual: \n${as}\nExpected:\n${es}`);
      console.log("Yes.");
      maintainState();
    });
  },

  // TESTING UPLOADING FROM STATE
  async function testUploadFromState() {
    console.log("Does uploading from state work?");
    let newNode = new Node(null, null, null, 1, wallet, "u");
    let compareNode = JSON.parse(JSON.stringify(state.testNode));
    newNode = JSON.parse(JSON.stringify(newNode));
    assert.deepEqual(newNode, compareNode);
    console.log("Yes.");
  }
];

function _errHandler(err) {
  //console.error(err.toString());
  console.error(err.stack);
  process.exit(1);
}



async function runTests() {
  Error.stackTraceLimit = 2;
  const path = 'state/node' + 1 + '.json';
  try {
    fs.unlinkSync(path);
  } catch (err) {_errHandler(err)}
  for(let func of testFuncs) {
    createNewState();
    await func().catch(_errHandler);
  }
};
// runTests();

module.exports = Node;
