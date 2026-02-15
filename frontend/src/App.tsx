import React, {useMemo, useState} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
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
import {groupConversationEntries} from './models/conversations';

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

    const conversations = useMemo(
        () => groupConversationEntries(entries),
        [entries]
    );

    const statusLabel = entries.length === 0
        ? 'No messages loaded.'
        : `${entries.length} messages loaded across ${conversations.length} conversations.`;

    const getSpeakerChipColor = (speaker: string): 'default' | 'success' | 'warning' => {
        const normalizedSpeaker = speaker.toLowerCase();
        if (normalizedSpeaker === 'assistant') {
            return 'success';
        }
        if (normalizedSpeaker === 'human') {
            return 'warning';
        }
        return 'default';
    };

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
                                    Load an exported Claude <code>conversations.json</code> file and review speaker/message
                                    history.
                                </Typography>
                            </Box>

                            <Stack direction={{xs: 'column', md: 'row'}} spacing={1} useFlexGap alignItems={{md: 'center'}}>
                                <Button variant="contained" onClick={loadConversations} disabled={isLoading}>
                                    {isLoading ? 'Loading...' : 'Open conversations.json'}
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
                        {entries.length === 0 && !error && (
                            <Typography color="text.secondary">Choose a file to start exploring conversations.</Typography>
                        )}

                        <Stack spacing={1.5}>
                            {conversations.map((conversation, conversationIndex) => (
                                <Accordion
                                    key={`${conversation.conversationId}-${conversationIndex}`}
                                    variant="outlined"
                                    disableGutters
                                    TransitionProps={{unmountOnExit: true}}
                                    sx={{backgroundColor: '#fcfcf9'}}
                                >
                                    <AccordionSummary
                                        aria-controls={`conversation-panel-${conversationIndex}`}
                                        id={`conversation-header-${conversationIndex}`}
                                        expandIcon={<Typography variant="caption">Open</Typography>}
                                    >
                                        <Stack
                                            direction={{xs: 'column', sm: 'row'}}
                                            spacing={1}
                                            useFlexGap
                                            sx={{width: '100%', alignItems: {sm: 'center'}}}
                                        >
                                            <Typography
                                                data-testid="conversation-title"
                                                variant="subtitle2"
                                                sx={{fontWeight: 700}}
                                            >
                                                {conversation.conversationName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {conversation.messages.length} {conversation.messages.length === 1 ? 'message' : 'messages'}
                                            </Typography>
                                            {conversation.conversationId && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {conversation.conversationId}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={1.5} role="list" aria-label={`${conversation.conversationName} messages`}>
                                            {conversation.messages.map((entry, messageIndex) => (
                                                <Paper
                                                    variant="outlined"
                                                    role="listitem"
                                                    key={`${entry.conversationId}-${entry.speaker}-${messageIndex}`}
                                                    sx={{p: 1.5, backgroundColor: '#ffffff'}}
                                                >
                                                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} useFlexGap sx={{mb: 1}}>
                                                        <Chip
                                                            label={entry.speaker}
                                                            size="small"
                                                            variant="outlined"
                                                            color={getSpeakerChipColor(entry.speaker)}
                                                            sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}
                                                        />
                                                    </Stack>
                                                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>
                                                        {entry.message}
                                                    </Typography>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Paper>
                </Container>
            </Box>
        </ThemeProvider>
    );
}

export default App;
