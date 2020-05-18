import React from 'react';
import './NodeDisplay.css';

export default class NodeDisplay extends React.Component {
  state = {
    ledger: []
  }

  componentDidMount() {
    this.renderLedger();
  }

  renderLedger() {
    fetch('http://localhost:3001/getLedger/'+this.props.id)
      .then(response => response.json())
      .then(data => {
        this.setState({ledger: data.blocks})
      })
      .catch((err) => console.error(err));
  }

  render() {
    let blocks = "";
    console.log("Ledger length: " + this.state.ledger.length);
    if(this.state.ledger.length >0) {
      blocks = [];
      for(let block of this.state.ledger)
        blocks.push(<Block blockObj={block} key={block.hash} />)
    }
    return (
      <div id="nodeDisplay">
        <div id="blocks" className="horList">{blocks}</div>
      </div>
    );
  }
}

class Block extends React.Component {
  render() {
    let block = this.props.blockObj.data;
    let hash = this.props.blockObj.hash;
    let transactions = [];
    for(let transaction of block.transactions)
      transactions.push(<Transaction transactionObj={transaction} key={transaction.hash} />);
    return (
      <div className="block">
        <span>Number: {block.blockNumber}</span><br />
        <span>Previous Hash: {block.previousBlockHash}</span><br />
        <span>Nonce: {block.nonce}</span><br />
        <span>Transactions:</span><br />
        <div id="transactions" className="horList">
          { transactions }
        </div>
        <span>Hash: {hash}</span>
      </div>
    );
  }
}

class Transaction extends React.Component {
  render() {
    let data = this.props.transactionObj.data;
    let hash = this.props.transactionObj.hash;
    let inputs = [];
    let outputs = [];
    for(let i = 0; i<data.inputs.length; i++) {
      inputs.push(<Input inputObj={data.inputs[i]} key={i} />);
    }
    for(let i = 0; i<data.outputs.length; i++) {
      outputs.push(<Output outputObj={data.outputs[i]} key={i} />);
    }

    return (
      <div className="transaction">
        <span>Hash: {hash}</span><br />
        <span>Inputs:</span><br />
        <div id="inputs" className="vertList">
          {inputs}
        </div>
        <span>Outputs:</span>
        <div id="outputs" className="vertList">
          {outputs}
        </div>
      </div>
    );
  }
}

class Input extends React.Component {
  render() {
    let data = this.props.inputObj;
    return (
      <div className="input">
        <span>Previous Tx: {data.previousTx}</span><br />
        <span>Index: {data.index}</span><br />
        <span>Signature: {data.sig}</span><br />
        <span>Redeemer: {data.redeemerKey}</span>
      </div>
    );
  }
}

class Output extends React.Component {
  render() {
    let data = this.props.outputObj;
    return (
      <div className="output">
        <span>Value: {data.value}</span><br />
        <span>Public Key: {data.pubKey}</span>
      </div>
    );
  }
}
