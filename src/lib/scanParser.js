// Scan payload parser.
// --------------------------------------------------------------------------
// Daikin QR/barcode labels often encode several fields in one concatenated
// string. Example:
//
//     1828260000922RZMF125BRV16911-2025G
//     └────┬─────┘└─────┬──────┘└──┬──┘│
//       barcode       model      mfg  suffix
//
// Parse rule (confirmed with the client):
//   • Barcode            = the first 13 digits
//   • Manufacturing date = the "MM-YYYY" pattern (\d{1,2}-\d{4})
//   • Model number       = everything between the barcode and the mfg date
//   • Suffix / serial     = any trailing characters after the mfg date
//
// The parser is defensive: a plain barcode, a plain model number, or a partial
// string all return sensibly so existing lookups keep working. `barcode` always
// falls back to the raw value when no 13-digit run is present, so callers can
// safely use `parsed.barcode` for the product lookup in every case.

import { lookupModel } from "./daikinMapping";

const MFG_DATE_RE = /(\d{1,2})-(\d{4})/; // e.g. 11-2025
const BARCODE_RE = /^\d{13}/; // leading 13-digit run

// Normalise a matched "M-YYYY" / "MM-YYYY" to a zero-padded "MM-YYYY".
function normalizeMfgDate(match) {
  if (!match) return "";
  const [, mm, yyyy] = match;
  return `${mm.padStart(2, "0")}-${yyyy}`;
}

/**
 * Parse a scanned/typed code into its component fields.
 * @param {string} raw - the raw scanned or manually entered value
 * @returns {{
 *   raw: string,
 *   barcode: string,
 *   modelNumber: string,
 *   manufacturingDate: string,
 *   suffix: string,
 *   model: object|null,   // matching daikinMapping row when the model is known
 *   isConcatenated: boolean
 * }}
 */
export function parseScan(raw) {
  const value = String(raw ?? "").trim();
  const empty = {
    raw: value,
    barcode: value,
    modelNumber: "",
    manufacturingDate: "",
    suffix: "",
    model: null,
    isConcatenated: false,
  };
  if (!value) return { ...empty, barcode: "" };

  // 1) Barcode = leading 13 digits (fall back to the whole value).
  const bcMatch = value.match(BARCODE_RE);
  const barcode = bcMatch ? bcMatch[0] : value;

  // Remainder after the barcode is where the model + date + suffix live.
  const rest = bcMatch ? value.slice(13) : "";
  if (!rest) return { ...empty, barcode, model: lookupModel(barcode) };

  // 2) Manufacturing date = the MM-YYYY pattern inside the remainder.
  const dateMatch = rest.match(MFG_DATE_RE);
  if (!dateMatch) {
    // No date → treat the whole remainder as the model number.
    const modelNumber = rest.trim();
    return {
      raw: value,
      barcode,
      modelNumber,
      manufacturingDate: "",
      suffix: "",
      model: lookupModel(modelNumber),
      isConcatenated: true,
    };
  }

  // 3) Model number = everything between the barcode and the date.
  const modelNumber = rest.slice(0, dateMatch.index).trim();
  // 4) Suffix / serial = anything trailing the date.
  const suffix = rest.slice(dateMatch.index + dateMatch[0].length).trim();

  return {
    raw: value,
    barcode,
    modelNumber,
    manufacturingDate: normalizeMfgDate(dateMatch),
    suffix,
    model: lookupModel(modelNumber),
    isConcatenated: true,
  };
}
