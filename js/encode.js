/* LSB encoder. Embeds bytes into RGB least-significant bits in row-major order. */
(() => {
  "use strict";
  const LENGTH_HEADER_BYTES = 4;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected image could not be opened.")); };
      image.src = url;
    });
  }

  async function readImagePixels(file) {
    const image = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not create an image canvas.");
    context.drawImage(image, 0, 0);
    return { canvas, context, imageData: context.getImageData(0, 0, canvas.width, canvas.height) };
  }

  function getCapacityBytes(width, height) {
    return Math.floor((width * height * 3) / 8) - LENGTH_HEADER_BYTES;
  }

  async function encodeBytesIntoImage(file, payload) {
    if (!(payload instanceof Uint8Array) || payload.length === 0) throw new Error("There is no encrypted payload to hide.");
    if (payload.length > 0xFFFFFFFF) throw new Error("The payload is too large.");

    const { canvas, context, imageData } = await readImagePixels(file);
    const pixels = imageData.data;
    const capacity = getCapacityBytes(canvas.width, canvas.height);
    if (payload.length > capacity) {
      throw new Error(`This message is too large for the selected image. It can hold about ${Math.max(0, capacity).toLocaleString()} payload bytes; this message needs ${payload.length.toLocaleString()}. Choose a larger PNG or a shorter message.`);
    }

    // A 4-byte big-endian payload length lets the decoder know exactly what to read.
    const framed = new Uint8Array(LENGTH_HEADER_BYTES + payload.length);
    new DataView(framed.buffer).setUint32(0, payload.length, false);
    framed.set(payload, LENGTH_HEADER_BYTES);

    let bitIndex = 0;
    const totalBits = framed.length * 8;
    for (let pixel = 0; pixel < pixels.length && bitIndex < totalBits; pixel += 4) {
      for (let channel = 0; channel < 3 && bitIndex < totalBits; channel++) {
        const byte = framed[bitIndex >>> 3];
        const bit = (byte >>> (7 - (bitIndex & 7))) & 1;
        const index = pixel + channel;
        pixels[index] = (pixels[index] & 0xFE) | bit;
        bitIndex++;
      }
    }

    context.putImageData(imageData, 0, 0);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error("The browser could not create the encoded PNG.")), "image/png");
    });
    return blob;
  }

  window.SecretPixelStego = Object.freeze({ readImagePixels, getCapacityBytes, encodeBytesIntoImage });
})();
