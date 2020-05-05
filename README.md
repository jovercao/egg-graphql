# egg-graphql
---
> 该项目派生自[egg-graphql](https://github.com/eggjs/egg-graphql)，npm包名更换为`@jovercao/egg-graphql`

## 使用方法

- 架构文件

在 `egg-graphq`的基础上添加了以下功能：

1. 添加 #import 指令的支持，以支持文件拆分功能，详见下文
2. 添加代码编译报错提示（精确到行列），帮助你迅速找到grahql错误文件位置
3. 解决了对graphql及graphql-tools版本依赖过旧带来的问题。

## gql文件支持 #import指令使用方式

**目录结构如下：**

- src
  - user
    - schema.graphql
    - user.graphql
    - extFields.graphql

**文件内容如下：**

```graphql
# schema.graphql
#import ./user.graphql

type Query {
  user(id: Int!): User!
}
```

```graphql
# user.graphql
type User {
  name: String!
  age: Int!
  password: String
  #import ./extFields.graphql
}
```

```graphql
# extFields.graphql
enabled: Boolean!
createAt: Date!
updateAt: Date!
```

**编译后结果：**

```graphql
type User {
  name: String!
  age: Int!
  password: String
  enabled: Boolean!
  createAt: Date!
  updateAt: Date!
}

type Query {
  user(id: Int!): User!
}
```
