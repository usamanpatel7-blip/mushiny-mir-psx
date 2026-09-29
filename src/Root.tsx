import "./index.css";
import { KriptanComposition } from "./Composition";
import { KebabComposition } from "./ep2/Episode";
import { SoslanComposition } from "./ep3/Episode";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KriptanComposition />
      <KebabComposition />
      <SoslanComposition />
    </>
  );
};
