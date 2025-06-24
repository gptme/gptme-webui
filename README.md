# gptme-webui

[![CI](https://github.com/gptme/gptme-webui/actions/workflows/ci.yml/badge.svg)](https://github.com/gptme/gptme-webui/actions/workflows/ci.yml)

A fancy web UI for [gptme][gptme], built with [lovable.dev](https://lovable.dev).

An alternative to the minimal UI currently provided by `gptme`.


## Features

 - Chat with LLMs using gptme, just like in the CLI, but with a fancy UI
 - Generate responses and run tools by connecting to your local gptme-server instance
 - Read bundled conversations without running gptme locally (useful for sharing)

## Usage

You can use the web UI hosted at [chat.gptme.org](https://chat.gptme.org/), or run it locally:

```sh
git clone https://github.com/gptme/gptme-webui
cd gptme-webui
npm i
npm run dev
```

To connect to a local `gptme-server` instance, you need to start one with `gptme-server --cors-origin='https://chat.gptme.org'` (or whatever the origin of your web UI is).

## Tech stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Development

Available commands:

- `npm run dev` - Start development server
- `npm run typecheck` - Run type checking
- `npm run typecheck:watch` - Run type checking in watch mode
- `npm run build` - Build for production (includes type checking)
- `npm run lint` - Run linting and type checking

## Testing

Run the test suite to ensure everything works correctly:

```sh
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:e2e        # Run end-to-end tests with Playwright
```

The project includes unit tests for utilities and components, plus end-to-end tests for user workflows.

## Project info

**URL**: https://run.gptengineer.app/projects/b6f40770-f632-4741-8247-3d47b9beac4e/improve

[gptme]: https://github.com/gptme/gptme
[gptengineer.app]: https://gptengineer.app
