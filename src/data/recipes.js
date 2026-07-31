// Each recipe now has a category so the Rice/Pasta/Chicken/Dessert chips
// can actually filter, and a large enough pool per category that the
// "Trending This Week" section can rotate automatically week to week
// instead of always showing the same 3 dishes.

const recipes = [
  // --- Rice ---
  { id: 1, title: "Nigerian Jollof Rice", category: "Rice", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800", time: "45 mins", difficulty: "Easy", rating: 4.9, seedViews: 1250 },
  { id: 2, title: "Chicken Fried Rice", category: "Rice", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", time: "35 mins", difficulty: "Medium", rating: 4.8, seedViews: 870 },
  { id: 4, title: "Coconut Rice", category: "Rice", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800", time: "40 mins", difficulty: "Easy", rating: 4.6, seedViews: 610 },
  { id: 5, title: "Spanish Paella", category: "Rice", image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800", time: "55 mins", difficulty: "Hard", rating: 4.8, seedViews: 730 },
  { id: 6, title: "Sushi Rice Bowl", category: "Rice", image: "https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, seedViews: 690 },

  // --- Pasta ---
  { id: 7, title: "Spaghetti Bolognese", category: "Pasta", image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800", time: "40 mins", difficulty: "Medium", rating: 4.8, seedViews: 980 },
  { id: 8, title: "Creamy Alfredo Pasta", category: "Pasta", image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800", time: "25 mins", difficulty: "Easy", rating: 4.7, seedViews: 720 },
  { id: 9, title: "Pesto Penne", category: "Pasta", image: "https://images.unsplash.com/photo-1673545584061-9df0c9c8e394?w=800", time: "20 mins", difficulty: "Easy", rating: 4.6, seedViews: 540 },
  { id: 10, title: "Spicy Arrabbiata", category: "Pasta", image: "https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, seedViews: 610 },

  // --- Chicken ---
  { id: 11, title: "Grilled Chicken Suya", category: "Chicken", image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800", time: "35 mins", difficulty: "Medium", rating: 4.9, seedViews: 890 },
  { id: 12, title: "Honey Garlic Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800", time: "30 mins", difficulty: "Easy", rating: 4.8, seedViews: 760 },
  { id: 13, title: "Crispy Fried Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800", time: "45 mins", difficulty: "Medium", rating: 4.9, seedViews: 1020 },
  { id: 14, title: "Chicken Shawarma", category: "Chicken", image: "https://images.unsplash.com/photo-1633321702518-7feccafb94d5?w=800", time: "40 mins", difficulty: "Medium", rating: 4.7, seedViews: 680 },

  // --- Dessert ---
  { id: 3, title: "Pancakes", category: "Dessert", image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800", time: "20 mins", difficulty: "Beginner", rating: 4.7, seedViews: 540 },
  { id: 15, title: "Chocolate Lava Cake", category: "Dessert", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800", time: "25 mins", difficulty: "Medium", rating: 4.9, seedViews: 910 },
  { id: 16, title: "Classic Tiramisu", category: "Dessert", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800", time: "30 mins", difficulty: "Medium", rating: 4.8, seedViews: 700 },
  { id: 17, title: "Banana Bread", category: "Dessert", image: "https://images.unsplash.com/photo-1605286658387-4b473becd3f5?w=800", time: "50 mins", difficulty: "Easy", rating: 4.6, seedViews: 560 },
];

export default recipes;
