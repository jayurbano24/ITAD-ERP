
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Obtener connection string (priorizar DATABASE_URL si existe, o construirla)
// Nota: en Supabase local suele ser postgresql://postgres:postgres@127.0.0.1:54322/postgres o similar
// Intentaremos usar la que esté en el env o una default común de Supabase local
let connectionString = envConfig.DATABASE_URL || envConfig.POSTGRES_URL;

if (!connectionString) {
    console.log('No se encontró DATABASE_URL en .env.local, intentando default local Supabase...');
    connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
}

console.log('Conectando a:', connectionString.replace(/:[^:@]*@/, ':****@')); // Ocultar pass

const sql = postgres(connectionString);

async function applyFix() {
    try {
        console.log('Aplicando corrección de esquema...');

        await sql`ALTER TABLE work_orders ALTER COLUMN rec_classification TYPE text`;
        console.log('✔ work_orders.rec_classification actualizado');

        await sql`ALTER TABLE work_orders ALTER COLUMN f_classification TYPE text`;
        console.log('✔ work_orders.f_classification actualizado');

        await sql`ALTER TABLE work_orders ALTER COLUMN c_classification TYPE text`;
        console.log('✔ work_orders.c_classification actualizado');

        // Intentar también ticket_items por precaución
        try {
            await sql`ALTER TABLE ticket_items ALTER COLUMN classification_rec TYPE text`;
            await sql`ALTER TABLE ticket_items ALTER COLUMN classification_f TYPE text`;
            await sql`ALTER TABLE ticket_items ALTER COLUMN classification_c TYPE text`;
            console.log('✔ ticket_items columnas actualizadas (si existían)');
        } catch (e) {
            console.log('Nota: ticket_items update error (puede ser normal si no existen columnas):', e.message);
        }

        console.log('¡Corrección aplicada con éxito!');
    } catch (error) {
        console.error('ERROR al aplicar corrección:', error);
    } finally {
        await sql.end();
    }
}

applyFix();
