// Get player ID from URL
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('id') || '1';
const playerColors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];
const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

// DOM elements
const playerName = document.getElementById('playerName');
const playerScore = document.getElementById('playerScore');
const statusMessage = document.getElementById('statusMessage');
const buzzer = document.getElementById('buzzer');
const answerContainer = document.getElementById('answerContainer');
const answerInput = document.getElementById('answerInput');
const submitAnswer = document.getElementById('submitAnswer');
const questionDisplay = document.getElementById('questionDisplay');

// Set player identity
playerName.textContent = playerNames[playerId - 1];
playerName.style.color = playerColors[playerId - 1];
document.body.style.setProperty('--player-color', playerColors[playerId - 1]);

// Game state
let canBuzz = false;
let hasBuzzed = false;

// Listen to game state
database.ref('gameState').on('value', (snapshot) => {
    const state = snapshot.val();
    if (!state) return;
    
    // Update score
    if (state.scores && state.scores[`player${playerId}`] !== undefined) {
        playerScore.textContent = state.scores[`player${playerId}`];
    }
    
    // Hide question text - players only hear it
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
        answerContainer.style.display = 'none';
    } else {
        canBuzz = false;
        buzzer.disabled = true;
        buzzer.classList.add('locked');
    }
    
    // Check if this player buzzed in
    if (state.buzzer && state.buzzer.playerId === `player${playerId}`) {
        statusMessage.textContent = 'You buzzed in! Answer now:';
        answerContainer.style.display = 'block';
        answerInput.focus();
    } else if (state.buzzer && state.buzzer.playerId) {
        const buzzedPlayerNum = state.buzzer.playerId.replace('player', '');
        statusMessage.textContent = `Player ${buzzedPlayerNum} buzzed in`;
        buzzer.classList.add('locked');
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

// Submit answer
submitAnswer.addEventListener('click', submitPlayerAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitPlayerAnswer();
});

function submitPlayerAnswer() {
    const answer = answerInput.value.trim();
    if (!answer) return;
    
    database.ref('gameState/playerAnswer').set({
        playerId: `player${playerId}`,
        answer: answer,
        timestamp: Date.now()
    });
    
    answerInput.value = '';
    answerContainer.style.display = 'none';
    statusMessage.textContent = 'Answer submitted! Waiting for moderator...';
}