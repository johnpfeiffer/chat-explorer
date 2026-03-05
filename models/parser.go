package models

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"sort"
	"strings"
	"time"
)

type ConversationEntry struct {
	ConversationID   string `json:"conversationId"`
	ConversationName string `json:"conversationName"`
	Speaker          string `json:"speaker"`
	Message          string `json:"message"`
	MessageTimestamp string `json:"messageTimestamp"`
}

type rawConversation struct {
	UUID         string           `json:"uuid"`
	Name         string           `json:"name"`
	ChatMessages []rawChatMessage `json:"chat_messages"`
}

type rawChatMessage struct {
	Sender    string `json:"sender"`
	Text      string `json:"text"`
	Content   any    `json:"content"`
	CreatedAt string `json:"created_at"`
}

type rawChatGPTConversation struct {
	Title          string                    `json:"title"`
	CreateTime     *float64                  `json:"create_time"`
	UpdateTime     *float64                  `json:"update_time"`
	ConversationID string                    `json:"conversation_id"`
	CurrentNode    string                    `json:"current_node"`
	Mapping        map[string]rawChatGPTNode `json:"mapping"`
}

type rawChatGPTNode struct {
	ID       string             `json:"id"`
	Message  *rawChatGPTMessage `json:"message"`
	Parent   *string            `json:"parent"`
	Children []string           `json:"children"`
}

type rawChatGPTMessage struct {
	Author     rawChatGPTAuthor  `json:"author"`
	CreateTime *float64          `json:"create_time"`
	Content    rawChatGPTContent `json:"content"`
	Metadata   map[string]any    `json:"metadata"`
	Channel    *string           `json:"channel"`
}

type rawChatGPTAuthor struct {
	Role string `json:"role"`
}

type rawChatGPTContent struct {
	ContentType string `json:"content_type"`
	Parts       []any  `json:"parts"`
	Text        string `json:"text"`
}

func ParseConversationsJSON(input io.Reader) ([]ConversationEntry, error) {
	var rawConversations []json.RawMessage

	decoder := json.NewDecoder(input)
	if err := decoder.Decode(&rawConversations); err != nil {
		return nil, fmt.Errorf("decode conversations json: %w", err)
	}

	entries := make([]ConversationEntry, 0, len(rawConversations))
	for index, rawConversationJSON := range rawConversations {
		conversationEntries, err := parseConversation(rawConversationJSON)
		if err != nil {
			return nil, fmt.Errorf("parse conversation at index %d: %w", index, err)
		}
		entries = append(entries, conversationEntries...)
	}

	return entries, nil
}

func parseConversation(rawConversationJSON json.RawMessage) ([]ConversationEntry, error) {
	var conversationFields map[string]json.RawMessage
	if err := json.Unmarshal(rawConversationJSON, &conversationFields); err != nil {
		return nil, fmt.Errorf("decode conversation: %w", err)
	}

	if _, hasMapping := conversationFields["mapping"]; hasMapping {
		var conversation rawChatGPTConversation
		if err := json.Unmarshal(rawConversationJSON, &conversation); err != nil {
			return nil, fmt.Errorf("decode chatgpt conversation: %w", err)
		}
		return parseChatGPTConversation(conversation), nil
	}

	var conversation rawConversation
	if err := json.Unmarshal(rawConversationJSON, &conversation); err != nil {
		return nil, fmt.Errorf("decode claude conversation: %w", err)
	}

	return parseClaudeConversation(conversation), nil
}

func parseClaudeConversation(conversation rawConversation) []ConversationEntry {
	entries := make([]ConversationEntry, 0, len(conversation.ChatMessages))
	for _, chatMessage := range conversation.ChatMessages {
		message := extractMessageText(chatMessage)
		if message == "" {
			continue
		}

		speaker := strings.TrimSpace(chatMessage.Sender)
		if speaker == "" {
			speaker = "unknown"
		}

		entries = append(entries, ConversationEntry{
			ConversationID:   conversation.UUID,
			ConversationName: conversation.Name,
			Speaker:          speaker,
			Message:          message,
			MessageTimestamp: extractMessageTimestamp(chatMessage),
		})
	}

	return entries
}

