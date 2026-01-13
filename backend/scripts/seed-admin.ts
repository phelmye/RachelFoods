import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdminUser() {
    try {
        console.log('🌱 Seeding admin user...');

        // Check if admin user already exists
        const existingAdmin = await prisma.users.findFirst({
            where: { role: 'ADMIN' },
        });

        if (existingAdmin) {
            console.log('✅ Admin user already exists:', existingAdmin.email);
            return;
        }

        // Get admin email from environment or use default
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@rachelfoods.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

        // Check if user exists without admin role
        const existingUser = await prisma.users.findFirst({
            where: { email: adminEmail },
        });

        if (existingUser) {
            // Update existing user to admin
            await prisma.users.update({
                where: { id: existingUser.id },
                data: { role: 'ADMIN' },
            });
            console.log('✅ Updated existing user to ADMIN:', adminEmail);
        } else {
            // Create new admin user
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const admin = await prisma.users.create({
                data: {
                    id: `usr_${crypto.randomUUID()}`,
                    email: adminEmail,
                    password: hashedPassword,
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            console.log('✅ Created admin user:', admin.email);
            console.log('   Email:', adminEmail);
            console.log('   Password:', adminPassword);
            console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
        }

        console.log('✅ Admin seeding complete!');
    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedAdminUser()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
