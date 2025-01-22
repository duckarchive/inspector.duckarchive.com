import { GoogleTagManager } from '@next/third-parties/google'

interface _GoogleAnalyticsProps {
  gtmId: string;
}

const _GoogleAnalytics: React.FC<_GoogleAnalyticsProps> = ({ gtmId }) => {
  return (
    <GoogleTagManager gtmId={gtmId} />
  );
};

const GoogleAnalytics = () => {
  if (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_GA_ID) {
    return <_GoogleAnalytics gtmId={process.env.NEXT_PUBLIC_GA_ID} />;
  }

  return null;
};

export default GoogleAnalytics;
