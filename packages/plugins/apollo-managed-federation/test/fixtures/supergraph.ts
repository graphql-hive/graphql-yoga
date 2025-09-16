export const supergraphSdl = /* GraphQL */ `
  schema
    @core(feature: "https://specs.apollo.dev/core/v0.2")
    @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION) {
    query: Query
  }

  directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

  directive @join__field(
    graph: join__Graph
    provides: join__FieldSet
    requires: join__FieldSet
  ) on FIELD_DEFINITION

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE

  directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

  directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

  type Query {
    users: [User] @join__field(graph: SERVICE_AUTH)
  }

  type User
    @join__owner(graph: SERVICE_AUTH)
    @join__type(graph: SERVICE_AUTH, key: "id")
    @join__type(graph: SERVICE_IDENTITY, key: "id") {
    id: ID! @join__field(graph: SERVICE_AUTH)
    name: String @join__field(graph: SERVICE_IDENTITY)
    username: String @join__field(graph: SERVICE_AUTH)
  }

  enum core__Purpose {
    """
    \`EXECUTION\` features provide metadata necessary to for operation execution.
    """
    EXECUTION

    """
    \`SECURITY\` features provide metadata necessary to securely resolve fields.
    """
    SECURITY
  }

  scalar join__FieldSet

  enum join__Graph {
    SERVICE_AUTH @join__graph(name: "service_auth", url: "http://auth.services.com")
    SERVICE_IDENTITY @join__graph(name: "service_identity", url: "http://identity.services.com")
  }
`;
