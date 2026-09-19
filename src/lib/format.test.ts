// Pruebas unitarias de src/lib/format.ts.
//
// Módulo puro: solo `Intl`, sin estado, sin entorno y sin colaboradores. El
// formateador es `es-ES` (agrupación con punto, decimales con coma) con el
// prefijo "S/" pegado a mano, así que las salidas esperadas se fijan tal cual
// las produce ese locale en Node.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  AMOUNT_INPUT_PATTERN,
  centsToAmountInput,
  formatCents,
  toCents,
} from "./format";

describe("toCents", () => {
  it("converts a comma decimal into cents", () => {
    assert.equal(toCents("1299,90"), 129990);
  });

  it("converts a dot decimal into the same cents as the comma form", () => {
    assert.equal(toCents("1299.90"), toCents("1299,90"));
  });

  it("pads a single decimal digit to two", () => {
    assert.equal(toCents("19.9"), 1990);
  });

  it("keeps a leading zero in the decimal part", () => {
    assert.equal(toCents("19.09"), 1909);
  });

  it("treats a whole amount as zero cents of fraction", () => {
    assert.equal(toCents("10"), 1000);
  });

  it("returns 0 for zero written with decimals", () => {
    assert.equal(toCents("0,00"), 0);
  });

  it("returns 0 for a plain zero", () => {
    assert.equal(toCents("0"), 0);
  });

  it("parses an amount below one unit", () => {
    assert.equal(toCents("0,5"), 50);
  });

  it("parses one cent", () => {
    assert.equal(toCents("0.01"), 1);
  });

  it("trims surrounding whitespace before parsing", () => {
    assert.equal(toCents("  10,50  "), 1050);
  });

  it("avoids the float drift that multiplying 19.99 by 100 introduces", () => {
    assert.equal(toCents("19.99"), 1999);
    assert.notEqual(Math.trunc(19.99 * 100), 1999);
  });

  it("always returns an integer number of cents", () => {
    assert.equal(Number.isInteger(toCents("1299,90")), true);
  });

  it("accepts the maximum supported amount of seven integer digits", () => {
    assert.equal(toCents("9999999,99"), 999999999);
  });

  it("rejects eight integer digits because they would overflow the integer column", () => {
    assert.equal(toCents("10000000"), null);
  });

  it("rejects an empty string", () => {
    assert.equal(toCents(""), null);
  });

  it("rejects a whitespace-only string", () => {
    assert.equal(toCents("   "), null);
  });

  it("rejects text that is not a number", () => {
    assert.equal(toCents("abc"), null);
  });

  it("rejects a negative amount", () => {
    assert.equal(toCents("-5"), null);
  });

  it("rejects an explicit plus sign", () => {
    assert.equal(toCents("+5"), null);
  });

  it("rejects more than two decimal digits instead of rounding them", () => {
    assert.equal(toCents("19.999"), null);
  });

  it("rejects a trailing separator with no decimals", () => {
    assert.equal(toCents("10."), null);
  });

  it("rejects a leading separator with no integer part", () => {
    assert.equal(toCents(".5"), null);
  });

  it("rejects a thousands-grouped amount because only the first comma is normalized", () => {
    assert.equal(toCents("1,234.56"), null);
  });

  it("rejects an amount with an inner space", () => {
    assert.equal(toCents("1 299,90"), null);
  });

  it("rejects scientific notation", () => {
    assert.equal(toCents("1e2"), null);
  });

  it("rejects a currency symbol pasted with the amount", () => {
    assert.equal(toCents("S/ 1299,90"), null);
  });

  it("rejects non-ASCII digits", () => {
    assert.equal(toCents("١٢"), null);
  });
});

describe("AMOUNT_INPUT_PATTERN", () => {
  it("accepts both comma and dot as the decimal separator", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test("1299,90"), true);
    assert.equal(AMOUNT_INPUT_PATTERN.test("1299.90"), true);
  });

  it("accepts a whole amount with no separator", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test("1299"), true);
  });

  it("rejects eight integer digits", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test("12345678"), false);
  });

  it("rejects three decimal digits", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test("12,345"), false);
  });

  it("is anchored at both ends", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test("x1299,90x"), false);
  });
});

describe("formatCents", () => {
  it("formats cents with dot grouping and comma decimals", () => {
    assert.equal(formatCents(129990), "S/ 1.299,90");
  });

  it("formats zero with both decimal places", () => {
    assert.equal(formatCents(0), "S/ 0,00");
  });

  it("pads a single-digit cents value", () => {
    assert.equal(formatCents(5), "S/ 0,05");
  });

  it("keeps a sub-unit amount under a zero whole part", () => {
    assert.equal(formatCents(99), "S/ 0,99");
  });

  it("formats an exact unit", () => {
    assert.equal(formatCents(100), "S/ 1,00");
  });

  it("groups from four integer digits on", () => {
    assert.equal(formatCents(100000), "S/ 1.000,00");
  });

  it("groups millions with two separators", () => {
    assert.equal(formatCents(100000000), "S/ 1.000.000,00");
  });

  it("formats the largest amount the input pattern allows", () => {
    assert.equal(formatCents(999999999), "S/ 9.999.999,99");
  });

  it("puts the minus sign after the currency prefix", () => {
    assert.equal(formatCents(-129990), "S/ -1.299,90");
  });

  it("keeps the sign on a negative sub-unit amount", () => {
    assert.equal(formatCents(-50), "S/ -0,50");
  });

  it("does not print a sign for zero", () => {
    assert.equal(formatCents(-0), "S/ 0,00");
  });

  // Contrato del proyecto: los precios son enteros en centavos. La función no
  // guarda contra un decimal, y el resultado sale malformado ("S/ 12,99.5").
  // Hoy es inalcanzable: `toCents` siempre devuelve entero y la columna es
  // integer. Se fija el comportamiento real, no se toca el fuente.
  it("produces malformed text when given a fractional cents value", () => {
    assert.equal(formatCents(1299.5), "S/ 12,99.5");
  });
});

describe("centsToAmountInput", () => {
  it("writes the editable amount with a dot separator", () => {
    assert.equal(centsToAmountInput(129990), "1299.90");
  });

  it("never groups thousands, so the value can be typed back into the input", () => {
    assert.equal(centsToAmountInput(100000000), "1000000.00");
  });

  it("writes zero with both decimal places", () => {
    assert.equal(centsToAmountInput(0), "0.00");
  });

  it("pads a single-digit cents value", () => {
    assert.equal(centsToAmountInput(5), "0.05");
  });

  it("keeps a sub-unit amount under a zero whole part", () => {
    assert.equal(centsToAmountInput(99), "0.99");
  });

  it("prefixes the minus sign on a negative amount", () => {
    assert.equal(centsToAmountInput(-129990), "-1299.90");
  });

  it("keeps the sign on a negative sub-unit amount", () => {
    assert.equal(centsToAmountInput(-50), "-0.50");
  });

  it("does not print a sign for zero", () => {
    assert.equal(centsToAmountInput(-0), "0.00");
  });

  it("produces text that the amount input pattern accepts", () => {
    assert.equal(AMOUNT_INPUT_PATTERN.test(centsToAmountInput(999999999)), true);
  });

  it("round-trips through toCents", () => {
    assert.equal(toCents(centsToAmountInput(129990)), 129990);
  });

  it("round-trips the largest supported amount", () => {
    assert.equal(toCents(centsToAmountInput(999999999)), 999999999);
  });

  it("does not round-trip a negative amount, which toCents rejects", () => {
    assert.equal(toCents(centsToAmountInput(-50)), null);
  });
});
