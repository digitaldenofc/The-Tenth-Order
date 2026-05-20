// --- SOUND MANAGER ---

const SoundManager = {
    volume: 0.8,
    bgm: null,
    sounds: {
        click: 'sons/click.mp3',
        draw: 'sons/draw.mp3',
        attack: 'sons/attack.mp3',
        defend: 'sons/defend.mp3',
        heal: 'sons/heal.wav',
        ultimate: 'sons/ultimate.wav',
        buy: 'sons/buy.mp3',
        victory: 'sons/victory.wav', // Corrigido de victory.mp3 para victory.wav
        defeat: 'sons/defeat.wav',
        coin: 'sons/coin.wav'
    },
    
    init() {
        // Configura o volume inicial pelo slider da UI
        const slider = document.getElementById('volume-slider');
        if (slider) this.volume = slider.value / 100;
    },

    setVolume(val) {
        this.volume = val / 100;
        if (this.bgm) {
            this.bgm.volume = this.volume * 0.5; // Música de fundo levemente mais baixa
        }
    },

    play(soundName) {
        if (!this.sounds[soundName]) return;
        try {
            const audio = new Audio(this.sounds[soundName]);
            audio.volume = this.volume;
            audio.play().catch(e => console.log("Áudio bloqueado pelo navegador até interação."));
        } catch(e) {
            console.error("Erro ao reproduzir som:", e);
        }
    },

    playBGM(url) {
        if (this.bgm) {
            this.bgm.pause();
        }
        try {
            this.bgm = new Audio(url);
            this.bgm.loop = true;
            this.bgm.volume = this.volume * 0.5;
            this.bgm.play().catch(e => console.log("BGM aguardando clique do usuário."));
        } catch(e) {
            console.error("Erro na BGM:", e);
        }
    }
};
