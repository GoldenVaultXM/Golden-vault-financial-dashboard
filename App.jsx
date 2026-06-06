import AestheticPatch from './AestheticPatch';
import React from 'react';
import GoldenVaultXM from './GoldenVaultXM'; // This imports your dashboard file

function App() {
  return (
    <div className="App" style={{ overflowX: 'hidden' }}>
        <AestheticPatch />
        <GoldenVaultXM />
    </div>
  );
}

export default App;
