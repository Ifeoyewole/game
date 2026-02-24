const POOL_SIZE = 10;
const USE_JSON_WORDS = true;
const STORAGE_KEY = 'wordScrambleProgress';
const STATS_KEY = 'wordScrambleStats';

const WORD_CATEGORIES = {
  general: 'dik.json',
  sports: 'sports_words.json',
  food: 'food.json',
  tech: 'tech.json',
  animals: 'animals.json',
  science: 'science.json',
  geography: 'geography.json',
  music: 'music.json',
  movies: 'movies.json',
  history: 'history.json',
  nature: 'nature.json',
  fashion: 'fashion.json'
};

let currentCategory = 'general';
let JSON_WORD_FILE = WORD_CATEGORIES[currentCategory];

const DIFFICULTY_SETTINGS = {
  easy: {
    minWordLength: 3,
    maxWordLength: 5,
    timeLimit: 60,
    scrambleComplexity: 0.5,
    preserveFirstLast: true,
    extraScrambling: false
  },
  medium: {
    minWordLength: 4,
    maxWordLength: 7,
    timeLimit: 45,
    scrambleComplexity: 1,
    preserveFirstLast: false,
    extraScrambling: false
  },
  hard: {
    minWordLength: 6,
    maxWordLength: 12,
    timeLimit: 30,
    scrambleComplexity: 2,
    preserveFirstLast: false,
    extraScrambling: true
  }
};

let currentDifficulty = 'medium';
let MIN_WORD_LENGTH = DIFFICULTY_SETTINGS[currentDifficulty].minWordLength;
let MAX_WORD_LENGTH = DIFFICULTY_SETTINGS[currentDifficulty].maxWordLength;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let jsonWordsCache = null;

async function loadJsonWords() {
  if (jsonWordsCache) return jsonWordsCache;

  try {
    const response = await fetch(JSON_WORD_FILE);
    if (!response.ok) {
      throw new Error(`Failed to load ${JSON_WORD_FILE}: ${response.status}`);
    }

    const data = await response.json();
    let processedWords = [];

    if (data.length > 0 && Array.isArray(data[0])) {
      processedWords = data
        .filter(item => {
          const word = item[0];
          return word.length >= MIN_WORD_LENGTH &&
            word.length <= MAX_WORD_LENGTH &&
            /^[a-zA-Z]+$/.test(word);
        })
        .map(item => {
          const word = item[0];
          const category = item[2] ? item[2] : "general";
          return { word, category };
        });
    } else {
      processedWords = data
        .filter(word => {
          return typeof word === 'string' &&
            word.length >= MIN_WORD_LENGTH &&
            word.length <= MAX_WORD_LENGTH &&
            /^[a-zA-Z]+$/.test(word);
        })
        .map(word => word.toLowerCase());
    }

    jsonWordsCache = processedWords;
    console.log(`Loaded ${processedWords.length} words from ${JSON_WORD_FILE}`);
    return processedWords;
  } catch (error) {
    console.error(`Error loading words from ${JSON_WORD_FILE}:`, error);
    return [];
  }
}

async function selectRandomWords(count = POOL_SIZE) {
  let words = [];

  if (USE_JSON_WORDS) {
    words = await loadJsonWords();

    if (!words.length) {
      console.log('Falling back to built-in word list');
      words = window.ENGLISH_WORDS || [];
    }
  } else {
    words = window.ENGLISH_WORDS || [];
  }

  if (!words || !words.length) {
    console.error('No words available!');
    return [];
  }

  const selectedIndices = new Set();
  const result = [];

  while (selectedIndices.size < count && selectedIndices.size < words.length) {
    const randomIndex = Math.floor(Math.random() * words.length);

    if (!selectedIndices.has(randomIndex)) {
      selectedIndices.add(randomIndex);
      const wordObj = words[randomIndex];
      const word = typeof wordObj === 'string' ? wordObj : wordObj.word;
      result.push({ word });
    }
  }

  return result;
}

const scrambledWord = document.getElementById("scrambled-word");
const userInput = document.getElementById("user-input");
const refreshBtn = document.getElementById("refresh-btn");
const checkBtn = document.getElementById("check-btn");
const hintBtn = document.getElementById("hint-btn");
const difficultySelector = document.getElementById("difficulty");
const categorySelector = document.getElementById("category");
const timerDisplay = document.getElementById("time");
const scoreDisplay = document.getElementById("score");
const streakDisplay = document.getElementById("streak-display");
const hintsLeftDisplay = document.getElementById("hints-left");
const statsWordsDisplay = document.getElementById("stats-words");
const statsAccuracyDisplay = document.getElementById("stats-accuracy");
const statsBestStreakDisplay = document.getElementById("stats-best-streak");

