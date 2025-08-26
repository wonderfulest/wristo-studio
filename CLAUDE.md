# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Vue 3 + Vite** web application for designing custom watch faces for Garmin devices. It's built with **Element Plus** UI components, **Fabric.js** for canvas manipulation, and **Pinia** for state management.

## Key Architecture

### Core Components
- **Canvas-based editor** using Fabric.js for drag-and-drop watch face design
- **Device simulator** with 100+ Garmin device templates (fenix, vivoactive, edge, etc.)
- **Element system** with modular components (hands, dials, text, charts, indicators)
- **Font management** with 50+ custom fonts and Google Fonts integration
- **Authentication** via SSO with JWT tokens

### File Structure
- `/src/components/` - Vue components organized by feature
- `/src/stores/` - Pinia stores for state management
- `/src/stores/elements/` - Element-specific stores (hands, dials, text, etc.)
- `/src/utils/elementCodec/` - Serialization/deserialization for watch face elements
- `/src/assets/devices/` - Device templates with JSON configurations
- `/src/api/` - API client modules for backend integration

## Development Commands

```bash
# Development
npm run dev          # Start development server on port 3004
npm run dev:prod     # Development with production mode

# Building
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build

# Code Quality
npm run format       # Format with Prettier
```

## Environment Setup

The app uses two main API endpoints:
- `/api` → Garmin face API (localhost:1338 or https://api.garminface.com)
- `/wristo-api` → Wristo API (localhost:8088 or https://api.wristo.io)

Required environment variables:
- `VITE_SSO_LOGIN_URL` - SSO login endpoint
- `VITE_SSO_REDIRECT_URI` - Auth callback URL

## Element System Architecture

### Adding New Elements
Follow the 4-step process detailed in README.md:

1. **Configuration**: Add to `src/config/elements.js`
2. **Codec**: Create encoder/decoder in `src/utils/elementCodec/`
3. **Store**: Create Pinia store in `src/stores/elements/`
4. **Settings**: Create settings component in `src/components/settings/`

### Element Categories
- **Dials**: tick marks, roman numerals
- **Hands**: hour, minute, second hands
- **Status**: battery, move bar indicators
- **Time**: time display, date display
- **Data**: icons, labels, metrics
- **Indicators**: bluetooth, alarms, notifications
- **Shapes**: rectangles, circles
- **Goals**: progress bars, progress arcs
- **Charts**: bar charts, line charts

## Key Technologies

- **Vue 3** with Composition API
- **Fabric.js** 6.5.3 for canvas manipulation
- **Element Plus** 2.9.0 for UI components
- **Pinia** 3.0.3 with persisted state
- **OpenType.js** for font parsing
- **Axios** for API requests
- **TypeScript** for type safety

## Device Support

The app supports 100+ Garmin devices with device-specific:
- Screen resolutions and aspect ratios
- Simulator configurations in JSON format
- Device preview images

Device families: fenix, vivoactive, venu, edge, descent, instinct, fr (Forerunner), d2, marq, epix, enduro, approach, etc.

## Build Configuration

- **Vite** with Vue plugin and custom path aliases (@ → src/)
- **Terser** for production minification
- **Proxy configuration** for API endpoints
- **History mode routing** support
- **Font asset optimization** with woff2 support