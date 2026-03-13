const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    const url = process.env.DATABASE_URL.replace('mysql://', '');
    const [auth, hostPortDb] = url.split('@');
    const [user, password] = auth.split(':');
    const [hostPort, database] = hostPortDb.split('/');
    const [host, port] = hostPort.split(':');

    console.log(`Connecting to ${host}:${port} as ${user}...`);

    try {
        const connection = await mysql.createConnection({
            host: host,
            port: port || 3306,
            user: user,
            password: decodeURIComponent(password),
        });
        console.log('CONNECTED TO MYSQL SERVER');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
        console.log(`DATABASE \`${database}\` READY`);
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('CONNECTION FAILED:', err.message);
        process.exit(1);
    }
}

test();
