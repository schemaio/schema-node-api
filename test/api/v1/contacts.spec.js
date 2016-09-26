const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/contacts', () => {
  schema.init();

  describe('GET /v1/contacts/subscribe', () => {
    it('subscribes contact to email lists', () => {
      // TODO
    });
  });

  describe('GET /v1/contacts/unsubscribe', () => {
    it('unsubscribes contact from email lists', () => {
      // TODO
    });
  });
});
