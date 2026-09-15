// Pruebas unitarias de src/lib/utils.ts.
//
// Módulo puro: `clsx` + `tailwind-merge` y una cadena de `replace`. Sin estado,
// sin entorno, sin colaboradores.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { cn, slugify } from "./utils";

describe("cn", () => {
  it("returns an empty string when called with no arguments", () => {
    assert.equal(cn(), "");
  });

  it("joins two unrelated classes with a space", () => {
    assert.equal(cn("mt-2", "mb-4"), "mt-2 mb-4");
  });

  it("keeps the last of two conflicting classes of the same group", () => {
    assert.equal(cn("px-2", "px-4"), "px-4");
  });

  it("keeps the last conflicting color class", () => {
    assert.equal(cn("text-red-500", "text-blue-500"), "text-blue-500");
  });

  it("resolves conflicts only inside the same variant", () => {
    assert.equal(cn("hover:px-2", "hover:px-4"), "hover:px-4");
  });

  it("does not let a variant class override the unprefixed one", () => {
    assert.equal(cn("px-2", "hover:px-4"), "px-2 hover:px-4");
  });

  it("resolves conflicts between arbitrary values", () => {
    assert.equal(cn("p-[2px]", "p-[4px]"), "p-[4px]");
  });

  it("keeps a shorthand and its more specific side together", () => {
    assert.equal(cn("p-4", "px-2"), "p-4 px-2");
  });

  it("ignores false, null, undefined and empty strings", () => {
    assert.equal(cn("flex", false, null, undefined, ""), "flex");
  });

  it("takes the truthy keys of an object", () => {
    assert.equal(cn("a", { b: true, c: false }), "a b");
  });

  it("flattens nested arrays", () => {
    assert.equal(cn(["a", ["b", ["c"]]]), "a b c");
  });

  it("lets a conditional object override an earlier conflicting class", () => {
    assert.equal(cn("px-2", { "px-4": true }), "px-4");
  });

  it("keeps a conditional class out when its condition is false", () => {
    assert.equal(cn("px-2", { "px-4": false }), "px-2");
  });

  it("leaves classes it does not recognize untouched", () => {
    assert.equal(cn("btn", "btn-primary"), "btn btn-primary");
  });

  it("collapses a class repeated verbatim", () => {
    assert.equal(cn("p-2", "p-2"), "p-2");
  });

  it("resolves a conflict written inside a single string", () => {
    assert.equal(cn("px-2 px-4"), "px-4");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    assert.equal(slugify("Laptop Gamer"), "laptop-gamer");
  });

  it("strips accents from vowels", () => {
    assert.equal(slugify("Cámara Réflex"), "camara-reflex");
  });

  it("turns ñ into n", () => {
    assert.equal(slugify("Ñandú"), "nandu");
  });

  it("strips the diaeresis", () => {
    assert.equal(slugify("Pingüino"), "pinguino");
  });

  it("collapses a run of separators into a single hyphen", () => {
    assert.equal(slugify("Teclado   ---   Mecánico"), "teclado-mecanico");
  });

  it("drops leading and trailing separators", () => {
    assert.equal(slugify("  ¡Oferta!  "), "oferta");
  });

  it("drops a trailing separator even when there is also a leading one", () => {
    assert.equal(slugify("¿Qué?"), "que");
  });

  it("keeps digits", () => {
    assert.equal(slugify("iPhone 15 Pro"), "iphone-15-pro");
  });

  it("does not split a word that already mixes letters and digits", () => {
    assert.equal(slugify("MacBook14"), "macbook14");
  });

  it("turns punctuation between words into a hyphen", () => {
    assert.equal(slugify("Mouse/Teclado"), "mouse-teclado");
  });

  it("turns underscores into hyphens", () => {
    assert.equal(slugify("audio_pro"), "audio-pro");
  });

  it("drops apostrophes and quotes", () => {
    assert.equal(slugify('Monitor 27" LG'), "monitor-27-lg");
  });

  it("drops emoji", () => {
    assert.equal(slugify("Oferta 🔥 Flash"), "oferta-flash");
  });

  it("leaves an already valid slug unchanged", () => {
    assert.equal(slugify("laptop-gamer-15"), "laptop-gamer-15");
  });

  it("returns an empty string for an empty input", () => {
    assert.equal(slugify(""), "");
  });

  it("returns an empty string for whitespace only", () => {
    assert.equal(slugify("   "), "");
  });

  it("returns an empty string when the input is only punctuation", () => {
    assert.equal(slugify("!!!"), "");
  });

  // Un nombre sin letras latinas se queda sin slug. No es un agujero: los
  // route handlers de productos y categorías comprueban `if (!slug)` y
  // responden 400 pidiendo uno manual.
  it("returns an empty string for text written in a non-latin script", () => {
    assert.equal(slugify("键盘"), "");
  });

  it("is idempotent", () => {
    const once = slugify("¡Cámara Réflex 2026!");

    assert.equal(slugify(once), once);
  });

  it("never produces a leading or trailing hyphen", () => {
    for (const input of ["--hola--", "  -a-  ", "!a!", "(nuevo)"]) {
      const slug = slugify(input);

      assert.equal(slug.startsWith("-"), false, input);
      assert.equal(slug.endsWith("-"), false, input);
    }
  });
});
