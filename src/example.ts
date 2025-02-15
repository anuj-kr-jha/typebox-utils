import { validateArray } from 'typebox-utils';
import { Utils, Static, Type, validate, createSchema } from './index';

const schema = createSchema(
  Type.Object({
    _id: Type.Optional(Utils.ObjectId({ random: true })),
    name: Type.String({ default: 'John Doe' }),
    email: Utils.UUID({ random: true })
  })
);

type T = Static<typeof schema>;

console.log(validateArray<T>([{}, {}], schema));
