# Todo Task

A modern, clean To-Do List web app with an orange + white theme. Built as a frontend-only project with local data storage - NO backend, NO login, NO server database.

![Todo Task](./Logo.avif)

## Features

### Core Features
- ✅ **CRUD Tasks**: Add, edit, and delete tasks
- ✅ **Complete/Incomplete Toggle**: Mark tasks as done with visual feedback
- ✅ **Task Fields**: Title, notes, project, tags, priority (Low/Med/High), due date
- ✅ **Subtasks**: Create checklists inside tasks
- ✅ **Attachments**: Add URL links to tasks
- ✅ **Recurring Tasks**: Daily, weekly, or monthly recurrence

### Organization
- 📁 **Projects**: Organize tasks by project with color coding
- 🏷️ **Tags**: Add multiple tags to tasks for flexible categorization
- 🔴 **Priority Levels**: Low, Medium, High with visual indicators
- 📅 **Due Dates**: Set deadlines with overdue highlighting

### Filtering & Sorting
- 🔍 **Search**: Find tasks by title or notes
- 📊 **Filters**: By status, project, tag, priority, due date
- 📋 **Quick Filters**: Today, This Week, Overdue, Completed
- ↕️ **Sort Options**: Due date, priority, newest, manual order
- 🖱️ **Drag & Drop**: Reorder tasks manually

### Data Management
- 💾 **Local Storage**: Data persists in IndexedDB (survives browser refresh)
- 📤 **Export**: Download all data as JSON backup
- 📥 **Import**: Restore from JSON backup
- 🗑️ **Clear Data**: Option to delete all data

## Tech Stack

- **Vite + React + TypeScript** - Fast, modern development
- **Tailwind CSS** - Clean orange/white UI
- **IndexedDB (Dexie.js)** - Reliable local storage
- **Zustand** - Lightweight state management
- **date-fns** - Date handling & overdue logic
- **dnd-kit** - Drag & drop reordering
- **react-hot-toast** - Toast notifications

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx       # Top navigation bar
│   ├── Sidebar.tsx      # Left sidebar with projects/tags
│   ├── TaskCard.tsx     # Individual task display
│   ├── TaskList.tsx     # Task list with drag & drop
│   ├── TaskModal.tsx    # Add/Edit task form
│   ├── FilterBar.tsx    # Filter controls
│   └── SettingsModal.tsx # Export/Import settings
├── store/               # Zustand state stores
│   ├── taskStore.ts     # Task state management
│   ├── projectStore.ts  # Project state management
│   ├── tagStore.ts      # Tag state management
│   ├── filterStore.ts   # Filter state management
│   └── uiStore.ts       # UI state (modals, sidebar)
├── db/                  # Database layer
│   └── index.ts         # Dexie.js IndexedDB setup
├── hooks/               # Custom React hooks
│   └── useFilteredTasks.ts # Filtered & sorted tasks
├── types/               # TypeScript types
│   └── index.ts         # Task, Project, Tag types
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles & Tailwind
```

## How Local Storage Works

This app uses **IndexedDB** via Dexie.js for persistent storage:

1. **IndexedDB** is a low-level browser database that stores structured data
2. **Dexie.js** provides a friendly wrapper with promises and reactive queries
3. Data is stored in three tables: `tasks`, `projects`, `tags`
4. All data stays in your browser - nothing is sent to any server
5. Data persists across browser sessions and page refreshes

### Backup Your Data

To prevent data loss:
1. Go to Settings (gear icon)
2. Click "Export Data" to download a JSON backup
3. Store the backup file safely
4. Use "Import Data" to restore from a backup

## Theme Colors

- **Primary Orange**: `#FF7A00`
- **Background**: White (`#FFFFFF`) / Light Gray (`#F9FAFB`)
- **Borders**: Light Gray (`#E5E7EB`)
- **Text**: Dark Gray (`#111827`) / Medium Gray (`#6B7280`)

## License

MIT License - feel free to use this for personal or commercial projects.
