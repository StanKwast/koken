const fs = require('fs');
const path = require('path');

const recipesDir = path.join(__dirname, 'recipes');
const toRemove = ['Bijgerecht', 'Hapjes'];
const toAdd = 'Kleine gerechten';

fs.readdirSync(recipesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(recipesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (Array.isArray(data.category)) {
      let changed = false;
      // Remove unwanted categories
      const filtered = data.category.filter(cat => !toRemove.includes(cat));
      if (filtered.length !== data.category.length) changed = true;

      // Add "Kleine gerechten" if needed
      if (!filtered.includes(toAdd) && data.category.some(cat => toRemove.includes(cat))) {
        filtered.push(toAdd);
        changed = true;
      }

      if (changed) {
        data.category = filtered;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Updated: ${file}`);
      }
    }
  }
});