export const fetcher = async (...args: [RequestInfo, RequestInit?]) =>
  fetch(...args).then((res) => res.json());

/** Carries the HTTP status so callers can map 409/401 to their own messages. */
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const postFetcher = async (url: string, { arg }: { arg: any }) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new ApiError(errorBody?.message || `POST ${url} failed with status ${res.status}`, res.status);
  }

  return res.json();
};
