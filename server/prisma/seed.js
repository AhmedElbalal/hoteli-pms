import { PrismaClient } from '@prisma/client';
import { seedData } from '../src/data/seedData.js';

const prisma = new PrismaClient();

const roomStatusMap = {
  'Vacant Ready': 'VACANT_READY',
  'Vacant Dirty': 'VACANT_DIRTY',
  Occupied: 'OCCUPIED',
  'Green Stay': 'GREEN_STAY',
  Maintenance: 'MAINTENANCE',
  'Out of Order': 'OUT_OF_ORDER'
};

const housekeepingMap = {
  Clean: 'CLEAN',
  Dirty: 'DIRTY',
  Inspected: 'INSPECTED',
  Stayover: 'STAYOVER',
  Eco: 'ECO'
};

async function clearDatabase() {
  await prisma.$transaction([
    prisma.folioItem.deleteMany(),
    prisma.folio.deleteMany(),
    prisma.houseAccountItem.deleteMany(),
    prisma.houseAccount.deleteMany(),
    prisma.nightAudit.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.room.deleteMany(),
    prisma.user.deleteMany(),
    prisma.property.deleteMany()
  ]);
}

async function seedProperty() {
  const property = seedData.property;
  await prisma.property.create({
    data: {
      id: property.id,
      name: property.name,
      roomsCount: property.rooms,
      currency: property.currency,
      roomTaxRate: property.roomTaxRate
    }
  });
}

async function seedUsers() {
  await prisma.user.createMany({
    data: seedData.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role,
      active: true
    }))
  });
}

async function seedRooms() {
  await prisma.room.createMany({
    data: seedData.rooms.map((room) => ({
      id: room.id,
      number: room.number,
      type: room.type,
      status: roomStatusMap[room.status] || 'VACANT_READY',
      housekeeping: housekeepingMap[room.housekeeping] || 'CLEAN',
      rateBase: room.rateBase,
      notes: room.notes || ''
    }))
  });
}

async function seedReservations() {
  for (const reservation of seedData.reservations) {
    await prisma.reservation.create({
      data: {
        id: reservation.id,
        guestName: reservation.guestName,
        email: reservation.email || null,
        roomNumber: reservation.roomNumber || null,
        status: reservation.status,
        source: reservation.source || 'Direct',
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        adults: reservation.adults || 1,
        rate: reservation.rate,
        balance: reservation.balance || 0,
        parking: Boolean(reservation.parking),
        notes: reservation.notes || ''
      }
    });
  }
}

async function seedFolios() {
  for (const folio of seedData.folios) {
    await prisma.folio.create({
      data: {
        id: folio.id,
        reservationId: folio.reservationId,
        guestName: folio.guestName,
        status: folio.status || 'OPEN',
        items: {
          create: (folio.items || []).map((item) => ({
            id: item.id,
            type: item.type,
            code: item.code,
            description: item.description,
            amount: item.amount,
            date: item.date
          }))
        }
      }
    });
  }
}

async function seedHouseAccounts() {
  for (const account of seedData.houseAccounts) {
    await prisma.houseAccount.create({
      data: {
        id: account.id,
        name: account.name,
        status: account.status || 'OPEN',
        owner: account.owner,
        items: {
          create: (account.items || []).map((item) => ({
            id: item.id,
            type: item.type,
            description: item.description,
            amount: item.amount,
            date: item.date
          }))
        }
      }
    });
  }
}

async function main() {
  console.log('Seeding HOTELI PostgreSQL database...');
  await clearDatabase();
  await seedProperty();
  await seedUsers();
  await seedRooms();
  await seedReservations();
  await seedFolios();
  await seedHouseAccounts();

  const [users, rooms, reservations, folios, houseAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    prisma.reservation.count(),
    prisma.folio.count(),
    prisma.houseAccount.count()
  ]);

  console.log('HOTELI PostgreSQL seed complete:', {
    users,
    rooms,
    reservations,
    folios,
    houseAccounts
  });
}

main()
  .catch((error) => {
    console.error('HOTELI PostgreSQL seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
