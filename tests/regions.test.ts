import assert from "node:assert/strict";
import test from "node:test";
import { COUNTRIES, composeLocation, countryByCode, DEFAULT_COUNTRY_CODE, OTHER_COUNTRY_CODE } from "../lib/geo/regions";

test("the default country resolves and leads with an enumerated region list", () => {
  const mexico = countryByCode(DEFAULT_COUNTRY_CODE);
  assert.equal(mexico?.name, "Mexico");
  assert.ok((mexico?.regions?.length ?? 0) >= 30);
  assert.ok(mexico?.regions?.includes("Jalisco"));
});

test("every country has a unique code and the Other entry sits last for free-text entry", () => {
  assert.equal(new Set(COUNTRIES.map((country) => country.code)).size, COUNTRIES.length);
  const other = COUNTRIES[COUNTRIES.length - 1];
  assert.equal(other.code, OTHER_COUNTRY_CODE);
  assert.equal(other.regions, undefined);
});

test("composeLocation reads city-first and sets jurisdiction to region and country", () => {
  const country = countryByCode("MX");
  const composed = composeLocation({ country, customCountry: "", region: "Jalisco", city: "Guadalajara", openToRemote: false });
  assert.equal(composed.location, "Guadalajara, Jalisco, Mexico");
  assert.equal(composed.jurisdiction, "Jalisco, Mexico");
  assert.equal(composed.countryName, "Mexico");
});

test("the remote flag is appended and empty region or city is skipped", () => {
  const country = countryByCode("AU");
  const composed = composeLocation({ country, customCountry: "", region: "New South Wales", city: "", openToRemote: true });
  assert.equal(composed.location, "New South Wales, Australia · open to remote");
  assert.equal(composed.jurisdiction, "New South Wales, Australia");
});

test("the Other country uses the typed country name for both fields", () => {
  const other = countryByCode(OTHER_COUNTRY_CODE);
  const composed = composeLocation({ country: other, customCountry: "  Kenya  ", region: "Nairobi County", city: "Nairobi", openToRemote: false });
  assert.equal(composed.countryName, "Kenya");
  assert.equal(composed.location, "Nairobi, Nairobi County, Kenya");
  assert.equal(composed.jurisdiction, "Nairobi County, Kenya");
});

test("a country with no selection still yields a usable, capped location", () => {
  const country = countryByCode("MX");
  const composed = composeLocation({ country, customCountry: "", region: "", city: "", openToRemote: true });
  assert.equal(composed.location, "Mexico · open to remote");
  assert.equal(composed.jurisdiction, "Mexico");

  const long = composeLocation({ country: countryByCode(OTHER_COUNTRY_CODE), customCountry: "C".repeat(80), region: "R".repeat(80), city: "T".repeat(80), openToRemote: true });
  assert.ok(long.location.length <= 120);
  assert.ok(long.jurisdiction.length <= 120);
});
