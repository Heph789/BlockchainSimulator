const {Network, NetworkError} = require('../src/Network');
const assert = require('assert').strict;

let receivedData = false;

const func = function receiveDataCallback(data) {receivedData = true; this.receiveData = data;};
const LOC = 'block';
const reqLOC = 'getBlock';

// Dumbed down node class to test Network functions
class Node {
  constructor(id, peerID) {
    this.id = id;
    this.peer = peerID;
    this.data = {};
    Network.onRequest(this, reqLOC, this.getData);
  }

  getData() {
    return this.data;
  }

  verifyOnReceive() {}
}

describe("Network", function() {
  let node = new Node(0, 1);;
  describe("#addNode()", function() {
    it("should correctly add a node to the Network and successfully store it", function() {
      Network.addNode(node, node.id);
      assert.deepEqual(node, Network.nodes[node.id]);
    });
  });
  describe('#receive()', function() {
    it('should attach a function to the node', function() {
      Network.onRequest(node, LOC, func);
      assert.equal(typeof node.request[LOC], 'function');
    });
  });
  describe('#send()', function() {
    let peer = new Node(1, 0);
    it('should not allow sending to a node not on the network', function() {
      assert.throws(function() { Network.send("notAnAddress", 'block', {}) }, new NetworkError("Network address not found."));
    });
    it('should allow sending data to a node on the network', function() {
      Network.send(0, LOC, {});
    });
    it('should call onRequest function on node', function() {
      assert(receivedData);
    });
    it('\'this\' in the callback function should reference the node', function() {
      const data = {
        title: "test",
        content: "content"
      };
      Network.send(0, LOC, data);
      assert.deepEqual(node.receiveData, data);
    });
  });
  describe('#request()', function() {
    it('should not allow requesting from a node not on the network', function() {
      assert.throws(function() { Network.request("notAnAddress", 'block', {}) }, new NetworkError("Network address not found."));
    });
    it('should return correct data on request', function() {
      node.data = {
        title: "test",
        content: "content"
      };
      const data = Network.request(0, reqLOC);
      assert.deepEqual(data, node.data);
    });
  });
  describe('#listen()', function() {
    it('should add the listener function with the correct binding', function() {
      let obj = {
        msg: ""
      };
      Network.listen(obj, "address", "location", function test(data) {
        this.msg = data;
      });
      //console.log("Listener data: ", Network.listeners);
      Network.listeners["address"]["location"][0]("success");
      assert.equal(obj.msg, "success");
    });
  });
  describe('#emit()', function() {
    it('should emit data to multiple listeners', function() {
      const ADD = "emitTest";
      const LOC = "testData";
      const DATA = "data";
      let node2 = {
        data: null
      };
      let node3 = {
        data: null
      };
      let emitter = {
        id: ADD
      };
      Network.listen(node2, ADD, LOC, function test(data) {
        this.data = data;
      });
      Network.listen(node3, ADD, LOC, function test(data) {
        this.data = data;
      });
      Network.emit(emitter, LOC, DATA);
      assert.equal(node2.data, DATA);
      assert.equal(node3.data, DATA);
    });
  });
});
