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
const timerDisplay = document.getElementById('timerDisplay');
const startTossupTimerBtn = document.getElementById('startTossupTimer');
const startBonusTimerBtn = document.getElementById('startBonusTimer');

let currentQuestionNumber = 1;
let currentBuzzedPlayer = null;
let timerInterval = null;
let timeRemaining = 0;
let currentQuestionType = 'tossup'; // 'tossup' or 'bonus'
let bonusEligiblePlayer = null; // Player who gets to answer the bonus

// Initialize game state
database.ref('gameState').set({
    buzzerActive: false,
    buzzer: null,
    scores: {
        player1: 0,
        player2: 0,
        player3: 0,
        player4: 0,
        player5: 0
    },
    questionNumber: 1,
    timerActive: false,
    timeRemaining: 0,
    questionType: 'tossup',
    bonusEligiblePlayer: null
});

// Timer functions
function startTimer(duration) {
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timeRemaining = duration;
    updateTimerDisplay();
    
    // Update Firebase
    database.ref('gameState').update({
        timerActive: true,
        timeRemaining: timeRemaining,
        questionType: currentQuestionType
    });
    
    // For tossup: activate buzzers when timer starts
    if (currentQuestionType === 'tossup') {
        database.ref('gameState').update({
            buzzerActive: true,
            buzzer: null
        });
        activateBuzzerBtn.disabled = true;
        activateBuzzerBtn.textContent = '⏳ Buzzers Active...';
        buzzedPlayer.textContent = 'Buzzers active! Players can buzz in now...';
    }
    
    // Start countdown
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // Update Firebase
        database.ref('gameState/timeRemaining').set(timeRemaining);
        
        if (timeRemaining <= 0) {
            stopTimer();
            
            if (currentQuestionType === 'tossup') {
                // Lock buzzers when tossup timer expires
                database.ref('gameState/buzzerActive').set(false);
                buzzedPlayer.textContent = '⏰ Time expired! No one buzzed in. Moving to next question.';
                buzzedPlayer.style.color = '#ff9800';
                activateBuzzerBtn.disabled = false;
                activateBuzzerBtn.textContent = '🔔 Activate Buzzers';
            } else if (currentQuestionType === 'bonus') {
                // Bonus time expired
                buzzedPlayer.textContent = '⏰ Bonus time expired! Score accordingly.';
                buzzedPlayer.style.color = '#ff9800';
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    database.ref('gameState').update({
        timerActive: false,
        timeRemaining: 0
    });
}

function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.style.display = 'block';
        timerDisplay.textContent = timeRemaining;
        
        // Color coding based on time remaining
        if (timeRemaining <= 3) {
            timerDisplay.style.color = '#f44336';
        } else if (timeRemaining <= 5) {
            timerDisplay.style.color = '#ff9800';
        } else {
            timerDisplay.style.color = '#4CAF50';
        }
    }
}

function updateScoringControls() {
    const scoringTitle = document.querySelector('.scoring-title');
    const pointButtons = document.querySelector('.point-buttons');
    
    if (currentQuestionType === 'tossup') {
        if (scoringTitle) scoringTitle.textContent = 'Tossup Scoring:';
        if (pointButtons) {
            pointButtons.innerHTML = `
                <button class="point-btn" data-points="-4">-4 (Interrupt/Wrong)</button>
                <button class="point-btn" data-points="4" data-action="correct">+4 (Correct - Proceed to Bonus)</button>
            `;
        }
    } else if (currentQuestionType === 'bonus') {
        if (scoringTitle) {
            const playerNum = bonusEligiblePlayer ? bonusEligiblePlayer.replace('player', '') : '?';
            scoringTitle.textContent = `Bonus for Player ${playerNum}:`;
        }
        if (pointButtons) {
            pointButtons.innerHTML = `
                <button class="point-btn bonus-correct" data-points="10">+10 (Correct)</button>
                <button class="point-btn bonus-wrong" data-points="0">0 (Wrong/No Answer)</button>
            `;
        }
    }
    
    // Re-attach event listeners to new buttons
    attachScoringListeners();
}

