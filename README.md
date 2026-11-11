# IncogTalk

IncogTalk lets someone hide a private message inside a PNG picture. The sender shares the finished picture and passkey with a friend. The friend uploads that picture, enters the same passkey, and reads the message.

## Run it

1. Unzip this folder.
2. Open the `IncogTalk` folder in VS Code.
3. Open `index.html` with the VS Code Live Server extension.

Or open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Use localhost or an HTTPS website. Modern browsers require a secure page for the built-in encryption feature.

## How to use

### To send a message
1. Choose **Put a message in a picture**.
2. Type your message.
3. Choose one PNG picture.
4. Type any non-empty passkey. It can be short, such as `123`. A longer passkey is safer because short passkeys are easier to guess.
5. Select **Make my secret picture** and download the new PNG.
6. Send the downloaded PNG and share the passkey separately.

### To read a message
1. Choose **Read a hidden message**.
2. Upload the exact PNG file your friend sent. Do not resize, edit, screenshot or recompress it.
3. Enter the same passkey.
4. Select **Show me the message**.

## Pictures: choose your own or use examples?

The current version lets people choose their own PNG picture. This makes the message feel personal and avoids forcing everyone to use the same few pictures. For a very simple first-time experience, a future version could also offer a small set of ready-to-use sample pictures. The best experience is to offer both: **Use my picture** (main choice) and **Choose a sample picture** (optional shortcut).

## Important notes

- Only one picture can be selected in each upload field.
- PNG is supported. JPEG images are not suitable because JPEG compression can damage the hidden message.
- The passkey can be any non-empty text, including `123`. However, short passkeys are much easier to guess. For real privacy, use a longer passphrase and share it separately from the picture.
- The picture and message are processed in the browser. No account or database is needed.
- Image resizing, editing, screenshotting or recompressing can destroy the hidden message.
- Hiding data in pixels is not invisible; this is an educational project and has not had an independent security audit. Do not rely on it for high-risk secrets.

## Project files

```text
IncogTalk/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── crypto.js
│   ├── encode.js
│   └── decode.js
├── assets/
└── README.md
```


## Design and navigation
The site uses a responsive blue-and-white layout. On the hide and read pages, use the Back to Home button or the browser Back button to return to the home screen. The layout adapts to narrow phone screens.
