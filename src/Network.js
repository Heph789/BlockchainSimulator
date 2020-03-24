'use strict'

// Error class for the network
class NetworkError extends Error {
  constructor(args) {
    super(args);
    this.name="NetworkError";
  }
}

// Class for interacting with the blockchain "network"
class Network {


  // @desc adds a node to the network
  // @param node the object of the node to add
  // @param String address the address of the node on the network
  static addNode(node, address) {
    Network.nodes[address] = node;
    node.networkID = address;
  }

  /*
    @desc send data to a node on the network
    @param String address the address to send the data to
    @param String location the location on the node to send the data
    @param Object data to pass to the node at address
  */
  static send(address, location, rawData) {
    if(typeof Network.nodes[address] === "null" || typeof Network.nodes[address] === "undefined")
      throw new NetworkError("Network address not found.");
    let data = rawData;
    if(rawData instanceof Object)
      data = JSON.stringify(rawData);
    return Network.nodes[address].request[location](data);
  };

  /*
    @desc sets function to be called when data is sent
    @param that object that is calling this listener
    @param location the location of where to listen
    @param callback the callback function to call when sent data to the location
  */
  static onRequest(_this, location, callback) {
    if(typeof _this.request === 'undefined')
      _this.request = {};
    _this.request[location] = callback.bind(_this);
  }

  /*
    @desc requests data from a node on the Network
    @param String address the address of the node to request data from
    @param String location the location to request information from
  */
  static request(address, location) {
    Network._verifyAddressLocation(address, location);
    let data = Network.nodes[address].request[location]();
    if(data instanceof Object)
      data = JSON.stringify(data);
    return data;
  }

  /*
    @desc attaches function to listen to an emitter from another object
    @param _this the object to bind the listener functions to (presumably the object calling Network.listener)
    @param address the address of the node on the network to listen to
    @param location the location on the node to listen to
    @param callback the function to call when data is emitted
  */
  static listen(_this, address, location, callback) {
    if(typeof Network.listeners == 'undefined')
      Network.listeners = {};
    if(typeof Network.listeners[address] == 'undefined')
      Network.listeners[address] = {};
    if(typeof Network.listeners[address][location] == 'undefined')
      Network.listeners[address][location] = [];
    Network.listeners[address][location].push(callback.bind(_this));
  }

  /*
    @desc calls all listener functions at specified location with data
    @param location the location at which to emit data
    @data the data to emit
  */
  static emit(_this, location, data) {
    let newData = data;
    if(data instanceof Object)
      newData = JSON.stringify(data);
    Network.listeners[_this.id][location].forEach(function listenerFuncs(func) {
      func(newData);
    });
  }

  static _verifyAddressLocation(address, location) {
    if(typeof Network.nodes[address] === "null" || typeof Network.nodes[address] === "undefined")
      throw new NetworkError("Network address not found.");
    if(typeof Network.nodes[address].request[location] === "null" || typeof Network.nodes[address].request[location] === "undefined")
      throw new NetworkError("Network location not found.");
  }

  static _verifyLocation(address) {
    if(typeof Network.nodes[address] === "null" || typeof Network.nodes[address] === "undefined")
      throw new NetworkError("Network address not found.");
  }

  static reset() {
    Network.nodes = {};
    Network.listeners = {};
  }
}

// array of addresses for nodes on the network
Network.nodes = {};

module.exports = {Network, NetworkError};
