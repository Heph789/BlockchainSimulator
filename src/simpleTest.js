
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

const {Blockchain, BlockData} = require("./Blockchain.js");
const crypto = require('crypto');
const st = require("./StandardTools.js");
const sc = st.simpleCrypto;
const fs = require("fs");
const program = require("commander");
const Wallet = require("./wallet.js");
const assert = require('assert').strict;
const { Network } = require('./Network.js');
const ec = require('secp256k1');

console.log("Hash: " + sc.findHash("hash"));

const {privKey, pubKey} = sc.createAccount();

const message = crypto.randomBytes(32);

const signature = sc.sign(message, privKey);

console.log("Verification: " + sc.verify(message, signature, pubKey));
