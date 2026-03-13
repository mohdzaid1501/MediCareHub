const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function test() {
    try {
        const pass = 'admin123';
        const hash = await bcrypt.hash(pass, 10);
        console.log('Bcrypt Hash:', hash);
        const match = await bcrypt.compare(pass, hash);
        console.log('Bcrypt Match:', match);

        const token = jwt.sign({ id: 1 }, 'test-secret');
        console.log('JWT Token:', token);
        const decoded = jwt.verify(token, 'test-secret');
        console.log('JWT Decoded:', decoded);

        console.log('SUCCESS: All auth libraries working.');
    } catch (err) {
        console.error('FAILURE:', err.message);
    }
}

test();
