import React, { useState } from 'react';
import styled from 'styled-components';
import { Note } from '@/utils/notes';
import { Button } from '@/styles/styled';

const NoteItemContainer = styled.li`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
  width: 100%;
`;

const NoteTitle = styled.p`
  margin: 0;
  font-size: 1rem;
  word-break: break-word;
`;

const ButtonContainer = styled.div`
  display: flex;
  margin-top: 1rem;
  justify-content: flex-end;
`;

const ActionButton = styled(Button)`
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
`;

const EditForm = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
`;

const EditInput = styled.textarea`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  resize: vertical;
`;

const TagsInput = styled.input`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  background-color: #e0e0e0;
  padding: 0.2rem 0.5rem;
  margin: 0.2rem;
  border-radius: 3px;
  font-size: 0.8rem;
`;

interface NoteItemProps {
  note: Note;
  onDeleteNote: (id: string) => void;
  onEditNote: (id: string, updatedTitle: string, updatedTags?: string[]) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onDeleteNote, onEditNote }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [updatedTitle, setUpdatedTitle] = useState(note.title);
  const [updatedTagsString, setUpdatedTagsString] = useState(note.tags?.join(', ') || '');

  const handleEditClick = () => {
    setIsEditing(true);
    setUpdatedTitle(note.title);
    setUpdatedTagsString(note.tags?.join(', ') || '');
  };

  const handleSaveClick = () => {
    if (updatedTitle.trim() === '') {
      return;
    }

    // Parse tags from the comma-separated string
    const updatedTags = updatedTagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '');

    onEditNote(note.localId!, updatedTitle, updatedTags);
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  return (
      <NoteItemContainer>
        {!isEditing ? (
            <>
              <NoteTitle>{note.title}</NoteTitle>
              {note.tags && note.tags.length > 0 && (
                  <TagsContainer>
                    {note.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                    ))}
                  </TagsContainer>
              )}
              <ButtonContainer>
                <ActionButton onClick={() => onDeleteNote(note.localId!)}>Delete</ActionButton>
                <ActionButton onClick={handleEditClick}>Edit</ActionButton>
              </ButtonContainer>
            </>
        ) : (
            <EditForm>
              <EditInput
                  value={updatedTitle}
                  onChange={(e) => setUpdatedTitle(e.target.value)}
                  rows={3}
              />
              <TagsInput
                  value={updatedTagsString}
                  onChange={(e) => setUpdatedTagsString(e.target.value)}
                  placeholder="Tags (comma separated)"
              />
              <ButtonContainer>
                <ActionButton onClick={handleCancelClick}>Cancel</ActionButton>
                <ActionButton onClick={handleSaveClick}>Save</ActionButton>
              </ButtonContainer>
            </EditForm>
        )}
      </NoteItemContainer>
  );
};

export default NoteItem;