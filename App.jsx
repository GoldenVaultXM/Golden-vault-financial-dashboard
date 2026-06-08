import React, { useState, useEffect, useCallback } from 'react';
import GoldenVaultXM from './GoldenVaultXM';

// ─── WITHDRAWAL POPUP DATA ────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
  "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua",
  "Mary","Patricia","Jennifer","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen",
  "Lisa","Nancy","Betty","Margaret","Sandra","Ashley","Emily","Donna","Michelle","Amanda",
  "Luca","Marco","Giovanni","Antonio","Francesco","Alessandro","Andrea","Lorenzo","Matteo","Davide",
  "Pierre","Jean","Louis","Henri","Michel","François","Philippe","Nicolas","Julien","Antoine",
  "Hans","Klaus","Thomas","Stefan","Michael","Andreas","Gerhard","Wolfgang","Dieter","Helmut",
  "Carlos","Miguel","José","Juan","Pedro","Manuel","Alejandro","Roberto","Fernando","Diego",
  "Lars","Erik","Johan","Anders","Magnus","Björn","Mikael","Henrik","Sven","Olaf",
  "Mia","Sophie","Emma","Lea","Julia","Anna","Laura","Marie","Clara","Luisa",
  "Elena","Giulia","Martina","Chiara","Valentina","Francesca","Alessia","Federica","Serena","Beatrice",
  "Camille","Léa","Manon","Chloé","Inès","Jade","Alice","Lucie","Anaïs","Pauline",
  "Sofía","Lucía","María","Carmen","Isabel","Pilar","Cristina","Marta","Beatriz","Nuria",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann",
  "Martin","Bernard","Thomas","Petit","Robert","Richard","Durand","Dubois","Moreau","Simon",
  "Rossi","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Bruno",
  "García","Martínez","López","Sánchez","González","Pérez","Rodríguez","Fernández","Gómez","Díaz",
  "Andersson","Johansson","Karlsson","Nilsson","Eriksson","Larsson","Olsson","Persson","Svensson","Gustafsson",
  "Kowalski","Nowak","Wiśniewski","Wójcik","Kowalczyk","Kamiński","Lewandowski","Zieliński","Dąbrowski","Szymański",
];

const LOCATIONS = [
  { city: "New York", flag: "🇺🇸" },{ city: "Los Angeles", flag: "🇺🇸" },
  { city: "Chicago", flag: "🇺🇸" },{ city: "Houston", flag: "🇺🇸" },
  { city: "Miami", flag: "🇺🇸" },{ city: "Dallas", flag: "🇺🇸" },
  { city: "Atlanta", flag: "🇺🇸" },{ city: "Seattle", flag: "🇺🇸" },
  { city: "Boston", flag: "🇺🇸" },{ city: "Phoenix", flag: "🇺🇸" },
  { city: "Las Vegas", flag: "🇺🇸" },{ city: "Denver", flag: "🇺🇸" },
  { city: "Nashville", flag: "🇺🇸" },{ city: "Austin", flag: "🇺🇸" },
  { city: "San Diego", flag: "🇺🇸" },{ city: "Portland", flag: "🇺🇸" },
  { city: "Charlotte", flag: "🇺🇸" },{ city: "Detroit", flag: "🇺🇸" },
  { city: "Minneapolis", flag: "🇺🇸" },{ city: "Tampa", flag: "🇺🇸" },
  { city: "London", flag: "🇬🇧" },{ city: "Manchester", flag: "🇬🇧" },
  { city: "Paris", flag: "🇫🇷" },{ city: "Lyon", flag: "🇫🇷" },
  { city: "Berlin", flag: "🇩🇪" },{ city: "Munich", flag: "🇩🇪" },
  { city: "Hamburg", flag: "🇩🇪" },{ city: "Madrid", flag: "🇪🇸" },
  { city: "Barcelona", flag: "🇪🇸" },{ city: "Rome", flag: "🇮🇹" },
  { city: "Milan", flag: "🇮🇹" },{ city: "Amsterdam", flag: "🇳🇱" },
  { city: "Brussels", flag: "🇧🇪" },{ city: "Vienna", flag: "🇦🇹" },
  { city: "Stockholm", flag: "🇸🇪" },{ city: "Oslo", flag: "🇳🇴" },
  { city: "Copenhagen", flag: "🇩🇰" },{ city: "Zurich", flag: "🇨🇭" },
  { city: "Warsaw", flag: "🇵🇱" },{ city: "Lisbon", flag: "🇵🇹" },
];

