const API_BASE_URL =
  'http://localhost:5000/api';

const TOKEN_STORAGE_KEY =
  'job_outreach_token';

function getStoredToken() {
  return localStorage.getItem(
    TOKEN_STORAGE_KEY
  );
}

function clearAuthentication() {
  localStorage.removeItem(
    TOKEN_STORAGE_KEY
  );
}

async function parseResponse(
  response
) {
  const contentType =
    response.headers.get(
      'content-type'
    ) || '';

  let responseData;

  if (
    contentType.includes(
      'application/json'
    )
  ) {
    responseData =
      await response.json();
  } else {
    const responseText =
      await response.text();

    responseData = {
      message:
        responseText ||
        'Request failed.'
    };
  }

  if (!response.ok) {
    if (
      response.status === 401
    ) {
      clearAuthentication();

      if (
        window.location.pathname !==
          '/login' &&
        window.location.pathname !==
          '/register'
      ) {
        window.location.href =
          '/login';
      }
    }

    const error =
      new Error(
        responseData.message ||
        `Request failed with status ${response.status}.`
      );

    error.status =
      response.status;

    error.response = {
      status:
        response.status,

      data:
        responseData
    };

    throw error;
  }

  return responseData;
}

async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    getStoredToken();

  const requestBody =
    options.body;

  const isFormData =
    requestBody instanceof FormData;

  const headers = {
    ...(options.headers || {})
  };

  /*
   * Do not manually set Content-Type
   * for FormData.
   *
   * The browser must generate the
   * multipart boundary automatically.
   */
  if (
    requestBody !== undefined &&
    requestBody !== null &&
    !isFormData &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] =
      'application/json';
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  return parseResponse(
    response
  );
}

/*
 * Direct helper methods.
 *
 * These return the parsed response data.
 *
 * Example:
 *
 * const result =
 *   await apiGet('/db-template');
 */
function apiGet(
  endpoint,
  options = {}
) {
  return apiRequest(
    endpoint,
    {
      ...options,
      method: 'GET'
    }
  );
}

function apiPost(
  endpoint,
  body,
  options = {}
) {
  const isFormData =
    body instanceof FormData;

  return apiRequest(
    endpoint,
    {
      ...options,

      method: 'POST',

      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body)
    }
  );
}

function apiPut(
  endpoint,
  body,
  options = {}
) {
  const isFormData =
    body instanceof FormData;

  return apiRequest(
    endpoint,
    {
      ...options,

      method: 'PUT',

      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body)
    }
  );
}

function apiPatch(
  endpoint,
  body,
  options = {}
) {
  const isFormData =
    body instanceof FormData;

  return apiRequest(
    endpoint,
    {
      ...options,

      method: 'PATCH',

      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body)
    }
  );
}

function apiDelete(
  endpoint,
  body,
  options = {}
) {
  return apiRequest(
    endpoint,
    {
      ...options,

      method: 'DELETE',

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body)
    }
  );
}

/*
 * Compatibility API.
 *
 * Your existing pages such as Dashboard.jsx
 * import:
 *
 * import { api } from '../services/api';
 *
 * Those pages may expect Axios-style:
 *
 * const response = await api.get('/preview');
 * console.log(response.data);
 *
 * Therefore these methods return:
 *
 * {
 *   data: parsedResponse
 * }
 */
const api = {
  async get(
    endpoint,
    options = {}
  ) {
    const data =
      await apiGet(
        endpoint,
        options
      );

    return {
      data
    };
  },

  async post(
    endpoint,
    body,
    options = {}
  ) {
    const data =
      await apiPost(
        endpoint,
        body,
        options
      );

    return {
      data
    };
  },

  async put(
    endpoint,
    body,
    options = {}
  ) {
    const data =
      await apiPut(
        endpoint,
        body,
        options
      );

    return {
      data
    };
  },

  async patch(
    endpoint,
    body,
    options = {}
  ) {
    const data =
      await apiPatch(
        endpoint,
        body,
        options
      );

    return {
      data
    };
  },

  async delete(
    endpoint,
    options = {}
  ) {
    const body =
      options.data;

    const data =
      await apiDelete(
        endpoint,
        body,
        options
      );

    return {
      data
    };
  }
};

export {
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  api,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  getStoredToken,
  clearAuthentication
};

export default api;