console.log('app.js loaded');

// Configuration: your GitHub repo URL holding the JSON recipes folder
const RECIPES_API_URL = 'https://api.github.com/repos/StanKwast/koken/contents/recipes';

// Global state
let allRecipes = [];
let filteredRecipes = [];
let activeCategories = new Set();
let allCategories = [];
let pinnedRecipes = new Set();
let pinnedRecipeOrder = [];

// Shuffle utility (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function shuffleRecipes() {
  shuffleArray(filteredRecipes);
  renderPinnedRecipes();
  renderRecipes(filteredRecipes);
}

function togglePinnedRecipe(title) {
  if (pinnedRecipes.has(title)) {
    pinnedRecipes.delete(title);
    pinnedRecipeOrder = pinnedRecipeOrder.filter(item => item !== title);
  } else {
    pinnedRecipes.add(title);
    pinnedRecipeOrder = [title, ...pinnedRecipeOrder.filter(item => item !== title)];
  }
}

function getPinnedRecipesInOrder() {
  const orderedPinned = pinnedRecipeOrder
    .map(title => allRecipes.find(recipe => recipe.title === title))
    .filter(Boolean);

  const remainingPinned = allRecipes.filter(recipe =>
    pinnedRecipes.has(recipe.title) && !pinnedRecipeOrder.includes(recipe.title)
  );

  return [...orderedPinned, ...remainingPinned];
}

function formatRecipeDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

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
      timestamp: r.timestamp || null,
      timestampMs: r.timestamp ? Date.parse(r.timestamp) : 0,
    }));

    extractCategories();
    // Keep newest recipes first by default
    allRecipes.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
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
  // Sort categories alphabetically only
  const sorted = [...allCategories].sort((a, b) => a.localeCompare(b));

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

  // Filter recipes that match title or ingredients and category
  let matches = allRecipes.filter(recipe => {
    const matchesTitle = recipe.title.toLowerCase().includes(searchTerm);
    const matchesIngredient = recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm));
    const matchesCategory =
      activeCategories.size === 0 ||
      recipe.category.some(cat => activeCategories.has(cat));
    return (matchesTitle || matchesIngredient) && matchesCategory;
  });

  // Sort newest recipes first, then by title
  matches.sort((a, b) => {
    const timeDiff = (b.timestampMs || 0) - (a.timestampMs || 0);
    if (timeDiff !== 0) return timeDiff;
    return a.title.localeCompare(b.title);
  });

  filteredRecipes = matches;

  renderPinnedRecipes();

  let toShow = filteredRecipes;

  const pinned = getPinnedRecipesInOrder();
  const isDesktop = window.innerWidth > 700;

  if (pinned.length > 0) {
    const pinnedCount = isDesktop ? pinned.length : pinned.length;
    const pairCount = isDesktop && pinned.length % 2 === 0 ? pinned.length : pinned.length;
    const pinnedToShow = pinned.slice(0, pinnedCount).map(r => r.title);
    const lonePinned = isDesktop && pinned.length % 2 === 1 ? pinned[pinned.length - 1] : null;

    toShow = filteredRecipes.filter(r => !pinnedToShow.includes(r.title));
    if (lonePinned) {
      toShow = [lonePinned, ...toShow.filter(r => r.title !== lonePinned.title)];
    }
  }

  renderRecipes(toShow);
}

