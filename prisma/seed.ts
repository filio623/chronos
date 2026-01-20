import { PrismaClient } from '@prisma/client'
import { subDays, subHours } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create Workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'default-workspace' }, // Hardcoded ID for idempotency
    update: {},
    create: {
      id: 'default-workspace',
      name: 'Default Workspace',
      ownerId: 'system',
    },
  })

  // 2. Create Clients
  const acme = await prisma.client.create({
    data: {
      name: 'Acme Corp',
      currency: 'USD',
      workspaceId: workspace.id,
    },
  })

  const globex = await prisma.client.create({
    data: {
      name: 'Globex Inc',
      currency: 'EUR',
      workspaceId: workspace.id,
    },
  })

  // 3. Create Projects
  const websiteProject = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      budgetLimit: 20, // 20 hours budget
      color: 'text-indigo-600',
      clientId: acme.id,
      workspaceId: workspace.id,
    },
  })

  const seoProject = await prisma.project.create({
    data: {
      name: 'SEO Audit',
      budgetLimit: 5, // Small budget
      color: 'text-emerald-600',
      clientId: globex.id,
      workspaceId: workspace.id,
    },
  })

  // 4. Create Time Entries
  // Entry 1: 2 days ago, 2 hours
  await prisma.timeEntry.create({
    data: {
      description: 'Initial layout design',
      startTime: subHours(subDays(new Date(), 2), 4),
      endTime: subHours(subDays(new Date(), 2), 2),
      duration: 7200, // 2 hours
      isBillable: true,
      projectId: websiteProject.id,
    },
  })

  // Entry 2: Yesterday, 4 hours (Heavy lifting)
  await prisma.timeEntry.create({
    data: {
      description: 'Component implementation',
      startTime: subHours(subDays(new Date(), 1), 5),
      endTime: subHours(subDays(new Date(), 1), 1),
      duration: 14400, // 4 hours
      isBillable: true,
      projectId: websiteProject.id,
    },
  })

  // Entry 3: Today, 30 mins (Quick fix)
  await prisma.timeEntry.create({
    data: {
      description: 'Keyword research',
      startTime: subHours(new Date(), 2),
      endTime: subHours(new Date(), 1.5),
      duration: 1800, // 30 mins
      isBillable: true,
      projectId: seoProject.id,
    },
  })

  console.log('✅ Seed complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
