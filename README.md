# Dynamic Form Studio

A static, GitHub Pages-ready form builder and renderer that submits responses to Google Sheets through Google Apps Script.

Author: JC Lutao

Live site: https://jcreatvz.github.io/dynamic-form-builder/

## Pages

- `index.html` - project entry page
- `builder.html` - visual form builder with local JSON import/export
- `form.html` - public form renderer
- `form-config.json` - sample static form configuration

## Workflow

1. Open `builder.html`.
2. Add or edit fields.
3. Paste your Apps Script Web App URL.
4. Use `View Form` to test the builder's current draft immediately.
5. Export the JSON config.
6. Replace `form-config.json` in the repo with the exported file.
7. Push to publish the change on GitHub Pages.

The builder saves draft config to the browser. `View Form` opens `form.html` after saving the current draft, and the form uses that draft first. If no browser draft exists, it falls back to the published `form-config.json`.

For a local preview that matches GitHub Pages file loading:

```bash
node local-server.js
```

Then open `http://127.0.0.1:4173/`.

## Google Sheets Setup

1. Create a new Google Sheet.
2. In the sheet, go to `Extensions` -> `Apps Script`.
3. Replace the starter script with `google-apps-script/Code.gs` from this repo.
4. Click `Deploy` -> `New deployment`.
5. Choose `Web app`.
6. Set `Execute as` to `Me`.
7. Set `Who has access` to `Anyone`.
8. Deploy and authorize the script.
9. Copy the Web App URL ending in `/exec`.
10. Open `builder.html`, paste the Web App URL, then export `form-config.json`.
11. Replace the repo's `form-config.json` with the exported file and push it.

The Apps Script creates a `Submissions` tab, keeps the header row aligned to the current form fields, and appends each form response as a new row.
