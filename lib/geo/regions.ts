/**
 * A curated country and first-level-subdivision list for the location picker.
 *
 * The visitor selects a country, then a region (a real list where NotZero has
 * one, free text otherwise), then types a city. It exists so the location that
 * grounds the market comparison is structured and specific ("Jalisco, Mexico"
 * rather than a vague free-text field), which makes the live posting search and
 * the jurisdiction context more accurate.
 *
 * The list is deliberately partial. Enumerating every subdivision on earth is
 * neither necessary nor honest to maintain, so regions are enumerated for the
 * markets the product leads with and left as free text elsewhere, and a final
 * "Other" country keeps the picker universal. `regionLabel` names what the first
 * subdivision is called locally so the field reads correctly per country.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, or "ZZ" for the free-text "Other" entry. */
  code: string;
  name: string;
  /** What the first-level subdivision is called here (State, Province, Region…). */
  regionLabel: string;
  /** First-level subdivisions, when enumerated. Absent means free-text entry. */
  regions?: string[];
};

export const DEFAULT_COUNTRY_CODE = "MX";
export const OTHER_COUNTRY_CODE = "ZZ";

const MEXICO_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const CANADA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon",
];

const BRAZIL_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo",
  "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba",
  "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
  "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
];

const ARGENTINA_PROVINCES = [
  "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const COLOMBIA_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare",
  "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío",
  "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
  "Vaupés", "Vichada",
];

const CHILE_REGIONS = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
  "Región Metropolitana de Santiago", "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía",
  "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
];

const PERU_REGIONS = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco",
  "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto",
  "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

const SPAIN_COMMUNITIES = [
  "Andalucía", "Aragón", "Asturias", "Islas Baleares", "Canarias", "Cantabria", "Castilla-La Mancha",
  "Castilla y León", "Cataluña", "Comunidad Valenciana", "Extremadura", "Galicia", "La Rioja",
  "Madrid", "Región de Murcia", "Navarra", "País Vasco",
];

const UK_NATIONS = ["England", "Scotland", "Wales", "Northern Ireland"];

const AUSTRALIA_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
  "South Australia", "Tasmania", "Victoria", "Western Australia",
];

const GERMANY_STATES = [
  "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse",
  "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate",
  "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
];

const FRANCE_REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse",
  "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// Alphabetical by name so the dropdown scans naturally. "Other" is appended last
// by `COUNTRIES` so it always sits at the bottom of the list.
const CATALOG: Country[] = [
  { code: "AR", name: "Argentina", regionLabel: "Province", regions: ARGENTINA_PROVINCES },
  { code: "AU", name: "Australia", regionLabel: "State or territory", regions: AUSTRALIA_STATES },
  { code: "AT", name: "Austria", regionLabel: "State" },
  { code: "BE", name: "Belgium", regionLabel: "Region" },
  { code: "BO", name: "Bolivia", regionLabel: "Department" },
  { code: "BR", name: "Brazil", regionLabel: "State", regions: BRAZIL_STATES },
  { code: "CA", name: "Canada", regionLabel: "Province or territory", regions: CANADA_PROVINCES },
  { code: "CL", name: "Chile", regionLabel: "Region", regions: CHILE_REGIONS },
  { code: "CO", name: "Colombia", regionLabel: "Department", regions: COLOMBIA_DEPARTMENTS },
  { code: "CR", name: "Costa Rica", regionLabel: "Province" },
  { code: "DK", name: "Denmark", regionLabel: "Region" },
  { code: "DO", name: "Dominican Republic", regionLabel: "Province" },
  { code: "EC", name: "Ecuador", regionLabel: "Province" },
  { code: "SV", name: "El Salvador", regionLabel: "Department" },
  { code: "FI", name: "Finland", regionLabel: "Region" },
  { code: "FR", name: "France", regionLabel: "Region", regions: FRANCE_REGIONS },
  { code: "DE", name: "Germany", regionLabel: "State", regions: GERMANY_STATES },
  { code: "GT", name: "Guatemala", regionLabel: "Department" },
  { code: "HN", name: "Honduras", regionLabel: "Department" },
  { code: "IN", name: "India", regionLabel: "State or union territory", regions: INDIA_STATES },
  { code: "IE", name: "Ireland", regionLabel: "County" },
  { code: "IT", name: "Italy", regionLabel: "Region" },
  { code: "JP", name: "Japan", regionLabel: "Prefecture" },
  { code: "MX", name: "Mexico", regionLabel: "State", regions: MEXICO_STATES },
  { code: "NL", name: "Netherlands", regionLabel: "Province" },
  { code: "NZ", name: "New Zealand", regionLabel: "Region" },
  { code: "NI", name: "Nicaragua", regionLabel: "Department" },
  { code: "NO", name: "Norway", regionLabel: "County" },
  { code: "PA", name: "Panama", regionLabel: "Province" },
  { code: "PY", name: "Paraguay", regionLabel: "Department" },
  { code: "PE", name: "Peru", regionLabel: "Region", regions: PERU_REGIONS },
  { code: "PL", name: "Poland", regionLabel: "Voivodeship" },
  { code: "PT", name: "Portugal", regionLabel: "District" },
  { code: "ES", name: "Spain", regionLabel: "Autonomous community", regions: SPAIN_COMMUNITIES },
  { code: "SE", name: "Sweden", regionLabel: "County" },
  { code: "CH", name: "Switzerland", regionLabel: "Canton" },
  { code: "GB", name: "United Kingdom", regionLabel: "Nation or region", regions: UK_NATIONS },
  { code: "US", name: "United States", regionLabel: "State", regions: US_STATES },
  { code: "UY", name: "Uruguay", regionLabel: "Department" },
  { code: "VE", name: "Venezuela", regionLabel: "State" },
];

export const COUNTRIES: Country[] = [
  ...CATALOG,
  { code: OTHER_COUNTRY_CODE, name: "Other (type your country)", regionLabel: "State, province, or region" },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function countryByCode(code: string): Country | undefined {
  return BY_CODE.get(code);
}

/**
 * Builds the `location` and `jurisdiction` strings the analysis actually
 * consumes from the picker selections, so the server contract stays a pair of
 * plain strings. `location` reads city-first for a natural job-search query;
 * `jurisdiction` is the region and country, the boundary that matters for
 * regulated fields.
 */
export function composeLocation(params: {
  country: Country | undefined;
  customCountry: string;
  region: string;
  city: string;
  openToRemote: boolean;
}): { location: string; jurisdiction: string; countryName: string } {
  const countryName = params.country && params.country.code !== OTHER_COUNTRY_CODE
    ? params.country.name
    : params.customCountry.trim();
  const region = params.region.trim();
  const city = params.city.trim();
  const place = [city, region, countryName].filter(Boolean).join(", ");
  const withRemote = params.openToRemote ? (place ? `${place} · open to remote` : "Open to remote") : place;
  // The analysis contract caps both fields at 120 characters; free-text entries
  // are the only way to approach that, so cap here rather than reject the run.
  const location = withRemote.slice(0, 120);
  const jurisdiction = [region, countryName].filter(Boolean).join(", ").slice(0, 120);
  return { location, jurisdiction, countryName };
}
