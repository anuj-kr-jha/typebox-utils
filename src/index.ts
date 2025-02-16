/**
 * @package
 */

import { FormatRegistry, Type, type Static, type TSchema } from '@sinclair/typebox';
import { TParseOperation, Value } from '@sinclair/typebox/value';
import { ObjectId } from 'mongodb';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { setDifference } from './polyfill';
import { randomUUID } from 'node:crypto';
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
const Utils = {
  /**
   * Unix timestamp type (milliseconds since
   * @param {Object} config - Configuration object for the Timestamp type
   * @param {number} [config.default] - Optional default value for the timestamp
   * @param {number} [config.minimum] - Optional minimum value (defaults to 0)
   * @param {number} [config.maximum] - Optional maximum value
   * @param {boolean} [config.random] - Optional flag to generate current timestamp
   * @returns {import('@sinclair/typebox').TNumber} A TypeBox schema for Unix timestamp
   */
  Timestamp: (config?: { default?: number; minimum?: number; maximum?: number; random?: boolean }) =>
    Type.Number({
      minimum: config?.minimum || 0,
      maximum: config?.maximum,
      default: config?.default || (config?.random ? () => Date.now() : undefined),
      description: 'Unix timestamp (milliseconds since epoch)'
    }),

  /**
   * UUID v4 format type
   * @param {Object} config - Configuration object for the UUID type
   * @param {string} [config.default] - Optional default UUID string
   * @param {boolean} [config.random] - Optional flag to generate a random UUID
   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for UUID v4
   */
  UUID: (config?: { default?: string; random?: boolean }) => {
    if (config?.default) {
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(config.default)) {
        throw new Error('Invalid default value for UUID ' + config.default);
      }
    }
    return Type.String({
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
      description: 'UUID v4 format',
      default: config?.default || (config?.random ? () => randomUUID() : undefined)
    });
  },

  /**
   * Email format type
   * @param {Object} config - Configuration object for the Email type
   * @param {string} [config.default] - Optional default email address
   * @param {boolean} [config.random] - Optional flag to generate a random email
   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for email format
   */
  Email: (config?: { default?: string; random?: boolean }) => {
    if (config?.default) {
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(config.default)) {
        throw new Error('Invalid default value for Email ' + config.default);
      }
    }
    return Type.String({
      format: 'email',
      description: 'Email format: example@domain.com',
      default: config?.random ? () => `user_${Math.random().toString(36).slice(2)}@example.com` : config?.default
    });
  },

  /**
   * Mobile number format type (10 digits)
   * @param {Object} config - Configuration object for the Mobile type
   * @param {string} [config.default] - Optional default mobile number
   * @param {boolean} [config.random] - Optional flag to generate a random mobile number
   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for mobile number format
   */
  Mobile: (config?: { default?: string; random?: boolean }) => {
    if (config?.default) {
      if (!/^[0-9]{10}$/.test(config.default)) {
        throw new Error('Invalid default value for Mobile ' + config.default);
      }
    }
    return Type.String({
      format: 'mobile',
      description: '10-digit mobile number',
      default:
        config?.default ||
        (config?.random ? () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('') : undefined)
    });
  },

  /**
   * ObjectId type
   * @param {Object} config - Configuration object for the ObjectId type
   * @param {string} [config.default] - Optional default value for the ObjectId type
   * @param {boolean} [config.random] - Optional flag to generate a random ObjectId
   * @returns {import('@sinclair/typebox').TString & { static: ObjectId }} A TypeBox schema for MongoDB ObjectId
   */
  ObjectId: (config?: { default?: string; random?: boolean }) => {
    if (config?.default) {
      if (ObjectId.isValid(config.default)) {
        return Type.String({
          format: 'objectid',
          description: 'MongoDB ObjectId',
          default: config.default
        }) as unknown as TSchema & { static: ObjectId };
      }
      throw new Error('Invalid default value for ObjectIdType ' + config.default);
    }
    return Type.String({
      format: 'objectid',
      description: 'MongoDB ObjectId',
      default: () => config?.default || (config?.random ? new ObjectId().toString() : undefined)
    }) as unknown as TSchema & { static: ObjectId };
  }
} as const;

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
 * @param oidPaths Array of paths containing ObjectId fields
 * @returns Converted object with ObjectId instances
 */
