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
const finishReadingBtn = document.getElementById('finishReading');
const nextQuestionBtn = document.getElementById('nextQuestion');
const resetGameBtn = document.getElementById('resetGame');
const scoringControls = document.getElementById('scoringControls');
const timerDisplay = document.getElementById('timerDisplay');
const startBonusTimerBtn = document.getElementById('startBonusTimer');

let currentQuestionNumber = 1;
let currentBuzzedPlayer = null;
let timerInterval = null;
let timeRemaining = 0;
let currentQuestionType = 'tossup'; // 'tossup' or 'bonus'
let bonusEligiblePlayer = null;
let isReading = false; // Track if moderator is still reading
let questionFinished = false; // Track if question reading is complete

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
    bonusEligiblePlayer: null,
    isReading: false,
    questionFinished: false
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
        timeRemaining: timeRemaining
    });
    
    // Start countdown
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // Update Firebase
        database.ref('gameState/timeRemaining').set(timeRemaining);
        
        if (timeRemaining <= 0) {
            stopTimer();
            
            if (currentQuestionType === 'tossup') {
                // Lock buzzers when answer timer expires
                database.ref('gameState/buzzerActive').set(false);
                buzzedPlayer.textContent = '⏰ Time expired! No points awarded. Click "Next Question" to continue.';
                buzzedPlayer.style.color = '#ff9800';
                scoringControls.style.display = 'none';
            } else if (currentQuestionType === 'bonus') {
                // Bonus time expired
                buzzedPlayer.textContent = '⏰ Bonus time expired! Score accordingly (0 points if wrong/no answer).';
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
        if (timeRemaining <= 2) {
            timerDisplay.style.color = '#f44336';
            timerDisplay.style.fontSize = '4rem';
        } else if (timeRemaining <= 3) {
            timerDisplay.style.color = '#ff9800';
            timerDisplay.style.fontSize = '3rem';
        } else {
            timerDisplay.style.color = '#4CAF50';
            timerDisplay.style.fontSize = '2.5rem';
        }
    }
}

function updateScoringControls() {
    const scoringTitle = document.querySelector('.scoring-title');
    const pointButtons = document.querySelector('.point-buttons');
    
    if (currentQuestionType === 'tossup') {
        if (isReading && !questionFinished) {
            // Interrupt situation
            if (scoringTitle) scoringTitle.textContent = 'Interrupt Scoring:';
            if (pointButtons) {
                pointButtons.innerHTML = `
                    <button class="point-btn" data-points="-4" data-action="wrong-interrupt">-4 (Wrong - Continue Reading)</button>
                    <button class="point-btn" data-points="4" data-action="correct-interrupt">+4 (Correct - Proceed to Bonus)</button>
                `;
            }
        } else if (questionFinished) {
            // After question finished
            if (scoringTitle) scoringTitle.textContent = 'Tossup Scoring (After Question):';
            if (pointButtons) {
                pointButtons.innerHTML = `
                    <button class="point-btn" data-points="0" data-action="wrong-post">0 (Wrong - No Penalty)</button>
                    <button class="point-btn" data-points="4" data-action="correct-post">+4 (Correct - Proceed to Bonus)</button>
                `;
            }
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
        
        // Update lights
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
        
        // Show who buzzed
        if (isReading && !questionFinished) {
            buzzedPlayer.textContent = `⚠️ Player ${playerNum} interrupted! 5 seconds to answer...`;
            buzzedPlayer.style.color = '#ff9800';
        } else {
            buzzedPlayer.textContent = `🎯 Player ${playerNum} buzzed in! 5 seconds to answer...`;
            buzzedPlayer.style.color = '#4CAF50';
        }
        
        // Show scoring controls
        scoringControls.style.display = 'block';
        activateBuzzerBtn.disabled = true;
        if (finishReadingBtn) finishReadingBtn.disabled = true;
    } else if (state.questionType === 'bonus' && state.bonusEligiblePlayer) {
        // Bonus question in progress
        const playerNum = state.bonusEligiblePlayer.replace('player', '');
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
    } else {
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    }
});

// Listen for buzzer events to auto-start the 5-second timer
database.ref('gameState/buzzer').on('value', (snapshot) => {
    const buzzerData = snapshot.val();
    
    if (buzzerData && buzzerData.playerId && currentQuestionType === 'tossup') {
        // Someone buzzed in during tossup - automatically start 5 second timer
        stopTimer(); // Stop any existing timer
        startTimer(5);
        
        const playerNum = buzzerData.playerId.replace('player', '');
        console.log(`Player ${playerNum} buzzed - starting 5 second answer timer`);
    }
});

// Activate Buzzers button (start reading tossup question)
activateBuzzerBtn.addEventListener('click', () => {
    currentQuestionType = 'tossup';
    bonusEligiblePlayer = null;
    isReading = true;
    questionFinished = false;
    updateScoringControls();
    
    database.ref('gameState').update({
        buzzerActive: true,
        buzzer: null,
        questionType: 'tossup',
        isReading: true,
        questionFinished: false
    });
    
    activateBuzzerBtn.disabled = true;
    activateBuzzerBtn.textContent = '📖 Reading Question...';
    if (finishReadingBtn) {
        finishReadingBtn.disabled = false;
        finishReadingBtn.style.display = 'inline-block';
    }
    if (startBonusTimerBtn) startBonusTimerBtn.disabled = true;
    
    buzzedPlayer.textContent = '📖 Reading question - Players can interrupt at any time!';
    buzzedPlayer.style.color = '#2196F3';
    
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    
    // Hide timer until someone buzzes
    if (timerDisplay) {
        timerDisplay.style.display = 'none';
    }
});

