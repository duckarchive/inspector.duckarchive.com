import { Fetch, Match } from "@prisma/client";
import axios from "axios";
import { get, unescape } from "lodash";
import parse, { HTMLElement } from "node-html-parser";

export const parseDBParams = (str: string | null): Record<string, string> => {
  const result: Record<string, string> = {};

  str?.split(",").map((param) => {
    const [key, value] = param.split(":");
    result[key.trim()] = value.trim();
  });

  return result;
};

export const parseCode = (str: string): string => {
  // input: "Р-34" "П-159" "Р34" "П159" "8дод." "2т.1" "10."
  // output: "Р34" "П159" "34" "159" "8дод" "2т1" "10"
  const pure = unescape(str);
  if (/\d+\./.test(pure)) {
    // temporary solution for "10." in https://e-resource.tsdavo.gov.ua/fonds/8/
    return pure.replace(/\./, "н");
  }

  return pure.replace(/[^А-ЯҐЄІЇ0-9]/gi, "");
};

export const parseTitle = (str: string): string => {
  return unescape(str.trim().slice(0, 200));
};

interface ScrappingOptions {
  selector: string;
  responseKey?: string;
}

export const scrapping = async ({ api_headers, api_method, api_params, api_url }: Match | Fetch, { selector, responseKey = "" }: ScrappingOptions) => {
  const { data } = await axios.request({
    url: api_url,
    method: api_method || "GET",
    headers: parseDBParams(api_headers),
    params: parseDBParams(api_params),
  });

  const content = get(data, responseKey);
  const dom = parse(content);
  return [...dom.querySelectorAll(selector)];
};
