import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const SIZE_ORDER = ['XXS','2XS','XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164','42','44','46','48','50','52','54','56','58','60','62','64','ONE SIZE']
const SIZE_ORDER_MAP = new Map(SIZE_ORDER.map((s, i) => [s, i]))

async function fixOrder() {
  const products = await prisma.product.findMany({ include: { sizes: true } })
  
  for (const product of products) {
    const sortedSizes = [...product.sizes].sort((a, b) => {
      const ai = SIZE_ORDER_MAP.get(a.size)
      const bi = SIZE_ORDER_MAP.get(b.size)
      if (ai !== undefined && bi !== undefined) return ai - bi
      if (ai !== undefined) return -1
      if (bi !== undefined) return 1
      return a.size.localeCompare(b.size, undefined, { numeric: true })
    })
    
    for (let i = 0; i < sortedSizes.length; i++) {
      if (sortedSizes[i].order !== i) {
        await prisma.productSize.update({
          where: { id: sortedSizes[i].id },
          data: { order: i }
        })
      }
    }
    
    console.log(`${product.article}: ${sortedSizes.map(s => s.size).join(', ')}`)
  }
  
  await prisma.$disconnect()
  console.log('Done!')
}

fixOrder().catch(console.error)