function formatCategoryLabel(key) {
  if (!key) return '';
  return key
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function populateCategorySelector() {
  if (!categorySelector) return;
  categorySelector.innerHTML = '';
  Object.keys(WORD_CATEGORIES).forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = formatCategoryLabel(category);
    if (category === currentCategory) {
      option.selected = true;
    }
    categorySelector.appendChild(option);
  });
}

populateCategorySelector();

userInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    checkWord();
  }
});

let correctWord = "";
let timer;
let timeLeft = DIFFICULTY_SETTINGS[currentDifficulty].timeLimit;
let score = 0;
let isPaused = false;
let playerName = localStorage.getItem('playerName') || 'Player';
let highScore = parseInt(localStorage.getItem(STORAGE_KEY)) || 0;

// Streak & combo system
let streak = 0;
let bestStreak = 0;

// Hint system
const MAX_HINTS = 3;
let hintsRemaining = MAX_HINTS;
let revealedPositions = new Set();

// Stats tracking
let stats = JSON.parse(localStorage.getItem(STATS_KEY)) || {
  totalWords: 0,
  correctWords: 0,
  totalAttempts: 0,
  bestStreak: 0
};

function getStreakMultiplier() {
  if (streak >= 10) return 5;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

function getStreakEmoji() {
  if (streak >= 10) return '🔥🔥🔥';
  if (streak >= 5) return '🔥🔥';
  if (streak >= 3) return '🔥';
  return '';
}

function updateStreakDisplay() {
  if (!streakDisplay) return;
  if (streak >= 2) {
    const multiplier = getStreakMultiplier();
    const emoji = getStreakEmoji();
    streakDisplay.textContent = `${emoji} Streak: ${streak} (${multiplier}x)`;
    streakDisplay.classList.add('active');

    // Pulse animation on streak milestones
    if (streak === 3 || streak === 5 || streak === 10) {
      streakDisplay.classList.add('milestone');
      setTimeout(() => streakDisplay.classList.remove('milestone'), 1000);
    }
  } else {
    streakDisplay.textContent = '';
    streakDisplay.classList.remove('active');
  }
}

function updateHintsDisplay() {
  if (hintsLeftDisplay) {
    hintsLeftDisplay.textContent = hintsRemaining;
  }
  if (hintBtn) {
    hintBtn.disabled = hintsRemaining <= 0 || !correctWord;
  }
}

function updateStatsDisplay() {
  if (statsWordsDisplay) statsWordsDisplay.textContent = stats.correctWords;
  if (statsAccuracyDisplay) {
    const accuracy = stats.totalAttempts > 0
      ? Math.round((stats.correctWords / stats.totalAttempts) * 100)
      : 0;
    statsAccuracyDisplay.textContent = accuracy + '%';
  }
  if (statsBestStreakDisplay) statsBestStreakDisplay.textContent = stats.bestStreak;
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function useHint() {
  if (hintsRemaining <= 0 || !correctWord) return;

  // Find positions not yet revealed
  const unrevealed = [];
  for (let i = 0; i < correctWord.length; i++) {
    if (!revealedPositions.has(i)) {
      unrevealed.push(i);
    }
  }

  if (unrevealed.length === 0) return;

  // Reveal a random position
  const revealIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  revealedPositions.add(revealIdx);
  hintsRemaining--;

  // Update the scrambled display to show the hint
  const currentDisplay = scrambledWord.textContent.split('');
  // Build a hint display showing revealed letters in correct positions
  let hintDisplay = '';
  for (let i = 0; i < correctWord.length; i++) {
    if (revealedPositions.has(i)) {
      hintDisplay += correctWord[i].toUpperCase();
    } else {
      hintDisplay += '_';
    }
  }

  scrambledWord.innerHTML = `<span class="scrambled-text">${scrambledWord.dataset.scrambled}</span><br><span class="hint-text">${hintDisplay}</span>`;

  // Deduct 3 seconds per hint
  timeLeft = Math.max(1, timeLeft - 3);
  timerDisplay.textContent = timeLeft;

  updateHintsDisplay();
  showPopup(`💡 Hint! Letter "${correctWord[revealIdx].toUpperCase()}" revealed. (-3s)`, false);
}

function revealWordAnimation(word) {
  scrambledWord.innerHTML = '';
  scrambledWord.classList.add('revealing');

  const letters = word.split('');
  letters.forEach((letter, index) => {
    const span = document.createElement('span');
    span.textContent = letter;
    span.className = 'reveal-letter';
    span.style.animationDelay = `${index * 0.1}s`;
    scrambledWord.appendChild(span);
  });

  // Remove the class after animation completes
  setTimeout(() => {
    scrambledWord.classList.remove('revealing');
  }, letters.length * 100 + 800);
}

function updateDifficulty(difficulty) {
  currentDifficulty = difficulty;
  MIN_WORD_LENGTH = DIFFICULTY_SETTINGS[difficulty].minWordLength;
  MAX_WORD_LENGTH = DIFFICULTY_SETTINGS[difficulty].maxWordLength;
  jsonWordsCache = null;
  timeLeft = DIFFICULTY_SETTINGS[difficulty].timeLimit;
  timerDisplay.textContent = timeLeft;
}

async function initGame() {
  clearInterval(timer);
  timeLeft = DIFFICULTY_SETTINGS[currentDifficulty].timeLimit;
  timerDisplay.textContent = timeLeft;

  // Reset hints for this round
  hintsRemaining = MAX_HINTS;
  revealedPositions.clear();
  updateHintsDisplay();

  scrambledWord.textContent = "Loading...";
  scrambledWord.innerHTML = "Loading...";

  try {
    const words = await selectRandomWords();

    if (!words || words.length === 0) {
      scrambledWord.textContent = "Error! Could not load words. Please refresh the page.";
      return;
    }

    const randomObj = words[Math.floor(Math.random() * words.length)];
    let wordArray = randomObj.word.split("");
    const originalWord = [...wordArray];

    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const complexity = settings.scrambleComplexity;
    const preserveFirstLast = settings.preserveFirstLast;
    const extraScrambling = settings.extraScrambling;

    if (preserveFirstLast && wordArray.length > 3) {
      const firstLetter = wordArray[0];
      const lastLetter = wordArray[wordArray.length - 1];
      const middle = wordArray.slice(1, wordArray.length - 1);

      if (complexity > 0) {
        const iterations = Math.max(1, Math.ceil(middle.length * complexity));
        for (let i = 0; i < iterations; i++) {
          const idx1 = Math.floor(Math.random() * middle.length);
          const idx2 = Math.floor(Math.random() * middle.length);
          [middle[idx1], middle[idx2]] = [middle[idx2], middle[idx1]];
        }
      }

      wordArray = [firstLetter, ...middle, lastLetter];
    } else {
      const iterations = Math.max(1, Math.ceil(wordArray.length * complexity));
      for (let i = 0; i < iterations; i++) {
        for (let j = wordArray.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [wordArray[j], wordArray[k]] = [wordArray[k], wordArray[j]];
        }
      }
    }

    if (extraScrambling) {
      const extraSwaps = Math.floor(wordArray.length * 0.7);
      for (let i = 0; i < extraSwaps; i++) {
        const pos1 = Math.floor(Math.random() * wordArray.length);
        const pos2 = Math.floor(Math.random() * wordArray.length);
        [wordArray[pos1], wordArray[pos2]] = [wordArray[pos2], wordArray[pos1]];
      }
    }

    if (wordArray.join('') === originalWord.join('')) {
      if (wordArray.length > 1) {
        const pos1 = Math.floor(Math.random() * wordArray.length);
        let pos2 = Math.floor(Math.random() * wordArray.length);
        while (pos2 === pos1) {
          pos2 = Math.floor(Math.random() * wordArray.length);
        }
        [wordArray[pos1], wordArray[pos2]] = [wordArray[pos2], wordArray[pos1]];
      }
    }

    const scrambledText = wordArray.join("");
    scrambledWord.textContent = scrambledText;
    scrambledWord.dataset.scrambled = scrambledText;
    correctWord = randomObj.word;
    userInput.value = "";
    startTimer();
  } catch (error) {
    console.error("Error initializing game:", error);
    scrambledWord.textContent = "Error! Something went wrong. Please refresh the page.";
  }
}

function startTimer() {
  clearInterval(timer);
  isPaused = false;
  timer = setInterval(() => {
    if (!isPaused) {
      timeLeft--;
      timerDisplay.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);

        // Track stats for timeout
        stats.totalAttempts++;
        streak = 0;
        updateStreakDisplay();
        saveStats();
        updateStatsDisplay();

        // Animated word reveal instead of plain text
        revealWordAnimation(correctWord);
        showPopup(`⏰ Time's up! The word was:`, false);
        setTimeout(initGame, 2500);
      }
    }
  }, 1000);
}


