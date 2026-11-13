import dotenv from 'dotenv';
import { app } from './app.js';
import { getDb } from './database/index.js';

// Load environment variables from .env if present
dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // 1. Initialise database and seed data if needed
    console.log('📦 Initialisation de la base de données SQLite...');
    await getDb();

    // 2. Start HTTP server on all interfaces (0.0.0.0)
    const server = app.listen(PORT, HOST, () => {
      console.log('='.repeat(60));
      console.log(`🚀 Serveur Élan API en écoute sur TOUTES les interfaces (0.0.0.0) :`);
      console.log(`   - En local      : http://localhost:${PORT}`);
      console.log(`   - Sur le réseau : http://${HOST}:${PORT}`);
      console.log(`📡 Logging des requêtes activé en temps réel.`);
      console.log(`   - Health check  : http://localhost:${PORT}/api/health`);
      console.log('='.repeat(60));
    });

    const shutdown = () => {
      console.log('\n🛑 Arrêt du serveur Élan API...');
      server.close(() => {
        console.log('✅ Serveur arrêté proprement.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Échec critique lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

bootstrap();
