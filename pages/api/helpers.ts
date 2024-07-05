import { Fetch, Match } from "@prisma/client";
import axios from "axios";
import { chunk, get, unescape } from "lodash";
import parse from "node-html-parser";

export const parseDBParams = (str: string | null): Record<string, string> => {
  const result: Record<string, string> = {};

  str?.split(",").map((param) => {
    const [_key, _value] = param.split(":");
    const key = decodeURIComponent(_key.trim());
    const value = decodeURIComponent(_value.trim());
    result[key] = value;
  });

  return result;
};

export const stringifyDBParams = (data: Record<string, string | number | boolean>): string => {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}:${encodeURIComponent(value)}`)
    .join(",");
};

export const parseCode = (str: string): string => {
  // input: "Р-34" "П-159" "Р34" "П159" "8дод." "2т.1" "10."
  // output: "Р34" "П159" "34" "159" "8дод" "2т1" "10"
  const pure = unescape(str).replace(/&#039;/g, "'");
  if (/\d+\./.test(pure)) {
    // temporary solution for "10." in https://e-resource.tsdavo.gov.ua/fonds/8/
    return pure.replace(/\./, "н");
  }

  return pure.replace(/[^А-ЯҐЄІЇ0-9]/gi, "").toUpperCase();
};

export const parseTitle = (str: string): string => {
  return unescape(
    (str || "")
      .trim()
      .replace(/&#039;/g, "'")
      .slice(0, 200)
  );
};

export const parseWikiPageTitle = (str: string, level: "archive" | "fund" | "description" | "case") => {
  const depth = ["archive", "fund", "description", "case"].indexOf(level);
  return parseCode(str.split("/")[depth]);
};

interface ScrappingOptions {
  selector: string;
  responseKey?: string;
}

export const scrapping = async (
  { api_headers, api_method, api_params, api_url }: Match | Fetch,
  { selector, responseKey }: ScrappingOptions
) => {
  const headers = parseDBParams(api_headers);
  const params = parseDBParams(api_params);
  const { data } = await axios.request({
    url: api_url,
    method: api_method || "GET",
    headers,
    params,
  });

  const content = responseKey ? get(data, responseKey) : data;

  if (!content) {
    console.log("oops");
    return [];
  }
  const dom = parse(content);
  const result = [...dom.querySelectorAll(selector)];
  if (!result.length) {
    console.log("oops 222");
  }

  return result;
};


export const promiseChunk = async <T, R>(
  array: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<R>
): Promise<R[]> => {
  const chunks = chunk(array, chunkSize);
  return Promise.all(chunks.map(async (chunk) => await callback(chunk)));
}