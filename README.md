# PNPtv Live

This application powers the PNPtv Live demo platform. It uses Node.js and Express to serve a simple API and Webex integrations.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the required values.

3. Start the server:

```bash
npm start
```

## Running tests

```bash
npm test
```

## Environment variables

See `.env.example` for all supported variables. At minimum `ADMIN_PASSWORD` should be provided in production.

## Continuous Integration

A GitHub Actions workflow runs the test suite on every push.