// Listen for game state changes
database.ref('gameState').on('value', (snapshot) => {
    const state = snapshot.val();
    if (!state) return;
    
    // Update scores
    document.getElementById('score1').textContent = state.scores.player1 || 0;
    document.getElementById('score2').textContent = state.scores.player2 || 0;
    document.getElementById('score3').textContent = state.scores.player3 || 0;
    document.getElementById('score4').textContent = state.scores.player4 || 0;
    document.getElementById('score5').textContent = state.scores.player5 || 0;
    
    // Update buzzer lights
    if (state.buzzer && state.buzzer.playerId) {
        const playerNum = state.buzzer.playerId.replace('player', '');
        currentBuzzedPlayer = state.buzzer.playerId;
        
        // Stop the timer when someone buzzes
        stopTimer();
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
        }
        
        // Update lights
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
        
        // Show who buzzed
        buzzedPlayer.textContent = `🎯 Player ${playerNum} buzzed in!`;
        buzzedPlayer.style.color = '#4CAF50';
        
        // Show scoring controls
        scoringControls.style.display = 'block';
        activateBuzzerBtn.disabled = true;
    } else if (state.questionType === 'bonus' && state.bonusEligiblePlayer) {
        // Bonus question in progress
        const playerNum = state.bonusEligiblePlayer.replace('player', '');
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
    } else {
        buzzedPlayer.textContent = 'Ready for next question...';
        buzzedPlayer.style.color = '#999';
        scoringControls.style.display = 'none';
    }
});

// Note: Buzzer activation is now handled by the tossup timer
// This button is kept for UI consistency but is disabled during tossup
activateBuzzerBtn.addEventListener('click', () => {
    // This is now handled by starting the tossup timer
    buzzedPlayer.textContent = 'Use "Start Tossup Timer" to begin the question.';
    buzzedPlayer.style.color = '#ff9800';
});

// Start tossup timer (5 seconds)
if (startTossupTimerBtn) {
    startTossupTimerBtn.addEventListener('click', () => {
        currentQuestionType = 'tossup';
        bonusEligiblePlayer = null;
        updateScoringControls();
        
        // Stop any existing timer
        stopTimer();
        
        // Start the tossup timer (this will also activate buzzers)
        startTimer(5);
        
        startTossupTimerBtn.disabled = true;
        startBonusTimerBtn.disabled = true;
        
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    });
}

// Start bonus timer (20 seconds) - only available after correct tossup answer
if (startBonusTimerBtn) {
    startBonusTimerBtn.addEventListener('click', () => {
        if (!bonusEligiblePlayer) {
            buzzedPlayer.textContent = '⚠️ Bonus only available after a correct tossup answer!';
            buzzedPlayer.style.color = '#f44336';
            return;
        }
        
        currentQuestionType = 'bonus';
        updateScoringControls();
        
        // Show which player gets the bonus
        const playerNum = bonusEligiblePlayer.replace('player', '');
        buzzedPlayer.textContent = `📝 Bonus question for Player ${playerNum}. 20 seconds to answer.`;
        buzzedPlayer.style.color = '#2196F3';
        
        // Bonus questions don't use buzzers - player just answers
        database.ref('gameState').update({
            buzzerActive: false,
            questionType: 'bonus',
            bonusEligiblePlayer: bonusEligiblePlayer
        });
        
        startTimer(20);
        startTossupTimerBtn.disabled = true;
        startBonusTimerBtn.disabled = true;
        
        scoringControls.style.display = 'block';
    });
}

// Next question (resets buzzers and timer)
nextQuestionBtn.addEventListener('click', () => {
    currentQuestionNumber++;
    questionNum.textContent = currentQuestionNumber;
    
    // Stop any active timer
    stopTimer();
    if (timerDisplay) {
        timerDisplay.textContent = '0';
        timerDisplay.style.color = '#999';
        timerDisplay.style.display = 'none';
    }
    
    // Reset to tossup mode
    currentQuestionType = 'tossup';
    bonusEligiblePlayer = null;
    updateScoringControls();
    
    database.ref('gameState').update({
        buzzerActive: false,
        buzzer: null,
        questionNumber: currentQuestionNumber,
        timerActive: false,
        timeRemaining: 0,
        questionType: 'tossup',
        bonusEligiblePlayer: null
    });
    
    activateBuzzerBtn.disabled = false;
    activateBuzzerBtn.textContent = '🔔 Ready for Tossup';
    if (startTossupTimerBtn) startTossupTimerBtn.disabled = false;
    if (startBonusTimerBtn) startBonusTimerBtn.disabled = true;
    currentBuzzedPlayer = null;
    buzzedPlayer.textContent = 'Ready for next tossup question...';
    buzzedPlayer.style.color = '#999';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    scoringControls.style.display = 'none';
});

