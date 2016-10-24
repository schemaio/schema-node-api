const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/account', () => {
  schema.init();

  beforeEach(() => {
    schema.expectLoggedOut();
  });

  describe('GET /v1/account', () => {
    it('throws an error when logged out', () => {
      return api.get('/v1/account').then(result => {
        assert.ok(result && result.error);
      });
    });

    describe('when logged in', () => {
      beforeEach(() => {
        schema.reset();
        schema.expectLoggedIn();
      });

      it('returns account data', () => {
        schema.expects([
          {
            method: 'get',
            url: '/accounts/{id}',
            result: {
              id: 123,
              first_name: 'foo',
            }
          }
        ]);
        return api.get('/v1/account', {
          first_name: 'foo',
          last_name: 'bar',
        }).then(result => {
          assert.deepEqual(result, {
            id: 123,
            first_name: 'foo',
          });
        });
      });

      it('throws an error when updating restricted fields', () => {
        return api.put('/v1/account', {
          bad_field: 'foo',
        }).then(result => {
          assert.ok(result && result.error);
          assert.equal(result.error, 'Error: Query may not specify `bad_field` on this resource');
        });
      });
    });
  });

  describe('PUT /v1/account', () => {
    it('throws an error when logged out', () => {
      return api.put('/v1/account').then(result => {
        assert.ok(result && result.error);
      });
    });

    describe('when logged in', () => {
      beforeEach(() => {
        schema.reset();
        schema.expectLoggedIn();
      });

      it('sets account fields which are allowed', () => {
        schema.expects([
          {
            method: 'put',
            url: '/accounts/{id}',
            result: {
              first_name: 'foo',
              last_name: 'bar',
            }
          }
        ]);
        return api.put('/v1/account', {
          first_name: 'foo',
          last_name: 'bar',
        }).then(result => {
          assert.ok(result && result.first_name);
        });
      });

      it('throws an error when updating restricted fields', () => {
        return api.put('/v1/account', {
          bad_field: 'foo',
        }).then(result => {
          assert.ok(result && result.error);
          assert.equal(result.error, 'Error: Query may not specify `bad_field` on this resource');
        });
      });
    });
  });

  describe('POST /v1/account', () => {
    it('throws an error when logged in', () => {
      schema.reset();
      schema.expectLoggedIn();
      return api.post('/v1/account').then(result => {
        assert.ok(result && result.error);
      });
    });

    it('creates account and logs in', () => {
      schema.expects([
        {
          method: 'post',
          url: '/accounts',
          result: {
            id: 123,
            email: 'new@example.com',
          }
        },
        {
          method: 'put',
          url: '/:sessions/{id}',
          result: {
            id: schema.sessionId,
            account_id: 123,
          }
        }
      ]);
      return api.post('/v1/account', {
        email: 'new@example.com',
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          email: 'new@example.com',
        });
      });
    });

    it('creates account with default customer group and type', () => {
      schema.expects([
        {
          method: 'post',
          url: '/accounts',
          data: {
            email: 'new@example.com',
            group: 'customers',
            type: 'individual',
          },
          result: {
            id: 123,
            email: 'new@example.com',
            group: 'customers',
            type: 'individual',
          }
        }
      ]);
      return api.post('/v1/account', {
        email: 'new@example.com',
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          email: 'new@example.com',
          group: 'customers',
          type: 'individual',
        });
      });
    });
  });

  describe('POST /v1/account/login', () => {
    it('saves to session when successful', () => {
      schema.expects([
        {
          method: 'get',
          url: '/accounts/:login',
          data: {
            email: 'customer@example.com',
            password: 'foobar'
          },
          result: {
            id: 123,
            email: 'customer@example.com'
          }
        },
        {
          method: 'put',
          url: '/:sessions/{id}',
          data: {
            id: schema.sessionId,
            account_id: 123,
            account_group: undefined
          }
        }
      ]);
      return api.post('/v1/account/login', {
        email: 'customer@example.com',
        password: 'foobar',
      }).then(result => {
        assert.deepEqual(result, {
          id: 123,
          email: 'customer@example.com'
        });
      });
    });

    it('returns null when unsuccessful', () => {
      schema.expects([
        {
          method: 'get',
          url: '/accounts/:login',
          result: null,
        }
      ]);
      return api.post('/v1/account/login', {
        email: 'customer@example.com',
        password: 'bad',
      }).then(result => {
        assert.deepEqual(result, null);
      });
    });
  });

  describe('POST /v1/account/logout', () => {
    it('nullifies account id and group in session', () => {
      schema.expects([
        {
          method: 'put',
          url: '/:sessions/{id}',
          data: {
            id: schema.sessionId,
            account_id: null,
            account_group: null,
          }
        }
      ]);
      return api.post('/v1/account/logout').then(result => {
        assert.deepEqual(result, {
          success: true
        });
      });
    });
  });

  describe('POST /v1/account/recover', () => {
    it('sets recovery params and sends notification', () => {
      const expireDate = new Date();
      schema.expects([
        {
          method: 'get',
          url: '/accounts/{email}',
          result: {
            id: 123
          }
        },
        {
          method: 'put',
          url: '/accounts/{id}',
          data: (data) => {
            return {
              id: 123,
              $notify: 'password-reset',
              password_reset_url: 'http://example.com/account/recover/' + data.password_reset_key,
              password_reset_key: data.password_reset_key,
              password_reset_expired: data.password_reset_expired
            };
          }
        }
      ]);
      return api.post('/v1/account/recover', {
        email: 'customer@example.com',
        reset_url: 'http://example.com/account/recover/{key}',
      }).then(result => {
        assert.strictEqual(result.success, true);
      });
    });

    it('returns an error if email is blank', () => {
      return api.post('/v1/account/recover', {
        email: '',
      }).then(result => {
        assert.ok(result);
        assert.ok(result.errors.email);
        assert.strictEqual(result.errors.email.code, 'REQUIRED');
      });
    });

    it('resets password with valid key, before expired', () => {
      schema.expects([
        {
          method: 'get',
          url: '/accounts/:first',
          data: {
            password_reset_key: 'test_key'
          },
          result: {
            id: 123,
            password_reset_expired: Date.now() + 999999,
          }
        },
        {
          method: 'put',
          url: '/accounts/{id}',
          data: {
            id: 123,
            password: 'new password',
            password_reset_url: null,
            password_reset_key: null,
            password_reset_expired: null
          },
          result: {
            id: 123
          }
        }
      ]);
      return api.post('/v1/account/recover', {
        reset_key: 'test_key',
        password: 'new password'
      }).then(result => {
        assert.strictEqual(result.success, true);
      });
    });

    it('returns an error if reset is expired', () => {
      schema.expects([
        {
          method: 'get',
          url: '/accounts/:first',
          data: {
            password_reset_key: 'test_key',
          },
          result: {
            id: 123,
            password_reset_expired: Date.now() - 1,
          },
        },
      ]);
      return api.post('/v1/account/recover', {
        reset_key: 'test_key',
        password: 'new password'
      }).then(result => {
        assert.ok(result.errors);
        assert.ok(result.errors.reset_key);
        assert.strictEqual(result.errors.reset_key.code, 'INVALID');
      });
    });
  });

  describe('GET /v1/account/orders', () => {
    it('throws an error when logged out', () => {
      return api.get('/v1/account/orders').then(result => {
        assert.ok(result && result.error);
      });
    });

    describe('when logged in', () => {
      beforeEach(() => {
        schema.reset();
        schema.expectLoggedIn();
      });

      it('returns account orders', () => {
        schema.expects([
          {
            method: 'get',
            url: '/orders',
            data: {
              account_id: schema.sessionId,
              fields: undefined,
              limit: undefined,
            },
            result: {
              count: 0,
              results: [],
            },
          },
        ]);
        return api.get('/v1/account/orders').then(result => {
          assert.deepEqual(result, {
            count: 0,
            results: [],
          });
        });
      });
    });
  });

  describe('GET /v1/account/orders/:id', () => {
    it('throws an error when logged out', () => {
      return api.get('/v1/account/orders/1').then(result => {
        assert.ok(result && result.error);
      });
    });

    describe('when logged in', () => {
      beforeEach(() => {
        schema.reset();
        schema.expectLoggedIn();
      });

      it('returns account orders', () => {
        schema.expects([
          {
            method: 'get',
            url: '/orders/{id}',
            data: {
              id: '1',
              account_id: schema.sessionId,
              fields: undefined,
            },
            result: {
              id: '1',
            },
          },
        ]);
        return api.get('/v1/account/orders/1').then(result => {
          assert.deepEqual(result, {
            id: '1',
          });
        });
      });
    });
  });
});
