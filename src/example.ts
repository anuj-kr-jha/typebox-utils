import { ObjectIdType, Static, Type, validate, createSchema } from './index';

const schema = createSchema(
  Type.Object({
    _id: Type.Optional(ObjectIdType(true))
  })
);

type T = Static<typeof schema>;

const testData = { _id: 1 } as unknown as T;

const results = validate<T>(testData, schema);

// Log results
console.log('results:', results);
