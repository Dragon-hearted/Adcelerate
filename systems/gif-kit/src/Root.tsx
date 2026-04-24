import { Composition } from "remotion";
import { BrandIntro } from "./compositions/BrandIntro";
import { compositions } from "../../../design-system/adapters/gif";

export const RemotionRoot = () => (
  <>
    <Composition
      id="BrandIntro"
      component={BrandIntro}
      durationInFrames={compositions.brandIntro.durationInFrames}
      fps={compositions.brandIntro.fps}
      width={compositions.brandIntro.width}
      height={compositions.brandIntro.height}
    />
  </>
);
