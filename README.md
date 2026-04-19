# Assemble

`assemble.jsx` single-file UI를 Vite 기반 React 앱으로 감싼 실행용 뼈대입니다.

## Requirements

- Node.js 20+
- Anthropic API key

## Setup

1. Install dependencies
   - `npm install`
2. Create env file
   - Copy `.env.example` to `.env`
3. Start both servers
   - `npm run dev:all`

Frontend dev server runs at `http://localhost:5173`.
API proxy runs at `http://localhost:8787`.

## Why the proxy exists

Do not expose Anthropic API keys in the browser. The frontend calls `/api/claude`, and `server.js` forwards the request to Anthropic with secure server-side headers.

## Notes

- `window.storage` was replaced with browser `localStorage`.
- `localStorage` is only appropriate for a single-user browser session. For multi-user production use, move this data into a backend or database.
- `.env` without a real API key still works for UI verification. In that case the app returns a local demo response instead of a real Anthropic answer.
