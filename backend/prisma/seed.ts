import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const foods = [
  // Indian / South Asian
  { name: "Samosa", servingSize: 1, servingUnit: "piece", caloriesPerServing: 262, proteinG: 3.5, carbsG: 24, fatG: 17, fiberG: 2, sugarG: 1 },
  { name: "Paneer Tikka", servingSize: 100, servingUnit: "g", caloriesPerServing: 280, proteinG: 18, carbsG: 8, fatG: 20, fiberG: 1, sugarG: 3 },
  { name: "Chicken Biryani", servingSize: 1, servingUnit: "cup", caloriesPerServing: 350, proteinG: 18, carbsG: 45, fatG: 10, fiberG: 2, sugarG: 3 },
  { name: "Dal Tadka", servingSize: 1, servingUnit: "cup", caloriesPerServing: 200, proteinG: 12, carbsG: 30, fatG: 5, fiberG: 8, sugarG: 3 },
  { name: "Roti (Whole Wheat)", servingSize: 1, servingUnit: "piece", caloriesPerServing: 104, proteinG: 3, carbsG: 18, fatG: 2.5, fiberG: 3, sugarG: 0 },
  { name: "Naan", servingSize: 1, servingUnit: "piece", caloriesPerServing: 262, proteinG: 9, carbsG: 45, fatG: 5, fiberG: 2, sugarG: 3 },
  { name: "Idli", servingSize: 1, servingUnit: "piece", caloriesPerServing: 39, proteinG: 1.5, carbsG: 8, fatG: 0.2, fiberG: 0.5, sugarG: 0 },
  { name: "Masala Dosa", servingSize: 1, servingUnit: "piece", caloriesPerServing: 350, proteinG: 6, carbsG: 45, fatG: 15, fiberG: 3, sugarG: 2 },
  { name: "Chana Masala", servingSize: 1, servingUnit: "cup", caloriesPerServing: 269, proteinG: 12, carbsG: 40, fatG: 6, fiberG: 11, sugarG: 6 },
  { name: "Butter Chicken", servingSize: 1, servingUnit: "cup", caloriesPerServing: 438, proteinG: 25, carbsG: 12, fatG: 32, fiberG: 1, sugarG: 6 },
  { name: "Aloo Paratha", servingSize: 1, servingUnit: "piece", caloriesPerServing: 260, proteinG: 5, carbsG: 35, fatG: 11, fiberG: 3, sugarG: 1 },
  { name: "Gulab Jamun", servingSize: 1, servingUnit: "piece", caloriesPerServing: 150, proteinG: 2, carbsG: 20, fatG: 7, fiberG: 0, sugarG: 18 },
  { name: "Basmati Rice (Cooked)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 210, proteinG: 4.3, carbsG: 45, fatG: 0.4, fiberG: 0.6, sugarG: 0 },
  { name: "Curd / Plain Yogurt", servingSize: 1, servingUnit: "cup", caloriesPerServing: 149, proteinG: 8.5, carbsG: 11, fatG: 8, fiberG: 0, sugarG: 11 },
  { name: "Vada Pav", servingSize: 1, servingUnit: "piece", caloriesPerServing: 290, proteinG: 6, carbsG: 40, fatG: 12, fiberG: 3, sugarG: 3 },

  // Common Western / generic
  { name: "Banana", servingSize: 1, servingUnit: "medium", caloriesPerServing: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, fiberG: 3.1, sugarG: 14 },
  { name: "Apple", servingSize: 1, servingUnit: "medium", caloriesPerServing: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3, fiberG: 4.4, sugarG: 19 },
  { name: "Chicken Breast (Grilled)", servingSize: 100, servingUnit: "g", caloriesPerServing: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, sugarG: 0 },
  { name: "Egg (Boiled)", servingSize: 1, servingUnit: "large", caloriesPerServing: 78, proteinG: 6.3, carbsG: 0.6, fatG: 5.3, fiberG: 0, sugarG: 0.6 },
  { name: "White Rice (Cooked)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 205, proteinG: 4.3, carbsG: 45, fatG: 0.4, fiberG: 0.6, sugarG: 0 },
  { name: "Oats (Cooked)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 166, proteinG: 6, carbsG: 28, fatG: 3.6, fiberG: 4, sugarG: 1 },
  { name: "Whole Milk", servingSize: 1, servingUnit: "cup", caloriesPerServing: 149, proteinG: 8, carbsG: 12, fatG: 8, fiberG: 0, sugarG: 12 },
  { name: "Almonds", servingSize: 28, servingUnit: "g", caloriesPerServing: 164, proteinG: 6, carbsG: 6, fatG: 14, fiberG: 3.5, sugarG: 1.2 },
  { name: "Whole Wheat Bread", servingSize: 1, servingUnit: "slice", caloriesPerServing: 81, proteinG: 4, carbsG: 14, fatG: 1.1, fiberG: 2, sugarG: 1.5 },
  { name: "Peanut Butter", servingSize: 2, servingUnit: "tbsp", caloriesPerServing: 188, proteinG: 8, carbsG: 6, fatG: 16, fiberG: 2, sugarG: 3 },
  { name: "Broccoli (Steamed)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 55, proteinG: 3.7, carbsG: 11, fatG: 0.6, fiberG: 5, sugarG: 2 },
  { name: "Salmon (Grilled)", servingSize: 100, servingUnit: "g", caloriesPerServing: 208, proteinG: 20, carbsG: 0, fatG: 13, fiberG: 0, sugarG: 0 },
  { name: "Greek Yogurt (Plain)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 146, proteinG: 25, carbsG: 8, fatG: 0.7, fiberG: 0, sugarG: 7 },
  { name: "Pasta (Cooked)", servingSize: 1, servingUnit: "cup", caloriesPerServing: 221, proteinG: 8, carbsG: 43, fatG: 1.3, fiberG: 2.5, sugarG: 1 },
  { name: "Pizza Slice (Cheese)", servingSize: 1, servingUnit: "slice", caloriesPerServing: 285, proteinG: 12, carbsG: 36, fatG: 10, fiberG: 2, sugarG: 4 },
];

async function main() {
  for (const food of foods) {
    const existing = await prisma.foodItem.findFirst({
      where: { name: food.name, source: "seed" },
    });
    if (!existing) {
      await prisma.foodItem.create({
        data: { ...food, source: "seed" },
      });
    }
  }
  console.log(`Seeded ${foods.length} food items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
