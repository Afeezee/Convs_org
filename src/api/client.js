// The front-end's single entry point to the /api/... endpoints. Exposes
// api.entities.X.list/filter/create/update/delete, api.auth.me/logout/
// redirectToLogin, and api.integrations.UploadFile, so pages can call
// familiar shapes without knowing about the transport.

let getToken = null;
/** Registered by AuthContext at mount so we can attach the Clerk JWT. */
export function setTokenGetter(fn) {
  getToken = fn;
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (getToken) {
    try {
      const t = await getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
    } catch {
      // Anonymous fetch continues without a token.
    }
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.error?.code;
    err.data = data;
    throw err;
  }
  return data;
}

function toQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

function entity(name) {
  return {
    list: async (sort, limit) =>
      request("GET", `/entities/${name}${toQuery({ sort, limit })}`),
    filter: async (where = {}, sort, limit) =>
      request(
        "GET",
        `/entities/${name}${toQuery({ ...where, sort, limit })}`
      ),
    get: async (id) => request("GET", `/entities/${name}/${id}`),
    create: async (obj) => request("POST", `/entities/${name}`, obj),
    update: async (id, patch) =>
      request("PATCH", `/entities/${name}/${id}`, patch),
    delete: async (id) => request("DELETE", `/entities/${name}/${id}`),
  };
}

export const api = {
  entities: {
    Bookmark: entity("Bookmark"),
    Comment: entity("Comment"),
    CommentRating: entity("CommentRating"),
    Conv: entity("Conv"),
    Follow: entity("Follow"),
    Message: entity("Message"),
    Notification: entity("Notification"),
    Profile: entity("Profile"),
    Reconv: entity("Reconv"),
    Report: entity("Report"),
    User: entity("User"),
  },
  auth: {
    me: async () => {
      const me = await request("GET", "/auth/me");
      if (!me) {
        const err = new Error("Not signed in");
        err.status = 401;
        throw err;
      }
      return me;
    },
    logout: (redirectUrl) => {
      // Actual sign-out is driven by Clerk in AuthContext; keep the API
      // for callers that expect a redirect.
      if (typeof window !== "undefined" && redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin: (returnUrl) => {
      if (typeof window === "undefined") return;
      const back = returnUrl ?? window.location.href;
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(back)}`;
    },
  },
  integrations: {
    UploadFile: async ({ file }) => {
      const fd = new FormData();
      fd.append("file", file);
      const headers = {};
      if (getToken) {
        const t = await getToken();
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: fd,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = new Error(`Upload failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
  },
};
