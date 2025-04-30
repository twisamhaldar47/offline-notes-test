import Note, { initializeModel } from '../../models/Note';
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // TODO: Implement logic to fetch notes from your chosen data store (e.g., MongoDB, PostgreSQL, JSON file).
      // - Connect to the database/data source.
      // - Fetch all notes.
      // - Consider sorting notes, e.g., by creation date (descending).
      // - Replace the example response below with the actual notes.

      await initializeModel();

      // Fetch all notes from the database
      const notes = await Note.findAll({
        order: [['createdAt', 'DESC']] // Order by createdAt in descending order
      });

      // Format the response to match the expected Note interface
      const formattedNotes = notes.map(note => ({
        _id: note.id,
        localId: note.localId,
        title: note.title,
        createdAt: note.createdAt
      }));


      // const notes = []; // Example empty array

      res.status(200).json(formattedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}