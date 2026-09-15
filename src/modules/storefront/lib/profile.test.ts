// Pruebas unitarias de src/modules/storefront/lib/profile.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROFILE_PATH,
  PROFILE_SECTIONS,
  profileTabHref,
  profileTabSchema,
} from "./profile";

describe("profileTabHref", () => {
  it("returns the bare /profile path for the default tab, with no query string", () => {
    assert.equal(profileTabHref("profile"), "/profile");
    assert.equal(profileTabHref("profile"), PROFILE_PATH);
  });

  it("appends ?tab= for the favorites tab", () => {
    assert.equal(profileTabHref("favorites"), "/profile?tab=favorites");
  });

  it("appends ?tab= for the orders tab", () => {
    assert.equal(profileTabHref("orders"), "/profile?tab=orders");
  });

  it("appends ?tab= for the hyphenated payment-methods tab, leaving the hyphen unescaped", () => {
    assert.equal(
      profileTabHref("payment-methods"),
      "/profile?tab=payment-methods",
    );
  });

  it("builds a href for every section of the sidebar", () => {
    assert.deepEqual(
      PROFILE_SECTIONS.map((section) => profileTabHref(section.id)),
      [
        "/profile",
        "/profile?tab=favorites",
        "/profile?tab=orders",
        "/profile?tab=payment-methods",
      ],
    );
  });

  it("round-trips with profileTabSchema: the href it builds parses back to the same tab", () => {
    for (const section of PROFILE_SECTIONS) {
      const href = profileTabHref(section.id);
      const raw = new URL(href, "https://store.test").searchParams.get("tab");

      assert.equal(profileTabSchema.parse(raw ?? "profile"), section.id);
    }
  });
});
