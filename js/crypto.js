/* IncogTalk cryptography.
   Uses Web Crypto API: PBKDF2-SHA-256 + AES-256-GCM.
   Format: magic(4) | version(1) | salt(16) | IV(12) | ciphertext+tag.
*/
(() => {
  "use strict";

  const MAGIC = new Uint8Array([0x53, 0x50, 0x58, 0x31]); // SPX1
  const VERSION = 1;
  const SALT_LENGTH = 16;
  const IV_LENGTH = 12;
  const PBKDF2_ITERATIONS = 310_000;
  const HEADER_LENGTH = MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH;

  function requireCrypto() {
    if (!globalThis.crypto || !crypto.subtle || !crypto.getRandomValues) {
      throw new Error("Secure cryptography is unavailable. Open IncogTalk on localhost or an HTTPS website in a modern browser.");
    }
  }

  async function deriveKey(passphrase, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptMessage(message, passphrase) {
    requireCrypto();
    if (typeof message !== "string" || !message.length) throw new Error("Enter a message before encrypting.");
    if (typeof passphrase !== "string" || passphrase.length === 0) throw new Error("Type a passkey. It can be short, such as 123.");

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(passphrase, salt);
    const plaintext = new TextEncoder().encode(message);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, plaintext));

    const packageBytes = new Uint8Array(HEADER_LENGTH + encrypted.length);
    packageBytes.set(MAGIC, 0);
    packageBytes[4] = VERSION;
    packageBytes.set(salt, 5);
    packageBytes.set(iv, 5 + SALT_LENGTH);
    packageBytes.set(encrypted, HEADER_LENGTH);
    return packageBytes;
  }

  async function decryptMessage(packageBytes, passphrase) {
    requireCrypto();
    if (!(packageBytes instanceof Uint8Array) || packageBytes.length < HEADER_LENGTH + 16) {
      throw new Error("This image does not contain a valid IncogTalk encrypted message.");
    }
    if (typeof passphrase !== "string" || !passphrase.length) throw new Error("Enter the passkey supplied by the sender.");

    for (let i = 0; i < MAGIC.length; i++) {
      if (packageBytes[i] !== MAGIC[i]) throw new Error("No IncogTalk message was found in this image, or the image has been altered.");
    }
    if (packageBytes[4] !== VERSION) throw new Error("This IncogTalk image uses an unsupported format version.");

    const salt = packageBytes.slice(5, 5 + SALT_LENGTH);
    const ivStart = 5 + SALT_LENGTH;
    const iv = packageBytes.slice(ivStart, ivStart + IV_LENGTH);
    const ciphertext = packageBytes.slice(HEADER_LENGTH);
    const key = await deriveKey(passphrase, salt);

    try {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, ciphertext);
      return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    } catch {
      throw new Error("Decryption failed. Check that the passkey is correct and that the image has not been modified.");
    }
  }

  window.SecretPixelCrypto = Object.freeze({ encryptMessage, decryptMessage });
})();
