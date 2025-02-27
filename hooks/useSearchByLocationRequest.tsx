import { useState } from "react";
import { Archives } from "@/data/archives";

const BASE_URL = "https://cors-anywhere.herokuapp.com/https://ridni.org/catalog/api/getCatalogData2.php";
// [
//     "ДАДО",
//     "193-2, спр.157-",
//     "Народження",
//     "1900–1905",
//     "Миколаївська Церква",
//     "с. Саксагань ",
//     "Села: Андріївка, Богословенна; с. Олексіївка Алферівської вол. ",
//     "Верхньодніпровський",
//     "Катеринославська губернія ",
//     "http://dp.archives.gov.ua",
//     "https://drive.google.com/drive/u/0/folders/1dk2kxx0QQ7ltrjrREQBKB8iUcg5Jti2b",
//     "https://drive.google.com/drive/folders/1qp-h9JNj7ZFwMlG-XGj4_PBSv6W1kzAK?usp=sharing",
//     "archive_dp@arch.gov.ua",
//     "Державний архів Дніпропетровської області",
//     "Постолов Михайло Юрійович",
//     "0"
// ]

const parseData = (data: string[][], archives: Archives) => {
  return data.map((item) => {
    const archive = archives.find((archive) => archive.title === item[13]);
    return {
      fullCode: item[1],
      type: item[2],
      years: item[3],
      church: item[4],
      place: item[5],
      area: item[6],
      region: item[7],
      governorate: item[8],
    };
  });
};

const useSearchByLocationRequest = (archives: Archives) => {
  const [raw, setRaw] = useState<string>();

  const update = async (updateParams: any) => {
    const updateQueryParams = new URLSearchParams(updateParams as any).toString();
    const updatedRes = await fetch(`${BASE_URL}?${updateQueryParams}`);
    const updatedResData: string[][] = await updatedRes.json();
    console.log("updatedData", updatedResData);
    // setRaw(updatedRes);
  };

  return {
    data: raw,
    update,
  };
};

export default useSearchByLocationRequest;
