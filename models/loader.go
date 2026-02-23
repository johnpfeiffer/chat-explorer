package models

import (
	"archive/zip"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const conversationsFileName = "conversations.json"

func LoadConversationEntries(path string) ([]ConversationEntry, error) {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return nil, fmt.Errorf("path is required")
	}

	if strings.EqualFold(filepath.Ext(trimmedPath), ".zip") {
		return loadConversationEntriesFromZip(trimmedPath)
	}

	return loadConversationEntriesFromJSON(trimmedPath)
}

func loadConversationEntriesFromJSON(path string) ([]ConversationEntry, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open file: %w", err)
	}
	defer file.Close()

	entries, err := ParseConversationsJSON(file)
	if err != nil {
		return nil, fmt.Errorf("parse conversations json: %w", err)
	}

	return entries, nil
}

func loadConversationEntriesFromZip(path string) ([]ConversationEntry, error) {
	archive, err := zip.OpenReader(path)
	if err != nil {
		return nil, fmt.Errorf("open zip archive: %w", err)
	}
	defer archive.Close()

	for _, file := range archive.File {
		if !strings.EqualFold(filepath.Base(file.Name), conversationsFileName) {
			continue
		}

		reader, openErr := file.Open()
		if openErr != nil {
			return nil, fmt.Errorf("open %s from zip archive: %w", conversationsFileName, openErr)
		}

		entries, parseErr := ParseConversationsJSON(reader)
		closeErr := reader.Close()
		if parseErr != nil {
			return nil, fmt.Errorf("parse %s from zip archive: %w", conversationsFileName, parseErr)
		}
		if closeErr != nil {
			return nil, fmt.Errorf("close %s from zip archive: %w", conversationsFileName, closeErr)
		}

		return entries, nil
	}

	return nil, fmt.Errorf("%s not found in zip archive", conversationsFileName)
}
