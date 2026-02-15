import {useState} from 'react';
import './App.css';
import {OpenConversationsFile} from "../wailsjs/go/main/App";
import type {models} from "../wailsjs/go/models";

type ConversationEntry = models.ConversationEntry;

function App() {
    const [entries, setEntries] = useState<ConversationEntry[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState('');

    const loadConversations = async () => {
        setIsLoading(true);
        setError('');

        try {
            const loadedEntries = await OpenConversationsFile();
            setEntries(loadedEntries ?? []);
            setLastLoadedAt(new Date().toLocaleTimeString());
        } catch (loadError: unknown) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to open conversations.json.';
            setEntries([]);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const statusLabel = entries.length === 0 ? 'No messages loaded.' : `${entries.length} messages loaded.`;

    const getSpeakerClassName = (speaker: string): string => {
        const normalizedSpeaker = speaker.toLowerCase();
        if (normalizedSpeaker === 'assistant') {
            return 'speaker assistant';
        }
        if (normalizedSpeaker === 'human') {
            return 'speaker human';
        }
        return 'speaker';
    }

    return (
        <div className="app-shell">
            <header className="header">
                <h1>Chat Explorer</h1>
                <p>Load an exported Claude <code>conversations.json</code> file and review speaker/message history.</p>
                <div className="toolbar">
                    <button className="load-button" onClick={loadConversations} disabled={isLoading}>
                        {isLoading ? 'Loading…' : 'Open conversations.json'}
                    </button>
                    <span className="status-text">{statusLabel}</span>
                    {lastLoadedAt && <span className="status-time">Last load: {lastLoadedAt}</span>}
                </div>
                {error && <p className="error-text">{error}</p>}
            </header>

            <div className="messages-panel" role="list" aria-label="Conversation messages">
                {entries.length === 0 && !error && (
                    <p className="empty-state">Choose a file to start exploring messages.</p>
                )}

                {entries.map((entry, index) => (
                    <article
                        className="message-card"
                        role="listitem"
                        key={`${entry.conversationId}-${entry.speaker}-${index}`}
                    >
                        <div className="message-meta">
                            <span className={getSpeakerClassName(entry.speaker)}>{entry.speaker}</span>
                            <span className="conversation-name">{entry.conversationName || 'Untitled conversation'}</span>
                        </div>
                        <p className="message-text">{entry.message}</p>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default App;
