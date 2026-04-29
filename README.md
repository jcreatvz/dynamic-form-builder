# Dynamic Form Studio

A static, GitHub Pages-ready form builder and renderer.

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

- Optional CSV export or protected GitHub CSV writing through a serverless endpoint.

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
10. Open `builder.html`, set `Storage Mode` to `Google Sheets`, paste the Web App URL, then export `form-config.json`.
11. Replace the repo's `form-config.json` with the exported file and push it.

The Apps Script creates a `Submissions` tab, keeps the header row aligned to the current form fields, and appends each form response as a new row.
