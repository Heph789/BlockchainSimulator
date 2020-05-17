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
  res.send(api.getCurrentNode().id);
});

router.get('/getLedger', function(req, res, next) {
  res.send(api.getLedger());
});

router.post('/postTesting', function(req, res) {
  console.log(req.body);
  res.sendStatus(200);
});

module.exports = router;
