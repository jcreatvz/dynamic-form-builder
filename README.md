# Dynamic Form Studio

A static, GitHub Pages-ready form builder and renderer that submits responses to Google Sheets through Google Apps Script.

Author: JC Lutao

Live site: https://jcreatvz.github.io/dynamic-form-builder/

## Pages

- `index.html` - project entry page
- `builder.html` - visual form builder with local JSON import/export
- `form.html` - public form renderer
- `form-config.json` - sample static form configuration

## Builder Features

- Lightweight builder login gate for one temporary account
- Form theme mode: light or dark
- Advanced select displays: dropdown, option list, or multi-select
- Section fields for grouping related questions
- Conditional visibility rules for showing fields based on previous answers
- Dynamic option scripts for dropdown, radio, and checkbox fields
- Field visibility defaults and show/hide rules with faded hidden fields in builder preview
- Body background image, form background image, and hero image/video controls
- Google Sheets submission through an Apps Script Web App URL

The builder login is a temporary browser-side gate, not production security.

## Workflow

1. Open `builder.html`.
2. Add or edit fields.
3. Paste your Apps Script Web App URL.
4. Use `View Form` to test the builder's current draft immediately.
5. Export the JSON config or use `Push Config` with a temporary GitHub token.
6. Publish the change on GitHub Pages.

The builder saves draft config to the browser. `View Form` opens `form.html` after saving the current draft, and the form uses that draft first. If no browser draft exists, it falls back to the published `form-config.json`.

## Dynamic Option Rules

Dynamic option rules apply only to dropdown/select, radio, and checkbox fields. They let one field control the available options in another field using field IDs.

Example:

```text
when service = Website:
  Landing Page
  E-commerce
when service = Automation:
  Zapier
  Custom API
default:
  General Inquiry
```

Supported rule headers:

- `when field_id = Value:`
- `when field_id != Value:`
- `when field_id contains Value:`
- `default:`

## Visibility Rules

Each non-section field can be shown or hidden by default. A rule can then show or hide that field when another field matches a condition. In the builder preview, hidden fields remain visible at reduced opacity so they can still be edited. In the live form, hidden fields are removed from validation and submission.

## Form Media

Form settings support public URLs for:

- Body background image
- Form wrapper background image with opacity
- Hero image or direct video URL before the form heading

Use direct public image/video URLs such as `.jpg`, `.png`, `.webp`, or `.mp4`. Direct videos autoplay muted, loop, and hide controls. YouTube watch, short, live, embed, and `youtu.be` links are also supported and are converted into muted autoplay looping hero videos. Browser autoplay generally requires the video to be muted.

## Temporary GitHub Publishing

The builder can update `form-config.json` directly through GitHub's Contents API. This is a temporary convenience for simple events and open-source-style use.

1. Create a fine-grained GitHub token for this repository.
2. Grant `Contents` read/write permission.
3. Paste the token into the builder's GitHub Token field.
4. Click `Remember Token This Session` if you want to keep it until the browser tab/session closes.
5. Click `Push Config`.

The token is stored only in `sessionStorage`, not committed to the repo and not saved into the exported JSON. This is still less secure than a real backend, so use a limited token and revoke it when no longer needed.

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
10. Open `builder.html`, paste the Web App URL, then export or push `form-config.json`.

The Apps Script creates a `Submissions` tab, keeps the header row aligned to the current form fields, and appends each form response as a new row.

Because the static site submits to Apps Script with browser `no-cors` mode, the form can confirm that the request was handed to the endpoint, but it cannot read the true row-insert response from Google. If the Apps Script URL, deployment, or permissions are wrong, Google may reject the insert after the browser handoff.
