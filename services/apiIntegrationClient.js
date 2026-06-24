const parseStoredJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const interpolateString = (value, variables) => value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
  if (variables[key] === undefined || variables[key] === null) {
    return "";
  }

  return String(variables[key]);
});

const interpolateValue = (value, variables) => {
  if (typeof value === "string") {
    return interpolateString(value, variables);
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, variables));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((payload, [key, item]) => {
      payload[key] = interpolateValue(item, variables);
      return payload;
    }, {});
  }

  return value;
};

const buildExternalApiUrl = (integration, variables = {}) => {
  const baseUrl = interpolateString(integration.base_url, variables);
  const path = interpolateString(integration.path, variables);
  const url = new URL(`${baseUrl}${path}`);
  const query = interpolateValue(parseStoredJson(integration.query_json, {}), variables);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const callExternalIntegration = async (integration, options = {}) => {
  const variables = options.variables || {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  const headers = interpolateValue(parseStoredJson(integration.headers_json, {}), variables);
  const requestOptions = {
    method: integration.method,
    headers,
    signal: controller.signal
  };
  const storedBody = parseStoredJson(integration.body_json, null);
  const bodyPayload = storedBody === null ? options.defaultBody : interpolateValue(storedBody, variables);

  if (["POST", "PUT", "DELETE"].includes(integration.method) && bodyPayload !== undefined && bodyPayload !== null) {
    if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      requestOptions.headers = {
        ...headers,
        "content-type": "application/json"
      };
    }

    requestOptions.body = JSON.stringify(bodyPayload);
  }

  try {
    const startedAt = Date.now();
    const response = await fetch(buildExternalApiUrl(integration, variables), requestOptions);
    const responseText = await response.text();
    const durationMs = Date.now() - startedAt;
    const expectedStatus = Number(integration.expected_status || 200);
    const status = response.status === expectedStatus ? "ok" : "failed";

    return {
      status,
      success: status === "ok",
      responseCode: response.status,
      responseBody: responseText.slice(0, 5000),
      durationMs,
      message: status === "ok"
        ? `Endpoint merespons sesuai expected status ${expectedStatus}.`
        : `Endpoint merespons ${response.status}, expected ${expectedStatus}.`
    };
  } catch (error) {
    const message = error.name === "AbortError" ? "Request timeout setelah 10 detik." : error.message;

    return {
      status: "failed",
      success: false,
      responseCode: null,
      responseBody: message,
      durationMs: null,
      message
    };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  callExternalIntegration,
  parseStoredJson
};
