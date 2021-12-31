import JSONAPIAdapter from "@ember-data/adapter/json-api";
import { inject as service } from "@ember/service";
import { handleUnauthorized } from "ember-simple-auth-oidc";

export default class OIDCAdapter extends JSONAPIAdapter {
  @service session;

  constructor(...args) {
    super(...args);

    // Proxy ember-data requests to ensure prior token refresh
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (
          [
            "findRecord",
            "createRecord",
            "updateRecord",
            "deleteRecord",
            "findAll",
            "query",
            "findMany",
          ].includes(prop)
        ) {
          return new Proxy(target[prop], {
            async apply(...args) {
              await target.session.refreshAuthentication.perform();
              return Reflect.apply(...args);
            },
          });
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  get headers() {
    return this.session.headers;
  }

  handleResponse(status, ...args) {
    console.log("handleResponse:", status);
    if (status === 401) {
      handleUnauthorized(this.session);
    }
    return super.handleResponse(status, ...args);
  }
}
