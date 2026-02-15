# System Architecture

## Overview
`chat-explorer` is a desktop application built using the [Wails](https://wails.io/) framework (v2). It combines a Go backend for file handling and data processing with a modern React frontend for the user interface.

## Backend (Go)

The backend is responsible for:
1.  **Application Lifecycle**: Managed by `main.go`, which initializes the Wails application.
2.  **Native Integration**: `app.go` provides methods accessible to the frontend (via Wails bindings) to trigger native file dialogs and load files from the filesystem.
3.  **Data Processing**:
    *   **`models/` Package**: Contains the domain models and business logic.
    *   **Parsing Logic**: `models/parser.go` implements a robust JSON parser designed to ingest conversation exports (e.g., from LLM chat interfaces). It handles complex nested structures and normalizes them into a simplified `ConversationEntry` format for the frontend.

### Key Components
*   **`App` Struct**: The main application controller. Methods exported on this struct are automatically bound to the frontend.
    *   `OpenConversationsFile()`: Opens a native system dialog for the user to select a JSON file.
    *   `LoadConversationsFromPath(path)`: Reads and parses the file at the given path.

## Frontend (TypeScript + React)

The frontend is a Single Page Application (SPA) served by Wails.

### Technology Stack
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **UI Component Library**: Material UI (@mui/material)
*   **Testing**: Vitest + React Testing Library

### Interaction
The frontend communicates with the Go backend asynchronously through the Wails runtime.
*   **`wailsjs/`**: Auto-generated TypeScript bindings for the Go methods (e.g., `OpenConversationsFile`). This ensures type safety between the backend and frontend.

## Data Flow
1.  User clicks "Open File" in the UI.
2.  Frontend calls `App.OpenConversationsFile`.
3.  Backend opens a native OS file dialog.
4.  User selects a `conversations.json` file.
5.  Backend reads the file and delegates parsing to `models.ParseConversationsJSON`.
6.  The parser normalizes the nested JSON data into a flat list of `ConversationEntry` objects.
7.  The list is returned to the frontend and displayed.
