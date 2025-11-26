require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Inserting dummy store "0" into SUCURSALES...');

    const { error } = await supabase
        .schema('devcompras')
        .from('sucursales')
        .upsert({
            sucursal_id: '0',
            nombre: 'Sin Asignar / Almacén Interno',
            activo: true
        });

    if (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } else {
        console.log('Success!');
        process.exit(0);
    }
}

main();
