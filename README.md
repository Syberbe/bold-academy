# BOLD Academy

**Open de app:** https://syberbe.github.io/bold-academy/

Trainingsapp voor calisthenics en ringen: je schema, de oefeningen in 3D, een logboek per set, een rusttimer en een weekschema dat gemiste trainingen opschuift.

## Installeren op Android

1. Open de app in Chrome.
2. Tik op het menu (⋮) en kies **App installeren** of **Toevoegen aan startscherm**.
3. BOLD Academy staat nu als app op je startscherm en werkt ook zonder internet.

## Je gegevens

- Alles blijft op je eigen toestel. Er is geen account en er gaat niets naar een server.
- Maak af en toe een back-up via **Schema → Back-up maken**, zeker voor je van gsm wisselt.

## Technisch

- Statische webapp (HTML, CSS, JavaScript), geen buildstap nodig om te draaien.
- 3D: [three.js](https://threejs.org) r149 (MIT-licentie), meegeleverd in `vendor/`.
- Lettertypes: Archivo, Big Shoulders Display en JetBrains Mono (SIL Open Font License), meegeleverd in `fonts/`.
- Werkt offline dankzij een service worker (`sw.js`).

## Ontwikkelen

- Broncode staat in `app/`. `python3 build.py` maakt `dist/` (de site voor GitHub Pages) en `preview/`.
- De gepubliceerde site staat op de branch `gh-pages` (inhoud van `dist/`).
- `python3 test/run.py` test de app in een headless browser (Playwright) met verzonnen testdata.
