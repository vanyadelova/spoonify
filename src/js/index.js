import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';

import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';

import { elements, renderLoader, clearLoader} from './views/base';


// Global state of the app
/**
 * - Search Object
 * - Current Object
 * - Shopping list objects
 * - Liked recipes
 */
const state = {};


/* 
    SEARCH CONTROLLER
*/

const controlSearch = async (e) => {
    const form = e.target;

    // 1) Get Query from view
    const query = form.search.value;

    if (query) {
        // 2) New search object and add to state
        state.search = new Search(query);

        // 3) Prepare UI for results
        searchView.clearResults();
        renderLoader(elements.searchResults);

        try {
            // 4) Search for recipes
            await state.search.getResult();

            // 5) Clear search form & loader
            clearLoader(elements.searchResults);
            form.reset();

            // 6) Render results on UI
            searchView.renderResults(state.search.result);
        } catch (error) {
            clearLoader(elements.searchResults);
            console.error('Error receiving recipes');
        }

    }
}


/* 
    RECIPE CONTROLLER 
*/

const controlRecipe = async () => {

    // Clear shopping list
    if (state.list) {
        const listId = state.list.items.map(el => el.id);
        listId.forEach( id => {
            state.list.deleteItem(id);
            listView.deleteItem(id);
        });
    }

    // Get Id from URL
    const id = window.location.hash.replace('#', '');

    if (id) {

        // Create new recipe object
        state.recipe = new Recipe(id);

        // Prepare UI for change
        recipeView.cleanRecipe();
        renderLoader(elements.recipe);

        // Highlight search active item
        if (state.search) {
            searchView.highlightSelected(id);
        }
        
        try {
            // Get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
    
            // Calculate serving and time
            state.recipe.calcTime();
            state.recipe.calcServings();

            // Render recipe
            clearLoader(elements.recipe);
            recipeView.renderRecipe(state.recipe, state.likes ? state.likes.isLiked(id): false);
        } catch (error) {
            console.error('Error processing recipe!');
        }

    }

}

/* 
    SHOPPING LIST CONTROLLER
*/

export const controlList = () =>  {
    // Create a new list if there in none yet
    if (!state.list) state.list = new List();

    // Add each ingredient to List and render UI
    state.recipe.ingredients.forEach(ing => {
        const item = state.list.addItem(ing.count, ing.unit, ing.ingredient);
        listView.renderItem(item);
    });
};

/*
    LIKE CONTROLLER
 */

export const controlLike = () =>  {
    const recId = state.recipe.id;

    if (state.likes.isLiked(recId)) {
        // Remove from likes state
        state.likes.deleteLike(recId);

        // Toggle button
        likesView.toggleButton(false);

        // Remove like from UI likes list
        likesView.deleteLike(recId);

    } else {
        // Add to likes state
        const newLike = state.likes.addLike(state.recipe);

        // Toggle button
        likesView.toggleButton(true);

        // Add like to UI likes list
        likesView.renderLike(newLike);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};




// HANDLE EVENTS (CLICK, LOAD, ...)

window.addEventListener('load', () => {
    state.likes = new Likes();
    state.likes.readStorage();
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    state.likes.likes.forEach(el => likesView.renderLike(el));
});

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch(e);
    // TODO
});

elements.searchResPage.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

elements.recipe.addEventListener('click', e => {
    // Handle decrease button
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServings(state.recipe);
        }        

    // Handle increase button
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        state.recipe.updateServings('inc');
        recipeView.updateServings(state.recipe);

    // Handle add to shopping list button
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        controlList();

    // Handle add favorite button
    } else if (e.target.matches('.recipe__love, .recipe__love *')){
        controlLike();
    }

});

elements.shoppingList.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle delete item
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state list
        state.list.deleteItem(id);

        // Delete from UI
        listView.deleteItem(id);
    
    // Handle count updates
    } else if (e.target.matches('.shopping__item-value')) {
        const val = parseFloat(e.target.value);
        state.list.updateCount(id, val);

    }
});

document.getElementById('btnClear').addEventListener('click', () => {
    const listId = state.list.items.map(el => el.id);
    listId.forEach( id => {
        state.list.deleteItem(id);
        listView.deleteItem(id);
    });
});