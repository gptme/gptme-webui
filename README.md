# gptme-webui

A fancy web UI for [gptme][gptme], built with [gptengineer.app][gptengineer.app].

An alternative to the minimal UI currently provided by `gptme`.


## Features

 - Chat with LLMs using gptme, just like in the CLI, but with a fancy UI
 - Generate responses and run tools by connecting to your local gptme-server instance
 - Read bundled conversations without running gptme locally (useful for sharing)

## Usage

You can use the web UI hosted at [gptme.gptengineer.run](https://gptme.gptengineer.run/), or run it locally:

```sh
git clone https://github.com/ErikBjare/gptme-webui
cd gptme-webui
npm i
npm run dev
```

To connect to a local `gptme-server` instance, you need to start one with `gptme-server --cors-origin='https://gptme.gptengineer.run'` (or whatever the origin of your web UI is).

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

## Project info

**URL**: https://run.gptengineer.app/projects/b6f40770-f632-4741-8247-3d47b9beac4e/improve

[gptme]: https://github.com/ErikBjare/gptme
[gptengineer.app]: https://gptengineer.app
