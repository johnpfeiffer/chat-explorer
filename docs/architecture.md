# System Architecture

## Overview
`chat-explorer` is a desktop application built with [Wails](https://wails.io/) (v2), a Go backend, and a React frontend.  
The current MVP supports loading conversations from either:
- a direct `conversations.json` file, or
- a `.zip` export that contains `conversations.json`.

`memories.json` and `projects.json` are currently ignored by design for v3 MVP.

## Authoritative Export Contract
The parser contract is anchored to the real export sample provided by the user (conversation UUID `79b16c43-8e2e-4cee-8015-d652d0ad6423`).

### Archive-level fields observed
- zip entries may include:
  - `conversations.json` (required for MVP parsing)
  - `memories.json` (ignored for now)
  - `projects.json` (ignored for now)

### Conversation-level fields observed
- `uuid` (used as `ConversationID`)
- `name` (used as `ConversationName`)
- `chat_messages` (iterated)
- `summary`, `created_at`, `updated_at`, `account` (currently ignored by parser)

### Message-level fields observed
- `sender` (used as `Speaker`, fallback to `"unknown"` when empty)
- `text` and `content` (used to compute `Message`; `text` takes precedence)
- `created_at` (used as `MessageTimestamp`)
- `updated_at`, `attachments`, `files`, `uuid` (currently ignored by parser)

### Output contract sent to frontend
- `conversationId`
- `conversationName`
- `speaker`
- `message`
- `messageTimestamp`

## System Design

```mermaid
graph TD
    subgraph "Frontend (React)"
        AppC["App.tsx"]
        Bindings["Wails JS Bindings"]
        Logic["models/conversations.ts"]
        CompList["components/ConversationList.tsx"]
        Utils["utils/timestamps.ts"]
    end

    subgraph "Backend (Go)"
        Main["main.go"]
        AppGo["app.go"]
        Loader["models/loader.go"]
        Parser["models/parser.go"]
        Runtime["Wails Runtime"]
    end

    AppC -->|Calls| Bindings
    AppC -->|Uses| Logic
    AppC -->|Renders| CompList
    CompList -->|Uses| Utils
    Bindings <-->|IPC| Runtime
    Main -->|Initializes| AppGo
    AppGo -->|Uses| Runtime
    AppGo -->|Delegates file parsing| Loader
    Loader -->|Uses| Parser
```

## Backend (Go)

The backend is responsible for:
1. **Application lifecycle**: managed by `main.go`, which initializes the Wails app with assets and bindings.
2. **Native integration**: `app.go` exposes methods to open the native file picker and load selected export paths.
3. **Domain data processing** (`models/`):
   - `models/loader.go`: chooses ingestion strategy (`.zip` vs non-zip), locates `conversations.json` within archives, and delegates JSON parsing.
   - `models/parser.go`: flattens conversation/message structures into normalized `ConversationEntry` rows.

### Key Components
- **`App` struct** (`app.go`):
  - `OpenConversationsFile()`: opens a native dialog filtered for `.json` and `.zip`.
  - `LoadConversationsFromPath(path)`: delegates loading/parsing to `models.LoadConversationEntries(path)`.
- **`LoadConversationEntries(path)`** (`models/loader.go`):
  - Validates input path.
  - Reads a zip archive when extension is `.zip` and extracts `conversations.json`.
  - Otherwise parses the target file as JSON export input.
- **`ConversationEntry` struct** (`models/parser.go`):
  - `ConversationID`
  - `ConversationName`
  - `Speaker`
  - `Message`
  - `MessageTimestamp`

## Frontend (TypeScript + React)

The frontend is an SPA served by Wails.

### Technology Stack
- React 18
- Vite
- TypeScript
- Material UI (`@mui/material`)
- Vitest + React Testing Library

### Key Components
- `App.tsx`: manages loading state and requests export data via `OpenConversationsFile()`.
- `models/conversations.ts`: groups flat entries into conversation threads.
- `components/ConversationList.tsx`: renders expandable threads/messages.
- `utils/timestamps.ts`: formats timestamps into local display format.

## User Journey (Data Flow)

```mermaid
sequenceDiagram
    actor User
    participant UI as "App.tsx"
    participant List as "ConversationList"
    participant Backend as "Backend (App)"
    participant Runtime as "Wails Runtime"
    participant Loader as "Loader (Models)"
    participant Parser as "Parser (Models)"
    participant FS as "File System"

    User->>UI: Click "Open conversations export"
    UI->>Backend: OpenConversationsFile()
    Backend->>Runtime: OpenFileDialog(.json/.zip filters)
    Runtime-->>User: Show file dialog
    User-->>Runtime: Select .json or .zip export
    Runtime-->>Backend: Return file path

    alt Path is empty
        Backend-->>UI: Return empty list
    else Path is valid
        Backend->>Loader: LoadConversationEntries(path)
        alt Path extension is .zip
            Loader->>FS: Open zip archive
            Loader->>Loader: Find conversations.json entry
            Loader->>Parser: ParseConversationsJSON(entry reader)
        else Path extension is not .zip
            Loader->>FS: os.Open(path)
            Loader->>Parser: ParseConversationsJSON(file reader)
        end
        loop For each conversation/message
            Parser->>Parser: Normalize to ConversationEntry
        end
        Parser-->>Loader: []ConversationEntry
        Loader-->>Backend: []ConversationEntry
        Backend-->>UI: []ConversationEntry
    end

    UI->>UI: Group entries (by ID/name)
    UI->>List: Render(conversations)
    List->>List: Format message timestamps
    List-->>User: Display conversation threads
```
