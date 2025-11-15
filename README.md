# DotDotDone

A productivity app for planning and executing tasks with fuzzy time blocks and Pomodoro technique.

## Features

- **Plan Mode**: Organize your day with fuzzy time zones (Morning/Afternoon/Evening/Night) and fixed time events
- **Do Mode**: Execute tasks with Pomodoro timer integration
- **Multiple Views**: Day, Week, and Month calendar views
- **PWA Support**: Install as a Progressive Web App

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd dotdotdone
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build
```

The production build will be available in the `dist` folder.

### Preview Production Build
```bash
npm run preview
```

## Project Structure
```
dotdotdone/
├── public/
│   ├── favicon.ico
│   ├── manifest.webmanifest
│   └── icons/
│       ├── pwa-192.png
│       └── pwa-512.png
├── src/
│   ├── components/
│   │   ├── Calendar/
│   │   │   ├── DayView.jsx
│   │   │   ├── WeekView.jsx
│   │   │   ├── MonthView.jsx
│   │   │   ├── TimeAxis.jsx
│   │   │   └── FuzzyZones.jsx
│   │   ├── Events/
│   │   │   ├── FuzzyEventCard.jsx
│   │   │   ├── FixedEventCard.jsx
│   │   │   └── EventModal.jsx
│   │   ├── DoMode/
│   │   │   ├── DoScreen.jsx
│   │   │   └── PomodoroModal.jsx
│   │   └── UI/
│   │       ├── Header.jsx
│   │       └── NavTabs.jsx
│   ├── hooks/
│   │   ├── useEvents.js
│   │   ├── useCalendarSync.js
│   │   └── usePomodoro.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Plan.jsx
│   │   └── Do.jsx
│   ├── state/
│   │   ├── eventsStore.js
│   │   └── calendarStore.js
│   ├── utils/
│   │   ├── date.js
│   │   └── gcal.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── vite.config.js
└── package.json
```

## Tech Stack

- **React**: UI library
- **Vite**: Build tool and dev server
- **Zustand**: State management
- **Vite PWA Plugin**: Progressive Web App support

## Roadmap

- [ ] Google Calendar integration
- [ ] Event creation and editing
- [ ] Pomodoro timer implementation
- [ ] Task management and completion tracking
- [ ] Dark mode support
- [ ] Mobile app versions
- [ ] Recurring events support
- [ ] Notifications and reminders

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

GNU GPL