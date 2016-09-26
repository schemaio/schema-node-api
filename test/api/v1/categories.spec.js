const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/categories', () => {
  schema.init();

  describe('GET /v1/categories/:id', () => {
    it('returns category by id', () => {
      // TODO
    });
  });

  describe('GET /v1/categories/:id/children', () => {
    it('returns category children by id', () => {
      // TODO
    });
  });

  describe('GET /v1/categories/:id/products', () => {
    it('returns category products by id', () => {
      // TODO
    });
  });
});
