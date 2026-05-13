/**
 * 像素机甲对决 - 网络联机模块 (PeerJS 版本)
 * 简化 WebRTC 连接，使用 PeerJS 公共信令服务器
 */

// ==================== PeerJS 配置 ====================
let peer = null;
let connection = null;
let isHost = false;
let remotePlayerName = '';
let localPlayerName = '';
let connectionState = 'disconnected';
let pingInterval = null;
let networkLatency = 0;

// ==================== PeerJS 初始化 ====================
function initPeerJS() {
    // 加载 PeerJS 库
    if (typeof Peer === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
        script.onload = () => console.log('PeerJS loaded');
        script.onerror = () => console.error('PeerJS load failed');
        document.head.appendChild(script);
    }
}

// ==================== 创建房间（主机） ====================
function createRoom() {
    const nameInput = document.getElementById('hostName');
    localPlayerName = nameInput.value.trim() || '房主';
    
    // 生成房间ID（简单易记）
    const roomId = 'PMB-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    showConnectionStatus('正在创建房间...', 'connecting');
    
    try {
        // 创建 Peer 实例，使用房间ID作为 peer ID
        peer = new Peer(roomId, {
            debug: 1
        });
        
        peer.on('open', (id) => {
            console.log('房间已创建，ID:', id);
            isHost = true;
            
            // 显示房间ID
            document.getElementById('roomIdText').textContent = id;
            document.getElementById('hostRoomId').style.display = 'block';
            showConnectionStatus('房间已创建！等待好友加入...', 'connected');
            
            // 显示等待提示
            document.getElementById('waitingText').textContent = '分享房间号给好友\n等待连接中...';
            document.getElementById('waitingOverlay').classList.add('show');
        });
        
        peer.on('connection', (conn) => {
            console.log('收到连接请求');
            connection = conn;
            setupConnection(conn);
        });
        
        peer.on('error', (err) => {
            console.error('PeerJS 错误:', err);
            handlePeerError(err);
        });
        
    } catch (error) {
        console.error('创建房间失败:', error);
        showConnectionStatus('创建失败: ' + error.message, 'error');
    }
}

// ==================== 加入房间（客户端） ====================
function joinRoom() {
    const nameInput = document.getElementById('guestName');
    const codeInput = document.getElementById('joinCode');
    
    localPlayerName = nameInput.value.trim() || '玩家2';
    const roomId = codeInput.value.trim().toUpperCase();
    
    if (!roomId) {
        showConnectionStatus('请输入房间号', 'error');
        return;
    }
    
    showConnectionStatus('正在加入房间...', 'connecting');
    
    try {
        // 创建 Peer 实例（不指定ID，由服务器分配）
        peer = new Peer({
            debug: 1
        });
        
        peer.on('open', (id) => {
            console.log('已连接服务器，我的ID:', id);
            
            // 连接到房主
            connection = peer.connect(roomId, {
                reliable: true
            });
            
            setupConnection(connection);
        });
        
        peer.on('error', (err) => {
            console.error('PeerJS 错误:', err);
            handlePeerError(err);
        });
        
    } catch (error) {
        console.error('加入房间失败:', error);
        showConnectionStatus('加入失败: ' + error.message, 'error');
    }
}

// ==================== 设置连接 ====================
function setupConnection(conn) {
    conn.on('open', () => {
        console.log('连接已打开');
        connectionState = 'connected';
        document.getElementById('waitingOverlay').classList.remove('show');
        
        // 发送自己的名称
        conn.send({
            type: 'playerName',
            name: localPlayerName
        });
        
        showConnectionStatus('连接成功！正在开始游戏...', 'connected');
        
        // 延迟一下再开始游戏
        setTimeout(() => {
            startOnlineGame();
        }, 1000);
    });
    
    conn.on('data', (data) => {
        handleNetworkMessage(data);
    });
    
    conn.on('close', () => {
        console.log('连接已关闭');
        onConnectionClosed();
    });
    
    conn.on('error', (err) => {
        console.error('连接错误:', err);
        showConnectionStatus('连接错误: ' + err, 'error');
    });
}

// ==================== 处理 PeerJS 错误 ====================
function handlePeerError(err) {
    switch (err.type) {
        case 'peer-unavailable':
            showConnectionStatus('房间不存在或已关闭', 'error');
            break;
        case 'browser-incompatible':
            showConnectionStatus('浏览器不支持WebRTC', 'error');
            break;
        case 'network':
            showConnectionStatus('网络错误，请检查网络连接', 'error');
            break;
        case 'server-error':
            showConnectionStatus('无法连接服务器，请稍后重试', 'error');
            break;
        case 'socket-error':
            showConnectionStatus('Socket错误，请稍后重试', 'error');
            break;
        default:
            showConnectionStatus('连接失败: ' + err.message, 'error');
    }
    
    document.getElementById('waitingOverlay').classList.remove('show');
}

// ==================== 网络消息处理 ====================
function handleNetworkMessage(msg) {
    switch (msg.type) {
        case 'playerName':
            remotePlayerName = msg.name;
            // 更新玩家名称
            if (isHost) {
                document.getElementById('p1Name').textContent = localPlayerName + ' (你)';
                document.getElementById('p2Name').textContent = remotePlayerName + ' (对手)';
            } else {
                document.getElementById('p1Name').textContent = remotePlayerName + ' (对手)';
                document.getElementById('p2Name').textContent = localPlayerName + ' (你)';
            }
            break;
        case 'ping':
            sendNetworkMessage({ type: 'pong', time: msg.time });
            break;
        case 'pong':
            networkLatency = Date.now() - msg.time;
            const latencyEl = document.getElementById('latency');
            if (latencyEl) latencyEl.textContent = networkLatency;
            break;
        case 'gameState':
            applyRemoteGameState(msg.data);
            break;
    }
}

