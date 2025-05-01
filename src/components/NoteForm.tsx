import React, { useState, ChangeEvent } from 'react';
import styled from 'styled-components';
import { LoadingSpinner } from './LoadingSpinner'
import { Button } from '@/styles/styled';

const NoteFormContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: center;
  width: 100%;
`;

const InputsContainer = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
`;

const NoteInput = styled.textarea`
  height: 100px;
  resize: vertical;
  margin-right: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  flex-grow: 1;
`;

const TagInput = styled.input`
  margin-top: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
`;

const AddNoteButton = styled(Button)`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 1rem;
`;

interface NoteFormProps {
  onNoteSubmit: (noteTitle: string, tags: string[]) => Promise<void>;
}

const NoteForm: React.FC<NoteFormProps> = ({ onNoteSubmit }) => {
  const [isSyncing, setSyncing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleNoteTitleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNoteTitle(event.target.value);
  };

  const handleTagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteTitle.trim() === '') {
      return;
    }

    // Parse tags - split by commas and trim whitespace
    const tags = tagInput.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

    setSyncing(true);
    await onNoteSubmit(noteTitle, tags);
    setSyncing(false);
    setNoteTitle('');
    setTagInput('');
  };

  return (
      <NoteFormContainer onSubmit={handleSubmit}>
        <InputsContainer>
          <NoteInput
              rows={3}
              value={noteTitle}
              onChange={handleNoteTitleChange}
              placeholder="Enter your note..."
          />
          <AddNoteButton type="submit">
            {isSyncing ? <LoadingSpinner/> : "Add Note" }
          </AddNoteButton>
        </InputsContainer>
        <TagInput
            type="text"
            value={tagInput}
            onChange={handleTagInputChange}
            placeholder="Add tags separated by commas (e.g. work, important, todo)"
        />
      </NoteFormContainer>
  );
};

export default NoteForm;