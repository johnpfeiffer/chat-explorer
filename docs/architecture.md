# System Architecture

## Overview
`chat-explorer` is a desktop application built using the [Wails](https://wails.io/) framework (v2). It combines a Go backend for file handling and data processing with a modern React frontend for the user interface.

## Authoritative Export Contract
The parser contract is anchored to the real export sample provided by the user (conversation UUID `79b16c43-8e2e-4cee-8015-d652d0ad6423`).

### Conversation-level fields observed
* `uuid` (used as `ConversationID`)
* `name` (used as `ConversationName`)
* `chat_messages` (iterated)
* `summary`, `created_at`, `updated_at`, `account` (currently ignored by parser)

### Message-level fields observed
* `sender` (used as `Speaker`, fallback to `"unknown"` when empty)
* `text` and `content` (used to compute `Message`; `text` takes precedence)
* `created_at` (used as `MessageTimestamp`)
* `updated_at`, `attachments`, `files`, `uuid` (currently ignored by parser)

### Output contract sent to frontend
* `conversationId`
* `conversationName`
* `speaker`
* `message`
* `messageTimestamp`

## System Design

```mermaid
graph TD
    subgraph "Frontend (React)"
        AppC[App.tsx]
        Bindings[Wails JS Bindings]
        Logic[models/conversations.ts]
        CompList[components/ConversationList.tsx]
        Utils[utils/timestamps.ts]
    end

    subgraph "Backend (Go)"
        Main[main.go]
        AppGo[app.go]
        Parser[models/parser.go]
        Runtime[Wails Runtime]
    end

    AppC -->|Calls| Bindings
    AppC -->|Uses| Logic
    AppC -->|Renders| CompList
    CompList -->|Uses| Utils
    Bindings <-->|IPC| Runtime
    Main -->|Initializes| AppGo
    AppGo -->|Uses| Runtime
    AppGo -->|Uses| Parser
```

## Backend (Go)

The backend is responsible for:
1.  **Application Lifecycle**: Managed by `main.go`, which initializes the Wails application with assets and bindings.
2.  **Native Integration**: `app.go` provides methods accessible to the frontend (via Wails bindings) to trigger native file dialogs and load files from the filesystem.
3.  **Data Processing**:
    *   **`models/` Package**: Contains the domain models and business logic.
    *   **Parsing Logic**: `models/parser.go` ingests the known export shape and normalizes it into `ConversationEntry` rows for the frontend.

### Key Components
*   **`App` Struct**: The main application controller. Methods exported on this struct are automatically bound to the frontend.
    *   `OpenConversationsFile()`: Opens a native system dialog for the user to select a JSON file.
    *   `LoadConversationsFromPath(path)`: Reads and parses the file at the given path.
*   **`ConversationEntry` Struct**: The normalized data structure sent to the frontend.
    *   `ConversationID`: Unique identifier.
    *   `ConversationName`: Title of the conversation.
    *   `Speaker`: Who sent the message (e.g., "human", "assistant").
    *   `Message`: The content of the message.
    *   `MessageTimestamp`: Timestamp from `chat_messages[].created_at`.

## Frontend (TypeScript + React)

The frontend is a Single Page Application (SPA) served by Wails.

### Technology Stack
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **UI Component Library**: Material UI (@mui/material)
*   **Testing**: Vitest + React Testing Library

### Key Components
*   **`App.tsx`**: Main component that manages state, orchestrates data loading, groups conversations, and renders the UI.
*   **`components/ConversationList.tsx`**: Displays the list of conversation threads, handling expansion state and message formatting.
*   **`models/conversations.ts`**: Contains the logic to group flat `ConversationEntry` items into `ConversationThread` objects.
    *   **Grouping Strategy**: Prioritizes `ConversationID`. If missing, falls back to `ConversationName`.
    *   **Name Handling**: Defaults to "Untitled conversation" if the name is empty. Updates the thread name from "Untitled" to a real name if a later entry provides one.
    *   **Message Merging**: Aggregates messages from the same conversation into a single thread.
*   **`utils/timestamps.ts`**: Formats `messageTimestamp` into local timezone display with second precision.

### Interaction
The frontend communicates with the Go backend asynchronously through the Wails runtime.
*   **`wailsjs/`**: Auto-generated TypeScript bindings for the Go methods (e.g., `OpenConversationsFile`). This ensures type safety between the backend and frontend.

## User Journey (Data Flow)

The following sequence diagram illustrates the flow when a user loads a conversation file.

```mermaid
sequenceDiagram
    actor User
    participant UI as App.tsx
    participant List as ConversationList
    participant Backend as Backend (App)
    participant Runtime as Wails Runtime
    participant Parser as Parser (Models)
    participant FS as File System

    User->>UI: Click "Open conversations.json"
    UI->>Backend: OpenConversationsFile()
    Backend->>Runtime: OpenFileDialog()
    Runtime-->>User: Show File Dialog
    User-->>Runtime: Select "conversations.json"
    Runtime-->>Backend: Return file path
    
    alt Path is empty
        Backend-->>UI: Return empty list
    else Path is valid
        Backend->>FS: os.Open(path)
        FS-->>Backend: File Handle
        Backend->>Parser: ParseConversationsJSON(file)
        loop For each conversation
            Parser->>Parser: Iterate & Flatten
        end
        Parser-->>Backend: []ConversationEntry
        Backend-->>UI: []ConversationEntry
    end
    
    UI->>UI: Group Entries (by ID/Name)
    UI->>List: Render(conversations)
    List->>List: Format Message Timestamps
    List-->>User: Display Conversation Threads
```
