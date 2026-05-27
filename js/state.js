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
        boardCards: new Array(10).fill(null), // Guarda o objeto completo da carta para exibir sprite correta
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
        analitica: 0,
        poison_start: 0,
        card_draw_heal: 0,
        star_dust_multiplier: 0,
        reroll_shop: 0,
        relic_start: 0
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
    'lens': { name: 'Lente de Cristal', icon: '🔍', effect: 'Começa com o slot 1 preenchido.', lore: 'Uma lente antiga esculpida por astrônomos do vazio. Ela prevê o primeiro passo antes que ele ocorra.' },
    'glove': { name: 'Luva de Ferro', icon: '🥊', effect: 'Ultimates curam 5 HP.', lore: 'A luva pesada de um cavaleiro lendário. Cada golpe finalizador bem sucedido revigora a alma do portador.' },
    'hourglass': { name: 'Ampulheta', icon: '⏳', effect: 'Uma vez por turno, pode descartar e comprar de novo.', lore: 'A areia dentro desta ampulheta escorre para os lados, permitindo distorcer momentaneamente o tempo e o destino.' },
    'shield': { name: 'Escudo de Carvalho', icon: '🛡️', effect: 'Começa cada batalha com 10 de Escudo.', lore: 'Esculpido no cerne da grande árvore rúnica. Sua aura projeta uma barreira protetora intransponível.' },
    'thief': { name: 'Mão do Ladrão', icon: '🧤', effect: 'Clique em uma carta no tabuleiro inimigo para roubá-la (1x turno).', lore: 'Feita de couro de dragão preto que torna os dedos do portador invisíveis na hora da investida.' },
    'math_odd': { name: 'Pergaminho Ímpar', icon: '📜', effect: 'Cura 2 HP ao comprar cartas Ímpares.', lore: 'Inscrito por antigos magos que viam no poder dos números ímpares a essência ativa da criação.' },
    'math_even': { name: 'Pergaminho Par', icon: '📜', effect: 'Cura 2 HP ao comprar cartas Pares.', lore: 'Uma ode matemática à simetria cósmica e ao equilíbrio perfeito de forças pares no universo.' },
    'math_prime': { name: 'Pergaminho Primo', icon: '📜', effect: 'Cura 4 HP ao comprar cartas Primas (2,3,5,7).', lore: 'A ordem secreta dos números puros indivisíveis, cujas frequências ressoam com energias regenerativas.' },
    'phoenix_feather': { name: 'Pena de Fênix', icon: '🪶', effect: 'Ressuscita uma vez por combate com 25% HP ao sofrer dano letal.', lore: 'Uma pluma incandescente que irradia calor eterno, enganando a própria morte ao queimar em pura energia vital.' },
    'dice': { name: 'Dado Viciado', icon: '🎲', effect: 'Início do turno: 15% de chance de mudar o Slot Dourado.', lore: 'Entalhado a partir do osso de um demônio trapaceiro. Altera os caprichos da sorte a cada rolagem.' },
    'runic_anvil': { name: 'Bigorna Rúnica', icon: '⚒️', effect: 'Cartas melhoradas (+) ganham +3 de poder.', lore: 'Um bloco forjado em metal celestial que faz qualquer runa aprimorada vibrar com poder amplificado.' },
    'cauldron': { name: 'Caldeirão Rúnico', icon: '🥣', effect: 'Toda vez que você curar HP, causa 3 de dano ao inimigo.', lore: 'Este caldeirão ferve com poções instáveis que convertem energias de cura em ondas de choque destrutivas.' },
    'spiked_collar': { name: 'Coleira de Espinhos', icon: '🐕', effect: 'Espinhos retaliam 1.5x mais de dano.', lore: 'Um colar eriçado com pontas de ferro negro que reflete com fúria a dor infringida contra você.' },
    'toxic_gland': { name: 'Glândula Tóxica', icon: '🧪', effect: 'Sempre que aplicar Veneno, aplica +1 de Veneno adicional.', lore: 'Retirada das profundezas da Floresta Sombria. Destila uma toxina corrosiva devastadora.' }
};

