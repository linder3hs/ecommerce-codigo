// Pruebas unitarias de src/lib/image-hosts.ts.
//
// Módulo puro: una allowlist literal y el parser `URL` del runtime. Es una
// pieza de seguridad (decide qué orígenes carga la landing pública), así que
// los casos cubren también los intentos de esquivarla: userinfo, subdominio,
// sufijo, homoglifo y protocolo no https.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_IMAGE_HOSTS,
  ALLOWED_IMAGE_HOSTS_LABEL,
  IMAGE_URL_HOST_MESSAGE,
  isAllowedImageUrl,
} from "./image-hosts";

describe("isAllowedImageUrl", () => {
  it("accepts every host in the allowlist over https", () => {
    for (const host of ALLOWED_IMAGE_HOSTS) {
      assert.equal(isAllowedImageUrl(`https://${host}/photo.jpg`), true, host);
    }
  });

  it("accepts a path with query string and fragment", () => {
    assert.equal(
      isAllowedImageUrl("https://images.unsplash.com/photo-1?w=800&q=80#x"),
      true,
    );
  });

  it("accepts the bare origin with no path", () => {
    assert.equal(isAllowedImageUrl("https://images.unsplash.com"), true);
  });

  it("accepts an uppercase URL because the parser lowercases scheme and host", () => {
    assert.equal(isAllowedImageUrl("HTTPS://IMAGES.UNSPLASH.COM/a.jpg"), true);
  });

  it("rejects the same host over http", () => {
    assert.equal(isAllowedImageUrl("http://images.unsplash.com/a.jpg"), false);
  });

  it("rejects a host that is not in the allowlist", () => {
    assert.equal(isAllowedImageUrl("https://evil.com/a.jpg"), false);
  });

  it("rejects a subdomain of an allowed host", () => {
    assert.equal(
      isAllowedImageUrl("https://cdn.images.unsplash.com/a.jpg"),
      false,
    );
  });

  it("rejects a host that only ends with an allowed host name", () => {
    assert.equal(
      isAllowedImageUrl("https://notimages.unsplash.com/a.jpg"),
      false,
    );
  });

  it("rejects a domain that merely starts with an allowed host name", () => {
    assert.equal(
      isAllowedImageUrl("https://images.unsplash.com.evil.com/a.jpg"),
      false,
    );
  });

  it("rejects an allowed host smuggled in as userinfo", () => {
    assert.equal(
      isAllowedImageUrl("https://images.unsplash.com@evil.com/a.jpg"),
      false,
    );
  });

  it("rejects a homoglyph domain that punycode turns into another host", () => {
    // La segunda "а" es cirílica (U+0430).
    assert.equal(isAllowedImageUrl("https://images.unsplаsh.com/a.jpg"), false);
  });

  it("rejects a trailing-dot version of an allowed host", () => {
    assert.equal(isAllowedImageUrl("https://images.unsplash.com./a.jpg"), false);
  });

  it("rejects a data URL", () => {
    assert.equal(isAllowedImageUrl("data:image/png;base64,AAAA"), false);
  });

  it("rejects a javascript URL", () => {
    assert.equal(isAllowedImageUrl("javascript:alert(1)"), false);
  });

  it("rejects a protocol-relative URL, which has no base to resolve", () => {
    assert.equal(isAllowedImageUrl("//images.unsplash.com/a.jpg"), false);
  });

  it("rejects a relative path", () => {
    assert.equal(isAllowedImageUrl("/images/a.jpg"), false);
  });

  it("rejects a host with no scheme", () => {
    assert.equal(isAllowedImageUrl("images.unsplash.com/a.jpg"), false);
  });

  it("rejects an empty string without throwing", () => {
    assert.equal(isAllowedImageUrl(""), false);
  });

  it("rejects whitespace-only input", () => {
    assert.equal(isAllowedImageUrl("   "), false);
  });

  it("rejects text that is not a URL at all", () => {
    assert.equal(isAllowedImageUrl("no soy una url"), false);
  });

  // El chequeo mira `hostname`, que excluye el puerto: una URL https al host
  // permitido en otro puerto pasa. No es un agujero práctico (el CDN solo
  // sirve en 443) pero conviene fijarlo por escrito.
  it("accepts an allowed host on a non-standard port because only the hostname is checked", () => {
    assert.equal(isAllowedImageUrl("https://images.unsplash.com:8443/a.jpg"), true);
  });

  it("accepts a leading/trailing space around an otherwise valid URL, which URL trims", () => {
    assert.equal(isAllowedImageUrl("  https://images.unsplash.com/a.jpg  "), true);
  });
});

describe("ALLOWED_IMAGE_HOSTS_LABEL", () => {
  it("joins every allowed host with a comma and a space", () => {
    assert.equal(ALLOWED_IMAGE_HOSTS_LABEL, ALLOWED_IMAGE_HOSTS.join(", "));
  });

  it("names every host of the allowlist", () => {
    for (const host of ALLOWED_IMAGE_HOSTS) {
      assert.ok(ALLOWED_IMAGE_HOSTS_LABEL.includes(host), host);
    }
  });
});

describe("IMAGE_URL_HOST_MESSAGE", () => {
  it("tells the admin the URL must be https", () => {
    assert.match(IMAGE_URL_HOST_MESSAGE, /https/);
  });

  it("lists the allowed hosts in the error message", () => {
    assert.ok(IMAGE_URL_HOST_MESSAGE.includes(ALLOWED_IMAGE_HOSTS_LABEL));
  });
});
