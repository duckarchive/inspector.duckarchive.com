import { unescape } from "lodash";

export const parseDBParams = (str: string | null): Record<string, string> => {
  const result: Record<string, string> = {};

  str?.split(',').map((param) => {
    const [key, value] = param.split(':');
    result[key.trim()] = value.trim();
  });

  return result;
};

export const parseCode = (str: string): string => {
  // input: "Р-34" "П-159" "Р34" "П159" "8дод." "2т.1" "10."
  // output: "Р34" "П159" "34" "159" "8дод" "2т1" "10"
  return unescape(str).replace(/[^а-яА-Я0-9]/g, '');
}

export const parseTitle = (str: string): string => {
  return unescape(str.slice(0, 200))
};