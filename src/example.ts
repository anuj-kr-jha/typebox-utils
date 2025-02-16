import { Utils, Static, Type, validate, createSchema, TObjectId } from './index';

const UserSchema = createSchema(
  Type.Object({
    _id: Type.Optional(Utils.ObjectId()) as TObjectId,
    name: Type.String(),
    age: Type.Number(),
    email: Utils.Email({ random: true }),
    createdAt: Type.Optional(Type.Date({ default: () => new Date() })),
    updatedAt: Type.Optional(Type.Date({ default: () => new Date() }))
  })
);
type User = Static<typeof UserSchema>;

const user = {
  name: 'John Doe',
  age: 30
  // createdAt: new Date()
};

const res = validate<User>(user, UserSchema);
console.log(res);
