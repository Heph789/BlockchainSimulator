/*
  Specifies the client for running a virtual node that contributes for a proof of work blockchain
*/

const {Transaction, Output, Input, Ledger, BlockData} = require("./Blockchain.js");
const st = require("./StandardTools.js");
const sc = st.simpleCrypto;
const fs = require('fs');
const fsPromises = fs.promises;
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const ec = require('secp256k1');
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
    Network.onRequest(this, "transaction", function recTransaction(data) {
      this.addTransaction(JSON.parse(data));
    });
    Network.onRequest(this, "block", function recBlock(data) {
      this.receiveBlock(JSON.parse(data));
    });

    // gives data on request
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
    this.ledger = JSON.parse(Network.request(peer, "ledger"));
    this.config = JSON.parse(Network.request(peer, "config"));
    this.peers = JSON.parse(Network.request(peer, "peers"));
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
    transaction.hash = sc.findHash(JSON.stringify(transaction.data));
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
    this._wallet.receiveBlock(JSON.stringify(blocks[0]));
  }

  // Adds to the list of this node's open transactions
  addTransaction(transaction) {
    this.transactions.push(transaction);
  }

  // Mines a block, adds it to this node's ledger, and broadcasts the ledger
  mineBlock() {
    let i = 0;
    let trueCount = 0;
    while (i<this.transactions.length) {
      const verTrans = this._verifyTransaction(this.transactions[i]);
      if(verTrans.length > 0) {
        console.error("Transaction " + trueCount + ": " + verTrans);
        // removes transaction if there is an error
        this.transactions.splice(i, 1);
      } else i++;
      trueCount++;
    }
    if(this.transactions.length === 0) {
      console.error("Cannot mine empty block.");
      return;
    }
    let previousHash = this.ledger.getLastBlock().hash;
    let blockNum = this.ledger.getLastBlock().data.blockNumber+1;
    let myBlockData = new BlockData(blockNum, previousHash, this.transactions, 0, 0);
    let hash = st.findNonce(myBlockData, this.config.LEAD);
    let block =
      {
        data: myBlockData,
        hash: hash
      };
    this._addBlock(block);
    this.transactions = [];
  }

  _addBlock(block) {
    this.ledger.addBlock(block);
    this.broadcastBlock(block);
  }

  /*
    Broadcast block to peers
    @param block the block to broadcast
  */
  broadcastBlock(block) {
    this.peers.forEach((peer) => {
      Network.send(peer, "block", block);
    });
    Network.emit(this, "newBlock", block);
  }

  /*
   Receives a block from a peer and checks to make sure it is valid
   @param block block being received
  */
  receiveBlock(block) {
    let errors = this.verify(block);
    if(errors.length === 0) {
      this.ledger.addBlock(block);
      // quick fix, eventually transactions will have to be validated and cleaned out every time a new block is added
      this.transactions = [];
    }
    else {
      console.log("From node " + this.id + ":");
      for (let error of errors)
        console.warn(error);
      console.log("Block: ", block);
      console.log("Transactions: ", JSON.stringify(block.data.transactions, null, ' '))
    }
  }

  addPeer(peer) {
    this.peers.push(peer);
  }

  /*
    Verifies to make sure the block is valid
    @param block the block to be verified
    @returns an array of error messages
  */
  verify(block) {
    let errorMessages = [];
    //this works for now. Fix this later
    if(!(block.hasOwnProperty("data") && block.hasOwnProperty("hash")) || !(this._isTypeOf(block.data, new BlockData()) && typeof block.hash === "string")) {
      errorMessages.push("Block data is formatted incorrectly.");
      return errorMessages;
    }

    let data = block.data;
    let hash = block.hash;
    // block number of incoming block must be only 1 block ahead of current ledger
    if(data.blockNumber !== this.ledger.chainSize()) {
      errorMessages.push("Incoming chain length differs from local chain.");
      return errorMessages;
    }
    //previous block hash of the block must match the actual block hash of the last block in this node's ledger
    if(data.blockNumber != 0 && data.previousBlockHash != this.ledger.blocks[data.blockNumber-1].hash)
      errorMessages.push("Hash does not match previous hash: "+ data.previousBlockHash + " != " + this.ledger.getLastBlock().hash);

    //must hash correctly
    if (sc.findHash(JSON.stringify(data)) != hash)
      errorMessages.push("Hash is incorrect. The block hash is: " + hash + ". The correct hash is: " + sc.findHash(JSON.stringify(data)));

    // must have the correct number of leading digits
    if(hash.substring(0, this.config.LEAD.length) !== this.config.LEAD)
      errorMessages.push("Hash does not have correct leading digits.");

    for (let i = 0; i<data.transactions.length; i++) {
      const verTrans = this._verifyTransaction(data.transactions[i]);
      if(verTrans.length > 0) errorMessages.push("Transaction " + i + ": " + verTrans)
    }
    return errorMessages;
  }

  /*
    @desc verifies transaction
    @param transaction to verify
    @returns error message if verification succeeds, empty string if otherwise.
  */
  _verifyTransaction(transaction) {
    let errMessages = [];

    if (!( this._isTypeOf(transaction, new Transaction([new Input()], [new Output()], "")) )) {
      return "Transaction is formatted incorrectly.";
    }

    // Verifies the transaction hash
    let actualHash = sc.findHash(JSON.stringify(transaction.data));
    if(!( actualHash === transaction.hash )) {
      return "Transaction does not match hash.\n\tActual transaction hash: " + actualHash + "\n\tStated transaction hash: " + transaction.hash;
    }

    // Verifies that enough funds are available
    let { inputs, outputs } = transaction.data;
    let totalInputValue = 0;
    let count = 0;
    for(let input of inputs) {
      let tx = this._searchTransaction(input.previousTx).data;
      count++;
      if(tx == null)
        return "Transaction for input does not exist";
      // Verifies that the given index is in the range of real outputs in the referenced transaction
      if(input.index < 0 || input.index >= tx.outputs.length)
        return "Output index is out of range. Outputs length: " + tx.outputs.length + ". Index: " + input.index;
      // Verifies that the referenced output has never been referenced before
      if(this._isReferenced(input.previousTx, input.index))
        return "Output has already been referenced";
      const output = tx.outputs[input.index];
      // Verifies that referenced output public address matches the public address of the redeeming account
      if(!(output.pubKey === input.redeemerKey))
        return "Redeemer's public key does not match referenced output";
      // Verifies the signature (makes sure that the person trying to spend the funds actually owns them)
      if(!( sc.verify(input.previousTx, input.sig, input.redeemerKey) ))
        return "Verifying signature failed."
      totalInputValue += output.value;
    }

    let totalOutputValue = 0;
    for (let output of outputs) {
      totalOutputValue += output.value;
    }

    if(totalOutputValue > totalInputValue)
      return "Not enough funds"

    return "";
  }

  /*
    @desc searches through the ledger to find a transaction
    @param txHash the hash of the transaction
    @returns the transaction object (of type Transaction) or null if no transaction is found
  */
  _searchTransaction(txHash) {
    const blocks = this.ledger.blocks;
    // loops through the ledger with most recent blocks first
    for(let i = blocks.length-1; i>=0; i--) {
      let block = blocks[i].data;
      let transactions = block.transactions;
      //loops through transactions in block
      for(let transaction of transactions)
        if(transaction.hash === txHash) return transaction;
    }
    return null;
  }

  /*
    @desc searches through the ledger to determine if an output has been referenced
    @param txHash the hash of the output's transaction
    @param index the index of the output
    @returns true if output has been referenced, false if otherwise
  */
  _isReferenced(txHash, index) {
    const blocks = this.ledger.blocks;
    // loops through ledger with most recent blocks first
    for(let i = blocks.length-1; i>=0; i--) {
      let transactions = blocks[i].data.transactions;
      // true if the transaction has been passed
      let passedOutput = false;
      // loops through transactions in block
      for(let tx of transactions) {
        // if transaction hash matches, the output has been passed
        passedOutput = tx.hash === txHash;
        let inputs = tx.data.inputs;
        let count = 0;
        // loops through inputs in the transactions. If the input references the given hash and index, return false
        for(let input of inputs) {
          if (input.previousTx===txHash && input.index==index) return true
        }
      }
      // an output cannot be referenced before it has been created. if output has been passed, return false
      if (passedOutput) return false;
    }
    //default to false
    return false;
  }

  /*
    @desc checks if format of actual matches format of expected. Checks recursively for inner objects.
    @param actual object to check
    @param expected object to check against
  */
  _isTypeOf(actual, expected) {
    if(typeof actual !== 'object') {
      return false
    }
    // checking format of array
    if(Array.isArray(expected)) {
      // if expected is an array, actual must be an
      if (!Array.isArray(actual)) return false;
      // if the length of expected is 0, then there is no format to the array. return true
      if (expected.length === 0) return true;
      // loop through actual and check if type of each item matches expected
      for(let item of actual)
        if(!(this._isTypeOf(item, expected[0]))) return false;
    }
    // checking format of objects
    else {
      for(let prop in expected) {
        /*
          if the property names do not match, return false
          if the expected property is an object, check that the actual property is a type of the expected property
            otherwise, return false
        */
        if( !actual.hasOwnProperty(prop) || ( typeof expected[prop] === 'object' && !( this._isTypeOf(actual[prop], expected[prop]) ) ) ) return false;
      }
    }
    // default to true
    return true;
  }

  revert() {
    this.ledger.blocks.pop();
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
  state.testNode = new Node(null, "", config, 101, wallet, "c");
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
  },

  // TESTING VERIFYING PROPERTIES OF OBJECTS
  async function test_IsTypeOf() {
    console.log("Does _isTypeOf() work?");
    let obj1 = {
      hello: "content"
    };
    let obj2 = {
      hello: undefined
    };
    //testing shallow objects
    assert(state.testNode._isTypeOf(obj1, obj2));

    obj2 = {
      hello: {
        nestedHello: undefined
      }
    }

    // testing deep objects
    assert(!(state.testNode._isTypeOf(obj1, obj2)));
    obj1 = {
      hello: {
        nestedHello: "content"
      }
    }
    assert(state.testNode._isTypeOf(obj1, obj2));

    // testing arrays in objects
    obj1.helloArray = ["filled", "with", "stuff"];
    obj2.helloArray = [];
    assert(state.testNode._isTypeOf(obj1, obj2));

    //testing objects in arrays
    obj1.helloArray = [JSON.parse(JSON.stringify(obj1))];
    obj2.helloArray = [JSON.parse(JSON.stringify(obj2))];
    assert(state.testNode._isTypeOf(obj1, obj2));
    obj1.helloArray.push({differentHello: ""});
    assert(!state.testNode._isTypeOf(obj1, obj2), "Does not check arrays correctly");
    obj1.helloArray.pop();
    obj2.helloArray = [{differentHello: ""}];
    assert(!state.testNode._isTypeOf(obj1, obj2));

    let realTransaction = JSON.parse('{"data":{"inputs":[{"previousTx":"f64d4582d6a8780efc28d0d2766d07297c89050ce3685afe6d472ab8dac5afe6","index":"1","sig":"0ccb311cdfebe368f29559b6c65f157b121e1584c73e274530e0990c8fb93b7c107879ad162a56c8e4deea47e5806cec0d878ed765a5fa917ccf25cbb9210919","redeemerKey":"032cecbd45fcfb498a2a91a65e14506635c6d265f0722c440c800312f5b684d3b0"}],"outputs":[{"value":10,"pubKey":"02d1b0f882f0071b274766ebcbbbd1fcc9cb0836ad684877046ae3f8fa310d1a2d"},{"value":960,"pubKey":"032cecbd45fcfb498a2a91a65e14506635c6d265f0722c440c800312f5b684d3b0"}]},"hash":"c6a9dbe3e2d3fb8008f20a57eec5a3bb15ea122b62b8969cfb55929df488c230"}');
    assert(state.testNode._isTypeOf(realTransaction, new Transaction([new Input()], [new Output()], "")));

    console.log("Yes");
  }
];

function _errHandler(err) {
  //console.error(err.toString());
  console.error(err.stack);
  process.exit(1);
}



async function runTests() {
  Error.stackTraceLimit = 2;
  // const path = 'state/node' + 101 + '.json';
  // try {
  //   fs.unlinkSync(path);
  // } catch (err) {_errHandler(err)}
  //for(let func of testFuncs) {
    createNewState();
    await testFuncs[testFuncs.length-1]().catch(_errHandler);
  //}
};
// runTests();

module.exports = Node;
