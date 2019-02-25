# BlockchainSimulator
Command line interface for a simulated blockchain.
Current commands:
cb <amount>
  creates a blockchain with the <amount> number of coins
pb
  prints out the blockchain
sm <toAddress> <amount>'
  sends money to <toAdress> with the amount <amount>
ab
  adds a block
v
  verifies the blockchain
acb <hash> <nonce> <previousHash>
  adds a custom block to the blockchain using custom <hash> and <nonce>. <previousHash is supposed to be the hash of the previous block
