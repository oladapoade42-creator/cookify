// Each recipe now has a category so the Rice/Pasta/Chicken/Dessert chips
// can actually filter, a large enough pool per category that "Trending
// This Week" can rotate automatically, and nutrition facts so any dish's
// detail view can show calories/protein/carbs/fat like the Learn tab.

const recipes = [
  // --- Rice ---
  { id: 1, title: "Nigerian Jollof Rice", category: "Rice", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800", time: "45 mins", difficulty: "Easy", rating: 4.9, nutrition: { calories: 420, protein: "9g", carbs: "62g", fat: "14g" } },
  { id: 2, title: "Chicken Fried Rice", category: "Rice", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", time: "35 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 480, protein: "24g", carbs: "58g", fat: "12g" } },
  { id: 4, title: "Coconut Rice", category: "Rice", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800", time: "40 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 390, protein: "6g", carbs: "60g", fat: "13g" } },
  { id: 5, title: "Spanish Paella", category: "Rice", image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800", time: "55 mins", difficulty: "Hard", rating: 4.8, nutrition: { calories: 520, protein: "28g", carbs: "55g", fat: "18g" } },
  { id: 6, title: "Sushi Rice Bowl", category: "Rice", image: "https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 410, protein: "18g", carbs: "56g", fat: "10g" } },

  // --- Pasta ---
  { id: 7, title: "Spaghetti Bolognese", category: "Pasta", image: "https://images.unsplash.com/photo-1526121831791-40b298302271?w=800", time: "40 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 560, protein: "28g", carbs: "65g", fat: "18g" } },
  { id: 8, title: "Creamy Alfredo Pasta", category: "Pasta", image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800", time: "25 mins", difficulty: "Easy", rating: 4.7, nutrition: { calories: 610, protein: "20g", carbs: "58g", fat: "30g" } },
  { id: 9, title: "Pesto Penne", category: "Pasta", image: "https://images.unsplash.com/photo-1539267821515-9a48cb52c2bb?w=800", time: "20 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 500, protein: "14g", carbs: "60g", fat: "22g" } },
  { id: 10, title: "Spicy Arrabbiata", category: "Pasta", image: "https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 440, protein: "12g", carbs: "68g", fat: "12g" } },

  // --- Chicken ---
  { id: 11, title: "Grilled Chicken Suya", category: "Chicken", image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800", time: "35 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 380, protein: "36g", carbs: "10g", fat: "20g" } },
  { id: 12, title: "Honey Garlic Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800", time: "30 mins", difficulty: "Easy", rating: 4.8, nutrition: { calories: 420, protein: "32g", carbs: "24g", fat: "18g" } },
  { id: 13, title: "Crispy Fried Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800", time: "45 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 620, protein: "34g", carbs: "28g", fat: "38g" } },
  { id: 14, title: "Chicken Shawarma", category: "Chicken", image: "https://images.unsplash.com/photo-1633321702518-7feccafb94d5?w=800", time: "40 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 460, protein: "30g", carbs: "36g", fat: "20g" } },

  // --- Dessert ---
  { id: 3, title: "Pancakes", category: "Dessert", image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800", time: "20 mins", difficulty: "Beginner", rating: 4.7, nutrition: { calories: 350, protein: "8g", carbs: "52g", fat: "11g" } },
  { id: 15, title: "Chocolate Lava Cake", category: "Dessert", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800", time: "25 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 480, protein: "6g", carbs: "58g", fat: "24g" } },
  { id: 16, title: "Classic Tiramisu", category: "Dessert", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800", time: "30 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 420, protein: "7g", carbs: "42g", fat: "24g" } },
  { id: 17, title: "Banana Bread", category: "Dessert", image: "https://images.unsplash.com/photo-1675712841671-cbcbe2c84103?w=800", time: "50 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 320, protein: "5g", carbs: "48g", fat: "12g" } },
];

export default recipes;
