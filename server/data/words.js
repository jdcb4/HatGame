// Word data structure - this will be populated from your CSV
// For now, using a simplified version based on your original game

const wordsByCategory = {
  "objects": [
    { word: "TELESCOPE", difficulty: "medium" },
    { word: "KEYBOARD", difficulty: "easy" },
    { word: "CAMERA", difficulty: "easy" },
    { word: "UMBRELLA", difficulty: "easy" },
    { word: "BINOCULARS", difficulty: "medium" },
    { word: "MICROSCOPE", difficulty: "hard" },
    { word: "CALCULATOR", difficulty: "easy" },
    { word: "HEADPHONES", difficulty: "easy" },
    { word: "THERMOMETER", difficulty: "medium" },
    { word: "COMPASS", difficulty: "easy" }
  ],
  "animals": [
    { word: "ELEPHANT", difficulty: "easy" },
    { word: "BUTTERFLY", difficulty: "easy" },
    { word: "PENGUIN", difficulty: "easy" },
    { word: "GIRAFFE", difficulty: "easy" },
    { word: "CHIMPANZEE", difficulty: "medium" },
    { word: "RHINOCEROS", difficulty: "medium" },
    { word: "HIPPOPOTAMUS", difficulty: "hard" },
    { word: "PLATYPUS", difficulty: "medium" },
    { word: "ARMADILLO", difficulty: "medium" },
    { word: "CHAMELEON", difficulty: "medium" }
  ],
  "food": [
    { word: "PIZZA", difficulty: "easy" },
    { word: "SANDWICH", difficulty: "easy" },
    { word: "SPAGHETTI", difficulty: "easy" },
    { word: "CHOCOLATE", difficulty: "easy" },
    { word: "AVOCADO", difficulty: "easy" },
    { word: "CROISSANT", difficulty: "medium" },
    { word: "QUESADILLA", difficulty: "medium" },
    { word: "GUACAMOLE", difficulty: "medium" },
    { word: "CAPPUCCINO", difficulty: "medium" },
    { word: "BRUSCHETTA", difficulty: "hard" }
  ],
  "places": [
    { word: "HOSPITAL", difficulty: "easy" },
    { word: "LIBRARY", difficulty: "easy" },
    { word: "AIRPORT", difficulty: "easy" },
    { word: "MUSEUM", difficulty: "easy" },
    { word: "RESTAURANT", difficulty: "easy" },
    { word: "CATHEDRAL", difficulty: "medium" },
    { word: "AMPHITHEATER", difficulty: "hard" },
    { word: "OBSERVATORY", difficulty: "medium" },
    { word: "AQUARIUM", difficulty: "medium" },
    { word: "PLANETARIUM", difficulty: "hard" }
  ],
  "activities": [
    { word: "SWIMMING", difficulty: "easy" },
    { word: "READING", difficulty: "easy" },
    { word: "COOKING", difficulty: "easy" },
    { word: "DANCING", difficulty: "easy" },
    { word: "SINGING", difficulty: "easy" },
    { word: "PAINTING", difficulty: "easy" },
    { word: "GARDENING", difficulty: "easy" },
    { word: "PHOTOGRAPHY", difficulty: "medium" },
    { word: "MOUNTAINEERING", difficulty: "hard" },
    { word: "ARCHAEOLOGY", difficulty: "hard" }
  ]
};

module.exports = wordsByCategory;