const AMOUNTS = [500,750,1000,1250,1500,2000,2500,3000,4000,5000,7500,10000,12000,15000,20000];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getPerson(index) {
  const rng = mulberry32(index * 2654435761);
  const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const lastName  = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  const location  = LOCATIONS[Math.floor(rng() * LOCATIONS.length)];
  const amount    = AMOUNTS[Math.floor(rng() * AMOUNTS.length)];
  const minsAgo   = Math.floor(rng() * 55) + 1;
  return { firstName, lastName, location, amount, minsAgo };
}

const popupStyles = `
  @keyframes gwPopIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.88); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes gwPopOut {
    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    to   { opacity: 0; transform: translate(-50%, -50%) scale(0.88); }
  }
  .gw-popup-enter { animation: gwPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .gw-popup-exit  { animation: gwPopOut 0.35s ease forwards; }
`;

function WithdrawalPopup({ person, onClose, exiting }) {
  const initials = `${person.firstName[0]}${person.lastName[0]}`;
  const amount   = person.amount.toLocaleString('en-US');

  return (
    <>
      <style>{popupStyles}</style>
      <div
        className={exiting ? 'gw-popup-exit' : 'gw-popup-enter'}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99998,
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: '18px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          minWidth: '310px',
          maxWidth: '370px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', right: '12px',
            background: 'none', border: 'none', fontSize: '18px',
            color: '#bbb', cursor: 'pointer', lineHeight: 1, padding: '2px 4px',
          }}
        >×</button>

        {/* Avatar */}
        <div style={{
          width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#b8942a 0%,#f0d060 100%)',
          color: '#fff', fontSize: '15px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0.5px',
        }}>
          {initials}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.firstName} {person.lastName[0]}.
          </div>
          <div style={{ fontSize: '13px', color: '#444', marginTop: '2px' }}>
            just withdrew <span style={{ fontWeight: 700, color: '#16a34a' }}>${amount}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#999', marginTop: '3px' }}>
            {person.location.flag} {person.location.city} · {person.minsAgo}m ago
          </div>
        </div>

        {/* Icon */}
        <div style={{ fontSize: '24px', flexShrink: 0 }}>💸</div>
      </div>
    </>
  );
}

function WithdrawalPopupController() {
  const [person, setPerson]   = useState(null);
  const [exiting, setExiting] = useState(false);

  const showNext = useCallback(() => {
    const idx = Math.floor(Math.random() * 150000);
    setPerson(getPerson(idx));
    setExiting(false);
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => setPerson(null), 350);
  }, []);

  useEffect(() => {
    const first    = setTimeout(showNext, 2500);
    const interval = setInterval(() => {
      dismiss();
      setTimeout(showNext, 400);
    }, 7000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [showNext, dismiss]);

  useEffect(() => {
    if (!person) return;
    const timer = setTimeout(dismiss, 5500);
    return () => clearTimeout(timer);
  }, [person, dismiss]);

  if (!person) return null;
  return <WithdrawalPopup person={person} onClose={dismiss} exiting={exiting} />;
}

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────

const splashStyles = `
  #gw-splash {
    position: fixed; inset: 0; background: #000000;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 28px; z-index: 99999;
  }
  #gw-splash img {
    width: 70px; height: 70px; object-fit: contain; border-radius: 12px;
    animation: gwLogoIn 0.85s cubic-bezier(0.16,1,0.3,1) 0.15s both;
  }
  #gw-dots { display: flex; gap: 10px; }
  .gw-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ffffff; opacity: 0;
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
    0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
    30%           { opacity: 1;   transform: translateY(-11px); }
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

// ─── APP ──────────────────────────────────────────────────────────────────────

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="App" style={{ overflowX: 'hidden' }}>
      <GoldenVaultXM />
      <WithdrawalPopupController />
    </div>
  );
}

export default App;
