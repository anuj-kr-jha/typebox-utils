# TypeBox Utils

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
npm install typebox-utils @sinclair/typebox mongodb
```
Note: This package is a peer dependency of `@sinclair/typebox` and `mongodb`. so you need to install them separately.

## Usage

### ESM Example
```javascript
import { Type, Utils, createSchema, validate } from 'typebox-utils';

// Schema creation
const userSchema = createSchema(
  Type.Object({
    _id: Utils.ObjectId(),
    email: Utils.Email({ random: true }),
    createdAt: Utils.Timestamp({ random: true }),
    contacts: Type.Array(Utils.ObjectId())
  })
);

// Data validation
const [error, validated] = validate({
  email: 'test@example.com',
  contacts: ['507f1f77bcf86cd799439011']
}, userSchema, true);

if (error) throw new Error(error);
console.log(validated);
```

### CommonJS Example
```javascript
const { Type, Utils, createSchema, validate } = require('typebox-utils');

// Schema creation
const productSchema = createSchema(
  Type.Object({
    sku: Utils.UUID({ random: true }),
    price: Type.Number({ minimum: 0 }),
    created: Utils.Timestamp()
  })
);

// Data validation
const [err, result] = validate({
  price: 29.99,
  created: Date.now()
}, productSchema);

if (err) console.error(err);
else console.log(result);
```

## API Reference

### `validate(value, schema, skipOperations?)`
Validates data against a TypeBox schema with automatic type conversion.

**Parameters:**
- `value`: Data to validate
- `schema`: Compiled TypeBox schema (use `createSchema`)
- `skipOperations`: Optional array of operations to skip:
  - `Clean`: Responsible for removing excess properties from a value
  - `Default`: Responsible for generating missing properties on a value using default schema annotations if available
  - `Convert`: Responsible for converting a value into its target type if a reasonable conversion is possible
  - `ConvertOID`: Responsible for converting ObjectId strings to ObjectId instances

**Returns:** `[error: string | null, validatedData: T]`

**Example:**
```javascript
const [error, data] = validate(rawInput, schema, ['Clean']);
```

---

### `validateArray(values, schema)`
Validates an array of values against a schema.

**Parameters:**
- `values`: Array of data to validate
- `schema`: Compiled TypeBox schema

**Returns:** Array of `[error, validatedData]` tuples

---

### `createSchema(schema)`
Pre-compiles schemas for better validation performance.

**Parameters:**
- `schema`: TypeBox schema object

**Returns:** Compiled schema with type information

---

## Utility Types

### `Utils.Timestamp(config?)`
Unix timestamp (milliseconds since epoch)
**Options:**
- `default`: Default timestamp value
- `minimum`: Minimum allowed value (default: 0)
- `maximum`: Maximum allowed value
- `random`: Generate current timestamp

---

### `Utils.UUID(config?)`
UUID v4 format validation
**Options:**
- `default`: Default UUID string
- `random`: Generate random UUID

---

### `Utils.Email(config?)`
Email format validation
**Options:**
- `default`: Default email address
- `random`: Generate random email

---

### `Utils.Mobile(config?)`
10-digit mobile number validation
**Options:**
- `default`: Default mobile number
- `random`: Generate random number

---

### `Utils.ObjectId(config?)`
MongoDB ObjectId validation/transformation
**Options:**
- `default`: Default ObjectId string
- `random`: Generate new ObjectId

## Custom Formats

Pre-registered validation formats:
- `objectid`: MongoDB ObjectId validation
- `email`: Simple email format
- `mobile`: 10-digit number
- `uuid`: UUID v4 format

See [TypeBox Formats](https://github.com/sinclairzx81/typebox#formats) for more information.

## Best Practices

1. **Pre-compile Schemas:**
```javascript
// Recommended
const compiledSchema = createSchema(Type.Object({ ... }));
const [error] = validate(data, compiledSchema);

// Not recommended
const [error] = validate(data, Type.Object({ ... }));
```

2. **Handle ObjectId Conversion:**
```javascript
// Returns ObjectId instances for string values
const [error, data] = validate({
  _id: '507f1f77bcf86cd799439011'
}, schema);

console.log(data._id instanceof ObjectId); // true
```

3. **Use Random Defaults:**
```javascript
const schema = createSchema(
  Type.Object({
    sessionId: Utils.UUID({ random: true }),
    createdAt: Utils.Timestamp({ random: true })
  })
);
```

## Peer Dependencies

- [`@sinclair/typebox`](https://www.npmjs.com/package/@sinclair/typebox): Core validation library
- [`mongodb`](https://www.npmjs.com/package/mongodb): MongoDB driver for ObjectId support

## License

MIT © [Anuj Kumar Jha](https://github.com/anuj-kr-jha)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.