func parseChatGPTConversation(conversation rawChatGPTConversation) []ConversationEntry {
	selectedNodeIDs := selectedChatGPTNodeIDs(conversation)

	entries := make([]ConversationEntry, 0, len(selectedNodeIDs))
	for _, nodeID := range selectedNodeIDs {
		node, exists := conversation.Mapping[nodeID]
		if !exists {
			continue
		}

		entry, includeEntry := toChatGPTConversationEntry(conversation, node)
		if !includeEntry {
			continue
		}

		entries = append(entries, entry)
	}

	return entries
}

func selectedChatGPTNodeIDs(conversation rawChatGPTConversation) []string {
	currentNodeID := strings.TrimSpace(conversation.CurrentNode)
	if currentNodeID != "" {
		nodeIDsOnCurrentBranch := collectPathFromCurrentNode(conversation.Mapping, currentNodeID)
		if len(nodeIDsOnCurrentBranch) > 0 {
			return nodeIDsOnCurrentBranch
		}
	}

	return collectNodeIDsFromRoots(conversation.Mapping)
}

func collectPathFromCurrentNode(mapping map[string]rawChatGPTNode, currentNodeID string) []string {
	reversedNodeIDs := make([]string, 0, 16)
	visited := make(map[string]struct{}, 16)

	nodeID := currentNodeID
	for nodeID != "" {
		if _, alreadyVisited := visited[nodeID]; alreadyVisited {
			break
		}
		visited[nodeID] = struct{}{}

		node, exists := mapping[nodeID]
		if !exists {
			break
		}

		reversedNodeIDs = append(reversedNodeIDs, nodeID)
		if node.Parent == nil {
			break
		}

		nodeID = strings.TrimSpace(*node.Parent)
	}

	for left, right := 0, len(reversedNodeIDs)-1; left < right; left, right = left+1, right-1 {
		reversedNodeIDs[left], reversedNodeIDs[right] = reversedNodeIDs[right], reversedNodeIDs[left]
	}

	return reversedNodeIDs
}

func collectNodeIDsFromRoots(mapping map[string]rawChatGPTNode) []string {
	rootNodeIDs := make([]string, 0, len(mapping))
	for nodeID, node := range mapping {
		if node.Parent == nil {
			rootNodeIDs = append(rootNodeIDs, nodeID)
			continue
		}

		parentID := strings.TrimSpace(*node.Parent)
		if parentID == "" {
			rootNodeIDs = append(rootNodeIDs, nodeID)
			continue
		}
		if _, parentExists := mapping[parentID]; !parentExists {
			rootNodeIDs = append(rootNodeIDs, nodeID)
		}
	}

	sort.Strings(rootNodeIDs)

	orderedNodeIDs := make([]string, 0, len(mapping))
	visited := make(map[string]struct{}, len(mapping))

	var walk func(string)
	walk = func(nodeID string) {
		if _, alreadyVisited := visited[nodeID]; alreadyVisited {
			return
		}
		visited[nodeID] = struct{}{}
		orderedNodeIDs = append(orderedNodeIDs, nodeID)

		node, exists := mapping[nodeID]
		if !exists {
			return
		}

		childNodeIDs := make([]string, 0, len(node.Children))
		for _, childNodeID := range node.Children {
			trimmedChildNodeID := strings.TrimSpace(childNodeID)
			if trimmedChildNodeID == "" {
				continue
			}
			childNodeIDs = append(childNodeIDs, trimmedChildNodeID)
		}
		sort.Strings(childNodeIDs)

		for _, childNodeID := range childNodeIDs {
			walk(childNodeID)
		}
	}

	for _, rootNodeID := range rootNodeIDs {
		walk(rootNodeID)
	}

	remainingNodeIDs := make([]string, 0, len(mapping)-len(visited))
	for nodeID := range mapping {
		if _, alreadyVisited := visited[nodeID]; alreadyVisited {
			continue
		}
		remainingNodeIDs = append(remainingNodeIDs, nodeID)
	}
	sort.Strings(remainingNodeIDs)

	for _, remainingNodeID := range remainingNodeIDs {
		walk(remainingNodeID)
	}

	return orderedNodeIDs
}

