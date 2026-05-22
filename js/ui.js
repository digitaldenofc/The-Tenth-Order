// --- UI & NAVIGATION MODULE ---

function showScreen(screenId) {
    SoundManager.play('click');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    setTimeout(() => {
        const screenEl = document.getElementById(screenId + '-screen');
        if (screenEl) screenEl.classList.add('active');
    }, 50);
    state.screen = screenId;

    // Troca música ambiente se necessário
    if (screenId === 'start') {
        SoundManager.playBGM('sons/ambient_menu.wav');
    } else if (screenId === 'battle') {
        SoundManager.playBGM('sons/ambient_battle.ogg');
    }
}

function spawnFloatingText(text, color, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.color = color;
    el.style.left = (x || (window.innerWidth / 2)) + 'px';
    el.style.top = (y || (window.innerHeight / 2)) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showToast(msg, color = '#e63946') {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = msg;
        t.style.background = color;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    }
}

function showBlessings() {
    showScreen('blessing');
    const container = document.getElementById('blessing-container');
    if (!container) return;
    container.innerHTML = '';

    const options = [
        {
            name: 'Saco de Ouro',
            effect: 'Ganhe 100 de Ouro',
            icon: '💰',
            action: () => {
                state.gold += 100;
                SoundManager.play('buy');
                finishBlessing();
            }
        },
        {
            name: 'Vitalidade',
            effect: '+30 Vida Máxima',
            icon: '🍎',
            action: () => {
                state.player.maxHp += 30;
                state.player.hp = state.player.maxHp;
                SoundManager.play('heal');
                finishBlessing();
            }
        },
        {
            name: 'Relíquia Inicial',
            effect: 'Receba uma Relíquia aleatória',
            icon: '🎁',
            action: () => {
                const rids = Object.keys(RELIC_DATA);
                const rid = rids[Math.floor(Math.random() * rids.length)];
                state.relics.push(rid);
                if (rid.startsWith('math_')) unlockAchievement('math_god');
                SoundManager.play('buy');
                finishBlessing();
            }
        }
    ];

    options.forEach(opt => {
        const el = document.createElement('div');
        el.className = 'reward-card relic';
        el.innerHTML = `<div class="val">${opt.icon}</div><div class="cinzel">${opt.name}</div><div class="effect">${opt.effect}</div>`;
        applyCardTilt(el);
        el.onclick = opt.action;
        container.appendChild(el);
    });
}

function finishBlessing() {
    generateMap();
    goToMap();
}

function generateMap() {
    state.mapNodes = [];
    const mapNum = state.currentMap || 1;
    const startFloor = (mapNum - 1) * 21 + 1;
    const endFloor = mapNum * 21;

    for (let i = startFloor; i <= endFloor; i++) {
        let type = 'battle';
        if (i === endFloor) type = 'boss';
        else if (i === startFloor + 4 || i === startFloor + 9 || i === startFloor + 14 || i === startFloor + 19) {
            type = 'shop';
        } else if (i === startFloor + 3 || i === startFloor + 8 || i === startFloor + 13 || i === startFloor + 18) {
            type = 'campfire';
        } else {
            // 20% de chance de ser um evento narrativo (?) em andares comuns
            if (Math.random() < 0.2) type = 'event';
        }
        state.mapNodes.push({ floor: i, type: type });
    }
}

function goToMap() {
    showScreen('map');
    saveGame();
    const container = document.getElementById('map-path');
    if (!container) return;
    container.innerHTML = '';
    state.mapNodes.forEach(node => {
        const el = document.createElement('div');
        el.className = 'map-node';
        if (node.floor < state.floor) el.classList.add('disabled');
        if (node.floor === state.floor) el.classList.add('active');

        let icon = '⚔️';
        if (node.type === 'boss') icon = '👑';
        if (node.type === 'shop') icon = '💰';
        if (node.type === 'campfire') icon = '🏕️';
        if (node.type === 'event') icon = '❓';

        el.innerText = icon;
        el.onclick = () => { if (node.floor === state.floor) startNode(node); };
        container.appendChild(el);
    });
}

