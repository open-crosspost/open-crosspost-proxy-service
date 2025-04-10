# Twitter API Proxy Testing Strategy

## Testing Philosophy

The Twitter API Proxy testing strategy focuses on ensuring reliability, correctness, and maintainability of the codebase. Our approach prioritizes:

1. **Service Testing**: Testing the service endpoints against a mock Twitter API to verify end-to-end functionality.
2. **SDK Testing**: Testing the SDK against mock service responses to verify client-side behavior.
3. **Error Handling**: Verifying that errors are properly caught, handled, and communicated to clients.
4. **Type Safety**: Leveraging TypeScript's type system to catch errors at compile time.
5. **Security**: Ensuring that authentication, authorization, and data protection mechanisms work correctly.

## Testing Tools

We use Deno's built-in testing capabilities:

1. **Deno.test**: Deno's native test runner for writing and running tests.
2. **@std/testing/bdd**: BDD-style testing with `describe` and `it` functions.
3. **@std/assert** and **@std/expect**: Assertion libraries for verifying test conditions.
4. **Test Steps**: Using `t.step()` for organizing tests into logical groups.
5. **Sanitizers**: Leveraging Deno's built-in sanitizers for resources, operations, and exits.

## Test Organization

Tests are organized into the following categories:

1. **Service Tests**: Located in `tests/service/` directory, testing the service endpoints against a mock Twitter API.
2. **SDK Tests**: Located in `tests/sdk/` directory, testing the SDK against mock service responses.
3. **Mocks**: Located in `tests/mocks/` directory, containing mock implementations of external dependencies.
4. **Utils**: Located in `tests/utils/` directory, containing test utilities.

## Testing Strategies

### Service Testing

The primary focus is on testing the service endpoints against a mock Twitter API:

1. **HTTP-Based Testing**: Test the service endpoints by making HTTP requests and verifying the responses.
2. **Mock Twitter API**: Use a mock Twitter API to simulate responses and error scenarios.
3. **Error Propagation**: Verify that errors from the Twitter API are properly propagated to clients.
4. **Authentication Flow**: Test the complete authentication flow from client to service to platform.

### SDK Testing

For SDK tests, we focus on testing against mock service responses:

1. **Mock Service Responses**: Mock the service responses to test SDK behavior.
2. **Error Handling**: Verify that errors from the service are properly propagated to SDK users.
3. **Request Formation**: Verify that the SDK forms proper requests to the service.
4. **Response Processing**: Verify that the SDK correctly processes service responses.

### Mocking

For both service and SDK tests, we use mocks to isolate the system under test:

1. **Twitter API Mock**: Mock the Twitter API to simulate responses and error scenarios.
2. **Twitter Client Mock**: Mock the Twitter client to control its behavior in tests.
3. **Fetch Mock**: Mock the fetch function to simulate service responses in SDK tests.

#### Mocking Strategies with Deno

When mocking functions in Deno tests, there are several approaches depending on the nature of the function being mocked:

##### Approach 1: Using `mock.stub` for Configurable Properties

For functions that are defined as configurable properties, you can use the `stub` function from `@std/testing/mock`:

```typescript
// Import the mock utilities
import * as mock from "jsr:@std/testing/mock";

// Create a stub for a function
using functionStub = mock.stub(
  moduleObject, 
  "functionName", 
  (param1: Type1, param2: Type2) => ReturnValue
);
```

Key points:
1. Use the `using` keyword to ensure the stub is automatically restored after the test
2. Match the function signature exactly in the stub implementation
3. Use underscore prefix for unused parameters: `_param1`, `_param2`
4. For asynchronous functions, return a Promise with the mock value

If you prefer not to use the `using` keyword (which is a newer feature), you can use this approach:

```typescript
const functionStub = mock.stub(
  moduleObject, 
  "functionName", 
  (param1: Type1, param2: Type2) => ReturnValue
);

// Make sure to restore in afterEach
afterEach(() => {
  functionStub.restore();
});
```

##### Approach 2: Creating Mock Module Implementations

For modules with read-only exports (which is common with ES modules), you can't use `mock.stub` directly. Instead, create a mock implementation of the entire module:

1. Create a mock implementation file in your tests/mocks directory:

```typescript
// tests/mocks/module-name-mock.ts
import { SomeType } from "@some/package";

// Export the same interface as the original module
export async function someFunction(param1: string, param2: number): Promise<SomeType> {
  // Mock implementation
  return mockResult;
}
```

2. Import the mock implementation instead of the real one in your tests:

```typescript
// Import the mock implementation instead of the real one
import * as moduleUtils from "../../mocks/module-name-mock.ts";
```

This approach is particularly useful for modules that create new instances of classes or have complex dependencies that are difficult to mock individually.

Example: Mocking a utility module that verifies platform access:

```typescript
// tests/mocks/near-auth-utils-mock.ts
import { ApiError, ApiErrorCode, PlatformName } from "@crosspost/types";
import { Context } from "../../deps.ts";
import { mockToken } from "./near-auth-service-mock.ts";

export async function verifyPlatformAccess(
  signerId: string,
  platform: PlatformName,
  userId: string,
): Promise<any> {
  // Mock implementation that returns the mock token
  return mockToken;
}
```

For mocking entire objects or classes:

```typescript
// Create a mock implementation
const mockObject = {
  method1: mock.fn(() => mockResult1),
  method2: mock.fn(() => mockResult2)
};

// Replace the real object with the mock
(serviceInstance as any).dependencyObject = mockObject;
```

## Test Coverage

We aim for high test coverage of critical paths:

1. **Authentication Flows**: 100% coverage of authentication logic.
2. **Post Operations**: 100% coverage of post creation, deletion, and interaction.
3. **Error Handling**: 100% coverage of error paths.
4. **Rate Limiting**: 100% coverage of rate limiting logic.

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on the state from other tests.
2. **Clear Assertions**: Each test should have clear assertions that verify specific behavior.
3. **Descriptive Names**: Test names should clearly describe what is being tested.
4. **Setup and Teardown**: Properly set up and tear down test resources.
5. **Error Cases**: Test both success and error cases.
6. **Boundary Conditions**: Test boundary conditions and edge cases.
7. **Performance**: Tests should run quickly to enable fast feedback loops.
