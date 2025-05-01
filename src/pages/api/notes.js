import Note, { initializeModel } from '../../models/Note';
import logger from '../../utils/logger';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await initializeModel();


      const notes = await Note.findAll({
        order: [['createdAt', 'DESC']]
      });


      const formattedNotes = notes.map(note => {
        return {
          _id: note.id,
          localId: note.localId,
          title: note.title,
          createdAt: note.createdAt,
          tags: note.tags || []
        };
      });

      logger.info(`API: Retrieved ${notes.length} notes`);
      res.status(200).json(formattedNotes);
    } catch (error) {
      logger.error('API: Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}