import {
  // GoogleTagManager as NextGoogleTagManager,
  GoogleAnalytics as NextGoogleAnalytics,
} from "@next/third-parties/google";

// const _GoogleTagManager: React.FC<{
//   gtmId: string;
// }> = ({ gtmId }) => {
//   return <NextGoogleTagManager gtmId={gtmId} />;
// };

const _GoogleAnalytics: React.FC<{
  gaId: string;
}> = ({ gaId }) => {
  return <NextGoogleAnalytics gaId={gaId} />;
};

const GoogleAnalytics = () => {
  if (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_GA_ID) {
    return (
      <>
        {/* <_GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />; */}
        <_GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />;
      </>
    );
  }

  return null;
};

export default GoogleAnalytics;
