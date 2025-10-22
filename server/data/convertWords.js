// Script to convert words.csv to words.js
// Run this script after updating words.csv: npm run convert-words

const fs = require('fs');
const path = require('path');

// File paths
const csvPath = path.join(__dirname, 'csv', 'words.csv');
const outputPath = path.join(__dirname, 'words.js');

console.log('📖 Reading CSV file...');

// Read the CSV file
fs.readFile(csvPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading CSV file:', err);
    process.exit(1);
  }

  console.log('✅ CSV file loaded successfully');
  console.log('🔄 Parsing CSV data...');

  // Split into lines and remove empty lines
  const lines = data.split('\n').filter(line => line.trim() !== '');
  
  // Skip the header row (first line)
  const rows = lines.slice(1);
  
  // Object to store words grouped by category
  const wordsByCategory = {};
  
  // Parse each row
  let validRows = 0;
  let skippedRows = 0;
  
  rows.forEach((line, index) => {
    // Handle CSV parsing - split by comma but respect commas in quotes
    const parts = parseCSVLine(line);
    
    if (parts.length < 3) {
      console.log(`⚠️ Skipping row ${index + 2}: Not enough columns`);
      skippedRows++;
      return;
    }
    
    const word = parts[0].trim();
    const category = parts[1].trim();
    const hint = parts[2].trim();
    
    // Validate that word and category are not empty
    if (!word || !category) {
      console.log(`⚠️ Skipping row ${index + 2}: Empty word or category`);
      skippedRows++;
      return;
    }
    
    // Validate category is one of the allowed values
    const allowedCategories = ['Who', 'Where', 'What'];
    if (!allowedCategories.includes(category)) {
      console.log(`⚠️ Skipping row ${index + 2}: Invalid category "${category}". Must be Who, Where, or What`);
      skippedRows++;
      return;
    }
    
    // Initialize category array if it doesn't exist
    if (!wordsByCategory[category]) {
      wordsByCategory[category] = [];
    }
    
    // Add word to category (convert to uppercase for consistency)
    wordsByCategory[category].push({
      word: word.toUpperCase(),
      hint: hint || '' // Empty string if no hint provided
    });
    
    validRows++;
  });
  
  console.log(`✅ Parsed ${validRows} valid words`);
  if (skippedRows > 0) {
    console.log(`⚠️ Skipped ${skippedRows} invalid rows`);
  }
  
  // Display category counts
  console.log('\n📊 Words by category:');
  Object.keys(wordsByCategory).forEach(category => {
    console.log(`   ${category}: ${wordsByCategory[category].length} words`);
  });
  
  // Generate the JavaScript file content
  const timestamp = new Date().toLocaleString();
  const totalCategories = Object.keys(wordsByCategory).length;
  
  let jsContent = `// Word data structure generated from CSV files\n`;
  jsContent += `// Generated on: ${timestamp}\n`;
  jsContent += `// Total categories: ${totalCategories}\n\n`;
  jsContent += `const wordsByCategory = ${JSON.stringify(wordsByCategory, null, 2)};\n\n`;
  jsContent += `module.exports = wordsByCategory;\n`;
  
  // Write to output file
  console.log('\n💾 Writing to words.js...');
  fs.writeFile(outputPath, jsContent, 'utf8', (err) => {
    if (err) {
      console.error('❌ Error writing output file:', err);
      process.exit(1);
    }
    
    console.log('✅ Successfully generated words.js');
    console.log(`📍 Output file: ${outputPath}`);
    console.log('\n🎉 Conversion complete!');
  });
});

/**
 * Parse a CSV line, handling commas within quoted strings
 * Simple parser that handles basic CSV format
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field (not inside quotes)
      result.push(current);
      current = '';
    } else {
      // Add character to current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

