// Each recipe now has a category so the Rice/Pasta/Chicken/Dessert chips
// can actually filter, a large enough pool per category that "Trending
// This Week" can rotate automatically, and nutrition facts so any dish's
// detail view can show calories/protein/carbs/fat like the Learn tab.
//
// `description` and `instructions` power the "Expand" detail view on the
// food tab — a short blurb plus step-by-step prep instructions for each dish.

const recipes = [
  // --- Rice ---
  { id: 1, title: "Nigerian Jollof Rice", category: "Rice", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800", time: "45 mins", difficulty: "Easy", rating: 4.9, nutrition: { calories: 420, protein: "9g", carbs: "62g", fat: "14g" },
    description: "A smoky, tomato-based West African rice dish simmered low and slow until every grain soaks up the pepper-and-spice sauce.",
    instructions: [
      "Blend tomatoes, red bell pepper, scotch bonnet and onion into a smooth puree.",
      "Fry the puree in oil with tomato paste until it darkens and the raw smell fades.",
      "Stir in curry powder, thyme, bay leaves and stock, then bring to a simmer.",
      "Add washed parboiled rice, stir once, cover tightly and cook on low heat.",
      "Let it steam undisturbed for the last 10 minutes for the signature smoky bottom, then fluff and serve.",
    ] },
  { id: 2, title: "Chicken Fried Rice", category: "Rice", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", time: "35 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 480, protein: "24g", carbs: "58g", fat: "12g" },
    description: "Day-old rice tossed in a hot wok with diced chicken, egg and vegetables for that unmistakable smoky wok-fried flavor.",
    instructions: [
      "Dice and season chicken, then stir-fry in a hot wok until cooked through; set aside.",
      "Scramble eggs in the same wok and push to the side.",
      "Add garlic, carrots, peas and spring onion, stir-frying briefly over high heat.",
      "Add cold day-old rice, breaking up clumps, then return the chicken and egg to the wok.",
      "Season with soy sauce and sesame oil, tossing everything until evenly coated and hot.",
    ] },
  { id: 4, title: "Coconut Rice", category: "Rice", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800", time: "40 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 390, protein: "6g", carbs: "60g", fat: "13g" },
    description: "Fragrant rice cooked in coconut milk for a naturally sweet, creamy side that pairs with almost any main.",
    instructions: [
      "Rinse rice until the water runs clear.",
      "Combine rice, coconut milk, water and a pinch of salt in a pot.",
      "Bring to a boil, then reduce heat to low and cover.",
      "Simmer gently until the liquid is fully absorbed, about 18-20 minutes.",
      "Rest off the heat for 5 minutes, then fluff with a fork before serving.",
    ] },
  { id: 5, title: "Spanish Paella", category: "Rice", image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800", time: "55 mins", difficulty: "Hard", rating: 4.8, nutrition: { calories: 520, protein: "28g", carbs: "55g", fat: "18g" },
    description: "A saffron-scented Spanish rice dish loaded with chicken, seafood and vegetables, prized for its crisp bottom layer, the socarrat.",
    instructions: [
      "Brown chicken and chorizo in a wide paella pan, then set aside.",
      "Sauté onion, garlic, tomato and bell pepper until softened.",
      "Stir in rice and saffron-infused stock, spreading everything evenly without stirring further.",
      "Nestle the chicken back in along with shrimp and mussels, simmering until the rice is tender.",
      "Let it rest a few minutes to develop the crisp socarrat crust before serving.",
    ] },
  { id: 6, title: "Sushi Rice Bowl", category: "Rice", image: "https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 410, protein: "18g", carbs: "56g", fat: "10g" },
    description: "A deconstructed sushi bowl — seasoned vinegared rice topped with fish, vegetables and a drizzle of soy-sesame sauce.",
    instructions: [
      "Cook sushi rice and season it with a mix of rice vinegar, sugar and salt while warm.",
      "Slice fish, cucumber and avocado into thin, even pieces.",
      "Divide the seasoned rice between bowls.",
      "Arrange the fish and vegetables on top in sections.",
      "Finish with sesame seeds, nori strips and a drizzle of soy-sesame sauce.",
    ] },

  // --- Pasta ---
  { id: 7, title: "Spaghetti Bolognese", category: "Pasta", image: "https://images.unsplash.com/photo-1526121831791-40b298302271?w=800", time: "40 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 560, protein: "28g", carbs: "65g", fat: "18g" },
    description: "A rich, slow-simmered Italian meat sauce tossed with spaghetti — comfort food that only gets better the longer it cooks.",
    instructions: [
      "Sauté onion, carrot and celery until softened, then add garlic.",
      "Brown ground beef in the pan, breaking it up as it cooks.",
      "Stir in tomato paste, crushed tomatoes and a splash of stock or wine.",
      "Simmer uncovered on low heat for at least 25 minutes, stirring occasionally.",
      "Cook spaghetti to al dente, then toss with the sauce and finish with parmesan.",
    ] },
  { id: 8, title: "Creamy Alfredo Pasta", category: "Pasta", image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800", time: "25 mins", difficulty: "Easy", rating: 4.7, nutrition: { calories: 610, protein: "20g", carbs: "58g", fat: "30g" },
    description: "Silky pasta coated in a simple butter, cream and parmesan sauce — few ingredients, maximum comfort.",
    instructions: [
      "Cook pasta until al dente, reserving a cup of the starchy pasta water.",
      "Melt butter in a pan and sauté garlic until fragrant.",
      "Pour in cream and simmer gently until slightly thickened.",
      "Whisk in grated parmesan until smooth, loosening with pasta water as needed.",
      "Toss in the drained pasta, coating it fully, then season with black pepper.",
    ] },
  { id: 9, title: "Pesto Penne", category: "Pasta", image: "https://images.unsplash.com/photo-1539267821515-9a48cb52c2bb?w=800", time: "20 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 500, protein: "14g", carbs: "60g", fat: "22g" },
    description: "A fast, fresh pasta tossed in a vibrant basil-pine nut pesto — bright, herby and no cooking of the sauce required.",
    instructions: [
      "Blend basil, pine nuts, garlic and parmesan with olive oil into a smooth pesto.",
      "Cook penne until al dente, reserving a splash of pasta water.",
      "Drain the pasta and return it to the warm pot.",
      "Stir in the pesto, loosening with reserved pasta water to coat evenly.",
      "Serve immediately topped with extra parmesan and pine nuts.",
    ] },
  { id: 10, title: "Spicy Arrabbiata", category: "Pasta", image: "https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=800", time: "30 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 440, protein: "12g", carbs: "68g", fat: "12g" },
    description: "A punchy Italian tomato sauce with garlic and chili flakes, tossed with pasta for a simple dish with real heat.",
    instructions: [
      "Gently fry garlic and crushed chili flakes in olive oil until fragrant, not browned.",
      "Add crushed tomatoes and a pinch of sugar, then simmer for 15-20 minutes.",
      "Cook pasta until al dente, reserving some pasta water.",
      "Toss the drained pasta into the sauce, loosening with pasta water if needed.",
      "Finish with fresh parsley and a drizzle of olive oil.",
    ] },

  // --- Chicken ---
  { id: 11, title: "Grilled Chicken Suya", category: "Chicken", image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800", time: "35 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 380, protein: "36g", carbs: "10g", fat: "20g" },
    description: "Nigerian-style skewered chicken coated in a spicy, peanut-based suya spice blend and grilled over an open flame.",
    instructions: [
      "Slice chicken into thin strips and thread onto skewers.",
      "Mix ground peanuts, cayenne, paprika, ginger and stock cubes into a dry suya spice blend.",
      "Brush the chicken with oil, then coat generously in the suya spice.",
      "Grill over high heat, turning occasionally, until charred and cooked through.",
      "Dust with a final layer of suya spice and serve with sliced onion and tomato.",
    ] },
  { id: 12, title: "Honey Garlic Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800", time: "30 mins", difficulty: "Easy", rating: 4.8, nutrition: { calories: 420, protein: "32g", carbs: "24g", fat: "18g" },
    description: "Pan-seared chicken glazed in a sticky-sweet honey and garlic sauce — quick enough for a weeknight dinner.",
    instructions: [
      "Season chicken pieces and sear in a hot pan until golden on both sides.",
      "Remove the chicken and lower the heat, then sauté minced garlic until fragrant.",
      "Stir in honey, soy sauce and a splash of water to build the glaze.",
      "Return the chicken to the pan, simmering until the sauce thickens and coats it.",
      "Garnish with sesame seeds and spring onion before serving.",
    ] },
  { id: 13, title: "Crispy Fried Chicken", category: "Chicken", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800", time: "45 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 620, protein: "34g", carbs: "28g", fat: "38g" },
    description: "Buttermilk-marinated chicken fried to a crackling, golden crust — the classic comfort-food centerpiece.",
    instructions: [
      "Marinate chicken pieces in buttermilk and spices for at least an hour.",
      "Dredge the chicken in seasoned flour, pressing it in firmly for extra crunch.",
      "Heat oil to about 175°C (350°F) in a deep pot or fryer.",
      "Fry the chicken in batches until deep golden brown and cooked through.",
      "Drain on a wire rack and rest briefly before serving to keep the crust crisp.",
    ] },
  { id: 14, title: "Chicken Shawarma", category: "Chicken", image: "https://images.unsplash.com/photo-1633321702518-7feccafb94d5?w=800", time: "40 mins", difficulty: "Medium", rating: 4.7, nutrition: { calories: 460, protein: "30g", carbs: "36g", fat: "20g" },
    description: "Marinated chicken thighs cooked until charred at the edges, sliced thin and wrapped with garlic sauce and pickles.",
    instructions: [
      "Marinate chicken thighs in yogurt, garlic, lemon juice and shawarma spices.",
      "Sear the chicken over high heat until charred at the edges and cooked through.",
      "Rest briefly, then slice into thin strips.",
      "Warm flatbreads and spread with garlic sauce.",
      "Fill with the sliced chicken, pickles and salad, then wrap tightly.",
    ] },

  // --- Dessert ---
  { id: 3, title: "Pancakes", category: "Dessert", image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800", time: "20 mins", difficulty: "Beginner", rating: 4.7, nutrition: { calories: 350, protein: "8g", carbs: "52g", fat: "11g" },
    description: "Fluffy, golden stovetop pancakes made from a simple batter — a weekend breakfast staple.",
    instructions: [
      "Whisk together flour, sugar, baking powder and a pinch of salt.",
      "In a separate bowl, whisk milk, egg and melted butter together.",
      "Combine the wet and dry ingredients, stirring just until no dry streaks remain.",
      "Pour batter onto a hot, lightly greased griddle and cook until bubbles form on top.",
      "Flip and cook the other side until golden, then serve warm with syrup.",
    ] },
  { id: 15, title: "Chocolate Lava Cake", category: "Dessert", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800", time: "25 mins", difficulty: "Medium", rating: 4.9, nutrition: { calories: 480, protein: "6g", carbs: "58g", fat: "24g" },
    description: "A rich individual chocolate cake with a molten center that flows out the moment you cut into it.",
    instructions: [
      "Melt dark chocolate and butter together until smooth.",
      "Whisk in sugar, eggs and a little flour until just combined.",
      "Pour the batter into greased ramekins.",
      "Bake in a hot oven until the edges are set but the center is still soft, about 10-12 minutes.",
      "Let rest for a minute, then invert onto a plate so the molten center flows out.",
    ] },
  { id: 16, title: "Classic Tiramisu", category: "Dessert", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800", time: "30 mins", difficulty: "Medium", rating: 4.8, nutrition: { calories: 420, protein: "7g", carbs: "42g", fat: "24g" },
    description: "Layers of coffee-soaked ladyfingers and mascarpone cream, dusted with cocoa — a no-bake Italian classic.",
    instructions: [
      "Whisk mascarpone with sugar and egg yolks until smooth and creamy.",
      "Fold in whipped cream to lighten the mascarpone mixture.",
      "Quickly dip ladyfingers in cooled espresso and layer them in a dish.",
      "Spread a layer of the mascarpone cream over the ladyfingers, then repeat the layers.",
      "Chill for at least a few hours, then dust with cocoa powder before serving.",
    ] },
  { id: 17, title: "Banana Bread", category: "Dessert", image: "https://images.unsplash.com/photo-1675712841671-cbcbe2c84103?w=800", time: "50 mins", difficulty: "Easy", rating: 4.6, nutrition: { calories: 320, protein: "5g", carbs: "48g", fat: "12g" },
    description: "A moist, dense loaf made from mashed overripe bananas — the classic way to use them up.",
    instructions: [
      "Mash ripe bananas in a bowl until mostly smooth.",
      "Mix in melted butter, sugar, egg and vanilla.",
      "Fold in flour, baking soda and a pinch of salt until just combined.",
      "Pour the batter into a greased loaf pan.",
      "Bake until a skewer inserted in the center comes out clean, about 50-55 minutes.",
    ] },
];

export default recipes;
