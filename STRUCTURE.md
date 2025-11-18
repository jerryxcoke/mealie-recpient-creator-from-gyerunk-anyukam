# Project Structure

This project has been refactored to follow a clean, modular architecture with separation of concerns.

## Directory Layout

```
/workspace/
├── src/                           # Source code directory
│   ├── api/                       # API client layer
│   │   └── MealieAPI.js          # Mealie API client
│   ├── config/                    # Configuration
│   │   └── MealieConfig.js       # Mealie configuration class
│   ├── constants/                 # Application constants
│   │   └── index.js              # Meal type mappings and day order
│   ├── services/                  # Business logic layer
│   │   └── MealieMenuCreator.js  # Main menu processing service
│   └── utils/                     # Utility functions
│       ├── env.js                # Environment variable handling
│       ├── fetch.js              # Fetch API validation
│       └── io.js                 # Input/output utilities
├── index.js                       # Main entry point
├── package.json                   # NPM package configuration
└── README.md                      # User documentation
```

## Module Descriptions

### `src/api/MealieAPI.js`
**Purpose**: HTTP client for Mealie API  
**Responsibilities**:
- Making authenticated requests to Mealie
- Recipe CRUD operations
- Ingredient management
- Meal plan creation
- Tag retrieval

### `src/config/MealieConfig.js`
**Purpose**: Configuration management  
**Responsibilities**:
- Store Mealie instance URL and API token
- Load configuration from environment variables
- Validate required settings

### `src/constants/index.js`
**Purpose**: Application-wide constants  
**Contains**:
- `MEAL_TYPE_MAP`: Hungarian to English meal type translations
- `DAY_ORDER`: Days of the week (Monday-Sunday)

### `src/services/MealieMenuCreator.js`
**Purpose**: Business logic for menu processing  
**Responsibilities**:
- Converting JSON-LD recipes to Mealie format
- Parsing ingredients using Mealie's API
- Creating recipes if they don't exist
- Calculating week dates from ISO week numbers
- Processing weekly menus
- Creating meal plan entries

### `src/utils/env.js`
**Purpose**: Environment variable utilities  
**Functions**:
- `loadEnvFileFromDisk()`: Load .env file using dotenv
- `printEnvInstructions()`: Display help for setting env vars

### `src/utils/fetch.js`
**Purpose**: Fetch API validation  
**Functions**:
- `ensureFetchAvailable()`: Verify Node.js version supports fetch

### `src/utils/io.js`
**Purpose**: Input/output operations  
**Functions**:
- `readStdin()`: Read JSON from stdin
- `loadMenuData()`: Load menu from file or stdin

### `index.js`
**Purpose**: Application entry point  
**Responsibilities**:
- Initialize all components
- Handle command-line arguments
- Error handling and logging
- Export main classes for use as a library

## Design Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Dependency Injection**: Services receive dependencies through constructors
3. **Modularity**: Easy to test, maintain, and extend individual components
4. **Clear Interfaces**: Well-documented classes and functions
5. **Error Handling**: Comprehensive error handling at all layers

## Usage as a Library

The refactored code can now be used both as a CLI tool and as a library:

```javascript
const { MealieConfig, MealieAPI, MealieMenuCreator } = require('mealie-menu-creator');

// Initialize
const config = new MealieConfig('http://localhost:9000', 'your-token');
const api = new MealieAPI(config);
const creator = new MealieMenuCreator(api);

// Use the services
await creator.processWeeklyMenu(menuData);
```

## Benefits of the Refactor

- **Readability**: Code is organized logically and easy to navigate
- **Maintainability**: Changes are isolated to specific modules
- **Testability**: Each module can be unit tested independently
- **Reusability**: Classes can be imported and used in other projects
- **Scalability**: Easy to add new features without affecting existing code
- **Documentation**: JSDoc comments provide clear API documentation
