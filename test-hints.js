// Import only the functions we need from script.js
// Since we can't directly import from script.js, we'll copy the essential functions here

const SYLLABLES = [
  'ba','be','bi','bo','bu','ca','co','da','de','di','do','du',
  'fa','fe','fi','fo','fu','ga','ge','gi','go','gu','ha','he',
  'hi','ho','ja','je','ji','jo','ka','ke','ki','ko','la','le',
  'li','lo','lu','ma','me','mi','mo','mu','na','ne','ni','no',
  'nu','pa','pe','pi','po','ra','re','ri','ro','ru','sa','se',
  'si','so','su','ta','te','ti','to','tu','va','ve','vi','vo','za','zo'
];

// Hint generation components
const HINT_PREFIXES = [
  'This word', 'A term that', 'A concept that', 'Something that',
  'A word that', 'An expression that', 'This example', 'This term'
];

const HINT_ATTRIBUTES = [
  'starts with "{first}"',
  'ends with "{last}"',
  'has {length} letters',
  'contains the letters "{vowels}"',
  'has {syllables} syllables',
  'contains repeating "{repeat}"',
  'uses the pattern "{pattern}"'
];

const HINT_CONTEXTS = [
  'in modern programming',
  'in data structures',
  'in web development',
  'in coding challenges',
  'in software design',
  'in tech communities',
  'among developers',
  'in computer science',
  'in virtual environments',
  'in digital systems'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makePseudoWord(targetLen) {
  let word = '';
  while (word.length < targetLen) {
    const s = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
    word += s;
  }

  return word.slice(0, targetLen).toLowerCase();
}

// Count syllables in a word (approximate)
function countSyllables(word) {
  // Basic syllable counting - count vowel groups
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  let count = 0;
  let lastWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    if (vowels.includes(word[i])) {
      if (!lastWasVowel) {
        count++;
      }
      lastWasVowel = true;
    } else {
      lastWasVowel = false;
    }
  }
  
  return Math.max(1, count); // At least one syllable
}

// Find repeating letters
function findRepeating(word) {
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i+1]) {
      return word[i];
    }
  }
  return '';
}

// Extract a simple pattern from the word
function extractPattern(word) {
  if (word.length <= 3) return word;
  return word.substring(0, 2) + '...' + word.substring(word.length - 2);
}

// Generate a hint based on word attributes
function generateHint(word) {
  // Extract word attributes
  const first = word[0];
  const last = word[word.length - 1];
  const length = word.length;
  const vowels = [...word].filter(c => 'aeiou'.includes(c)).join('');
  const syllables = countSyllables(word);
  const repeat = findRepeating(word);
  const pattern = extractPattern(word);
  
  // Create a seeded random based on word
  const wordSum = [...word].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rand1 = wordSum % HINT_PREFIXES.length;
  const rand2 = (wordSum * 13) % HINT_ATTRIBUTES.length;
  const rand3 = (wordSum * 17) % HINT_CONTEXTS.length;
  
  // Choose components
  let prefix = HINT_PREFIXES[rand1];
  let attribute = HINT_ATTRIBUTES[rand2]
    .replace('{first}', first)
    .replace('{last}', last)
    .replace('{length}', length)
    .replace('{vowels}', vowels || 'few vowels')
    .replace('{syllables}', syllables)
    .replace('{repeat}', repeat || 'letters')
    .replace('{pattern}', pattern);
  let context = HINT_CONTEXTS[rand3];
  
  // If the attribute mentions repeating letters but there aren't any,
  // or mentions vowels but there aren't many, pick a different attribute
  if ((attribute.includes('repeating') && !repeat) || 
      (attribute.includes('vowels') && vowels.length < 2)) {
    attribute = `has ${length} letters`;
  }
  
  return `${prefix} ${attribute} ${context}`;
}

// Generate and display 10 test examples
console.log("Testing Word Hint Generation:");
console.log("============================");

for (let i = 0; i < 10; i++) {
  const length = randomInt(4, 10);
  const word = makePseudoWord(length);
  const hint = generateHint(word);
  
  console.log(`Word: ${word}`);
  console.log(`Hint: ${hint}`);
  console.log("----------------------------");
}