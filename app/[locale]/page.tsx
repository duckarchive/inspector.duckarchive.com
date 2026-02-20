import { NextPage } from "next";
import { useTranslations } from "next-intl";
import SearchInput from "@/components/search-input";
import ComicsCard, { ComicsCardProps } from "@/components/comics-card";
import ResearchImg from "@/public/images/home/research.jpg";
import ScrapImg from "@/public/images/home/scrap.jpg";
import LinkImg from "@/public/images/home/link.jpg";
import ResourcesImg from "@/public/images/home/resources.jpg";
import SupportImg from "@/public/images/home/support.jpg";
import UniverseImg from "@/public/images/home/universe.jpg";
// import Book1Img from "@/public/images/book-1.png";
// import Book2Img from "@/public/images/book-2.png";
// import CameraImg from "@/public/images/camera.png";
// import CertificateImg from "@/public/images/certificate.png";
// import DocsImg from "@/public/images/docs.png";
// import FeatherImg from "@/public/images/feather.png";
// import LicenseImg from "@/public/images/license.png";
// import NewspaperImg from "@/public/images/newspaper.png";
// import OldImageImg from "@/public/images/old-image.png";
// import PapirusImg from "@/public/images/papirus.png";
// import PCImg from "@/public/images/pc.png";
// import SandClockImg from "@/public/images/sandclock.png";
import HomeBanner from "@/components/home/banner";

// const SIZE = 100;

// const ICONS = [
//   {
//     src: DocsImg,
//     alt: "objects.docs",
//     position: [20, -5],
//   },
//   {
//     src: FeatherImg,
//     alt: "objects.feather",
//     position: [10, 10],
//   },
//   {
//     src: LicenseImg,
//     alt: "objects.license",
//     position: [17, 35],
//   },
//   {
//     src: NewspaperImg,
//     alt: "objects.newspaper",
//     position: [10, 55],
//   },
//   {
//     src: OldImageImg,
//     alt: "objects.old-image",
//     position: [20, 80],
//   },
//   {
//     src: PapirusImg,
//     alt: "objects.papirus",
//     position: [30, 95],
//   },
//   {
//     src: SandClockImg,
//     alt: "objects.sand-clock",
//     position: [70, -5],
//   },
//   {
//     src: PCImg,
//     alt: "objects.pc",
//     position: [85, 15],
//   },
//   {
//     src: CameraImg,
//     alt: "objects.camera",
//     position: [75, 30],
//   },
//   {
//     src: Book2Img,
//     alt: "objects.book2",
//     position: [80, 50],
//   },
//   {
//     src: Book1Img,
//     alt: "objects.book1",
//     position: [90, 75],
//   },
//   {
//     src: CertificateImg,
//     alt: "objects.certificate",
//     position: [80, 95],
//   },
// ];

const HOW_TO_STEPS: ComicsCardProps[] = [
  {
    image: ScrapImg,
    message: "about.form",
    va: "bottom",
  },
  {
    image: ResourcesImg,
    message: "about.one-place",
    va: "top",
    ha: "left",
  },
  {
    image: ResearchImg,
    message: "about.extended-data",
    ha: "left",
  },
  {
    image: SupportImg,
    message: "about.free",
    va: "top",
  },
  {
    image: LinkImg,
    message: "about.direct-link",
    ha: "left",
  },
  {
    image: UniverseImg,
    message: "about.universe",
    va: "top",
    ha: "left",
  },
];

const WelcomePage: NextPage = () => {
  const t = useTranslations("home-page");

  return (
    <>
      <section className="flex items-center justify-center flex-col md:flex-row gap-4 h-[calc(100vh-4rem-0.75rem)]">
        <HomeBanner />
        {/* {ICONS.map((icon) => (
          <Image
            key={icon.alt}
            src={icon.src}
            alt={icon.alt}
            aria-hidden="true"
            width={SIZE}
            height={SIZE}
            className="absolute w-[50px] md:w-[100px] cursor-help opacity-30 z-10 hover:opacity-40 transition-opacity"
            style={{
              top: `${icon.position[0]}%`,
              left: `${icon.position[1]}%`,
            }}
          />
        ))} */}
        <div className="inline-block xl:basis-1/2 justify-center z-10">
          <h1 className="text-4xl md:text-6xl font-light">{t("title")}</h1>
          <p className="mt-4">{t("description")}</p>
          <div className="mt-8 w-full">
            <SearchInput />
          </div>
        </div>
        <div className="basis-1/2 h-full justify-center items-center hidden xl:flex">
          {/* <DuckInspectorBanner /> */}
        </div>
      </section>
      <section
        className="grow py-32"
        style={{
          "--s": "74px",
          "--c1": "#1d1d1d",
          "--c2": "#4e4f51",
          "--c3": "#3c3c3c",
          background:
            "repeating-conic-gradient(from 30deg,#0000 0 120deg,var(--c3) 0 50%) calc(var(--s)/2) calc(var(--s)*tan(30deg)/2), repeating-conic-gradient(from 30deg,var(--c1) 0 60deg,var(--c2) 0 120deg,var(--c3) 0 50%)",
          backgroundSize: "var(--s) calc(var(--s)*tan(30deg))",
        }}
      >
        <h2 className="text-2xl md:text-4xl font-light mb-4">{t("about.title")}</h2>
        <ol className="flex list-inside md:flex-row flex-col flex-wrap">
          {HOW_TO_STEPS.map((step, index) => (
            <li key={index} className="md:basis-1/3 h-full p-1">
              <ComicsCard image={step.image} message={t(step.message)} va={step.va} ha={step.ha} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
};

export default WelcomePage;
