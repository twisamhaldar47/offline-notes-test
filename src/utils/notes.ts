import axios from 'axios';
import {
  storeOfflineNote,
  getOfflineNote,
  getOfflineNotes,
  deleteOfflineNote,
  editOfflineNote
} from '../../public/indexeddb';
import logger from './logger';

export interface Note {
  _id?: number; // Used by datastore
  localId?: string;

  localDeleteSynced?: boolean;
  localEditSynced?: boolean;

  // Add a new field to track when the note was last synced with the server
  lastSyncedAt?: Date;

  // Add a field to track the last modified time (both local and server)
  lastModifiedAt?: Date;

  // Add a field to track if there's a conflict
  hasConflict?: boolean;

  title: string;
  createdAt: Date;
  tags?: string[];
}

function createServerNote(note: Note) {
  const serverNote: Note = {
    title: note.title,
    localId: note.localId,
    createdAt: note.createdAt,
    tags: note.tags || [],
    lastModifiedAt: note.lastModifiedAt || note.createdAt // Include modification time
  }
  return serverNote
}

export function createNote(noteTitle: string, tags: string[] = []) {
  const now = new Date();
  const note: Note = {
    title: noteTitle,
    localId: crypto.randomUUID(),
    createdAt: now,
    lastModifiedAt: now, // Set initial modification time
    tags: tags
  };
  logger.debug('Created new note:', { id: note.localId, title: noteTitle, tags });
  return note;
}

