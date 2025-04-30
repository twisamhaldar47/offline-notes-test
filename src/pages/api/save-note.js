import Note, { initializeModel } from '../../models/Note';
import sequelize from '../../config/database';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const noteData = req.body;

      // Basic validation (optional, but good practice)
      if (!noteData || !noteData.title || !noteData.localId || !noteData.createdAt) {
        return res.status(400).json({ error: 'Invalid note data' });
      }
      await initializeModel();

      // TODO: Implement logic to save the note to your chosen data store.
      // - Connect to the database/data source.
      // - Save the noteData object.
      // - Retrieve the unique identifier assigned by the data store (e.g., MongoDB _id, SQL primary key).
      // - Replace the example response below with the actual assigned identifier.
      const savedNote = await Note.create({
        localId: noteData.localId,
        title: noteData.title,
        createdAt: new Date(noteData.createdAt)
      });
      // const insertedId = noteData.localId; // Placeholder: Use localId as temporary example ID

      // Respond with the identifier the client expects
      res.status(200).json({ insertedId: savedNote.id });
    } catch (error) {
      console.error('Error saving note:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Note with this localId already exists' });
      }
      res.status(500).json({ error: 'Failed to save note' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}