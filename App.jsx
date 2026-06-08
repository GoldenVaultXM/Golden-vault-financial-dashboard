import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const PEOPLE = [
  // Western European / American (male)
  { firstName: "James",      lastName: "Smith",      gender: "male",   style: "adventurer",       seed: "james-smith" },
  { firstName: "John",       lastName: "Johnson",    gender: "male",   style: "adventurer",       seed: "john-johnson" },
  { firstName: "Robert",     lastName: "Williams",   gender: "male",   style: "adventurer",       seed: "robert-williams" },
  { firstName: "Michael",    lastName: "Brown",      gender: "male",   style: "adventurer",       seed: "michael-brown" },
  { firstName: "William",    lastName: "Jones",      gender: "male",   style: "adventurer",       seed: "william-jones" },
  { firstName: "David",      lastName: "Garcia",     gender: "male",   style: "adventurer",       seed: "david-garcia" },
  { firstName: "Richard",    lastName: "Miller",     gender: "male",   style: "adventurer",       seed: "richard-miller" },
  { firstName: "Joseph",     lastName: "Davis",      gender: "male",   style: "adventurer",       seed: "joseph-davis" },
  { firstName: "Thomas",     lastName: "Rodriguez",  gender: "male",   style: "adventurer",       seed: "thomas-rodriguez" },
  { firstName: "Charles",    lastName: "Martinez",   gender: "male",   style: "adventurer",       seed: "charles-martinez" },
  // Western European / American (female)
  { firstName: "Mary",       lastName: "Hernandez",  gender: "female", style: "adventurer-neutral", seed: "mary-hernandez" },
  { firstName: "Patricia",   lastName: "Lopez",      gender: "female", style: "adventurer-neutral", seed: "patricia-lopez" },
  { firstName: "Jennifer",   lastName: "Gonzalez",   gender: "female", style: "adventurer-neutral", seed: "jennifer-gonzalez" },
  { firstName: "Linda",      lastName: "Wilson",     gender: "female", style: "adventurer-neutral", seed: "linda-wilson" },
  { firstName: "Barbara",    lastName: "Anderson",   gender: "female", style: "adventurer-neutral", seed: "barbara-anderson" },
  { firstName: "Elizabeth",  lastName: "Thomas",     gender: "female", style: "adventurer-neutral", seed: "elizabeth-thomas" },
  { firstName: "Susan",      lastName: "Taylor",     gender: "female", style: "adventurer-neutral", seed: "susan-taylor" },
  { firstName: "Jessica",    lastName: "Moore",      gender: "female", style: "adventurer-neutral", seed: "jessica-moore" },
  { firstName: "Sarah",      lastName: "Jackson",    gender: "female", style: "adventurer-neutral", seed: "sarah-jackson" },
  { firstName: "Karen",      lastName: "Martin",     gender: "female", style: "adventurer-neutral", seed: "karen-martin" },
  // Italian (male)
  { firstName: "Luca",       lastName: "Rossi",      gender: "male",   style: "adventurer",       seed: "luca-rossi" },
  { firstName: "Marco",      lastName: "Ferrari",    gender: "male",   style: "adventurer",       seed: "marco-ferrari" },
  { firstName: "Giovanni",   lastName: "Esposito",   gender: "male",   style: "adventurer",       seed: "giovanni-esposito" },
  { firstName: "Antonio",    lastName: "Bianchi",    gender: "male",   style: "adventurer",       seed: "antonio-bianchi" },
  { firstName: "Francesco",  lastName: "Romano",     gender: "male",   style: "adventurer",       seed: "francesco-romano" },
  // Italian (female)
  { firstName: "Elena",      lastName: "Colombo",    gender: "female", style: "adventurer-neutral", seed: "elena-colombo" },
  { firstName: "Giulia",     lastName: "Ricci",      gender: "female", style: "adventurer-neutral", seed: "giulia-ricci" },
  { firstName: "Martina",    lastName: "Marino",     gender: "female", style: "adventurer-neutral", seed: "martina-marino" },
  { firstName: "Chiara",     lastName: "Greco",      gender: "female", style: "adventurer-neutral", seed: "chiara-greco" },
  { firstName: "Valentina",  lastName: "Bruno",      gender: "female", style: "adventurer-neutral", seed: "valentina-bruno" },
  // French (male)
  { firstName: "Pierre",     lastName: "Martin",     gender: "male",   style: "adventurer",       seed: "pierre-martin" },
  { firstName: "Jean",       lastName: "Bernard",    gender: "male",   style: "adventurer",       seed: "jean-bernard" },
  { firstName: "Louis",      lastName: "Thomas",     gender: "male",   style: "adventurer",       seed: "louis-thomas" },
  { firstName: "Nicolas",    lastName: "Petit",      gender: "male",   style: "adventurer",       seed: "nicolas-petit" },
  { firstName: "Julien",     lastName: "Moreau",     gender: "male",   style: "adventurer",       seed: "julien-moreau" },
  // French (female)
  { firstName: "Camille",    lastName: "Dubois",     gender: "female", style: "adventurer-neutral", seed: "camille-dubois" },
  { firstName: "Léa",        lastName: "Durand",     gender: "female", style: "adventurer-neutral", seed: "lea-durand" },
  { firstName: "Manon",      lastName: "Simon",      gender: "female", style: "adventurer-neutral", seed: "manon-simon" },
  { firstName: "Chloé",      lastName: "Richard",    gender: "female", style: "adventurer-neutral", seed: "chloe-richard" },
  { firstName: "Inès",       lastName: "Robert",     gender: "female", style: "adventurer-neutral", seed: "ines-robert" },
  // German (male)
  { firstName: "Hans",       lastName: "Müller",     gender: "male",   style: "adventurer",       seed: "hans-muller" },
  { firstName: "Klaus",      lastName: "Schmidt",    gender: "male",   style: "adventurer",       seed: "klaus-schmidt" },
  { firstName: "Stefan",     lastName: "Schneider",  gender: "male",   style: "adventurer",       seed: "stefan-schneider" },
  { firstName: "Andreas",    lastName: "Fischer",    gender: "male",   style: "adventurer",       seed: "andreas-fischer" },
  { firstName: "Wolfgang",   lastName: "Weber",      gender: "male",   style: "adventurer",       seed: "wolfgang-weber" },
  // German (female)
  { firstName: "Mia",        lastName: "Becker",     gender: "female", style: "adventurer-neutral", seed: "mia-becker" },
  { firstName: "Sophie",     lastName: "Schulz",     gender: "female", style: "adventurer-neutral", seed: "sophie-schulz" },
  { firstName: "Emma",       lastName: "Hoffmann",   gender: "female", style: "adventurer-neutral", seed: "emma-hoffmann" },
  { firstName: "Lea",        lastName: "Wagner",     gender: "female", style: "adventurer-neutral", seed: "lea-wagner" },
  { firstName: "Clara",      lastName: "Meyer",      gender: "female", style: "adventurer-neutral", seed: "clara-meyer" },
  // Spanish (male)
  { firstName: "Carlos",     lastName: "García",     gender: "male",   style: "adventurer",       seed: "carlos-garcia" },
  { firstName: "Miguel",     lastName: "Martínez",   gender: "male",   style: "adventurer",       seed: "miguel-martinez" },
  { firstName: "José",       lastName: "López",      gender: "male",   style: "adventurer",       seed: "jose-lopez" },
  { firstName: "Juan",       lastName: "Sánchez",    gender: "male",   style: "adventurer",       seed: "juan-sanchez" },
  { firstName: "Alejandro",  lastName: "González",   gender: "male",   style: "adventurer",       seed: "alejandro-gonzalez" },
  // Spanish (female)
  { firstName: "Sofía",      lastName: "Pérez",      gender: "female", style: "adventurer-neutral", seed: "sofia-perez" },
  { firstName: "Lucía",      lastName: "Rodríguez",  gender: "female", style: "adventurer-neutral", seed: "lucia-rodriguez" },
  { firstName: "María",      lastName: "Fernández",  gender: "female", style: "adventurer-neutral", seed: "maria-fernandez" },
  { firstName: "Carmen",     lastName: "Gómez",      gender: "female", style: "adventurer-neutral", seed: "carmen-gomez" },
  { firstName: "Isabel",     lastName: "Díaz",       gender: "female", style: "adventurer-neutral", seed: "isabel-diaz" },
  // Scandinavian (male)
  { firstName: "Lars",       lastName: "Andersson",  gender: "male",   style: "adventurer",       seed: "lars-andersson" },
  { firstName: "Erik",       lastName: "Johansson",  gender: "male",   style: "adventurer",       seed: "erik-johansson" },
  { firstName: "Björn",      lastName: "Karlsson",   gender: "male",   style: "adventurer",       seed: "bjorn-karlsson" },
  { firstName: "Henrik",     lastName: "Nilsson",    gender: "male",   style: "adventurer",       seed: "henrik-nilsson" },
  { firstName: "Sven",       lastName: "Eriksson",   gender: "male",   style: "adventurer",       seed: "sven-eriksson" },
  // African American (male)
  { firstName: "Marcus",     lastName: "Washington", gender: "male",   style: "fun-emoji",        seed: "marcus-washington" },
  { firstName: "DeShawn",    lastName: "Jefferson",  gender: "male",   style: "fun-emoji",        seed: "deshawn-jefferson" },
  { firstName: "Jamal",      lastName: "Robinson",   gender: "male",   style: "fun-emoji",        seed: "jamal-robinson" },
  { firstName: "Tyrone",     lastName: "Williams",   gender: "male",   style: "fun-emoji",        seed: "tyrone-williams" },
  { firstName: "Antoine",    lastName: "Coleman",    gender: "male",   style: "fun-emoji",        seed: "antoine-coleman" },
  // African American (female)
  { firstName: "Aaliyah",    lastName: "Thompson",   gender: "female", style: "fun-emoji",        seed: "aaliyah-thompson" },
  { firstName: "Keisha",     lastName: "Brown",      gender: "female", style: "fun-emoji",        seed: "keisha-brown" },
  { firstName: "Tiffany",    lastName: "Davis",      gender: "female", style: "fun-emoji",        seed: "tiffany-davis" },
  { firstName: "Monique",    lastName: "Harris",     gender: "female", style: "fun-emoji",        seed: "monique-harris" },
  { firstName: "Destiny",    lastName: "Jackson",    gender: "female", style: "fun-emoji",        seed: "destiny-jackson" },
  // Asian (male)
  { firstName: "Wei",        lastName: "Chen",       gender: "male",   style: "pixel-art",        seed: "wei-chen" },
  { firstName: "Hiroshi",    lastName: "Tanaka",     gender: "male",   style: "pixel-art",        seed: "hiroshi-tanaka" },
  { firstName: "Min-jun",    lastName: "Kim",        gender: "male",   style: "pixel-art",        seed: "minjun-kim" },
  { firstName: "Raj",        lastName: "Patel",      gender: "male",   style: "pixel-art",        seed: "raj-patel" },
  { firstName: "Arjun",      lastName: "Sharma",     gender: "male",   style: "pixel-art",        seed: "arjun-sharma" },
  // Asian (female)
  { firstName: "Mei",        lastName: "Zhang",      gender: "female", style: "pixel-art",        seed: "mei-zhang" },
  { firstName: "Yuki",       lastName: "Nakamura",   gender: "female", style: "pixel-art",        seed: "yuki-nakamura" },
  { firstName: "Ji-yeon",    lastName: "Park",       gender: "female", style: "pixel-art",        seed: "jiyeon-park" },
  { firstName: "Priya",      lastName: "Singh",      gender: "female", style: "pixel-art",        seed: "priya-singh" },
  { firstName: "Aisha",      lastName: "Khan",       gender: "female", style: "pixel-art",        seed: "aisha-khan" },
  // Latin American (male)
  { firstName: "Diego",      lastName: "Ramírez",    gender: "male",   style: "adventurer",       seed: "diego-ramirez" },
  { firstName: "Sebastián",  lastName: "Torres",     gender: "male",   style: "adventurer",       seed: "sebastian-torres" },
  { firstName: "Mateo",      lastName: "Vargas",     gender: "male",   style: "adventurer",       seed: "mateo-vargas" },
  { firstName: "Andrés",     lastName: "Castro",     gender: "male",   style: "adventurer",       seed: "andres-castro" },
  { firstName: "Santiago",   lastName: "Morales",    gender: "male",   style: "adventurer",       seed: "santiago-morales" },
  // Latin American (female)
  { firstName: "Valentina",  lastName: "Reyes",      gender: "female", style: "adventurer-neutral", seed: "valentina-reyes" },
  { firstName: "Isabella",   lastName: "Cruz",       gender: "female", style: "adventurer-neutral", seed: "isabella-cruz" },
  { firstName: "Camila",     lastName: "Flores",     gender: "female", style: "adventurer-neutral", seed: "camila-flores" },
  { firstName: "Daniela",    lastName: "Jiménez",    gender: "female", style: "adventurer-neutral", seed: "daniela-jimenez" },
  { firstName: "Gabriela",   lastName: "Mendoza",    gender: "female", style: "adventurer-neutral", seed: "gabriela-mendoza" },
  // Middle Eastern (male)
  { firstName: "Omar",       lastName: "Hassan",     gender: "male",   style: "bottts",           seed: "omar-hassan" },
  { firstName: "Khalid",     lastName: "Al-Farsi",   gender: "male",   style: "bottts",           seed: "khalid-alfarsi" },
  { firstName: "Youssef",    lastName: "Ibrahim",    gender: "male",   style: "bottts",           seed: "youssef-ibrahim" },
  { firstName: "Ali",        lastName: "Mansouri",   gender: "male",   style: "bottts",           seed: "ali-mansouri" },
  { firstName: "Tariq",      lastName: "Al-Rashid",  gender: "male",   style: "bottts",           seed: "tariq-alrashid" },
  // Middle Eastern (female)
  { firstName: "Fatima",     lastName: "Al-Zahra",   gender: "female", style: "adventurer-neutral", seed: "fatima-alzahra" },
  { firstName: "Nour",       lastName: "Khalil",     gender: "female", style: "adventurer-neutral", seed: "nour-khalil" },
  { firstName: "Layla",      lastName: "Nasser",     gender: "female", style: "adventurer-neutral", seed: "layla-nasser" },
  { firstName: "Hana",       lastName: "Abboud",     gender: "female", style: "adventurer-neutral", seed: "hana-abboud" },
  { firstName: "Yasmin",     lastName: "Sarhan",     gender: "female", style: "adventurer-neutral", seed: "yasmin-sarhan" },
];

