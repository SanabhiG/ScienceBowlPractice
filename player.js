// Get player ID from URL
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('id') || '1';
const playerColors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

// Buzzer sound frequencies (different for each player)
const buzzerFrequencies = [523.25, 659.25, 783.99, 880.00]; // C5, E5, G5, A5

// DOM elements
const playerName = document.getElementById('playerName');
const playerScore = document.getElementById('playerScore');
const statusMessage = document.getElementById('statusMessage');
const buzzer = document.getElementById('buzzer');
const questionDisplay = document.getElementById('questionDisplay');

// Set player identity
playerName.textContent = playerNames[playerId - 1];
playerName.style.color = playerColors[playerId - 1];
document.body.style.setProperty('--player-color', playerColors[playerId - 1]);

// Game state
let canBuzz = false;
let hasBuzzed = false;

// Audio context for buzzer sounds
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBuzzerSound(playerNum) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = buzzerFrequencies[playerNum - 1];
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Listen to game state
database.ref('gameState').on('value', (snapshot) => {
    const state = snapshot.val();
    if (!state) return;
    
    // Update score
    if (state.scores && state.scores[`player${playerId}`] !== undefined) {
        playerScore.textContent = state.scores[`player${playerId}`];
    }
    
    // Show question status
    if (state.isReading) {
        questionDisplay.textContent = '🔊 Listen to the question...';
        questionDisplay.style.display = 'block';
    } else if (state.currentQuestion) {
        questionDisplay.textContent = 'Question loaded. Waiting for moderator to read...';
        questionDisplay.style.display = 'block';
    } else {
        questionDisplay.style.display = 'none';
    }
    
    // Update buzzer state
    if (state.buzzerActive) {
        canBuzz = true;
        hasBuzzed = false;
        buzzer.disabled = false;
        buzzer.classList.remove('locked');
        statusMessage.textContent = 'Ready to buzz!';
    } else {
        canBuzz = false;
        buzzer.disabled = true;
        buzzer.classList.add('locked');
    }
    
    // Check if this player buzzed in
    if (state.buzzer && state.buzzer.playerId === `player${playerId}`) {
        statusMessage.textContent = '🎯 You buzzed in! Answer verbally to the moderator.';
        buzzer.classList.add('locked');
    } else if (state.buzzer && state.buzzer.playerId) {
        const buzzedPlayerNum = state.buzzer.playerId.replace('player', '');
        statusMessage.textContent = `Player ${buzzedPlayerNum} buzzed in`;
        buzzer.classList.add('locked');
    }
});

// Listen for buzzer events to play sounds
database.ref('gameState/buzzer').on('value', (snapshot) => {
    const buzzer = snapshot.val();
    if (buzzer && buzzer.playerId) {
        const playerNum = parseInt(buzzer.playerId.replace('player', ''));
        playBuzzerSound(playerNum);
    }
});

// Buzzer click
buzzer.addEventListener('click', buzzIn);

// Spacebar to buzz
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && canBuzz && !hasBuzzed) {
        e.preventDefault();
        buzzIn();
    }
});

function buzzIn() {
    if (!canBuzz || hasBuzzed) return;
    
    hasBuzzed = true;
    database.ref('gameState/buzzer').set({
        playerId: `player${playerId}`,
        timestamp: Date.now()
    });
    
    // Visual feedback
    buzzer.classList.add('buzzed');
    setTimeout(() => buzzer.classList.remove('buzzed'), 300);
}