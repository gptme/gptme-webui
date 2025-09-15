# gptme-webui Project

## Overview
This is a React-based web UI for gptme, providing a fancy interface for chatting with LLMs. It's built with Vite, TypeScript, React, shadcn-ui, and Tailwind CSS. The project was successfully imported from GitHub and configured for the Replit environment.

## Current Status
- ✅ Dependencies installed successfully
- ✅ Development server configured for Replit (port 5000, host 0.0.0.0, allowedHosts: true)
- ✅ Frontend workflow running successfully
- ✅ All TypeScript/LSP errors resolved

## Architecture
- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn-ui + Radix UI components
- **Styling**: Tailwind CSS
- **State Management**: @legendapp/state + @tanstack/react-query
- **Routing**: React Router v6
- **Testing**: Jest + Playwright for E2E

## Project Structure
- `src/` - Main source directory
  - `components/` - React components including UI library components
  - `pages/` - Main application pages
  - `contexts/` - React contexts for state management
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions
  - `types/` - TypeScript type definitions
- `public/` - Static assets
- `e2e/` - End-to-end tests

## Development
- Development server runs on port 5000 with host 0.0.0.0
- Configured to work with Replit's proxy environment
- Uses hot module replacement for fast development

## Dependencies
- Main dependencies include React 18, various Radix UI components, TanStack Query, React Router
- Development dependencies include TypeScript, ESLint, Prettier, Jest, Playwright

## Recent Changes
- 2025-09-15: Initial import and Replit environment setup
  - Updated vite.config.ts to use port 5000 and allow all hosts for Replit proxy
  - Configured workflow for frontend development server
  - Installed all npm dependencies