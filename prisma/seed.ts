import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import bcrypt from "bcryptjs";

const accelerateUrl = process.env.DATABASE_URL;

if (!accelerateUrl) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  accelerateUrl: accelerateUrl,
}).$extends(withAccelerate());

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@warung.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@warung.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Created admin user:", admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-nasi" },
      update: {},
      create: {
        id: "cat-nasi",
        name: "Nasi Goreng",
        icon: "🍚",
        color: "#F59E0B",
        order: 1,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-mie" },
      update: {},
      create: {
        id: "cat-mie",
        name: "Mie Goreng",
        icon: "🍜",
        color: "#EF4444",
        order: 2,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-minuman" },
      update: {},
      create: {
        id: "cat-minuman",
        name: "Minuman",
        icon: "🥤",
        color: "#3B82F6",
        order: 3,
      },
    }),
    prisma.category.upsert({
      where: { id: "cat-tambahan" },
      update: {},
      create: {
        id: "cat-tambahan",
        name: "Tambahan",
        icon: "🥚",
        color: "#10B981",
        order: 4,
      },
    }),
  ]);

  console.log("Created categories:", categories.length);

  // Create menu items
  const menus = [
    // Nasi Goreng
    {
      id: "menu-ng-original",
      name: "Nasi Goreng Original",
      description: "Nasi goreng klasik dengan bumbu rahasia",
      price: 15000,
      categoryId: "cat-nasi",
    },
    {
      id: "menu-ng-ayam",
      name: "Nasi Goreng Ayam",
      description: "Nasi goreng dengan potongan ayam suwir",
      price: 18000,
      categoryId: "cat-nasi",
    },
    {
      id: "menu-ng-seafood",
      name: "Nasi Goreng Seafood",
      description: "Nasi goreng dengan udang dan cumi",
      price: 25000,
      categoryId: "cat-nasi",
    },
    {
      id: "menu-ng-kambing",
      name: "Nasi Goreng Kambing",
      description: "Nasi goreng khas dengan daging kambing",
      price: 30000,
      categoryId: "cat-nasi",
    },
    {
      id: "menu-ng-kampung",
      name: "Nasi Goreng Kampung",
      description: "Nasi goreng pedas dengan ikan teri",
      price: 17000,
      categoryId: "cat-nasi",
    },

    // Mie Goreng
    {
      id: "menu-mg-original",
      name: "Mie Goreng Original",
      description: "Mie goreng klasik yang lezat",
      price: 13000,
      categoryId: "cat-mie",
    },
    {
      id: "menu-mg-ayam",
      name: "Mie Goreng Ayam",
      description: "Mie goreng dengan potongan ayam",
      price: 16000,
      categoryId: "cat-mie",
    },
    {
      id: "menu-mg-seafood",
      name: "Mie Goreng Seafood",
      description: "Mie goreng dengan udang dan cumi",
      price: 22000,
      categoryId: "cat-mie",
    },

    // Minuman
    {
      id: "menu-es-teh",
      name: "Es Teh Manis",
      description: "Teh manis dingin segar",
      price: 5000,
      categoryId: "cat-minuman",
    },
    {
      id: "menu-es-jeruk",
      name: "Es Jeruk",
      description: "Jeruk peras segar dengan es",
      price: 7000,
      categoryId: "cat-minuman",
    },
    {
      id: "menu-es-campur",
      name: "Es Campur",
      description: "Es campur dengan berbagai topping",
      price: 12000,
      categoryId: "cat-minuman",
    },
    {
      id: "menu-kopi",
      name: "Kopi Hitam",
      description: "Kopi hitam tradisional",
      price: 5000,
      categoryId: "cat-minuman",
    },

    // Tambahan
    {
      id: "menu-telur-cepok",
      name: "Telur Ceplok",
      description: "Telur mata sapi",
      price: 5000,
      categoryId: "cat-tambahan",
    },
    {
      id: "menu-telur-dadar",
      name: "Telur Dadar",
      description: "Telur dadar tipis",
      price: 5000,
      categoryId: "cat-tambahan",
    },
    {
      id: "menu-kerupuk",
      name: "Kerupuk",
      description: "Kerupuk udang renyah",
      price: 3000,
      categoryId: "cat-tambahan",
    },
    {
      id: "menu-acar",
      name: "Acar",
      description: "Acar timun wortel segar",
      price: 2000,
      categoryId: "cat-tambahan",
    },
  ];

  for (const menu of menus) {
    await prisma.menu.upsert({
      where: { id: menu.id },
      update: {
        name: menu.name,
        description: menu.description,
        price: menu.price,
        categoryId: menu.categoryId,
      },
      create: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        categoryId: menu.categoryId,
        isAvailable: true,
      },
    });
  }

  console.log("Created menus:", menus.length);

  // Create default receipt template
  const receiptTemplate = await prisma.receiptTemplate.upsert({
    where: { id: "default-receipt" },
    update: {},
    create: {
      id: "default-receipt",
      name: "Default Template",
      header: "WARUNG NASI GORENG\nJl. Contoh No. 123\nTelp: 081234567890",
      footer: "Terima kasih atas kunjungan Anda!\nSelamat menikmati",
      showDate: true,
      showTime: true,
      showCashier: true,
      showTax: true,
      paperWidth: 80,
      isActive: true,
    },
  });

  console.log("Created receipt template:", receiptTemplate.name);

  // Create default settings
  const setting = await prisma.setting.upsert({
    where: { id: "default-setting" },
    update: {},
    create: {
      id: "default-setting",
      storeName: "Warung Nasi Goreng",
      address: "Jl. Contoh No. 123, Jakarta",
      phone: "081234567890",
      taxRate: 10,
      currency: "IDR",
    },
  });

  console.log("Created settings:", setting.storeName);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
