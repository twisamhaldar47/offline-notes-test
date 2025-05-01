# Offline Notes App - Implementation

## My Implementation Choices

Hey there! I've implemented all the requested features for the offline notes app. Here's a breakdown of what I did and why I made certain choices.

## Backend Data Store: PostgreSQL

I chose PostgreSQL as my backend data store for a few reasons:

1. **Relational Structure**: Notes and tags have a clear relationship, and PostgreSQL handles these relationships nicely.
2. **Scalability**: It can handle a large number of notes without performance issues.
3. **Reliability**: PostgreSQL is known for data integrity, which is important for a notes app.
4. **Sequelize ORM**: I used Sequelize to interact with PostgreSQL, which made writing the CRUD operations much cleaner.

### How to Run With PostgreSQL

To get the app running with the PostgreSQL backend:

1. Make sure you have PostgreSQL installed locally.
2. Replace this values with you own:
   ```Javascript
   const sequelize = new Sequelize({
    database: 'notes',
    username: 'username',
    password: 'password',
    host: 'host',
    port: 5432,
    dialect: 'postgres',
    logging: (msg) => logger.db(msg) // Use our custom logger instead of console.log
   });
   ```
3. Run the following commands:
   ```bash
   npm install
   npm run dev
   ```
4. The app will automatically create the necessary tables on first run.

## State Management for Tagging and Filtering

I kept everything simple with React's built-in hooks:

- Used `useState` to track the current tags for each note and the active filter tags
- Implemented `useContext` to share tag filtering state across components without prop drilling
- Created a custom `useTags` hook that encapsulates tag-related operations like adding, removing, and filtering

The filtering logic runs entirely on the client-side as required. When you select a tag filter, it simply shows notes that have at least one matching tag from your selection.

Example from my implementation:
```javascript
// Inside a custom hook
const [activeTags, setActiveTags] = useState([]);
const filteredNotes = notes.filter(note => 
  activeTags.length === 0 || 
  note.tags?.some(tag => activeTags.includes(tag))
);
```

## Tag Storage Integration

I extended the existing note structure to include tags as an array of strings:

```typescript
interface Note {
  _id?: number;
  localId?: string;
  title: string;
  createdAt: Date;
  tags?: string[]; // Added this field
  // ...other fields
}
```

### Backend Integration
On the server, I added a `tags` column to the Note table, storing the tags as a JSON array. This approach allowed:
- Easy querying of all notes with specific tags
- Simple updates when adding/removing tags from a note

### IndexedDB Integration
I didn't have to modify the IndexedDB schema since it already stored the entire note object, and we just extended that object with the tags array.

### Pros and Cons of This Structure

Pros:
- Simple implementation - just an array of strings
- Easy to filter on the client side
- No complicated join tables necessary

Cons:
- No normalization of tags (the same tag string is stored multiple times)
- Limited tag metadata (can't easily store tag color, description, etc.)
- No easy way to get a list of all unique tags without scanning all notes

## Conflict Detection Logic

A conflict occurs when the same note is modified both locally while offline and on the server before the local changes are synced. I implemented detection by:

1. **Adding timestamp tracking:**
   - `lastSyncedAt`: When the note was last synchronized with the server
   - `lastModifiedAt`: When the note was last modified (locally or on server)

2. **Detection algorithm:**
   - When syncing, compare timestamps between local and server versions
   - Check if content (title or tags) actually differs
   - If the server version was modified after our last sync AND our local version also changed, we have a conflict

Here's the core logic:
```typescript
// Inside updateEditedNote
if (matchingLocalNote.localEditSynced === false) {
  // Compare modification timestamps
  const serverModTime = new Date(serverNote.lastModifiedAt || serverNote.createdAt);
  const lastSyncTime = new Date(matchingLocalNote.lastSyncedAt || matchingLocalNote.createdAt);
  
  // If server note changed since last sync and content is different
  if (serverModTime > lastSyncTime && notesHaveContentDifferences(matchingLocalNote, serverNote)) {
    // We have a conflict!
    matchingLocalNote.hasConflict = true;
    logger.warn('CONFLICT DETECTED');
    // Store conflict info...
  }
}
```

I also detect conflicts in deletion scenarios, like when a note is:
- Deleted on server but has local edits
- Marked for deletion locally but updated on server

## Proposed Conflict Resolution Strategy

For a complete implementation, I'd handle conflicts like this:

1. **Visual indicator** for notes with conflicts (maybe a warning icon)
2. **"Resolve Conflict" button** that opens a side-by-side comparison modal showing:
   - Local version (what you have)
   - Server version (what others have)
   - Merged version (optional automatic suggestion)
3. **Resolution options:**
   - "Keep my version" (local wins)
   - "Use server version" (server wins)
   - "Create merged version" (lets user pick and choose parts from both)
   - "Keep both" (duplicates the note)

I already created a `resolveConflict` function that supports these resolution types - it just needs a UI hooked up to it:

```typescript
export async function resolveConflict(
  noteId: string, 
  resolution: 'local' | 'server' | 'merged', 
  mergedContent?: {title?: string, tags?: string[]}
) {
  // Implementation details...
}
```

I think this approach gives users flexibility while making the common cases (pick local or server) really simple.

## Final Thoughts

The biggest challenge was implementing proper conflict detection without overcomplicating the app. I tried to balance thorough conflict detection with a clean, extensible codebase.

I also added TypeScript type definitions throughout to ensure type safety, especially with the new tag fields.

Overall, I'm satisfied with how the app handles offline/online transitions, and I think the conflict detection provides a good foundation for adding conflict resolution UI in the future.