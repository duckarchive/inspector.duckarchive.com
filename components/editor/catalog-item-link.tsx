import { Link } from "@heroui/react";
import { catalogItemHref, catalogItemLabel } from "@/lib/catalog-links";

interface CatalogItemLinkProps {
  /** Archive/fond/inventory/file codes, in order — trailing `null`/`undefined`/"" entries are unselected levels. */
  codes: Array<string | null | undefined>;
}

/**
 * Opens the deepest currently selected catalog level (archive → fond → opys →
 * справа) on the public site, in a new tab. Renders nothing until at least the
 * archive is picked.
 */
const CatalogItemLink: React.FC<CatalogItemLinkProps> = ({ codes }) => {
  const href = catalogItemHref(codes);
  if (!href) return null;

  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="text-sm self-start">
      Переглянути {catalogItemLabel(codes)} на сайті ↗
    </Link>
  );
};

export default CatalogItemLink;