// Finish Reading button (question is complete)
if (finishReadingBtn) {
    finishReadingBtn.addEventListener('click', () => {
        isReading = false;
        questionFinished = true;
        updateScoringControls();
        
        database.ref('gameState').update({
            isReading: false,
            questionFinished: true,
            buzzerActive: true // Keep buzzers active after question finished
        });
        
        finishReadingBtn.disabled = true;
        finishReadingBtn.style.display = 'none';
        
        buzzedPlayer.textContent = '✅ Question complete - Players can now buzz in (no interrupt penalty)';
        buzzedPlayer.style.color = '#4CAF50';
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
        isReading = true;
        questionFinished = false;
        updateScoringControls();
        
        // Show which player gets the bonus
        const playerNum = bonusEligiblePlayer.replace('player', '');
        buzzedPlayer.textContent = `📝 Bonus question for Player ${playerNum}. 20 seconds to answer.`;
        buzzedPlayer.style.color = '#2196F3';
        
        // Bonus questions don't use buzzers - player just answers
        database.ref('gameState').update({
            buzzerActive: false,
            questionType: 'bonus',
            bonusEligiblePlayer: bonusEligiblePlayer,
            isReading: true,
            questionFinished: false
        });
        
        startTimer(20);
        activateBuzzerBtn.disabled = true;
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
    isReading = false;
    questionFinished = false;
    updateScoringControls();
    
    database.ref('gameState').update({
        buzzerActive: false,
        buzzer: null,
        questionNumber: currentQuestionNumber,
        timerActive: false,
        timeRemaining: 0,
        questionType: 'tossup',
        bonusEligiblePlayer: null,
        isReading: false,
        questionFinished: false
    });
    
    activateBuzzerBtn.disabled = false;
    activateBuzzerBtn.textContent = '🔔 Start Reading Question';
    if (finishReadingBtn) {
        finishReadingBtn.disabled = true;
        finishReadingBtn.style.display = 'none';
    }
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
                
                const playerNum = currentBuzzedPlayer.replace('player', '');
                
                if (action === 'correct-interrupt' || action === 'correct-post') {
                    // Correct answer - enable bonus
                    bonusEligiblePlayer = currentBuzzedPlayer;
                    
                    database.ref('gameState').update({
                        bonusEligiblePlayer: bonusEligiblePlayer,
                        buzzerActive: false,
                        isReading: false,
                        questionFinished: false
                    });
                    
                    stopTimer();
                    
                    buzzedPlayer.textContent = `✅ Correct! Player ${playerNum} earned +4 points. Start bonus timer to continue.`;
                    buzzedPlayer.style.color = '#4CAF50';
                    
                    // Enable bonus timer button
                    if (startBonusTimerBtn) startBonusTimerBtn.disabled = false;
                    activateBuzzerBtn.disabled = true;
                    if (finishReadingBtn) {
                        finishReadingBtn.disabled = true;
                        finishReadingBtn.style.display = 'none';
                    }
                    
                    // Hide tossup scoring, ready for bonus
                    scoringControls.style.display = 'none';
                    
                } else if (action === 'wrong-interrupt') {
                    // Wrong interrupt - deduct 4 points and continue reading
                    buzzedPlayer.textContent = `❌ Wrong interrupt! Player ${playerNum} loses 4 points. Continue reading question...`;
                    buzzedPlayer.style.color = '#f44336';
                    
                    stopTimer();
                    
                    // Reactivate buzzers for other players to try
                    database.ref('gameState').update({
                        buzzerActive: true,
                        buzzer: null,
                        isReading: true,
                        questionFinished: false
                    });
                    
                    isReading = true;
                    questionFinished = false;
                    
                    activateBuzzerBtn.disabled = true;
                    activateBuzzerBtn.textContent = '📖 Reading Question...';
                    if (finishReadingBtn) {
                        finishReadingBtn.disabled = false;
                        finishReadingBtn.style.display = 'inline-block';
                    }
                    scoringControls.style.display = 'none';
                    
                    // Reset lights
                    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
                    
                } else if (action === 'wrong-post') {
                    // Wrong answer after question finished - no penalty
                    buzzedPlayer.textContent = `❌ Wrong answer. Player ${playerNum} receives no points. Click "Next Question" or wait for other players.`;
                    buzzedPlayer.style.color = '#f44336';
                    
                    stopTimer();
                    
                    // Reactivate buzzers for other players
                    database.ref('gameState').update({
                        buzzerActive: true,
                        buzzer: null,
                        questionFinished: true
                    });
                    
                    scoringControls.style.display = 'none';
                    
                    // Reset lights
                    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
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
                
                stopTimer();
                
                // Reset for next question
                bonusEligiblePlayer = null;
                database.ref('gameState').update({
                    bonusEligiblePlayer: null,
                    isReading: false,
                    questionFinished: false
                });
                
                activateBuzzerBtn.disabled = false;
                activateBuzzerBtn.textContent = '🔔 Start Reading Question';
                if (startBonusTimerBtn) startBonusTimerBtn.disabled = true;
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
        isReading = false;
        questionFinished = false;
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
            bonusEligiblePlayer: null,
            isReading: false,
            questionFinished: false
        });
        
        activateBuzzerBtn.disabled = false;
        activateBuzzerBtn.textContent = '🔔 Start Reading Question';
        if (finishReadingBtn) {
            finishReadingBtn.disabled = true;
            finishReadingBtn.style.display = 'none';
        }
        if (startBonusTimerBtn) startBonusTimerBtn.disabled = true;
        currentBuzzedPlayer = null;
        buzzedPlayer.textContent = 'Game reset! Ready for question 1.';
        buzzedPlayer.style.color = '#999';
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        scoringControls.style.display = 'none';
    }
});