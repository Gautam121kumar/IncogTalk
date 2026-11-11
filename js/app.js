(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  let coverFile = null;
  let secretFile = null;
  let encodedUrl = null;
  let lastPasskey = "";

  // Each step accepts one picture only.
  $("imageUpload").multiple = false;
  $("encodedImage").multiple = false;

  function setStatus(element, message, type = "info") {
    element.textContent = message;
    element.className = `status ${type}`;
    element.hidden = !message;
  }

  function setBusy(button, busy, text) {
    button.disabled = busy;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = text;
    } else {
      button.textContent = button.dataset.originalText || text;
    }
  }

  function showPage(pageName, updateHistory = true) {
    document.querySelectorAll(".page").forEach(page => { page.hidden = page.id !== pageName; });
    document.querySelectorAll("[data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === pageName));
    if (updateHistory) {
      const nextUrl = pageName === "home" ? location.pathname + location.search : `#${pageName}`;
      if (location.hash !== (pageName === "home" ? "" : `#${pageName}`)) history.pushState({ page: pageName }, "", nextUrl);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault(); showPage(button.dataset.page, true);
  }));

  document.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", () => {
    const input = $(button.dataset.toggle);
    const showing = input.type === "password";
    input.type = showing ? "text" : "password";
    button.textContent = showing ? "Hide" : "Show";
  }));

  function validatePng(file) {
    if (!file) throw new Error("Choose a PNG image first.");
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) throw new Error("Please choose a PNG image. JPEG files are not supported.");
    if (file.size > MAX_FILE_BYTES) throw new Error("This image is larger than 20 MB. Choose a smaller PNG.");
    if (file.size === 0) throw new Error("The selected file is empty.");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function showPreview(file, imageElement, nameElement, dimensionsElement, previewElement) {
    const previewUrl = URL.createObjectURL(file);
    imageElement.src = previewUrl;
    imageElement.onload = () => URL.revokeObjectURL(previewUrl);
    nameElement.textContent = `${file.name} · ${formatBytes(file.size)}`;
    const dimensionUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      dimensionsElement.textContent = `${image.naturalWidth} × ${image.naturalHeight} pixels`;
      URL.revokeObjectURL(dimensionUrl);
    };
    image.onerror = () => URL.revokeObjectURL(dimensionUrl);
    image.src = dimensionUrl;
    previewElement.hidden = false;
  }

  function clearPreview(fileInput, previewElement, imageElement) {
    fileInput.value = "";
    imageElement.removeAttribute("src");
    previewElement.hidden = true;
  }

  $("secretMessage").addEventListener("input", () => {
    $("charCount").textContent = `${[...$("secretMessage").value].length.toLocaleString()} / 10,000`;
  });

  function useCoverFile(file, input = $("imageUpload")) {
    if (!file) return;
    try {
      validatePng(file);
      coverFile = file;
      showPreview(file, $("coverPreviewImage"), $("coverFileName"), $("coverDimensions"), $("coverPreview"));
      window.SecretPixelStego.readImagePixels(file).then(({ canvas }) => {
        const capacity = Math.max(0, window.SecretPixelStego.getCapacityBytes(canvas.width, canvas.height));
        $("capacityText").textContent = `About ${formatBytes(capacity)} available`;
      }).catch(error => setStatus($("encodeStatus"), error.message, "error"));
      setStatus($("encodeStatus"), "Picture selected. Enter your message and passkey.", "success");
      $("encodeResult").hidden = true;
    } catch (error) {
      coverFile = null; input.value = "";
      setStatus($("encodeStatus"), error.message, "error");
    }
  }

  function useSecretFile(file, input = $("encodedImage")) {
    if (!file) return;
    try {
      validatePng(file);
      secretFile = file;
      showPreview(file, $("secretPreviewImage"), $("secretFileName"), $("secretDimensions"), $("secretPreview"));
      setStatus($("decodeStatus"), "Picture selected. Enter the passkey to read the message.", "success");
      $("decodeResult").hidden = true;
    } catch (error) {
      secretFile = null; input.value = "";
      setStatus($("decodeStatus"), error.message, "error");
    }
  }

  function addDropSupport(zoneId, onFile, statusId) {
    const zone = $(zoneId);
    ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.add("drag-over");
    }));
    ["dragleave", "dragend"].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
    }));
    zone.addEventListener("drop", event => {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.remove("drag-over");
      const files = event.dataTransfer?.files;
      if (!files || !files.length) return;
      if (files.length > 1) {
        setStatus($(statusId), "Please drop one picture at a time.", "error");
        return;
      }
      onFile(files[0]);
    });
  }

  addDropSupport("coverDropZone", useCoverFile, "encodeStatus");
  addDropSupport("secretDropZone", useSecretFile, "decodeStatus");

  $("imageUpload").addEventListener("change", event => useCoverFile(event.target.files[0], event.target));

  $("clearCover").addEventListener("click", () => {
    coverFile = null;
    clearPreview($("imageUpload"), $("coverPreview"), $("coverPreviewImage"));
    $("capacityText").textContent = "Choose an image to check";
    setStatus($("encodeStatus"), "", "info");
  });

  $("encodedImage").addEventListener("change", event => useSecretFile(event.target.files[0], event.target));

  $("clearSecret").addEventListener("click", () => {
    secretFile = null;
    clearPreview($("encodedImage"), $("secretPreview"), $("secretPreviewImage"));
    setStatus($("decodeStatus"), "", "info");
  });

  $("generateButton").addEventListener("click", async () => {
    const button = $("generateButton");
    const message = $("secretMessage").value;
    const passkey = $("senderPassword").value;
    try {
      if (!message.trim()) throw new Error("Enter a secret message first.");
      if ([...message].length > 10000) throw new Error("Your message is too long. The limit is 10,000 characters.");
      if (!coverFile) throw new Error("Choose a cover PNG image first.");
      if (!passkey) throw new Error("Type a passkey. It can be short, such as 123.");
      setBusy(button, true, "Encrypting and hiding message…");
      setStatus($("encodeStatus"), "Encrypting your message and embedding it in the image. This may take a few seconds…", "info");
      $("encodeResult").hidden = true;

      const encryptedPayload = await window.SecretPixelCrypto.encryptMessage(message, passkey);
      const blob = await window.SecretPixelStego.encodeBytesIntoImage(coverFile, encryptedPayload);
      if (encodedUrl) URL.revokeObjectURL(encodedUrl);
      encodedUrl = URL.createObjectURL(blob);
      $("encodedPreview").src = encodedUrl;
      $("downloadLink").href = encodedUrl;
      $("encodeResult").hidden = false;
      lastPasskey = passkey;
      setStatus($("encodeStatus"), `Success. Encrypted payload hidden in a PNG (${formatBytes(blob.size)}).`, "success");
      $("encodeResult").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus($("encodeStatus"), error.message || "Could not create the secret image.", "error");
    } finally {
      setBusy(button, false, "Encrypt & create secret image →");
    }
  });

  $("copySenderPasskey").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastPasskey);
      $("copySenderPasskey").textContent = "Passkey copied ✓";
      setTimeout(() => { $("copySenderPasskey").textContent = "Copy passkey"; }, 1800);
    } catch {
      setStatus($("encodeStatus"), "Clipboard access was blocked. Select and copy the passkey from the field instead.", "error");
    }
  });

  $("revealButton").addEventListener("click", async () => {
    const button = $("revealButton");
    const passkey = $("receiverPassword").value;
    try {
      if (!secretFile) throw new Error("Choose the secret PNG image first.");
      if (!passkey) throw new Error("Enter the passkey supplied by the sender.");
      setBusy(button, true, "Extracting and decrypting…");
      setStatus($("decodeStatus"), "Reading hidden data and verifying the passkey…", "info");
      $("decodeResult").hidden = true;
      const payload = await window.SecretPixelDecoder.decodeBytesFromImage(secretFile);
      const message = await window.SecretPixelCrypto.decryptMessage(payload, passkey);
      $("recoveredMessage").value = message;
      $("decodeResult").hidden = false;
      setStatus($("decodeStatus"), "Message authenticated and decrypted successfully.", "success");
      $("decodeResult").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus($("decodeStatus"), error.message || "Could not recover the message.", "error");
    } finally {
      setBusy(button, false, "Extract & decrypt message →");
    }
  });

  $("copyMessage").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("recoveredMessage").value);
      $("copyMessage").textContent = "Message copied ✓";
      setTimeout(() => { $("copyMessage").textContent = "Copy recovered message"; }, 1800);
    } catch {
      setStatus($("decodeStatus"), "Clipboard access was blocked. Select and copy the recovered message manually.", "error");
    }
  });

  window.addEventListener("popstate", () => {
    const page = location.hash === "#hide" || location.hash === "#reveal" ? location.hash.slice(1) : "home";
    showPage(page, false);
  });

  const initialPage = location.hash === "#hide" || location.hash === "#reveal" ? location.hash.slice(1) : "home";
  showPage(initialPage, false);
  if (!window.isSecureContext || !window.crypto?.subtle) {
    setStatus($("encodeStatus"), "Web Crypto requires localhost or HTTPS. Open this project with VS Code Live Server or deploy it to an HTTPS host.", "error");
  }
})();