function startNode(node) {
    if (node.type === 'battle' || node.type === 'boss') initBattle(node.type === 'boss');
    else if (node.type === 'shop') {
        generateShopItems(false); // Rotaciona a loja liberando os não trancados
        openShop();
    }
    else if (node.type === 'campfire') showScreen('campfire');
    else if (node.type === 'event') triggerMysteryEvent();
}

function triggerMysteryEvent() {
    const eventData = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    showEventModal(eventData);
}

function showEventModal(eventData) {
    SoundManager.play('click');
    const container = document.getElementById('event-modal-container');
    const title = document.getElementById('event-title');
    const image = document.getElementById('event-image');
    const text = document.getElementById('event-text');
    const choicesContainer = document.getElementById('event-choices');

    title.innerText = eventData.title;
    image.innerText = eventData.emoji || "🔮";
    text.innerText = eventData.text;
    choicesContainer.innerHTML = '';

    eventData.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.style.width = '100%';
        btn.innerText = c.text;
        btn.onclick = () => {
            container.style.display = 'none';
            c.action();
            state.floor++;
            goToMap();
        };
        choicesContainer.appendChild(btn);
    });

    container.style.display = 'flex';
}

// --- CAMPFIRE & SHOP ---

function campfireAction(type) {
    if (type === 'heal') {
        SoundManager.play('heal');
        const heal = Math.floor(state.player.maxHp * 0.8);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
        showToast(`Recuperou ${heal} HP!`, "#2ecc71");
        saveGame();
        state.floor++;
        setTimeout(goToMap, 1000);
    }
}

function openCampfireUpgrade() {
    const upgradeables = state.player.deck.filter(c => !c.upgraded);
    if (upgradeables.length === 0) {
        showToast("Todas as cartas já estão no máximo!");
        return;
    }

    document.getElementById('campfire-main').style.display = 'none';
    document.getElementById('campfire-upgrade-select').style.display = 'block';

    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';

    state.player.deck.forEach((card, index) => {
        if (card.upgraded) return;

        const el = document.createElement('div');
        el.className = `reward-card ${card.rarity}`;
        el.innerHTML = `
            <div class="val">${card.value === 0 ? '★' : card.value}</div>
            <div class="cinzel" style="font-size: 0.8em;">${card.name || card.value}</div>
            <div class="effect">Power: ${card.power} → ${card.power + (card.type === 'basic' ? 3 : 5)}</div>
        `;
        applyCardTilt(el);
        el.onclick = () => upgradeSelectedCard(index);
        list.appendChild(el);
    });
}

function upgradeSelectedCard(index) {
    SoundManager.play('buy'); // Reaproveitando som de upgrade/compra
    const card = state.player.deck[index];
    card.upgraded = true;
    card.power += (card.type === 'basic' ? 3 : 5);
    showToast(`${card.name || card.value} melhorada!`, "#f1c40f");
    state.floor++;
    goToMap();

    // Reset UI for next time
    document.getElementById('campfire-main').style.display = 'flex';
    document.getElementById('campfire-upgrade-select').style.display = 'none';
}

function cancelCampfireUpgrade() {
    document.getElementById('campfire-main').style.display = 'flex';
    document.getElementById('campfire-upgrade-select').style.display = 'none';
}

