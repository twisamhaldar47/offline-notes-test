import React, { useState, useMemo, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTagContext } from '@/contexts/TagContext';
import { Note } from '@/utils/notes';

const FilterContainer = styled.div`
  margin: 1rem 0;
  width: 100%;
  position: relative;
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #555;
`;

const DropdownButton = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.6rem 1rem;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  text-align: left;
  transition: border-color 0.2s;

  &:hover {
    border-color: #0d6efd;
  }

  &:focus {
    outline: none;
    border-color: #0d6efd;
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
  }
`;

const DropdownIcon = styled.span<{ isOpen: boolean }>`
  transform: ${props => (props.isOpen ? 'rotate(180deg)' : 'rotate(0)')};
  transition: transform 0.2s;
  margin-left: 8px;
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 0.25rem;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: ${props => (props.isOpen ? 'block' : 'none')};
`;

const DropdownItem = styled.div`
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #f8f9fa;
  }
`;

const CheckboxInput = styled.input`
  margin-right: 0.5rem;
`;

const TagLabel = styled.span`
  font-size: 0.9rem;
`;

const SelectedTagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
`;

const SelectedTag = styled.span`
  background-color: #e7f1ff;
  border: 1px solid #b8daff;
  color: #0d6efd;
  border-radius: 16px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
`;

const RemoveTagButton = styled.button`
  background: none;
  border: none;
  color: #0d6efd;
  margin-left: 0.3rem;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  width: 16px;
  border-radius: 50%;

  &:hover {
    background-color: #d1e7ff;
  }
`;

const NoTagsMessage = styled.p`
  color: #888;
  font-size: 0.9rem;
  font-style: italic;
  padding: 0.5rem 1rem;
  margin: 0;
`;

const ClearAllButton = styled.button`
  background: none;
  border: none;
  color: #0d6efd;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }

  &:disabled {
    color: #ccc;
    cursor: default;
    &:hover {
      text-decoration: none;
    }
  }
`;

const DropdownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #eee;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  margin: 0.5rem 1rem;
  box-sizing: border-box;
  width: calc(100% - 2rem);
`;

interface TagFilterProps {
    notes: Note[];
}

const TagFilter: React.FC<TagFilterProps> = ({ notes }) => {
    const { selectedTags, toggleTag, clearAllTags, isTagSelected } = useTagContext();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Extract all unique tags from notes
    const availableTags = useMemo(() => {
        const tagSet = new Set<string>();

        notes.forEach(note => {
            if (note.tags && note.tags.length > 0) {
                note.tags.forEach(tag => tagSet.add(tag));
            }
        });

        return Array.from(tagSet).sort();
    }, [notes]);

    // Filter tags based on search query
    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return availableTags;

        return availableTags.filter(tag =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [availableTags, searchQuery]);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => setIsOpen(prev => !prev);

    // Display text for the dropdown button
    const dropdownText = selectedTags.length
        ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
        : 'Filter by tags';

    return (
        <FilterContainer ref={dropdownRef}>
            <FilterHeader>
                <FilterTitle>Filter Notes</FilterTitle>
                <ClearAllButton
                    onClick={() => {
                        clearAllTags();
                        setIsOpen(false);
                    }}
                    disabled={selectedTags.length === 0}
                >
                    Clear All
                </ClearAllButton>
            </FilterHeader>

            <DropdownButton onClick={toggleDropdown}>
                {dropdownText}
                <DropdownIcon isOpen={isOpen}>▼</DropdownIcon>
            </DropdownButton>

            {selectedTags.length > 0 && (
                <SelectedTagsContainer>
                    {selectedTags.map(tag => (
                        <SelectedTag key={tag}>
                            {tag}
                            <RemoveTagButton onClick={() => toggleTag(tag)}>×</RemoveTagButton>
                        </SelectedTag>
                    ))}
                </SelectedTagsContainer>
            )}

            <DropdownMenu isOpen={isOpen}>
                <DropdownHeader>
                    <span>Select tags to filter</span>
                </DropdownHeader>

                {availableTags.length > 5 && (
                    <SearchInput
                        type="text"
                        placeholder="Search tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}

                {filteredTags.length > 0 ? (
                    filteredTags.map(tag => (
                        <DropdownItem key={tag} onClick={() => toggleTag(tag)}>
                            <CheckboxInput
                                type="checkbox"
                                checked={isTagSelected(tag)}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <TagLabel>{tag}</TagLabel>
                        </DropdownItem>
                    ))
                ) : (
                    searchQuery ? (
                        <NoTagsMessage>No matching tags found</NoTagsMessage>
                    ) : (
                        <NoTagsMessage>No tags available</NoTagsMessage>
                    )
                )}
            </DropdownMenu>
        </FilterContainer>
    );
};

export default TagFilter;