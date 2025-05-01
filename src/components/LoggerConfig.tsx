import React, { useState } from 'react';
import styled from 'styled-components';
import logger, { LogLevel } from '../utils/logger';

const ConfigContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  max-width: 300px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const ConfigButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #0d6efd;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  font-size: 18px;

  &:hover {
    background-color: #0b5ed7;
  }
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  cursor: pointer;
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
  background-color: ${props => props.color};
`;

const OptionTitle = styled.h4`
  margin: 10px 0 5px;
  font-size: 14px;
  color: #6c757d;
`;

// Color codes for different log levels
const colors = {
    [LogLevel.DEBUG]: '#6c757d',    // Gray
    [LogLevel.INFO]: '#0d6efd',     // Blue
    [LogLevel.SUCCESS]: '#198754',  // Green
    [LogLevel.WARNING]: '#ffc107',  // Yellow
    [LogLevel.ERROR]: '#dc3545',    // Red
    [LogLevel.DATABASE]: '#6610f2', // Purple
    [LogLevel.SYNC]: '#fd7e14'      // Orange
};

const LoggerConfig: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState(logger.getConfig());

    // Toggle a specific log category
    const toggleCategory = (category: LogLevel) => {
        const isEnabled = config.enabledCategories.includes(category);

        if (isEnabled) {
            logger.disableCategory(category);
        } else {
            logger.enableCategory(category);
        }

        setConfig(logger.getConfig());
    };

    // Toggle all log categories
    const toggleAllCategories = (enable: boolean) => {
        const allCategories = Object.values(LogLevel);

        if (enable) {
            // Enable all categories
            allCategories.forEach(category => logger.enableCategory(category));
        } else {
            // Disable all categories except ERROR
            allCategories.forEach(category => {
                if (category !== LogLevel.ERROR) {
                    logger.disableCategory(category);
                }
            });
        }

        setConfig(logger.getConfig());
    };

    // Toggle timestamp display
    const toggleTimestamp = () => {
        logger.configure({ showTimestamp: !config.showTimestamp });
        setConfig(logger.getConfig());
    };

    // Toggle color display
    const toggleColors = () => {
        logger.configure({ enableColors: !config.enableColors });
        setConfig(logger.getConfig());
    };

    return (
        <>
            {!isOpen && (
                <ConfigButton onClick={() => setIsOpen(true)}>🔧</ConfigButton>
            )}

            {isOpen && (
                <ConfigContainer>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>Logger Settings</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>

                    <OptionTitle>General Options</OptionTitle>
                    <ToggleLabel>
                        <input
                            type="checkbox"
                            checked={config.showTimestamp}
                            onChange={toggleTimestamp}
                            style={{ marginRight: '5px' }}
                        />
                        Show timestamps
                    </ToggleLabel>

                    <ToggleLabel>
                        <input
                            type="checkbox"
                            checked={config.enableColors}
                            onChange={toggleColors}
                            style={{ marginRight: '5px' }}
                        />
                        Enable colors
                    </ToggleLabel>

                    <OptionTitle>Log Categories</OptionTitle>
                    <div style={{ marginBottom: '5px' }}>
                        <button
                            onClick={() => toggleAllCategories(true)}
                            style={{ marginRight: '5px', fontSize: '12px' }}
                        >
                            Enable All
                        </button>
                        <button
                            onClick={() => toggleAllCategories(false)}
                            style={{ fontSize: '12px' }}
                        >
                            Disable All
                        </button>
                    </div>

                    {Object.values(LogLevel).map((category) => (
                        <ToggleLabel key={category}>
                            <input
                                type="checkbox"
                                checked={config.enabledCategories.includes(category)}
                                onChange={() => toggleCategory(category)}
                                style={{ marginRight: '5px' }}
                            />
                            <CategoryBadge color={colors[category]} />
                            {category.toUpperCase()}
                        </ToggleLabel>
                    ))}
                </ConfigContainer>
            )}
        </>
    );
};

export default LoggerConfig;