const LOCATIONS = [
  { city: "New York", flag: "🇺🇸" },{ city: "Los Angeles", flag: "🇺🇸" },
  { city: "Chicago", flag: "🇺🇸" },{ city: "Miami", flag: "🇺🇸" },
  { city: "Dallas", flag: "🇺🇸" },{ city: "Las Vegas", flag: "🇺🇸" },
  { city: "Seattle", flag: "🇺🇸" },{ city: "Boston", flag: "🇺🇸" },
  { city: "Austin", flag: "🇺🇸" },{ city: "Atlanta", flag: "🇺🇸" },
  { city: "London", flag: "🇬🇧" },{ city: "Manchester", flag: "🇬🇧" },
  { city: "Paris", flag: "🇫🇷" },{ city: "Lyon", flag: "🇫🇷" },
  { city: "Berlin", flag: "🇩🇪" },{ city: "Munich", flag: "🇩🇪" },
  { city: "Madrid", flag: "🇪🇸" },{ city: "Barcelona", flag: "🇪🇸" },
  { city: "Rome", flag: "🇮🇹" },{ city: "Milan", flag: "🇮🇹" },
  { city: "Amsterdam", flag: "🇳🇱" },{ city: "Zurich", flag: "🇨🇭" },
  { city: "Stockholm", flag: "🇸🇪" },{ city: "Oslo", flag: "🇳🇴" },
  { city: "Copenhagen", flag: "🇩🇰" },{ city: "Vienna", flag: "🇦🇹" },
  { city: "Warsaw", flag: "🇵🇱" },{ city: "Lisbon", flag: "🇵🇹" },
  { city: "Dubai", flag: "🇦🇪" },{ city: "Toronto", flag: "🇨🇦" },
];

