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

  title: string;
  createdAt: Date;
  tags?: string[];
}

function createServerNote(note: Note) {
  const serverNote: Note = {
    title: note.title,
    localId: note.localId,
    createdAt: note.createdAt,
    tags: note.tags || []
  }
  return serverNote
}

export function createNote(noteTitle: string, tags: string[] = []) {
  const note: Note = {
    title: noteTitle,
    localId: crypto.randomUUID(),
    createdAt: new Date(),
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
              tags: updatedTags || note.tags
            });
            note.title = updatedTitle;
            if (updatedTags !== undefined) {
              note.tags = updatedTags;
            }
            note.localEditSynced = undefined;
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
      await editOfflineNote(matchingUnsyncedLocalNote);
      logger.sync('Updated local note with server ID', { localId: matchingUnsyncedLocalNote.localId, serverId: serverNote._id });
    } else {
      serverNote.localId = crypto.randomUUID();
      // Ensure the server note has a tags array if it doesn't
      if (!serverNote.tags) {
        serverNote.tags = [];
      }
      await storeOfflineNote(serverNote);
      logger.sync('New server note stored locally', { serverId: serverNote._id, newLocalId: serverNote.localId });
    }
  }
}

export async function updateEditedNote(serverNote: Note, localNotes: Note[]) {
  const matchingLocalNote = localNotes.find((localNote: Note) => localNote._id === serverNote._id);
  if (matchingLocalNote !== undefined) {
    if (matchingLocalNote.localEditSynced === false) {
      await axios.put(`/api/edit-note?id=${matchingLocalNote._id}`, {
        title: matchingLocalNote.title,
        tags: matchingLocalNote.tags || [] // Ensure tags is always sent
      });
      matchingLocalNote.localEditSynced = undefined;
      await editOfflineNote(matchingLocalNote);
      logger.sync('Synced pending local edits to server', { id: matchingLocalNote._id });
    } else if (matchingLocalNote.localEditSynced === undefined) {
      matchingLocalNote.title = serverNote.title;
      // Only replace tags if server note has tags defined
      // This prevents tags from being lost if the server response doesn't include them
      if (serverNote.tags !== undefined) {
        matchingLocalNote.tags = serverNote.tags;
      }
      await editOfflineNote(matchingLocalNote);
      logger.sync('Updated local note with server changes', { id: matchingLocalNote._id });
    }
  }
}

export async function updateDeletedNote(serverId: number, localNotes: Note[]) {
  const matchingLocalNote = localNotes.find((localNote: Note) => localNote._id === serverId);
  if (matchingLocalNote !== undefined) {
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

      for (const localNote of localNotes) {
        if (localNote.localDeleteSynced === false) {
          const matchingServerNote = serverNotes.find((serverNote: Note) => localNote._id === serverNote._id);
          if (matchingServerNote !== undefined) {
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

      logger.success('Note synchronization completed successfully');
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