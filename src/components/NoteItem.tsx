import React, { useState } from 'react';
import styled from 'styled-components';
import { Note } from '@/utils/notes';
import { Button } from '@/styles/styled';

const NoteItemContainer = styled.li`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background-color: #fff;
  width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
`;

const NoteTitle = styled.p`
  margin: 0;
  font-size: 1rem;
  word-break: break-word;
  line-height: 1.5;
`;

const ButtonContainer = styled.div`
  display: flex;
  margin-top: 1rem;
  justify-content: flex-end;
`;

const ActionButton = styled(Button)`
  margin-left: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
`;

const EditForm = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
`;

const EditInput = styled.textarea`
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  resize: vertical;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
  min-height: 100px;
  
  &:focus {
    outline: none;
    border-color: #0d6efd;
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
  }
`;

const TagsInput = styled.input`
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.95rem;
  
  &:focus {
    outline: none;
    border-color: #0d6efd;
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.75rem;
`;

const Tag = styled.span`
  background-color: #e7f1ff;
  border: 1px solid #b8daff;
  color: #0d6efd;
  border-radius: 16px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
`;

const TagsLabel = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
`;

const EditFormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EditHint = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
  font-style: italic;
`;

const NoteItemHeader = styled.div`
  display: flex;
  flex-direction: column;
`;

const NoteTimestamp = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
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

  // Format the date to a more readable format
  const formattedDate = new Date(note.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
      <NoteItemContainer>
        {!isEditing ? (
            <>
              <NoteItemHeader>
                <NoteTitle>{note.title}</NoteTitle>
                <NoteTimestamp>{formattedDate}</NoteTimestamp>
              </NoteItemHeader>

              {note.tags && note.tags.length > 0 && (
                  <>
                    <TagsLabel>Tags</TagsLabel>
                    <TagsContainer>
                      {note.tags.map((tag, index) => (
                          <Tag key={index}>{tag}</Tag>
                      ))}
                    </TagsContainer>
                  </>
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
                  placeholder="Note content"
              />
              <TagsInput
                  value={updatedTagsString}
                  onChange={(e) => setUpdatedTagsString(e.target.value)}
                  placeholder="Tags (comma separated, e.g.: work, important, todo)"
              />
              <EditFormFooter>
                <EditHint>Separate tags with commas</EditHint>
                <ButtonContainer>
                  <ActionButton onClick={handleCancelClick}>Cancel</ActionButton>
                  <ActionButton onClick={handleSaveClick}>Save</ActionButton>
                </ButtonContainer>
              </EditFormFooter>
            </EditForm>
        )}
      </NoteItemContainer>
  );
};

export default NoteItem;