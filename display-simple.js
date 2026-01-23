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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elements
const questionNum = document.getElementById('questionNum');
const buzzedPlayer = document.getElementById('buzzedPlayer');
const activateBuzzerBtn = document.getElementById('activateBuzzer');
const nextQuestionBtn = document.getElementById('nextQuestion');
const resetGameBtn = document.getElementById('resetGame');
const scoringControls = document.getElementById('scoringControls');

let currentQuestionNumber = 1;
let currentBuzzedPlayer = null;

// Initialize game state
database.ref('gameState').set({
    buzzerActive: false,
    buzzer: null,
    scores: {
        player1: 0,
        player2: 0,
        player3: 0,
        player4: 0
    },
    questionNumber: 1
});

// Listen for game state changes
database.ref('gameState').on('value', (snapshot) => {
    const state = snapshot.val();
    if (!state) return;
    
    // Update scores
    document.getElementById('score1').textContent = state.scores.player1 || 0;
    document.getElementById('score2').textContent = state.scores.player2 || 0;
    document.getElementById('score3').textContent = state.scores.player3 || 0;
    document.getElementById('score4').textContent = state.scores.player4 || 0;
    
    // Update buzzer lights
    if (state.buzzer && state.buzzer.playerId) {
        const playerNum = state.buzzer.playerId.replace('player', '');
        currentBuzzedPlayer = state.buzzer.playerId;
        
        // Update lights
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
        
        // Show who buzzed
        buzzedPlayer.textContent = `🎯 Player ${playerNum} buzzed in!`;
        buzzedPlayer.style.color = '#4CAF50';
        
        // Show scoring controls
        scoringControls.style.display = 'block';
        activateBuzzerBtn.disabled = true;
    } else {
        buzzedPlayer.textContent = 'Waiting for buzz...';
        buzzedPlayer.style.color = '#999';
        scoringControls.style.display = 'none';
    }
});

// Activate buzzers
activateBuzzerBtn.addEventListener('click', () => {
    database.ref('gameState').update({
        buzzerActive: true,
        buzzer: null
    });
    activateBuzzerBtn.disabled = true;
    activateBuzzerBtn.textContent = '⏳ Buzzers Active...';
    buzzedPlayer.textContent = 'Buzzers ready! Waiting for first buzz...';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
});

// Next question (resets buzzers)
nextQuestionBtn.addEventListener('click', () => {
    currentQuestionNumber++;
    questionNum.textContent = currentQuestionNumber;
    
    database.ref('gameState').update({
        buzzerActive: false,
        buzzer: null,
        questionNumber: currentQuestionNumber
    });
    
    activateBuzzerBtn.disabled = false;
    activateBuzzerBtn.textContent = '🔔 Activate Buzzers';
    currentBuzzedPlayer = null;
    buzzedPlayer.textContent = 'Waiting for next question...';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    scoringControls.style.display = 'none';
});

// Award/deduct points
document.querySelectorAll('.point-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentBuzzedPlayer) return;
        
        const points = parseInt(btn.dataset.points);
        
        database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
            return Math.max(0, (score || 0) + points);
        });
        
        // Visual feedback
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100);
    });
});

// Reset game
resetGameBtn.addEventListener('click', () => {
    if (confirm('Reset all scores and question counter?')) {
        currentQuestionNumber = 1;
        questionNum.textContent = 1;
        
        database.ref('gameState').set({
            buzzerActive: false,
            buzzer: null,
            scores: {
                player1: 0,
                player2: 0,
                player3: 0,
                player4: 0
            },
            questionNumber: 1
        });
        
        activateBuzzerBtn.disabled = false;
        activateBuzzerBtn.textContent = '🔔 Activate Buzzers';
        currentBuzzedPlayer = null;
        buzzedPlayer.textContent = 'Game reset! Ready for question 1.';
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        scoringControls.style.display = 'none';
    }
});