import React, {useEffect, useState} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Chip,
    Paper,
    Stack,
    Typography
} from '@mui/material';

import type {ConversationThread} from '../models/conversations';
import {formatMessageTimestamp} from '../utils/timestamps';

type ConversationListProps = {
    conversations: ConversationThread[];
};

function getSpeakerChipColor(speaker: string): 'default' | 'success' | 'warning' {
    const normalizedSpeaker = speaker.toLowerCase();
    if (normalizedSpeaker === 'assistant') {
        return 'success';
    }
    if (normalizedSpeaker === 'human') {
        return 'warning';
    }
    return 'default';
}

function buildPanelKey(conversationID: string, conversationName: string, conversationIndex: number): string {
    if (conversationID !== '') {
        return `id:${conversationID}`;
    }
    return `name:${conversationName}:${conversationIndex}`;
}

export function ConversationList({conversations}: ConversationListProps) {
    const [expandedConversationPanels, setExpandedConversationPanels] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedConversationPanels({});
    }, [conversations]);

    const handleConversationToggle = (panelKey: string, isExpanded: boolean): void => {
        setExpandedConversationPanels((previousPanels) => ({
            ...previousPanels,
            [panelKey]: isExpanded
        }));
    };

    return (
        <Stack spacing={1.5}>
            {conversations.map((conversation, conversationIndex) => {
                const panelKey = buildPanelKey(
                    conversation.conversationId,
                    conversation.conversationName,
                    conversationIndex
                );
                const isExpanded = expandedConversationPanels[panelKey] ?? false;

                return (
                    <Accordion
                        key={`${conversation.conversationId}-${conversationIndex}`}
                        expanded={isExpanded}
                        onChange={(_, nextExpanded) => handleConversationToggle(panelKey, nextExpanded)}
                        variant="outlined"
                        disableGutters
                        TransitionProps={{unmountOnExit: true}}
                        sx={{backgroundColor: '#fcfcf9'}}
                    >
                        <AccordionSummary
                            aria-controls={`conversation-panel-${conversationIndex}`}
                            id={`conversation-header-${conversationIndex}`}
                            expandIcon={
                                <Typography variant="caption" sx={{fontWeight: 700}}>
                                    {isExpanded ? '-' : '+'}
                                </Typography>
                            }
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
                                            <Typography variant="caption" color="text.secondary" sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}>
                                                {formatMessageTimestamp(entry.messageTimestamp)}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>
                                            {entry.message}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Stack>
    );
}
