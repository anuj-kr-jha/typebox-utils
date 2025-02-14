/**
 * @package
 */

import { FormatRegistry, Type, type Static, type TSchema } from '@sinclair/typebox';
import { TParseOperation, Value } from '@sinclair/typebox/value';
import { ObjectId } from 'mongodb';
import { TypeCompiler } from '@sinclair/typebox/compiler';

/**
 * Register custom formats for validation
 */
FormatRegistry.Set('objectid', (value: string) => /^[0-9a-fA-F]{24}$/.test(value) && ObjectId.isValid(value));
FormatRegistry.Set('email', (v: string) => /^[^@]+@[^@]+\.[^@]+$/.test(v));
FormatRegistry.Set('mobile', (v: string) => /^[0-9]{10}$/.test(v));
FormatRegistry.Set('uuid', (v: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
);

/**
 * Common reusable schema types
 */
const CommonTypes = {
  /** Email format: example@domain.com */
  Email: Type.String({ format: 'email' }),
  /** 10-digit mobile number */
  Mobile: Type.String({ format: 'mobile' }),
  /** Unix timestamp (milliseconds since epoch) */
  Timestamp: Type.Number({ minimum: 0 }),
  /** UUID v4 format */
  UUID: Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' })
} as const;

/**
 * Creates a MongoDB ObjectId type schema
 * @param autoGenerate If true, generates a new ObjectId when value is '666666666666666666666666'
 * @returns Schema for ObjectId validation and conversion
 */
const ObjectIdType = (autoGenerate?: boolean) =>
  Type.String({
    format: 'objectid',
    description: 'MongoDB ObjectId',
    default: autoGenerate ? '666666666666666666666666' : undefined
  }) as unknown as TSchema & { static: ObjectId };

/**
 * Gets all paths in a schema that should be converted to ObjectId
 * @param schema The schema to analyze
 * @param prefix Current path prefix for nested objects
 * @returns Array of dot-notation paths
 */
const getObjectIdPaths = (schema: TSchema, prefix = ''): string[] => {
  const paths: string[] = [];

  const traverse = (schema: TSchema, path: string) => {
    if (schema['format'] === 'objectid') {
      paths.push(path);
      return;
    }

    if (schema['type'] === 'object' && schema['properties']) {
      for (const [key, prop] of Object.entries(schema['properties'])) {
        const newPath = path ? `${path}.${key}` : key;
        traverse(prop as TSchema, newPath);
      }
    }

    if (schema['type'] === 'array' && schema['items']) {
      traverse(schema['items'], `${path}.*`);
    }
  };

  traverse(schema, prefix);
  return paths;
};

/**
 * Converts string ObjectIds to MongoDB ObjectId instances
 * @param obj Object to convert
 * @param schema Schema defining ObjectId fields
 * @returns Converted object with ObjectId instances
 */
const convertObjectIds = <T extends object>(obj: T, schema: TSchema): T => {
  const paths = getObjectIdPaths(schema);

  // Handle direct ObjectId case
  if (paths.length === 1 && paths[0] === '') {
    if (obj === undefined && schema.default) {
      return new ObjectId(schema.default) as any;
    }
    if (typeof obj === 'string' && ObjectId.isValid(obj)) {
      if (obj === '666666666666666666666666') {
        return new ObjectId() as any;
      }
      return new ObjectId(obj) as any;
    }
    if (obj instanceof ObjectId) {
      return obj as any;
    }
  }

  const setValue = (target: any, segments: string[], value: any) => {
    if (segments.length === 0) return;
    const [first, ...rest] = segments;

    if (first === '*') {
      if (Array.isArray(target)) {
        target.forEach(item => setValue(item, rest, value));
      } else if (Array.isArray(target?.items)) {
        target.items.forEach((item: any) => setValue(item, rest, value));
      }
    } else if (rest.length === 0) {
      if (typeof target[first] === 'string' && ObjectId.isValid(target[first])) {
        if (target[first] === '666666666666666666666666') {
          target[first] = new ObjectId();
        } else {
          target[first] = new ObjectId(target[first]);
        }
      }
    } else {
      if (target[first]) {
        setValue(target[first], rest, value);
      }
    }
  };

  // Handle nested object cases
  for (const path of paths) {
    if (path !== '') {
      setValue(obj, path.split('.'), null);
    }
  }

  return obj;
};

/**
 * Creates a compiled schema with the compiled version stored in its prototype chain
 * @param schema The schema to compile
 * @returns A new schema object with the compiled version in its prototype
 * @example
 * const schema = createSchema(Type.Object({
 *   name: Type.String(),
 *   age: Type.Number()
 * }));
 */
const createCompiledSchema = <T extends TSchema>(schema: T): T & { _compiled: ReturnType<typeof TypeCompiler.Compile> } => {
  const compiled = TypeCompiler.Compile(schema);

  // Create prototype with non-enumerable _compiled property
  const proto = Object.create(Object.getPrototypeOf(schema), {
    _compiled: {
      value: compiled,
      enumerable: false,
      writable: false,
      configurable: false
    }
  });

  // Create new object with our custom prototype
  const compiledSchema = Object.create(proto, Object.getOwnPropertyDescriptors(schema));

  return compiledSchema as T & { _compiled: ReturnType<typeof TypeCompiler.Compile> };
};

/**
 * Validates a value against a schema
 * @param value The value to validate
 * @param schema The schema to validate against (preferably pre-compiled)
 * @param operations Array of operations to perform during validation
 * @returns Tuple of [error message or null, validated value]
 * @example
 * const [error, value] = validate(data, schema);
 * if (error) {
 *   console.error(error);
 * } else {
 *   // use validated value
 * }
 */
const validate = <T>(
  value: any,
  schema: TSchema & { _compiled?: ReturnType<typeof TypeCompiler.Compile> },
  operations: TParseOperation[] = ['Clone', 'Clean', 'Default', 'Convert']
): [string | null, T] => {
  // If schema isn't pre-compiled, compile it on the fly but warn about it
  if (!schema._compiled) {
    console.warn('Schema not pre-compiled. Use createSchema for better performance.');
    return validate(value, createCompiledSchema(schema), operations);
  }

  const VP = Value.Parse(operations, schema, value) as Static<typeof schema>;
  const R = schema._compiled.Check(VP);

  if (!R) {
    const E = schema._compiled.Errors(VP).First();
    const path = E?.path ? ` at '${E.path}'` : '';
    const errorValue = E?.value ? ` (got ${JSON.stringify(E.value)})` : '';
    return [`${E?.message ?? 'Invalid value'}${path}${errorValue}`, value as T];
  }

  const VC = convertObjectIds(VP as any, schema);
  return [null, VC as T];
};

/**
 * Validates an array of items against a schema
 * @param values Array of values to validate
 * @param schema The schema to validate against
 * @returns Array of [error | null, value] tuples for all items
 * @example
 * const results = validateArray([item1, item2], schema);
 * results.forEach(([error, value]) => {
 *   if (error) {
 *     console.error(error);
 *   } else {
 *     // use validated value
 *   }
 * });
 */
const validateArray = <T>(
  values: any[],
  schema: TSchema & { _compiled?: ReturnType<typeof TypeCompiler.Compile> }
): [string | null, T][] => {
  return values.map(value => validate<T>(value, schema));
};

export { ObjectIdType, Static, Type, validate, validateArray, createCompiledSchema as createSchema, CommonTypes };
