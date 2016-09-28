# Schema NodeJS API

A standalone API for JS and other clients to use with Schema. Extend basic endpoints with your own custom functionality, for example, validating user input special or scoping product queries for client usage.

```
Schema.io <==> NodeJS API (This Package) <==> Your App (React/Angular/Ember/Rails/Etc)
```

## Getting Started

- Clone this repository
- Create `.env` file in the repository and set `development` values (see example `.env` file)
- Run `nvm install` (make sure you have [nvm installed](https://github.com/creationix/nvm))
- Run `npm install`
- Run `npm run watch`

### Example .env file

```bash
NODE_ENV=development
PORT=3001
FORCE_SSL=true # redirect all requests to https
SCHEMA_CLIENT_ID=my-client-id
SCHEMA_CLIENT_KEY=my-client-key
```

# API Usage

### Sessions

Sessions are used to track persistent data associated with the end user, such as Account and Cart records. The client should pass an HTTP header named `X-Session` in every request to identify the current user.

```
X-Session: a4916a9b-717b-4d68-bb78-e5fc8e51591f
```

Your session ID can be of any format and should be created and stored by the client, typically stored as a cookie in a browser.

It's not strictly required to pass the session header, but certain endpoints will throw an error without one.

### /v1/account

#### Get current account (session required)

```json
GET /v1/account
```

Sensitive fields may be removed from the response. See `api/v1/account.js` for details.

#### Update current account

```json
PUT /v1/account
{
  "first_name": "Example",
  "last_name": "Customer",
  "email": "customer@example.com"
}
```

Only specific fields may be updated. See `api/v1/account.js` for details.

#### Create account for the current user

```json
POST /v1/account
{
  "first_name": "Example",
  "last_name": "Customer",
  "email": "customer@example.com"
}
```

Only specific fields may be created. See `api/v1/account.js` for details.

#### Login to account

```json
POST /v1/account/login
{
  "email": "customer@example.com",
  "password": "example password"
}
```

If email and password are correct, an account record will be returned. Otherwise `null`.

#### Logout of current account

```json
POST /v1/account/logout
```

This will remove the previously logged in `account_id` from the session.

#### Send password recovery email

```json
POST /v1/account/recover
{
  "email": "customer@example.com",
  "reset_url": "https://mystore.com/account/recover/{key}"
}
```

This will send an email to the account if one found, that contains the `reset_url` parameter and a dynamically generated `key` appended to it. Your recovery page must recognize this `key` parameter and use it in the following step.

#### Reset password from recovery email

```json
POST /v1/account/recover
{
  "reset_key": "iud287ebuf9uwf92fdi2uhef872h",
  "password": "new password"
}
```

This will reset an account's password if the `reset_key` is found. If successful, it will return an account record and automatically login using the current session. If the `reset_key` has expired or is not found, it will return an error.

## /v1/cart

#### Get current cart details (session required)

```json
GET /v1/cart
```

Sensitive fields may be removed from the response. See `api/v1/cart.js` for details.

#### Update current cart details

```json
PUT /v1/cart
{
  "shipping": {
    "name": "Example Customer",
    "address1": "123 Example St",
    "city": "Example City",
    "state": "EX",
    "zip": "90210",
    "country": "US",
    "service": "fedex_ground"
  },
  "billing": {
    "name": "Example Customer",
    "address1": "123 Example St",
    "city": "Example City",
    "state": "EX",
    "zip": "90210",
    "country": "US",
    "card": {
      "token": "tok_..."
    }
  },
  "items": [
    {
      "product_id": "...",
      "quantity": 3,
      "options": [
        {
          "id": "optional",
          "value": "example"
        }
      ]
    }
  ]
}
```

Only specific fields may be updated. See `api/v1/cart.js` for details.

This endpoint supports incremental updates for multi-page checkout flows. For example, you might pass `shipping` details in one request, and `billing` details in another request. Also, you'll probably want to use `/v1/cart/add-item` and `/v1/cart/remove-item` for incremental item updates.

If the cart does not exist for the current session, it will be automatically created.

#### Create cart for the current user

```json
POST /v1/cart
```

This will create a cart for the current session, if one does not already exist. Note that it's not usually necessary to make this request, since other requests like `/v1/cart/add-item` will do the same automatically on demand.

#### Add item to cart

```json
POST /v1/cart/add-item
{
  "product_id": "...",
  "quantity": 3,
  "options": [
    {
      "id": "optional",
      "value": "example"
    }
  ]
}
```

This will add an item to the cart. If the cart does not exist for the current session, it will be automatically created.

If the same product and options already exist in the cart, then its quantity will combined into a single item.

#### Remove item from cart

```json
POST /v1/cart/remove-item
{
  "item_id": "..."
}
```

This will remove an item from the cart matching `item_id`. You can get the item ID value from any of the previous calls to the cart endpoint.

#### Apply a coupon

```json
POST /v1/cart/apply-coupon
{
  "code": "SHIPFREE"
}
```

This will apply a valid coupon code to the cart and affect all relevant prices. If the coupon code is not found or is not valid, the server will respond with status `400` and an error message.

To remove an applied coupon, make the same request with `"code": null`.

#### Get shipping prices

```json
GET /v1/cart/shipment-rating
```

This will return an object with shipping services and prices relevant to the current cart state. For example, if your setup is configured with FedEx Ground enabled and real-time pricing, then you will get an object containing that shipping method and others available to the current shipping address in the cart.

The typical flow is to update the cart with shipping information first, then make this request to get available shipping options and prices.

### Convert cart to order

```json
POST /v1/cart/checkout
```

This will attempt to convert a cart to an order including all the cart's details such as items, shipping, and billing. You may optionally pass any of these details along with this request in order to consolidate API calls.

If successful, an order record will be returned. Otherwise an error.

## /v1/categories

#### Get category by slug or ID

```json
GET /v1/categories/:slug
```

Sensitive fields may be removed from the response. See `api/v1/categories.js` for details.

#### Get sub-categories by slug or ID

```json
GET /v1/categories/:slug/children
```

#### Get products in a category

```json
GET /v1/categories/:slug/products
```

This will return all products in a category, including all nested sub-categories. For example, if `:id` is "jellybeans" which contains sub-categories "red" and "blue", then the result will contain all red and blue jellybean products.

Note: If you want to get products in a single category only and ignore sub-categories, then see `/v1/products` section.

## /v1/products

#### Get a product

```json
GET /v1/products/:id
```

Sensitive fields may be removed from the response. See `api/v1/products.js` for details.

#### Get products in a category

```json
GET /v1/products?category=:slug
```

This will return all products contain in a single category, ignoring sub-categories.

Note: If you want to get products including all sub-categories, then see `/v1/categories` section.

## /v1/contacts

#### Subscribe contact to email list(s)

```json
POST /v1/contacts/subscribe
{
  "first_name": "Example",
  "last_name": "Customer",
  "email": "customer@example.com",
  "email_optin_lists": ["optional", "lists"]
}
```

All fields are optional except `email`. You may use `email_optin_lists` for tracking your own custom email list segments.

#### Unsubscribe contact from email list(s)

```json
POST /v1/contacts/unsubscribe
{
  "email": "customer@example.com",
  "email_optin_lists": ["optional"]
}
```

This will flip the `email_optin` field to false on the contact record. If `email_optin_lists` is passed, then it will remove those lists from the contact record.


## /v1/pages

#### Get a page

```json
GET /v1/pages/:id
```

Pages are used to store content such as About Us, Privacy Policy, etcetera.

#### Get page articles

```json
GET /v1/pages/:id/articles
```

Articles are useful for different things depending on the page itself. For example, you might think of articles on a Gallery page as images, or articles in a knowledge base. Use your imagination.


#### Get a page article

```json
GET /v1/pages/:id/articles/:article_id
```

## /v1/sessions

#### Get current session details

```json
GET /v1/session
```

This will return current session data, including `account_id` and `cart_id`, along with any other arbitrary fields stored by your client.

#### Update current session details

```json
PUT /v1/session
{
  "arbitrary_field": "example"
}
```

Update the current session with any fields that might be useful to your client. Specific fields such as `account_id` and `cart_id` are restricted and will result in an error if passed.

## Testing

```bash
npm test
```

As a best practice, you should write tests for all new or modified endpoints.

#### Schema client testing

The test setup includes a Schema client that should be used to stub itself with expected requests and results. This allows you to easily test your own API code, without calling out to the Schema.io API itself. It makes test faster and more reliable.

Here's an example using this test client:

```javascript
const schema = Test.schemaClient();
const api = Test.apiClient(schema);

describe('/v1/account', () => {
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
});
```

## Support

Need help with this package? Visit us in Slack at https://slack.schema.io

## Contributing

Pull requests are welcome.

## License

MIT