// Amounts from $5k to $100k
const AMOUNTS = [
  5000, 6000, 7500, 8000, 9500, 10000, 12000, 15000,
  17500, 20000, 22500, 25000, 30000, 35000, 40000,
  45000, 50000, 55000, 60000, 65000, 70000, 75000,
  80000, 85000, 90000, 95000, 100000,
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getEntry(index) {
  const rng      = mulberry32(index * 2654435761);
  const person   = PEOPLE[Math.floor(rng() * PEOPLE.length)];
  const location = LOCATIONS[Math.floor(rng() * LOCATIONS.length)];
  const amount   = AMOUNTS[Math.floor(rng() * AMOUNTS.length)];
  const minsAgo  = Math.floor(rng() * 55) + 1;
  return { ...person, location, amount, minsAgo };
}

function getAvatarUrl(person) {
  // Use DiceBear with seeded, style-matched avatars
  const base = "https://api.dicebear.com/7.x";
  const style = person.style || "adventurer";
  const seed  = encodeURIComponent(person.seed);
  return `${base}/${style}/svg?seed=${seed}&radius=50&size=40`;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const popupStyles = `
  @keyframes gwPopIn {
    from { opacity: 0; transform: scale(0.88) translateY(-6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes gwPopOut {
    from { opacity: 1; transform: scale(1)    translateY(0); }
    to   { opacity: 0; transform: scale(0.88) translateY(-6px); }
  }
  .gw-popup-enter { animation: gwPopIn 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .gw-popup-exit  { animation: gwPopOut 0.3s ease forwards; }
  .gw-popup-wrap:hover .gw-dismiss { opacity: 1 !important; }
`;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

function WithdrawalPopup({ entry, onClose, exiting, dragHandleRef }) {
  const amount = entry.amount.toLocaleString('en-US');

  return (
    <>
      <style>{popupStyles}</style>
      <div
        className={`gw-popup-wrap ${exiting ? 'gw-popup-exit' : 'gw-popup-enter'}`}
        style={{
          background: '#fff',
          border: '1px solid #ebebeb',
          borderRadius: '12px',
          padding: '9px 12px 9px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          width: '185px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
          position: 'relative',
          cursor: 'grab',
          userSelect: 'none',
        }}
        ref={dragHandleRef}
      >
        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="gw-dismiss"
          style={{
            position: 'absolute', top: '5px', right: '6px',
            background: 'none', border: 'none', fontSize: '13px',
            color: '#bbb', cursor: 'pointer', lineHeight: 1,
            padding: '1px 3px', opacity: 0, transition: 'opacity 0.15s',
          }}
        >×</button>

        {/* Avatar */}
        <img
          src={getAvatarUrl(entry)}
          alt={entry.firstName}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            flexShrink: 0, border: '1.5px solid #f0d060',
            background: '#fafafa',
          }}
          onError={(e) => {
            // Fallback to initials if avatar fails
            e.target.style.display = 'none';
          }}
        />

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#111',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}>
            {entry.firstName} {entry.lastName[0]}.
          </div>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.3 }}>
            withdrew <span style={{ fontWeight: 700, color: '#16a34a' }}>${amount}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '1px', lineHeight: 1.3 }}>
            {entry.location.flag} {entry.location.city} · {entry.minsAgo}m ago
          </div>
        </div>

        {/* Coin icon */}
        <div style={{ fontSize: '16px', flexShrink: 0, marginRight: '4px' }}>💸</div>
      </div>
    </>
  );
}

// ─── DRAGGABLE WRAPPER ────────────────────────────────────────────────────────

function DraggablePopupShell({ children }) {
  const [pos, setPos]         = useState({ x: 16, y: 16 });
  const dragging              = useRef(false);
  const offset                = useRef({ x: 0, y: 0 });
  const containerRef          = useRef(null);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    offset.current   = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    document.body.style.userSelect = 'none';
  }, [pos]);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    dragging.current = true;
    offset.current   = {
      x: touch.clientX - pos.x,
      y: touch.clientY - pos.y,
    };
  }, [pos]);

  useEffect(() => {
    const onMouseMove
