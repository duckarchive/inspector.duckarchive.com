import HalftonePatternImg from "@/public/images/home/halftone-pattern.png";

const HalftonePattern: React.FC = () => {
  return (
    <div
      className="h-full"
      style={{
        backgroundImage: `url("${HalftonePatternImg.src}")`,
        backgroundSize: "auto 100%",
      }}
    />
  );
};

export default HalftonePattern;
