# DDAS — Full Hackathon Demo

A multi-page, dependency-free frontend prototype for **Data Download Duplication Alert System (DDAS)**.

## Run

### Fastest
Open `index.html` directly in a browser.

### Recommended
From the `ddas-demo` folder run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Demo flow

1. Landing page → **Open demo**.
2. On **Discover**, search `Maharashtra rainfall dataset 2024`.
3. Click **Download** on the ERA5 result.
4. DDAS simulates an institute-wide scan and shows a duplicate alert.
5. Explore **Overview**, **Lineage & Provenance**, and **Access & History**.
6. Choose **Use existing dataset**, **Copy location**, or **Download anyway**.
7. Browse the **Repository**, filter catalog records, and open a dataset detail page.
8. Open **Activity** to filter the audit trail or export the demo CSV.
9. Open **Analytics** to view prevented-download trends, storage savings and departmental reuse.

## Project structure

```text
DDAS-demo/
├── index.html
├── dashboard.html
├── repository.html
├── activity.html
├── analytics.html
├── dataset.html
├── css/
│   └── styles.css
├── js/
│   ├── data.js
│   ├── shared.js
│   ├── dashboard.js
│   ├── repository.js
│   ├── activity.js
│   ├── analytics.js
│   └── dataset.js
└── assets/
    └── logo.svg
```

## Notes

- No framework, package install, API key or backend is required.
- Data is mocked in `js/data.js`, so it is easy to replace with real API responses later.
- UI state such as the prevented-download counter uses browser `localStorage` for demo realism.
- The project is intentionally structured so FastAPI/Flask endpoints can replace the mock data later without redesigning the frontend.