let usedHourglass = false;
let usedThiefHand = false;
let usedPhoenixFeather = false;

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
    hp: { name: "Sangue Rúnico", description: "Inicia as runs com Vida Máxima estendida", maxLevel: 5, costs: [15, 30, 65, 95, 150], values: [5, 10, 40, 50, 100] },
    gold: { name: "Bolsa da Sorte", description: "Inicia as runs com mais Ouro nos bolsos", maxLevel: 2, costs: [25, 50], values: [50, 100] },
    spikes: { name: "Espinhos de Aço", description: "Inicia todas as batalhas com Espinhos de ferro", maxLevel: 4, costs: [30, 60, 120, 240], values: [2, 4, 60, 120] },
    analitica: { name: "Mente Analítica", description: "Slot Dourado triplica efeitos (x3) ao invés de duplicar (x2)", maxLevel: 1, costs: [80], values: [1] },
    poison_start: { name: "Frasco do Alquimista", description: "Inimigos começam os combates com Veneno inicial", maxLevel: 3, costs: [40, 80, 160], values: [1, 2, 4] },
    card_draw_heal: { name: "Bênção da Sorte", description: "Cura HP ao comprar cartas de valor 10", maxLevel: 2, costs: [50, 100], values: [1, 2] },
    star_dust_multiplier: { name: "Sorte Estelar", description: "Aumenta a Poeira Estelar obtida no final da run", maxLevel: 3, costs: [35, 75, 150], values: [1.10, 1.25, 1.50] },
    reroll_shop: { name: "Negociante Astuto", description: "Aplica descontos em todas as compras e remoções na loja", maxLevel: 3, costs: [60, 120, 180], values: [0.05, 0.10, 0.15] },
    relic_start: { name: "Pacto das Relíquias", description: "Você pode escolher relíquias para iniciar cada run", maxLevel: 3, costs: [100, 200, 300], values: [1, 2, 3] }
};

const ACHIEVEMENTS_LIST = [
    { id: 'first_win', name: 'Primeiro Sangue', desc: 'Venceu um inimigo em combate.', icon: '🏆' },
    { id: 'floor_10', name: 'Caminhante Rúnico', desc: 'Alcançou o Andar 10.', icon: '🧭' },
    { id: 'math_god', name: 'Alquimista Matemático', desc: 'Adquiriu qualquer pergaminho matemático.', icon: '📜' },
    { id: 'gold_150', name: 'Magnata das Cartas', desc: 'Acumulou 150 ou mais de Ouro durante a run.', icon: '💰' },
    { id: 'shield_25', name: 'Escudo Impenetrável', desc: 'Alcançou 25 ou mais de Escudo em combate.', icon: '🛡️' },
    { id: 'dragon_slayer', name: 'Matador de Dragões', desc: 'Derrotou o temível Chefe Dragão (Andar 51).', icon: '👑' },
    { id: 'perfect_victory', name: 'Intocável', desc: 'Venceu um combate com 100% da vida cheia.', icon: '🤍' },
    { id: 'burn_master', name: 'Piromante', desc: 'Aplicou 8 ou mais de Incendiar (Burn) no mesmo inimigo.', icon: '🔥' },
    { id: 'poison_master', name: 'Toxicologista', desc: 'Aplicou 10 ou mais de Veneno (Poison) no mesmo inimigo.', icon: '🧪' },
    { id: 'relic_collector', name: 'Colecionador de Relíquias', desc: 'Carregue 6 ou mais relíquias ao mesmo tempo em uma run.', icon: '🔮' },
    { id: 'max_skills', name: 'Maestria Estelar', desc: 'Maximizou qualquer habilidade na árvore de habilidades.', icon: '⭐' },
    { id: 'rich_run', name: 'Rei Midas', desc: 'Acumulou 300 ou mais de Ouro durante a run.', icon: '🪙' }
];

