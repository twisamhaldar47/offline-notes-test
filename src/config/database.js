import { Sequelize } from 'sequelize';
import logger from '../utils/logger';


const sequelize = new Sequelize({
    database: 'notes',
    username: 'postgres',
    password: '56ajkb67t6uyv%&%$#',
    host: '82.180.144.162',
    port: 5432,
    dialect: 'postgres',
    logging: (msg) => logger.db(msg) // Use our custom logger instead of console.log
});


const testConnection = async () => {
    try {
        await sequelize.authenticate();
        logger.success('Database connection established successfully');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
    }
};


testConnection();

export default sequelize;