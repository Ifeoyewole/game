const POOL_SIZE = 10;
const USE_JSON_WORDS = true;
const JSON_WORD_FILE = 'dik.json';

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
    
    const processedWords = data
      .filter(item => {
        // Get just the word (first element in each array)
        const word = item[0];
        // Only include words within our length limits
        return word.length >= MIN_WORD_LENGTH && 
               word.length <= MAX_WORD_LENGTH &&
               // Only include words that contain letters only
               /^[a-zA-Z]+$/.test(word);
      })
      .map(item => {
        // Map to our expected format
        const word = item[0];
        // If there's a third element with category info, use it
        const category = item[2] ? item[2] : "general";
        return { word, category };
      });
    
    jsonWordsCache = processedWords;
    console.log(`Loaded ${processedWords.length} words from ${JSON_WORD_FILE}`);
    return processedWords;
  } catch (error) {
    console.error(`Error loading words from ${JSON_WORD_FILE}:`, error);
    return [];
  }
}

// Select a subset of words from the English words list
async function selectRandomWords(count = POOL_SIZE) {
  let words = [];
  
  if (USE_JSON_WORDS) {
    words = await loadJsonWords();
    
    // Fallback to ENGLISH_WORDS if JSON loading fails
    if (!words.length) {
      console.log('Falling back to built-in word list');
      words = window.ENGLISH_WORDS || [];
    }
  } else {
    // Use the built-in English words
    words = window.ENGLISH_WORDS || [];
  }
  
  // Make sure we have some words to work with
  if (!words || !words.length) {
    console.error('No words available!');
    return [];
  }
  
  const selectedIndices = new Set();
  const result = [];
  
  // Select 'count' unique random words
  while (selectedIndices.size < count && selectedIndices.size < words.length) {
    const randomIndex = Math.floor(Math.random() * words.length);
    
    if (!selectedIndices.has(randomIndex)) {
      selectedIndices.add(randomIndex);
      const wordObj = words[randomIndex];
      
      // Add to result without hint
      result.push({
        word: wordObj.word
      });
    }
  }
  
  return result;
}

const scrambledWord = document.getElementById("scrambled-word");
const userInput = document.getElementById("user-input");
const refreshBtn = document.getElementById("refresh-btn");
const checkBtn = document.getElementById("check-btn");
const pauseBtn = document.getElementById("pause-btn");
const difficultySelector = document.getElementById("difficulty");
const timerDisplay = document.getElementById("time");
const scoreDisplay = document.getElementById("score");

let correctWord = "";
let timer;
let timeLeft = DIFFICULTY_SETTINGS[currentDifficulty].timeLimit;
let score = 0;
let isPaused = false; // Track if game is paused

// Update game settings based on selected difficulty
function updateDifficulty(difficulty) {
  currentDifficulty = difficulty;
  MIN_WORD_LENGTH = DIFFICULTY_SETTINGS[difficulty].minWordLength;
  MAX_WORD_LENGTH = DIFFICULTY_SETTINGS[difficulty].maxWordLength;
  
  // Clear the JSON words cache to force reloading with new word length filters
  jsonWordsCache = null;
  
  // Update time limit for the next game
  timeLeft = DIFFICULTY_SETTINGS[difficulty].timeLimit;
  timerDisplay.textContent = timeLeft;
}

