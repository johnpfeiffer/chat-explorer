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
		{
			name: "parses chatgpt mapping format using current node branch",
			input: `[
				{
					"title": "ChatGPT One",
					"create_time": 1700000000,
					"update_time": 1700000010,
					"conversation_id": "cgpt-1",
					"current_node": "a3",
					"mapping": {
						"root": {
							"id": "root",
							"message": null,
							"parent": null,
							"children": ["a1", "b1"]
						},
						"a1": {
							"id": "a1",
							"parent": "root",
							"children": ["a2"],
							"message": {
								"author": {"role": "user"},
								"create_time": 1700000001,
								"content": {"content_type": "text", "parts": ["Hello from user"]},
								"metadata": {}
							}
						},
						"a2": {
							"id": "a2",
							"parent": "a1",
							"children": ["a3"],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000002,
								"content": {"content_type": "text", "parts": ["Hello from assistant"]},
								"metadata": {},
								"channel": "final"
							}
						},
						"a3": {
							"id": "a3",
							"parent": "a2",
							"children": [],
							"message": {
								"author": {"role": "tool", "name": "web.run"},
								"create_time": 1700000003,
								"content": {"content_type": "text", "parts": ["tool output"]},
								"metadata": {}
							}
						},
						"b1": {
							"id": "b1",
							"parent": "root",
							"children": [],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000004,
								"content": {"content_type": "text", "parts": ["alternate response"]},
								"metadata": {}
							}
						}
					}
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-1", "ChatGPT One", "user", "Hello from user", "2023-11-14T22:13:21Z"),
				entry("cgpt-1", "ChatGPT One", "assistant", "Hello from assistant", "2023-11-14T22:13:22Z"),
				entry("cgpt-1", "ChatGPT One", "tool", "tool output", "2023-11-14T22:13:23Z"),
			},
		},
		{
			name: "filters hidden messages and falls back timestamp for chatgpt null create_time",
			input: `[
				{
					"title": "ChatGPT Hidden",
					"create_time": 1700000100,
					"update_time": 1700000110,
					"conversation_id": "cgpt-2",
					"current_node": "u1",
					"mapping": {
						"root": {
							"id": "root",
							"message": null,
							"parent": null,
							"children": ["s1"]
						},
						"s1": {
							"id": "s1",
							"parent": "root",
							"children": ["s2"],
							"message": {
								"author": {"role": "system"},
								"create_time": null,
								"content": {"content_type": "text", "parts": ["hidden system"]},
								"metadata": {"is_visually_hidden_from_conversation": true}
							}
						},
						"s2": {
							"id": "s2",
							"parent": "s1",
							"children": ["u1"],
							"message": {
								"author": {"role": "system"},
								"create_time": null,
								"content": {"content_type": "text", "parts": ["visible context"]},
								"metadata": {}
							}
						},
						"u1": {
							"id": "u1",
							"parent": "s2",
							"children": ["a1"],
							"message": {
								"author": {"role": "user"},
								"create_time": null,
								"content": {"content_type": "text", "parts": ["question text"]},
								"metadata": {}
							}
						},
						"a1": {
							"id": "a1",
							"parent": "u1",
							"children": [],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000115,
								"content": {"content_type": "text", "parts": ["   "]},
								"metadata": {}
							}
						}
					}
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-2", "ChatGPT Hidden", "system", "visible context", "2023-11-14T22:15:00Z"),
				entry("cgpt-2", "ChatGPT Hidden", "user", "question text", "2023-11-14T22:15:00Z"),
			},
		},
		{
			name: "parses multiple chatgpt conversations in one export array",
			input: `[
				{
					"title": "Thread One",
					"create_time": 1700000200,
					"conversation_id": "cgpt-3",
					"current_node": "one-user",
					"mapping": {
						"one-root": {"id": "one-root", "message": null, "parent": null, "children": ["one-user"]},
						"one-user": {
							"id": "one-user",
							"parent": "one-root",
							"children": [],
							"message": {
								"author": {"role": "user"},
								"create_time": 1700000201,
								"content": {"content_type": "text", "parts": ["thread one message"]},
								"metadata": {}
							}
						}
					}
				},
				{
					"title": "Thread Two",
					"create_time": 1700000300,
					"conversation_id": "cgpt-4",
					"current_node": "two-assistant",
					"mapping": {
						"two-root": {"id": "two-root", "message": null, "parent": null, "children": ["two-assistant"]},
						"two-assistant": {
							"id": "two-assistant",
							"parent": "two-root",
							"children": [],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000301,
								"content": {"content_type": "text", "parts": ["thread two message"]},
								"metadata": {}
							}
						}
					}
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-3", "Thread One", "user", "thread one message", "2023-11-14T22:16:41Z"),
				entry("cgpt-4", "Thread Two", "assistant", "thread two message", "2023-11-14T22:18:21Z"),
			},
		},
		{
			name: "converts fractional unix timestamps in chatgpt messages",
			input: `[
				{
					"title": "Fractional Time",
					"create_time": 1700000600,
					"conversation_id": "cgpt-5",
					"current_node": "msg1",
					"mapping": {
						"root": {"id": "root", "message": null, "parent": null, "children": ["msg1"]},
						"msg1": {
							"id": "msg1",
							"parent": "root",
							"children": [],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000600.25,
								"content": {"content_type": "text", "parts": ["fractional timestamp"]},
								"metadata": {}
							}
						}
					}
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-5", "Fractional Time", "assistant", "fractional timestamp", "2023-11-14T22:23:20.25Z"),
			},
		},
		{
			name: "falls back to chatgpt content text when parts are absent",
			input: `[
					{
					"title": "Content Text Fallback",
					"create_time": 1700000700,
					"conversation_id": "cgpt-6",
					"current_node": "msg1",
					"mapping": {
						"root": {"id": "root", "message": null, "parent": null, "children": ["msg1"]},
						"msg1": {
							"id": "msg1",
							"parent": "root",
							"children": [],
							"message": {
								"author": {"role": "assistant"},
								"create_time": 1700000701,
								"content": {"content_type": "code", "text": "{\"tool\":\"web.run\"}"},
								"metadata": {}
							}
						}
					}
				}
			]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-6", "Content Text Fallback", "assistant", "{\"tool\":\"web.run\"}", "2023-11-14T22:25:01Z"),
			},
		},
		{
			name: "preserves utf8 chatgpt conversation title and parts message text",
			input: `[
					{
						"title": "Café 日本語 🎷",
						"create_time": 1700000800,
						"conversation_id": "cgpt-utf8-1",
						"current_node": "msg1",
						"mapping": {
							"root": {"id": "root", "message": null, "parent": null, "children": ["msg1"]},
							"msg1": {
								"id": "msg1",
								"parent": "root",
								"children": [],
								"message": {
									"author": {"role": "assistant"},
									"create_time": 1700000801,
									"content": {"content_type": "text", "parts": ["¡Hola! Привет こんにちは 👋"]},
									"metadata": {}
								}
							}
						}
					}
				]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-utf8-1", "Café 日本語 🎷", "assistant", "¡Hola! Привет こんにちは 👋", "2023-11-14T22:26:41Z"),
			},
		},
		{
			name: "preserves utf8 chatgpt content text fallback",
			input: `[
					{
						"title": "Fallback UTF-8",
						"create_time": 1700000900,
						"conversation_id": "cgpt-utf8-2",
						"current_node": "msg1",
						"mapping": {
							"root": {"id": "root", "message": null, "parent": null, "children": ["msg1"]},
							"msg1": {
								"id": "msg1",
								"parent": "root",
								"children": [],
								"message": {
									"author": {"role": "assistant"},
									"create_time": 1700000901,
									"content": {"content_type": "code", "text": "🧪 Δοκιμή 東京 — résumé"},
									"metadata": {}
								}
							}
						}
					}
				]`,
			wantEntries: []ConversationEntry{
				entry("cgpt-utf8-2", "Fallback UTF-8", "assistant", "🧪 Δοκιμή 東京 — résumé", "2023-11-14T22:28:21Z"),
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
