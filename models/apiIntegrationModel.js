const db = require("../config/db");

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, results) => {
    if (error) {
      return reject(error);
    }

    return resolve(results);
  });
});

const querySingle = async (sql, values = []) => {
  const results = await query(sql, values);
  return results[0] || null;
};

const stringifyJson = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
};

exports.getByProvider = (provider) => query(
  `
    SELECT
      id,
      provider,
      name,
      method,
      base_url,
      path,
      headers_json,
      query_json,
      body_json,
      expected_status,
      description,
      status,
      last_checked_at,
      last_response_code,
      last_response_body,
      is_active,
      created_at,
      updated_at
    FROM api_integrations
    WHERE provider = ?
    ORDER BY is_active DESC, updated_at DESC, id DESC
  `,
  [provider]
);

exports.getById = (id) => querySingle(
  `
    SELECT
      id,
      provider,
      name,
      method,
      base_url,
      path,
      headers_json,
      query_json,
      body_json,
      expected_status,
      description,
      status,
      last_checked_at,
      last_response_code,
      last_response_body,
      is_active,
      created_at,
      updated_at
    FROM api_integrations
    WHERE id = ?
    LIMIT 1
  `,
  [id]
);

exports.getActiveByProvider = (provider) => querySingle(
  `
    SELECT
      id,
      provider,
      name,
      method,
      base_url,
      path,
      headers_json,
      query_json,
      body_json,
      expected_status,
      description,
      status,
      last_checked_at,
      last_response_code,
      last_response_body,
      is_active,
      created_at,
      updated_at
    FROM api_integrations
    WHERE provider = ? AND is_active = 1
    LIMIT 1
  `,
  [provider]
);

exports.create = (integration) => query(
  `
    INSERT INTO api_integrations
      (provider, name, method, base_url, path, headers_json, query_json, body_json, expected_status, description)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
    integration.provider,
    integration.name,
    integration.method,
    integration.base_url,
    integration.path,
    stringifyJson(integration.headers_json),
    stringifyJson(integration.query_json),
    stringifyJson(integration.body_json),
    integration.expected_status || 200,
    integration.description || null
  ]
);

exports.update = (id, integration) => query(
  `
    UPDATE api_integrations
    SET name = ?,
        method = ?,
        base_url = ?,
        path = ?,
        headers_json = ?,
        query_json = ?,
        body_json = ?,
        expected_status = ?,
        description = ?,
        status = 'untested',
        last_checked_at = NULL,
        last_response_code = NULL,
        last_response_body = NULL
    WHERE id = ? AND provider = ?
  `,
  [
    integration.name,
    integration.method,
    integration.base_url,
    integration.path,
    stringifyJson(integration.headers_json),
    stringifyJson(integration.query_json),
    stringifyJson(integration.body_json),
    integration.expected_status || 200,
    integration.description || null,
    id,
    integration.provider
  ]
);

exports.updateStatus = ({ id, status, lastResponseCode, lastResponseBody }) => query(
  `
    UPDATE api_integrations
    SET status = ?,
        last_checked_at = NOW(),
        last_response_code = ?,
        last_response_body = ?
    WHERE id = ?
  `,
  [status, lastResponseCode || null, lastResponseBody || null, id]
);

exports.setActive = async ({ id, provider }) => {
  await query(
    `
      UPDATE api_integrations
      SET is_active = 0
      WHERE provider = ?
    `,
    [provider]
  );

  return query(
    `
      UPDATE api_integrations
      SET is_active = 1
      WHERE id = ? AND provider = ?
    `,
    [id, provider]
  );
};

exports.delete = (id, provider) => query(
  `
    DELETE FROM api_integrations
    WHERE id = ? AND provider = ?
  `,
  [id, provider]
);
