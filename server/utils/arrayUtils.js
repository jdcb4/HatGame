/**
 * Array utility functions
 */

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 * @returns {void} - Modifies the array in place
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

module.exports = {
  shuffleArray
};

