const blockchain = require('./src/main.js');
const program = require("commander");

// Prints status items including: list of nodes,
function printStatus() {
  console.log("Nodes: " + JSON.stringify(blockchain.getNodes(), ["id"]));
  console.log("Current node: " + blockchain.getCurrentNode().id);
  console.log("Current address: " + JSON.stringify(blockchain.getWallet().currentAddress, null, ' '));
  printLedger();
}

// prints the ledger of the current node
function printLedger() {
  console.log("Ledger: " + blockchain.getLedger().toString());
}

function printAddresses() {
  console.log("Addreses: ", blockchain.getWallet().addresses);
  console.log("Current address:\n", blockchain.getWallet().currentAddress);
}

program
  .version('1.0')
  .description('A simulated and interactive proof of work blockchain');

// program
//   .command('addCustomBlock <path>')
//   .option('-b, --broadcast', 'Broadcasts to all nodes instead of adding to a node')
//   .alias('acb')
//   .description('adds a custom block from <path>')
//   .action((path, cmdObject) => {
//     const data = fs.readFileSync(path);
//     const block = JSON.parse(data);
//     if(cmdObject.broadcast) {
//       for(let node of loadedNodes) node.receiveBlock(block);
//       // wallet.receiveBlock(data);
//     }
//     else {
//       currentNode._addBlock(block);
//     }
//   })

program
  .command('createAddress')
  .alias('ca')
  .description('creates a public-private key pair and prints it out')
  .action(() => {
    blockchain.createNewAddress();
    printAddresses();
  });

program
  .command('createNewBlockchain <amount>')
  .alias('cb')
  .description('creates a new blockchain')
  .action((amount) => {
    blockchain.createNewBlockchain(amount);
  });

program
  .command('createNewNode')
  .alias('cn')
  .description('creates a new node with the current node as a peer')
  .action(() => {
    blockchain.addNode();
  });

program
  .command('getBalance')
  .alias('gb')
  .description('gets current balance of current account')
  .action(() => {console.log(blockchain.getWallet().getBalance())});

program
  .command('listAddresses')
  .alias('la')
  .description('list all of the addresses in the wallet and the current address')
  .action(() => {
    printAddresses();
  })

program
  .command('listNodes')
  .alias('ln')
  .description('list all of the nodes')
  .action(() => {
    console.log("Nodes: ", blockchain.getNodes());
  })

program
  .command('mineBlock')
  .alias('mb')
  .description('mines a block')
  .action(() => {
    blockchain.mineBlock();
  });

// program
//   .command('revert')
//   .option('-a, --all', 'Reverts all of the nodes')
//   .alias('r')
//   .description('reverts one block in current node')
//   .action((cmdObj) => {
//     if(cmdObj.all) {
//       let loadedNodes = blockchain.getLoadedNodes();
//       for(node of loadedNodes) {
//         node.revert();
//       }
//     }
//     else {
//       blockchain.getCurrentNodecurrentNode.revert();
//     }
//   });

program
  .command('sendMoney <toAddress> <amount>')
  .option('-p, --print', 'Prints transaction without affecting wallet state')
  .alias('sm')
  .description('sends money to <toAddress> with the amount <amount>')
  .action((toAddress, amount, cmdObject) => {
    console.log(blockchain.transact(toAddress, amount, !cmdObject.print));
  });

program
  .command('setAddress <index>')
  .alias('sa')
  .description('sets the current address to the <index> address with the first being 0')
  .action((index) => {
    console.log(blockchain.setAddress(index));
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
  .command('sendCustomTransaction <path>')
  .alias('sct')
  .description('allows user to broadcast a custom transaction to all nodes')
  .action((path) => {
    const data = fs.readFileSync(path);
    const transaction = JSON.parse(data);
    blockchain.broadcastTransaction(transaction);
  });

// program
//   .command('log')
//   .action(() => {
//     // const path = 'custom/alreadyReferencedTransaction.json';
//     // const data = fs.readFileSync(path);
//     // const transaction = JSON.parse(data);
//     // const privKey = wallet.currentAddress.privKey;
//     // const message = transaction.data.inputs[0].previousTx;
//     // const sig = sc.sign(message, privKey);
//     // console.log("Signature: ", sig);
//     // transaction.data.inputs[0].sig = sig;
//     // const txData = JSON.stringify(transaction.data);
//     // console.log("Hash: " + sc.findHash(txData));
//
//     const path = 'custom/customBlock.json';
//     const data = fs.readFileSync(path);
//     let block = JSON.parse(data);
//     const previousHash = currentNode.ledger.getLastBlock().hash;
//     const blockNum = currentNode.ledger.getLastBlock().data.blockNumber;
//     block.data.previousBlockHash = previousHash;
//     block.data.blockNumber = blockNum+1;
//     block.hash = st.findNonce(block.data, "1");
//     console.log(JSON.stringify(block, null, "   "));
//   });

program.parse(process.argv);
