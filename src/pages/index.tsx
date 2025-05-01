import { useEffect } from 'react';
import Head from 'next/head';
import NoteList from '../components/NoteList';
import { openDB } from '../../public/indexeddb';
import LoggerConfig from '../components/LoggerConfig';
import logger from '../utils/logger';

export default function Home() {
  useEffect(() => {
    // Initialize IndexedDB when the app loads
    const initializeDB = async () => {
      try {
        await openDB();
        logger.success('IndexedDB initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize IndexedDB:', error);
      }
    };

    initializeDB();

    // Log initial app state
    logger.info('Notes app started', {
      timestamp: new Date().toISOString(),
      online: navigator.onLine
    });

    // Register online/offline event listeners
    const handleOnline = () => {
      logger.info('Device is now online 🌐');
    };

    const handleOffline = () => {
      logger.warn('Device is now offline 📴');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
      <>
        <Head>
          <title>Offline Notes App</title>
          <meta name="description" content="Create notes that work offline" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
          <NoteList />
          <LoggerConfig />
        </main>
      </>
  );
}