
import 'egg';
import { GraphQLSchema, GraphQLFieldResolver } from 'graphql'

declare module 'egg' {
  interface Application {
    graphql: {
        readonly schema: GraphQLSchema
        readonly resolvers: {
          [type: string]: {
            [field: string]: GraphQLFieldResolver<any, Context, any>
          }
        }
    }
  }
}
