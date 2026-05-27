// --- GAME ENGINE & COMBAT LOOP ---

// --- PERSISTENCE ---

function saveMetaProgression() {
    localStorage.setItem('jogo1a10_meta_save', JSON.stringify({
        starDust: state.starDust,
        skills: state.skills,
        achievements: state.achievements,
        unlockedMaps: state.unlockedMaps // Salva mapas permanentes desbloqueados!
    }));
    console.log("Meta-progresso permanente salvo.");
}

function loadMetaProgression() {
    const saved = localStorage.getItem('jogo1a10_meta_save');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.starDust = parsed.starDust || 0;
        state.skills = {
            hp: 0,
            gold: 0,
            spikes: 0,
            analitica: 0,
            poison_start: 0,
            card_draw_heal: 0,
            star_dust_multiplier: 0,
            reroll_shop: 0,
            ...parsed.skills
        };
        state.achievements = parsed.achievements || [];
        state.unlockedMaps = parsed.unlockedMaps || ['map1']; // Padrão: Apenas o mapa 1 liberado
        console.log("Meta-progresso permanente carregado.");
    }
}

function saveGame() {
    localStorage.setItem('jogo1a10_save', JSON.stringify({
        floor: state.floor,
        gold: state.gold,
        relics: state.relics,
        deck: state.player.deck,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        mapNodes: state.mapNodes, // Salva o caminho exato do mapa rúnico!
        shopItems: state.shopItems, // Salva o estado trancado da prateleira da loja!
        currentMap: state.currentMap // Salva o número do mapa atual
    }));
    console.log("Progresso salvo automaticamente.");
}

function checkSave() {
    const saved = localStorage.getItem('jogo1a10_save');
    const btn = document.getElementById('continue-btn');
    if (saved && btn) {
        btn.style.display = 'block';
        console.log("Save encontrado e botão exibido.");
    } else if (btn) {
        btn.style.display = 'none';
    }
}

function continueRun() {
    const saved = JSON.parse(localStorage.getItem('jogo1a10_save'));
    if (saved) {
        state.floor = saved.floor;
        state.gold = saved.gold;
        state.relics = saved.relics;
        state.player.deck = saved.deck;
        state.player.hp = saved.hp;
        state.player.maxHp = saved.maxHp;
        state.mapNodes = saved.mapNodes || [];
        state.shopItems = saved.shopItems || null;
        state.currentMap = saved.currentMap || 1; // Restaura o mapa em andamento

        // Evita gerar mapa do zero se já existia na run salva
        if (state.mapNodes.length === 0) {
            generateMap();
        }
        goToMap();
    }
}

function startNewRun(mapNum = 1) {
    localStorage.removeItem('jogo1a10_save');
    loadMetaProgression(); // Carrega upgrades

    state.currentMap = mapNum;
    state.floor = (mapNum - 1) * 21 + 1; // Começa no primeiro andar do mapa correspondente
    state.relics = [];

    // Aplica bônus de ouro inicial da árvore de habilidades
    const goldLvl = state.skills.gold || 0;
    const goldBonus = goldLvl > 0 ? SKILL_TREE.gold.values[goldLvl - 1] : 0;

    // Concede ouro de compensação caso comece em mundos avançados
    let mapGoldBonus = 0;
    if (mapNum === 2) mapGoldBonus = 150;
    else if (mapNum === 3) mapGoldBonus = 300;

    state.gold = 50 + goldBonus + mapGoldBonus;

    // Aplica bônus de HP máximo
    const hpLvl = state.skills.hp || 0;
    const hpBonus = hpLvl > 0 ? SKILL_TREE.hp.values[hpLvl - 1] : 0;
    state.player.maxHp = 80 + hpBonus; 
    state.player.hp = state.player.maxHp; 
    state.player.shield = 0;

    // Cria o baralho inicial básico (cartas 1 a 10)
    state.player.deck = [];
    for (let i = 0; i < 4; i++) {
        for (let v = 1; v <= 10; v++) {
            state.player.deck.push({ 
                value: v, 
                type: 'basic', 
                name: v.toString(), 
                power: 8, 
                rarity: 'common', 
                upgraded: false 
            });
        }
    }

    // Concede Draft inicial caso comece diretamente nos mundos 2 ou 3 para equilibrar o gameplay
    if (mapNum === 2) {
        // Concede 2 relíquias aleatórias
        const rids = Object.keys(RELIC_DATA);
        for (let j = 0; j < 2; j++) {
            const rid = rids[Math.floor(Math.random() * rids.length)];
            if (!state.relics.includes(rid)) state.relics.push(rid);
        }
        // Adiciona 2 cartas raras aleatórias no baralho
        const rarePool = getRandomFromPool('rare', 2);
        rarePool.forEach(card => state.player.deck.push({ ...card, upgraded: false }));
    } else if (mapNum === 3) {
        // Concede 4 relíquias aleatórias
        const rids = Object.keys(RELIC_DATA);
        for (let j = 0; j < 4; j++) {
            const rid = rids[Math.floor(Math.random() * rids.length)];
            if (!state.relics.includes(rid)) state.relics.push(rid);
        }
        // Adiciona 4 cartas lendárias aleatórias no baralho
        const legPool = getRandomFromPool('legendary', 4);
        legPool.forEach(card => state.player.deck.push({ ...card, upgraded: false }));
    }

    state.shopItems = null; // Reseta prateleira da loja para gerar nova

    // Se o jogador tiver a habilidade Pacto das Relíquias, abre o seletor antes das bênçãos
    const relicStartLvl = state.skills.relic_start || 0;
    if (relicStartLvl > 0) {
        const relicCount = SKILL_TREE.relic_start.values[relicStartLvl - 1];
        showRelicStartPicker(relicCount);
    } else {
        showBlessings();
    }
}

