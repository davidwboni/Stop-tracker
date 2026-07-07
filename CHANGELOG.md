# Changelog

All notable changes to Stop Tracker will be documented in this file.

## [3.3.0] - 2025-12-15

### ✨ Added
- **Route Planner Feature** - Complete route planning and optimization system
  - Interactive map visualization using Leaflet and OpenStreetMap
  - Real-time UK address search with Nominatim API (free, no API key)
  - Nearest Neighbor route optimization algorithm
  - Multi-platform navigation integration (Google Maps, Waze, Apple Maps)
  - Numbered gradient markers showing stop sequence
  - Dashed route line connecting all stops
  - Distance and time calculations using Haversine formula
  - Manual route reordering with up/down arrows
  - Copy route to clipboard functionality
  - Auto-zoom to fit all markers on map
  - Clickable markers with popup address details

### 📦 Dependencies
- Added `leaflet@1.9.4` - Interactive mapping library
- Added `react-leaflet@4.2.1` - React components for Leaflet

### 📝 Documentation
- Created `ROUTE_PLANNER_GUIDE.md` - Comprehensive route planner documentation
- Created `SESSION_NOTES.md` - Development progress tracking
- Created `CHANGELOG.md` - Version history

### 🐛 Fixed
- Resolved node_modules corruption issues with clean reinstall
- Fixed port 3001 conflicts with proper process cleanup

---

## [3.0.0] - 2025-12-14

### ✨ Added
- **Invoice System Redesign**
  - Client management with template system
  - Invoice history viewing
  - Email invoice functionality
  - Premium feature gating (£4.99/month)
  - 3-tab interface: Create, History, Verify
  - Auto-fill client details from saved templates
  - Invoice number auto-increment

- **Entries Date Filtering**
  - Simplified date range picker (From/To)
  - Replaced Day/Month/Year toggle buttons
  - Better UX for filtering work entries

- **Logo Design**
  - Professional SVG logo with gradient delivery truck
  - Multiple variants (icon-only and full)
  - Integrated throughout app

### 🔧 Changed
- Updated bottom navigation to 6 tabs
- Improved scrolling behavior on StatsPage and InvoicePage
- Enhanced mobile UX with better touch targets

### 🗑️ Removed
- Removed non-functioning Overview tab in Status section
- Removed `StatsOverview.js` (unused component)
- Removed dollar sign emojis (pending currency localization)

### 📦 Dependencies
- Added `@radix-ui/react-select@^2.2.6`
- Added invoice context for state management

---

## [2.x.x] - Previous Versions

### Core Features
- User authentication with Firebase
- Daily work entry logging
- Performance statistics and charts
- User profile management
- Dark mode support
- Mobile-first responsive design
- PWA capabilities

---

## Upcoming Features

### In Progress
- [ ] Notification system for daily logging reminders
- [ ] Currency localization (remove hardcoded currency symbols)
- [ ] Profile section redesign with achievements

### Planned
- [ ] Route saving functionality (Pro feature)
- [ ] Route history view
- [ ] Multi-day route planning
- [ ] Traffic integration
- [ ] Delivery time windows
- [ ] Vehicle capacity constraints
- [ ] Fleet management (multiple vehicles)

### Long-term Goals
- [ ] Vercel deployment
- [ ] App Store submission
- [ ] Android/iOS native apps with Capacitor

---

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new features (backwards compatible)
- **PATCH** version for bug fixes (backwards compatible)

---

**Current Version**: 3.3.0
**Last Updated**: December 15, 2025
**Status**: Production Ready - Fully Tested
