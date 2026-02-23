package models

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadConversationEntries(t *testing.T) {
	tmpDir := t.TempDir()

	tests := []struct {
		name        string
		path        string
		wantLen     int
		wantSpeaker string
		wantMessage string
		wantErr     string
	}{
		{
			name:        "loads direct json export",
			path:        writeJSONFixture(t, tmpDir, "conversations.json", sampleConversationsJSON),
			wantLen:     1,
			wantSpeaker: "assistant",
			wantMessage: "Hello from export.",
		},
		{
			name:        "loads zip export with conversations json",
			path:        writeZipFixture(t, tmpDir, "export.zip", map[string]string{"conversations.json": sampleConversationsJSON}),
			wantLen:     1,
			wantSpeaker: "assistant",
			wantMessage: "Hello from export.",
		},
		{
			name:        "loads zip export with conversations json nested in folder",
			path:        writeZipFixture(t, tmpDir, "nested-export.zip", map[string]string{"data/conversations.json": sampleConversationsJSON}),
			wantLen:     1,
			wantSpeaker: "assistant",
			wantMessage: "Hello from export.",
		},
		{
			name:    "returns error when zip has no conversations json",
			path:    writeZipFixture(t, tmpDir, "missing-conversations.zip", map[string]string{"projects.json": `[]`}),
			wantErr: "conversations.json not found",
		},
		{
			name:    "returns error when path is empty",
			path:    "   ",
			wantErr: "path is required",
		},
		{
			name:    "returns error for invalid zip file",
			path:    writeJSONFixture(t, tmpDir, "broken.zip", "{not a zip}"),
			wantErr: "open zip archive",
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			entries, err := LoadConversationEntries(testCase.path)
			if testCase.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", testCase.wantErr)
				}
				if !strings.Contains(err.Error(), testCase.wantErr) {
					t.Fatalf("expected error to contain %q, got %q", testCase.wantErr, err.Error())
				}
				return
			}

			if err != nil {
				t.Fatalf("LoadConversationEntries returned error: %v", err)
			}

			if len(entries) != testCase.wantLen {
				t.Fatalf("expected %d entries, got %d", testCase.wantLen, len(entries))
			}

			if testCase.wantLen == 0 {
				return
			}

			if entries[0].Speaker != testCase.wantSpeaker {
				t.Fatalf("expected first speaker %q, got %q", testCase.wantSpeaker, entries[0].Speaker)
			}
			if entries[0].Message != testCase.wantMessage {
				t.Fatalf("expected first message %q, got %q", testCase.wantMessage, entries[0].Message)
			}
		})
	}
}

const sampleConversationsJSON = `[
	{
		"uuid": "conv-1",
		"name": "Example",
		"chat_messages": [
			{ "sender": "assistant", "text": "Hello from export." }
		]
	}
]`

func writeJSONFixture(t *testing.T, dir string, fileName string, content string) string {
	t.Helper()

	path := filepath.Join(dir, fileName)
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write fixture %s: %v", fileName, err)
	}

	return path
}

func writeZipFixture(t *testing.T, dir string, fileName string, files map[string]string) string {
	t.Helper()

	path := filepath.Join(dir, fileName)
	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("failed to create zip fixture %s: %v", fileName, err)
	}
	defer file.Close()

	zipWriter := zip.NewWriter(file)
	for entryName, content := range files {
		entryWriter, createErr := zipWriter.Create(entryName)
		if createErr != nil {
			t.Fatalf("failed to create zip entry %s: %v", entryName, createErr)
		}
		if _, writeErr := entryWriter.Write([]byte(content)); writeErr != nil {
			t.Fatalf("failed to write zip entry %s: %v", entryName, writeErr)
		}
	}
	if err := zipWriter.Close(); err != nil {
		t.Fatalf("failed to finalize zip fixture %s: %v", fileName, err)
	}

	return path
}
