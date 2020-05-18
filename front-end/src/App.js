import React from 'react';
import logo from './logo.svg';
import NodeDisplay from './components/NodeDisplay.js';
import './App.css';

class App extends React.Component {
  state = {
    currentNode: -1,
    nodes: []
  }
  componentDidMount() {
    fetch('http://localhost:3001/getCurrentNode')
      .then(response => response.text())
      .then(data => this.setState({currentNode: Number.parseInt(data)}));

    fetch('http://localhost:3001/getNodes')
      .then(response => response.json())
      .then(data => this.setState({nodes: data}));

  }

  setNode(index) {
    fetch("http://localhost:3001/setNode", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{"index":'+index+'}'
    }).then(() => {
      this.setState({currentNode: this.state.nodes[index]});
    });
  }

  render() {
    let nodes = [];
    for(let i = 0; i < this.state.nodes.length; i++) {
      let className = "menuItem";
      if(this.state.nodes[i] === this.state.currentNode)
        className += " selected";
      nodes.push(<div className={className} onClick={() => {this.setNode(i)}} key={this.state.nodes[i]}>Node: {this.state.nodes[i]}</div>)
    }
    let nodeDisplay = [];
    if(this.state.nodes.length > 0)
      for(let node of this.state.nodes) nodeDisplay.push(<NodeDisplay id={node} key={node} />);
    return (
      <div className="App">
        <div className="side">
          {nodes}
        </div>
        <div className="main">
          {nodeDisplay[this.state.nodes.indexOf(this.state.currentNode)]}
        </div>
      </div>
    );
  }

}

export default App;