function generateShopItems(fresh = false) {
    const currentItems = state.shopItems || [];

    // Mantém apenas os itens trancados que NÃO foram comprados
    const lockedItems = fresh ? [] : currentItems.filter(item => item.locked && !item.purchased);

    const newItems = [...lockedItems];

    // Checa quais raridades e tipos de itens já estão presentes nas trancadas
    let hasCommon = newItems.some(item => item.type === 'card' && item.card.rarity === 'common');
    let hasRare = newItems.some(item => item.type === 'card' && item.card.rarity === 'rare');
    let hasLegendary = newItems.some(item => item.type === 'card' && item.card.rarity === 'legendary');
    let hasRelic = newItems.some(item => item.type === 'relic');

    if (!hasCommon) {
        const pool = getRandomFromPool('common', 1);
        if (pool && pool.length > 0) {
            newItems.push({
                uid: 'shop_c_' + Math.random(),
                type: 'card',
                card: pool[0],
                price: 25,
                locked: false,
                purchased: false
            });
        }
    }
    if (!hasRare) {
        const pool = getRandomFromPool('rare', 1);
        if (pool && pool.length > 0) {
            newItems.push({
                uid: 'shop_r_' + Math.random(),
                type: 'card',
                card: pool[0],
                price: 45,
                locked: false,
                purchased: false
            });
        }
    }
    if (!hasLegendary) {
        const pool = getRandomFromPool('legendary', 1);
        if (pool && pool.length > 0) {
            newItems.push({
                uid: 'shop_l_' + Math.random(),
                type: 'card',
                card: pool[0],
                price: 75,
                locked: false,
                purchased: false
            });
        }
    }
    if (!hasRelic) {
        const availableRelics = Object.keys(RELIC_DATA).filter(id => !state.relics.includes(id));
        if (availableRelics.length > 0) {
            const rid = availableRelics[Math.floor(Math.random() * availableRelics.length)];
            newItems.push({
                uid: 'shop_relic_' + Math.random(),
                type: 'relic',
                relicId: rid,
                price: 50 + (state.floor * 5),
                locked: false,
                purchased: false
            });
        }
    }

    // Serviço de remoção está sempre disponível fresco na prateleira
    newItems.push({
        uid: 'shop_srv_remove',
        type: 'service',
        price: 50,
        locked: false,
        purchased: false
    });

    state.shopItems = newItems;
}

function openShop() {
    showScreen('shop');

    // Se a prateleira da loja estiver nula, inicializa uma nova prateleira fresca
    if (!state.shopItems || state.shopItems.length === 0) {
        generateShopItems(true);
    }

    document.getElementById('shop-gold').innerText = state.gold;
    const container = document.getElementById('shop-container');
    container.innerHTML = '';

    // Calcula taxa de desconto do Negociante Astuto (reroll_shop)
    const discountLvl = state.skills.reroll_shop || 0;
    const discountRate = discountLvl > 0 ? SKILL_TREE.reroll_shop.values[discountLvl - 1] : 0;

    state.shopItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'reward-card';

        let price = Math.max(1, Math.floor(item.price * (1 - discountRate)));
        let isRelicOrService = item.type === 'relic' || item.type === 'service';
        let rarity = item.type === 'card' ? item.card.rarity : 'common';

        if (isRelicOrService) el.classList.add('relic');
        else el.classList.add(rarity);

        let title = '';
        let val = '';
        let effect = '';

        if (item.type === 'card') {
            const card = item.card;
            title = card.name || card.value;
            val = card.value === 0 ? '★' : card.value;
            let label = card.type === 'heal' ? 'Cura' : (card.type === 'defend' ? 'Escudo' : 'Poder');
            effect = card.effectText || `${label}: ${card.power}`;
        } else if (item.type === 'relic') {
            const rel = RELIC_DATA[item.relicId];
            title = rel.name;
            val = rel.icon;
            effect = rel.effect;
        } else if (item.type === 'service') {
            title = 'Remover Carta';
            val = '🗑️';
            effect = 'Remove uma carta do deck';
        }

        el.innerHTML = `
            <div class="val">${val}</div>
            <div class="cinzel" style="font-size: 0.8em;">${title}</div>
            <div class="effect">${effect}</div>
            <div class="price-tag">🟡 ${price}</div>
        `;

        // Se já foi comprado, exibe overlay transparente VENDIDO
        if (item.purchased) {
            el.classList.add('purchased');
            const soldOverlay = document.createElement('div');
            soldOverlay.className = 'sold-overlay cinzel';
            soldOverlay.innerText = 'VENDIDO';
            el.appendChild(soldOverlay);
        } else {
            // Lock Button: Toggles locked state. Exclude remove service
            if (item.type === 'card' || item.type === 'relic') {
                const lockBtn = document.createElement('button');
                lockBtn.className = `lock-btn ${item.locked ? 'locked' : ''}`;
                lockBtn.innerHTML = item.locked ? '🔒' : '🔓';
                lockBtn.title = item.locked ? 'Desbloquear da Próxima Loja' : 'Trancar na Próxima Loja';

                lockBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita comprar o item acidentalmente!
                    item.locked = !item.locked;
                    SoundManager.play('click');
                    saveGame();
                    openShop();
                    showToast(item.locked ? "Item Trancado para a próxima!" : "Item Destrancado!", "#ffd700");
                };

                el.appendChild(lockBtn);
            }

            applyCardTilt(el);
            el.onclick = () => {
                if (state.gold >= price) {
                    if (item.type === 'service') {
                        openRemoveService(price);
                        return;
                    }

                    SoundManager.play('buy');
                    state.gold -= price;
                    item.purchased = true; // Marca como comprado no vetor de prateleira

                    if (item.type === 'relic') {
                        state.relics.push(item.relicId);
                        if (item.relicId.startsWith('math_')) unlockAchievement('math_god');
                    } else if (item.type === 'card') {
                        state.player.deck.push({ ...item.card });
                    }

                    saveGame();
                    openShop();
                    showToast("Comprado!");
                } else {
                    showToast("Ouro insuficiente!");
                }
            };
        }

        container.appendChild(el);
    });
}

