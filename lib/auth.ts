import { NextApiRequest, NextApiResponse } from "next";

export const isAuthorized = async (req: NextApiRequest) => {
  // check if request coming from duck-inspector.netlify.app
  // if not, return 403
  // log IP address
  if (req.headers.origin !== "https://duck-inspector.netlify.app") {
    console.log("isAuthorized: origin mismatch", req.headers.origin);
    return false;
  }
  return true;
}

// const isAuth = await isAuthorized(req);
//   if (!isAuth) {
//     return res.status(200).json({ code: "Тебе ж попросили, як людину – не парсити" } as any);
//   }