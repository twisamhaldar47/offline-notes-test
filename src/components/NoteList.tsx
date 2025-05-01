import { useCallback, useEffect, useState, useMemo } from 'react';
import { Container, Heading } from '@/styles/styled';
import { SpinnerContainer } from './LoadingSpinner';
import { Note,
    createNote, submitNote, deleteNote, editNote, refreshNotes, getNotes,
} from '@/utils/notes';
import { useTagContext } from '@/contexts/TagContext';

import styled from 'styled-components';

import NoteForm from './NoteForm';
import NoteItem from './NoteItem';
import TagFilter from './TagFilter';
import OfflineIndicator from './OfflineIndicator';
import logger from '@/utils/logger';

const NotesContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 2rem;
`;

const NoteListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90%;
  margin: auto;
`;

const NoteListLoadingSpinner = styled(SpinnerContainer)`
  margin-top: 20px;
  margin-bottom: 10px;
`;

const FilterInfo = styled.div`
  width: 100%;
  padding: 0.5rem 1rem;
  margin: 0.75rem 0;
  background-color: #f8f9fa;
  border-left: 3px solid #0d6efd;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
`;

const FilterCount = styled.span`
  font-weight: bold;
  color: #0d6efd;
`;

const NoNotesMessage = styled.div`
  color: #6c757d;
  font-style: italic;
  margin: 2rem 0;
  text-align: center;
  padding: 2rem;
  border: 1px dashed #dee2e6;
  border-radius: 8px;
  width: 100%;
`;

const EmptyStateIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #adb5bd;
`;

const NotesList = styled.ul`
  width: 100%;
  padding: 0;
  list-style-type: none;
`;

export default function NoteList() {
    const [allNotes, setAllNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const { selectedTags } = useTagContext();

    // Filter notes based on selected tags
    const filteredNotes = useMemo(() => {
        if (selectedTags.length === 0) {
            return allNotes; // No filter applied
        }

        return allNotes.filter(note => {
            if (!note.tags || note.tags.length === 0) {
                return false; // Note has no tags
            }

            // Check if the note has at least one of the selected tags
            return selectedTags.some(tag => note.tags?.includes(tag));
        });
    }, [allNotes, selectedTags]);

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
            logger.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { type: 'module' })
                .then((registration:any) => {
                    logger.info('Service Worker registered:', registration);

                    // Listen for the "online" event to trigger sync
                    window.addEventListener('online', async () => {
                        // Check if the sync API is available before trying to use it
                        if (registration.sync && typeof registration.sync.register === 'function') {
                            try {
                                await registration.sync.register('sync-notes');
                                logger.sync('Sync event registered');
                            } catch (error) {
                                logger.error('Sync event registration failed:', error);
                                // Fallback to manual refresh if sync fails
                                await fetchNotes();
                            }
                        } else {
                            logger.info('Background Sync API not available, using manual sync');
                            // Fallback for browsers that don't support Background Sync API
                            await fetchNotes();
                        }
                    });
                })
                .catch((error) => {
                    logger.error('Service Worker registration failed:', error);
                });
        }

        // Add a backup online listener to ensure notes are refreshed
        // This is separate from the service worker sync to ensure we always sync
        window.addEventListener('online', async () => {
            logger.info('Device is back online, refreshing notes');
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

                {/* Tag Filter Dropdown */}
                <TagFilter notes={allNotes} />

                {/* Filter information message */}
                {selectedTags.length > 0 && (
                    <FilterInfo>
                        <FilterCount>{filteredNotes.length}</FilterCount> {filteredNotes.length === 1 ? 'note' : 'notes'} found matching the selected {selectedTags.length === 1 ? 'tag' : 'tags'}
                    </FilterInfo>
                )}

                {loading && <NoteListLoadingSpinner />}

                {!loading && allNotes.length === 0 && (
                    <NoNotesMessage>
                        <EmptyStateIcon>📝</EmptyStateIcon>
                        <p>No notes yet. Create your first note above!</p>
                    </NoNotesMessage>
                )}

                {!loading && allNotes.length > 0 && filteredNotes.length === 0 && selectedTags.length > 0 && (
                    <NoNotesMessage>
                        <EmptyStateIcon>🔍</EmptyStateIcon>
                        <p>No notes found matching the selected tags.</p>
                    </NoNotesMessage>
                )}

                {filteredNotes.length > 0 && (
                    <NotesList>
                        {filteredNotes.map((note, index) => (
                            <NoteItem
                                key={note.localId || index}
                                note={note}
                                onDeleteNote={handleNoteDelete}
                                onEditNote={handleEditNote}
                            />
                        ))}
                    </NotesList>
                )}
            </NoteListWrapper>
            <OfflineIndicator />
        </NotesContainer>
    );
}