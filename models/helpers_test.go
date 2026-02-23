package models

import (
	"archive/zip"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const goldenConversationsFixturePath = "testdata/conversations_golden.json"

func loadGoldenConversationsJSON(t *testing.T) string {
	t.Helper()

	bytes, err := os.ReadFile(goldenConversationsFixturePath)
	if err != nil {
		t.Fatalf("failed to read golden fixture %s: %v", goldenConversationsFixturePath, err)
	}

	return string(bytes)
}

func expectedGoldenEntries() []ConversationEntry {
	return []ConversationEntry{
		entry(
			"conv-1",
			"Setup",
			"human",
			"How do I export data?",
			"2026-01-02T03:04:05Z",
		),
		entry(
			"conv-2",
			"Setup",
			"assistant",
			"Open Settings and click Export data.",
			"2026-01-02T03:04:30Z",
		),
		entry(
			"conv-3",
			"Multiline",
			"assistant",
			"Line one\nLine two",
			"2026-01-02T03:05:00Z",
		),
		entry(
			"conv-4",
			"International",
			"研究者🧪",
			"¡Hola! Привет こんにちは 👋",
			"2026-01-02T03:05:30Z",
		),
		entry(
			"conv-5",
			"",
			"unknown",
			"Fallback speaker + untitled name",
			"2026-01-02T03:06:00Z",
		),
	}
}

func entry(
	conversationID string,
	conversationName string,
	speaker string,
	message string,
	messageTimestamp string,
) ConversationEntry {
	return ConversationEntry{
		ConversationID:   conversationID,
		ConversationName: conversationName,
		Speaker:          speaker,
		Message:          message,
		MessageTimestamp: messageTimestamp,
	}
}

func assertConversationEntries(t *testing.T, got []ConversationEntry, want []ConversationEntry) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("expected %d entries, got %d", len(want), len(got))
	}

	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("entry %d mismatch\nwant: %+v\ngot:  %+v", index, want[index], got[index])
		}
	}
}

func assertErrorContains(t *testing.T, err error, expectedSubstring string) {
	t.Helper()

	if err == nil {
		t.Fatalf("expected error containing %q, got nil", expectedSubstring)
	}
	if !strings.Contains(err.Error(), expectedSubstring) {
		t.Fatalf("expected error containing %q, got %q", expectedSubstring, err.Error())
	}
}

func assertPermissionError(t *testing.T, err error) {
	t.Helper()

	if err == nil {
		t.Fatal("expected permission error, got nil")
	}

	if errors.Is(err, fs.ErrPermission) {
		return
	}

	// Fallback for wrapped platform-dependent errors.
	if strings.Contains(strings.ToLower(err.Error()), "permission denied") {
		return
	}

	t.Fatalf("expected permission error, got %q", err.Error())
}

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
