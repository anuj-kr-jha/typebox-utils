import { ObjectId } from 'mongodb';
import { Utils, Static, Type, Decode, TObjectId } from './index';

const UserSchema = Type.Object(
  {
    _id: Type.Optional(Utils.ObjectId({ default: '000000000000000000000000' })),
    name: Type.String(),
    age: Type.Number(),
    union: Type.Union([Utils.ObjectId(), Type.Number(), Type.Null()], {
      errorMessage: 'Expected either a 24-character hex string or an ObjectID or number or null'
    }),
    email: Type.Optional(Utils.Email({ default: 'user@example.com' })),
    createdAt: Type.Optional(Type.Date({ default: () => new Date() }))
    // updatedAt: Type.Optional(Type.Date({ default: () => new Date() }))
  }
  // { additionalProperties: true } // default true
);

type User = Static<typeof UserSchema>;

const user = {
  _id: '000000000000000000000001',
  name: 'John Doe',
  age: 30,
  union: null,
  y: 1
  // union: 'x'
  // createdAt: new Date()
};

const [error, res] = Decode(user, UserSchema, false);
console.error('Validation error:', error);
console.log('Validation successful:', res);

5;