func toChatGPTConversationEntry(conversation rawChatGPTConversation, node rawChatGPTNode) (ConversationEntry, bool) {
	if node.Message == nil {
		return ConversationEntry{}, false
	}
	if isChatGPTMessageHidden(node.Message.Metadata) {
		return ConversationEntry{}, false
	}

	message := extractChatGPTMessageText(node.Message.Content)
	if message == "" {
		return ConversationEntry{}, false
	}

	speaker := strings.TrimSpace(node.Message.Author.Role)
	if speaker == "" {
		speaker = "unknown"
	}

	return ConversationEntry{
		ConversationID:   strings.TrimSpace(conversation.ConversationID),
		ConversationName: conversation.Title,
		Speaker:          speaker,
		Message:          message,
		MessageTimestamp: resolveChatGPTMessageTimestamp(conversation, node),
	}, true
}

func isChatGPTMessageHidden(metadata map[string]any) bool {
	if metadata == nil {
		return false
	}

	hiddenValue, exists := metadata["is_visually_hidden_from_conversation"]
	if !exists {
		return false
	}

	isHidden, ok := hiddenValue.(bool)
	return ok && isHidden
}

func extractChatGPTMessageText(content rawChatGPTContent) string {
	parts := make([]string, 0, len(content.Parts))
	for _, part := range content.Parts {
		collectText(part, &parts)
	}
	if len(parts) == 0 {
		fallbackText := strings.TrimSpace(content.Text)
		if fallbackText != "" {
			parts = append(parts, fallbackText)
		}
	}

	return strings.Join(parts, "\n")
}

func resolveChatGPTMessageTimestamp(conversation rawChatGPTConversation, node rawChatGPTNode) string {
	if node.Message != nil {
		if timestamp := formatUnixTimestamp(node.Message.CreateTime); timestamp != "" {
			return timestamp
		}
	}

	parentNodeID := ""
	if node.Parent != nil {
		parentNodeID = strings.TrimSpace(*node.Parent)
	}

	visited := make(map[string]struct{}, 16)
	for parentNodeID != "" {
		if _, alreadyVisited := visited[parentNodeID]; alreadyVisited {
			break
		}
		visited[parentNodeID] = struct{}{}

		parentNode, exists := conversation.Mapping[parentNodeID]
		if !exists {
			break
		}
		if parentNode.Message != nil {
			if timestamp := formatUnixTimestamp(parentNode.Message.CreateTime); timestamp != "" {
				return timestamp
			}
		}
		if parentNode.Parent == nil {
			break
		}

		parentNodeID = strings.TrimSpace(*parentNode.Parent)
	}

	if timestamp := formatUnixTimestamp(conversation.CreateTime); timestamp != "" {
		return timestamp
	}

	return formatUnixTimestamp(conversation.UpdateTime)
}

func formatUnixTimestamp(unixTimestamp *float64) string {
	if unixTimestamp == nil {
		return ""
	}

	secondsFloat, fractional := math.Modf(*unixTimestamp)
	seconds := int64(secondsFloat)
	nanoseconds := int64(math.Round(fractional * float64(time.Second)))
	if nanoseconds >= int64(time.Second) {
		seconds++
		nanoseconds -= int64(time.Second)
	}
	if nanoseconds <= -int64(time.Second) {
		seconds--
		nanoseconds += int64(time.Second)
	}

	return time.Unix(seconds, nanoseconds).UTC().Format(time.RFC3339Nano)
}

func extractMessageText(chatMessage rawChatMessage) string {
	if text := strings.TrimSpace(chatMessage.Text); text != "" {
		return text
	}

	parts := make([]string, 0, 2)
	collectText(chatMessage.Content, &parts)
	return strings.Join(parts, "\n")
}

func extractMessageTimestamp(chatMessage rawChatMessage) string {
	return strings.TrimSpace(chatMessage.CreatedAt)
}

func collectText(node any, parts *[]string) {
	switch value := node.(type) {
	case string:
		text := strings.TrimSpace(value)
		if text != "" {
			*parts = append(*parts, text)
		}
	case []any:
		for _, item := range value {
			collectText(item, parts)
		}
	case map[string]any:
		if text, ok := value["text"].(string); ok {
			trimmed := strings.TrimSpace(text)
			if trimmed != "" {
				*parts = append(*parts, trimmed)
			}
		}

		if content, ok := value["content"]; ok {
			collectText(content, parts)
		}
	}
}
