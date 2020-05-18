var express = require('express');
var api = require('../../src/main.js');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Simulated Blockchain' });
});

/*
  GETTER METHODS
*/

router.get('/getNodes', function(req, res, next) {
  res.send(api.getNodes());
});

router.get('/getCurrentNode', function(req, res, next) {
  res.send(api.getCurrentNode().id.toString());
});

router.get('/getLedger/:id', function(req, res, next) {
  console.log(typeof req.params.id);
  res.send(api.getLedger(Number.parseInt(req.params.id)));
});

/* Sends with format:
  {
    addresses: [{
      privKey: "",
      pubKey: ""
    }]
    currentAddress: {
      privKey:
      pubKey:
    }
  }
*/
router.get('/getAddresses', function(req, res) {
  let wallet = api.getWallet();
  let data = {
    addresses: wallet.addresses,
    currentAddress: wallet.currentAddress
  }
  res.send(data);
});

router.get('/getBalance', function(req, res) {
  res.send(api.getWallet().getBalance());
})

router.post('/addCustomBlock', function(req, res) {
  api.getCurrentNode()._addBlock(req.body);
  res.sendStatus(200);
})

/*
  Sends the newly created address
*/
router.post('/createAddress', function(req, res) {
  api.createNewAddress();
  res.send(api.getWallet().currentAddress);
});

router.post('/createBlockchain', function(req, res) {
  if (req.body.hasOwnProperty('amount') && typeof req.body.amount === "number") {
    api.createNewBlockchain(req.body.amount);
    res.sendStatus(200);
  }
  else {
    res.status(400).send("Incorrect format");
  }
});

router.post('/createNewNode', function(req, res) {
  api.addNode();
  res.sendStatus(200);
});

router.post('/mineBlock', function(req, res) {
  api.mineBlock();
  res.sendStatus(200);
});

router.post('/sendMoney', function(req, res) {
  let result;
  if(req.body.hasOwnProperty("toAddress") && req.body.hasOwnProperty("amount") && typeof req.body.toAddress === "string" && typeof req.body.amount === "number") {
    result = api.transact(req.body.toAddress, req.body.amount, true);
    res.send(result);
  }
  else res.status(400).send("Incorrect format");
});

router.post('/setAddress', function(req, res) {
  if(checkForProperties(req.body, {index: "number"})) {
    api.setAddress(req.body.index);
    res.sendStatus('200');
  }
  else res.status(400).send("Incorrect format");
});

router.post('/setNode', function(req, res) {
  console.log("Body: ", req.body);
  if(checkForProperties(req.body, {index: "number"})) {
    api.setNode(req.body.index);
    res.sendStatus('200');
  }
  else res.status(400).send("Incorrect format");
});

router.post('/sendCustomTransaction', function(req, res) {
  api.broadcastTransaction(req.body);
  res.sendStatus(200);
});

function checkForProperties(obj, refObj) {
  let props = Object.getOwnPropertyNames(refObj);
  for(let prop of props) {
    if(!obj.hasOwnProperty(prop) || !(typeof obj[prop] === refObj[prop])) return false;
  }
  return true;
}

module.exports = router;