async function initGame() {
  clearInterval(timer);
  timeLeft = DIFFICULTY_SETTINGS[currentDifficulty].timeLimit;
  timerDisplay.textContent = timeLeft;
  
  scrambledWord.textContent = "Loading...";
  
  try {
    const words = await selectRandomWords();
    
    if (!words || words.length === 0) {
      scrambledWord.textContent = "Error! Could not load words. Please refresh the page.";
      return;
    }
    
    const randomObj = words[Math.floor(Math.random() * words.length)];
    let wordArray = randomObj.word.split("");
    const originalWord = [...wordArray]; // Keep a copy of the original word
    
    // Get difficulty settings
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const complexity = settings.scrambleComplexity;
    const preserveFirstLast = settings.preserveFirstLast;
    const extraScrambling = settings.extraScrambling;
    
    // For easy mode, if we're preserving first and last letters, we only scramble the middle
    if (preserveFirstLast && wordArray.length > 3) {
      // Save first and last letters
      const firstLetter = wordArray[0];
      const lastLetter = wordArray[wordArray.length - 1];
      
      // Extract the middle part for scrambling
      const middle = wordArray.slice(1, wordArray.length - 1);
      
      // Scramble the middle part based on complexity
      if (complexity > 0) {
        const iterations = Math.max(1, Math.ceil(middle.length * complexity));
        for (let i = 0; i < iterations; i++) {
          const idx1 = Math.floor(Math.random() * middle.length);
          const idx2 = Math.floor(Math.random() * middle.length);
          [middle[idx1], middle[idx2]] = [middle[idx2], middle[idx1]];
        }
      }
      
      // Reconstruct the word with preserved first and last letters
      wordArray = [firstLetter, ...middle, lastLetter];
    } else {
      // Standard Fisher-Yates shuffle, intensity based on complexity
      const iterations = Math.max(1, Math.ceil(wordArray.length * complexity));
      for (let i = 0; i < iterations; i++) {
        for (let j = wordArray.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [wordArray[j], wordArray[k]] = [wordArray[k], wordArray[j]];
        }
      }
    }
    
    // Add extra scrambling for hard mode
    if (extraScrambling) {
      const extraSwaps = Math.floor(wordArray.length * 0.7); // 70% of word length for hard mode
      for (let i = 0; i < extraSwaps; i++) {
        const pos1 = Math.floor(Math.random() * wordArray.length);
        const pos2 = Math.floor(Math.random() * wordArray.length);
        [wordArray[pos1], wordArray[pos2]] = [wordArray[pos2], wordArray[pos1]];
      }
    }
    
    // Ensure the word is actually scrambled
    if (wordArray.join('') === originalWord.join('')) {
      // If word wasn't scrambled (rare case), swap a couple of letters
      if (wordArray.length > 1) {
        const pos1 = Math.floor(Math.random() * wordArray.length);
        let pos2 = Math.floor(Math.random() * wordArray.length);
        // Make sure pos2 is different from pos1
        while (pos2 === pos1) {
          pos2 = Math.floor(Math.random() * wordArray.length);
        }
        [wordArray[pos1], wordArray[pos2]] = [wordArray[pos2], wordArray[pos1]];
      }
    }
    
    scrambledWord.textContent = wordArray.join("");
    correctWord = randomObj.word;
    userInput.value = "";
    startTimer();
  } catch (error) {
    console.error("Error initializing game:", error);
    scrambledWord.textContent = "Error! Something went wrong. Please refresh the page.";
  }
}

function startTimer() {
  clearInterval(timer); // Clear any existing timer
  isPaused = false;
  timer = setInterval(() => {
    if (!isPaused) {
      timeLeft--;
      timerDisplay.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        alert(` Time's up! The correct word was: ${correctWord}`);
        initGame();
      }
    }
  }, 1000);
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseBtn.textContent = "Resume";
    pauseBtn.classList.add("paused");
    userInput.disabled = true;
    checkBtn.disabled = true;
  } else {
    pauseBtn.textContent = "Pause";
    pauseBtn.classList.remove("paused");
    userInput.disabled = false;
    checkBtn.disabled = false;
  }
}

function checkWord() {
  let userWord = userInput.value.trim().toLowerCase();
  if (!userWord) return alert("Please enter a word!");
  if (userWord === correctWord.toLowerCase()) {
    score++;
    scoreDisplay.textContent = score;
    alert("🎉 Correct! Well done.");
    initGame();
  } else {
    alert("Wrong! Try again.");
  }
}

refreshBtn.addEventListener("click", () => initGame());
checkBtn.addEventListener("click", checkWord);
pauseBtn.addEventListener("click", togglePause);

// Update game settings when difficulty changes
difficultySelector.addEventListener("change", (e) => {
  updateDifficulty(e.target.value);
  // If the game is in progress, ask the user if they want to restart
  if (timer) {
    if (confirm("Changing difficulty will restart the game. Continue?")) {
      initGame();
    } else {
      // Reset the selector to the previous value if they cancel
      difficultySelector.value = currentDifficulty;
    }
  }
});

// Initialize the game when the page loads
window.addEventListener("load", () => {
  // Set the initial difficulty from the dropdown
  currentDifficulty = difficultySelector.value;
  updateDifficulty(currentDifficulty);
  initGame();
});
