const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/session', () => {
  schema.init();

  describe('GET /v1/session', () => {
    it('returns current session', () => {
      // TODO
    });
  });

  describe('PUT /v1/session', () => {
    it('updates current session', () => {
      // TODO
    });
  });
});
