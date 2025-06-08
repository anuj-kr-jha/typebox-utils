/**
 * @package
 */

import { FormatRegistry, StaticDecode, StaticEncode, Type, type Static, type TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { ObjectId } from 'mongodb';
/**
 * Register custom formats for validation
 */
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
   * @returns {import('@sinclair/typebox').TNumber} A TypeBox schema for Unix timestamp
   */
  Timestamp: (config?: { default?: number; minimum?: number; maximum?: number }) =>
    Type.Number({
      minimum: config?.minimum || 0,
      maximum: config?.maximum,
      default: config?.default,
      description: 'Unix timestamp (milliseconds since epoch)'
    }),

  /**
   * UUID v4 format type
   * @param {Object} config - Configuration object for the UUID type
   * @param {string} [config.default] - Optional default UUID string
   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for UUID v4
   */
  UUID: (config?: { default?: string }) => {
    if (config?.default) {
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(config.default)) {
        throw new Error('Invalid default value for UUID ' + config.default);
      }
    }
    return Type.String({
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
      description: 'UUID v4 format',
      default: config?.default
    });
  },

  /**
   * Email format type
   * @param {Object} config - Configuration object for the Email type
   * @param {string} [config.default] - Optional default email address
   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for email format
   */
  Email: (config?: { default?: string }) => {
    if (config?.default) {
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(config.default)) {
        throw new Error('Invalid default value for Email ' + config.default);
      }
    }
    return Type.String({
      format: 'email',
      description: 'Email format: example@domain.com',
      default: config?.default
    });
  },

  /**
   * Mobile number format type (10 digits)
   * @param {Object} config - Configuration object for the Mobile type
   * @param {string} [config.default] - Optional default mobile number
1   * @returns {import('@sinclair/typebox').TString} A TypeBox schema for mobile number format
   */
  Mobile: (config?: { default?: string }) => {
    if (config?.default) {
      if (!/^[0-9]{10}$/.test(config.default)) {
        throw new Error('Invalid default value for Mobile ' + config.default);
      }
    }
    return Type.String({
      format: 'mobile',
      description: '10-digit mobile number',
      default: config?.default
    });
  },

  /**
   * ObjectId type
   * @param {Object} config - Configuration object for the ObjectId type
   * @param {string} [config.default] - Optional default value for the ObjectId type
   * @returns {import('@sinclair/typebox').TString & { static: ObjectId }} A TypeBox schema for MongoDB ObjectId
   */
  ObjectId: (config?: { default?: string }): TObjectId => {
    const raw = Type.Union(
      [
        Type.RegExp(/^[0-9a-fA-F]{24}$/),
        Type.Object({
          _bsontype: Type.Literal('ObjectID'),
          generationTime: Type.Integer(),
          id: Type.Any()
        })
      ],
      { errorMessage: 'Expected either a 24-character hex string or an ObjectID' }
    );

    const transformed = Type.Transform(raw)
      .Decode(value => (typeof value === 'string' ? new ObjectId(value) : new ObjectId((value as any).id)))
      .Encode(value => (value instanceof ObjectId ? value.toString() : String(value)));

    if (config?.default) transformed.default = config.default;
    return transformed as unknown as TObjectId;
  }
} as const;

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
// ------------------------------------------------------------------
// Encode and Decode Pipeline
// ------------------------------------------------------------------

function Encode<Type extends TSchema, Result = StaticEncode<Type>>(
  value: unknown,
  type: Type,
  applyDefault = true
): [error: string | null, result: Result] {
  try {
    const pipelines = applyDefault
      ? ['Encode', 'Assert', 'Convert', 'Default', 'Clean']
      : ['Encode', 'Assert', 'Convert', 'Clean'];
    const result = Value.Parse(pipelines, type, value) as never;
    return [null, result as Result] as const;
  } catch (e: any) {
    const msg = e?.error?.schema?.errorMessage || e?.error?.message || 'Unknown encoding error';
    const path = e?.error?.path || '';
    const passedValue = e?.error?.value || undefined;
    const generatedMessage = msg + ` at path "${path}" but got "${passedValue}"`;
    // console.error('Encoding error:', generatedMessage);
    // throw new Error(generatedMessage);
    return [generatedMessage, undefined as never];
  }
}

function Decode<Type extends TSchema, Result = StaticDecode<Type>>(
  value: unknown,
  type: Type,
  applyDefault = true
): [error: string | null, result: Result] {
  try {
    const pipelines = applyDefault
      ? ['Clean', 'Default', 'Convert', 'Assert', 'Decode']
      : ['Clean', 'Convert', 'Assert', 'Decode'];
    const result = Value.Parse(pipelines, type, value) as never;
    return [null, result as Result] as const;
  } catch (e: any) {
    const msg = e?.error?.schema?.errorMessage || e?.error?.message || 'Unknown decoding error';
    const path = e?.error?.path || '';
    const passedValue = e?.error?.value || undefined;
    const generatedMessage = msg + ` at path "${path}" but got "${passedValue}"`;
    // console.error('Decoding error:', generatedMessage);
    // throw new Error(generatedMessage);
    return [generatedMessage, undefined as never];
  }
}

type TObjectId = TSchema & { static: ObjectId };

export { Static, Type, Encode, Decode, Utils, type TObjectId };

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