function renderRecipes(recipesToRender) {
  recipeList.innerHTML = '';

  if (recipesToRender.length === 0) {
    recipeList.textContent = 'Geen recepten gevonden.';
    return;
  }

  recipesToRender.forEach((recipe, index) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.setAttribute('tabindex', '0'); // keyboard focusable

    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn';
    pinBtn.title = pinnedRecipes.has(recipe.title) ? 'Losmaken' : 'Vastmaken';
    const isPinned = pinnedRecipes.has(recipe.title);
    pinBtn.innerHTML = isPinned
      ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="#c75c1a" xmlns="http://www.w3.org/2000/svg"><path d="M5 3C4.44772 3 4 3.44772 4 4V17.382C4 17.9367 4.68437 18.2346 5.10557 17.8944L10 14.118L14.8944 17.8944C15.3156 18.2346 16 17.9367 16 17.382V4C16 3.44772 15.5523 3 15 3H5Z"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#c75c1a" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M5 3C4.44772 3 4 3.44772 4 4V17.382C4 17.9367 4.68437 18.2346 5.10557 17.8944L10 14.118L14.8944 17.8944C15.3156 18.2346 16 17.9367 16 17.382V4C16 3.44772 15.5523 3 15 3H5Z"/></svg>`;
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      togglePinnedRecipe(recipe.title);
      filterAndRender();
    };
    card.appendChild(pinBtn);

    // Header with title and categories
    const header = document.createElement('div');
    header.className = 'recipe-header';

    const title = document.createElement('h2');
    title.className = 'recipe-title';
    title.textContent = recipe.title;

    const metaRow = document.createElement('div');
    metaRow.className = 'recipe-meta-row';

    const catContainer = document.createElement('div');
    catContainer.className = 'recipe-categories';
    // Order the categories alphabetically for each recipe card
    [...recipe.category].sort((a, b) => a.localeCompare(b)).forEach(cat => {
      const c = document.createElement('span');
      c.className = 'recipe-category';
      c.textContent = cat;
      catContainer.appendChild(c);
    });

    const dateLabelText = formatRecipeDate(recipe.timestamp);
    const dateLabel = document.createElement('div');
    dateLabel.className = 'recipe-meta';
    dateLabel.textContent = dateLabelText;

    metaRow.appendChild(catContainer);
    if (dateLabelText) metaRow.appendChild(dateLabel);

    header.appendChild(title);
    header.appendChild(metaRow);

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

    const instructionsText = document.createElement('div');
    instructionsText.className = 'recipe-instructions-text';
    instructionsText.textContent = recipe.instructions.join('\n');
    instructionsSection.appendChild(instructionsText);

    content.appendChild(ingredientsSection);
    content.appendChild(instructionsSection);

    card.appendChild(header);
    card.appendChild(content);

    // Toggle on click or enter/space keyboard
    card.addEventListener('click', (e) => {
      // If in pinned container and has data-pair, toggle both in the pair
      if (card.parentElement && card.parentElement.id === 'pinnedRecipesContainer' && card.dataset.pair !== undefined) {
        const pairIndex = card.dataset.pair;
        const allInPair = Array.from(card.parentElement.querySelectorAll(`[data-pair="${pairIndex}"]`));
        const shouldOpen = !allInPair[0].querySelector('.recipe-content').classList.contains('open');
        allInPair.forEach(c => c.querySelector('.recipe-content').classList.toggle('open', shouldOpen));
      } else {
        content.classList.toggle('open');
      }
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Same logic as above
        if (card.parentElement && card.parentElement.id === 'pinnedRecipesContainer' && card.dataset.pair !== undefined) {
          const pairIndex = card.dataset.pair;
          const allInPair = Array.from(card.parentElement.querySelectorAll(`[data-pair="${pairIndex}"]`));
          const shouldOpen = !allInPair[0].querySelector('.recipe-content').classList.contains('open');
          allInPair.forEach(c => c.querySelector('.recipe-content').classList.toggle('open', shouldOpen));
        } else {
          content.classList.toggle('open');
        }
      }
    });

    recipeList.appendChild(card);
  });
}

function renderPinnedRecipes() {
  const container = document.getElementById('pinnedRecipesContainer');
  const pinned = getPinnedRecipesInOrder();
  const isDesktop = window.innerWidth > 700;

  if (pinned.length > 0) {
    const pairCount = isDesktop && pinned.length % 2 === 0 ? pinned.length : pinned.length;
    container.innerHTML = '';
    for (let i = 0; i < pairCount; i++) {
      const card = renderRecipeCard(pinned[i]);
      if (isDesktop) {
        card.dataset.pair = Math.floor(i / 2);
      }
      container.appendChild(card);
    }
    container.style.display = '';
  } else {
    container.innerHTML = '';
    container.style.display = 'none';
  }
}

