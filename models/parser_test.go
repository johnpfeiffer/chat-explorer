package models

import (
	"strings"
	"testing"
)

func TestParseConversationsJSON(t *testing.T) {
	goldenConversationsJSON := loadGoldenConversationsJSON(t)

	tests := []struct {
		name            string
		input           string
		wantEntries     []ConversationEntry
		wantErrContains string
	}{
		{
			name:        "parses the shared golden export fixture",
			input:       goldenConversationsJSON,
			wantEntries: expectedGoldenEntries(),
		},
		{
			name:            "returns error for invalid json",
			input:           "{",
			wantErrContains: "decode conversations json",
		},
		{
			name: "prioritizes text field over content",
			input: `[
				{
					"uuid": "precedence",
					"name": "Precedence",
					"chat_messages": [
						{
							"sender": "bot",
							"text": "Top level text",
							"content": [ { "text": "Ignored content" } ]
						}
					]
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("precedence", "Precedence", "bot", "Top level text", ""),
			},
		},
		{
			name: "falls back to unknown speaker and skips empty messages",
			input: `[
				{
					"uuid": "edge",
					"name": "Edge Cases",
					"chat_messages": [
						{
							"sender": "",
							"text": "Who sent this?",
							"created_at": "2026-01-01T00:00:00Z"
						},
						{
							"sender": "human",
							"text": "   "
						},
						{
							"sender": "assistant",
							"content": [{ "text": "   " }]
						}
					]
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("edge", "Edge Cases", "unknown", "Who sent this?", "2026-01-01T00:00:00Z"),
			},
		},
		{
			name: "extracts timestamps from created_at field",
			input: `[
				{
					"uuid": "with-timestamps",
					"name": "Timeline",
					"chat_messages": [
						{
							"sender": "human",
							"text": "Question",
							"created_at": "2026-01-02T10:00:00Z"
						},
						{
							"sender": "assistant",
							"text": "Answer",
							"created_at": "2026-01-02T10:00:42Z"
						}
					]
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("with-timestamps", "Timeline", "human", "Question", "2026-01-02T10:00:00Z"),
				entry("with-timestamps", "Timeline", "assistant", "Answer", "2026-01-02T10:00:42Z"),
			},
		},
		{
			name: "handles null chat_messages while parsing valid conversations",
			input: `[
				{
					"uuid": "null-messages",
					"name": "Null Messages",
					"chat_messages": null
				},
				{
					"uuid": "valid-conv",
					"name": "Valid",
					"chat_messages": [
						{ "sender": "me", "text": "Hello" }
					]
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("valid-conv", "Valid", "me", "Hello", ""),
			},
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			entries, err := ParseConversationsJSON(strings.NewReader(testCase.input))

			if testCase.wantErrContains != "" {
				assertErrorContains(t, err, testCase.wantErrContains)
				return
			}

			if err != nil {
				t.Fatalf("ParseConversationsJSON returned error: %v", err)
			}

			assertConversationEntries(t, entries, testCase.wantEntries)
		})
	}
}
