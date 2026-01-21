// Use CORS proxy to bypass restrictions
const CORS_PROXY = 'https://corsproxy.io/?';
const API_URL = 'https://scibowldb.com/api/questions/random';

// DOM elements
const questionText = document.getElementById('questionText');
const questionCategory = document.getElementById('questionCategory');
const questionNum = document.getElementById('questionNum');
const correctAnswer = document.getElementById('correctAnswer');
const answerSection = document.getElementById('answerSection');
const buzzedPlayer = document.getElementById('buzzedPlayer');
const timerDisplay = document.getElementById('timerDisplay');

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
let voicesLoaded = false;
let isShowingBonus = false;
let timerInterval = null;
let timeRemaining = 0;

// Track used questions to avoid repeats
let usedQuestionIds = new Set();
let allQuestions = [];
let questionsLoaded = false;

// Load voices
function loadVoices() {
    return new Promise((resolve) => {
        let voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
            resolve(voices);
        } else {
            speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                voicesLoaded = true;
                resolve(voices);
            };
        }
    });
}

loadVoices().then(() => {
    console.log('Voices loaded:', speechSynthesis.getVoices().length);
});

// Load all questions once at startup
async function loadAllQuestions() {
    if (questionsLoaded) return;
    
    try {
        console.log('Loading all questions from database...');
        const response = await fetch(CORS_PROXY + encodeURIComponent('https://scibowldb.com/api/questions'), {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        
        const data = await response.json();
        allQuestions = data.questions || data;
        questionsLoaded = true;
        console.log(`Loaded ${allQuestions.length} questions!`);
        
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Could not load question database. Will use random API instead (may repeat questions).');
    }
}

// Start loading questions immediately
loadAllQuestions();

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
        
        document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
        document.getElementById(`light${playerNum}`).classList.add('active');
        
        buzzedPlayer.textContent = `Player ${playerNum} buzzed in!`;
        
        // Stop reading and timer when someone buzzes
        if (currentUtterance && speechSynthesis.speaking) {
            speechSynthesis.cancel();
            readQuestionBtn.textContent = '🔊 Read Question';
            readQuestionBtn.disabled = false;
        }
        stopTimer();
        
        markCorrectBtn.style.display = 'inline-block';
        markIncorrectBtn.style.display = 'inline-block';
        showAnswerBtn.style.display = 'inline-block';
    }
});

// Timer functions
function startTimer(seconds) {
    stopTimer();
    timeRemaining = seconds;
    timerDisplay.textContent = `Time: ${seconds}s`;
    timerDisplay.style.display = 'block';
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = `Time: ${timeRemaining}s`;
        
        if (timeRemaining <= 0) {
            stopTimer();
            timerDisplay.textContent = 'Time\'s up!';
            setTimeout(() => {
                timerDisplay.style.display = 'none';
            }, 2000);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Get filtered questions based on user selection
function getFilteredQuestions() {
    const categories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
        .map(cb => cb.value);
    
    const source = document.getElementById('sourceSelect').value;
    const roundNum = document.getElementById('roundNumber').value;
    
    let filtered = allQuestions.filter(q => {
        // Filter by category
        if (categories.length > 0 && !categories.includes(q.category)) {
            return false;
        }
        
        // Filter by source
        if (source && !q.source.startsWith(source)) {
            return false;
        }
        
        // Filter by round number
        if (roundNum && !q.source.includes(`round${roundNum}`)) {
            return false;
        }
        
        // Exclude already used questions
        if (usedQuestionIds.has(q.id)) {
            return false;
        }
        
        return true;
    });
    
    return filtered;
}

// Fetch new question with filtering
newQuestionBtn.addEventListener('click', async () => {
    const categories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
        .map(cb => cb.value);
    
    if (categories.length === 0) {
        alert('Please select at least one category!');
        return;
    }
    
    // Wait for questions to load if not ready
    if (!questionsLoaded) {
        newQuestionBtn.textContent = 'Loading questions...';
        newQuestionBtn.disabled = true;
        await loadAllQuestions();
        newQuestionBtn.textContent = 'New Question';
        newQuestionBtn.disabled = false;
    }
    
    try {
        const availableQuestions = getFilteredQuestions();
        
        if (availableQuestions.length === 0) {
            const shouldReset = confirm('No more unique questions available with these filters! Reset used questions?');
            if (shouldReset) {
                usedQuestionIds.clear();
                newQuestionBtn.click();
                return;
            } else {
                alert('Try changing your filters or reset the game.');
                return;
            }
        }
        
        // Pick a random question from available ones
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        currentQuestion = availableQuestions[randomIndex];
        
        // Mark this question as used
        usedQuestionIds.add(currentQuestion.id);
        
        isShowingBonus = false;
        
        console.log('Selected question:', currentQuestion);
        console.log('Questions remaining:', availableQuestions.length - 1);
        
        questionText.textContent = currentQuestion.tossup_question;
        questionCategory.textContent = `${currentQuestion.category} - TOSSUP`;
        correctAnswer.textContent = currentQuestion.tossup_answer;
        questionNum.textContent = currentQuestionNumber;
        
        // Show source info
        if (currentQuestion.source) {
            questionCategory.textContent = `${currentQuestion.category} - TOSSUP (${currentQuestion.source})`;
        }
        
        await database.ref('gameState').update({
            currentQuestion: currentQuestion,
            buzzerActive: false,
            buzzer: null,
            questionNumber: currentQuestionNumber,
            isReading: false
        });
        
        // Reset UI
        answerSection.style.display = 'none';
        buzzedPlayer.textContent = '';
        timerDisplay.style.display = 'none';
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
        alert('Error loading question. Try refreshing the page.');
    }
});

// Read question aloud
readQuestionBtn.addEventListener('click', async () => {
    if (!currentQuestion) {
        alert('Load a question first!');
        return;
    }
    
    if (!voicesLoaded) {
        await loadVoices();
    }
    
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const textToRead = isShowingBonus ? currentQuestion.bonus_question : currentQuestion.tossup_question;
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    
    // Select best voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                          voices.find(v => v.lang === 'en-US' && v.name.includes('Natural')) ||
                          voices.find(v => v.lang === 'en-US') ||
                          voices[0];
    
    if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
    }
    
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    console.log('Reading with voice:', preferredVoice?.name);
    
    database.ref('gameState/isReading').set(true);
    
    currentUtterance.onstart = () => {
        readQuestionBtn.textContent = '🔊 Reading...';
        readQuestionBtn.disabled = true;
    };
    
    currentUtterance.onend = () => {
        database.ref('gameState/isReading').set(false);
        readQuestionBtn.textContent = '🔊 Read Question';
        readQuestionBtn.disabled = false;
        
        // Start timer after reading
        const timerDuration = isShowingBonus ? 20 : 5;
        startTimer(timerDuration);
    };
    
    currentUtterance.onerror = (event) => {
        console.error('Speech error:', event);
        database.ref('gameState/isReading').set(false);
        readQuestionBtn.textContent = '🔊 Read Question';
        readQuestionBtn.disabled = false;
    };
    
    speechSynthesis.speak(currentUtterance);
});

// Activate buzzers
activateBuzzerBtn.addEventListener('click', () => {
    database.ref('gameState').update({
        buzzerActive: true,
        buzzer: null
    });
    activateBuzzerBtn.disabled = true;
    answerSection.style.display = 'none';
});

// Mark correct
markCorrectBtn.addEventListener('click', () => {
    if (!currentBuzzedPlayer) return;
    
    const points = isShowingBonus ? 10 : 4;
    
    database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
        return (score || 0) + points;
    });
    
    // If tossup was correct, show bonus
    if (!isShowingBonus && currentQuestion.bonus_question) {
        showBonus();
    } else {
        resetForNextQuestion();
    }
});