function getRandomFromPool(rarity, count) {
    return CARD_POOL[rarity].sort(() => Math.random() - 0.5).slice(0, count);
}

// --- BATTLE CONTROL ---

function initBattle(isBoss = false) {
    state.player.drawPile = [...state.player.deck].map(c => ({ ...c })).sort(() => Math.random() - 0.5);
    state.player.discardPile = [];
    state.player.board = new Array(10).fill(0);
    state.player.boardCards = new Array(10).fill(null); // Reseta o registro de cartas no tabuleiro
    state.player.selectedCard = null;
    state.player.shield = state.relics.includes('shield') ? 10 : 0;
    
    // Aplica bônus de Espinhos Iniciais
    const spikesLvl = state.skills.spikes || 0;
    const spikesBonus = spikesLvl > 0 ? SKILL_TREE.spikes.values[spikesLvl - 1] : 0;
    state.player.spikes = spikesBonus;

    state.luckySlot = Math.floor(Math.random() * 10) + 1; // Sorteia o Slot Dourado
    usedHourglass = false;
    usedThiefHand = false;
    usedPhoenixFeather = false;

    if (state.relics.includes('lens')) state.player.board[0] = 1;

    const enemyPool = [
        { name: 'Goblin', hp: 25, intents: [{ type: 'attack', v: 5 }, { type: 'defend', v: 4 }] },
        { name: 'Zumbi', hp: 30, intents: [{ type: 'attack', v: 7 }, { type: 'attack', v: 3 }] },
        { name: 'Lobisomem', hp: 45, intents: [{ type: 'attack', v: 10 }, { type: 'defend', v: 8 }] },
        { name: 'Mago', hp: 20, intents: [{ type: 'attack', v: 12 }, { type: 'defend', v: 2 }] },
        { name: 'Slime', hp: 50, intents: [{ type: 'defend', v: 10 }, { type: 'defend', v: 10 }] },
        { name: 'Morcego', hp: 15, intents: [{ type: 'attack', v: 4 }, { type: 'attack', v: 4 }] },

        { name: 'Dragão', hp: 75, intents: [{ type: 'attack', v: 22 }, { type: 'defend', v: 12 }] },

        { name: 'Esqueleto', hp: 22, intents: [{ type: 'attack', v: 6 }, { type: 'defend', v: 3 }] },
        { name: 'Aranha Gigante', hp: 28, intents: [{ type: 'attack', v: 8 }, { type: 'attack', v: 4 }] },
        { name: 'Golem de Pedra', hp: 60, intents: [{ type: 'defend', v: 12 }, { type: 'attack', v: 6 }] },
        { name: 'Espectro', hp: 18, intents: [{ type: 'attack', v: 9 }, { type: 'defend', v: 5 }] },
        { name: 'Orc Guerreiro', hp: 40, intents: [{ type: 'attack', v: 11 }, { type: 'defend', v: 6 }] },
        { name: 'Cobra Venenosa', hp: 12, intents: [{ type: 'attack', v: 5 }, { type: 'attack', v: 10 }] },
        { name: 'Primata Insano', hp: 35, intents: [{ type: 'defend', v: 15 }, { type: 'attack', v: 4 }] },
        { name: 'Cérbero', hp: 54, intents: [{ type: 'attack', v: 19 }, { type: 'attack', v: 2 }] },
        { name: 'Troll', hp: 35, intents: [{ type: 'attack', v: 12 }, { type: 'defend', v: 4 }] },
        { name: 'Sombra', hp: 20, intents: [{ type: 'attack', v: 7 }, { type: 'attack', v: 7 }] }
    ];

    // Seleciona o Chefe baseado no mapa atual
    let bossName = "Guardião da Floresta";
    let bossHp = 90;

    if (state.currentMap === 2) {
        bossName = "Rei Goblin";
        bossHp = 130;
    } else if (state.currentMap === 3) {
        bossName = "Dragão Supremo";
        bossHp = 180;
    }

    const selected = isBoss 
        ? { name: bossName, hp: bossHp } 
        : enemyPool[Math.floor(Math.random() * enemyPool.length)];

    state.enemy.name = isBoss ? "CHEFE: " + selected.name : selected.name;

    // Escalamento de vida dos monstros com base no Mundo atual
    let mapHpModifier = 0;
    if (state.currentMap === 2) mapHpModifier = 15;
    else if (state.currentMap === 3) mapHpModifier = 35;

    state.enemy.hp = selected.hp + (state.floor * 3) + mapHpModifier;
    state.enemy.maxHp = state.enemy.hp;
    state.enemy.board = new Array(10).fill(0);
    state.enemy.shield = 0;

    const spriteName = selected.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    state.enemy.sprite = `imagens/${spriteName}.png`;

    const poisonLvl = state.skills.poison_start || 0;
    const poisonBonus = poisonLvl > 0 ? SKILL_TREE.poison_start.values[poisonLvl - 1] : 0;
    state.enemy.status = { 
        burn: 0,
        poison: poisonBonus
    };

    state.enemy.intents = selected.intents ? selected.intents.map(i => ({ type: i.type, value: i.v + Math.floor(state.floor / 2) })) : [
        { type: 'attack', value: 10 + state.floor },
        { type: 'defend', value: 15 + state.floor }
    ];
    state.enemy.intentIndex = 0;
    state.enemy.intent = state.enemy.intents[0];

    state.battleActive = true;
    showScreen('battle');
    renderBattle();

    // Coin Flip - Cara ou Coroa
    state.canPlay = false;
    const playerStarts = Math.random() > 0.5;

    setTimeout(() => {
        SoundManager.play('coin');
        showToast(playerStarts ? "🪙 CARA: Você Começa!" : "🪙 COROA: Inimigo Começa!", playerStarts ? "#2ecc71" : "#e63946");

        setTimeout(() => {
            if (playerStarts) {
                state.canPlay = true;
                drawFromDeck();
            } else {
                endPlayerTurn(); 
            }
        }, 1200);
    }, 500);
}