// Example card rendering function (use this for both pinned and normal cards)
function renderRecipeCard(recipe) {
  const card = document.createElement('article');
  card.className = 'recipe-card';
  card.setAttribute('tabindex', '0');

  // Pin button
  const pinBtn = document.createElement('button');
  pinBtn.className = 'pin-btn';
  pinBtn.title = pinnedRecipes.has(recipe.title) ? 'Losmaken' : 'Vastmaken';
  const isPinned = pinnedRecipes.has(recipe.title);
  pinBtn.innerHTML = isPinned
    ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="#c75c1a" xmlns="http://www.w3.org/2000/svg"><path d="M5 3C4.44772 3 4 3.44772 4 4V17.382C4 17.9367 4.68437 18.2346 5.10557 17.8944L10 14.118L14.8944 17.8944C15.3156 18.2346 16 17.9367 16 17.382V4C16 3.44772 15.5523 3 15 3H5Z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#c75c1a" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M5 3C4.44772 3 4 3.44772 4 4V17.382C4 17.9367 4.68437 18.2346 5.10557 17.8944L10 14.118L14.8944 17.8944C15.3156 18.2346 16 17.9367 16 17.382V4C16 3.44772 15.5523 3 15 3H5Z"/></svg>`;
  pinBtn.onclick = (e) => {
    e.stopPropagation();
    togglePinnedRecipe(recipe.title);
    filterAndRender();
  };
  card.appendChild(pinBtn);

  // Header with title and categories
  const header = document.createElement('div');
  header.className = 'recipe-header';

  const title = document.createElement('h2');
  title.className = 'recipe-title';
  title.textContent = recipe.title;

  header.appendChild(title);

  const metaRow = document.createElement('div');
  metaRow.className = 'recipe-meta-row';

  const catContainer = document.createElement('div');
  catContainer.className = 'recipe-categories';
  // Order the categories alphabetically for each recipe card
  [...recipe.category].sort((a, b) => a.localeCompare(b)).forEach(cat => {
    const c = document.createElement('span');
    c.className = 'recipe-category';
    c.textContent = cat;
    catContainer.appendChild(c);
  });

  const dateLabelText = formatRecipeDate(recipe.timestamp);
  const dateLabel = document.createElement('div');
  dateLabel.className = 'recipe-meta';
  dateLabel.textContent = dateLabelText;

  metaRow.appendChild(catContainer);
  if (dateLabelText) metaRow.appendChild(dateLabel);

  header.appendChild(metaRow);

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

  const instructionsText = document.createElement('div');
  instructionsText.className = 'recipe-instructions-text';
  instructionsText.textContent = recipe.instructions.join('\n');
  instructionsSection.appendChild(instructionsText);

  content.appendChild(ingredientsSection);
  content.appendChild(instructionsSection);

  card.appendChild(header);
  card.appendChild(content);

  // Toggle on click or enter/space keyboard
  card.addEventListener('click', (e) => {
    // If in pinned container and has data-pair, toggle both in the pair
    if (card.parentElement && card.parentElement.id === 'pinnedRecipesContainer' && card.dataset.pair !== undefined) {
      const pairIndex = card.dataset.pair;
      const allInPair = Array.from(card.parentElement.querySelectorAll(`[data-pair="${pairIndex}"]`));
      const shouldOpen = !allInPair[0].querySelector('.recipe-content').classList.contains('open');
      allInPair.forEach(c => c.querySelector('.recipe-content').classList.toggle('open', shouldOpen));
    } else {
      content.classList.toggle('open');
    }
  });

  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Same logic as above
      if (card.parentElement && card.parentElement.id === 'pinnedRecipesContainer' && card.dataset.pair !== undefined) {
        const pairIndex = card.dataset.pair;
        const allInPair = Array.from(card.parentElement.querySelectorAll(`[data-pair="${pairIndex}"]`));
        const shouldOpen = !allInPair[0].querySelector('.recipe-content').classList.contains('open');
        allInPair.forEach(c => c.querySelector('.recipe-content').classList.toggle('open', shouldOpen));
      } else {
        content.classList.toggle('open');
      }
    }
  });

  return card;
}

// Event listeners
searchInput.addEventListener('input', filterAndRender);

// Initial load
fetchRecipes();

// Shuffle button event listener
const shuffleBtn = document.getElementById('shuffleRecipesBtn');
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', shuffleRecipes);
}
