/**
 * Clue Suggestions Utility
 * Reads from words.csv and provides random suggestions
 */

const fs = require('fs');
const path = require('path');

// Cache the clue suggestions in memory
let cachedSuggestions = null;

/**
 * Load clue suggestions from CSV file
 * @returns {Array<string>} Array of clue suggestions
 */
function loadSuggestions() {
  if (cachedSuggestions) {
    return cachedSuggestions;
  }

  try {
    const csvPath = path.join(__dirname, '../data/csv/words.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV (skip header row)
    const lines = csvContent.split('\n');
    const suggestions = lines
      .slice(1) // Skip header "Word"
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines
    
    cachedSuggestions = suggestions;
    console.log(`✅ Loaded ${suggestions.length} clue suggestions from CSV`);
    
    return suggestions;
  } catch (error) {
    console.error('❌ Error loading clue suggestions:', error);
    return [];
  }
}

/**
 * Get random clue suggestions
 * @param {number} count - Number of suggestions to return
 * @returns {Array<string>} Array of random clue suggestions
 */
function getRandomSuggestions(count) {
  const allSuggestions = loadSuggestions();
  
  if (allSuggestions.length === 0) {
    return [];
  }
  
  // Shuffle and take the requested count
  const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, allSuggestions.length));
}

module.exports = {
  loadSuggestions,
  getRandomSuggestions
};

