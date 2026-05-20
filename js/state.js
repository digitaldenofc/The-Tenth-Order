// --- GAME STATE & CONSTANTS ---

const state = {
    screen: 'start',
    floor: 1,
    gold: 50,
    relics: [],

    player: {
        hp: 80,
        maxHp: 80,
        shield: 0,
        spikes: 0, // Novo status de Espinhos
        deck: [],
        drawPile: [],
        discardPile: [],
        board: new Array(10).fill(0),
        selectedCard: null
    },

    enemy: {
        name: 'Goblin',
        hp: 30,
        maxHp: 30,
        shield: 0,
        board: new Array(10).fill(0),
        intents: [],
        intentIndex: 0,
        intent: null,
        sprite: '',
        status: { 
            burn: 0,
            poison: 0 // Novo status de Veneno
        }
    },

    battleActive: false,
    canPlay: true,
    mapNodes: [],
    luckySlot: null, // Nova mecânica do Slot Dourado
    shopItems: null, // Prateleira persistente de itens na Loja
    currentMap: 1, // Mapa/Mundo atual
    unlockedMaps: ['map1'], // Mapas desbloqueados permanentemente
    
    // Meta-progressão persistente
    starDust: 0,
    skills: {
        hp: 0,
        gold: 0,
        spikes: 0,
        analitica: 0
    },
    achievements: []
};

const CARD_POOL = {
    common: [
        { value: 4, name: 'Espada', type: 'attack', power: 7, rarity: 'common' },
        { value: 7, name: 'Escudo', type: 'defend', power: 8, rarity: 'common' },
        { value: 1, name: 'Poção', type: 'heal', power: 12, rarity: 'common' },
        { value: 2, name: 'Curativo', type: 'heal', power: 6, rarity: 'common' },
        { value: 2, name: 'Adaga', type: 'attack', power: 5, rarity: 'common' },
        { value: 5, name: 'Muro', type: 'defend', power: 7, rarity: 'common' },
        { value: 0, name: 'Coringa de Bronze', type: 'wild', power: 3, rarity: 'common', effectText: 'Qualquer slot' } // Nova Carta
    ],
    rare: [
        { value: 9, name: 'Ímpar Sagrado', type: 'heal', power: 18, rarity: 'rare' },
        { value: 4, name: 'Par Divino', type: 'heal', power: 18, rarity: 'rare' },
        { value: 7, name: 'Essência Prima', type: 'heal', power: 22, rarity: 'rare' },
        { value: 9, name: 'Golpe G.', type: 'attack', power: 15, rarity: 'rare' },
        { value: 3, name: 'Escudo T.', type: 'defend', power: 15, rarity: 'rare' },
        { value: 6, name: 'Fogo', type: 'attack', power: 5, status: { burn: 2 }, rarity: 'rare', effectText: 'Burn: 2' },
        { value: 8, name: 'Cura G.', type: 'heal', power: 20, rarity: 'rare' },
        { value: 5, name: 'Espinhos de Ferro', type: 'spikes', power: 4, rarity: 'rare', effectText: 'Espinhos +4' }, // Nova Carta
        { value: 3, name: 'Adaga Tóxica', type: 'poison', power: 3, rarity: 'rare', effectText: 'Veneno +3' } // Nova Carta
    ],
    legendary: [
        { value: 10, name: 'ULTRA', type: 'attack', power: 25, rarity: 'legendary' },
        { value: 1, name: 'REI', type: 'all', power: 10, rarity: 'legendary', effectText: 'Dano + Cura' },
        { value: 0, name: 'CORINGA', type: 'wild', power: 5, rarity: 'legendary', effectText: 'Qualquer slot' },
        { value: 8, name: 'Tempestade Rúnica', type: 'storm', power: 3, rarity: 'legendary', effectText: 'Dano = 3x slots cheios' } // Nova Carta
    ]
};

const RELIC_DATA = {
    'lens': { name: 'Lente de Cristal', icon: '🔍', effect: 'Começa com o slot 1 preenchido.' },
    'glove': { name: 'Luva de Ferro', icon: '🥊', effect: 'Ultimates curam 5 HP.' },
    'hourglass': { name: 'Ampulheta', icon: '⏳', effect: 'Uma vez por turno, pode descartar e comprar de novo.' },
    'shield': { name: 'Escudo de Carvalho', icon: '🛡️', effect: 'Começa cada batalha com 10 de Escudo.' },
    'thief': { name: 'Mão do Ladrão', icon: '🧤', effect: 'Clique em uma carta no tabuleiro inimigo para roubá-la (1x turno).' },
    'math_odd': { name: 'Pergaminho Ímpar', icon: '📜', effect: 'Cura 2 HP ao comprar cartas Ímpares.' },
    'math_even': { name: 'Pergaminho Par', icon: '📜', effect: 'Cura 2 HP ao comprar cartas Pares.' },
    'math_prime': { name: 'Pergaminho Primo', icon: '📜', effect: 'Cura 4 HP ao comprar cartas Primas (2,3,5,7).' }
};

let usedHourglass = false;
let usedThiefHand = false;

