"use client";

import { useParams } from "next/navigation";

const useCyrillicParams = () => {
  const params = useParams() || {};

  console.log(params);

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      decodeURIComponent(value.toString())
    ])
  );
};

export default useCyrillicParams;