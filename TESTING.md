# Testing Documentation

This project includes comprehensive unit tests for all major components.

## Test Framework

- **Framework**: Jest
- **Test Location**: `/tests/unit/`
- **Coverage Tool**: Jest built-in coverage

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

Current test coverage:

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| **Overall** | 77.66% | 77.47% | 79.48% | 78.36% |
| MealieAPI | 90.52% | 77.5% | 93.33% | 91.39% |
| MealieConfig | 100% | 100% | 100% | 100% |
| MealieMenuCreator | 96.89% | 83.01% | 100% | 96.89% |
| Constants | 100% | 100% | 100% | 100% |

## Test Structure

### Unit Tests

```
tests/
├── fixtures/
│   └── sampleMenuData.js      # Test data and fixtures
└── unit/
    ├── MealieAPI.test.js      # API client tests
    ├── MealieConfig.test.js    # Configuration tests
    ├── MealieMenuCreator.test.js  # Service layer tests
    ├── constants.test.js       # Constants validation
    └── utils/
        ├── env.test.js         # Environment utilities tests
        ├── fetch.test.js       # Fetch validation tests
        └── io.test.js          # I/O utilities tests
```

## Test Suites Overview

### MealieConfig Tests (7 tests)
Tests configuration management:
- ✅ Constructor with valid values
- ✅ Trailing slash removal
- ✅ Environment variable loading
- ✅ Default values
- ✅ Required field validation

### MealieAPI Tests (28 tests)
Tests API client functionality:
- ✅ HTTP request handling (GET, POST, PATCH)
- ✅ Authentication headers
- ✅ Error handling and retries
- ✅ Ingredient search and creation
- ✅ Recipe CRUD operations
- ✅ Meal plan creation
- ✅ Tag retrieval
- ✅ Parser API integration

### MealieMenuCreator Tests (35 tests)
Tests business logic and menu processing:
- ✅ Ingredient parsing and normalization
- ✅ Fallback ingredient creation
- ✅ Meal type extraction (multilingual)
- ✅ Week date calculation (ISO 8601)
- ✅ Recipe format conversion (JSON-LD to Mealie)
- ✅ Recipe creation with duplicate detection
- ✅ Weekly menu processing
- ✅ Error handling and edge cases

### Constants Tests (7 tests)
Tests application constants:
- ✅ Meal type mappings (Hungarian/English)
- ✅ Day order validation
- ✅ Constant value validation

### Utility Tests (10 tests)
Tests utility functions:
- ✅ Fetch API availability check
- ✅ Environment variable handling
- ✅ JSON file loading
- ✅ Input validation

## Mocking Strategy

The tests use Jest's mocking capabilities to isolate components:

1. **API Mocking**: Global `fetch` is mocked to test HTTP interactions
2. **File System Mocking**: `fs/promises` is mocked for file operations
3. **Dependency Injection**: Services receive mocked dependencies through constructors
4. **Console Mocking**: Console methods are mocked to test logging

## Example Test

```javascript
describe('MealieConfig', () => {
  test('should create config from environment variables', () => {
    process.env.MEALIE_BASE_URL = 'http://test.com';
    process.env.MEALIE_API_TOKEN = 'my-token';

    const config = MealieConfig.fromEnv();

    expect(config.baseUrl).toBe('http://test.com');
    expect(config.apiToken).toBe('my-token');
  });
});
```

## Writing New Tests

When adding new features, follow these guidelines:

1. **Create test file**: Place in appropriate directory under `/tests/unit/`
2. **Use descriptive names**: Test names should clearly describe what they test
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Mock external dependencies**: Isolate the unit under test
5. **Test edge cases**: Include tests for error conditions and boundary cases
6. **Keep tests independent**: Each test should run independently

### Test Template

```javascript
'use strict';

const ModuleUnderTest = require('../../src/path/to/module');

describe('ModuleName', () => {
  let instance;
  let mockDependency;

  beforeEach(() => {
    mockDependency = jest.fn();
    instance = new ModuleUnderTest(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    test('should do something expected', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Known Limitations

1. **Integration Tests**: Currently focuses on unit tests. Integration tests with real Mealie API would be valuable additions.
2. **E2E Tests**: End-to-end tests for the CLI are not yet implemented.
3. **Stdin Testing**: stdin reading is partially tested due to complexity of mocking process.stdin.

## Contributing Tests

When contributing:
1. Ensure all existing tests pass: `npm test`
2. Add tests for new functionality
3. Maintain or improve coverage: `npm run test:coverage`
4. Follow existing test patterns and conventions

## Test Results

All 87 tests pass successfully:

```
Test Suites: 7 passed, 7 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        ~0.5s
```

## Debugging Tests

To debug a specific test:

```bash
# Run a specific test file
npm test -- MealieConfig.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should create config"

# Run with verbose output
npm test -- --verbose
```

## Best Practices Followed

- ✅ **Isolation**: Each test is independent
- ✅ **Fast**: Tests run in under 1 second
- ✅ **Reliable**: No flaky tests or race conditions
- ✅ **Readable**: Clear test names and structure
- ✅ **Maintainable**: Easy to update when code changes
- ✅ **Comprehensive**: High coverage of critical paths
