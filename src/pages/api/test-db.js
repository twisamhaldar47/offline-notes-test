
import { testConnection } from '../../config/database';

export default async function handler(req, res) {
    try {
        const connected = await testConnection();

        if (connected) {
            return res.status(200).json({ message: 'Database connection successful!' });
        } else {
            return res.status(500).json({ message: 'Failed to connect to database' });
        }
    } catch (error) {
        console.error('Database connection test error:', error);
        return res.status(500).json({
            message: 'Database connection test error',
            error: error.message
        });
    }
}