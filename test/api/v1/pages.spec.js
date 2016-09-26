const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/pages', () => {
  schema.init();

  describe('GET /v1/pages/:id', () => {
    it('returns page by id', () => {
      // TODO
    });
  });

  describe('GET /v1/pages/:id/articles', () => {
    it('returns page articles by id', () => {
      // TODO
    });
  });

  describe('GET /v1/pages/:id/articles/:article_id', () => {
    it('returns single page article by id', () => {
      // TODO
    });
  });
});
