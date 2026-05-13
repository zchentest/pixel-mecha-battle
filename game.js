/**
 * 像素机甲对决 v3.1 - Pixel Mecha Battle
 * 帅气中文名称 · 独特机甲外观 · 角色专属特效
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ==================== 游戏常量 ====================
const GRAVITY = 0.65;
const GROUND_Y = 430;
const MAX_HEALTH = 100;
const MAX_ENERGY = 100;
const PX = 3;

// ==================== 攻击配置 ====================
const ATTACKS = {
    punch:     { min: 8,  max: 14, energy: 8,  duration: 18, activeStart: 4, activeEnd: 10, knockback: 6,  hitstun: 12 },
    kick:      { min: 12, max: 20, energy: 12, duration: 24, activeStart: 6, activeEnd: 14, knockback: 9,  hitstun: 16 },
    airPunch:  { min: 10, max: 16, energy: 10, duration: 16, activeStart: 3, activeEnd: 9,  knockback: 7,  hitstun: 14 },
    airKick:   { min: 16, max: 26, energy: 15, duration: 22, activeStart: 4, activeEnd: 12, knockback: 11, hitstun: 18 }
};

// ==================== 角色配置 ====================
const CHARACTERS = {
    blue: {
        name: '苍穹战甲',
        type: 'normal',
        body: { w: 50, h: 80, headW: 22, headH: 22 },
        color: '#00d9ff',
        secondary: '#006699',
        glow: '#00ffff',
        accent: '#00aaff',
        weaponColor: '#00ddff',
        features: { antenna: true, visor: true, shoulderPlates: true }
    },
    crimson: {
        name: '赤焰霸者',
        type: 'heavy',
        body: { w: 58, h: 85, headW: 26, headH: 24 },
        color: '#ff4757',
        secondary: '#992200',
        glow: '#ff6666',
        accent: '#ff8844',
        weaponColor: '#ff4422',
        features: { horns: true, shoulderPlates: true, chestPlate: true }
    },
    violet: {
        name: '幽影裁决',
        type: 'slim',
        body: { w: 45, h: 88, headW: 20, headH: 24 },
        color: '#9b59b6',
        secondary: '#5a1a6a',
        glow: '#d4a5ff',
        accent: '#ff55ff',
        weaponColor: '#cc44ff',
        features: { wings: true, visor: true, longAntenna: true }
    },
    gold: {
        name: '金甲战神',
        type: 'heavy',
        body: { w: 56, h: 82, headW: 24, headH: 23 },
        color: '#f1c40f',
        secondary: '#b8860b',
        glow: '#ffff44',
        accent: '#ffaa00',
        weaponColor: '#ffcc00',
        features: { horns: true, crown: true, shoulderPlates: true, chestGem: true }
    }
};

// ==================== 关卡配置 ====================
const STAGES = [
    {
        name: '赤焰霸者',
        charKey: 'crimson',
        stats: '攻击速度: 普通 | 攻击倾向: 保守',
        ai: { reactionDelay: 12, attackInterval: 45, aggressiveness: 0.4, blockChance: 0.3, jumpChance: 0.15 }
    },
    {
        name: '幽影裁决',
        charKey: 'violet',
        stats: '攻击速度: 较快 | 攻击倾向: 均衡',
        ai: { reactionDelay: 8, attackInterval: 35, aggressiveness: 0.6, blockChance: 0.4, jumpChance: 0.25 }
    },
    {
        name: '金甲战神',
        charKey: 'gold',
        stats: '攻击速度: 极快 | 攻击倾向: 激进',
        ai: { reactionDelay: 5, attackInterval: 25, aggressiveness: 0.8, blockChance: 0.5, jumpChance: 0.35 }
    }
];

// ==================== 游戏状态 ====================
let gameMode = null;
let currentStage = 0;
let player1, player2, scene;
let particles = [];
let floatingTexts = [];
let gameRunning = false;
let screenShake = { x: 0, y: 0, intensity: 0 };

// ==================== 输入管理 ====================
const keys = {};
const justPressed = {};
window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function consumeJustPressed(code) {
    if (justPressed[code]) { justPressed[code] = false; return true; }
    return false;
}

function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== 粒子与特效 ====================
class Particle {
    constructor(x, y, color, opts = {}) {
        this.x = x; this.y = y;
        this.vx = opts.vx ?? (Math.random() - 0.5) * 10;
        this.vy = opts.vy ?? (Math.random() - 0.5) * 8 - 2;
        this.life = this.maxLife = opts.life ?? 35;
        this.color = color;
        this.type = opts.type || 'spark';
        this.size = opts.size ?? (Math.random() * 4 + 2);
        this.grav = opts.grav ?? 0.15;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.grav; this.vx *= 0.97;
        this.life--; this.size *= 0.95;
    }
    draw(c) {
        const a = this.life / this.maxLife;
        c.save(); c.globalAlpha = a;
        if (this.type === 'spark') {
            c.fillStyle = this.color;
            c.shadowColor = this.color; c.shadowBlur = 8;
            c.fillRect(this.x|0, this.y|0, Math.ceil(this.size), Math.ceil(this.size));
        } else if (this.type === 'smoke') {
            c.fillStyle = `rgba(160,160,160,${a*0.35})`;
            c.fillRect(this.x|0, this.y|0, Math.ceil(this.size*2.5), Math.ceil(this.size*2.5));
        } else if (this.type === 'energy') {
            c.fillStyle = this.color;
            c.shadowColor = this.color; c.shadowBlur = 12;
            c.beginPath(); c.arc(this.x, this.y, this.size, 0, Math.PI*2); c.fill();
        } else if (this.type === 'ring') {
            c.strokeStyle = this.color; c.lineWidth = 2;
            c.shadowColor = this.color; c.shadowBlur = 10;
            c.beginPath(); c.arc(this.x, this.y, this.size, 0, Math.PI*2); c.stroke();
        }
        c.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color, big) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.big = big; this.frame = 0; this.maxFrame = 50; this.active = true;
    }
    update() { this.frame++; this.y -= 1.2; if (this.frame >= this.maxFrame) this.active = false; }
    draw(c) {
        const a = 1 - this.frame / this.maxFrame;
        const scale = this.big ? 1.4 + Math.sin(this.frame * 0.3) * 0.2 : 1;
        c.save(); c.globalAlpha = a;
        c.font = `bold ${Math.floor(20 * scale)}px "Courier New", monospace`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeText(this.text, this.x, this.y);
        c.fillStyle = this.color; c.fillText(this.text, this.x, this.y);
        c.restore();
    }
}

function addScreenShake(intensity) { screenShake.intensity = Math.max(screenShake.intensity, intensity); }
function updateScreenShake() {
    if (screenShake.intensity > 0.5) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.intensity *= 0.85;
    } else {
        screenShake.x = screenShake.y = screenShake.intensity = 0;
    }
}

// ==================== AI控制器 ====================
class AIController {
    constructor(mecha, config) {
        this.mecha = mecha;
        this.config = config;
        this.target = null;
        this.attackTimer = 0;
        this.reactionTimer = 0;
    }

    update(target) {
        this.target = target;
        if (this.mecha.isDead || this.mecha.hitStun > 0) return;

        this.attackTimer++;
        if (this.reactionTimer > 0) { this.reactionTimer--; return; }

        const dist = target.x - this.mecha.x;
        const absDist = Math.abs(dist);
        const facingTarget = (dist > 0 && this.mecha.facing === 1) || (dist < 0 && this.mecha.facing === -1);

        if (!this.mecha.isAttacking) {
            const optimalRange = 65;
            if (absDist > optimalRange) {
                this.mecha.vx += dist > 0 ? 0.7 : -0.7;
            } else if (absDist < 40) {
                this.mecha.vx += dist > 0 ? -0.5 : 0.5;
            }
            this.mecha.vx = Math.max(-5.5, Math.min(5.5, this.mecha.vx));
        }

        if (this.mecha.isGrounded && Math.random() < this.config.jumpChance) {
            if ((target.y < this.mecha.y - 30) || (absDist < 40 && Math.random() < 0.5)) {
                this.mecha.vy = -13.5;
                for (let i = 0; i < 6; i++) {
                    particles.push(new Particle(
                        this.mecha.x + this.mecha.width/2 + (Math.random()-0.5)*25,
                        this.mecha.y + this.mecha.height,
                        '#777', { type:'smoke', vx:(Math.random()-0.5)*3, vy:-1.5, grav:0.04, life:20 }
                    ));
                }
                this.reactionTimer = this.config.reactionDelay;
            }
        }

        if (this.attackTimer > this.config.attackInterval && !this.mecha.isAttacking) {
            if (absDist < 90 && facingTarget && Math.random() < this.config.aggressiveness) {
                const r = Math.random();
                const isGrounded = this.mecha.isGrounded;
                if (target.y < this.mecha.y - 20 && !isGrounded) {
                    this.mecha.startAttack(Math.random() < 0.5 ? 'airPunch' : 'airKick');
                } else if (r < 0.45) {
                    this.mecha.startAttack(isGrounded ? 'punch' : 'airPunch');
                } else {
                    this.mecha.startAttack(isGrounded ? 'kick' : 'airKick');
                }
                this.attackTimer = 0;
                this.reactionTimer = this.config.reactionDelay;
            }
        }
    }
}

// ==================== 机甲类 ====================
class Mecha {
    constructor(x, isP1, charKey = null) {
        this.isP1 = isP1;
        
        if (charKey && CHARACTERS[charKey]) {
            this.config = CHARACTERS[charKey];
        } else {
            this.config = isP1 ? CHARACTERS.blue : CHARACTERS.crimson;
        }
        
        this.width = this.config.body.w;
        this.height = this.config.body.h;
        this.x = x;
        this.y = GROUND_Y - this.height;
        
        this.vx = 0; this.vy = 0;
        this.facing = isP1 ? 1 : -1;
        this.health = MAX_HEALTH; this.energy = MAX_ENERGY;
        this.isGrounded = false; this.isDead = false;
        this.isAttacking = false; this.currentAttack = null;
        this.attackFrame = 0; this.attackHitDone = false;
        this.attackCooldown = 0; this.isBlocking = false;
        this.hitStun = 0; this.animFrame = 0; this.animTimer = 0;
        this.eyeGlow = 0; this.auraPhase = Math.random() * Math.PI * 2;
        this.ai = null;
    }

    update() {
        if (this.isDead) return;
        this.auraPhase += 0.05;

        if (this.energy < MAX_ENERGY) this.energy = Math.min(MAX_ENERGY, this.energy + 0.3);

        if (this.hitStun > 0) {
            this.hitStun--; this.vx *= 0.82;
        } else if (this.isP1 || !this.ai) {
            this.handleInput();
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        if (this.isAttacking) {
            this.attackFrame++;
            const cfg = ATTACKS[this.currentAttack];
            if (this.attackFrame >= cfg.duration) {
                this.isAttacking = false;
                this.currentAttack = null;
                this.attackFrame = 0;
                this.attackHitDone = false;
            }
        }

        const blockKey = this.isP1 ? 'KeyH' : 'KeyL';
        this.isBlocking = keys[blockKey] && this.energy > 5 && !this.isAttacking;
        if (this.isBlocking) this.energy = Math.max(0, this.energy - 0.6);

        this.vy += GRAVITY;
        this.x += this.vx; this.y += this.vy;

        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height; this.vy = 0; this.isGrounded = true;
        } else { this.isGrounded = false; }

        this.x = Math.max(10, Math.min(canvas.width - this.width - 10, this.x));
        if (this.isGrounded) this.vx *= 0.82;

        this.animTimer++;
        if (this.animTimer > 5) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 8; }

        if (!this.isAttacking && Math.abs(this.vx) > 0.3) {
            this.facing = this.vx > 0 ? 1 : -1;
        }

        this.eyeGlow = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
    }

    handleInput() {
        const c = this.isP1
            ? { left:'KeyA', right:'KeyD', jump:'KeyW', punch:'KeyG', kick:'KeyF' }
            : { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', punch:'Period', kick:'Slash' };

        if (keys[c.left])  this.vx = Math.max(this.vx - 0.8, -5.5);
        if (keys[c.right]) this.vx = Math.min(this.vx + 0.8, 5.5);

        if (keys[c.jump] && this.isGrounded) {
            this.vy = -13.5;
            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(
                    this.x + this.width/2 + (Math.random()-0.5)*25, this.y + this.height,
                    '#777', { type:'smoke', vx:(Math.random()-0.5)*3, vy:-1.5, grav:0.04, life:20 }
                ));
            }
        }

        if (!this.isBlocking && this.attackCooldown === 0 && !this.isAttacking) {
            if (consumeJustPressed(c.punch)) {
                this.startAttack(this.isGrounded ? 'punch' : 'airPunch');
            } else if (consumeJustPressed(c.kick)) {
                this.startAttack(this.isGrounded ? 'kick' : 'airKick');
            }
        }
    }

    startAttack(type) {
        this.isAttacking = true;
        this.currentAttack = type;
        this.attackFrame = 0;
        this.attackHitDone = false;
        this.attackCooldown = ATTACKS[type].duration + 8;
        this.energy = Math.max(0, this.energy - ATTACKS[type].energy);

        const isKick = type.includes('kick');
        const px = this.facing === 1 ? this.x + this.width + 5 : this.x - 5;
        const py = this.y + (isKick ? 50 : 25);
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                px + (Math.random()-0.5)*15, py + (Math.random()-0.5)*15,
                this.config.glow,
                { type:'energy', vx: this.facing*(2+Math.random()*2), vy:(Math.random()-0.5)*2, grav:0, life:12, size:3 }
            ));
        }
    }

    getAttackHitbox() {
        if (!this.isAttacking || this.attackHitDone) return null;
        const cfg = ATTACKS[this.currentAttack];
        if (this.attackFrame < cfg.activeStart || this.attackFrame > cfg.activeEnd) return null;

        const isKick = this.currentAttack.includes('kick');
        const reach = isKick ? 55 : 45;
        const hbH = isKick ? 35 : 30;
        const hbY = isKick ? this.y + 42 : this.y + 12;

        return {
            x: this.facing === 1 ? this.x + this.width - 5 : this.x - reach + 5,
            y: hbY, width: reach, height: hbH
        };
    }

    getHeadBox() { return { x: this.x + 12, y: this.y + 2, width: 26, height: 22 }; }
    getBodyBox() { return { x: this.x + 5, y: this.y + 24, width: 40, height: 56 }; }

    takeDamage(baseDmg, attacker, hitPart) {
        if (this.isDead) return;
        const isHead = hitPart === 'head';
        const finalDmg = isHead ? baseDmg * 2 : baseDmg;

        if (this.isBlocking) {
            floatingTexts.push(new FloatingText(this.x + this.width/2, this.y + 10, '格挡!', '#44ccff', false));
            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(
                    this.x + this.width/2 + (Math.random()-0.5)*30,
                    this.y + this.height/2 + (Math.random()-0.5)*30,
                    '#44ccff', { type:'ring', size: 5+Math.random()*10, grav:0, life:15, vx:0, vy:0 }
                ));
            }
            this.energy = Math.max(0, this.energy - 15);
            return;
        }

        this.health = Math.max(0, this.health - finalDmg);
        this.hitStun = ATTACKS[attacker.currentAttack].hitstun;
        this.vx = (this.x > attacker.x ? 1 : -1) * ATTACKS[attacker.currentAttack].knockback;
        this.vy = -4;
        addScreenShake(isHead ? 8 : 4);

        const txt = isHead ? `💥爆头 -${finalDmg}` : `-${finalDmg}`;
        floatingTexts.push(new FloatingText(
            this.x + this.width/2 + (Math.random()-0.5)*20,
            this.y + (isHead ? 5 : 30),
            txt, isHead ? '#ff2222' : '#ffdd00', isHead
        ));

        const hx = this.x + this.width/2, hy = this.y + (isHead ? 12 : 40);
        for (let i = 0; i < (isHead ? 18 : 10); i++) {
            particles.push(new Particle(
                hx + (Math.random()-0.5)*15, hy + (Math.random()-0.5)*10,
                isHead ? '#ff3333' : '#ffaa00',
                { type:'spark', grav:0.2, life: isHead ? 40 : 25 }
            ));
        }

        if (isHead) {
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(hx, hy, '#ffffff',
                    { type:'energy', vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6, grav:0, life:10, size:5 }
                ));
            }
        }

        if (this.health <= 0) { this.health = 0; this.isDead = true; handleDeath(this.isP1); }
    }

    draw(c) {
        const dx = Math.floor(this.x), dy = Math.floor(this.y);
        c.save();

        if (this.hitStun > 0 && Math.floor(Date.now() / 50) % 2 === 0) c.globalAlpha = 0.5;

        // 角色光环
        this.drawAura(c, dx, dy);

        if (this.isBlocking) {
            c.strokeStyle = 'rgba(80,200,255,0.5)'; c.lineWidth = 3;
            c.shadowColor = '#00ccff'; c.shadowBlur = 20;
            c.beginPath(); c.arc(dx + this.width/2, dy + this.height/2, 52, 0, Math.PI*2); c.stroke();
        }

        this.drawMecha(c, dx, dy);
        c.restore();
    }

    drawAura(c, x, y) {
        const auraSize = 45 + Math.sin(this.auraPhase) * 5;
        const alpha = 0.15 + Math.sin(this.auraPhase) * 0.05;
        
        c.save();
        c.strokeStyle = this.config.glow;
        c.lineWidth = 2;
        c.globalAlpha = alpha;
        c.shadowColor = this.config.glow;
        c.shadowBlur = 15;
        
        c.beginPath();
        c.arc(x + this.width/2, y + this.height/2 + 10, auraSize, 0, Math.PI * 2);
        c.stroke();
        
        for (let i = 0; i < 6; i++) {
            const angle = this.auraPhase + (i / 6) * Math.PI * 2;
            const px = x + this.width/2 + Math.cos(angle) * auraSize;
            const py = y + this.height/2 + 10 + Math.sin(angle) * auraSize;
            c.fillStyle = this.config.glow;
            c.beginPath();
            c.arc(px, py, 3, 0, Math.PI * 2);
            c.fill();
        }
        c.restore();
    }

    drawMecha(c, x, y) {
        const f = this.facing;
        const moving = Math.abs(this.vx) > 0.5;
        const jumping = !this.isGrounded;
        const atk = this.isAttacking;
        const atkFrame = this.attackFrame;
        const isKick = this.currentAttack && this.currentAttack.includes('kick');
        const cfg = this.config;

        const bob = moving ? Math.sin(this.animFrame * Math.PI / 4) * 2 : 0;
        const legSwing = moving ? Math.sin(this.animFrame * Math.PI / 4) * 7 : 0;

        const pri = cfg.color;
        const sec = cfg.secondary;
        const dk = '#1a1a2e';
        const mt = '#3a3a4e';
        const lt = '#6a6a7e';
        const glow = cfg.glow;
        const acc = cfg.accent;

        // 羽翼特效（幽影裁决）
        if (cfg.features.wings) {
            const wingAlpha = 0.4 + Math.sin(this.auraPhase * 2) * 0.2;
            c.save();
            c.globalAlpha = wingAlpha;
            c.fillStyle = cfg.glow;
            c.shadowColor = cfg.glow;
            c.shadowBlur = 10;
            
            c.beginPath();
            c.moveTo(x + 10, y + 30 + bob);
            c.lineTo(x - 20, y + 15 + bob);
            c.lineTo(x - 15, y + 40 + bob);
            c.lineTo(x - 5, y + 50 + bob);
            c.closePath();
            c.fill();
            
            c.beginPath();
            c.moveTo(x + this.width - 10, y + 30 + bob);
            c.lineTo(x + this.width + 20, y + 15 + bob);
            c.lineTo(x + this.width + 15, y + 40 + bob);
            c.lineTo(x + this.width + 5, y + 50 + bob);
            c.closePath();
            c.fill();
            c.restore();
        }

        // 后腿
        c.fillStyle = dk;
        const bodyOffsetX = (50 - this.width) / 2;
        const blx = f === 1 ? x + 12 + bodyOffsetX : x + this.width - 22;
        const bly = y + 52 + bob - legSwing;
        pxRect(c, blx, bly, 10, 14, PX);
        pxRect(c, blx + 1, bly + 14, 8, 14, PX);
        c.fillStyle = mt;
        pxRect(c, blx - 2, bly + 26, 14, 5, PX);

        // 身体
        c.fillStyle = pri;
        pxRect(c, x + 11 + bodyOffsetX, y + 28 + bob, this.width - 22, 26, PX);
        
        c.fillStyle = sec;
        pxRect(c, x + 13 + bodyOffsetX, y + 32 + bob, this.width - 26, 18, PX);
        
        // 胸甲宝石
        if (cfg.features.chestGem) {
            c.fillStyle = '#ff0000';
            c.shadowColor = '#ff0000';
            c.shadowBlur = 15;
            pxRect(c, x + this.width/2 - 4, y + 35 + bob, 8, 8, PX);
            c.shadowBlur = 0;
        }
        
        c.fillStyle = glow;
        c.shadowColor = glow; c.shadowBlur = 12 + this.eyeGlow * 10;
        pxRect(c, x + 20 + bodyOffsetX, y + 36 + bob, 10, 8, PX);
        c.shadowBlur = 0;
        
        c.fillStyle = mt;
        pxRect(c, x + 8 + bodyOffsetX, y + 30 + bob, 4, 10, PX);
        pxRect(c, x + this.width - 12, y + 30 + bob, 4, 10, PX);
        
        if (cfg.features.shoulderPlates) {
            c.fillStyle = lt;
            const plateW = cfg.type === 'heavy' ? 10 : 8;
            pxRect(c, x + 4 + bodyOffsetX, y + 26 + bob, plateW, 8, PX);
            pxRect(c, x + this.width - 12, y + 26 + bob, plateW, 8, PX);
        }

        // 后手臂
        c.fillStyle = dk;
        const bay = y + 32 + bob + (moving ? -legSwing/2 : 0);
        const backArmX = f === 1 ? x + 4 + bodyOffsetX : x + this.width - 10;
        pxRect(c, backArmX, bay, 6, 14, PX);
        pxRect(c, backArmX + (f===1 ? -2 : 2), bay + 12, 8, 10, PX);

        // 前手臂/拳击
        const fay = y + 32 + bob + (moving ? legSwing/2 : 0);
        const fax = x + (f===1 ? this.width - 14 : 8);

        if (atk && !isKick) {
            const extend = Math.sin(Math.min(atkFrame, 10) / 10 * Math.PI) * 28;
            const armX = fax + (f===1 ? extend : -extend);
            c.fillStyle = dk;
            pxRect(c, armX, fay, 8, 14, PX);
            c.fillStyle = lt;
            c.shadowColor = cfg.weaponColor; c.shadowBlur = 12;
            pxRect(c, armX + (f===1 ? 6 : -10), fay + 1, 10, 12, PX);
            c.shadowBlur = 0;
            c.fillStyle = cfg.weaponColor;
            pxRect(c, armX + (f===1 ? 8 : -8), fay + 3, 6, 8, PX);
        } else {
            c.fillStyle = dk;
            pxRect(c, fax, fay, 6, 14, PX);
            pxRect(c, fax + (f===1 ? 4 : -4), fay + 12, 8, 10, PX);
            
            c.fillStyle = mt;
            const wx = f===1 ? fax + 8 : fax - 8;
            pxRect(c, wx, fay + 6, 4, 20, PX);
            c.fillStyle = cfg.weaponColor;
            c.shadowColor = cfg.weaponColor; c.shadowBlur = 6;
            pxRect(c, wx, fay + 8, 4, 8, PX);
            c.shadowBlur = 0;
        }

        // 头部
        const headW = cfg.body.headW;
        const headH = cfg.body.headH;
        const headX = x + (this.width - headW) / 2;
        
        c.fillStyle = dk;
        pxRect(c, headX, y + 6 + bob, headW, headH, PX);
        c.fillStyle = mt;
        pxRect(c, headX + 2, y + 3 + bob, headW - 4, 5, PX);
        c.fillStyle = '#080812';
        pxRect(c, headX + 3, y + 16 + bob, headW - 6, 6, PX);
        c.fillStyle = glow;
        c.shadowColor = glow; c.shadowBlur = 8 + this.eyeGlow * 8;
        const ex = f===1 ? headX + headW - 9 : headX + 3;
        pxRect(c, ex, y + 9 + bob, 6, 4, PX);
        c.shadowBlur = 0;
        
        // 角
        if (cfg.features.horns) {
            c.fillStyle = acc;
            c.shadowColor = acc; c.shadowBlur = 6;
            const hornX = headX + headW/2 - 2;
            pxRect(c, hornX, y - 2 + bob, 4, 8, PX);
            pxRect(c, hornX - 6, y + 2 + bob, 4, 6, PX);
            pxRect(c, hornX + 6, y + 2 + bob, 4, 6, PX);
            c.shadowBlur = 0;
        }
        
        // 王冠
        if (cfg.features.crown) {
            c.fillStyle = '#ffdd00';
            c.shadowColor = '#ffdd00'; c.shadowBlur = 8;
            const crownX = headX + headW/2;
            pxRect(c, crownX - 8, y - 6 + bob, 16, 6, PX);
            pxRect(c, crownX - 10, y - 10 + bob, 4, 6, PX);
            pxRect(c, crownX - 2, y - 12 + bob, 4, 8, PX);
            pxRect(c, crownX + 6, y - 10 + bob, 4, 6, PX);
            c.shadowBlur = 0;
        }
        
        // 长天线
        if (cfg.features.longAntenna) {
            c.fillStyle = mt;
            pxRect(c, headX + headW/2 - 2, y - 10 + bob, 4, 12, PX);
            c.fillStyle = acc;
            c.shadowColor = acc; c.shadowBlur = 8;
            pxRect(c, headX + headW/2 - 2, y - 14 + bob, 4, 5, PX);
            c.shadowBlur = 0;
        } else if (cfg.features.antenna) {
            c.fillStyle = mt;
            pxRect(c, headX + headW/2 - 2, y - 4 + bob, 4, 8, PX);
            c.fillStyle = acc;
            c.shadowColor = acc; c.shadowBlur = 6;
            pxRect(c, headX + headW/2 - 2, y - 6 + bob, 4, 3, PX);
            c.shadowBlur = 0;
        }

        // 前腿/踢腿
        c.fillStyle = sec;
        const flx = f===1 ? x + this.width - 22 : x + 12 + bodyOffsetX;
        const fly = y + 52 + bob + legSwing;
        pxRect(c, flx, fly, 12, 14, PX);

        if (atk && isKick) {
            const extend = Math.sin(Math.min(atkFrame, 12) / 12 * Math.PI) * 35;
            const legX = flx + (f===1 ? extend : -extend - 10);
            c.fillStyle = sec;
            pxRect(c, legX, fly, 10, 14, PX);
            c.fillStyle = lt;
            c.shadowColor = cfg.weaponColor; c.shadowBlur = 14;
            pxRect(c, legX + (f===1 ? 8 : -14), fly + 2, 12, 8, PX);
            c.shadowBlur = 0;
            c.fillStyle = cfg.weaponColor;
            pxRect(c, legX + (f===1 ? 10 : -12), fly + 3, 8, 6, PX);
        } else {
            pxRect(c, flx + 2, fly + 14, 8, 14, PX);
            c.fillStyle = mt;
            pxRect(c, flx - 2, fly + 26, 16, 5, PX);
        }

        // 跳跃喷射
        if (jumping && this.vy > -2) {
            const jetAlpha = 0.5 + Math.random() * 0.5;
            c.fillStyle = `rgba(0,200,255,${jetAlpha})`;
            c.shadowColor = '#00ddff'; c.shadowBlur = 8;
            pxRect(c, x + 14, y + this.height - 4, 6, 6 + Math.random()*4, PX);
            pxRect(c, x + this.width - 20, y + this.height - 4, 6, 6 + Math.random()*4, PX);
            c.shadowBlur = 0;
        }

        // 攻击轨迹
        if (atk && atkFrame >= ATTACKS[this.currentAttack].activeStart && atkFrame <= ATTACKS[this.currentAttack].activeEnd) {
            const sx = f===1 ? x + this.width + 5 : x - 40;
            const sy = isKick ? y + 50 : y + 30;
            const alpha = 0.8 - (atkFrame - ATTACKS[this.currentAttack].activeStart) * 0.1;

            c.save();
            c.strokeStyle = isKick ? `rgba(255,140,0,${alpha})` : `rgba(255,255,100,${alpha})`;
            c.lineWidth = isKick ? 5 : 4;
            c.shadowColor = isKick ? '#ff8800' : '#ffff00';
            c.shadowBlur = 15;
            c.beginPath();
            if (isKick) {
                c.moveTo(sx, sy - 10);
                c.quadraticCurveTo(sx + f*20, sy + 5, sx + f*35, sy + 15);
            } else {
                c.moveTo(sx, sy - 5);
                c.lineTo(sx + f*30, sy);
                c.lineTo(sx + f*25, sy + 12);
            }
            c.stroke();
            c.restore();
        }
    }
}

function pxRect(c, x, y, w, h, s) {
    c.fillRect(Math.floor(x/s)*s, Math.floor(y/s)*s, Math.ceil(w/s)*s, Math.ceil(h/s)*s);
}

// ==================== 场景 ====================
class Scene {
    constructor() {
        this.stars = [];
        this.buildings = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random()*canvas.width, y: Math.random()*280,
                size: Math.random()*2+1, tw: Math.random()*Math.PI*2,
                sp: 0.001+Math.random()*0.002
            });
        }
        let bx = 0;
        while (bx < canvas.width + 100) {
            const w = 40+Math.random()*55, h = 80+Math.random()*180;
            this.buildings.push({ x:bx, y:GROUND_Y-h, w, h });
            bx += w - 8 + Math.random()*25;
        }
    }
    draw(c) {
        const g = c.createLinearGradient(0,0,0,canvas.height);
        g.addColorStop(0,'#050510'); g.addColorStop(0.4,'#0a0a25');
        g.addColorStop(0.7,'#151535'); g.addColorStop(1,'#202050');
        c.fillStyle = g; c.fillRect(0,0,canvas.width,canvas.height);

        this.stars.forEach(s => {
            c.fillStyle = `rgba(255,255,255,${0.4+Math.sin(Date.now()*s.sp+s.tw)*0.4})`;
            c.fillRect(s.x, s.y, s.size, s.size);
        });

        c.fillStyle = '#334466'; c.beginPath(); c.arc(790,75,40,0,Math.PI*2); c.fill();
        c.fillStyle = '#223355'; c.beginPath(); c.arc(780,70,34,0,Math.PI*2); c.fill();

        this.buildings.forEach(b => {
            c.fillStyle = '#0a0a15'; c.fillRect(b.x, b.y, b.w, b.h);
            for (let wy = b.y+12; wy < GROUND_Y-10; wy += 16) {
                for (let wx = b.x+6; wx < b.x+b.w-6; wx += 12) {
                    if (Math.random() > 0.82) {
                        c.fillStyle = `rgba(255,200,100,${0.2+Math.random()*0.4})`;
                        c.fillRect(wx, wy, 4, 7);
                    }
                }
            }
        });

        c.fillStyle = '#12122a'; c.fillRect(0,GROUND_Y,canvas.width,canvas.height-GROUND_Y);
        c.strokeStyle = '#1a1a3a'; c.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            c.beginPath(); c.moveTo(i,GROUND_Y); c.lineTo(i-80,canvas.height); c.stroke();
        }
        for (let j = GROUND_Y; j < canvas.height; j += 25) {
            c.beginPath(); c.moveTo(0,j); c.lineTo(canvas.width,j); c.stroke();
        }
        c.strokeStyle = '#e94560'; c.lineWidth = 2;
        c.shadowColor = '#e94560'; c.shadowBlur = 10;
        c.beginPath(); c.moveTo(0,GROUND_Y); c.lineTo(canvas.width,GROUND_Y); c.stroke();
        c.shadowBlur = 0;
    }
}

// ==================== 游戏流程 ====================
function selectMode(mode) {
    gameMode = mode;
    document.getElementById('modeSelect').style.display = 'none';

    if (mode === 'challenge') {
        currentStage = 0;
        showStageInfo();
    } else {
        document.getElementById('p2Controls').style.display = 'block';
        startGame();
    }
}

function showStageInfo() {
    const stage = STAGES[currentStage];
    const char = CHARACTERS[stage.charKey];
    document.getElementById('stageTitle').textContent = `第 ${currentStage + 1} 关`;
    document.getElementById('enemyName').textContent = char.name;
    document.getElementById('enemyStats').textContent = stage.stats;
    document.getElementById('stageInfo').style.display = 'block';
    document.getElementById('stageIndicator').style.display = 'none';
}

function startStage() {
    document.getElementById('stageInfo').style.display = 'none';
    document.getElementById('stageIndicator').style.display = 'block';
    document.getElementById('currentStage').textContent = currentStage + 1;
    document.getElementById('p2Controls').style.display = 'none';
    startGame();
}

function startGame() {
    player1 = new Mecha(180, true, 'blue');

    if (gameMode === 'challenge') {
        const stage = STAGES[currentStage];
        const char = CHARACTERS[stage.charKey];
        player2 = new Mecha(660, false, stage.charKey);
        player2.ai = new AIController(player2, stage.ai);
        document.getElementById('p2Name').textContent = `${char.name} (AI) 🔴`;
    } else {
        player2 = new Mecha(660, false, 'crimson');
        document.getElementById('p2Name').textContent = '赤焰霸者 (P2) 🔴';
    }

    document.querySelector('.player-ui.p1 .player-name').textContent = '苍穹战甲 (P1) 🔵';

    scene = new Scene();
    particles = []; floatingTexts = [];
    gameRunning = true;
    screenShake = { x:0, y:0, intensity:0 };
    document.getElementById('gameOver').style.display = 'none';
    updateUI();
}

function handleDeath(player1Died) {
    if (gameMode === 'challenge') {
        if (player1Died) {
            endGame('挑战失败!', '你被击败了，再试一次吧！');
        } else {
            currentStage++;
            if (currentStage >= STAGES.length) {
                endGame('🏆 挑战成功!', '你击败了所有敌人，成为最强机甲战士！');
            } else {
                setTimeout(() => { showStageInfo(); }, 1000);
            }
        }
    } else {
        endGame(player1Died ? '赤焰霸者获胜!' : '苍穹战甲获胜!', '激烈对战!');
    }
}

function endGame(title, desc) {
    gameRunning = false;
    document.getElementById('winnerText').textContent = title;
    document.getElementById('gameOverDesc').textContent = desc;
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    if (gameMode === 'challenge') {
        currentStage = 0;
        showStageInfo();
    } else {
        startGame();
    }
}

function backToMenu() {
    gameMode = null;
    currentStage = 0;
    gameRunning = false;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('stageIndicator').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'flex';
}

function boxOverlap(a, b) {
    return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
}

function processAttackHit(attacker, defender) {
    const hb = attacker.getAttackHitbox();
    if (!hb) return;

    const headHit = boxOverlap(hb, defender.getHeadBox());
    const bodyHit = boxOverlap(hb, defender.getBodyBox());

    if (headHit || bodyHit) {
        const cfg = ATTACKS[attacker.currentAttack];
        const baseDmg = randomRange(cfg.min, cfg.max);
        const hitPart = headHit ? 'head' : 'body';
        defender.takeDamage(baseDmg, attacker, hitPart);
        attacker.attackHitDone = true;
    }
}

function update() {
    if (!gameRunning) return;

    player1.update();
    player2.update();

    if (player2.ai) player2.ai.update(player1);

    processAttackHit(player1, player2);
    processAttackHit(player2, player1);

    particles = particles.filter(p => { p.update(); return p.life > 0; });
    floatingTexts = floatingTexts.filter(t => { t.update(); return t.active; });

    updateScreenShake();
    updateUI();

    for (const k in justPressed) justPressed[k] = false;
}

function updateUI() {
    document.getElementById('p1Health').style.width = (player1.health/MAX_HEALTH*100)+'%';
    document.getElementById('p1HpText').textContent = Math.ceil(player1.health);
    document.getElementById('p1Energy').style.width = (player1.energy/MAX_ENERGY*100)+'%';
    document.getElementById('p2Health').style.width = (player2.health/MAX_HEALTH*100)+'%';
    document.getElementById('p2HpText').textContent = Math.ceil(player2.health);
    document.getElementById('p2Energy').style.width = (player2.energy/MAX_ENERGY*100)+'%';
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (scene) scene.draw(ctx);
    if (gameRunning && player1 && player2) {
        ctx.save();
        ctx.translate(screenShake.x, screenShake.y);
        player1.draw(ctx);
        player2.draw(ctx);
        particles.forEach(p => p.draw(ctx));
        floatingTexts.forEach(t => t.draw(ctx));
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

scene = new Scene();
gameLoop();