// --- PREMIUM GRAPHICS: DYNAMIC SVG CARD GENERATOR ---
function getCardGraphicSVG(type, value, rarity) {
    let color = "#ffeaa7";
    let iconPath = "";
    
    if (type === 'attack') {
        color = "#ff7675";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M25 75 L75 25 L80 30 L30 80 Z" fill="url(#steel-grad)" stroke="#1e272e" stroke-width="1.2"/>
                <path d="M20 80 L35 65" stroke="#ffeaa7" stroke-width="3" stroke-linecap="round"/>
                <circle cx="18" cy="82" r="3" fill="#ffeaa7"/>
                <path d="M30 70 L25 65" stroke="#1e272e" stroke-width="1.5"/>
                
                <path d="M75 25 L25 75 L30 80 L80 30 Z" fill="url(#steel-grad)" stroke="#1e272e" stroke-width="1.2" transform="translate(0, 100) scale(1, -1)"/>
                <path d="M20 20 L35 35" stroke="#ffeaa7" stroke-width="3" stroke-linecap="round" transform="translate(0, 100) scale(1, -1)"/>
                <circle cx="18" cy="18" r="3" fill="#ffeaa7" transform="translate(0, 100) scale(1, -1)"/>
            </g>
        `;
    } else if (type === 'defend') {
        color = "#74b9ff";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M50 18 C63 18, 76 14, 76 40 C76 60, 50 82, 50 82 C50 82, 24 60, 24 40 C24 14, 37 18, 50 18 Z" fill="url(#shield-grad)" stroke="#ffe670" stroke-width="1.8"/>
                <path d="M50 23 C58 23, 68 20, 68 40 C68 55, 50 72, 50 72 C50 72, 32 55, 32 40 C32 20, 42 23, 50 23 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>
            </g>
        `;
    } else if (type === 'heal') {
        color = "#55efc4";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M50 35 C50 23, 27 15, 27 38 C27 60, 50 78, 50 78 C50 78, 73 60, 73 38 C73 15, 50 23, 50 35 Z" fill="url(#heart-grad)" stroke="#ff7675" stroke-width="1.5"/>
                <path d="M38 34 C36 28, 46 28, 44 34 Z" fill="rgba(255,255,255,0.25)"/>
            </g>
        `;
    } else if (type === 'spikes') {
        color = "#a29bfe";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <circle cx="50" cy="50" r="18" fill="url(#steel-grad)" stroke="#ffe670" stroke-width="1.5"/>
                <path d="M50 15 L50 85 M15 50 L85 50 M25 25 L75 75 M25 75 L75 25" stroke="#ffe670" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="12" fill="#1c1d22"/>
            </g>
        `;
    } else if (type === 'poison') {
        color = "#2ecc71";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M44 22 L56 22 L56 35 L72 65 C76 72, 68 82, 50 82 C32 82, 24 72, 28 65 L44 35 Z" fill="url(#poison-grad)" stroke="#2ecc71" stroke-width="1.8"/>
                <rect x="42" y="17" width="16" height="5" rx="1.5" fill="#2ecc71" stroke="#000" stroke-width="1"/>
                <path d="M34 68 C40 73, 60 63, 66 68" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" fill="none"/>
            </g>
        `;
    } else if (type === 'storm') {
        color = "#fdcb6e";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M58 15 L32 50 L48 50 L38 82 L68 42 L52 42 Z" fill="url(#lightning-grad)" stroke="#ffb900" stroke-width="1.8" stroke-linejoin="round"/>
            </g>
        `;
    } else if (type === 'wild') {
        color = "#e84393";
        iconPath = `
            <g filter="url(#drop-shadow)" class="svg-icon-group">
                <path d="M50 15 L60 38 L85 38 L65 53 L73 78 L50 62 L27 78 L35 53 L15 38 L40 38 Z" fill="url(#gold-grad)" stroke="#ff7675" stroke-width="1.5"/>
                <circle cx="50" cy="48" r="4" fill="#fff" filter="blur(1px)"/>
            </g>
        `;
    } else {
        iconPath = `
            <path d="M30 50 L70 50 M50 30 L50 70" stroke="rgba(255,255,255,0.06)" stroke-width="4" stroke-linecap="round" class="svg-icon-group"/>
        `;
    }
    
    let borderPattern = "";
    if (rarity === 'common') {
        borderPattern = `<rect x="3" y="3" width="94" height="94" rx="6" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/>`;
    } else if (rarity === 'rare') {
        borderPattern = `
            <rect x="3" y="3" width="94" height="94" rx="6" fill="none" stroke="url(#blue-magic)" stroke-width="2"/>
            <path d="M8 8 L16 8 M8 8 L8 16 M92 8 L84 8 M92 8 L92 16 M8 92 L16 92 M8 92 L8 84 M92 92 L84 92 M92 92 L92 84" stroke="#00d2d3" stroke-width="1.2"/>
        `;
    } else if (rarity === 'legendary') {
        borderPattern = `
            <rect x="3" y="3" width="94" height="94" rx="6" fill="none" stroke="url(#gold-magic)" stroke-width="2.2"/>
            <path d="M8 8 L16 8 M8 8 L8 16 M92 8 L84 8 M92 8 L92 16 M8 92 L16 92 M8 92 L8 84 M92 92 L84 92 M92 92 L92 84" stroke="#ff9f43" stroke-width="1.5"/>
        `;
    } else if (rarity === 'curse') {
        borderPattern = `
            <rect x="3" y="3" width="94" height="94" rx="6" fill="none" stroke="url(#purple-void)" stroke-width="2"/>
            <circle cx="6" cy="6" r="2.5" fill="#8c7ae6"/>
            <circle cx="94" cy="6" r="2.5" fill="#8c7ae6"/>
            <circle cx="6" cy="94" r="2.5" fill="#8c7ae6"/>
            <circle cx="94" cy="94" r="2.5" fill="#8c7ae6"/>
        `;
    } else if (rarity === 'enemy-card') {
        borderPattern = `
            <rect x="3" y="3" width="94" height="94" rx="6" fill="none" stroke="#ff4757" stroke-width="1.8"/>
            <path d="M10 10 L16 16 M90 10 L84 16 M10 90 L16 84 M90 90 L84 84" stroke="#ff4757" stroke-width="1.2"/>
        `;
    }

    return `
        <svg viewBox="0 0 100 100" class="card-svg-container" preserveAspectRatio="none">
            <defs>
                <filter id="drop-shadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000000" flood-opacity="0.85"/>
                </filter>
                <linearGradient id="steel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#dfe6e9"/>
                    <stop offset="50%" stop-color="#b2bec3"/>
                    <stop offset="100%" stop-color="#636e72"/>
                </linearGradient>
                <linearGradient id="shield-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#54a0ff"/>
                    <stop offset="100%" stop-color="#2e86de"/>
                </linearGradient>
                <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ff7675"/>
                    <stop offset="100%" stop-color="#d63031"/>
                </linearGradient>
                <linearGradient id="poison-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#55efc4"/>
                    <stop offset="100%" stop-color="#10ac84"/>
                </linearGradient>
                <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ffeaa7"/>
                    <stop offset="100%" stop-color="#fdcb6e"/>
                </linearGradient>
                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffe17d"/>
                    <stop offset="50%" stop-color="#ffd700"/>
                    <stop offset="100%" stop-color="#b39200"/>
                </linearGradient>
                <linearGradient id="blue-magic" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00d2d3"/>
                    <stop offset="100%" stop-color="#0984e3"/>
                </linearGradient>
                <linearGradient id="gold-magic" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffe670"/>
                    <stop offset="100%" stop-color="#d4af37"/>
                </linearGradient>
                <linearGradient id="purple-void" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a29bfe"/>
                    <stop offset="100%" stop-color="#6c5ce7"/>
                </linearGradient>
            </defs>
            
            ${iconPath}
            ${borderPattern}
        </svg>
    `;
}

