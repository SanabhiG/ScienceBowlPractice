// Use CORS proxy to bypass restrictions
const CORS_PROXY = 'https://corsproxy.io/?';
const API_URL = 'https://scibowldb.com/api/questions/random';

// DOM elements
const questionText = document.getElementById('questionText');
const questionCategory = document.getElementById('questionCategory');
const questionNum = document.getElementById('questionNum');
const correctAnswer = document.getElementById('correctAnswer');
const playerAnswer = document.getElementById('playerAnswer');
const answerSection = document.getElementById('answerSection');
const buzzedPlayer = document.getElementById('buzzedPlayer');

const newQuestionBtn = document.getElementById('newQuestion');
const activateBuzzerBtn = document.getElementById('activateBuzzer');
const markCorrectBtn = document.getElementById('markCorrect');
const markIncorrectBtn = document.getElementById('markIncorrect');
const showAnswerBtn = document.getElementById('showAnswer');
const resetGameBtn = document.getElementById('resetGame');
const readQuestionBtn = document.getElementById('readQuestion');

let currentQuestion = null;
let currentQuestionNumber = 1;
let currentBuzzedPlayer = null;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Initialize game state
database.ref('gameState').set({
    buzzerActive: false,
    currentQuestion: null,
    scores: {
        player1: 0,
        player2: 0,
        player3: 0,
        player4: 0
    },
    questionNumber: 1,
    isReading: false
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
        
        // Light up the buzzer
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
        
        buzzedPlayer.textContent = `Player ${playerNum} buzzed in!`;
        
        // Stop reading when someone buzzes
        if (currentUtterance) {
            speechSynthesis.cancel();
        }
        
        // Show grading buttons
        markCorrectBtn.style.display = 'inline-block';
        markIncorrectBtn.style.display = 'inline-block';
        showAnswerBtn.style.display = 'inline-block';
    }
    
    // Update player answer
    if (state.playerAnswer) {
        playerAnswer.textContent = state.playerAnswer.answer;
        answerSection.style.display = 'block';
    }
});

// Fetch new question
newQuestionBtn.addEventListener('click', async () => {
    const categories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
        .map(cb => cb.value);
    
    try {
        // Just fetch a random question without filtering
        const response = await fetch(API_URL, {
            method: 'GET'  // Changed to GET - simpler
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // The API returns the question directly, not wrapped
        currentQuestion = data;
        
        console.log('Fetched question:', currentQuestion);
        
        questionText.textContent = currentQuestion.tossup_question;
        questionCategory.textContent = currentQuestion.category;
        correctAnswer.textContent = currentQuestion.tossup_answer;
        questionNum.textContent = currentQuestionNumber;
        
        // Update Firebase
        await database.ref('gameState').update({
            currentQuestion: currentQuestion,
            buzzerActive: false,
            buzzer: null,
            playerAnswer: null,
            questionNumber: currentQuestionNumber,
            isReading: false
        });
        
        // Reset UI
        answerSection.style.display = 'none';
        buzzedPlayer.textContent = '';
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        markCorrectBtn.style.display = 'none';
        markIncorrectBtn.style.display = 'none';
        showAnswerBtn.style.display = 'none';
        
        activateBuzzerBtn.disabled = false;
        readQuestionBtn.disabled = false;
        currentQuestionNumber++;
        
        console.log('Question loaded successfully!');
        
    } catch (error) {
        console.error('Error fetching question:', error);
        alert('Error loading question. The API might be down. Check console for details.');
    }
});

// Read question aloud
readQuestionBtn.addEventListener('click', () => {
    if (!currentQuestion) {
        alert('Load a question first!');
        return;
    }
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(currentQuestion.tossup_question);
    currentUtterance.rate = 0.9; // Slightly slower for clarity
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;
    
    // Update Firebase that we're reading
    database.ref('gameState/isReading').set(true);
    
    currentUtterance.onend = () => {
        database.ref('gameState/isReading').set(false);
        console.log('Finished reading question');
    };
    
    speechSynthesis.speak(currentUtterance);
    readQuestionBtn.textContent = '🔊 Reading...';
    readQuestionBtn.disabled = true;
    
    setTimeout(() => {
        readQuestionBtn.textContent = '🔊 Read Question';
        readQuestionBtn.disabled = false;
    }, 2000);
});

// Activate buzzers
activateBuzzerBtn.addEventListener('click', () => {
    database.ref('gameState').update({
        buzzerActive: true,
        buzzer: null,
        playerAnswer: null
    });
    activateBuzzerBtn.disabled = true;
    answerSection.style.display = 'none';
});

// Mark correct
markCorrectBtn.addEventListener('click', () => {
    if (!currentBuzzedPlayer) return;
    
    database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
        return (score || 0) + 4;
    });
    
    resetForNextQuestion();
});

// Mark incorrect
markIncorrectBtn.addEventListener('click', () => {
    if (!currentBuzzedPlayer) return;
    
    database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
        return (score || 0) - 4;
    });
    
    // Reactivate buzzers for other players
    database.ref('gameState').update({
        buzzerActive: true,
        buzzer: null,
        playerAnswer: null
    });
    
    answerSection.style.display = 'none';
    markCorrectBtn.style.display = 'none';
    markIncorrectBtn.style.display = 'none';
    showAnswerBtn.style.display = 'none';
});

// Show answer
showAnswerBtn.addEventListener('click', () => {
    answerSection.style.display = 'block';
});

// Reset game
resetGameBtn.addEventListener('click', () => {
    if (confirm('Reset all scores and start over?')) {
        currentQuestionNumber = 1;
        speechSynthesis.cancel();
        database.ref('gameState').set({
            buzzerActive: false,
            currentQuestion: null,
            scores: {
                player1: 0,
                player2: 0,
                player3: 0,
                player4: 0
            },
            questionNumber: 1,
            isReading: false
        });
        questionText.textContent = 'Click "New Question" to start';
        answerSection.style.display = 'none';
    }
});

function resetForNextQuestion() {
    speechSynthesis.cancel();
    database.ref('gameState').update({
        buzzerActive: false,
        buzzer: null,
        playerAnswer: null,
        isReading: false
    });
    
    buzzedPlayer.textContent = '';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    markCorrectBtn.style.display = 'none';
    markIncorrectBtn.style.display = 'none';
    showAnswerBtn.style.display = 'none';
    answerSection.style.display = 'none';
    currentBuzzedPlayer = null;
}