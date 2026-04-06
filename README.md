# 💰 FinTrack — Financial Dashboard

<div align="center">

![FinTrack Banner](https://img.shields.io/badge/FinTrack-Financial%20Dashboard-c8a96e?style=for-the-badge&logo=react&logoColor=white)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://your-app.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Recharts](https://img.shields.io/badge/Recharts-2.x-22b5bf?style=for-the-badge)](https://recharts.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A sleek, fully responsive financial dashboard built with React. Track income and expenses, visualise spending patterns, manage transactions, and export your data — all in a single-page app with a polished dark/light theme.

[**View Live Demo →**](https://zorvyn-frontend-dev.vercel.app/)

</div>

---

## ✨ Features

### 📊 Dashboard Overview
- **Animated summary cards** — Net Balance, Total Income, Total Expenses with count-up number animations triggered on scroll
- **Balance Trend** — area chart showing cumulative balance over time
- **Spending Breakdown** — donut chart with a custom non-overlapping legend
- **Monthly Income vs Expenses** — grouped bar chart for side-by-side monthly comparison

### 💳 Transactions
- Full transaction list with date, category, type, and amount
- **Search** by note or category
- **Advanced filters** — Type, Category, Month, Min/Max Amount
- **Sort** by date or amount (asc/desc toggle)
- **Group by** Month, Category, or Type — with per-group subtotals
- Mobile-optimised card layout replaces the table on small screens

### 📈 Insights
- Highest spending category
- Latest month savings rate
- Expense delta vs previous month
- Average monthly income
- Category spending ranked bar chart
- Monthly net flow chart (green/red per month)

### 🔐 Role-Based UI
| Role | Permissions |
|------|------------|
| **Admin** | View, add, edit, and delete transactions |
| **Viewer** | Read-only — all edit controls hidden |

Switch roles via the dropdown in the header (or the bottom nav tab on mobile). Role is persisted across sessions.

### 🌙 Dark / Light Mode
- Full dual-theme via CSS custom properties
- Instant theme switching with smooth `0.35s` transitions
- Native `<select>` dropdowns correctly themed using `color-scheme`
- Preference saved to `localStorage`

### 💾 Data Persistence
- All transactions automatically saved to `localStorage`
- Survives page refresh and browser restarts
- Seeded with 25 realistic sample transactions on first load

### 🌐 Mock API Integration
- Simulates a real REST backend with async delays (800ms load, 380ms save)
- ~4% random failure rate to demonstrate error handling
- **Optimistic updates** — UI responds instantly; a pulsing sync dot confirms save
- Live API status indicator: *Loading / Saving / All synced / Sync error*
- Toast notifications for every action outcome

### 📤 Export
- Export the **currently filtered** transaction list as **CSV** or **JSON**
- Badge on the export button shows the row count being exported

### 📱 Fully Responsive
- Desktop: sidebar navigation + full data table
- Tablet: stacked charts, two-column grids
- Mobile: sticky top header, bottom tab bar, card-based transaction list, thumb-friendly action buttons

### 🎞️ Animations & Transitions
- Staggered entrance animations on all cards, charts, and rows
- Page transition fade on navigation
- Spring-physics card hover (lift + shimmer sweep)
- Modal bounce-in with scale spring
- Animated number count-up via `IntersectionObserver`
- Toast slide-in from the right
- Theme toggle thumb slides with cubic-bezier easing

---

## 🖥️ Screenshots

| Dark Mode | Light Mode |
|-----------|------------|
| ![Dark](https://github.com/user-attachments/assets/178960c1-987b-4eaf-968d-2d91b7e31c1e) | ![Light](https://github.com/user-attachments/assets/20cc2caf-98c4-4da1-9c73-7d57b3c2ba58) |

| Mobile View | Transactions |
|-------------|-------------|
| ![Mobile](https://github.com/user-attachments/assets/1e45ffde-9bc5-4ccd-bf43-c250442cdafc) | ![Transactions](https://github.com/user-attachments/assets/8a05e125-3028-47c6-9bf2-ccb18d8d3e05)
 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js `18+`
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/aru-jain/zorvyn-frontend-dev.git
cd finance

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The output is in the `dist/` folder, ready to deploy.

---

## 🌍 Deployment on Vercel

This project is deployed on **Vercel**. Every push to `main` triggers an automatic redeploy.

### Deploy your own fork

1. Fork this repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your forked repo
4. Leave all settings as default (Vercel auto-detects Vite/React)
5. Click **Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aru-jain/zorvyn-frontend-dev.git)

### Environment Variables

No environment variables are required. The app runs entirely on the client side with `localStorage` for persistence.

---

## 🗂️ Project Structure

```
fintrack-dashboard/
├── src/
│   ├── App.jsx               # Root component + AppProvider context
│   ├── FinancialDashboard.jsx # Entire application (single-file architecture)
│   └── main.jsx              # React entry point
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework — hooks, context, memoization |
| **Recharts** | Charts — AreaChart, BarChart, PieChart |
| **CSS Custom Properties** | Theming — dark/light mode via `:root` variables |
| **localStorage API** | Client-side data persistence |
| **IntersectionObserver API** | Scroll-triggered count-up animations |
| **Vite** | Build tool and dev server |
| **Vercel** | Hosting and CI/CD |

No external CSS framework. All styles are written in vanilla CSS-in-JS injected via a `<style>` tag, dynamically regenerated on theme change.

---

## 🏗️ Architecture Notes

### State Management
All application state lives in a single **React Context** (`AppContext`) with `useReducer`-style `useCallback` actions. No Redux or Zustand — the scope doesn't require it.

Key state slices:
- `transactions` — the source of truth, persisted to `localStorage`
- `filteredTransactions` — derived via `useMemo`, recomputed only when filters or transactions change
- `groupedTransactions` — derived from `filteredTransactions`, `null` when groupBy is `"none"`
- `theme`, `role` — persisted to `localStorage` on every change

### Mock API
`mockApi` wraps `localStorage` reads/writes behind simulated network delays and occasional failures, demonstrating a real-world optimistic update pattern:

```
User action → Optimistic UI update → API call → Confirm / Rollback
```

### Theming
`makeStyles(theme)` is a function that returns the full CSS string for the current theme. It's called inside a `useEffect` that watches `theme`, injecting the result into a `<style id="ft-styles">` tag. This means a single theme toggle updates every CSS custom property across the entire app instantly.

---

## 📋 Transaction Categories

| Icon | Category | Icon | Category |
|------|----------|------|----------|
| 🍜 | Food | 💼 | Salary |
| 🏠 | Housing | 💻 | Freelance |
| 🚗 | Transport | 📈 | Investment |
| 💊 | Health | 🎬 | Entertainment |
| 🛍️ | Shopping | | |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     new feature
fix:      bug fix
style:    CSS / visual changes
refactor: code restructure without behaviour change
docs:     documentation updates
chore:    build / config changes
```

---

## 🐛 Known Issues & Roadmap

- [ ] Add real backend / database integration (Supabase / Firebase)
- [ ] Add budget goals and progress tracking
- [ ] Recurring transaction support
- [ ] PDF report export
- [ ] Multi-currency support
- [ ] Unit and integration tests (Vitest + Testing Library)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Recharts](https://recharts.org) — composable charting library for React
- [DM Sans + DM Serif Display](https://fonts.google.com) — typography by Google Fonts
- [Vercel](https://vercel.com) — zero-config deployment platform

---

<div align="center">

Made with ❤️ and React

⭐ Star this repo if you found it useful!

</div>