function showPopup(message, isSuccess) {
  const popup = document.getElementById('popup');
  popup.className = `popup ${isSuccess ? 'success' : 'error'}`;
  const messageEl = popup.querySelector('.popup-message');
  messageEl.textContent = message;

  popup.classList.add('show');

  setTimeout(() => {
    popup.classList.remove('show');
  }, 3000);
}

function checkWord() {
  let userWord = userInput.value.trim().toLowerCase();
  if (!userWord) {
    showPopup("Please enter a word!", false);
    return;
  }

  stats.totalAttempts++;
  stats.totalWords++;

  if (userWord === correctWord.toLowerCase()) {
    // Update streak
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    if (streak > stats.bestStreak) stats.bestStreak = streak;

    // Calculate points with multiplier
    const multiplier = getStreakMultiplier();
    const points = multiplier;
    score += points;
    scoreDisplay.textContent = score;

    // Update stats
    stats.correctWords++;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem(STORAGE_KEY, highScore.toString());
    }

    saveStats();
    updateStreakDisplay();
    updateStatsDisplay();

    const streakEmoji = getStreakEmoji();
    const multiplierText = multiplier > 1 ? ` (${multiplier}x!)` : '';
    showPopup(`🎉 Correct! +${points}pts${multiplierText} ${streakEmoji} | High Score: ${highScore}`, true);
    initGame();
  } else {
    streak = 0;
    updateStreakDisplay();
    saveStats();
    updateStatsDisplay();
    showPopup("❌ Wrong! Try again.", false);
  }
}

