/* LSB decoder. Reads the 4-byte payload length then extracts exactly that many bytes. */
(() => {
  "use strict";
  const LENGTH_HEADER_BYTES = 4;

  async function decodeBytesFromImage(file) {
    const { imageData, canvas } = await window.SecretPixelStego.readImagePixels(file);
    const pixels = imageData.data;
    const availableBits = Math.floor((canvas.width * canvas.height * 3));
    if (availableBits < LENGTH_HEADER_BYTES * 8) throw new Error("This image is too small to contain an IncogTalk message.");

    function readByteRange(startBit, byteCount) {
      const result = new Uint8Array(byteCount);
      for (let byteIndex = 0; byteIndex < byteCount; byteIndex++) {
        let value = 0;
        for (let bit = 0; bit < 8; bit++) {
          const absoluteBit = startBit + byteIndex * 8 + bit;
          const pixelIndex = Math.floor(absoluteBit / 3) * 4;
          const channel = absoluteBit % 3;
          value = (value << 1) | (pixels[pixelIndex + channel] & 1);
        }
        result[byteIndex] = value;
      }
      return result;
    }

    const lengthBytes = readByteRange(0, LENGTH_HEADER_BYTES);
    const payloadLength = new DataView(lengthBytes.buffer).getUint32(0, false);
    const maxPayloadBytes = Math.floor((availableBits - LENGTH_HEADER_BYTES * 8) / 8);

    if (payloadLength < 1 || payloadLength > maxPayloadBytes) {
      throw new Error("No valid IncogTalk payload was found. Make sure you selected the original encoded PNG, not the cover image.");
    }

    return readByteRange(LENGTH_HEADER_BYTES * 8, payloadLength);
  }

  window.SecretPixelDecoder = Object.freeze({ decodeBytesFromImage });
})();