function renderBattle() {
    // Rastreia conquistas de acúmulo de ouro e relíquias
    if (state.gold >= 150) unlockAchievement('gold_150');
    if (state.gold >= 300) unlockAchievement('rich_run');
    if (state.relics.length >= 6) unlockAchievement('relic_collector');

    updateHPBar('player', state.player.hp, state.player.maxHp, state.player.shield);
    updateHPBar('enemy', state.enemy.hp, state.enemy.maxHp, state.enemy.shield);

    document.getElementById('draw-count').innerText = state.player.drawPile.length;
    document.getElementById('discard-count').innerText = state.player.discardPile.length;
    document.getElementById('gold-count').innerText = state.gold;
    document.getElementById('floor-count').innerText = state.floor;

    renderBoard('player-board', state.player.board, true);
    renderBoard('enemy-board', state.enemy.board, false);

    const handSlot = document.getElementById('hand-slot');
    handSlot.innerHTML = '';
    if (state.player.selectedCard) {
        const card = createCardElement(state.player.selectedCard);
        card.classList.add('selected');
        handSlot.appendChild(card);
    }

    const relicBar = document.getElementById('relic-bar');
    relicBar.innerHTML = '';
    state.relics.forEach(rid => {
        const r = document.createElement('div');
        r.className = 'relic-icon';
        r.innerText = RELIC_DATA[rid].icon;
        
        // Remove basic browser tooltip title
        r.removeAttribute('title');

        // Elegant custom glassmorphism floating tooltip
        r.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('relic-tooltip');
            const data = RELIC_DATA[rid];
            document.getElementById('relic-tooltip-title').innerHTML = `<span style="font-size: 1.2em;">${data.icon}</span> ${data.name}`;
            document.getElementById('relic-tooltip-effect').innerText = data.effect;
            document.getElementById('relic-tooltip-lore').innerText = data.lore || "";
            
            tooltip.classList.add('show');
            
            // Recalculate size and position right above the hovered icon
            const rect = r.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 14}px`;
        });

        r.addEventListener('mouseleave', () => {
            document.getElementById('relic-tooltip').classList.remove('show');
        });

        relicBar.appendChild(r);
    });

    let enemyStatusText = '';
    if (state.enemy.status.burn > 0) enemyStatusText += ` 🔥(${state.enemy.status.burn})`;
    if (state.enemy.status.poison > 0) enemyStatusText += ` 🧪(${state.enemy.status.poison})`;
    document.getElementById('enemy-name').innerText = state.enemy.name + enemyStatusText;

    // Atualiza Espinhos no rodapé do jogador
    const pInfoDiv = document.querySelector('.battle-footer .info div[style*="margin-top"]');
    if (pInfoDiv) {
        let pInfoText = `🟡 Ouro: <span id="gold-count">${state.gold}</span> | Andar: <span id="floor-count">${state.floor}</span>`;
        if (state.player.spikes > 0) pInfoText += ` | 🥊 Espinhos: <strong>${state.player.spikes}</strong>`;
        pInfoDiv.innerHTML = pInfoText;
    }

    const spriteImg = document.getElementById('enemy-sprite');
    const spriteContainer = spriteImg.parentElement;

    spriteImg.src = state.enemy.sprite;
    spriteImg.style.display = 'block';
    if (document.getElementById('enemy-portrait-fallback')) document.getElementById('enemy-portrait-fallback').remove();

    spriteImg.onerror = () => {
        spriteImg.style.display = 'none';
        if (!document.getElementById('enemy-portrait-fallback')) {
            const fallback = document.createElement('div');
            fallback.id = 'enemy-portrait-fallback';
            fallback.className = 'cinzel';
            fallback.style.cssText = `
                width: 180px; height: 180px; background: rgba(255,255,255,0.05);
                border: 2px solid var(--primary); border-radius: 15px;
                display: flex; justify-content: center; align-items: center;
                font-size: 1.5em; text-align: center; color: var(--primary);
                text-shadow: 0 0 10px rgba(200,161,101,0.5);
            `;
            fallback.innerText = state.enemy.name;
            spriteContainer.appendChild(fallback);
        }
    };

    const intentText = document.getElementById('intent-text');
    const intentIcon = document.querySelector('.intent-icon');
    intentIcon.innerText = state.enemy.intent.type === 'attack' ? '⚔️' : '🛡️';
    intentText.innerText = state.enemy.intent.type === 'attack' ? `Dano: ${state.enemy.intent.value}` : `Defesa: ${state.enemy.intent.value}`;
}

function updateHPBar(prefix, hp, max, shield) {
    const bar = document.getElementById(`${prefix}-hp-bar`);
    const text = document.getElementById(`${prefix}-hp-text`);
    const shieldBadge = document.getElementById(`${prefix}-shield`);
    const pct = (hp / max) * 100;
    
    // Suporte para o delay de dano (efeito visual premium de queda lenta)
    const container = bar.parentElement;
    let delayBar = container.querySelector('.hp-bar-delay');
    if (!delayBar) {
        delayBar = document.createElement('div');
        delayBar.className = 'hp-bar-delay';
        container.insertBefore(delayBar, bar);
    }
    
    bar.style.width = pct + '%';
    
    // Atualiza a barra de delay um pouco depois
    setTimeout(() => {
        delayBar.style.width = pct + '%';
    }, 400);

    text.innerText = `${hp} / ${max}`;
    
    if (shield > 0) {
        shieldBadge.innerText = shield;
        shieldBadge.style.display = 'block';
    } else {
        shieldBadge.style.display = 'none';
    }
}

function renderBoard(containerId, board, isPlayer) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="board-label">${isPlayer ? 'Seu Tabuleiro' : 'Tabuleiro do Inimigo'}</div>`;

    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        const val = board[i];

        if (isPlayer && (i + 1) === state.luckySlot) {
            slot.classList.add('lucky');
            slot.title = "✨ Slot Dourado! Efeitos duplicados! ✨";
        }

        if (val !== 0) {
            slot.classList.add('filled');
            // Usa o objeto completo da carta se disponível (para sprites de cartas especiais)
            const boardCardObj = isPlayer && state.player.boardCards && state.player.boardCards[i]
                ? state.player.boardCards[i]
                : { value: val, name: val.toString(), rarity: isPlayer ? 'common' : 'enemy-card' };
            const card = createCardElement(boardCardObj);
            slot.appendChild(card);
            if (!isPlayer && state.relics.includes('thief')) {
                slot.style.cursor = 'copy';
                slot.title = "Clique para roubar esta carta!";
                slot.onclick = () => stealEnemyCard(i);
            }
        } else {
            const hidden = document.createElement('div');
            hidden.className = 'card hidden';
            hidden.innerHTML = `<span class="pos-hint">${i + 1}</span>`;
            if (isPlayer) {
                slot.onclick = () => handleSlotClick(i);
                if (state.player.selectedCard && (state.player.selectedCard.value === (i + 1) || state.player.selectedCard.type === 'wild')) {
                    slot.classList.add('target');
                }
            }
            slot.appendChild(hidden);
        }
        container.appendChild(slot);
    }
}

