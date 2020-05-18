#Blockchain Simulator

Hello! I first started this project a while ago, and I am continuing it for my Honors Computer Science project. I will be creating a program that simulates proof of work (and possibly proof of stake) blockchains. The proof of work blockchain is based off of Satoshi Nakomoto's model ([bitcoin whitepaper)](https://bitcoin.org/bitcoin.pdf\). I will also create a GUI for interacting with this blockchain.

How to setup:
 - Download the github folder (or clone it using `git clone https://github.com/Heph789/BlockchainSimulator.git`)
 - Change into the folder in the command line `cd BlockchainSimulator`
 - Install the dependencies:
    ```
    npm install
    cd front-end && npm install
    ```

In order to run the front-end, you must have two command line windows open in the BlockchainSimulator directory:
Window 1: ```npm start```
Window 2: ```cd front-end && npm start```

Command line interface for a simulated blockchain. Current commands:

command: node cli.js ca  
desc: creates a public-private key pair and prints it out

command: node cli.js cb \<amount\>  
desc: creates a new blockchain

command: node cli.js cn  
desc: creates a new node with the current node as a peer

command: node cli.js gb  
desc: gets current balance of current account

command: node cli.js la  
desc: list all of the addresses in the wallet and the current address

command: node cli.js ln  
desc: list all of the nodes

command: node cli.js mb  
desc: mines a block

command: node cli.js sm [options] \<toAddress\> \<amount\>  
desc: sends money to \<toAddress\> with the amount \<amount\>  
option: -p Prints transaction without effecting the state

command: node cli.js sa \<index\>  
desc: sets the current address to the \<index\> address with the first being 0

command: node cli.js sn \<index\>  
desc: sets the current node to the node at \<index\>

command: node cli.js status  
desc: prints out the blockchain

command: node cli.js sct \<path\>  
desc: allows user to broadcast a custom transaction to all nodes. JSON must be at path \<path\>
