# Goal

- Adding the sort feature to conversations


## Requirements

On the top right, above the list of conversations...
 
Add a "Sorted by" button that displays how the current list of conversations on the top right is being sorted.

Types of sorting supported:

- "Sorted by Name (A-Z)": ascending each conversation's name/title, and remember to support UTF8
- "Sorted by Name (Z-A)": descending from last to first 
- "Sorted by Created (oldest)": ascending each conversation's created date 
- "Sorted by Created (newest)": descending from last to first 

### Details

Conversations should display the created date for each conversation: **Convo Name** message count UUID (YYYY-MM-DD HH:MM Timezone) 

The default sort (i.e. when the application starts) is "created" oldest to newest

(Still in MVP mode so no state/persistence is needed about the User's sort order)

When the button is clicked the next sort type will be displayed and happen.

ChatGPT has "create_time"

If the conversations.json (e.g. Claude) does not have a CreatedAt, use the first (oldest) message created_at


### Test Cases

- 4 conversations, inclusive of name starting with and including UTF8 and symbols
- - UI rendering test of permutations of each of the 4 being expanded; sorting should not expand or collapse or affect message display

- edge case of 1 conversation
- edge case of empty conversation title: these should be listed first when sorting lexically
- edge case of two titles being the same: tie break by sorting by UUID (to provide determinism)
- edge case of two Created datetime(s) being the same: tie break by sorting by Name, then tie break by UUID


