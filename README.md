# egg-graphql-partialable
---
> fork 自 [egg-graphql](https://github.com/eggjs/egg-graphql)，npm包名更换为`egg-graphql-partialable`，使用方法与`egg-graphql`保持一致
从egg-graphql的基础上添加 #import 指令的支持，以支持文件拆分功能。

## 使用方式

```graphql
# user.graphql
type User {
  name: String!
  age: Int!
  password: String
  #import recFields.graphql
}
```

```graphql
# recFields.graphql
enabled: Boolean!
createAt: Date!
updateAt: Date!
```
