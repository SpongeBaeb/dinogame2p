const db = require('../config/db');
const User = require('../models/User');

async function seed() {
    try {
        console.log('🌱 Seeding database...');

        // Create dummy users
        const users = [
            { username: 'PlayerOne', email: 'p1@test.com', password: 'password123', mmr: 1200 },
            { username: 'PlayerTwo', email: 'p2@test.com', password: 'password123', mmr: 1150 },
            { username: 'PlayerThree', email: 'p3@test.com', password: 'password123', mmr: 1100 },
            { username: 'PlayerFour', email: 'p4@test.com', password: 'password123', mmr: 1050 },
            { username: 'PlayerFive', email: 'p5@test.com', password: 'password123', mmr: 1000 }
        ];

        for (const u of users) {
            // Check if user exists
            const existing = await User.findByUsername(u.username);
            if (!existing) {
                const newUser = await User.create(u.username, u.email, u.password);
                await User.updateMMR(newUser.id, u.mmr);
                console.log(`✅ Created user: ${u.username} (MMR: ${u.mmr})`);
            } else {
                console.log(`ℹ️ User ${u.username} already exists`);
            }
        }

        console.log('✨ Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
