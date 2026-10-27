import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/client/index.js";

const CONNECTION =
  "postgresql://neondb_owner:npg_gMcU8biJrE1l@ep-rough-night-bazkh3dn-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const adapter = new PrismaPg({ connectionString: CONNECTION }, { schema: "choco" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍫 Seeding Choco House Desserts database...");

  // ---- System Settings ----
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      restaurantName: "Choco House Desserts",
      phone: "01091413470",
      address: "الحي الثاني، قطعة 3، مبنى 3، السادس من أكتوبر — ديليڤري فقط",
      deliveryZones: JSON.stringify([
        { name: "الحي الثاني", fee: 10 },
        { name: "الحي الأول", fee: 10 },
        { name: "الحي الثالث", fee: 12 },
        { name: "الحي السادس", fee: 12 },
        { name: "الحي السابع", fee: 15 },
        { name: "المحور المركزي", fee: 15 },
      ]),
      soundsEnabled: true,
    },
  });

  // ---- Users ----
  const usersData = [
    { name: "أحمد شوكو (المدير)", phone: "01091413470", pin: "110011", role: "owner", department: "الإدارة العامة" },
    { name: "محمد الكاشير", phone: "01000000021", pin: "212121", role: "cashier", department: "استقبال الطلبات" },
    { name: "علي الشيف", phone: "01000000022", pin: "223322", role: "chef", department: "المطبخ" },
    { name: "مي المحاسبة", phone: "01000000023", pin: "232323", role: "accountant", department: "الماليات والتقارير" },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: {},
      create: u,
    });
  }

  // ---- Products (Menu) ----
  const menuData = [
    // Waffles
    { nameAr: "وافل نوتيلا بيضاء مشكل", nameEn: "White Nutella Mix Waffle", category: "وافل", basePrice: 160, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/e82d47ee-9ef8-4cef-b175-d8d258d58856.jpg", sortOrder: 1 },
    { nameAr: "وافل نوتيلا", nameEn: "Nutella Waffle", category: "وافل", basePrice: 160, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/3a282f8f-e546-4fec-aeab-8e71afd634a5.jpg", sortOrder: 2 },
    { nameAr: "وافل لوتس", nameEn: "Lotus Waffle", category: "وافل", basePrice: 160, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/a9211318-1f4d-4347-a140-28a7f3908c1e.jpg", sortOrder: 3 },
    { nameAr: "وافل نوتيلا بالاوريو", nameEn: "Nutella Oreo Waffle", category: "وافل", basePrice: 170, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/cf0ff341-16bf-4a70-bf9e-0e6bece435ba.jpg", sortOrder: 4 },
    { nameAr: "وافل كراميل", nameEn: "Caramel Waffle", category: "وافل", basePrice: 150, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/22bac9d3-5a5a-4a6e-bce6-e22c3740dbbe.jpg", sortOrder: 5 },
    { nameAr: "وافل كيندر", nameEn: "Kinder Waffle", category: "وافل", basePrice: 190, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/5d4d0d7e-2599-47de-a294-05535c51b608.jpg", sortOrder: 6 },
    { nameAr: "وافل شوكولاتة بيضاء فراولة", nameEn: "White Chocolate Strawberry Waffle", category: "وافل", basePrice: 190, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/63a7223f-db65-40d3-904c-ded07c717429.jpg", sortOrder: 7 },
    // Cheesecake
    { nameAr: "تشيز كيك بالتوت الأزرق", nameEn: "Blueberry Cheesecake", category: "تشيز كيك", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/c6565b18-c071-4e57-b8c1-8f3576f609f1.jpg", sortOrder: 1 },
    { nameAr: "تشيز كيك لوتس", nameEn: "Lotus Cheesecake", category: "تشيز كيك", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/3fc200a5-f6cf-4f18-bce0-b334766db7e0.jpg", sortOrder: 2 },
    { nameAr: "تشيز كيك فراولة", nameEn: "Strawberry Cheesecake", category: "تشيز كيك", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/fb97316c-e337-4c56-9e40-380bf826d048.jpg", sortOrder: 3 },
    { nameAr: "تشيز كيك نوتيلا", nameEn: "Nutella Cheesecake", category: "تشيز كيك", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/4972b8a3-6876-4acb-9c4b-b9d41830a85c.jpg", sortOrder: 4 },
    // Pancakes
    { nameAr: "ميني بان كيك نوتيلا بيضاء", nameEn: "White Nutella Mini Pancake", category: "بان كيك", basePrice: 160, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/1a964571-8a73-4136-95cb-354dd7041a5e.jpg", sortOrder: 1 },
    { nameAr: "ميني بان كيك نوتيلا", nameEn: "Nutella Mini Pancake", category: "بان كيك", basePrice: 160, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/54805813-e3c0-4e1c-9af6-83a65d2f792f.jpg", sortOrder: 2 },
    { nameAr: "ميني بان كيك لوتس", nameEn: "Lotus Mini Pancake", category: "بان كيك", basePrice: 170, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/c49ea5b5-bdae-458c-b1b7-93b0aa972803.jpg", sortOrder: 3 },
    { nameAr: "ميني بان كيك بيضاء", nameEn: "White Mini Pancake", category: "بان كيك", basePrice: 170, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/bca3351c-5049-4ba1-ac9a-2abc3d80996c.jpg", sortOrder: 4 },
    // Milkshakes
    { nameAr: "ميلك شيك نوتيلا", nameEn: "Nutella Milkshake", category: "ميلك شيك", basePrice: 140, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/7413324d-13f7-4ae8-ae75-fe19e42d6f43.jpg", sortOrder: 1 },
    { nameAr: "ميلك شيك أوريو", nameEn: "Oreo Milkshake", category: "ميلك شيك", basePrice: 110, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/69be185f-8de1-4b2e-88a6-20250f0d841a.jpg", sortOrder: 2 },
    { nameAr: "ميلك شيك لوتس", nameEn: "Lotus Milkshake", category: "ميلك شيك", basePrice: 100, image: null, sortOrder: 3 },
    { nameAr: "ميلك شيك فراولة", nameEn: "Strawberry Milkshake", category: "ميلك شيك", basePrice: 110, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/28cad188-fb30-4237-aebd-d928d178bcb4.jpg", sortOrder: 4 },
    { nameAr: "ميلك شيك توت أزرق", nameEn: "Blueberry Milkshake", category: "ميلك شيك", basePrice: 115, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/9158082c-7ade-47b9-b54f-46008d8efc55.jpg", sortOrder: 5 },
    // Smoothies
    { nameAr: "سموزي بالتوت الأزرق", nameEn: "Blueberry Smoothie", category: "سموزي", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/1ad547c3-ae4f-4769-a026-7e9ed37c2bf1.jpg", sortOrder: 1 },
    { nameAr: "سموزي فراولة", nameEn: "Strawberry Smoothie", category: "سموزي", basePrice: 110, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/7275d968-436d-4246-bb0c-9d14767ba2f9.jpg", sortOrder: 2 },
    { nameAr: "سموزي خوخ", nameEn: "Peach Smoothie", category: "سموزي", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/5ea29261-b959-4a6a-bf84-41dd3d93d7e9.jpg", sortOrder: 3 },
    { nameAr: "سموزي مانجو", nameEn: "Mango Smoothie", category: "سموزي", basePrice: 100, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/f2b64555-f19f-42c0-90be-295d28bc3a13.jpg", sortOrder: 4 },
    // Boba
    { nameAr: "سموزي توت أزرق بوبا", nameEn: "Boba Blueberry Smoothie", category: "بوبا", basePrice: 120, image: null, sortOrder: 1 },
    { nameAr: "سموزي فراولة بوبا", nameEn: "Boba Strawberry Smoothie", category: "بوبا", basePrice: 120, image: null, sortOrder: 2 },
    { nameAr: "ميلك شيك توت أزرق بوبا", nameEn: "Boba Blueberry Milkshake", category: "بوبا", basePrice: 140, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/c1b86140-5a36-46bb-b20d-4b200aca1af5.jpg", sortOrder: 3 },
    { nameAr: "ميلك شيك خوخ بوبا", nameEn: "Boba Peach Milkshake", category: "بوبا", basePrice: 140, image: "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/956f053c-fec4-422c-aa0f-9b32a1d7f3a2.jpg", sortOrder: 4 },
  ];

  let created = 0;
  for (const p of menuData) {
    const existing = await prisma.product.findFirst({ where: { nameAr: p.nameAr } });
    if (!existing) {
      await prisma.product.create({ data: { ...p, image: p.image || undefined } });
      created++;
    }
  }

  console.log(`✅ Seed complete!`);
  console.log(`   Products: ${created} created (${menuData.length} total)`);
  console.log(`   Users: ${usersData.length} upserted`);
  console.log(`   Settings: default seeded`);
  console.log(`\n🔑 Login credentials:`);
  for (const u of usersData) {
    console.log(`   ${u.role.padEnd(12)} | ${u.phone} | PIN: ${u.pin} | ${u.name}`);
  }
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
