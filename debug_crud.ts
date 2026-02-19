
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpzmigzuagvxlltecsbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SBK4nF7RieyTSKw-EWUoqA_6zyjv5m4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInternshipInsert() {
    console.log("Testing Internship INSERT...");

    const packedData = {
        p: true, // flag
        s: 'Segunda 07:00',
        l: 'Hospital Teste',
        em: 'Modelo Evolução Teste',
        uid: 'test_user_id'
    };

    const dbPayload = {
        id: `test_internship_${Date.now()}`,
        title: 'Estágio Teste Node',
        local: 'Hospital Teste',
        evolution_model: JSON.stringify(packedData),
        status: 'Pendente'
    };

    try {
        const { data, error } = await supabase.from('internships').insert(dbPayload).select();
        if (error) {
            console.error("INSERT failed with error:", error);
        } else {
            console.log("INSERT successful! Data:", data);
        }
    } catch (err) {
        console.error("INSERT failed with exception:", err);
    }
}

testInternshipInsert();
