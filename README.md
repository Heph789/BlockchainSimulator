
# Blockchain Simulator

Hello! I first started this project a while ago, and I am continuing it for my Honors Computer Science project. I will be creating a program that simulates proof of work (and possibly proof of stake) blockchains. The proof of work blockchain is based off of Satoshi Nakomoto's model ([bitcoin whitepaper)](https://bitcoin.org/bitcoin.pdf\). I will also create a GUI for interacting with this blockchain.



Command line interface for a simulated blockchain. Current commands:

**cb \<amount\>**
  - creates a blockchain with the <amount> number of coins\
**pb**
  - prints out the blockchain\
**sm \<toAddress\> \<amount\>**
  - sends money to \<toAdress\> with the amount \<amount\>\
**ab**
  - adds a block\
**v**
  - verifies the blockchain\
**acb \<hash\> \<nonce\> \<previousHash\>**
  - adds a custom block to the blockchain using custom \<hash\> and \<nonce\>. \<previousHash\> is supposed to be the hash of the previous block
