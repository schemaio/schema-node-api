const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/products', () => {
  schema.init();

  describe('GET /v1/products?category=:id', () => {
    it('returns active products by category', () => {
      // TODO
    });
  });

  describe('GET /v1/products/:id', () => {
    it('returns a single active product', () => {
      // TODO
    });
  });
});