const convertStringsToObjectIds = <T extends object>(obj: T, schema: TSchema, oidPaths: string[]): T => {
  // Handle direct ObjectId case
  if (oidPaths.length === 1 && oidPaths[0] === '') {
    if (obj === undefined && schema.default) return new ObjectId(schema.default) as any;
    if (typeof obj === 'string' && ObjectId.isValid(obj)) return new ObjectId(obj) as any;
    if (obj instanceof ObjectId) return obj as any;
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
        target[first] = new ObjectId(target[first]);
      }
    } else {
      if (target[first]) {
        setValue(target[first], rest, value);
      }
    }
  };

  // Handle nested object cases
  for (const path of oidPaths) {
    if (path !== '') {
      setValue(obj, path.split('.'), null);
    }
  }

  return obj;
};

/**
 * Converts MongoDB ObjectId instances to strings
 * @param obj Object to convert
 * @param schema Schema defining ObjectId fields
 * @param oidPaths Array of paths containing ObjectId fields
 * @returns Converted object with ObjectId instances converted to strings
 */
const convertObjectIdToStrings = <T extends object>(obj: T, schema: TSchema, oidPaths: string[]): T => {
  // Handle direct ObjectId case
  if (oidPaths.length === 1 && oidPaths[0] === '') {
    if (obj instanceof ObjectId) return obj.toString() as any;
    return obj as any;
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
      if (target[first] instanceof ObjectId) {
        target[first] = target[first].toString();
      }
    } else {
      if (target[first]) {
        setValue(target[first], rest, value);
      }
    }
  };

  // Handle nested object cases
  for (const path of oidPaths) {
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
 * @param containsObjectId Whether the schema contains ObjectId fields
 * @param skipOperations Array of operations to skip during validation. default performed operations: ['Clean', 'Default', 'Convert', 'ConvertOID']
 * @returns Tuple of [error message or null, validated value]
 * @note
 * - When nothing is specified then it will perform all operations
 * - When `Convert` is specified then it will convert the ObjectId string to ObjectId instance
 * - When `Default` is specified then it will set the default value
 * - When `Clean` is specified then it will remove the extra spaces and trim the string
 * - Validate will never mutate the original value as it creates a clone of the value 1st
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
  containsObjectId: boolean = false,
  skipOperations: ('Clean' | 'Default' | 'Convert')[] = []
): [string | null, T] => {
  // If schema isn't pre-compiled, compile it on the fly but warn about it
  if (!schema._compiled) {
    console.warn('Schema not pre-compiled. Use createSchema for better performance.');
    return validate(value, createCompiledSchema(schema), containsObjectId, skipOperations);
  }

  const _operations: Set<TParseOperation> = new Set(['Clone', 'Clean', 'Default', 'Convert']);
  const _skipOperations: Set<TParseOperation> = new Set(skipOperations);
  // const operations = Array.from(_operations.difference(_skipOperations));
  const operations = Array.from(setDifference(_operations, _skipOperations));
  // console.log({ _operations, _skipOperations, operations });

  let oidPaths: string[];
  let VP: Static<typeof schema>;
  const opts: any[] = ['Clone', ...Array.from(new Set(operations))];
  if (containsObjectId) {
    oidPaths = getObjectIdPaths(schema);
    VP = convertObjectIdToStrings(value, schema, oidPaths); // convert ObjectId to string
  }
  VP = Value.Parse(opts, schema, value) as Static<typeof schema>; // clone, clean, default, convert
  const R = schema._compiled.Check(VP);

  if (!R) {
    const E = schema._compiled.Errors(VP).First();
    const path = E?.path ? ` at '${E.path}'` : '';
    const errorValue = E?.value ? ` (got ${JSON.stringify(E.value)})` : '';
    return [`${E?.message || 'Invalid value'}${path}${errorValue}`, value as T];
  }
  if (containsObjectId) {
    VP = convertStringsToObjectIds(VP as any, schema, oidPaths!); // convert ObjectId back to string
  }
  return [null, VP as T];
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

type TObjectId = TSchema & { static: ObjectId };
export {
  Static,
  Type,
  validate,
  validateArray,
  createCompiledSchema as createSchema,
  Utils,
  TObjectId,
  convertObjectIdToStrings,
  convertStringsToObjectIds
};
export type {
  TSchema,
  TObject,
  TArray,
  TBoolean,
  TDate,
  TFunction,
  TInteger,
  TLiteral,
  TNull,
  TNumber,
  TPromise,
  TRecord,
  TString,
  TTuple,
  TUnion,
  TUnknown,
  TVoid
} from '@sinclair/typebox';