function leaveShop() {
    state.floor++;
    goToMap();
}

function openRemoveService(price = 50) {
    // Reusing campfire upgrade UI for removal
    document.getElementById('campfire-screen').classList.add('active'); // Layering
    document.getElementById('campfire-main').style.display = 'none';
    document.getElementById('campfire-upgrade-select').style.display = 'block';
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '<p style="grid-column: span 3; text-align:center;">Escolha uma carta para REMOVER:</p>';

    state.player.deck.forEach((card, index) => {
        const el = document.createElement('div');
        el.className = `reward-card ${card.rarity}`;
        el.innerHTML = `<div class="val">${card.value}</div><div class="cinzel">${card.name || card.value}</div>`;
        applyCardTilt(el);
        el.onclick = () => {
            SoundManager.play('click');
            state.player.deck.splice(index, 1);
            state.gold -= price;
            // Marca o serviço como comprado para que suma da loja nesta visita
            const serviceItem = state.shopItems.find(item => item.type === 'service');
            if (serviceItem) {
                serviceItem.purchased = true;
            }
            showToast("Carta removida!");
            cancelCampfireUpgrade();
            showScreen('shop');
            openShop();
        };
        list.appendChild(el);
    });
}

// --- UTILITY: 3D CARD TILT EFFECT ---
function applyCardTilt(el) {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        const rotateY = ((x - xc) / xc) * 12; // Max 12 deg tilt
        const rotateX = -((y - yc) / yc) * 12;
        el.style.transform = `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.06)`;
    });
    el.addEventListener('mouseleave', () => {
        el.style.transform = '';
    });
}

// --- PERSISTENT SYSTEMS SCREEN OPENERS ---

function openSkillTree() {
    loadMetaProgression(); // Sincroniza do localStorage
    showScreen('skills');
    renderSkillTree();
}

function renderSkillTree() {
    document.getElementById('star-dust-count').innerText = state.starDust;
    const container = document.getElementById('skills-container');
    container.innerHTML = '';

    Object.keys(SKILL_TREE).forEach(key => {
        const skill = SKILL_TREE[key];
        const currentLvl = state.skills[key] || 0;
        const isMax = currentLvl >= skill.maxLevel;
        const cost = isMax ? 0 : skill.costs[currentLvl];

        const card = document.createElement('div');
        card.className = 'skill-card';

        // Desenha os dots indicadores de nível
        let dotsHtml = '<div class="level-dots">';
        for (let i = 0; i < skill.maxLevel; i++) {
            dotsHtml += `<div class="level-dot ${i < currentLvl ? 'active' : ''}"></div>`;
        }
        dotsHtml += '</div>';

        card.innerHTML = `
            <h3 class="cinzel" style="color: var(--primary);">${skill.name}</h3>
            <div class="desc">${skill.description}</div>
            ${dotsHtml}
            ${isMax ? '<div class="dust-cost" style="background: rgba(46, 204, 113, 0.12); color: #2ecc71; border-color: rgba(46, 204, 113, 0.25);">✓ MÁXIMO</div>' : `<div class="dust-cost">🌟 ${cost} Poeira</div>`}
            <button class="menu-btn" style="width: 100%; margin-top: 5px; padding: 8px 12px; font-size: 0.8em;" ${isMax || state.starDust < cost ? 'disabled' : ''} onclick="buySkill('${key}')">
                ${isMax ? 'MÁXIMO' : 'MELHORAR'}
            </button>
        `;
        applyCardTilt(card);
        container.appendChild(card);
    });
}

