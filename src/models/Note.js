import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import logger from '../utils/logger';

const Note = sequelize.define('Note', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    localId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    }
}, {
    timestamps: true, // This adds updatedAt field automatically
    updatedAt: true,  // Include updatedAt field
    createdAt: false, // Don't add a second createdAt field
    logging: (msg) => logger.db(msg)
});

// Initialize the model (creates the table if it doesn't exist)
export const initializeModel = async () => {
    try {
        await Note.sync();
        logger.success('Note model synchronized successfully');
    } catch (error) {
        logger.error('Failed to synchronize Note model:', error);
    }
};

export default Note;