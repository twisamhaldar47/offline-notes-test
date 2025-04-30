// src/models/Note.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

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
    }
}, {
    timestamps: true, // This adds updatedAt field automatically
    updatedAt: true,  // Include updatedAt field
    createdAt: false  // Don't add a second createdAt field
});

// Initialize the model (creates the table if it doesn't exist)
export const initializeModel = async () => {
    try {
        await Note.sync();
        console.log('Note model synchronized successfully');
    } catch (error) {
        console.error('Failed to synchronize Note model:', error);
    }
};

export default Note;