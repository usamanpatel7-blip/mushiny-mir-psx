import "./index.css";
import { KriptanComposition } from "./Composition";
import { KebabComposition } from "./ep2/Episode";
import { SoslanComposition } from "./ep3/Episode";
import { FacesComposition } from "./ep4/Episode";
import { VozComposition } from "./ep5/Episode";
import { hubComposition } from "./hub/Episode";
import { weighing } from "./hub/ep3";
import { greenEye } from "./hub/ep4";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KriptanComposition />
      <KebabComposition />
      <SoslanComposition />
      <FacesComposition />
      <VozComposition />
      {hubComposition(weighing)}
      {hubComposition(greenEye)}
    </>
  );
};
