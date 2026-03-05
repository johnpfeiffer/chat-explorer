# Goal
Support ChatGPT exports too, it uses the same filename: conversations.json

## ChatGPT Export Format Specification

### Top-Level Structure
```json
[
  {
    "title": "Conversation Title",
    "create_time": 1771206244.59583,
    "update_time": 1771206258.890156,
    "conversation_id": "uuid-string",
    "current_node": "message-uuid",
    "mapping": { /* message tree */ },
    "moderation_results": [],
    "plugin_ids": null
  }
]
```

### Key Differences from Claude Export
1. **Array format**: Top-level is an array of conversations (not a single object)
2. **Tree structure**: Messages organized as a tree in `mapping` field (not linear array)
3. **Timestamps**: Unix timestamps at both conversation and message levels
4. **Message nesting**: Content is deeply nested: `message.content.parts[0]`

### Message Mapping Structure
The `mapping` field is an object where:
- **Keys**: Message UUIDs
- **Values**: Message node objects

Each message node:
```json
{
  "id": "message-uuid",
  "message": {
    "id": "message-uuid",
    "author": {
      "role": "system" | "user" | "assistant" | "tool",
      "name": null,
      "metadata": {}
    },
    "create_time": 1771206243.708852,  // Unix timestamp, can be null
    "update_time": null,
    "content": {
      "content_type": "text" | "user_editable_context" | ...,
      "parts": ["message text here"]  // Array of strings
    },
    "status": "finished_successfully",
    "end_turn": true | false | null,
    "weight": 1.0,
    "metadata": { /* extensive metadata */ },
    "recipient": "all",
    "channel": null | "final"
  },
  "parent": "parent-uuid" | null,  // null for root node
  "children": ["child-uuid1", "child-uuid2"]
}
```

### Parsing Requirements

#### 1. Conversation Detection
- Detect ChatGPT format by checking if root is an array with objects containing `mapping` field
- Fall back to Claude format if structure doesn't match

#### 2. Message Extraction
- Traverse `mapping` tree starting from root node (where `parent` is null)
- Filter out hidden system messages: `metadata.is_visually_hidden_from_conversation === true`
- Extract visible messages based on `author.role`:
  - `user`: User messages
  - `assistant`: Assistant responses
  - `system`: Only include if NOT hidden (user context messages may be relevant)
  - `tool`: Tool invocations (e.g., web searches) - may be shown or hidden based on UI requirements

#### 3. Message Reconstruction
- Walk tree in chronological order (use `create_time` or parent-child relationships)
- Combine `content.parts` array (join strings) to get full message text
- Handle null timestamps gracefully (use parent's timestamp or conversation timestamp)
- **Tool messages**: Messages with `role: "tool"` represent tool invocations (e.g., web searches)
  - Have a `name` field indicating the tool used (e.g., "web.run")
  - May have `metadata.real_author` with tool identifier
  - Often appear between assistant messages and contain intermediate results
  - May be hidden from display depending on UI requirements

#### 4. Special Content Types
- `user_editable_context`: User profile/instructions (may want to show or hide)
- Empty `parts` arrays: Skip these messages (typically hidden system prompts)
- Messages with `channel: "final"`: These are the final rendered responses

#### 5. Timestamp Conversion
- Convert Unix timestamps to ISO format for consistency
- Handle null timestamps (common for system messages)
- Use conversation-level `create_time`/`update_time` as fallback

### Implementation Strategy

**Normalize to common format**: Convert both ChatGPT and Claude formats to internal representation
**Filter system messages**: Skip messages marked as hidden

**Handle edge cases**:
   - Multiple assistant responses in sequence (ChatGPT regeneration feature)
   - Branching conversations (multiple children)
   - Null/missing fields

### Recommended Display Logic
- Show conversation title from `title` field
- Display message timestamp from `create_time` (format as local time)
- Count only visible messages (exclude hidden system messages)
- Support conversation metadata display (create/update times)

## Test Coverage Needed
- Parse array of multiple ChatGPT conversations
- Handle conversations with complex message trees (branches)
- Filter hidden system messages correctly
- Extract and display user context messages appropriately
- Handle null timestamps gracefully
- Convert timestamps to readable format


