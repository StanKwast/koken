function renderRecipes() {
  recipeList.innerHTML = '';

  if (filteredRecipes.length === 0) {
    recipeList.textContent = 'Geen recepten gevonden.';
    return;
  }

  filteredRecipes.forEach((recipe) => {
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

    // Sort recipe categories: active first alphabetically, then inactive alphabetically
    const activeCats = recipe.category
      .filter(cat => activeCategories.has(cat))
      .sort((a, b) => a.localeCompare(b, 'nl'));
    const inactiveCats = recipe.category
      .filter(cat => !activeCategories.has(cat))
      .sort((a, b) => a.localeCompare(b, 'nl'));

    const sortedCats = [...activeCats, ...inactiveCats];

    sortedCats.forEach(cat => {
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
