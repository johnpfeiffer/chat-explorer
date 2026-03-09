# Goal

bug fix of missing chatgpt conversations
(With sorting, I noticed that the export explorer UI was not showing some conversations)
 
Analyzing: the UI only showed 74 converations but in the JSON "mapping" appears 135 times

Hypothesis that older conversations maybe had self references or some other edge case:
"mapping": {
      "d4576e7e-3285-4fc4-a039-e17d9ebcb6a6": {
        "id": "d4576e7e-3285-4fc4-a039-e17d9ebcb6a6",

## Performance

(excluding initial load which may be long due to large file size)

performance of UI actions should be <100ms 

- expanding a conversation to its messages
- collapsing a conversation
- sorting the list of messages

## Test Cases

- a conversation can reference itself in its mapping - likely a top level conversation in the list

- performance test case of 1001 short conversations

- edge case of missing Created datetime (during import), should be using the oldest message created_at as the conversation's Created

## Performance

Opening a different conversation seems fast, but collapsing a conversation (even just 8 messages) seems to take awhile, it should be <100ms

Ensure sorting is fast - this may mean augmenting the data structure during ingestion?


