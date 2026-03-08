import React, {useMemo, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Container,
    CssBaseline,
    Paper,
    Stack,
    ThemeProvider,
    Typography,
    createTheme
} from '@mui/material';
import {OpenConversationsFile} from "../wailsjs/go/main/App";
import type {models} from "../wailsjs/go/models";
import {
    defaultConversationSort,
    getConversationSortLabel,
    groupConversationEntries,
    nextConversationSort,
    sortConversations,
    type ConversationSort
} from './models/conversations';
import {ConversationList} from './components/ConversationList';

type ConversationEntry = models.ConversationEntry;

const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#5f6b67'
        },
        background: {
            default: '#f6f5f0',
            paper: '#ffffff'
        }
    },
    shape: {
        borderRadius: 10
    },
    typography: {
        fontFamily: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }
});

function App() {
    const [entries, setEntries] = useState<ConversationEntry[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState('');
    const [conversationSort, setConversationSort] = useState<ConversationSort>(defaultConversationSort);
    const [conversationSetVersion, setConversationSetVersion] = useState(0);

    const loadConversations = async () => {
        setIsLoading(true);
        setError('');

        try {
            const loadedEntries = await OpenConversationsFile();
            setEntries(loadedEntries ?? []);
            setConversationSetVersion((previousVersion) => previousVersion + 1);
            setLastLoadedAt(new Date().toLocaleTimeString());
        } catch (loadError: unknown) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to open conversations export.';
            setEntries([]);
            setConversationSetVersion((previousVersion) => previousVersion + 1);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const groupedConversations = useMemo(
        () => groupConversationEntries(entries),
        [entries]
    );
    const conversations = useMemo(
        () => sortConversations(groupedConversations, conversationSort),
        [groupedConversations, conversationSort]
    );

    const statusLabel = entries.length === 0
        ? 'No messages loaded.'
        : `${entries.length} messages loaded across ${groupedConversations.length} conversations.`;

    return (
        <ThemeProvider theme={lightTheme}>
            <CssBaseline />
            <Box sx={{minHeight: '100%', py: {xs: 2, md: 4}}}>
                <Container maxWidth="lg" sx={{height: '100%', display: 'flex', flexDirection: 'column', gap: 2}}>
                    <Paper variant="outlined" sx={{p: {xs: 2, md: 3}}}>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="h4" component="h1" sx={{fontWeight: 700}}>
                                    Chat Explorer
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Load a Claude or ChatGPT conversations export (<code>.json</code> or <code>.zip</code>) and review
                                    speaker/message history.
                                </Typography>
                            </Box>

                            <Stack direction={{xs: 'column', md: 'row'}} spacing={1} useFlexGap alignItems={{md: 'center'}}>
                                <Button variant="contained" onClick={loadConversations} disabled={isLoading}>
                                    {isLoading ? 'Loading...' : 'Open conversations export'}
                                </Button>
                                <Typography variant="body2" color="text.secondary">
                                    {statusLabel}
                                </Typography>
                                {lastLoadedAt && (
                                    <Typography variant="body2" color="text.secondary">
                                        Last load: {lastLoadedAt}
                                    </Typography>
                                )}
                            </Stack>

                            {error && (
                                <Alert severity="error" variant="outlined">
                                    {error}
                                </Alert>
                            )}
                        </Stack>
                    </Paper>

                    <Paper
                        variant="outlined"
                        role="list"
                        aria-label="Conversations"
                        sx={{p: 2, flex: 1, minHeight: 0, overflowY: 'auto'}}
                    >
                        <Stack direction="row" justifyContent="flex-end" sx={{mb: 1.5}}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setConversationSort((previousSort) => nextConversationSort(previousSort))}
                            >
                                {getConversationSortLabel(conversationSort)}
                            </Button>
                        </Stack>

                        {entries.length === 0 && !error && (
                            <Typography color="text.secondary">Choose a file to start exploring conversations.</Typography>
                        )}

                        <ConversationList conversations={conversations} conversationSetVersion={conversationSetVersion} />
                    </Paper>
                </Container>
            </Box>
        </ThemeProvider>
    );
}

export default App;