function buySkill(key) {
    const skill = SKILL_TREE[key];
    const currentLvl = state.skills[key] || 0;
    if (currentLvl >= skill.maxLevel) return;

    const cost = skill.costs[currentLvl];
    if (state.starDust >= cost) {
        state.starDust -= cost;
        state.skills[key] = currentLvl + 1;

        // Se maximizou a habilidade, desbloqueia conquista de Maestria Estelar
        if (state.skills[key] === skill.maxLevel) {
            unlockAchievement('max_skills');
        }

        SoundManager.play('buy');
        saveMetaProgression();
        renderSkillTree();
        showToast(`${skill.name} Melhorado!`, "#2ecc71");
    } else {
        showToast("Poeira Estelar insuficiente!");
    }
}

function openAchievements() {
    loadMetaProgression(); // Sincroniza do localStorage
    showScreen('achievements');
    renderAchievements();
}

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';

    ACHIEVEMENTS_LIST.forEach(ach => {
        const unlocked = state.achievements.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;

        card.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-details">
                <h4 class="achievement-title">${ach.name}</h4>
                <span class="achievement-desc">${ach.desc}</span>
            </div>
        `;
        applyCardTilt(card);
        container.appendChild(card);
    });
}

function showEndRunScreen(victory = false) {
    // Toca áudio correspondente
    if (victory) {
        SoundManager.play('victory');
    } else {
        SoundManager.play('defeat');
    }

    // Calcula Poeira Estelar obtida
    let dustEarned = (state.floor * 2) + (victory ? 60 : 0);
    const starDustLvl = state.skills.star_dust_multiplier || 0;
    const starDustBonus = starDustLvl > 0 ? SKILL_TREE.star_dust_multiplier.values[starDustLvl - 1] : 1.0;
    dustEarned = Math.floor(dustEarned * starDustBonus);

    // Atualiza estado global e salva
    loadMetaProgression();
    state.starDust += dustEarned;
    saveMetaProgression();

    // Rastreia Conquistas
    if (state.floor >= 10) unlockAchievement('floor_10');
    if (victory) unlockAchievement('dragon_slayer');
    if (state.gold >= 300) unlockAchievement('rich_run');
    if (state.relics.length >= 6) unlockAchievement('relic_collector');

    // Remove o progresso da run salva (morte permanente da run, mas mantendo a meta-progressão)
    localStorage.removeItem('jogo1a10_save');
    checkSave();

    // Renderiza dados na tela
    document.getElementById('run-result-title').innerText = victory ? "Vitória Lendária!" : "Jornada Encerrada";
    document.getElementById('run-result-title').style.color = victory ? "#ffd700" : "#e63946";
    document.getElementById('run-result-floor').innerText = `Andar Alcançado: ${state.floor}`;
    document.getElementById('run-result-dust').innerText = `🌟 Poeira Estelar Coletada: +${dustEarned}`;

    showScreen('gameover');
}

// === MAP SELECTOR & TRANSITIONS ===

function openMapSelector() {
    showScreen('map-selector');
    loadMetaProgression(); // Sincroniza unlocks de mapas
    
    const container = document.getElementById('map-cards-container');
    if (!container) return;
    container.innerHTML = '';

    const maps = [
        {
            id: 'map1',
            num: 1,
            name: "Mundo 1: A Floresta Sombria",
            desc: "Uma floresta ancestral tomada por monstros básicos. Perfeito para iniciar.",
            floors: "Andares 1 a 21",
            boss: "👑 Chefe: Guardião da Floresta",
            icon: "🌲",
            bonus: "Draft Inicial: Nenhum (Início comum)",
            bg: "linear-gradient(135deg, rgba(46, 125, 50, 0.15) 0%, rgba(27, 94, 32, 0.25) 100%)"
        },
        {
            id: 'map2',
            num: 2,
            name: "Mundo 2: O Deserto dos Ossos",
            desc: "Ruínas tomadas pela areia e por feras implacáveis. Inimigos ganham +15 de Vida.",
            floors: "Andares 22 a 42",
            boss: "👑 Chefe: Rei Goblin",
            icon: "🏜️",
            bonus: "Draft Inicial: +150 Ouro, +2 Relíquias e +2 Cards Raras!",
            bg: "linear-gradient(135deg, rgba(230, 81, 0, 0.15) 0%, rgba(191, 54, 12, 0.25) 100%)"
        },
        {
            id: 'map3',
            num: 3,
            name: "Mundo 3: O Templo do Dragão",
            desc: "O covil ardente do Dragão Supremo. Inimigos ganham +35 de Vida.",
            floors: "Andares 43 a 63",
            boss: "👑 Chefe: Dragão Supremo",
            icon: "🌋",
            bonus: "Draft Inicial: +300 Ouro, +4 Relíquias e +4 Cards Lendárias!",
            bg: "linear-gradient(135deg, rgba(183, 28, 28, 0.15) 0%, rgba(74, 20, 140, 0.25) 100%)"
        }
    ];

    maps.forEach(m => {
        const isUnlocked = state.unlockedMaps.includes(m.id);
        const card = document.createElement('div');
        card.className = `glass map-selector-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.style.background = m.bg;
        
        if (isUnlocked) {
            card.onclick = () => {
                SoundManager.play('click');
                startNewRun(m.num);
            };
            
            card.innerHTML = `
                <div class="map-icon">${m.icon}</div>
                <h3 class="cinzel" style="margin: 10px 0; color: var(--primary); font-size: 1.15em;">${m.name}</h3>
                <div class="map-floors">${m.floors}</div>
                <div class="map-boss">${m.boss}</div>
                <p style="font-size: 0.8em; color: var(--text-muted); margin: 15px 0 10px 0; line-height: 1.4;">${m.desc}</p>
                <div class="map-bonus" style="font-size: 0.8em; color: #ffd700; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; font-style: italic;">${m.bonus}</div>
            `;
        } else {
            card.innerHTML = `
                <div class="map-icon" style="filter: grayscale(1); opacity: 0.3;">🔒</div>
                <h3 class="cinzel" style="margin: 10px 0; color: var(--text-muted); font-size: 1.15em;">${m.name}</h3>
                <div class="map-floors" style="color: var(--text-muted);">${m.floors}</div>
                <div class="map-locked-tag" style="margin-top: 15px; font-weight: 700; color: #e63946; font-size: 0.9em; letter-spacing: 1px;">TRANCADO</div>
                <p style="font-size: 0.8em; color: var(--text-muted); margin: 10px 0; line-height: 1.4;">Derrote o chefe anterior para libertar este portal.</p>
            `;
        }

        applyCardTilt(card);
        container.appendChild(card);
    });
}

