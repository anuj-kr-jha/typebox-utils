# TypeBox Validation Utilities

A robust validation library built on top of [@sinclair/typebox](https://github.com/sinclairzx81/typebox) that provides enhanced ObjectId support, common schema types, and simplified validation workflows.

## Features

- 🔄 Automatic MongoDB ObjectId conversion and validation
- 📝 Pre-compiled schema validation for better performance
- ✨ Common reusable schema types (Email, Mobile, UUID, Timestamp)
- 🎯 Type-safe validation with TypeScript
- 🛠 Custom format validators for ObjectId, email, mobile, and UUID
- 📦 Array validation support
- 🔍 Detailed error messages with path information
- 🔀 Dual ESM and CommonJS support

## Installation

```bash
npm install typebox-utils
# or
yarn add typebox-utils
```

## Usage

### Basic Validation

```typescript
import { Type, validate, createSchema } from 'typebox-utils';

// Create a schema with type inference
const userSchema = createSchema(Type.Object({
  name: Type.String(),
  age: Type.Number(),
  email: Type.String({ format: 'email' })
}));

// Type-safe validation
type UserSchema = typeof userSchema;
const data = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com'
};

const [error, validatedData] = validate<Static<UserSchema>>(data, userSchema);
if (error) {
  console.error(error);
} else {
  // validatedData is fully typed
  console.log(validatedData.name); // TypeScript knows this is a string
}
```

### MongoDB ObjectId Support

```typescript
import { Type, ObjectIdType, validate, createSchema } from 'typebox-validation';

const userSchema = createSchema(Type.Object({
  _id: ObjectIdType(),
  name: Type.String()
}));

type UserDocument = Static<typeof userSchema>;

// Validates and converts string ObjectIds to MongoDB ObjectId instances
const [error, user] = validate<UserDocument>({
  _id: '507f1f77bcf86cd799439011',
  name: 'John'
}, userSchema);
```

### Common Types

```typescript
import { Type, CommonTypes, createSchema } from 'typebox-validation';

const userSchema = createSchema(Type.Object({
  email: CommonTypes.Email,
  mobile: CommonTypes.Mobile,
  createdAt: CommonTypes.Timestamp,
  sessionId: CommonTypes.UUID
}));

type User = Static<typeof userSchema>;
```

### Array Validation

```typescript
import { validateArray, Type, createSchema } from 'typebox-validation';

const itemSchema = createSchema(Type.Object({
  name: Type.String(),
  quantity: Type.Number()
}));

type Item = Static<typeof itemSchema>;

const items = [
  { name: 'Item 1', quantity: 5 },
  { name: 'Item 2', quantity: 10 }
];

const results = validateArray<Item>(items, itemSchema);
results.forEach(([error, item]) => {
  if (error) {
    console.error(error);
  } else {
    // item is fully typed
    console.log(item.name, item.quantity);
  }
});
```

### Auto-generating ObjectIds

```typescript
import { ObjectIdType, validate, createSchema, Type } from 'typebox-utils';

const schema = createSchema(Type.Object({
  // When autoGenerate is true, a new ObjectId will be generated if none is provided
  _id: ObjectIdType(true),
  name: Type.String()
}));

type Doc = Static<typeof schema>;

// These are equivalent when autoGenerate is true:
const [error1, doc1] = validate<Doc>({
  name: 'Test'
}, schema); // _id will be auto-generated

const [error2, doc2] = validate<Doc>({
  _id: '666666666666666666666666', // Special placeholder value
  name: 'Test'
}, schema); // _id will be auto-generated

// Providing a valid ObjectId will use that instead of generating
const [error3, doc3] = validate<Doc>({
  _id: '507f1f77bcf86cd799439011',
  name: 'Test'
}, schema); // Uses provided _id
```

## Module Support

The package supports both ESM and CommonJS:

```typescript
// ESM
import { validate, Type } from 'typebox-validation';

// CommonJS
const { validate, Type } = require('typebox-validation');
```

## API Reference

### Main Exports

- `Type`: TypeBox type definitions
- `Static`: TypeBox static type helper
- `validate<T>(value, schema, operations?)`: Validates a single value against a schema
- `validateArray<T>(values, schema)`: Validates an array of values against a schema
- `createSchema(schema)`: Creates a pre-compiled schema for better performance
- `ObjectIdType(autoGenerate?)`: Creates a MongoDB ObjectId type schema. When `autoGenerate` is true, a new ObjectId will be generated if the field is not provided or if it equals the special value '666666666666666666666666'
- `CommonTypes`: Common reusable schema types

### CommonTypes

```typescript
const CommonTypes = {
  Email: Type.String({ format: 'email' }),
  Mobile: Type.String({ format: 'mobile' }),
  Timestamp: Type.Number({ minimum: 0 }),
  UUID: Type.String({ format: 'uuid' })
};
```

## Best Practices

1. Always use type inference with `Static<typeof schema>`:
   ```typescript
   const schema = createSchema(Type.Object({ ... }));
   type MyType = Static<typeof schema>;
   const [error, data] = validate<MyType>(input, schema);
   ```

2. Pre-compile schemas for better performance:
   ```typescript
   const schema = createSchema(Type.Object({ ... }));
   ```

3. Use CommonTypes for standard fields:
   ```typescript
   const schema = createSchema(Type.Object({
     email: CommonTypes.Email,
     created: CommonTypes.Timestamp
   }));
   ```

## Requirements

- Node.js >= 14.0.0
- TypeScript >= 4.5.0 (for type support)
- MongoDB >= 6.0.0 (for ObjectId support)

## Dependencies

- [@sinclair/typebox](https://www.npmjs.com/package/@sinclair/typebox)
- [mongodb](https://www.npmjs.com/package/mongodb)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.