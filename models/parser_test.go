package models

import (
	"strings"
	"testing"
)

func TestParseConversationsJSON(t *testing.T) {
	t.Run("flattens conversations into speaker/message entries", func(t *testing.T) {
		input := `[
			{
				"uuid": "conv-1",
				"name": "Setup",
				"chat_messages": [
					{ "sender": "human", "text": "How do I export data?" },
					{ "sender": "assistant", "text": "Open Settings and click Export data." }
				]
			},
			{
				"uuid": "conv-2",
				"name": "Multiline",
				"chat_messages": [
					{
						"sender": "assistant",
						"content": [
							{ "text": "Line one" },
							{ "text": "Line two" }
						]
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 3 {
			t.Fatalf("expected 3 entries, got %d", len(entries))
		}

		first := entries[0]
		if first.ConversationID != "conv-1" {
			t.Fatalf("expected first conversation id conv-1, got %q", first.ConversationID)
		}
		if first.ConversationName != "Setup" {
			t.Fatalf("expected first conversation name Setup, got %q", first.ConversationName)
		}
		if first.Speaker != "human" {
			t.Fatalf("expected first speaker human, got %q", first.Speaker)
		}
		if first.Message != "How do I export data?" {
			t.Fatalf("expected first message to match text field, got %q", first.Message)
		}

		last := entries[2]
		if last.Message != "Line one\nLine two" {
			t.Fatalf("expected content field to be joined with newlines, got %q", last.Message)
		}
	})

	t.Run("returns error for invalid json", func(t *testing.T) {
		_, err := ParseConversationsJSON(strings.NewReader("{"))
		if err == nil {
			t.Fatal("expected error for invalid json, got nil")
		}
	})

	t.Run("handles edge cases", func(t *testing.T) {
		input := `[
			{
				"uuid": "empty-conv",
				"name": "Empty",
				"chat_messages": []
			},
			{
				"uuid": "missing-sender",
				"name": "No Sender",
				"chat_messages": [
					{ "text": "Who sent this?" }
				]
			},
			{
				"uuid": "complex-content",
				"name": "Complex",
				"chat_messages": [
					{
						"sender": "system",
						"content": [
							{ "text": "    Trimmed    " },
							{ "unexpected": "ignored" },
							{ "text": 123 },
							{ "type": "wrapper", "content": [{ "text": "Deep" }] }
						]
					}
				]
			},
				{
					"uuid": "mixed-types",
					"name": "Mixed",
					"chat_messages": [
						{
							"sender": "bot",
							"content": [
								123,
								true,
								{ "text": "Valid text" },
								null
							]
						}
					]
				}
			]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 3 {
			t.Fatalf("expected 3 entries, got %d", len(entries))
		}

		// Check missing sender behavior
		noSender := entries[0]
		if noSender.Speaker != "unknown" {
			t.Errorf("expected unknown speaker, got %q", noSender.Speaker)
		}

		// Check complex content behavior
		complex := entries[1]
		expectedMessage := "Trimmed\nDeep"
		if complex.Message != expectedMessage {
			t.Errorf("expected message %q, got %q", expectedMessage, complex.Message)
		}

		// Check mixed/ignored types in content
		mixed := entries[2]
		if mixed.Message != "Valid text" {
			t.Errorf("expected message 'Valid text', got %q", mixed.Message)
		}
	})

	t.Run("prioritizes text field over content", func(t *testing.T) {
		input := `[
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
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		if entries[0].Message != "Top level text" {
			t.Errorf("expected message 'Top level text', got %q", entries[0].Message)
		}
	})

	t.Run("handles deeply nested content", func(t *testing.T) {
		// Construct a deeply nested JSON structure
		depth := 100
		var sb strings.Builder
		sb.WriteString(`[{"uuid": "nested", "name": "Nested", "chat_messages": [{"sender": "me", "content": `)
		for i := 0; i < depth; i++ {
			sb.WriteString(`{"type": "wrapper", "content": [`)
		}
		sb.WriteString(`{"text": "Deepest"}`)
		for i := 0; i < depth; i++ {
			sb.WriteString(`]}`)
		}
		sb.WriteString(`}]}]`)

		entries, err := ParseConversationsJSON(strings.NewReader(sb.String()))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		if entries[0].Message != "Deepest" {
			t.Errorf("expected message 'Deepest', got %q", entries[0].Message)
		}
	})

	t.Run("extracts timestamps from created_at field on chat messages", func(t *testing.T) {
		input := `[
			{
				"uuid": "with-timestamps",
				"name": "Timeline",
				"chat_messages": [
					{
						"sender": "human",
						"text": "Question",
						"created_at": "2025-09-19T04:41:47.942021Z"
					},
					{
						"sender": "assistant",
						"text": "Answer",
						"created_at": "2025-09-19T04:41:57.111111Z"
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 2 {
			t.Fatalf("expected 2 entries, got %d", len(entries))
		}

		if entries[0].MessageTimestamp != "2025-09-19T04:41:47.942021Z" {
			t.Errorf("expected first timestamp from created_at, got %q", entries[0].MessageTimestamp)
		}

		if entries[1].MessageTimestamp != "2025-09-19T04:41:57.111111Z" {
			t.Errorf("expected second timestamp from created_at, got %q", entries[1].MessageTimestamp)
		}
	})

	t.Run("parses real export shape and ignores extra metadata fields", func(t *testing.T) {
		input := `[
			{
				"uuid": "79b16c43-8e2e-4cee-8015-d652d0ad6423",
				"name": "💸 🤖 LLM economics",
				"summary": "conversation summary",
				"created_at": "2025-09-19T04:41:47.183913Z",
				"updated_at": "2025-09-19T18:07:25.357149Z",
				"account": { "uuid": "af5e398e-a3c4-438d-b2a8-8d68d7a93393" },
				"chat_messages": [
					{
						"uuid": "6b8e26a4-7460-4600-a547-55a24bd9076b",
						"text": "Please help me calculate some of the funnels...",
						"content": [
							{
								"start_timestamp": "2025-09-19T04:41:47.938540Z",
								"stop_timestamp": "2025-09-19T04:41:47.938540Z",
								"type": "text",
								"text": "Please help me calculate some of the funnels...",
								"citations": []
							}
						],
						"sender": "human",
						"created_at": "2025-09-19T04:41:47.942021Z",
						"updated_at": "2025-09-19T04:41:47.942021Z",
						"attachments": [],
						"files": []
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		entry := entries[0]
		if entry.ConversationID != "79b16c43-8e2e-4cee-8015-d652d0ad6423" {
			t.Errorf("expected conversation id from real export, got %q", entry.ConversationID)
		}
		if entry.ConversationName != "💸 🤖 LLM economics" {
			t.Errorf("expected conversation name from real export, got %q", entry.ConversationName)
		}
		if entry.Speaker != "human" {
			t.Errorf("expected speaker human from real export, got %q", entry.Speaker)
		}
		if entry.Message != "Please help me calculate some of the funnels..." {
			t.Errorf("expected message text field from real export, got %q", entry.Message)
		}
		if entry.MessageTimestamp != "2025-09-19T04:41:47.942021Z" {
			t.Errorf("expected created_at timestamp from real export, got %q", entry.MessageTimestamp)
		}
	})

	t.Run("handles null or missing chat_messages gracefully", func(t *testing.T) {
		input := `[
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
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		if entries[0].ConversationID != "valid-conv" {
			t.Errorf("expected valid conversation to be parsed, got %q", entries[0].ConversationID)
		}
	})
}