// --- NARRATIVE MYSTERY EVENTS (?) ---
const EVENT_POOL = [
    {
        title: "O Altar do Sacrifício",
        emoji: "🔮",
        text: "Você encontra um altar rúnico pulsando com energia sombria. Uma inscrição diz: 'Sangue por poder'.",
        choices: [
            {
                text: "Oferecer Sangue (-15 Vida Máx, +1 Relíquia)",
                action() {
                    state.player.maxHp = Math.max(10, state.player.maxHp - 15);
                    if (state.player.hp > state.player.maxHp) state.player.hp = state.player.maxHp;
                    const availableRelics = Object.keys(RELIC_DATA).filter(id => !state.relics.includes(id));
                    if (availableRelics.length > 0) {
                        const rid = availableRelics[Math.floor(Math.random() * availableRelics.length)];
                        state.relics.push(rid);
                        showToast(`Ganhou: ${RELIC_DATA[rid].name}!`, "#ff9f43");
                    } else {
                        state.gold += 100;
                        showToast("Ganhou 100 de Ouro!", "#ff9f43");
                    }
                }
            },
            {
                text: "Rezar no Altar (+25 Vida)",
                action() {
                    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
                    SoundManager.play('heal');
                    showToast("Curou 25 HP!", "#2ecc71");
                }
            },
            {
                text: "Ignorar e seguir em frente",
                action() {
                    showToast("Você seguiu viagem com segurança.");
                }
            }
        ]
    },
    {
        title: "O Baú Rúnico Trancado",
        emoji: "📦",
        text: "Um baú pesado e trancado com runas antigas repousa na estrada. Há marcas de fuligem ao redor.",
        choices: [
            {
                text: "Forçar Fechadura (50% de chance)",
                action() {
                    if (Math.random() > 0.5) {
                        state.gold += 120;
                        SoundManager.play('buy');
                        showToast("Sucesso! +120 Ouro!", "#ffc048");
                    } else {
                        state.player.hp = Math.max(1, state.player.hp - 12);
                        SoundManager.play('defeat');
                        showToast("Explosão! -12 HP!", "#ff4757");
                    }
                }
            },
            {
                text: "Ignorar por segurança",
                action() {
                    showToast("Você decidiu não arriscar.");
                }
            }
        ]
    },
    {
        title: "O Comerciante Perdido",
        emoji: "🧙‍♂️",
        text: "Um andarilho vestindo mantos rasgados está sentado em uma pedra rúnica. 'Quer apostar em uma mercadoria?', ele sibila.",
        choices: [
            {
                text: "Comprar carta surpresa (40 Ouro)",
                action() {
                    if (state.gold >= 40) {
                        state.gold -= 40;
                        const r = Math.random() > 0.85 ? 'legendary' : (Math.random() > 0.5 ? 'rare' : 'common');
                        const card = getRandomFromPool(r, 1)[0];
                        state.player.deck.push({ ...card, upgraded: false });
                        SoundManager.play('buy');
                        showToast(`Adquiriu: ${card.name}!`, "#ffc048");
                    } else {
                        showToast("Ouro insuficiente!");
                    }
                }
            },
            {
                text: "Ir embora",
                action() {
                    showToast("Você continuou sua jornada.");
                }
            }
        ]
    }
];

// --- SKILLS & ACHIEVEMENTS DATA CATALOGS ---
const SKILL_TREE = {
    hp: { name: "Sangue Rúnico", description: "Inicia as runs com Vida Máxima estendida", maxLevel: 3, costs: [15, 30, 45], values: [5, 10, 15] },
    gold: { name: "Bolsa da Sorte", description: "Inicia as runs com mais Ouro nos bolsos", maxLevel: 3, costs: [10, 25, 40], values: [15, 30, 50] },
    spikes: { name: "Espinhos de Aço", description: "Inicia todas as batalhas com Espinhos de ferro", maxLevel: 2, costs: [30, 60], values: [2, 4] },
    analitica: { name: "Mente Analítica", description: "Slot Dourado triplica efeitos (x3) ao invés de duplicar (x2)", maxLevel: 1, costs: [80], values: [1] }
};

const ACHIEVEMENTS_LIST = [
    { id: 'first_win', name: 'Primeiro Sangue', desc: 'Venceu um inimigo em combate.', icon: '🏆' },
    { id: 'floor_10', name: 'Caminhante Rúnico', desc: 'Alcançou o Andar 10.', icon: '🧭' },
    { id: 'math_god', name: 'Alquimista Matemático', desc: 'Adquiriu qualquer pergaminho matemático.', icon: '📜' },
    { id: 'gold_150', name: 'Magnata das Cartas', desc: 'Acumulou 150 ou mais de Ouro durante a run.', icon: '💰' },
    { id: 'shield_25', name: 'Escudo Impenetrável', desc: 'Alcançou 25 ou mais de Escudo em combate.', icon: '🛡️' },
    { id: 'dragon_slayer', name: 'Matador de Dragões', desc: 'Derrotou o temível Chefe Dragão (Andar 51).', icon: '👑' }
];
