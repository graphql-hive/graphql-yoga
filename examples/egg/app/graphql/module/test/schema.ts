export const testTypeDefs = `#graphql

type Test {
    id: String

    name: String
}

type TestList {
    count: Int
    data: [Test]
}

type Query {
    testList: TestList
}
`;
