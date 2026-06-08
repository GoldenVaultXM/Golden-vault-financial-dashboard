import AestheticPatch from './AestheticPatch';
import React, { useState, useEffect } from 'react';
import GoldenVaultXM from './GoldenVaultXM';

const splashStyles = `
  #gw-splash {
    position: fixed;
    inset: 0;
    background: #050505;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    z-index: 99999;
  }
  #gw-splash img {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border-radius: 22px;
    animation: gwLogoIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
  }
  #gw-dots {
    display: flex;
    gap: 10px;
  }
  .gw-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c9952a;
    opacity: 0;
    animation: gwDotBounce 1.4s ease-in-out infinite;
  }
  .gw-dot:nth-child(1) { animation-delay: 1.05s; }
  .gw-dot:nth-child(2) { animation-delay: 1.23s; }
  .gw-dot:nth-child(3) { animation-delay: 1.41s; }
  .gw-dot:nth-child(4) { animation-delay: 1.59s; }
  .gw-dot:nth-child(5) { animation-delay: 1.77s; }
  @keyframes gwLogoIn {
    from { opacity: 0; transform: scale(0.75) translateY(22px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes gwDotBounce {
    0%, 60%, 100% { opacity: 0.15; transform: translateY(0); }
    30%           { opacity: 1;    transform: translateY(-11px); }
  }
`;

function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      <style>{splashStyles}</style>
      <div id="gw-splash">
        <img src="/IMG_20260512_072009_2.webp.webp" alt="GW Logo" />
        <div id="gw-dots">
          <span className="gw-dot"></span>
          <span className="gw-dot"></span>
          <span className="gw-dot"></span>
          <span className="gw-dot"></span>
          <span className="gw-dot"></span>
        </div>
      </div>
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="App" style={{ overflowX: 'hidden' }}>
      <AestheticPatch />
      <GoldenVaultXM />
    </div>
  );
}

export default App;
