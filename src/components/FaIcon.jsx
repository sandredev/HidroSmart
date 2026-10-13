import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/** Wrapper delgado: <Fa icon={faLeaf} size={15} className="..." />
    Equivale al `size` de Lucide pero con iconos FontAwesome (free tier). */
export function Fa({ icon, size = 16, className = "", style }) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      style={{ fontSize: size, lineHeight: 1, ...style }}
    />
  );
}
