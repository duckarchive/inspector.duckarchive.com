/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { ArchivePageProps } from "./page";
import { siteConfig } from "@/config/site";
import { GetArchiveResponse } from "@/app/api/archives/[archive-code]/route";

export const alt = "Знайти справу онлайн по реквізитам архіву";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image(pageProps: ArchivePageProps) {
  const params = await pageProps.params;
  const code = decodeURIComponent(params["archive-code"]);
  const archive: GetArchiveResponse = await fetch(`${siteConfig.url}/api/archives/${code}`).then((res) => res.json());
  const archiveLogoPath = join(process.cwd(), "public", archive.logo_url || "images/flags/Flag_of_Ukraine.svg");
  const archiveLogoData = await readFile(archiveLogoPath);
  const archiveLogoBase64 = archiveLogoData.toString("base64");
  const archiveLogoSrc = `data:image/svg+xml;base64,${archiveLogoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: size.width * 0.9,
            height: 300,
          }}
        >
          <img src={archiveLogoSrc} alt={archive.title || "archive logo"} style={{ height: "100%" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              wordBreak: "break-word",
              padding: "0.5rem",
              flexGrow: 0,
              flexShrink: 1,
            }}
          >
            <h5 style={{ margin: "0" }}>{archive.title}</h5>
            <div
              style={{
                transform: "scale(1.5) translateX(17%) translateY(-17%)",
                display: "flex",
                fontSize: "1rem",
                flexDirection: "row",
                alignItems: "center",
                padding: "12px",
                gap: "12px",
                position: "relative",
                height: "60px",
                width: "250px",
                background: "#FFFFFF",
                border: "1px solid #000000",
                borderRadius: "5px",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                <circle cx="250" cy="250" r="240" fill="white" stroke="black" strokeWidth="20" />
                <path
                  d="M413.62 260L290.445 442H209.017L85.8427 260L413.62 260Z"
                  fill="#f5a524"
                  stroke="black"
                  strokeWidth="20"
                />
              </svg>
              <p style={{ marginTop: "20" }}>Знайти в Інспекторі</p>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
