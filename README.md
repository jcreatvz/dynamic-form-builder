# Dynamic Form Studio

A static, GitHub Pages-ready form builder and renderer.

## Pages

- `index.html` - project entry page
- `builder.html` - visual form builder with local JSON import/export
- `form.html` - public form renderer
- `form-config.json` - sample static form configuration

## Workflow

1. Open `builder.html`.
2. Add or edit fields.
3. Export the JSON config.
4. Replace `form-config.json` in the repo with the exported file.
5. Publish the folder with GitHub Pages.

The builder also saves the latest config to the browser so `form.html` can preview it locally on the same device.

For a local preview that matches GitHub Pages file loading:

```bash
node local-server.js
```

Then open `http://127.0.0.1:4173/`.

## Next Integrations

- Google Sheets submissions through Google Apps Script.
- Optional CSV export or protected GitHub CSV writing through a serverless endpoint.
