import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { OBJLoader } from 'three/addons/OBJLoader.js';
import { MTLLoader } from 'three/addons/MTLLoader.js';

class CharacterViewer {
    constructor(containerId, isPlayer = false) {
        this.containerId = containerId;
        this.isPlayer = isPlayer;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.activeModel = null;
        this.activeGroup = null;
        this.isInitialized = false;

        this.clock = new THREE.Clock();
        this.pulseTime = 0;
        this.isShaking = false;
        this.shakeEndTime = 0;
        this.originalCameraPos = new THREE.Vector3(0, 1.8, 4.0);

        this.isAttacking = false;
        this.attackStartTime = 0;
        this.ATTACK_DURATION = 0.5;

        this.isDying = false;
        this.deathStartTime = 0;
        this.DEATH_DURATION = 0.8;

        this.flashLight = null;
        this.flashEndTime = 0;

        this.animate = this.animate.bind(this);
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '';

        this.scene = new THREE.Scene();

        const width = container.clientWidth || 250;
        const height = container.clientHeight || 400;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
        this.camera.position.copy(this.originalCameraPos);
        this.camera.lookAt(0, 0.9, 0);

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
        dirLight.position.set(this.isPlayer ? -3 : 3, 6, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.002;
        this.scene.add(dirLight);

        const backLight = new THREE.DirectionalLight(0x74b9ff, 0.6);
        backLight.position.set(this.isPlayer ? 3 : -3, 2, -4);
        this.scene.add(backLight);

        this.flashLight = new THREE.PointLight(0xff0000, 0, 8);
        this.flashLight.position.set(0, 1.2, 1.5);
        this.scene.add(this.flashLight);

        this.activeGroup = new THREE.Group();
        this.scene.add(this.activeGroup);

        if (this.isPlayer) {
            this.activeGroup.rotation.y = Math.PI / 6; // slightly turned right
        } else {
            this.activeGroup.rotation.y = -Math.PI / 6; // slightly turned left
        }

        this.isInitialized = true;
        this.clock.getDelta();

        this.animate();

        const resizeObserver = new ResizeObserver(() => {
            if (!container.clientWidth || !container.clientHeight) return;
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
        resizeObserver.observe(container);
    }

    loadModel(modelName) {
        if (!this.isInitialized) this.init();

        this.cleanupActiveModel();

        this.isShaking = false;
        this.isAttacking = false;
        this.isDying = false;
        this.flashLight.intensity = 0;
        this.camera.position.copy(this.originalCameraPos);
        this.activeGroup.position.set(0, 0, 0);
        this.activeGroup.scale.set(1, 1, 1);
        this.activeGroup.userData.baseScaleX = 1.0;
        this.activeGroup.userData.baseScaleY = 1.0;
        this.activeGroup.userData.baseScaleZ = 1.0;
        this.activeGroup.rotation.set(0, this.isPlayer ? Math.PI / 6 : -Math.PI / 6, 0);

        const loader = new GLTFLoader();
        const cleanName = modelName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
        const glbUrl = `models/${cleanName}.glb`;

        loader.load(
            glbUrl,
            (gltf) => {
                this.activeModel = gltf.scene;

                const box = new THREE.Box3().setFromObject(this.activeModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                this.activeModel.position.set(-center.x, -box.min.y, -center.z);

                const maxDim = Math.max(size.x, size.y, size.z);
                let scaleFactor = 2.0 / maxDim; // Adjusted scale1
                if (!this.isPlayer) {
                    scaleFactor *= 0.7; // Reduz o tamanho do inimigo em 30%
                }
                this.activeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
                this.activeGroup.userData.baseScaleX = scaleFactor;
                this.activeGroup.userData.baseScaleY = scaleFactor;
                this.activeGroup.userData.baseScaleZ = scaleFactor;

                this.activeModel.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material && node.material.map) {
                            node.material.map.anisotropy = 4;
                        }
                    }
                });

                this.activeGroup.add(this.activeModel);
            },
            undefined,
            (err) => {
                const fallbackToSpriteAndProcedural = () => {
                    const textureLoader = new THREE.TextureLoader();
                    const spriteUrl = encodeURI(`imagens/${modelName}.png`);
                    textureLoader.load(
                        spriteUrl,
                        (texture) => {
                            const aspect = texture.image.width / texture.image.height;
                            const height = 1.50;
                            const width = height * aspect;

                            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, color: 0xffffff });
                            const sprite = new THREE.Sprite(spriteMaterial);
                            sprite.scale.set(width, height, 1);
                            sprite.position.set(0, height / 2 - 0.2, 0);

                            this.activeModel = new THREE.Group();
                            this.activeModel.add(sprite);

                            this.activeGroup.add(this.activeModel);
                            const scaleFactor = this.isPlayer ? 1.0 : 0.7;
                            this.activeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
                            this.activeGroup.userData.baseScaleX = scaleFactor;
                            this.activeGroup.userData.baseScaleY = scaleFactor;
                            this.activeGroup.userData.baseScaleZ = scaleFactor;
                        },
                        undefined,
                        (err2) => {
                            console.warn("Falha ao carregar sprite 2D:", spriteUrl, err2);
                            this.activeModel = createProceduralModel(modelName);
                            this.activeGroup.add(this.activeModel);
                            const procScale = this.isPlayer ? 0.9 : 0.65;
                            this.activeGroup.scale.set(procScale, procScale, procScale);
                            this.activeGroup.userData.baseScaleX = procScale;
                            this.activeGroup.userData.baseScaleY = procScale;
                            this.activeGroup.userData.baseScaleZ = procScale;
                        }
                    );
                };

                const setupOBJGeometry = (obj) => {
                    this.activeModel = obj;

                    const box = new THREE.Box3().setFromObject(this.activeModel);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    this.activeModel.position.set(-center.x, -box.min.y, -center.z);

                    const maxDim = Math.max(size.x, size.y, size.z);
                    let scaleFactor = 2.0 / maxDim;
                    if (!this.isPlayer) {
                        scaleFactor *= 0.7; // Reduz o tamanho do inimigo em 30%
                    }
                    this.activeGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    this.activeGroup.userData.baseScaleX = scaleFactor;
                    this.activeGroup.userData.baseScaleY = scaleFactor;
                    this.activeGroup.userData.baseScaleZ = scaleFactor;
                };

                // Tenta carregar o arquivo MTL de materiais primeiro
                const mtlLoader = new MTLLoader();
                const mtlUrl = `models/${cleanName}.mtl`;

                mtlLoader.load(
                    mtlUrl,
                    (materials) => {
                        materials.preload();
                        const objLoader = new OBJLoader();
                        objLoader.setMaterials(materials);
                        objLoader.load(
                            `models/${cleanName}.obj`,
                            (obj) => {
                                setupOBJGeometry(obj);
                                this.activeModel.traverse((node) => {
                                    if (node.isMesh) {
                                        node.castShadow = true;
                                        node.receiveShadow = true;
                                        if (node.material) {
                                            if (Array.isArray(node.material)) {
                                                node.material.forEach((m) => {
                                                    if (m.map) m.map.anisotropy = 4;
                                                });
                                            } else {
                                                if (node.material.map) node.material.map.anisotropy = 4;
                                            }
                                        }
                                    }
                                });
                                this.activeGroup.add(this.activeModel);
                            },
                            undefined,
                            (errObj) => {
                                fallbackToSpriteAndProcedural();
                            }
                        );
                    },
                    undefined,
                    (errMtl) => {
                        // Se não houver arquivo MTL, carrega o OBJ puro e tenta aplicar uma textura PNG direta com o mesmo nome
                        const objLoader = new OBJLoader();
                        const objUrl = `models/${cleanName}.obj`;

                        objLoader.load(
                            objUrl,
                            (obj) => {
                                const textureLoader = new THREE.TextureLoader();
                                const textureUrl = `models/${cleanName}.png`;

                                textureLoader.load(
                                    textureUrl,
                                    (texture) => {
                                        texture.anisotropy = 4;
                                        texture.magFilter = THREE.NearestFilter;
                                        texture.minFilter = THREE.NearestMipmapLinearFilter;

                                        setupOBJGeometry(obj);
                                        this.activeModel.traverse((node) => {
                                            if (node.isMesh) {
                                                node.castShadow = true;
                                                node.receiveShadow = true;
                                                node.material = new THREE.MeshStandardMaterial({
                                                    map: texture,
                                                    roughness: 0.8,
                                                    metalness: 0.1
                                                });
                                            }
                                        });
                                        this.activeGroup.add(this.activeModel);
                                    },
                                    undefined,
                                    (errTex) => {
                                        // Sem textura PNG direta, usa material com cores sólidas ou cinza padrão
                                        setupOBJGeometry(obj);
                                        this.activeModel.traverse((node) => {
                                            if (node.isMesh) {
                                                node.castShadow = true;
                                                node.receiveShadow = true;
                                                if (!node.material || node.material.type === 'MeshPhongMaterial' || node.material.type === 'MeshBasicMaterial') {
                                                    node.material = new THREE.MeshStandardMaterial({
                                                        color: node.material ? node.material.color : 0x7f8c8d,
                                                        roughness: 0.8,
                                                        metalness: 0.2
                                                    });
                                                }
                                            }
                                        });
                                        this.activeGroup.add(this.activeModel);
                                    }
                                );
                            },
                            undefined,
                            (errObjDirect) => {
                                fallbackToSpriteAndProcedural();
                            }
                        );
                    }
                );
            }
        );
    }

    cleanupActiveModel() {
        if (this.activeModel) {
            this.activeGroup.remove(this.activeModel);
            this.activeModel.traverse((node) => {
                if (node.isMesh || node.isSprite) {
                    node.geometry.dispose();
                    if (Array.isArray(node.material)) {
                        node.material.forEach((m) => m.dispose());
                    } else {
                        node.material.dispose();
                    }
                }
            });
            this.activeModel = null;
        }
    }

    triggerDamage() {
        if (!this.isInitialized) return;
        this.isShaking = true;
        this.shakeEndTime = this.clock.getElapsedTime() + 0.45;

        this.flashEndTime = this.clock.getElapsedTime() + 0.35;
        this.flashLight.intensity = 5.0;

        if (this.activeModel) {
            this.activeModel.traverse((node) => {
                if (node.isMesh && node.material && node.material.emissive) {
                    node.material.originalEmissive = node.material.emissive.clone();
                    node.material.emissive.setHex(0x550000);
                } else if (node.isSprite && node.material) {
                    node.material.originalColor = node.material.color.clone();
                    node.material.color.setHex(0xff5555);
                }
            });
        }
    }

    triggerAttack() {
        if (!this.isInitialized) return;
        this.isAttacking = true;
        this.attackStartTime = this.clock.getElapsedTime();
    }

    triggerDeath() {
        if (!this.isInitialized) return;
        this.isDying = true;
        this.deathStartTime = this.clock.getElapsedTime();
    }

    animate() {
        requestAnimationFrame(this.animate);

        const time = this.clock.getElapsedTime();

        if (this.activeModel) {
            let bobbing = 0;
            if (!this.isDying) {
                bobbing = Math.sin(time * 3) * 0.035;
                const baseY = this.activeGroup.userData.baseScaleY || 1.0;
                this.activeGroup.scale.y = baseY * (1.0 + bobbing * 0.5);
            }

            // Garante que a câmera fique estável na sua posição original
            this.camera.position.copy(this.originalCameraPos);

            // Animação de tremor/vibração física do próprio modelo
            if (this.isShaking) {
                if (time < this.shakeEndTime) {
                    const elapsed = this.shakeEndTime - time;
                    const frequency = 70; // Frequência rápida para vibração intensa
                    const intensity = 0.20 * (elapsed / 0.45); // A intensidade diminui até o final do tremor
                    
                    // Vibra apenas no eixo X para evitar que o modelo se mova para baixo
                    this.activeGroup.position.x = Math.sin(time * frequency) * intensity;
                    this.activeGroup.position.y = bobbing;
                } else {
                    this.isShaking = false;
                    this.activeGroup.position.x = 0;
                    this.activeGroup.position.y = bobbing;
                }
            } else {
                this.activeGroup.position.x = 0;
                if (!this.isDying) {
                    this.activeGroup.position.y = bobbing;
                }
            }

            if (this.flashLight.intensity > 0) {
                if (time < this.flashEndTime) {
                    this.flashLight.intensity = 5.0 * ((this.flashEndTime - time) / 0.35);
                } else {
                    this.flashLight.intensity = 0;
                    this.activeModel.traverse((node) => {
                        if (node.isMesh && node.material && node.material.originalEmissive !== undefined) {
                            node.material.emissive.copy(node.material.originalEmissive);
                        } else if (node.isSprite && node.material && node.material.originalColor !== undefined) {
                            node.material.color.copy(node.material.originalColor);
                        }
                    });
                }
            }

            if (this.isAttacking) {
                const elapsed = time - this.attackStartTime;
                const baseZ = this.activeGroup.userData.baseScaleZ || 1.0;
                if (elapsed < this.ATTACK_DURATION) {
                    const progress = elapsed / this.ATTACK_DURATION;
                    const lungeZ = Math.sin(progress * Math.PI) * 0.9;
                    this.activeGroup.position.z = lungeZ;
                    this.activeGroup.scale.z = baseZ * (1.0 + lungeZ * 0.15);
                } else {
                    this.isAttacking = false;
                    this.activeGroup.position.z = 0;
                    this.activeGroup.scale.z = baseZ;
                }
            }

            if (this.isDying) {
                const elapsed = time - this.deathStartTime;
                if (elapsed < this.DEATH_DURATION) {
                    const progress = elapsed / this.DEATH_DURATION;
                    const baseX = this.activeGroup.userData.baseScaleX || 1.0;
                    const baseY = this.activeGroup.userData.baseScaleY || 1.0;
                    const baseZ = this.activeGroup.userData.baseScaleZ || 1.0;
                    const scale = 1.0 - progress;
                    this.activeGroup.scale.set(baseX * scale, baseY * scale, baseZ * scale);
                    this.activeGroup.rotation.x = progress * Math.PI * 0.5;
                    this.activeGroup.position.y = -progress * 0.8;

                    // Desaparecimento gradual (fade out) ajustando opacidade dos materiais
                    this.activeModel.traverse((node) => {
                        if (node.isMesh || node.isSprite) {
                            if (node.material) {
                                if (Array.isArray(node.material)) {
                                    node.material.forEach((m) => {
                                        m.transparent = true;
                                        m.opacity = 1.0 - progress;
                                    });
                                } else {
                                    node.material.transparent = true;
                                    node.material.opacity = 1.0 - progress;
                                }
                            }
                        }
                    });
                } else {
                    this.isDying = false;
                    this.cleanupActiveModel();
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

let enemyViewer = null;
let playerViewer = null;

export function init3DScene() {
    if (!enemyViewer) enemyViewer = new CharacterViewer('enemy-3d-container', false);
    if (!playerViewer) playerViewer = new CharacterViewer('player-3d-container', true);

    // Always load the player model when initialized
    playerViewer.loadModel('guerreiro');
}

export function loadEnemyModel(modelName) {
    if (!enemyViewer) init3DScene();
    enemyViewer.loadModel(modelName);
}

export function triggerDamageAnimation() { if (enemyViewer) enemyViewer.triggerDamage(); }
export function triggerAttackAnimation() { if (enemyViewer) enemyViewer.triggerAttack(); }
export function triggerDeathAnimation() { if (enemyViewer) enemyViewer.triggerDeath(); }

export function triggerPlayerDamageAnimation() { if (playerViewer) playerViewer.triggerDamage(); }
export function triggerPlayerAttackAnimation() { if (playerViewer) playerViewer.triggerAttack(); }
export function triggerPlayerDeathAnimation() { if (playerViewer) playerViewer.triggerDeath(); }

function createProceduralModel(modelName) {
    const group = new THREE.Group();
    const cleanName = modelName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Palette of common blocky materials
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.8 });
    const darkGreenMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.8 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.8 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8 });
    const darkRedMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 });
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });
    const darkGreyMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.8 });
    const brownMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
    const darkBrownMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.8, roughness: 0.2 });
    const purpleMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.8 });

    if (cleanName.includes('goblin')) {
        // Goblin: green skin, long ears, leather vest
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), greenMat);
        head.position.y = 1.25;
        group.add(head);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.22), greenMat);
        nose.position.set(0, 1.22, 0.27);
        group.add(nose);

        const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.12), greenMat);
        leftEar.position.set(-0.33, 1.28, 0);
        leftEar.rotation.z = -0.25;
        const rightEar = leftEar.clone();
        rightEar.position.x = 0.33;
        rightEar.rotation.z = 0.25;
        group.add(leftEar);
        group.add(rightEar);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.42), brownMat);
        body.position.y = 0.65;
        group.add(body);

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.2), darkBrownMat);
        leftLeg.position.set(-0.16, 0.175, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.16;
        group.add(leftLeg);
        group.add(rightLeg);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), greenMat);
        leftArm.position.set(-0.36, 0.75, 0);
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.36;
        group.add(leftArm);
        group.add(rightArm);

        if (cleanName.includes('rei')) {
            const crown = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), goldMat);
            crown.position.y = 1.55;
            group.add(crown);
        }
    } else if (cleanName.includes('zumbi')) {
        const zombieGreen = new THREE.MeshStandardMaterial({ color: 0x55efc4, roughness: 0.8 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), zombieGreen);
        head.position.y = 1.35;
        group.add(head);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), blueMat);
        body.position.y = 0.65;
        group.add(body);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.65), zombieGreen);
        leftArm.position.set(-0.4, 0.85, 0.28);
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.4;
        group.add(leftArm);
        group.add(rightArm);

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), darkGreyMat);
        leftLeg.position.set(-0.18, 0.2, 0);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.18;
        group.add(leftLeg);
        group.add(rightLeg);
    } else if (cleanName.includes('lobisomem')) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), darkBrownMat);
        head.position.set(0, 1.3, 0.08);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.35), darkBrownMat);
        snout.position.set(0, 1.2, 0.35);
        group.add(head);
        group.add(snout);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.6), brownMat);
        body.position.y = 0.65;
        group.add(body);

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), darkBrownMat);
        leftArm.position.set(-0.48, 0.75, 0.08);
        leftArm.rotation.x = 0.25;
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.48;
        group.add(leftArm);
        group.add(rightArm);

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.25), darkBrownMat);
        leftLeg.position.set(-0.22, 0.225, -0.08);
        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.22;
        group.add(leftLeg);
        group.add(rightLeg);
    } else if (cleanName.includes('slime')) {
        const slimeOuterMat = new THREE.MeshStandardMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.6,
            roughness: 0.15,
            metalness: 0.1
        });
        const slimeInnerMat = new THREE.MeshStandardMaterial({
            color: 0x27ae60,
            roughness: 0.5
        });

        const outer = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), slimeOuterMat);
        outer.position.y = 0.5;
        group.add(outer);

        const inner = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), slimeInnerMat);
        inner.position.y = 0.5;
        group.add(inner);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), blackMat);
        eyeL.position.set(-0.2, 0.65, 0.48);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.2;
        group.add(eyeL);
        group.add(eyeR);
    } else if (cleanName.includes('dragao') || cleanName.includes('chefe')) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 1.0), redMat);
        body.position.y = 0.7;
        group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.65), redMat);
        head.position.set(0, 1.25, 0.35);
        group.add(head);

        const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), yellowMat);
        hornL.position.set(-0.16, 1.5, 0.1);
        hornL.rotation.x = -0.4;
        const hornR = hornL.clone();
        hornR.position.x = 0.16;
        group.add(hornL);
        group.add(hornR);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.8), redMat);
        tail.position.set(0, 0.5, -0.85);
        tail.rotation.x = -0.15;
        group.add(tail);

        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.55), blackMat);
        wingL.position.set(-0.8, 0.85, 0);
        wingL.rotation.z = 0.35;
        const wingR = wingL.clone();
        wingR.position.x = 0.8;
        wingR.rotation.z = -0.35;
        group.add(wingL);
        group.add(wingR);

        const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.2), darkRedMat);
        legFL.position.set(-0.32, 0.175, 0.32);
        const legFR = legFL.clone();
        legFR.position.x = 0.32;
        const legBL = legFL.clone();
        legBL.position.z = -0.32;
        const legBR = legFR.clone();
        legBR.position.z = -0.32;
        group.add(legFL);
        group.add(legFR);
        group.add(legBL);
        group.add(legBR);
    } else if (cleanName.includes('esqueleto')) {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.95 });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), boneMat);
        head.position.y = 1.3;
        group.add(head);

        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), boneMat);
        spine.position.y = 0.85;
        group.add(spine);

        const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.24), boneMat);
        rib1.position.y = 1.05;
        const rib2 = rib1.clone();
        rib2.position.y = 0.88;
        const rib3 = rib1.clone();
        rib3.position.y = 0.7;
        group.add(rib1);
        group.add(rib2);
        group.add(rib3);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), boneMat);
        armL.position.set(-0.3, 0.85, 0);
        const armR = armL.clone();
        armR.position.x = 0.3;
        group.add(armL);
        group.add(armR);

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), boneMat);
        legL.position.set(-0.16, 0.25, 0);
        const legR = legL.clone();
        legR.position.x = 0.16;
        group.add(legL);
        group.add(legR);
    } else if (cleanName.includes('aranha')) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), darkGreyMat);
        body.position.y = 0.35;
        group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, 0.35), blackMat);
        head.position.set(0, 0.3, 0.48);
        group.add(head);

        for (let i = 0; i < 4; i++) {
            const zOffset = 0.32 - i * 0.22;
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), blackMat);
            legL.position.set(-0.5, 0.26, zOffset);
            legL.rotation.z = 0.28;
            legL.rotation.y = 0.18 - i * 0.08;
            group.add(legL);

            const legR = legL.clone();
            legR.position.x = 0.5;
            legR.rotation.z = -0.28;
            legR.rotation.y = -legL.rotation.y;
            group.add(legR);
        }
    } else if (cleanName.includes('golem')) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.95 });
        const energyMat = new THREE.MeshStandardMaterial({ color: 0x3498db, emissive: 0x3498db, emissiveIntensity: 1.2 });

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.35), stoneMat);
        head.position.set(0, 1.35, 0.12);
        group.add(head);

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.65), stoneMat);
        body.position.y = 0.8;
        group.add(body);

        const core = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.08), energyMat);
        core.position.set(0, 0.9, 0.33);
        group.add(core);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.3), stoneMat);
        armL.position.set(-0.75, 0.72, 0.08);
        const armR = armL.clone();
        armR.position.x = 0.75;
        group.add(armL);
        group.add(armR);

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), stoneMat);
        legL.position.set(-0.3, 0.21, 0);
        const legR = legL.clone();
        legR.position.x = 0.3;
        group.add(legL);
        group.add(legR);
    } else if (cleanName.includes('troll')) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), greyMat);
        body.position.y = 0.7;
        group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), greyMat);
        head.position.set(0, 1.3, 0.08);
        group.add(head);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.18), greenMat);
        nose.position.set(0, 1.25, 0.3);
        group.add(nose);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), greyMat);
        armL.position.set(-0.52, 0.72, 0);
        const armR = armL.clone();
        armR.position.x = 0.52;
        group.add(armL);
        group.add(armR);

        const club = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), brownMat);
        club.position.set(0.52, 0.8, 0.32);
        club.rotation.x = 0.75;
        group.add(club);

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.35, 0.26), darkGreyMat);
        legL.position.set(-0.22, 0.175, 0);
        const legR = legL.clone();
        legR.position.x = 0.22;
        group.add(legL);
        group.add(legR);
    } else if (cleanName.includes('mago') || cleanName.includes('espectro') || cleanName.includes('sombra')) {
        let robeMat = purpleMat;
        let headMat = whiteMat;

        if (cleanName.includes('espectro')) {
            robeMat = new THREE.MeshStandardMaterial({ color: 0x34495e, transparent: true, opacity: 0.6 });
            headMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x9b59b6, emissiveIntensity: 0.7 });
        } else if (cleanName.includes('sombra')) {
            robeMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
            headMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
        }

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), robeMat);
        body.position.y = 0.75;
        group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), headMat);
        head.position.y = 1.35;
        group.add(head);

        if (cleanName.includes('mago')) {
            const hatBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), purpleMat);
            hatBase.position.y = 1.58;
            const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 4), purpleMat);
            hatTip.position.y = 1.83;
            hatTip.rotation.y = Math.PI / 4;
            group.add(hatBase);
            group.add(hatTip);

            const beard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.08), whiteMat);
            beard.position.set(0, 1.08, 0.2);
            group.add(beard);
        }

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), cleanName.includes('sombra') ? redMat : yellowMat);
        eyeL.position.set(-0.12, 1.35, 0.22);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        group.add(eyeL);
        group.add(eyeR);
    } else {
        // Fallback catch-all for bat, snake, wolf, bat etc.
        const baseColor = cleanName.includes('morcego') ? 0x6c5ce7
            : cleanName.includes('cobra') ? 0x2ecc71
                : cleanName.includes('cerbero') ? 0xd63031
                    : cleanName.includes('orc') ? 0x27ae60
                        : 0x7f8c8d;

        const myMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.8 });

        const main = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), myMat);
        main.position.y = 0.6;
        group.add(main);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), myMat);
        head.position.y = 1.1;
        group.add(head);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), yellowMat);
        eyeL.position.set(-0.12, 1.15, 0.22);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        group.add(eyeL);
        group.add(eyeR);
    }

    // Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    group.add(shadow);

    group.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    return group;
}

// Bind to window to allow easy integration with non-module scripts
window.loadEnemyModel = loadEnemyModel;
window.triggerDamageAnimation = triggerDamageAnimation;
window.triggerAttackAnimation = triggerAttackAnimation;
window.triggerDeathAnimation = triggerDeathAnimation;
window.triggerPlayerDamageAnimation = triggerPlayerDamageAnimation;
window.triggerPlayerAttackAnimation = triggerPlayerAttackAnimation;
window.triggerPlayerDeathAnimation = triggerPlayerDeathAnimation;
window.init3DScene = init3DScene;
