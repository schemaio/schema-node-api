const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/slug', () => {
  schema.init();

  describe('GET /v1/slug/:id*', () => {
    it('returns record by slug', () => {
      // TODO
    });
  });
});
