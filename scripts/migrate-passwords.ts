/**
 * Скрипт одноразовой миграции: хеширует все пароли в открытом тексте через bcrypt.
 * Запускается один раз: bun run scripts/migrate-passwords.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function isBcryptHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

async function main() {
  console.log('🔒 Начинаю миграцию паролей...')
  
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, password: true },
  })
  
  let migrated = 0
  let skipped = 0
  
  for (const emp of employees) {
    if (isBcryptHash(emp.password)) {
      console.log(`  ⏭️  ${emp.name} — пароль уже хеширован, пропускаю`)
      skipped++
      continue
    }
    
    const hashed = await bcrypt.hash(emp.password, 10)
    await prisma.employee.update({
      where: { id: emp.id },
      data: { password: hashed },
    })
    console.log(`  ✅ ${emp.name} — пароль хеширован`)
    migrated++
  }
  
  console.log(`\nГотово! Хешировано: ${migrated}, Пропущено: ${skipped}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Ошибка миграции:', e)
  process.exit(1)
})
