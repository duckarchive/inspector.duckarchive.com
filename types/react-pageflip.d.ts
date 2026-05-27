declare module "react-pageflip" {
  import * as React from "react";

  type FlipBookProps = React.HTMLAttributes<any> & {
    width?: number;
    height?: number;
    showCover?: boolean;
    drawShadow?: boolean;
    onFlip?: (e: any) => void;
  };

  const HTMLFlipBook: React.ForwardRefExoticComponent<FlipBookProps & React.RefAttributes<any>>;
  export default HTMLFlipBook;
}
