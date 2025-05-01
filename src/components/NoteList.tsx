import { useCallback, useEffect, useState } from 'react';
import { Container, Heading } from '@/styles/styled';
import { SpinnerContainer } from './LoadingSpinner';
import { Note,
    createNote, submitNote, deleteNote, editNote, refreshNotes, getNotes,
} from '@/utils/notes'

import styled from 'styled-components';

import NoteForm from './NoteForm';
import NoteItem from './NoteItem';
import OfflineIndicator from './OfflineIndicator';

const NotesContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const NoteListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90%; /* Adjust the width to a percentage value */
  margin: auto; /* Add margin: auto to center the wrapper */
`;

const NoteListLoadingSpinner = styled(SpinnerContainer)`
  margin-top: 20px;
  margin-bottom: 10px;
`;

export default function NoteList() {
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);

    const handleNoteSubmit = useCallback(async (noteTitle: string, tags: string[] = []) => {
        const note: Note = createNote(noteTitle, tags);
        await submitNote(note);
        setAllNotes(await getNotes());
    }, []);

    const handleNoteDelete = useCallback(async (noteId: string) => {
        await deleteNote(noteId);
        setAllNotes(await getNotes());
    }, []);

    const handleEditNote = useCallback(async (noteId: string, updatedTitle: string, updatedTags?: string[]) => {
        await editNote(noteId, updatedTitle, updatedTags);
        setAllNotes(await getNotes());
    }, []);

    const fetchNotes = useCallback(async () => {
        setLoading(true);

        try {
            await refreshNotes();
            setAllNotes(await getNotes());
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { type: 'module' })
                .then((registration:any) => {
                    console.log('Service Worker registered:', registration);

                    // Listen for the "online" event to trigger sync
                    window.addEventListener('online', async () => {
                        // Check if the sync API is available before trying to use it
                        if (registration.sync && typeof registration.sync.register === 'function') {
                            try {
                                await registration.sync.register('sync-notes');
                                console.log('Sync event registered');
                            } catch (error) {
                                console.error('Sync event registration failed:', error);
                                // Fallback to manual refresh if sync fails
                                await fetchNotes();
                            }
                        } else {
                            console.log('Background Sync API not available, using manual sync');
                            // Fallback for browsers that don't support Background Sync API
                            await fetchNotes();
                        }
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        // Add a backup online listener to ensure notes are refreshed
        // This is separate from the service worker sync to ensure we always sync
        window.addEventListener('online', async () => {
            console.log('Device is back online, refreshing notes');
            await fetchNotes();
        });

        return () => {
            // Clean up event listener on component unmount
            window.removeEventListener('online', fetchNotes);
        };
    }, [fetchNotes]);

    return (
        <NotesContainer>
            <Heading>Notes</Heading>
            <NoteListWrapper>
                <NoteForm onNoteSubmit={handleNoteSubmit} />
                {loading && <NoteListLoadingSpinner />}
                <ul>
                    {allNotes.map((note, index) => (
                        <NoteItem key={index} note={note} onDeleteNote={handleNoteDelete} onEditNote={handleEditNote} />
                    ))}
                </ul>
            </NoteListWrapper>
            <OfflineIndicator />
        </NotesContainer>
    );
}