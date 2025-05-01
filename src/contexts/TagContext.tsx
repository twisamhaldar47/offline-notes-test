import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface TagContextType {
    selectedTags: string[];
    toggleTag: (tag: string) => void;
    clearAllTags: () => void;
    isTagSelected: (tag: string) => boolean;
}


const TagContext = createContext<TagContextType>({
    selectedTags: [],
    toggleTag: () => {},
    clearAllTags: () => {},
    isTagSelected: () => false,
});


export const useTagContext = () => useContext(TagContext);

interface TagProviderProps {
    children: ReactNode;
}

export const TagProvider: React.FC<TagProviderProps> = ({ children }) => {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);


    const toggleTag = useCallback((tag: string) => {
        setSelectedTags(prevTags => {
            if (prevTags.includes(tag)) {
                return prevTags.filter(t => t !== tag);
            } else {
                return [...prevTags, tag];
            }
        });
    }, []);


    const clearAllTags = useCallback(() => {
        setSelectedTags([]);
    }, []);


    const isTagSelected = useCallback(
        (tag: string) => selectedTags.includes(tag),
        [selectedTags]
    );

    const value = {
        selectedTags,
        toggleTag,
        clearAllTags,
        isTagSelected,
    };

    return <TagContext.Provider value={value}>{children}</TagContext.Provider>;
};