refreshBtn.addEventListener("click", () => {
  streak = 0;
  updateStreakDisplay();
  initGame();
});
checkBtn.addEventListener("click", checkWord);
if (hintBtn) hintBtn.addEventListener("click", useHint);

difficultySelector.addEventListener("change", (e) => {
  updateDifficulty(e.target.value);
  if (timer) {
    if (confirm("Changing difficulty will restart the game. Continue?")) {
      initGame();
    } else {
      difficultySelector.value = currentDifficulty;
    }
  }
});

categorySelector.addEventListener("change", (e) => {
  const newCategory = e.target.value;
  currentCategory = newCategory;
  JSON_WORD_FILE = WORD_CATEGORIES[newCategory];
  jsonWordsCache = null;
  score = 0;
  scoreDisplay.textContent = score;
  streak = 0;
  updateStreakDisplay();
  initGame();
});

function checkAuth() {
  return true;
}

function logoutUser() {
  window.location.href = 'login-&signup.html';
}

function addUserInterface() {
  if (!document.getElementById('user-info')) {
    const userInfoDiv = document.createElement('div');
    userInfoDiv.id = 'user-info';

    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = `Hello, Guest!`;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', logoutUser);

    userInfoDiv.appendChild(usernameSpan);
    userInfoDiv.appendChild(logoutBtn);

    document.body.appendChild(userInfoDiv);
  }
}

function addPlayerInterface() {
  if (!document.getElementById('player-info')) {
    const playerInfoDiv = document.createElement('div');
    playerInfoDiv.id = 'player-info';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `Player: ${playerName}`;

    const highScoreSpan = document.createElement('span');
    highScoreSpan.style.marginLeft = '20px';
    highScoreSpan.textContent = `High Score: ${highScore}`;

    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'New Game';
    restartBtn.addEventListener('click', () => {
      if (confirm('Start a new game with a different name?')) {
        window.location.href = 'start.html';
      }
    });

    playerInfoDiv.appendChild(nameSpan);
    playerInfoDiv.appendChild(highScoreSpan);
    playerInfoDiv.appendChild(restartBtn);

    document.body.appendChild(playerInfoDiv);
  }
}

window.addEventListener("load", () => {
  if (!localStorage.getItem('playerName')) {
    window.location.href = 'start.html';
    return;
  }

  addPlayerInterface();
  updateStatsDisplay();
  updateStreakDisplay();
  updateHintsDisplay();

  currentDifficulty = difficultySelector.value;
  updateDifficulty(currentDifficulty);
  initGame();
});
