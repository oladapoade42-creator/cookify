import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const mockRecipes = {
  '1': {
    id: '1',
    title: 'Simple Tomato Pasta',
    description: 'A quick, flavorful pasta recipe with fresh tomatoes, garlic, and basil.',
    image: 'https://via.placeholder.com/800x400?text=Tomato+Pasta',
    servings: 4,
    cookTime: '25 mins',
    author: 'Cookify Team',
    tags: ['Vegetarian', 'Quick', 'Italian'],
    ingredients: [
      '300g pasta',
      '2 cups cherry tomatoes',
      '3 cloves garlic',
      '2 tbsp olive oil',
      '1/2 cup fresh basil',
      'Salt and pepper to taste',
    ],
    steps: [
      'Cook pasta according to package instructions and drain.',
      'Heat olive oil in a pan, add minced garlic and cook until fragrant.',
      'Add cherry tomatoes and simmer until they soften.',
      'Toss cooked pasta with tomato sauce and fresh basil.',
      'Season with salt, pepper, and serve warm.',
    ],
    nutrition: {
      calories: 420,
      protein: '12g',
      carbs: '58g',
      fat: '14g',
    },
  },
  default: {
    id: 'default',
    title: 'No recipe selected',
    description: 'Please select a recipe from the list to see full details.',
    image: 'https://via.placeholder.com/800x400?text=No+Recipe',
    servings: 0,
    cookTime: '0 mins',
    author: 'Cookify',
    tags: [],
    ingredients: [],
    steps: [],
    nutrition: {},
  },
};

const RecipeDetails = () => {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [activeSection, setActiveSection] = useState('ingredients');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (recipeId && mockRecipes[recipeId]) {
      setRecipe(mockRecipes[recipeId]);
    } else {
      setRecipe(mockRecipes.default);
    }
  }, [recipeId]);

  if (!recipe) {
    return (
      <div className="recipe-details">
        <p>Loading recipe...</p>
      </div>
    );
  }

  return (
    <div className="recipe-details">
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <div className="recipe-hero">
        <img src={recipe.image} alt={recipe.title} />
        <div className="recipe-summary">
          <h1>{recipe.title}</h1>
          <p>{recipe.description}</p>
          <div className="meta">
            <span>Servings: {recipe.servings}</span>
            <span>Cook time: {recipe.cookTime}</span>
            <span>Author: {recipe.author}</span>
          </div>
          <div className="tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => setFavorite(!favorite)}>
            {favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
        </div>
      </div>

      <div className="recipe-navigation">
        <button
          type="button"
          className={activeSection === 'ingredients' ? 'active' : ''}
          onClick={() => setActiveSection('ingredients')}
        >
          Ingredients
        </button>
        <button
          type="button"
          className={activeSection === 'steps' ? 'active' : ''}
          onClick={() => setActiveSection('steps')}
        >
          Directions
        </button>
        <button
          type="button"
          className={activeSection === 'nutrition' ? 'active' : ''}
          onClick={() => setActiveSection('nutrition')}
        >
          Nutrition
        </button>
      </div>

      {activeSection === 'ingredients' && (
        <section className="recipe-section">
          <h2>Ingredients</h2>
          <ul>
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === 'steps' && (
        <section className="recipe-section">
          <h2>Directions</h2>
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={`step-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {activeSection === 'nutrition' && (
        <section className="recipe-section">
          <h2>Nutrition Facts</h2>
          <div className="nutrition-grid">
            <div>Calories: {recipe.nutrition.calories}</div>
            <div>Protein: {recipe.nutrition.protein}</div>
            <div>Carbs: {recipe.nutrition.carbs}</div>
            <div>Fat: {recipe.nutrition.fat}</div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RecipeDetails;
