# Mealie Recipe and Weekly Menu Creator

A Node.js CLI tool to automatically create recipes and weekly meal plans in [Mealie](https://mealie.io/) from JSON-LD structured recipe data.

## Features

- ✅ Automatically creates ingredients/foods in Mealie if they don't exist
- ✅ Checks for existing recipes by name to avoid duplicates
- ✅ Parses recipe data in JSON-LD (schema.org) format
- ✅ Creates weekly meal plans with proper date assignment
- ✅ Supports Hungarian meal type keywords (reggeli → breakfast, etc.)
- ✅ Extracts and parses ingredient quantities and names
- ✅ Includes nutrition information

## Prerequisites

- Node.js 18+
- Access to a Mealie instance
- Mealie API token

## Installation

### Windows

1. Install Node.js 18 or newer
2. Clone or download this repository
3. Configure your Mealie connection:
   ```cmd
   copy .env.example .env
   REM Edit .env with Notepad and add your Mealie URL and API token
   notepad .env
   ```

### Linux/Mac

1. Install Node.js 18 or newer
2. Clone or download this repository
3. Configure your Mealie connection:
   ```bash
   cp .env.example .env
   # Edit .env and add your Mealie URL and API token
   nano .env
   ```

## Getting Your Mealie API Token

1. Log in to your Mealie instance
2. Go to User Settings → API Tokens
3. Click "Create" to generate a new token
4. Copy the token and add it to your `.env` file

## Usage

### Quick Start - Windows Helper Scripts

**Option 1: PowerShell (Recommended)**
```powershell
# 1. Copy and configure .env file
Copy-Item .env.example .env
# Edit .env with your Mealie URL and API token

# 2. Run the script
.\run_windows.ps1 example_menu.json
```

**Option 2: Command Prompt/Batch**
```cmd
# 1. Copy and configure .env file
copy .env.example .env
REM Edit .env with your Mealie URL and API token

# 2. Run the script
run_windows.bat example_menu.json
```

These helper scripts automatically load settings from your `.env` file and call the Node.js CLI for you.

### Manual Usage

### On Windows (PowerShell):

```powershell
# Set environment variables
$env:MEALIE_BASE_URL="http://your-mealie-instance:9000"
$env:MEALIE_API_TOKEN="your_api_token_here"

# Run the script
node mealie_menu_creator.js example_menu.json
```

### On Windows (Command Prompt/CMD):

```cmd
# Set environment variables
set MEALIE_BASE_URL=http://your-mealie-instance:9000
set MEALIE_API_TOKEN=your_api_token_here

# Run the script
node mealie_menu_creator.js example_menu.json
```

### On Linux/Mac:

```bash
export MEALIE_BASE_URL=http://your-mealie-instance:9000
export MEALIE_API_TOKEN=your_api_token_here

node mealie_menu_creator.js example_menu.json
```

### Using a JSON file from stdin:

**Windows PowerShell:**
```powershell
Get-Content your_menu.json | node mealie_menu_creator.js
```

**Linux/Mac:**
```bash
cat your_menu.json | node mealie_menu_creator.js
```

## JSON Format

The tool accepts weekly menu data in the following format:

```json
{
  "week": 26,
  "monday": [
    {
      "@context": "https://schema.org",
      "@type": "Recipe",
      "name": "Recipe Name",
      "description": "Recipe description",
      "recipeYield": "1 adag",
      "recipeIngredient": [
        "30 g ingredient 1",
        "35 g ingredient 2"
      ],
      "recipeInstructions": [
        {
          "@type": "HowToStep",
          "text": "Instruction step"
        }
      ],
      "nutrition": {
        "@type": "NutritionInformation",
        "calories": "305 kcal",
        "proteinContent": "13 g",
        "fatContent": "13 g",
        "carbohydrateContent": "32 g"
      },
      "keywords": "reggeli"
    }
  ],
  "tuesday": [],
  "wednesday": [],
  "thursday": [],
  "friday": [],
  "saturday": [],
  "sunday": []
}
```

### Meal Type Keywords

The tool recognizes the following meal types:
- `reggeli` → breakfast
- `ebéd` → lunch  
- `vacsora` → dinner
- `snack` → snack

Keywords can be in the `keywords` field or in the `description`.

## How It Works

1. **Parse JSON**: Reads the weekly menu structure
2. **Calculate Dates**: Determines calendar dates for the specified week
3. **Process Ingredients**: 
   - Extracts ingredient names from recipe data
   - Checks if each ingredient exists in Mealie
   - Creates missing ingredients automatically
4. **Process Recipes**:
   - Checks if recipe already exists by name
   - Creates new recipe if it doesn't exist
   - Converts JSON-LD format to Mealie's format
5. **Create Meal Plans**:
   - Assigns recipes to specific dates
   - Sets appropriate meal type (breakfast/lunch/dinner)

## Example Output

```
============================================================
Processing Week 26 Menu
============================================================

Monday (2025-06-23):
----------------------------------------
  Processing 4 ingredients...
  ✓ Ingredient 'ajvár' already exists
  + Creating ingredient 'cheddar sajt'
  ...
+ Creating recipe 'Ajváros, cheddar sajtos szendvics'
  ✓ Recipe created successfully (ID: abc123)
  Meal type: breakfast
  Adding to meal plan for 2025-06-23...
  ✓ Meal plan entry created

============================================================
Week 26 processing complete!
============================================================
```

## Troubleshooting

### Authentication Error
- Verify your API token is correct
- Check that the token hasn't expired
- Ensure the token has proper permissions

### Connection Error
- Verify MEALIE_BASE_URL is correct
- Check that Mealie is running and accessible
- Ensure no firewall is blocking the connection

### Recipe Already Exists
- The tool automatically skips creating duplicate recipes
- It matches recipes by name (case-insensitive)
- This is expected behavior and not an error

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
