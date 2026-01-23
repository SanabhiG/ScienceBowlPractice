// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNk5EGWDPBr8MkUFNdfvhP1NvnDxWERq8",
  authDomain: "science-bowl-practice-8800a.firebaseapp.com",
  databaseURL: "https://science-bowl-practice-8800a-default-rtdb.firebaseio.com",
  projectId: "science-bowl-practice-8800a",
  storageBucket: "science-bowl-practice-8800a.firebasestorage.app",
  messagingSenderId: "240054855565",
  appId: "1:240054855565:web:2897ab544b9f1c1b3d3fc4",
  measurementId: "G-4TD0W788X5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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
let audioContext = null;

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playBuzzerSound(playerNum) {
    const ctx = initAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = buzzerFrequencies[playerNum - 1];
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
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
        statusMessage.style.color = '#4CAF50';
    } else {
        canBuzz = false;
        buzzer.disabled = true;
        buzzer.classList.add('locked');
        if (!state.buzzer) {
            statusMessage.textContent = 'Waiting for question...';
            statusMessage.style.color = '#999';
        }
    }
    
    // Check if this player buzzed in
    if (state.buzzer && state.buzzer.playerId === `player${playerId}`) {
        statusMessage.textContent = '🎯 You buzzed in! Answer verbally to the moderator.';
        statusMessage.style.color = '#2196F3';
        buzzer.classList.add('locked');
        
        // Vibrate if available
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    } else if (state.buzzer && state.buzzer.playerId) {
        const buzzedPlayerNum = state.buzzer.playerId.replace('player', '');
        statusMessage.textContent = `Player ${buzzedPlayerNum} buzzed in`;
        statusMessage.style.color = '#ff9800';
        buzzer.classList.add('locked');
    }
});

// Listen for buzzer events to play sounds
database.ref('gameState/buzzer').on('value', (snapshot) => {
    const buzzerData = snapshot.val();
    if (buzzerData && buzzerData.playerId) {
        const playerNum = parseInt(buzzerData.playerId.replace('player', ''));
        try {
            playBuzzerSound(playerNum);
        } catch (e) {
            console.log('Audio context not ready:', e);
        }
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
    
    // Initialize audio context on first interaction
    initAudioContext();
    
    hasBuzzed = true;
    canBuzz = false;
    
    database.ref('gameState/buzzer').set({
        playerId: `player${playerId}`,
        timestamp: Date.now()
    });
    
    database.ref('gameState/buzzerActive').set(false);
    
    // Visual feedback
    buzzer.classList.add('buzzed');
    setTimeout(() => buzzer.classList.remove('buzzed'), 300);
    
    console.log(`Player ${playerId} buzzed in!`);
}

// Log when connected
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('Connected to Firebase');
    } else {
        console.log('Disconnected from Firebase');
    }
});