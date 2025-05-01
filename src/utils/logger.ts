

// Log levels
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warn',
    ERROR = 'error',
    DATABASE = 'database',
    SYNC = 'sync'
}

// Configuration options for logging
interface LogConfig {
    enableColors: boolean;
    minLevel: LogLevel | null; // null means log everything
    showTimestamp: boolean;
    showLogLevel: boolean;
    enabledCategories: LogLevel[];
}

// Default configuration
const defaultConfig: LogConfig = {
    enableColors: true,
    minLevel: null,
    showTimestamp: true,
    showLogLevel: true,
    enabledCategories: Object.values(LogLevel)
};

// Current configuration
let config: LogConfig = { ...defaultConfig };

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

// Icons for different log levels (emoji or text symbols)
const icons = {
    [LogLevel.DEBUG]: '🔍',
    [LogLevel.INFO]: 'ℹ️',
    [LogLevel.SUCCESS]: '✅',
    [LogLevel.WARNING]: '⚠️',
    [LogLevel.ERROR]: '❌',
    [LogLevel.DATABASE]: '🗃️',
    [LogLevel.SYNC]: '🔄'
};

/**
 * Detects if the code is running in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Formats the current timestamp
 */
const getTimestamp = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

/**
 * Main logging function
 */
const log = (level: LogLevel, message: string, ...args: any[]): void => {
    // Check if this log level should be shown based on config
    if (config.minLevel && Object.values(LogLevel).indexOf(level) < Object.values(LogLevel).indexOf(config.minLevel)) {
        return;
    }

    if (!config.enabledCategories.includes(level)) {
        return;
    }

    // Build the log prefix
    let prefix = '';

    if (config.showTimestamp) {
        prefix += `[${getTimestamp()}] `;
    }

    if (config.showLogLevel) {
        prefix += `${icons[level]} ${level.toUpperCase()} `;
    }

    // Determine which console method to use
    let consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log';
    switch (level) {
        case LogLevel.ERROR:
            consoleMethod = 'error';
            break;
        case LogLevel.WARNING:
            consoleMethod = 'warn';
            break;
        case LogLevel.INFO:
        case LogLevel.SUCCESS:
            consoleMethod = 'info';
            break;
    }

    // Apply colors if enabled and in browser
    if (config.enableColors && isBrowser) {
        // Check for dark mode only in browser
        const isDarkMode = isBrowser && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        console[consoleMethod](
            `%c${prefix}%c${message}`,
            `color: ${colors[level]}; font-weight: bold;`,
            'color: inherit;',
            ...args
        );
    } else if (config.enableColors && !isBrowser) {
        // Server-side with colors (Node.js)
        // Use simple ANSI color codes for terminal
        const ansiColors = {
            [LogLevel.DEBUG]: '\x1b[90m',    // Gray
            [LogLevel.INFO]: '\x1b[34m',     // Blue
            [LogLevel.SUCCESS]: '\x1b[32m',  // Green
            [LogLevel.WARNING]: '\x1b[33m',  // Yellow
            [LogLevel.ERROR]: '\x1b[31m',    // Red
            [LogLevel.DATABASE]: '\x1b[35m', // Purple
            [LogLevel.SYNC]: '\x1b[33m'      // Orange (using yellow as fallback)
        };

        console[consoleMethod](
            `${ansiColors[level]}${prefix}\x1b[0m${message}`,
            ...args
        );
    } else {
        // No colors (either disabled or not supported)
        console[consoleMethod](prefix + message, ...args);
    }
};

// Export individual log level methods
const logger = {
    debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
    info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
    success: (message: string, ...args: any[]) => log(LogLevel.SUCCESS, message, ...args),
    warn: (message: string, ...args: any[]) => log(LogLevel.WARNING, message, ...args),
    error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
    db: (message: string, ...args: any[]) => log(LogLevel.DATABASE, message, ...args),
    sync: (message: string, ...args: any[]) => log(LogLevel.SYNC, message, ...args),

    // Configuration
    configure: (newConfig: Partial<LogConfig>) => {
        config = { ...config, ...newConfig };
        return logger;
    },

    // Enable/disable specific log categories
    enableCategory: (category: LogLevel) => {
        if (!config.enabledCategories.includes(category)) {
            config.enabledCategories.push(category);
        }
        return logger;
    },

    disableCategory: (category: LogLevel) => {
        config.enabledCategories = config.enabledCategories.filter(c => c !== category);
        return logger;
    },

    // Get current config
    getConfig: () => ({ ...config })
};

export default logger;