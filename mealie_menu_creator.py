#!/usr/bin/env python3
"""
Mealie Recipe and Weekly Menu Creator
Parses JSON menu data and creates recipes and meal plans in Mealie
"""

import os
import json
import re
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class MealieConfig:
    """Configuration for Mealie API"""
    base_url: str
    api_token: str
    
    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        base_url = os.getenv('MEALIE_BASE_URL', 'http://localhost:9000')
        api_token = os.getenv('MEALIE_API_TOKEN', '')
        
        if not api_token:
            raise ValueError("MEALIE_API_TOKEN environment variable is required")
        
        return cls(base_url=base_url.rstrip('/'), api_token=api_token)


class MealieAPI:
    """Mealie API client"""
    
    def __init__(self, config: MealieConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {config.api_token}',
            'Content-Type': 'application/json'
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make an API request"""
        url = f"{self.config.base_url}/api{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response
    
    def get_ingredients(self) -> List[Dict[str, Any]]:
        """Get all ingredients"""
        try:
            response = self._request('GET', '/foods')
            data = response.json()

            if isinstance(data, list):
                return [
                    item if isinstance(item, dict) else {'name': str(item)}
                    for item in data
                ]

            if isinstance(data, dict):
                items = data.get('items')

                if isinstance(items, list):
                    return [
                        item if isinstance(item, dict) else {'name': str(item)}
                        for item in items
                    ]

                # Fallback: the payload might already be a mapping of id -> ingredient
                return [
                    value if isinstance(value, dict) else {'name': str(value)}
                    for value in data.values()
                    if not isinstance(value, (str, int, float, bool)) or value
                ]

            print(f"Unexpected ingredient payload type: {type(data)}")
            return []
        except requests.exceptions.HTTPError as e:
            print(f"Error fetching ingredients: {e}")
            return []
    
    def create_ingredient(self, name: str) -> Optional[Dict[str, Any]]:
        """Create a new ingredient/food"""
        try:
            data = {
                'name': name,
                'description': f'Auto-created ingredient: {name}'
            }
            response = self._request('POST', '/foods', json=data)
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"Error creating ingredient '{name}': {e}")
            return None
    
    def get_ingredient_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find an ingredient by name"""
        ingredients = self.get_ingredients()
        name_lower = name.lower().strip()
        
        for ingredient in ingredients:
            if isinstance(ingredient, dict):
                ingredient_name = ingredient.get('name') or ingredient.get('title') or ''

                if ingredient_name.lower().strip() == name_lower:
                    return ingredient

            elif isinstance(ingredient, str):
                if ingredient.lower().strip() == name_lower:
                    return {'name': ingredient}
        
        return None
    
    def ensure_ingredient_exists(self, name: str) -> Optional[Dict[str, Any]]:
        """Ensure an ingredient exists, create if not"""
        ingredient = self.get_ingredient_by_name(name)
        
        if ingredient:
            print(f"  ✓ Ingredient '{name}' already exists")
            return ingredient
        
        print(f"  + Creating ingredient '{name}'")
        return self.create_ingredient(name)
    
    def get_recipes(self) -> List[Dict[str, Any]]:
        """Get all recipes"""
        try:
            response = self._request('GET', '/recipes')
            return response.json().get('items', [])
        except requests.exceptions.HTTPError as e:
            print(f"Error fetching recipes: {e}")
            return []
    
    def get_recipe_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find a recipe by name"""
        recipes = self.get_recipes()
        name_lower = name.lower().strip()
        
        for recipe in recipes:
            if recipe.get('name', '').lower().strip() == name_lower:
                return recipe
        
        return None
    
    def create_recipe(self, recipe_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new recipe"""
        try:
            response = self._request('POST', '/recipes', json=recipe_data)
            data = response.json()

            if isinstance(data, dict):
                return data

            if isinstance(data, str):
                # Some endpoints may return the identifier as plain text
                return {'id': data}

            if isinstance(data, list):
                # Assume the first entry contains the created recipe
                first_item = data[0] if data else None
                if isinstance(first_item, dict):
                    return first_item

            print(f"Unexpected recipe creation response type: {type(data)}")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"Error creating recipe: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            return None
    
    def create_mealplan(self, date: str, entry_type: str, recipe_id: str) -> Optional[Dict[str, Any]]:
        """Create a meal plan entry"""
        try:
            data = {
                'date': date,
                'entryType': entry_type,
                'recipeId': recipe_id
            }
            response = self._request('POST', '/groups/mealplans', json=data)
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"Error creating meal plan: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            return None


class MealieMenuCreator:
    """Create Mealie recipes and weekly menus from JSON data"""
    
    MEAL_TYPE_MAP = {
        'reggeli': 'breakfast',
        'ebéd': 'lunch',
        'vacsora': 'dinner',
        'snack': 'snack',
        'breakfast': 'breakfast',
        'lunch': 'lunch',
        'dinner': 'dinner'
    }
    
    DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    def __init__(self, api: MealieAPI):
        self.api = api
    
    def parse_ingredient_text(self, ingredient_text: str) -> Dict[str, str]:
        """Parse ingredient text to extract quantity and name"""
        # Match patterns like "30 g ajvár" or "50-100 g friss zöldség"
        match = re.match(r'^([\d\-\.]+\s*[a-zA-Z]*)\s+(.+)$', ingredient_text.strip())
        
        if match:
            quantity = match.group(1).strip()
            name = match.group(2).strip()
        else:
            quantity = ''
            name = ingredient_text.strip()
        
        return {
            'quantity': quantity,
            'name': name,
            'original_text': ingredient_text
        }
    
    def extract_meal_type(self, recipe: Dict[str, Any]) -> str:
        """Extract meal type from recipe keywords"""
        keywords = recipe.get('keywords', '')
        
        if isinstance(keywords, str):
            keywords_lower = keywords.lower()
            for hungarian, english in self.MEAL_TYPE_MAP.items():
                if hungarian in keywords_lower:
                    return english
        
        # Check description as fallback
        description = recipe.get('description', '').lower()
        for hungarian, english in self.MEAL_TYPE_MAP.items():
            if hungarian in description:
                return english
        
        return 'dinner'  # Default
    
    def convert_recipe_to_mealie_format(self, recipe: Dict[str, Any]) -> Dict[str, Any]:
        """Convert JSON-LD recipe format to Mealie format"""
        # Parse ingredients
        ingredients = []
        ingredient_texts = recipe.get('recipeIngredient', [])
        
        print(f"  Processing {len(ingredient_texts)} ingredients...")
        for ing_text in ingredient_texts:
            parsed = self.parse_ingredient_text(ing_text)
            
            # Ensure ingredient exists in Mealie
            ingredient_name = parsed['name']
            self.api.ensure_ingredient_exists(ingredient_name)
            
            ingredients.append({
                'title': '',
                'note': parsed['original_text'],
                'unit': '',
                'quantity': parsed['quantity'],
                'food': {
                    'name': ingredient_name
                },
                'disableAmount': False,
                'display': parsed['original_text']
            })
        
        # Parse instructions
        instructions = []
        recipe_instructions = recipe.get('recipeInstructions', [])
        
        for idx, instruction in enumerate(recipe_instructions):
            if isinstance(instruction, dict):
                text = instruction.get('text', '')
            else:
                text = str(instruction)
            
            instructions.append({
                'id': str(idx),
                'title': '',
                'text': text
            })
        
        # Parse nutrition
        nutrition_data = recipe.get('nutrition', {})
        
        mealie_recipe = {
            'name': recipe.get('name', 'Untitled Recipe'),
            'description': recipe.get('description', ''),
            'recipeYield': recipe.get('recipeYield', '1'),
            'recipeIngredient': ingredients,
            'recipeInstructions': instructions,
            'notes': [],
            'tags': [],
            'settings': {
                'public': True,
                'showNutrition': True,
                'showAssets': True,
                'landscapeView': False,
                'disableComments': False,
                'disableAmount': False
            }
        }
        
        # Add nutrition if available
        if nutrition_data:
            mealie_recipe['nutrition'] = {
                'calories': nutrition_data.get('calories', ''),
                'protein': nutrition_data.get('proteinContent', ''),
                'fatContent': nutrition_data.get('fatContent', ''),
                'carbohydrateContent': nutrition_data.get('carbohydrateContent', '')
            }
        
        return mealie_recipe
    
    def create_recipe_if_not_exists(self, recipe: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create recipe in Mealie if it doesn't already exist"""
        recipe_name = recipe.get('name', 'Untitled Recipe')
        
        # Check if recipe already exists
        existing_recipe = self.api.get_recipe_by_name(recipe_name)
        
        if existing_recipe:
            print(f"✓ Recipe '{recipe_name}' already exists (ID: {existing_recipe.get('id')})")
            return existing_recipe
        
        print(f"+ Creating recipe '{recipe_name}'")
        mealie_recipe = self.convert_recipe_to_mealie_format(recipe)
        created_recipe = self.api.create_recipe(mealie_recipe)
        
        if created_recipe:
            print(f"  ✓ Recipe created successfully (ID: {created_recipe.get('id')})")
        
        return created_recipe
    
    def calculate_week_dates(self, year: int, week: int) -> Dict[str, str]:
        """Calculate dates for each day of the week"""
        from datetime import datetime, timedelta
        
        # Get the first day of the week (Monday)
        # ISO week date: week 1 is the week containing the first Thursday
        jan_4 = datetime(year, 1, 4)
        week_1_monday = jan_4 - timedelta(days=jan_4.weekday())
        target_monday = week_1_monday + timedelta(weeks=week - 1)
        
        dates = {}
        for idx, day in enumerate(self.DAY_ORDER):
            date = target_monday + timedelta(days=idx)
            dates[day] = date.strftime('%Y-%m-%d')
        
        return dates
    
    def process_weekly_menu(self, menu_data: Dict[str, Any], year: int = 2025) -> None:
        """Process weekly menu JSON and create recipes and meal plans"""
        week_number = menu_data.get('week', 1)
        print(f"\n{'='*60}")
        print(f"Processing Week {week_number} Menu")
        print(f"{'='*60}\n")
        
        # Calculate dates for the week
        week_dates = self.calculate_week_dates(year, week_number)
        
        # Process each day
        for day in self.DAY_ORDER:
            recipes = menu_data.get(day, [])
            
            if not recipes:
                print(f"\n{day.capitalize()}: No recipes")
                continue
            
            print(f"\n{day.capitalize()} ({week_dates[day]}):")
            print("-" * 40)
            
            for recipe in recipes:
                # Create recipe
                created_recipe = self.create_recipe_if_not_exists(recipe)
                
                if created_recipe:
                    # Determine meal type
                    meal_type = self.extract_meal_type(recipe)
                    print(f"  Meal type: {meal_type}")
                    
                    # Create meal plan entry
                    recipe_id = created_recipe.get('id') or created_recipe.get('slug')
                    if recipe_id:
                        print(f"  Adding to meal plan for {week_dates[day]}...")
                        mealplan = self.api.create_mealplan(
                            date=week_dates[day],
                            entry_type=meal_type,
                            recipe_id=recipe_id
                        )
                        
                        if mealplan:
                            print(f"  ✓ Meal plan entry created")
                        else:
                            print(f"  ✗ Failed to create meal plan entry")
        
        print(f"\n{'='*60}")
        print(f"Week {week_number} processing complete!")
        print(f"{'='*60}\n")


def main():
    """Main entry point"""
    import sys
    
    # Load configuration
    try:
        config = MealieConfig.from_env()
    except ValueError as e:
        print(f"Error: {e}")
        print("\nPlease set the following environment variables:")
        print("  MEALIE_BASE_URL - Your Mealie instance URL (default: http://localhost:9000)")
        print("  MEALIE_API_TOKEN - Your Mealie API token (required)")
        sys.exit(1)
    
    # Load menu data
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
        with open(json_file, 'r', encoding='utf-8') as f:
            menu_data = json.load(f)
    else:
        # Use example data from stdin or default
        print("Reading menu JSON from stdin (or provide filename as argument)...")
        print("Enter JSON data and press Ctrl+D when done:\n")
        try:
            menu_data = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            sys.exit(1)
    
    # Create API client and menu creator
    api = MealieAPI(config)
    creator = MealieMenuCreator(api)
    
    # Process the menu
    creator.process_weekly_menu(menu_data)


if __name__ == '__main__':
    main()
