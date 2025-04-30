// src/config/database.js
import { Sequelize } from 'sequelize';

// Database connection configuration with hardcoded values
const sequelize = new Sequelize(
    'notes', // database name
    'postgres',      // username
    '56ajkb67t6uyv%&%$#',      // password
    {
        host: '82.180.144.162',
        port: 5432,
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: {
            ssl: false
        }
    }
);

// Test connection function
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection to the database has been established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};

export default sequelize;