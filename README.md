# Hinode Institute POS

A professional, offline Point of Sale (POS) system for Hinode Institute.
Built with Electron, React, and TypeScript.

## Features
- **Course Selection:** Pre-loaded courses and fees.
- **Billing:** Fast, single-page billing with "Pay & Print".
- **History:** Local transaction history stored safely in a JSON file.
- **Professional UI:** Designed with Hinode Institute's brand colors (#00B140, #FF671F).

## How to Run (Source Code)

1.  **Install Dependencies** (if not done):
    ```bash
    npm install
    ```

2.  **Start Development Mode** (Hot Reload):
    ```bash
    npm run electron:dev
    ```

## How to Build (EXE)

To create a standalone `.exe` file:

```bash
npm run build
```

*Note: If building fails due to permission errors (winCodeSign), try running your terminal as Administrator.*

## Data Location

Transaction history is stored in your user data folder:
`%APPDATA%/hinode-institute-pos/transactions.json`
"# hinode_Institute" 
"# hinode_Institute" 
