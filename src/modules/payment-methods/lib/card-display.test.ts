// Pruebas unitarias de src/modules/payment-methods/lib/card-display.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { brandLabel, formatExpiry, maskedNumber } from "./card-display";

describe("brandLabel", () => {
  it("maps the Stripe brand 'visa' to its display name", () => {
    assert.equal(brandLabel("visa"), "Visa");
  });

  it("maps 'mastercard' to its display name", () => {
    assert.equal(brandLabel("mastercard"), "Mastercard");
  });

  it("expands 'amex' to the full American Express name instead of capitalizing it", () => {
    assert.equal(brandLabel("amex"), "American Express");
  });

  it("expands 'diners' to the full Diners Club name", () => {
    assert.equal(brandLabel("diners"), "Diners Club");
  });

  it("maps the remaining brands Stripe can return", () => {
    assert.equal(brandLabel("discover"), "Discover");
    assert.equal(brandLabel("eftpos_au"), "Eftpos");
    assert.equal(brandLabel("jcb"), "JCB");
    assert.equal(brandLabel("unionpay"), "UnionPay");
  });

  it("translates Stripe's own 'unknown' placeholder into a generic label", () => {
    assert.equal(brandLabel("unknown"), "Tarjeta");
  });

  it("capitalizes a brand that is not in the table", () => {
    assert.equal(brandLabel("elo"), "Elo");
  });

  it("capitalizes only the first character, leaving the rest of the key verbatim", () => {
    assert.equal(brandLabel("cartes_bancaires"), "Cartes_bancaires");
  });

  it("looks the brand up case-sensitively, so an already uppercase brand falls through unchanged", () => {
    assert.equal(brandLabel("VISA"), "VISA");
    assert.equal(brandLabel("Visa"), "Visa");
  });

  it("capitalizes a single-character brand", () => {
    assert.equal(brandLabel("x"), "X");
  });

  it("returns an empty string for an empty brand instead of throwing", () => {
    assert.equal(brandLabel(""), "");
  });

  // Comportamiento real documentado, no deseado: el lookup es sobre un objeto
  // literal, así que las claves heredadas de `Object.prototype` ganan al
  // fallback y salen valores que no son `string` pese a la firma. Hoy
  // inalcanzable: la marca viene del conjunto cerrado de `card.brand` de
  // Stripe, nunca de texto libre.
  it("returns an inherited Object.prototype member for keys like 'constructor' instead of capitalizing them", () => {
    assert.equal(typeof brandLabel("constructor"), "function");
    assert.notEqual(brandLabel("constructor"), "Constructor");
    assert.equal(typeof brandLabel("toString"), "function");
  });
});

describe("maskedNumber", () => {
  it("prefixes the last four digits with the bullet mask", () => {
    assert.equal(maskedNumber("4242"), "•••• 4242");
  });

  it("keeps leading zeros, since last4 travels as a string", () => {
    assert.equal(maskedNumber("0007"), "•••• 0007");
  });

  it("uses exactly four bullets and one space as the separator", () => {
    const masked = maskedNumber("4242");

    assert.equal(masked.slice(0, 5), "•••• ");
    assert.equal(masked.length, 9);
  });

  it("does not pad a shorter value up to four digits", () => {
    assert.equal(maskedNumber("42"), "•••• 42");
  });

  it("renders only the mask and its trailing space when last4 is empty", () => {
    assert.equal(maskedNumber(""), "•••• ");
  });

  it("never leaks anything other than what it was given", () => {
    assert.equal(maskedNumber("1234").includes("1234"), true);
    assert.equal(maskedNumber("1234").replace("•••• ", ""), "1234");
  });
});

describe("formatExpiry", () => {
  it("pads a single-digit month to two digits", () => {
    assert.equal(formatExpiry(3, 2029), "03/2029");
  });

  it("leaves a two-digit month untouched", () => {
    assert.equal(formatExpiry(12, 2026), "12/2026");
  });

  it("formats the first month of the year as 01", () => {
    assert.equal(formatExpiry(1, 2027), "01/2027");
  });

  it("prints the year in full, unlike the four digits embossed on the card", () => {
    assert.equal(formatExpiry(9, 2030), "09/2030");
  });

  it("does not expand a two-digit year into a four-digit one", () => {
    assert.equal(formatExpiry(3, 27), "03/27");
  });

  it("does not validate the month: an out-of-range value is printed as is", () => {
    // La cota real la pone el CHECK `exp_month between 1 and 12` de la tabla,
    // no esta función.
    assert.equal(formatExpiry(0, 2026), "00/2026");
    assert.equal(formatExpiry(100, 2026), "100/2026");
  });

  it("does not pad a negative month, whose sign already fills two characters", () => {
    assert.equal(formatExpiry(-1, 2026), "-1/2026");
  });
});
