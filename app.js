// Configuration: your GitHub repo URL holding the JSON recipes folder
const RECIPES_API_URL = 'https://api.github.com/repos/StanKwast/koken/contents/recipes';

// Global state
let allRecipes = [];
let filteredRecipes = [];
let activeCategories = new Set();
let allCategories = [];

const searchInput = document.getElementById('searchInput');
const categoryFilters = document.getElementById('categoryFilters');
const recipeList = document.getElementById('recipeList');

async function fetchRecipes() {
  try {
    const res = await fetch(RECIPES_API_URL);
    if (!res.ok) throw new Error('Failed to fetch recipe list');
    const files = await res.json();

    const jsonFiles = files.filter(file => file.name.endsWith('.json'));

    // Fetch all recipe JSON files in parallel
    const recipePromises = jsonFiles.map(file => fetch(file.download_url).then(r => r.json()));
    const recipes = await Promise.all(recipePromises);

    allRecipes = recipes.map(r => ({
      ...r,
      category: Array.isArray(r.category) 
        ? r.category.map(c => c.trim()) 
        : [r.category ? r.category.trim() : 'Onbekend'],
    }));

    extractCategories();
    renderCategoryFilters(); // Render the category filters after extracting categories
    filterAndRender();
  } catch (error) {
    recipeList.textContent = `Fout bij laden recepten: ${error.message}`;
  }
}

function extractCategories() {
  const catSet = new Set();
  allRecipes.forEach(r => {
    r.category.forEach(cat => catSet.add(cat.trim()));
  });
  allCategories = Array.from(catSet).sort((a, b) => a.localeCompare(b));
  console.log('Extracted categories:', allCategories);
}

function renderCategoryFilters() {
  // Sort categories: active first alphabetically, then inactive alphabetically
  const active = [];
  const inactive = [];

  allCategories.forEach(cat => {
    if (activeCategories.has(cat)) active.push(cat);
    else inactive.push(cat);
  });

  const sorted = [...active.sort(), ...inactive.sort()];

  categoryFilters.innerHTML = '';

  sorted.forEach(cat => {
    const label = document.createElement('span');
    label.textContent = cat;
    label.className = 'category-label' + (activeCategories.has(cat) ? ' active' : '');
    label.onclick = () => {
      if (activeCategories.has(cat)) activeCategories.delete(cat);
      else activeCategories.add(cat);
      renderCategoryFilters();
      filterAndRender();
    };
    categoryFilters.appendChild(label);
  });

  console.log('Rendered category filters:', categoryFilters.children.length);
}

function filterAndRender() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  filteredRecipes = allRecipes.filter(recipe => {
    const matchesTitle = recipe.title.toLowerCase().includes(searchTerm);
    const matchesCategory = activeCategories.size === 0 || recipe.category.some(cat => activeCategories.has(cat));
    return matchesTitle && matchesCategory;
  });

  renderRecipes();
}

function renderRecipes() {
  recipeList.innerHTML = '';

  if (filteredRecipes.length === 0) {
    recipeList.textContent = 'Geen recepten gevonden.';
    return;
  }

  filteredRecipes.forEach((recipe, index) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.setAttribute('tabindex', '0'); // keyboard focusable

    // Header with title and categories
    const header = document.createElement('div');
    header.className = 'recipe-header';

    const title = document.createElement('h2');
    title.className = 'recipe-title';
    title.textContent = recipe.title;

    const catContainer = document.createElement('div');
    catContainer.className = 'recipe-categories';
    recipe.category.forEach(cat => {
      const c = document.createElement('span');
      c.className = 'recipe-category';
      c.textContent = cat;
      catContainer.appendChild(c);
    });

    header.appendChild(title);
    header.appendChild(catContainer);

    // Content collapsible
    const content = document.createElement('div');
    content.className = 'recipe-content';

    // Ingredients section
    const ingredientsSection = document.createElement('section');
    ingredientsSection.className = 'recipe-section';
    const ingredientsTitle = document.createElement('h3');
    ingredientsTitle.textContent = 'Ingrediënten';
    ingredientsSection.appendChild(ingredientsTitle);

    const ingredientsList = document.createElement('ul');
    recipe.ingredients.forEach(ing => {
      const li = document.createElement('li');
      li.textContent = ing;
      ingredientsList.appendChild(li);
    });
    ingredientsSection.appendChild(ingredientsList);

    // Instructions section
    const instructionsSection = document.createElement('section');
    instructionsSection.className = 'recipe-section';
    const instructionsTitle = document.createElement('h3');
    instructionsTitle.textContent = 'Instructies';
    instructionsSection.appendChild(instructionsTitle);

    const instructionsList = document.createElement('ol');
    recipe.instructions.forEach(inst => {
      const li = document.createElement('li');
      li.textContent = inst;
      instructionsList.appendChild(li);
    });
    instructionsSection.appendChild(instructionsList);

    content.appendChild(ingredientsSection);
    content.appendChild(instructionsSection);

    card.appendChild(header);
    card.appendChild(content);

    // Toggle on click or enter/space keyboard
    card.addEventListener('click', () => {
      content.classList.toggle('open');
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        content.classList.toggle('open');
      }
    });

    recipeList.appendChild(card);
  });
}

// Event listeners
searchInput.addEventListener('input', filterAndRender);

// Initial load
fetchRecipes();
