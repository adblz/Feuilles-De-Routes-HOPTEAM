# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Feuille de Route** is a single-file static web application (`index.html`) for French field technicians to fill out and submit daily intervention reports. No build step, no dependencies to install — open `index.html` directly in a browser.

External dependency: `html2pdf.js` loaded from a CDN (`cdnjs.cloudflare.com`) at runtime.

## Architecture

Everything lives in `index.html` in three sections:

1. **CSS** (`<style>`) — Two visual contexts: the interactive form UI and a `pdf-wrap`/`pdf-*` set of classes used only when rendering the temporary DOM node that `html2pdf` captures. Keep these separate; the PDF render classes target a fixed 794 px-wide offscreen element.

2. **HTML** — Static shell with two dynamic regions: `#interventions-list` (populated by JS) and `#modal-settings` (toggled via CSS class).

3. **JavaScript** (`<script>`) — No framework, plain DOM manipulation. Key globals:
   - `cfg` — runtime settings object, mirrored in `localStorage` (`cfg_company`, `cfg_email`, `cfg_seuil`).
   - `intCount` / `pauseCount` — monotonically incrementing counters used as IDs for intervention and pause cards. IDs are **not** reassigned after deletion, so `rawId` (stripped from the element's `id` attribute) is the stable per-element key used to retrieve child input values.
   - `lireTousLesElements()` — walks `#interventions-list > div` in DOM order to read all intervention/pause data. Order in the DOM is the source of truth for display order in the PDF.
   - `construirePDF()` — builds an HTML string injected into a temporary offscreen `div.pdf-wrap`, which `html2pdf` then captures as a PDF.

## Hour calculation logic

`calcHeures()` deducts a fixed 1-hour travel allowance plus the lunch break from total worked time. Overtime (`heures-supp`) is computed against `cfg.seuil` (default 8 h). Both fields are read-only and auto-filled.

## Email flow

`envoyerMail()` first triggers `genererPDF()` (which downloads the PDF to disk), then opens a `mailto:` URI with a pre-filled subject and body. The user must manually attach the downloaded PDF before sending — this is by design (no server-side attachment capability).

## Settings persistence

User settings (company name, manager email, overtime threshold) are stored in `localStorage` only. The last technician name typed is also persisted under `last_tech`. No cookies, no server calls.
