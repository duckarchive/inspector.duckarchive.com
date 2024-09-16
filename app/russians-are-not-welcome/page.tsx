import { getResources } from "@/data/resources";
import { getYesterdayReport } from "@/data/report";
import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import ReportTable from "@/components/report-table";
import ReportModal from "@/components/report-modal";
import Image from "next/image";

import FriednlyDuckSrc from "@/public/images/friendly-duck.webp";

const ReportPage: NextPage = async () => {
  const resources = await getResources();
  const [report, reportSummary] = await getYesterdayReport();

  return (
    <div className="w-80 m-auto flex items-center flex-col">
      <p className="text-lg text-center">
        Русский? Следуй за курсом русского военного корабля с этого сайта и моей страны 🇺🇦
      </p>
      <Image src={FriednlyDuckSrc} width={300} height={300} alt="friendly duck" />
      <h2 className="text-2xl font-bold">🦆uck russians</h2>
    </div>
  );
};

export default ReportPage;