function stealEnemyCard(index) {
    if (!state.canPlay || usedThiefHand || !state.relics.includes('thief')) return;

    const val = state.enemy.board[index];
    if (val === 0) return;

    if (state.player.board[val - 1] !== 0) {
        showToast("Você já tem essa carta!");
        return;
    }

    if (state.player.selectedCard) {
        showToast("Já tem uma carta na mão!");
        return;
    }

    SoundManager.play('draw');
    state.player.selectedCard = { value: val, type: 'basic', name: val.toString(), power: 2, rarity: 'rare' };
    usedThiefHand = true;

    showToast("Carta Copiada!", "#f1c40f");
    spawnFloatingText("🧤 CÓPIA!", "#f1c40f");
    renderBattle();
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.rarity || 'common'}`;
    
    // Generates the background SVG vector graphic for the card
    el.innerHTML = `
        ${getCardGraphicSVG(card.type || 'basic', card.value, card.rarity || 'common')}
        <span class="card-value-display top-left">${card.value === 0 ? '★' : card.value}</span>
    `;

    if (card.name && card.name !== card.value.toString()) {
        const nameTag = document.createElement('div');
        nameTag.className = 'card-title-display';
        nameTag.innerText = card.name;
        el.appendChild(nameTag);
    }

    if (card.upgraded) {
        const badge = document.createElement('div');
        badge.className = 'upgrade-badge';
        badge.innerText = '+';
        el.appendChild(badge);
    }

    // Nomenclatura automática para sprite da carta: "Ímpar Sagrado" -> "impar_sagrado.png"
    // Remove acentos e caracteres especiais, converte para minúsculas e substitui espaços por '_'
    const spriteName = card.name 
        ? card.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "_") 
        : "";
        
    if (spriteName) {
        const spritePath = `imagens/cartas/${spriteName}.png`;
        const img = document.createElement('img');
        img.className = 'card-illustration';
        img.src = spritePath;
        img.style.display = 'none'; // Permanece oculta até carregar com sucesso
        
        img.onload = () => {
            img.style.display = 'block';
            // Oculta com sucesso os ícones padrão do SVG do jogo
            const defaultIcons = el.querySelectorAll('.svg-icon-group');
            defaultIcons.forEach(icon => icon.style.display = 'none');
        };
        
        img.onerror = () => {
            img.style.display = 'none'; // Fallback de segurança: deixa o SVG original visível
        };
        
        el.appendChild(img);
    }

    applyCardTilt(el);
    return el;
}

function triggerCauldronEffect() {
    if (state.relics.includes('cauldron') && state.battleActive && state.enemy && state.enemy.hp > 0) {
        state.enemy.hp = Math.max(0, state.enemy.hp - 3);
        const enemySprite = document.getElementById('enemy-sprite');
        const enemyRect = enemySprite ? enemySprite.getBoundingClientRect() : { left: 0, top: 0 };
        spawnFloatingText("🥣-3💥", "#ff4757", enemyRect.left + 90, enemyRect.top + 50);
        renderBattle();
    }
}

// --- CARD PLAY AND MATHEMATICAL CHECKS ---

function drawFromDeck() {
    if (!state.battleActive || !state.canPlay || state.player.selectedCard) return;

    // Dado Viciado Relic: 15% chance to change Golden Slot position
    if (state.relics.includes('dice') && Math.random() < 0.15) {
        state.luckySlot = Math.floor(Math.random() * 10) + 1;
        showToast("🎲 DADO VICIADO: Slot Dourado mudou!", "#ff9f43");
    }

    if (state.player.drawPile.length === 0) {
        if (state.player.discardPile.length > 0) {
            state.player.drawPile = [...state.player.discardPile].sort(() => Math.random() - 0.5);
            state.player.discardPile = [];
            showToast("Reembaralhando!", "#3498db");
            renderBattle();
        } else return;
    }
    
    SoundManager.play('draw');
    const card = state.player.drawPile.pop();

    // Math Heals (Passivas de Relíquia Matemática)
    const val = card.value;
    const isPrime = (n) => [2, 3, 5, 7].includes(n);
    const playerUI = document.querySelector('.battle-footer .info');
    const playerRect = playerUI ? playerUI.getBoundingClientRect() : { left: 0, top: 0 };

    if (val !== 0) {
        let checkHeal = false;
        if (val % 2 !== 0 && state.relics.includes('math_odd')) {
            const oldHp = state.player.hp;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
            if (state.player.hp > oldHp) {
                triggerCauldronEffect();
            }
            spawnFloatingText("+2❤️", "#2ecc71", playerRect.left, playerRect.top);
            checkHeal = true;
        }
        if (val % 2 === 0 && state.relics.includes('math_even')) {
            const oldHp = state.player.hp;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
            if (state.player.hp > oldHp) {
                triggerCauldronEffect();
            }
            spawnFloatingText("+2❤️", "#2ecc71", playerRect.left, playerRect.top);
            checkHeal = true;
        }
        if (isPrime(val) && state.relics.includes('math_prime')) {
            const oldHp = state.player.hp;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
            if (state.player.hp > oldHp) {
                triggerCauldronEffect();
            }
            spawnFloatingText("+4❤️", "#2ecc71", playerRect.left, playerRect.top);
            checkHeal = true;
        }
        
        // Habilidade "Bênção da Sorte": Cura HP ao comprar cartas de valor 10
        if (val === 10) {
            const healLvl = state.skills.card_draw_heal || 0;
            const healBonus = healLvl > 0 ? SKILL_TREE.card_draw_heal.values[healLvl - 1] : 0;
            if (healBonus > 0) {
                const oldHp = state.player.hp;
                state.player.hp = Math.min(state.player.maxHp, state.player.hp + healBonus);
                if (state.player.hp > oldHp) {
                    triggerCauldronEffect();
                    spawnFloatingText(`+${healBonus}❤️`, "#2ecc71", playerRect.left, playerRect.top);
                    checkHeal = true;
                }
            }
        }

        if (checkHeal) SoundManager.play('heal');
    }

    if (card.type !== 'wild' && state.player.board[card.value - 1] !== 0) {
        if (state.relics.includes('hourglass') && !usedHourglass) {
            usedHourglass = true;
            showToast("Ampulheta!", "#3498db");
            drawFromDeck();
        } else {
            showToast(`Repetida: ${card.value}.`, "#e67e22");
            state.player.discardPile.push(card);
            endPlayerTurn();
        }
    } else {
        state.player.selectedCard = card;
        renderBattle();
    }
}

function handleSlotClick(index) {
    if (!state.battleActive || !state.canPlay || !state.player.selectedCard) return;
    const pos = index + 1;
    const card = state.player.selectedCard;

    if (card.type === 'wild' || card.value === pos) {
        if (state.player.board[index] !== 0) {
            showToast("Slot já ocupado!");
            return;
        }
        
        // Sons conforme o efeito da carta
        if (card.type === 'attack') SoundManager.play('attack');
        else if (card.type === 'defend') SoundManager.play('defend');
        else if (card.type === 'heal') SoundManager.play('heal');
        else SoundManager.play('click');

        state.player.board[index] = (card.type === 'wild' ? pos : card.value);
        state.player.boardCards[index] = { ...card }; // Guarda objeto completo para sprite no tabuleiro
        
        // --- SISTEMA DE COMBOS DE POSICIONAMENTO ---
        // 1. Combo de Vizinhança (Adjacência)
        let isAdjacent = false;
        if ((index > 0 && state.player.board[index - 1] !== 0) || (index < 9 && state.player.board[index + 1] !== 0)) {
            isAdjacent = true;
        }
        if (isAdjacent) {
            state.player.shield += 3;
            showToast("🛡️ COMBO DE VIZINHANÇA! +3 Escudo", "#3498db");
            const playerUI = document.querySelector('.battle-footer .info');
            const playerRect = playerUI ? playerUI.getBoundingClientRect() : { left: 0, top: 0 };
            spawnFloatingText("+3🛡️", "#3498db", playerRect.left + 50, playerRect.top);
        }

        // 2. Combo de Sequência (Trinca)
        let comboSequence = false;
        if (
            (index >= 2 && state.player.board[index-2] !== 0 && state.player.board[index-1] !== 0) ||
            (index >= 1 && index <= 8 && state.player.board[index-1] !== 0 && state.player.board[index+1] !== 0) ||
            (index <= 7 && state.player.board[index+1] !== 0 && state.player.board[index+2] !== 0)
        ) {
            comboSequence = true;
        }
        if (comboSequence) {
            state.enemy.hp = Math.max(0, state.enemy.hp - 10);
            SoundManager.play('ultimate'); // Som de relâmpago
            showToast("⚡ COMBO DE SEQUÊNCIA! +10 Dano!", "#ffc048");
            const enemySprite = document.getElementById('enemy-sprite');
            const enemyRect = enemySprite ? enemySprite.getBoundingClientRect() : { left: 0, top: 0 };
            spawnFloatingText("⚡ 10!", "#ffc048", enemyRect.left + 90, enemyRect.top + 50);
        }

        const isLucky = (index + 1) === state.luckySlot;
        state.player.selectedCard = null;
        applyCardEffect(card, isLucky);
        setTimeout(() => {
            if (checkVictory()) return;
            drawFromDeck();
        }, 400);
    } else {
        showToast(`Use no slot ${card.value}`);
    }
}

function applyCardEffect(card, isLucky = false) {
    let dmg = card.power || 2;
    const enemySprite = document.getElementById('enemy-sprite');
    const playerUI = document.querySelector('.battle-footer .info');
    const enemyRect = enemySprite.getBoundingClientRect();
    const playerRect = playerUI.getBoundingClientRect();

    // Passiva da relíquia "Bigorna Rúnica": Aumenta o poder de cartas melhoradas (+) em +3
    if (card.upgraded && state.relics.includes('runic_anvil')) {
        dmg += 3;
    }

    // Mecânica do Slot Dourado: Duplica ou Triplica o poder dependendo da árvore de habilidades
    if (isLucky) {
        const analiticaLvl = state.skills.analitica || 0;
        const multiplier = analiticaLvl > 0 ? 3 : 2;
        dmg = dmg * multiplier;
        showToast(multiplier === 3 ? "✨ SLOT DOURADO (TRIPLO)! ✨" : "✨ SLOT DOURADO! EFEITO DUPLICADO! ✨", "#ffd700");
    }

    if (card.type === 'defend') {
        state.player.shield += dmg;
        spawnFloatingText(`+${dmg}🛡️`, "#3498db", playerRect.left + 50, playerRect.top);
        if (state.player.shield >= 25) unlockAchievement('shield_25');
    } else if (card.type === 'heal') {
        const oldHp = state.player.hp;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + dmg);
        if (state.player.hp > oldHp) {
            triggerCauldronEffect();
        }
        spawnFloatingText(`+${dmg}❤️`, "#2ecc71", playerRect.left + 50, playerRect.top);
        playerUI.classList.add('glow-heal');
        setTimeout(() => playerUI.classList.remove('glow-heal'), 800);
    } else if (card.type === 'spikes') {
        state.player.spikes += dmg;
        spawnFloatingText(`🥊+${dmg} Espinhos`, "#54a0ff", playerRect.left + 50, playerRect.top);
    } else if (card.type === 'poison') {
        let poisonApplied = dmg;
        if (state.relics.includes('toxic_gland')) {
            poisonApplied += 1;
        }
        state.enemy.status.poison += poisonApplied;
        spawnFloatingText(`🧪+${poisonApplied} Veneno`, "#2ecc71", enemyRect.left + 90, enemyRect.top + 20);
        if (state.enemy.status.poison >= 10) {
            unlockAchievement('poison_master');
        }
    } else if (card.type === 'storm') {
        const filled = state.player.board.filter(v => v !== 0).length;
        let stormDmg = filled * 3;
        if (isLucky) stormDmg = stormDmg * 2;
        state.enemy.hp = Math.max(0, state.enemy.hp - stormDmg);
        spawnFloatingText(`-${stormDmg}💥`, "#ff9f43", enemyRect.left + 90, enemyRect.top + 50);
        enemySprite.classList.add('shake');
        setTimeout(() => enemySprite.classList.remove('shake'), 400);
    } else if (card.type === 'all') {
        state.enemy.hp -= dmg;
        const oldHp = state.player.hp;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + dmg);
        if (state.player.hp > oldHp) {
            triggerCauldronEffect();
        }
        spawnFloatingText(`-${dmg}💥`, "#e63946", enemyRect.left + 90, enemyRect.top + 50);
        spawnFloatingText(`+${dmg}❤️`, "#2ecc71", playerRect.left + 50, playerRect.top);
    } else {
        state.enemy.hp -= dmg;
        spawnFloatingText(`-${dmg}💥`, "#e63946", enemyRect.left + 90, enemyRect.top + 50);
        enemySprite.classList.add('shake');
        setTimeout(() => enemySprite.classList.remove('shake'), 400);
    }

    if (card.status && card.status.burn) {
        state.enemy.status.burn += card.status.burn;
        spawnFloatingText(`🔥+${card.status.burn}`, "#e67e22", enemyRect.left + 90, enemyRect.top + 20);
        if (state.enemy.status.burn >= 8) {
            unlockAchievement('burn_master');
        }
    }

    if (state.enemy.hp < 0) state.enemy.hp = 0;
    renderBattle();
}

function endPlayerTurn() {
    state.canPlay = false;
    setTimeout(() => {
        if (!state.battleActive) return;

        const enemySprite = document.getElementById('enemy-sprite');
        const enemyRect = enemySprite.getBoundingClientRect();
        const playerUI = document.querySelector('.battle-footer .info');
        const playerRect = playerUI.getBoundingClientRect();

        // Efeito de Veneno (Poison) - Turno Inicial do Inimigo
        if (state.enemy.status.poison > 0) {
            state.enemy.hp -= state.enemy.status.poison;
            spawnFloatingText(`🧪-${state.enemy.status.poison}`, "#2ecc71", enemyRect.left + 90, enemyRect.top + 50);
            if (state.enemy.hp <= 0) { victory(); return; }
        }

        // Efeito de Burn
        if (state.enemy.status.burn > 0) {
            state.enemy.hp -= state.enemy.status.burn;
            spawnFloatingText(`🔥-${state.enemy.status.burn}`, "#e67e22", enemyRect.left + 90, enemyRect.top + 50);
            state.enemy.status.burn--;
            if (state.enemy.hp <= 0) { victory(); return; }
        }

        if (state.enemy.intent.type === 'attack') {
            SoundManager.play('attack');
            let dmg = Math.max(0, state.enemy.intent.value - state.player.shield);
            state.player.shield = Math.max(0, state.player.shield - state.enemy.intent.value);
            state.player.hp -= dmg;
            spawnFloatingText(`-${dmg}💥`, "#e63946", playerRect.left + 50, playerRect.top);
            
            // Retaliação de Espinhos (Spikes)
            if (state.player.spikes > 0) {
                let spikesDmg = state.player.spikes;
                if (state.relics.includes('spiked_collar')) {
                    spikesDmg = Math.floor(spikesDmg * 1.5);
                }
                state.enemy.hp = Math.max(0, state.enemy.hp - spikesDmg);
                spawnFloatingText(`🥊-${spikesDmg}`, "#ffd700", enemyRect.left + 90, enemyRect.top + 50);
                if (state.enemy.hp <= 0) {
                    setTimeout(() => { victory(); }, 400);
                    return;
                }
            }
            
            // Premium Screen Shake (Treme todo o battlefield-container)
            const bContainer = document.querySelector('.battle-container');
            if (bContainer) {
                bContainer.classList.add('shake');
                setTimeout(() => bContainer.classList.remove('shake'), 400);
            }
            playerUI.classList.add('shake');
            setTimeout(() => playerUI.classList.remove('shake'), 400);
        } else {
            SoundManager.play('defend');
            state.enemy.shield += state.enemy.intent.value;
            spawnFloatingText(`+${state.enemy.intent.value}🛡️`, "#3498db", enemyRect.left + 90, enemyRect.top + 50);
        }

        const emptySlots = state.enemy.board.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
        if (emptySlots.length > 0) {
            const idx = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            state.enemy.board[idx] = idx + 1;
        }

        state.enemy.intentIndex = (state.enemy.intentIndex + 1) % state.enemy.intents.length;
        state.enemy.intent = state.enemy.intents[state.enemy.intentIndex];

        usedHourglass = false;
        usedThiefHand = false;
        state.canPlay = true;
        renderBattle();
        if (checkDefeat()) return;
        checkEnemyUltimate();
    }, 1000);
}

function checkEnemyUltimate() {
    if (state.enemy.board.every(v => v !== 0)) {
        SoundManager.play('ultimate');
        showToast("ULTIMATE INIMIGO!", "#e63946");
        state.player.hp -= 20;
        spawnFloatingText("-20💥", "#e63946");
        state.enemy.board = new Array(10).fill(0);
        renderBattle();
        checkDefeat();
    }
}

function checkVictory() {
    if (state.player.board.every(v => v !== 0)) {
        SoundManager.play('ultimate');
        showToast("ULTIMATE!", "#f1c40f");
        state.enemy.hp -= 30;
        spawnFloatingText("-30💥", "#f1c40f");
        state.player.board = new Array(10).fill(0);
        if (state.relics.includes('glove')) {
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
            spawnFloatingText("+5❤️", "#2ecc71");
        }
        renderBattle();
    }
    if (state.enemy.hp <= 0) { victory(); return true; }
    return false;
}

function victory() {
    state.battleActive = false;
    unlockAchievement('first_win');
    if (state.player.hp >= state.player.maxHp) {
        unlockAchievement('perfect_victory');
    }

    const isBossFight = state.enemy.name.includes("CHEFE:");
    
    if (isBossFight) {
        // Se venceu o Chefe do Mapa 3 (Dragão Supremo) -> Vitória Absoluta do Jogo!
        if (state.currentMap === 3) {
            unlockAchievement('dragon_slayer'); // Desbloqueia conquista lendária
            setTimeout(() => {
                showEndRunScreen(true);
            }, 1200);
        } else {
            // Venceu chefe do Mapa 1 ou 2 -> Avança para o Próximo Mapa (Novo Ato!)
            const nextMap = state.currentMap + 1;
            unlockMap('map' + nextMap); // Desbloqueia permanentemente o próximo mapa no meta-progresso!
            
            SoundManager.play('victory');
            setTimeout(() => {
                showActTransitionScreen(nextMap);
            }, 1000);
        }
    } else {
        SoundManager.play('victory');
        setTimeout(showRewards, 1000);
    }
}

function checkDefeat() {
    if (state.player.hp <= 0) {
        if (state.relics.includes('phoenix_feather') && !usedPhoenixFeather) {
            usedPhoenixFeather = true;
            state.player.hp = Math.floor(state.player.maxHp * 0.25);
            SoundManager.play('heal');
            showToast("🔥 PENA DE FÊNIX: Ressuscitado!", "#ff9f43");
            spawnFloatingText("🔥 RESSURREIÇÃO!", "#ff9f43");
            renderBattle();
            return false;
        }
        state.battleActive = false;
        setTimeout(() => {
            showEndRunScreen(false);
        }, 1200);
        return true;
    }
    return false;
}

function showRewards() {
    showScreen('reward');
    const container = document.getElementById('reward-container');
    container.innerHTML = '';

    const rewards = [
        ...getRandomFromPool('common', 1),
        ...getRandomFromPool('rare', 1),
        ...getRandomFromPool(Math.random() > 0.8 ? 'legendary' : 'rare', 1)
    ];

    rewards.forEach(card => {
        const el = document.createElement('div');
        el.className = `reward-card ${card.rarity}`;
        let label = card.type === 'heal' ? 'Cura' : (card.type === 'defend' ? 'Escudo' : 'Poder');
        el.innerHTML = `
            <div class="val">${card.value === 0 ? '★' : card.value}</div>
            <div class="cinzel" style="font-size: 0.9em;">${card.name}</div>
            <div class="effect">${card.effectText || `${label}: ${card.power}`}</div>
        `;
        applyCardTilt(el);
        el.onclick = () => {
            state.player.deck.push({ ...card, upgraded: false });
            state.gold += 25;
            spawnFloatingText("+25🟡", "#f1c40f");
            state.floor++;
            goToMap();
        };
        container.appendChild(el);
    });
}

function skipReward() {
    state.gold += 25;
    spawnFloatingText("+25🟡", "#f1c40f");
    state.floor++;
    goToMap();
}

function quitGame() {
    if (confirm("Tem certeza que deseja sair? O progresso salvo será mantido.")) {
        showScreen('start');
        location.reload();
    }
}

// --- ACHIEVEMENT UNLOCK CONTROLLER ---
function unlockAchievement(id) {
    loadMetaProgression();
    if (state.achievements.includes(id)) return;

    state.achievements.push(id);
    saveMetaProgression();
    SoundManager.play('buy'); // Som de moeda/recompensa
    
    const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
    if (ach) {
        showToast(`🏆 CONQUISTA DESBLOQUEADA: ${ach.name}!`, "#ffd700");
    }
}

// --- WORLD UNLOCK CONTROLLER ---
function unlockMap(mapId) {
    loadMetaProgression();
    if (state.unlockedMaps.includes(mapId)) return;
    
    state.unlockedMaps.push(mapId);
    saveMetaProgression();
    SoundManager.play('buy'); // Som festivo
    
    let mapName = "O Deserto dos Ossos";
    if (mapId === 'map3') mapName = "O Templo do Dragão";
    
    showToast(`🗺️ NOVO MUNDO DESBLOQUEADO: ${mapName}!`, "#ff9f43");
}

// --- ENTRY POINT ---
window.addEventListener('DOMContentLoaded', () => {
    SoundManager.init();
    loadMetaProgression(); // Sincroniza meta-progressão global permanente
    SoundManager.playBGM('sons/ambient_menu.wav');
    renderBattle();
    checkSave();
});