// ==================== 发送网络消息 ====================
function sendNetworkMessage(msg) {
    if (connection && connection.open) {
        connection.send(msg);
    }
}

// ==================== 延迟检测 ====================
function startPingTest() {
    pingInterval = setInterval(() => {
        if (connectionState === 'connected') {
            sendNetworkMessage({ type: 'ping', time: Date.now() });
        }
    }, 1000);
}

function stopPingTest() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
}

// ==================== 游戏状态同步 ====================
function syncGameState() {
    if (connectionState !== 'connected') return;
    
    const state = isHost ? getPlayer1State() : getPlayer2State();
    sendNetworkMessage({
        type: 'gameState',
        data: { player: state, timestamp: Date.now() }
    });
}

function getPlayer1State() {
    if (!player1) return null;
    return {
        x: player1.x, y: player1.y,
        vx: player1.vx, vy: player1.vy,
        health: player1.health, energy: player1.energy,
        facing: player1.facing,
        isAttacking: player1.isAttacking,
        currentAttack: player1.currentAttack,
        attackFrame: player1.attackFrame,
        isBlocking: player1.isBlocking,
        isGrounded: player1.isGrounded
    };
}

function getPlayer2State() {
    if (!player2) return null;
    return {
        x: player2.x, y: player2.y,
        vx: player2.vx, vy: player2.vy,
        health: player2.health, energy: player2.energy,
        facing: player2.facing,
        isAttacking: player2.isAttacking,
        currentAttack: player2.currentAttack,
        attackFrame: player2.attackFrame,
        isBlocking: player2.isBlocking,
        isGrounded: player2.isGrounded
    };
}

function applyRemoteGameState(state) {
    if (!state || !state.player) return;
    
    const targetPlayer = isHost ? player2 : player1;
    if (!targetPlayer) return;
    
    const remote = state.player;
    targetPlayer.x = lerp(targetPlayer.x, remote.x, 0.3);
    targetPlayer.y = lerp(targetPlayer.y, remote.y, 0.3);
    targetPlayer.vx = remote.vx;
    targetPlayer.vy = remote.vy;
    targetPlayer.health = remote.health;
    targetPlayer.energy = remote.energy;
    targetPlayer.facing = remote.facing;
    targetPlayer.isAttacking = remote.isAttacking;
    targetPlayer.currentAttack = remote.currentAttack;
    targetPlayer.attackFrame = remote.attackFrame;
    targetPlayer.isBlocking = remote.isBlocking;
    targetPlayer.isGrounded = remote.isGrounded;
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

// ==================== 连接关闭 ====================
function onConnectionClosed() {
    connectionState = 'disconnected';
    document.getElementById('networkStatus').classList.remove('show');
    stopPingTest();
    
    if (gameRunning) {
        endGame('连接断开', '与对手失去连接');
    }
}

// ==================== UI 函数 ====================
function showOnlinePanel() {
    document.getElementById('modeSelect').style.display = 'none';
    document.getElementById('onlinePanel').style.display = 'flex';
    document.getElementById('hostRoomId').style.display = 'none';
}

function backToModeSelect() {
    document.getElementById('onlinePanel').style.display = 'none';
    document.getElementById('modeSelect').style.display = 'flex';
    resetConnection();
}

function showConnectionStatus(text, type) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = 'connection-status ' + type;
    }
}

function copyRoomId() {
    const code = document.getElementById('roomIdText').textContent;
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        if (btn) {
            btn.textContent = '已复制!';
            setTimeout(() => btn.textContent = '复制房间号', 2000);
        }
    }).catch(() => {
        // 降级处理
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        const btn = document.querySelector('.copy-btn');
        if (btn) {
            btn.textContent = '已复制!';
            setTimeout(() => btn.textContent = '复制房间号', 2000);
        }
    });
}

function cancelConnection() {
    document.getElementById('waitingOverlay').classList.remove('show');
    resetConnection();
}

function resetConnection() {
    stopPingTest();
    
    if (connection) {
        connection.close();
        connection = null;
    }
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    connectionState = 'disconnected';
    document.getElementById('networkStatus').classList.remove('show');
    document.getElementById('hostRoomId').style.display = 'none';
    showConnectionStatus('', '');
}

// ==================== 开始联机游戏 ====================
function startOnlineGame() {
    document.getElementById('onlinePanel').style.display = 'none';
    
    player1 = new Mecha(180, true, 'blue');
    player2 = new Mecha(660, false, 'crimson');
    
    if (!isHost) {
        player1.isLocalPlayer = false;
        player2.isLocalPlayer = true;
    } else {
        player1.isLocalPlayer = true;
        player2.isLocalPlayer = false;
    }
    
    scene = new Scene();
    particles = [];
    floatingTexts = [];
    gameRunning = true;
    screenShake = { x: 0, y: 0, intensity: 0 };
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    document.getElementById('p2Controls').style.display = 'none';
    
    document.getElementById('networkStatus').classList.add('show');
    startPingTest();
    
    updateUI();
    
    // 开始状态同步
    setInterval(syncGameState, 1000 / 30);
}

// ==================== 清理 ====================
window.addEventListener('beforeunload', () => {
    resetConnection();
});

// ==================== 页面加载时初始化 ====================
document.addEventListener('DOMContentLoaded', initPeerJS);
