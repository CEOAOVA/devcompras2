
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing UPSERT to devcompras.ARTICULOS...');

    const dummyProduct = {
        articulo_id: 999999,
        sku: 'TEST-SKU-999',
        nombre: 'Test Product',
        activo: false
    };

    const { data, error } = await supabase
        .schema('devcompras')
        .from('articulos')
        .upsert(dummyProduct, { onConflict: 'articulo_id' })
        .select();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Inserted:', data);

        // Cleanup
        console.log('Cleaning up...');
        await supabase.schema('devcompras').from('ARTICULOS').delete().eq('articulo_id', 999999);
    }
}

test();