let pendingActRelic = '';

function showActTransitionScreen(nextMap) {
    showScreen('act-transition');
    
    const titleEl = document.getElementById('next-map-title');
    if (nextMap === 2) {
        titleEl.innerText = "Mundo 2: O Deserto dos Ossos";
    } else if (nextMap === 3) {
        titleEl.innerText = "Mundo 3: O Templo do Dragão";
    }

    // Cura completa de HP
    state.player.hp = state.player.maxHp;

    // Sorteia uma relíquia divina de recompensa
    const availableRelics = Object.keys(RELIC_DATA).filter(id => !state.relics.includes(id));
    if (availableRelics.length > 0) {
        const rid = availableRelics[Math.floor(Math.random() * availableRelics.length)];
        pendingActRelic = rid;
        document.getElementById('act-reward-show').innerText = RELIC_DATA[rid].icon;
        document.getElementById('act-reward-name').innerText = `${RELIC_DATA[rid].name} (${RELIC_DATA[rid].effect})`;
    } else {
        pendingActRelic = '';
        document.getElementById('act-reward-show').innerText = "✨";
        document.getElementById('act-reward-name').innerText = "Bênção Rúnica Completa (+50 Ouro)";
        state.gold += 50;
    }
    
    state.nextMapTarget = nextMap;
    saveGame();
}

function proceedToNextAct() {
    if (pendingActRelic) {
        state.relics.push(pendingActRelic);
    }
    
    state.currentMap = state.nextMapTarget;
    state.floor = (state.currentMap - 1) * 21 + 1;
    state.shopItems = null; // Zera a loja para o novo mundo
    
    generateMap();
    goToMap();
    showToast(`Bem-vindo ao Mundo ${state.currentMap}!`, "#3498db");
}