export async function submitNote(note: Note) {
  // Store the note in IndexedDB first
  await storeOfflineNote(note);
  logger.info('Stored note in local database', { id: note.localId });

  // Check if the browser is online
  if (navigator.onLine) {
    logger.sync('Attempting to sync new note with server', { id: note.localId });
    // Send a POST request to the save-note endpoint
    try {
      const response = await fetch('/api/save-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createServerNote(note)),
      });

      if (response.ok) {
        logger.success('Note synced successfully with server');
        await response.json().then(async (data) => {
          note._id = data.insertedId;
          note.lastSyncedAt = new Date(); // Record when the note was synced
          await editOfflineNote(note);
          logger.sync('Updated local note with server ID', { localId: note.localId, serverId: note._id });
        });
      } else {
        logger.error('Failed to sync note with server', { status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      logger.error('Error during note sync:', error);
    }
  } else {
    logger.warn('Device offline, note will sync when online');
  }
}

export async function deleteNote(noteId: string) {
  try {
    const note = await getOfflineNote(noteId);
    if (note !== undefined) {
      if (note._id === undefined) {
        await deleteOfflineNote(noteId);
        logger.info('Deleted local-only note', { id: noteId });
      } else {
        // Check if the browser is online
        if (navigator.onLine) {
          // Make a DELETE request to the API endpoint
          try {
            await deleteOfflineNote(noteId);
            await axios.delete(`/api/delete-note?id=${note._id}`);
            logger.success('Note deleted from server and local database', { localId: noteId, serverId: note._id });
          } catch (error) {
            logger.error('Error deleting note from server:', error);
          }
        } else {
          note.localDeleteSynced = false;
          await editOfflineNote(note);
          logger.warn('Device offline, marked note for deletion when online', { id: noteId });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to delete note:', error);
  }
}

export async function editNote(noteId: string, updatedTitle: string, updatedTags?: string[]) {
  try {
    const note = await getOfflineNote(noteId);
    if (note !== undefined) {
      // Update the last modified time whenever a note is edited
      note.lastModifiedAt = new Date();

      if (note._id === undefined) {
        note.title = updatedTitle;
        if (updatedTags !== undefined) {
          note.tags = updatedTags;
        }
        await editOfflineNote(note);
        logger.info('Updated local-only note', { id: noteId });
      } else {
        note.localEditSynced = false;
        // Check if the browser is online
        if (navigator.onLine) {
          // Make a PUT request to the API endpoint
          try {
            await axios.put(`/api/edit-note?id=${note._id}`, {
              title: updatedTitle,
              tags: updatedTags || note.tags,
              lastModifiedAt: note.lastModifiedAt
            });
            note.title = updatedTitle;
            if (updatedTags !== undefined) {
              note.tags = updatedTags;
            }
            note.localEditSynced = undefined;
            note.lastSyncedAt = new Date(); // Update the sync timestamp
            await editOfflineNote(note);
            logger.success('Note updated on server and locally', { localId: noteId, serverId: note._id });
          } catch (error) {
            logger.error('Error updating note on server:', error);
          }
        } else {
          note.title = updatedTitle;
          if (updatedTags !== undefined) {
            note.tags = updatedTags;
          }
          await editOfflineNote(note);
          logger.warn('Device offline, note update will sync when online', { id: noteId });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to edit note:', error);
  }
}

export async function updateSavedNote(serverNote: Note, localNotes: Note[]) {
  const matchingSyncedLocalNote = localNotes.find(
      (localNote: Note) => localNote._id === serverNote._id
  );
  if (matchingSyncedLocalNote === undefined) {
    const matchingUnsyncedLocalNote = localNotes.find(
        (localNote: Note) => localNote.localId === serverNote.localId
    );
    if (matchingUnsyncedLocalNote !== undefined) {
      matchingUnsyncedLocalNote._id = serverNote._id;
      // Preserve local tags if server note doesn't have tags
      if (serverNote.tags !== undefined) {
        matchingUnsyncedLocalNote.tags = serverNote.tags;
      }
      matchingUnsyncedLocalNote.lastSyncedAt = new Date(); // Update sync timestamp
      await editOfflineNote(matchingUnsyncedLocalNote);
      logger.sync('Updated local note with server ID', { localId: matchingUnsyncedLocalNote.localId, serverId: serverNote._id });
    } else {
      serverNote.localId = crypto.randomUUID();
      // Ensure the server note has a tags array if it doesn't
      if (!serverNote.tags) {
        serverNote.tags = [];
      }
      serverNote.lastSyncedAt = new Date(); // Set initial sync timestamp
      await storeOfflineNote(serverNote);
      logger.sync('New server note stored locally', { serverId: serverNote._id, newLocalId: serverNote.localId });
    }
  }
}

// Function to check if two notes are different in content
function notesHaveContentDifferences(localNote: Note, serverNote: Note): boolean {
  // Compare title
  if (localNote.title !== serverNote.title) {
    return true;
  }

  // Compare tags (if either has tags)
  const localTags = localNote.tags || [];
  const serverTags = serverNote.tags || [];

  // Different number of tags
  if (localTags.length !== serverTags.length) {
    return true;
  }

  // Check if tags are different (regardless of order)
  const localTagsSet = new Set(localTags);
  for (const tag of serverTags) {
    if (!localTagsSet.has(tag)) {
      return true;
    }
  }

  return false;
}

export async function updateEditedNote(serverNote: Note, localNotes: Note[]) {
  const matchingLocalNote = localNotes.find((localNote: Note) => localNote._id === serverNote._id);
  if (matchingLocalNote !== undefined) {
    // CONFLICT DETECTION LOGIC
    // A conflict occurs when both local and server versions have changed independently
    if (matchingLocalNote.localEditSynced === false) {
      // Local note has unsynced changes

      // Compare modification timestamps if available
      const serverModTime = new Date(serverNote.lastModifiedAt || serverNote.createdAt);
      const lastSyncTime = new Date(matchingLocalNote.lastSyncedAt || matchingLocalNote.createdAt);

      // If the server note was modified after the last sync and has different content from local
      if (serverModTime > lastSyncTime && notesHaveContentDifferences(matchingLocalNote, serverNote)) {
        // We have a conflict - the server version changed since our last sync
        // and we also have local changes
        matchingLocalNote.hasConflict = true;

        logger.warn('CONFLICT DETECTED:', {
          noteId: matchingLocalNote._id,
          localTitle: matchingLocalNote.title,
          serverTitle: serverNote.title,
          localTags: matchingLocalNote.tags,
          serverTags: serverNote.tags,
          localModTime: matchingLocalNote.lastModifiedAt,
          serverModTime: serverNote.lastModifiedAt,
          lastSyncTime: matchingLocalNote.lastSyncedAt
        });

        // Store the conflict information
        // For now, just mark the conflict but prefer local changes
        // In a full implementation, you might want to store both versions
        // or implement a resolution UI
        await editOfflineNote(matchingLocalNote);

        // Sync local changes to server (giving local changes priority for now)
        await axios.put(`/api/edit-note?id=${matchingLocalNote._id}`, {
          title: matchingLocalNote.title,
          tags: matchingLocalNote.tags || [],
          lastModifiedAt: matchingLocalNote.lastModifiedAt,
          hasConflict: true // Inform the server that this was a conflict resolution
        });

        matchingLocalNote.localEditSynced = undefined;
        matchingLocalNote.lastSyncedAt = new Date();
        await editOfflineNote(matchingLocalNote);
        logger.sync('Synced local changes in conflict resolution', { id: matchingLocalNote._id });
      } else {
        // No conflict - just sync local changes
        await axios.put(`/api/edit-note?id=${matchingLocalNote._id}`, {
          title: matchingLocalNote.title,
          tags: matchingLocalNote.tags || [],
          lastModifiedAt: matchingLocalNote.lastModifiedAt
        });
        matchingLocalNote.localEditSynced = undefined;
        matchingLocalNote.lastSyncedAt = new Date();
        await editOfflineNote(matchingLocalNote);
        logger.sync('Synced pending local edits to server', { id: matchingLocalNote._id });
      }
    } else if (matchingLocalNote.localEditSynced === undefined) {
      // No pending local edits, update from server
      // Check if we need to update based on modification time
      const serverModTime = new Date(serverNote.lastModifiedAt || serverNote.createdAt);
      const localModTime = new Date(matchingLocalNote.lastModifiedAt || matchingLocalNote.createdAt);

      if (serverModTime > localModTime && notesHaveContentDifferences(matchingLocalNote, serverNote)) {
        // Server has newer content
        matchingLocalNote.title = serverNote.title;
        // Only replace tags if server note has tags defined
        if (serverNote.tags !== undefined) {
          matchingLocalNote.tags = serverNote.tags;
        }
        matchingLocalNote.lastModifiedAt = serverNote.lastModifiedAt;
        matchingLocalNote.lastSyncedAt = new Date();
        await editOfflineNote(matchingLocalNote);
        logger.sync('Updated local note with server changes', { id: matchingLocalNote._id });
      }
    }
  }
}

export async function updateDeletedNote(serverId: number, localNotes: Note[]) {
  const matchingLocalNote = localNotes.find((localNote: Note) => localNote._id === serverId);
  if (matchingLocalNote !== undefined) {
    // CONFLICT DETECTION FOR DELETION
    // Check if the local note has unsynced edits before deleting
    if (matchingLocalNote.localEditSynced === false) {
      logger.warn('CONFLICT DETECTED: Note was deleted on server but has local changes', {
        localId: matchingLocalNote.localId,
        serverId,
        localTitle: matchingLocalNote.title
      });
      // For now, we'll follow server's lead and delete the local note
      // In a full implementation, you might want to handle this differently
    }

    await deleteOfflineNote(matchingLocalNote.localId);
    logger.sync('Deleted local note to match server state', { localId: matchingLocalNote.localId, serverId });
  }
}

export async function refreshNotes() {
  if (navigator.onLine) {
    logger.sync('Starting note synchronization');
    try {
      const localNotes = await getOfflineNotes();
      logger.debug(`Found ${localNotes.length} notes in local database`);

      const response = await axios.get('/api/notes');
      const serverNotes = response.data;
      logger.debug(`Found ${serverNotes.length} notes on server`);

      // Ensure all server notes have tags field (even if empty)
      serverNotes.forEach((note: Note) => {
        if (!note.tags) {
          note.tags = [];
        }
      });

      // Sync local notes that need to be deleted on server
      // @ts-ignore
      const pendingDeletions = localNotes.filter(note => note.localDeleteSynced === false);
      if (pendingDeletions.length > 0) {
        logger.sync(`Processing ${pendingDeletions.length} pending deletions`);
      }

      // Track deleted notes on the server
      const serverNoteIds = new Set(serverNotes.map((note: Note) => note._id));
      const deletedOnServer = localNotes
          .filter((note:any) => note._id !== undefined && !serverNoteIds.has(note._id))
          .map((note:any) => note._id);

      if (deletedOnServer.length > 0) {
        logger.sync(`Detected ${deletedOnServer.length} notes deleted on server`);
      }

      // Process local notes first
      for (const localNote of localNotes) {
        if (localNote.localDeleteSynced === false) {
          const matchingServerNote = serverNotes.find((serverNote: Note) => localNote._id === serverNote._id);
          if (matchingServerNote !== undefined) {
            // CONFLICT: Note marked for deletion locally but also updated on server
            if (matchingServerNote.lastModifiedAt && localNote.lastSyncedAt &&
                new Date(matchingServerNote.lastModifiedAt) > new Date(localNote.lastSyncedAt)) {
              logger.warn('CONFLICT DETECTED: Note was modified on server but marked for deletion locally', {
                localId: localNote.localId,
                serverId: localNote._id
              });
              // For now, proceed with deletion as that was user's intent
            }

            await deleteOfflineNote(localNote.localId);
            await axios.delete(`/api/delete-note?id=${localNote._id}`);
            logger.success('Completed pending note deletion', { id: localNote._id });
          }
        } else if (localNote._id === undefined) {
          // Attempt to submit unsynced local note
          logger.sync('Syncing unsynced local note to server', { id: localNote.localId });
          try {
            const submittedNoteResponse = await fetch('/api/save-note', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(createServerNote(localNote)),
            });

            if (submittedNoteResponse.ok) {
              logger.success(`Synced local note during refresh`, { id: localNote.localId });
              await submittedNoteResponse.json().then(async (data) => {
                localNote._id = data.insertedId;
                localNote.lastSyncedAt = new Date(); // Record sync time
                await editOfflineNote(localNote);
                logger.sync('Updated local note with server ID', { localId: localNote.localId, serverId: localNote._id });
              });
            } else {
              logger.error(`Failed to sync local note during refresh`, {
                id: localNote.localId,
                status: submittedNoteResponse.status,
                statusText: submittedNoteResponse.statusText
              });
            }
          } catch (error) {
            logger.error(`Error syncing local note during refresh`, { id: localNote.localId, error });
          }
        }
      }

      const updatedLocalNotes = await getOfflineNotes();
      const updatedResponse = await axios.get('/api/notes');
      const updatedServerNotes = updatedResponse.data;

      // Ensure all updated server notes have tags field
      updatedServerNotes.forEach((note: Note) => {
        if (!note.tags) {
          note.tags = [];
        }
      });

      // Process server notes
      logger.sync(`Processing ${updatedServerNotes.length} server notes for local sync`);
      for (const serverNote of updatedServerNotes) {
        updateSavedNote(serverNote, updatedLocalNotes);
        updateEditedNote(serverNote, updatedLocalNotes);
      }

      // Process notes deleted on server
      for (const deletedId of deletedOnServer) {
        updateDeletedNote(deletedId, updatedLocalNotes);
      }

      // Get list of notes with conflicts for reporting
      const notesWithConflicts = (await getOfflineNotes()).filter((note:any) => note.hasConflict);
      if (notesWithConflicts.length > 0) {
        logger.warn(`Synchronization completed with ${notesWithConflicts.length} conflict(s)`, {
          conflicts: notesWithConflicts.map((note:any) => ({
            id: note._id,
            localId: note.localId,
            title: note.title
          }))
        });
      } else {
        logger.success('Note synchronization completed successfully with no conflicts');
      }
    } catch (error) {
      logger.error('Error during note synchronization:', error);
    }
  } else {
    logger.warn('Device offline, cannot synchronize notes');
  }
}

export async function getNotes() {
  const notes = await getOfflineNotes();
  notes.sort(function(a: Note, b: Note) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return notes;
}

// New function to resolve conflicts
export async function resolveConflict(noteId: string, resolution: 'local' | 'server' | 'merged', mergedContent?: {title?: string, tags?: string[]}) {
  try {
    const note = await getOfflineNote(noteId);
    if (note && note.hasConflict) {
      if (resolution === 'server') {
        // Get the server version
        const response = await axios.get(`/api/notes?id=${note._id}`);
        const serverNote = response.data;

        // Apply server version
        note.title = serverNote.title;
        note.tags = serverNote.tags || [];
        note.lastModifiedAt = new Date();
      } else if (resolution === 'merged' && mergedContent) {
        // Apply merged content
        if (mergedContent.title) note.title = mergedContent.title;
        if (mergedContent.tags) note.tags = mergedContent.tags;
        note.lastModifiedAt = new Date();
      }
      // For 'local', keep local version (no changes needed)

      // Clear the conflict flag
      note.hasConflict = false;
      note.lastSyncedAt = new Date();
      note.localEditSynced = undefined;

      // Save to local database
      await editOfflineNote(note);

      // Sync with server
      await axios.put(`/api/edit-note?id=${note._id}`, {
        title: note.title,
        tags: note.tags || [],
        lastModifiedAt: note.lastModifiedAt,
        hasConflict: false
      });

      logger.success('Conflict resolved', {
        id: note._id,
        resolution
      });

      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error resolving conflict:', error);
    return false;
  }
}