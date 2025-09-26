export const fetcher = async (...args: [RequestInfo, RequestInit?]) =>
  fetch(...args).then((res) => res.json());

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
    const errorBody = await res.json();
    const error = new Error(
      errorBody?.message || `POST ${url} failed with status ${res.status}`
    );

    throw error;
  }

  return res.json();
};