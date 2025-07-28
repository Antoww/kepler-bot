// Script de migration de MySQL vers Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import mysql from 'npm:mysql2@^3.9.2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuration MySQL (ancienne base)
const mysqlConfig = {
    host: Deno.env.get('DB_HOST') || 'localhost',
    port: parseInt(Deno.env.get('DB_PORT') || '3306'),
    user: Deno.env.get('DB_USER') || 'kepler_bot',
    password: Deno.env.get('DB_PASSWORD') || 'kepler_password',
    database: Deno.env.get('DB_NAME') || 'kepler_bot_db'
};

// Configuration Supabase (nouvelle base)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_KEY');

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variables d\'environnement SUPABASE_URL et SUPABASE_KEY requises');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
    console.log('🚀 Début de la migration vers Supabase...');
    
    try {
        // Connexion à MySQL
        console.log('📡 Connexion à MySQL...');
        const mysqlConnection = await mysql.createConnection(mysqlConfig);
        
        // Migration des rappels
        console.log('📋 Migration des rappels...');
        const [reminders] = await mysqlConnection.execute('SELECT * FROM reminders');
        
        if (reminders.length > 0) {
            const { error: remindersError } = await supabase
                .from('reminders')
                .insert(reminders);
                
            if (remindersError) {
                console.error('❌ Erreur lors de la migration des rappels:', remindersError);
            } else {
                console.log(`✅ ${reminders.length} rappels migrés avec succès`);
            }
        } else {
            console.log('ℹ️ Aucun rappel à migrer');
        }
        
        // Migration des configurations de serveur
        console.log('⚙️ Migration des configurations de serveur...');
        const [serverConfigs] = await mysqlConnection.execute('SELECT * FROM server_configs');
        
        if (serverConfigs.length > 0) {
            const { error: configsError } = await supabase
                .from('server_configs')
                .insert(serverConfigs);
                
            if (configsError) {
                console.error('❌ Erreur lors de la migration des configurations:', configsError);
            } else {
                console.log(`✅ ${serverConfigs.length} configurations migrées avec succès`);
            }
        } else {
            console.log('ℹ️ Aucune configuration à migrer');
        }
        
        // Fermer la connexion MySQL
        await mysqlConnection.end();
        
        console.log('🎉 Migration terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    }
}

// Exécuter la migration si le script est appelé directement
if (import.meta.main) {
    migrateData().catch(console.error);
}

export { migrateData }; 