// Award/deduct points
function attachScoringListeners() {
    document.querySelectorAll('.point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const points = parseInt(btn.dataset.points);
            const action = btn.dataset.action;
            
            if (currentQuestionType === 'tossup') {
                // Tossup: Award/deduct points to the player who buzzed
                if (!currentBuzzedPlayer) return;
                
                database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
                    return Math.max(0, (score || 0) + points);
                });
                
                // Visual feedback
                btn.style.transform = 'scale(0.9)';
                setTimeout(() => btn.style.transform = 'scale(1)', 100);
                
                if (action === 'correct' && points > 0) {
                    // Correct tossup answer - enable bonus
                    bonusEligiblePlayer = currentBuzzedPlayer;
                    const playerNum = currentBuzzedPlayer.replace('player', '');
                    
                    database.ref('gameState/bonusEligiblePlayer').set(bonusEligiblePlayer);
                    
                    buzzedPlayer.textContent = `✅ Correct! Player ${playerNum} earned +4 points. Start bonus timer to continue.`;
                    buzzedPlayer.style.color = '#4CAF50';
                    
                    // Enable bonus timer button
                    if (startBonusTimerBtn) startBonusTimerBtn.disabled = false;
                    startTossupTimerBtn.disabled = true;
                    
                    // Hide tossup scoring, ready for bonus
                    scoringControls.style.display = 'none';
                } else if (points < 0) {
                    // Wrong interrupt
                    const playerNum = currentBuzzedPlayer.replace('player', '');
                    buzzedPlayer.textContent = `❌ Interrupt penalty! Player ${playerNum} loses 4 points.`;
                    buzzedPlayer.style.color = '#f44336';
                    
                    // Can continue with same tossup or move to next
                    startTossupTimerBtn.disabled = false;
                    scoringControls.style.display = 'none';
                }
                
            } else if (currentQuestionType === 'bonus') {
                // Bonus: Award points only to the eligible player
                if (!bonusEligiblePlayer) return;
                
                if (points === 10) {
                    // Correct bonus answer
                    database.ref(`gameState/scores/${bonusEligiblePlayer}`).transaction((score) => {
                        return (score || 0) + 10;
                    });
                    
                    const playerNum = bonusEligiblePlayer.replace('player', '');
                    buzzedPlayer.textContent = `✅ Bonus correct! Player ${playerNum} earned +10 points!`;
                    buzzedPlayer.style.color = '#4CAF50';
                } else {
                    // Wrong or no answer
                    const playerNum = bonusEligiblePlayer.replace('player', '');
                    buzzedPlayer.textContent = `❌ Bonus incorrect. Player ${playerNum} receives no bonus points.`;
                    buzzedPlayer.style.color = '#f44336';
                }
                
                // Visual feedback
                btn.style.transform = 'scale(0.9)';
                setTimeout(() => btn.style.transform = 'scale(1)', 100);
                
                // Reset for next question
                bonusEligiblePlayer = null;
                startTossupTimerBtn.disabled = false;
                startBonusTimerBtn.disabled = true;
                scoringControls.style.display = 'none';
            }
        });
    });
}

// Initial attachment
attachScoringListeners();

// Reset game
resetGameBtn.addEventListener('click', () => {
    if (confirm('Reset all scores and question counter?')) {
        currentQuestionNumber = 1;
        questionNum.textContent = 1;
        
        // Stop any active timer
        stopTimer();
        if (timerDisplay) {
            timerDisplay.textContent = '0';
            timerDisplay.style.color = '#999';
            timerDisplay.style.display = 'none';
        }
        
        // Reset to tossup mode
        currentQuestionType = 'tossup';
        bonusEligiblePlayer = null;
        updateScoringControls();
        
        database.ref('gameState').set({
            buzzerActive: false,
            buzzer: null,
            scores: {
                player1: 0,
                player2: 0,
                player3: 0,
                player4: 0,
                player5: 0
            },
            questionNumber: 1,
            timerActive: false,
            timeRemaining: 0,
            questionType: 'tossup',
            bonusEligiblePlayer: null
        });
        
        activateBuzzerBtn.disabled = false;
        activateBuzzerBtn.textContent = '🔔 Ready for Tossup';
        if (startTossupTimerBtn) startTossupTimerBtn.disabled = false;
        if (startBonusTimerBtn) startBonusTimerBtn.disabled = true;
        currentBuzzedPlayer = null;
        buzzedPlayer.textContent = 'Game reset! Ready for question 1.';
        buzzedPlayer.style.color = '#999';
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        scoringControls.style.display = 'none';
    }
});