// Show bonus question
function showBonus() {
    isShowingBonus = true;
    questionText.textContent = currentQuestion.bonus_question;
    questionCategory.textContent = currentQuestion.category + ' - BONUS';
    correctAnswer.textContent = currentQuestion.bonus_answer;
    
    // Reset UI for bonus
    buzzedPlayer.textContent = '';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    markCorrectBtn.style.display = 'none';
    markIncorrectBtn.style.display = 'none';
    showAnswerBtn.style.display = 'none';
    answerSection.style.display = 'none';
    
    readQuestionBtn.disabled = false;
    
    alert('Tossup correct! Now reading the BONUS question for the same team.');
}

// Mark incorrect
markIncorrectBtn.addEventListener('click', () => {
    if (!currentBuzzedPlayer) return;
    
    const points = isShowingBonus ? 0 : -4;
    
    if (points !== 0) {
        database.ref(`gameState/scores/${currentBuzzedPlayer}`).transaction((score) => {
            return (score || 0) + points;
        });
    }
    
    if (!isShowingBonus) {
        // Reactivate buzzers for tossup
        database.ref('gameState').update({
            buzzerActive: true,
            buzzer: null
        });
        
        answerSection.style.display = 'none';
        markCorrectBtn.style.display = 'none';
        markIncorrectBtn.style.display = 'none';
        showAnswerBtn.style.display = 'none';
    } else {
        resetForNextQuestion();
    }
});

// Show answer
showAnswerBtn.addEventListener('click', () => {
    answerSection.style.display = 'block';
});

// Reset game
resetGameBtn.addEventListener('click', () => {
    if (confirm('Reset all scores and used questions?')) {
        currentQuestionNumber = 1;
        usedQuestionIds.clear();
        speechSynthesis.cancel();
        stopTimer();
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
        readQuestionBtn.disabled = true;
        console.log('Game reset! All questions available again.');
    }
});

function resetForNextQuestion() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    stopTimer();
    
    database.ref('gameState').update({
        buzzerActive: false,
        buzzer: null,
        isReading: false
    });
    
    buzzedPlayer.textContent = '';
    document.querySelectorAll('.light').forEach(l => l.classList.remove('active'));
    markCorrectBtn.style.display = 'none';
    markIncorrectBtn.style.display = 'none';
    showAnswerBtn.style.display = 'none';
    answerSection.style.display = 'none';
    readQuestionBtn.textContent = '🔊 Read Question';
    readQuestionBtn.disabled = false;
    currentBuzzedPlayer = null;
    isShowingBonus = false;
}