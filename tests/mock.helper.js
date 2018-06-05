const failTest = t => error => { t.fail(error); t.end(); };
const nest = name => `  -> ${name}`;

function createFetchMock() {
  let givenOptions = {};
  let headers = {};
  let method;
  let body;
  let responseStatus = 200;
  let requestedUrl;

  return {
    fetchFunc: function fetchMock(url, opts) {
      headers = opts.headers;
      method = opts.method;
      givenOptions = opts;
      requestedUrl = url;

      const response = {
        status: responseStatus,
        statusText: `Returning response of ${responseStatus}`,
        ok: responseStatus < 400,
        bodyData: body,
        json() {
          return new Promise((resolve, reject) => {
            try {
              const json = JSON.parse(body);
              resolve(json);
            } catch (error) {
              reject(error);
            }
          });
        }
      };

      return Promise.resolve(response);
    },
    respondWith(respStatus, respBody) {
      responseStatus = respStatus;
      body = JSON.stringify(respBody);
    },
    options() { return givenOptions; },
    headers() { return headers; },
    method() { return method; },
    body() { return body; },
    responseStatus() { return responseStatus; },
    url() { return requestedUrl; }
  };
}

export { failTest, nest, createFetchMock };
