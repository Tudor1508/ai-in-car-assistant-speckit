import { Box } from "@mui/material";

type Props = { brand: string };

const BRAND_ALIASES: Record<string, string> = {
  alfa: "alfaromeo",
  "alfaromeo": "alfaromeo",
  bmwgroup: "bmw",
  chevy: "chevrolet",
  citroen: "citroen",
  "dsautomobiles": "ds",
  "landrover": "landrover",
  "mercedesbenz": "mercedes",
  "mercedesamg": "mercedes",
  "volkswagenag": "volkswagen",
  "mercedes-benz": "mercedes",
  "vw": "volkswagen",
  "volkswagen": "volkswagen",
};

function normalizeBrand(value: string) {
  const normalized = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return BRAND_ALIASES[normalized] ?? normalized;
}

export function VehicleBrandLogo({ brand }: Props) {
  const normalized = normalizeBrand(brand);
  const initials = brand.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  const knownBrands = new Set([
    "audi", "bmw", "tesla", "mercedes", "volkswagen", "toyota", "honda", "ford", "volvo", "hyundai", "kia",
    "renault", "nissan", "mazda", "mitsubishi", "suzuki", "citroen", "fiat", "chevrolet", "opel", "jeep", "lexus",
    "landrover", "porsche", "skoda", "dacia", "alfaromeo", "peugeot", "subaru", "mini", "jaguar", "seat", "ds",
  ]);

  return (
    <Box
      role="img"
      aria-label={knownBrands.has(normalized) ? `${brand} logo` : `${brand} brand mark`}
      title={brand}
      sx={{ width: 52, height: 48, flex: "0 0 52px", display: "grid", placeItems: "center" }}
    >
      <svg width="48" height="48" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        {normalized === "audi" ? (
          <g transform="translate(2 2) scale(.91)" fill="none" stroke="#d5dde5" strokeWidth="2.5">
            <circle cx="8" cy="22" r="8" /><circle cx="17" cy="22" r="8" /><circle cx="27" cy="22" r="8" /><circle cx="36" cy="22" r="8" />
          </g>
        ) : normalized === "bmw" ? (
          <>
            <circle cx="22" cy="22" r="20" fill="#111820" stroke="#d9e2e8" strokeWidth="1.5" />
            <circle cx="22" cy="22" r="13.5" fill="#f4f6f8" />
            <path d="M22 8.5A13.5 13.5 0 0 1 35.5 22H22Z" fill="#168bd2" /><path d="M22 35.5A13.5 13.5 0 0 1 8.5 22H22Z" fill="#168bd2" />
            <circle cx="22" cy="22" r="13.5" fill="none" stroke="#111820" strokeWidth="1" />
            <text x="22" y="7" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" letterSpacing=".5">BMW</text>
          </>
        ) : normalized === "tesla" ? (
          <path d="M5 10.5c4.3-2.3 10.1-3.5 17-3.5s12.7 1.2 17 3.5l-2.2 3.2c-3.3-1.3-7.4-2.1-12.1-2.4L22 36l-2.7-24.7c-4.7.3-8.8 1.1-12.1 2.4L5 10.5Z" fill="#e82127" />
        ) : normalized === "mercedes" ? (
          <><circle cx="22" cy="22" r="19" fill="none" stroke="#d9e2e8" strokeWidth="2" /><path d="m22 7 0 15-13 8m13-8 13 8m-13-8 0-15" fill="none" stroke="#d9e2e8" strokeWidth="2.5" strokeLinejoin="round" /></>
        ) : normalized === "volkswagen" ? (
          <><circle cx="22" cy="22" r="19" fill="#0d5b9b" stroke="#e7f4ff" strokeWidth="2" /><text x="22" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="Arial">VW</text></>
        ) : normalized === "toyota" ? (
          <><ellipse cx="22" cy="22" rx="19" ry="15" fill="none" stroke="#e8edf2" strokeWidth="2.5" /><ellipse cx="22" cy="22" rx="8" ry="14" fill="none" stroke="#e8edf2" strokeWidth="2.5" /><ellipse cx="22" cy="22" rx="17" ry="6" fill="none" stroke="#e8edf2" strokeWidth="2.5" /></>
        ) : normalized === "honda" ? (
          <><path d="M9 7h26v30H9z" rx="4" fill="#d71920" /><path d="M15 30V15h4l3 7 3-7h4v15h-4v-8l-3 6-3-6v8z" fill="white" /></>
        ) : normalized === "ford" ? (
          <><ellipse cx="22" cy="22" rx="21" ry="14" fill="#0756a4" stroke="#f1f6ff" strokeWidth="1.5" /><text x="22" y="27" textAnchor="middle" fill="white" fontSize="14" fontStyle="italic" fontWeight="700" fontFamily="Georgia">Ford</text></>
        ) : normalized === "volvo" ? (
          <><circle cx="21" cy="23" r="15" fill="none" stroke="#dce5ed" strokeWidth="4" /><path d="m30 10 8-3m-7 2 6 6" stroke="#dce5ed" strokeWidth="3" /><text x="21" y="27" textAnchor="middle" fill="#dce5ed" fontSize="8" fontWeight="800">VOLVO</text></>
        ) : normalized === "hyundai" ? (
          <><ellipse cx="22" cy="22" rx="20" ry="15" fill="#07569b" /><path d="m13 30 3.2-16h3.4l-1.2 6h7.2l1.2-6h3.4L27 30h-3.4l1.4-6.5h-7.2L16.4 30z" fill="white" /></>
        ) : normalized === "kia" ? (
          <text x="22" y="29" textAnchor="middle" fill="#e7edf3" fontSize="17" fontWeight="900" letterSpacing="-1.5" fontFamily="Arial">KIA</text>
        ) : normalized === "renault" ? (
          <><path d="m22 3 16 19-16 19L6 22Z" fill="none" stroke="#f3d500" strokeWidth="5" /><path d="m22 11 9 11-9 11-9-11Z" fill="#132537" /></>
        ) : normalized === "nissan" ? (
          <><circle cx="22" cy="22" r="18" fill="none" stroke="#e7edf3" strokeWidth="2.5" /><path d="M5 18h34v8H5z" fill="#132537" /><text x="22" y="24" textAnchor="middle" fill="#e7edf3" fontSize="8" fontWeight="800">NISSAN</text></>
        ) : normalized === "mazda" ? (
          <><ellipse cx="22" cy="22" rx="20" ry="16" fill="none" stroke="#e7edf3" strokeWidth="2" /><path d="M8 23q14-17 28 0-14-7-28 0Zm14-9v19" fill="none" stroke="#e7edf3" strokeWidth="2.5" /></>
        ) : normalized === "mitsubishi" ? (
          <><path d="m22 4 9 14H13Zm-10 17 9 15H3Zm20 0 9 15H23Z" fill="#e51b23" /></>
        ) : normalized === "suzuki" ? (
          <text x="22" y="34" textAnchor="middle" fill="#e51b23" fontSize="35" fontWeight="900" fontFamily="Arial">S</text>
        ) : normalized === "citroen" ? (
          <><path d="m8 18 14-12 14 12M8 29l14-12 14 12" fill="none" stroke="#e7edf3" strokeWidth="5" strokeLinejoin="round" /></>
        ) : normalized === "fiat" ? (
          <><circle cx="22" cy="22" r="19" fill="#be1622" stroke="#e7edf3" strokeWidth="2" /><text x="22" y="27" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">FIAT</text></>
        ) : normalized === "chevrolet" ? (
          <><path d="M3 16h13l2-5h8l2 5h13v12H28l-2 5h-8l-2-5H3z" fill="#d5ad42" stroke="#f7e5a3" strokeWidth="2" /></>
        ) : normalized === "opel" ? (
          <><circle cx="22" cy="22" r="18" fill="none" stroke="#e7edf3" strokeWidth="2.5" /><path d="m8 23 23-8-7 8h12L13 31l7-8z" fill="#e7edf3" /></>
        ) : normalized === "jeep" ? (
          <text x="22" y="29" textAnchor="middle" fill="#e7edf3" fontSize="18" fontWeight="900" letterSpacing="1" fontFamily="Arial">JEEP</text>
        ) : normalized === "lexus" ? (
          <><ellipse cx="22" cy="22" rx="20" ry="16" fill="none" stroke="#e7edf3" strokeWidth="2" /><path d="m28 10-9 23h5l9-23z" fill="#e7edf3" /></>
        ) : normalized === "landrover" ? (
          <><ellipse cx="22" cy="22" rx="21" ry="16" fill="#174d3b" stroke="#dbe9e1" strokeWidth="1.5" /><text x="22" y="25" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">LAND</text><text x="22" y="32" textAnchor="middle" fill="white" fontSize="7" fontWeight="800">ROVER</text></>
        ) : normalized === "porsche" ? (
          <><path d="M8 5h28v17q-1 12-14 17Q9 34 8 22Z" fill="#c52026" stroke="#e6c95c" strokeWidth="2" /><path d="M10 12h24M22 7v29" stroke="#f3d765" strokeWidth="2" /><text x="22" y="24" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="800">PORSCHE</text></>
        ) : normalized === "alfaromeo" ? (
          <><circle cx="22" cy="22" r="20" fill="#f3f4f5" stroke="#c51d32" strokeWidth="3" /><path d="M22 3v38" stroke="#c51d32" strokeWidth="2" /><path d="M13 17h7v11h-7zm11 0h7v11h-7z" fill="#178a59" /><text x="22" y="13" textAnchor="middle" fill="#c51d32" fontSize="5" fontWeight="800">AR</text></>
        ) : normalized === "peugeot" ? (
          <text x="22" y="27" textAnchor="middle" fill="#e7edf3" fontSize="7.5" fontWeight="900" letterSpacing=".15">PEUGEOT</text>
        ) : normalized === "subaru" ? (
          <><ellipse cx="22" cy="22" rx="21" ry="14" fill="#07549b" stroke="#e9c755" strokeWidth="2" /><path d="m13 20 5-5 3 4 4-6 7 8H12z" fill="#f3d44c" /></>
        ) : normalized === "mini" ? (
          <><circle cx="22" cy="22" r="18" fill="#132537" stroke="#e7edf3" strokeWidth="2" /><path d="M5 17h9l4-6h8l4 6h9M5 27h9l4 6h8l4-6h9" fill="none" stroke="#e7edf3" strokeWidth="2" /><text x="22" y="25" textAnchor="middle" fill="white" fontSize="8" fontWeight="900">MINI</text></>
        ) : normalized === "jaguar" ? (
          <><path d="M4 26q9-4 17-2 11-11 19-10-4 10-14 14-8 4-18 1l-4 4 1-7Z" fill="#dce5ed" /><text x="22" y="40" textAnchor="middle" fill="#dce5ed" fontSize="6" fontWeight="700">JAGUAR</text></>
        ) : normalized === "skoda" ? (
          <text x="22" y="27" textAnchor="middle" fill="#e7edf3" fontSize="9" fontWeight="800" letterSpacing=".25">ŠKODA</text>
        ) : normalized === "dacia" ? (
          <text x="22" y="27" textAnchor="middle" fill="#e7edf3" fontSize="10" fontWeight="900" letterSpacing="1">DACIA</text>
        ) : normalized === "seat" || normalized === "ds" ? (
          <text x="22" y="27" textAnchor="middle" fill="#e7edf3" fontSize={normalized === "seat" ? 13 : 18} fontWeight="900" letterSpacing=".5">{normalized.toUpperCase()}</text>
        ) : (
          <><circle cx="22" cy="22" r="20" fill="#132537" stroke="#6c8498" strokeWidth="1.5" /><text x="22" y="27" textAnchor="middle" fill="#e8f2fa" fontSize="13" fontWeight="700">{initials}</text></>
        )}
      </svg>
    </Box>
  );
}
