const HEALTH_FACTS = [
  "Oats contain beta-glucan, a soluble fiber that can help support healthy cholesterol levels as part of a balanced diet.",
  "Beans provide plant protein and fiber, which can make meals more filling.",
  "Lentils are a source of folate, iron, protein, and fiber.",
  "Chickpeas provide fiber and plant protein in one ingredient.",
  "Black beans contain anthocyanins, the pigments that give their skins a deep color.",
  "Peas are a useful source of plant protein and fiber.",
  "Edamame is young soybeans and provides complete plant protein.",
  "Tofu is made from soybeans and takes on the flavors of the foods it is cooked with.",
  "Tempeh is fermented soybeans and is typically higher in fiber than many other soy foods.",
  "Pumpkin seeds provide magnesium, zinc, and unsaturated fats.",
  "Chia seeds absorb liquid and form a gel, thanks to their soluble fiber.",
  "Ground flaxseed is easier for the body to access than whole flaxseed and adds fiber to meals.",
  "Walnuts are rich in alpha-linolenic acid, a plant-based omega-3 fat.",
  "Almonds provide vitamin E, fiber, and mostly unsaturated fats.",
  "Pistachios contain protein and fiber, and their shells can slow down snacking.",
  "Peanuts are legumes, not tree nuts, and provide protein and unsaturated fats.",
  "Brazil nuts are especially rich in selenium, so a small serving is usually enough.",
  "Hazelnuts provide vitamin E and monounsaturated fats.",
  "Cashews contain copper, a mineral used in energy production and connective tissue.",
  "Sunflower seeds are a source of vitamin E and unsaturated fats.",
  "Avocados provide fiber and mostly monounsaturated fat.",
  "Olive oil is rich in monounsaturated fat and is a staple of Mediterranean-style cooking.",
  "Canola oil provides alpha-linolenic acid, a plant-based omega-3 fat.",
  "Sesame seeds provide copper and add a nutty flavor to dishes.",
  "Tahini is ground sesame seed paste and can add unsaturated fats to sauces and dressings.",
  "Brown rice keeps its bran layer, which adds fiber compared with white rice.",
  "Quinoa contains all nine essential amino acids, making it a complete plant protein.",
  "Barley contains beta-glucan fiber, also found in oats.",
  "Bulgur is a whole-grain wheat that cooks quickly because it is parboiled and cracked.",
  "Whole-wheat pasta generally contains more fiber than refined pasta.",
  "Buckwheat is naturally gluten-free despite having wheat in its name.",
  "Amaranth is a naturally gluten-free grain-like seed with protein and minerals.",
  "Popcorn is a whole grain when prepared without excessive salt, sugar, or added fat.",
  "Whole-grain bread can provide more fiber than bread made from refined flour.",
  "Potatoes contain potassium, and much of their fiber is found in the skin.",
  "Sweet potatoes provide beta-carotene, which the body can convert to vitamin A.",
  "Carrots are rich in beta-carotene, a precursor to vitamin A.",
  "Red bell peppers are an excellent source of vitamin C.",
  "Broccoli provides vitamin C, folate, and fiber.",
  "Cauliflower is a source of vitamin C and can be used in many different textures and dishes.",
  "Brussels sprouts contain fiber and vitamin K.",
  "Kale provides vitamins K, A, and C.",
  "Spinach contains folate and vitamin K, and cooking it reduces its volume substantially.",
  "Swiss chard is a leafy green that supplies vitamins K and A.",
  "Cabbage is a source of vitamin C and fiber, whether eaten raw or cooked.",
  "Red cabbage gets its color from anthocyanins, a group of plant pigments.",
  "Tomatoes provide lycopene, which becomes more available when tomatoes are cooked with a little oil.",
  "Mushrooms exposed to ultraviolet light can provide vitamin D.",
  "Garlic contains sulfur compounds that contribute to its characteristic aroma and flavor.",
  "Onions contain prebiotic fibers that can be used by beneficial gut bacteria.",
  "Leeks are part of the same allium family as onions and garlic.",
  "Asparagus provides folate and is naturally low in calories.",
  "Green beans contribute fiber and vitamin C to meals.",
  "Beets contain dietary nitrates, which the body can convert into nitric oxide.",
  "Radishes add crunch and vitamin C while being naturally low in calories.",
  "Pumpkin flesh provides beta-carotene and fiber.",
  "Zucchini is mostly water, which helps it stay tender when cooked quickly.",
  "Eggplant contains fiber and gets its purple color from anthocyanins.",
  "Celery adds fluid and crunch, though it is not a meaningful source of 'negative calories.'",
  "Cucumbers are mostly water and can contribute to daily fluid intake.",
  "Romaine lettuce provides folate and vitamin K.",
  "Watercress is a leafy green that provides vitamin K and vitamin C.",
  "Okra contains soluble fiber, which gives cooked okra its characteristic texture.",
  "Seaweed can contain iodine, a mineral needed to make thyroid hormones; levels vary by type.",
  "Kimchi is a fermented vegetable food, though pasteurization can reduce its live cultures.",
  "Sauerkraut is fermented cabbage; refrigerated, unpasteurized versions may contain live cultures.",
  "Plain yogurt provides protein and calcium, and some varieties contain live cultures.",
  "Kefir is a fermented milk drink that typically contains a variety of live cultures.",
  "Milk provides calcium and protein, and many varieties are fortified with vitamin D.",
  "Cheese can provide calcium and protein, though sodium and saturated fat vary by type.",
  "Cottage cheese is a protein-rich dairy food; its sodium content varies among brands.",
  "Eggs provide high-quality protein and choline, a nutrient used by the brain and nervous system.",
  "The yolk contains most of an egg's choline and vitamin D.",
  "Salmon provides protein and long-chain omega-3 fats EPA and DHA.",
  "Sardines provide omega-3 fats, and canned sardines with bones also provide calcium.",
  "Mackerel is an oily fish rich in omega-3 fats; choose lower-mercury varieties such as Atlantic mackerel.",
  "Trout provides protein and omega-3 fats, with levels varying by species and farming method.",
  "Tuna is a lean source of protein; mercury levels vary by species, so vary seafood choices.",
  "Oysters are rich in zinc, a mineral involved in immune function and wound healing.",
  "Shrimp is a lean protein source and naturally contains iodine and selenium.",
  "Chicken provides complete protein, and removing the skin lowers its fat content.",
  "Turkey provides protein and is also a source of selenium.",
  "Lean beef provides protein, iron, zinc, and vitamin B12.",
  "Pork is a source of thiamin, a B vitamin involved in energy metabolism.",
  "Liver is extremely rich in vitamin A, so it is best eaten in modest portions.",
  "Bone-in canned salmon includes soft edible bones that provide calcium.",
  "Apples contain pectin, a type of soluble fiber concentrated partly in the skin.",
  "Pears provide fiber, especially when eaten with their skin.",
  "Oranges are well known for vitamin C and also provide folate and fiber.",
  "Kiwi provides vitamin C and fiber, including when the edible skin is left on.",
  "Strawberries provide vitamin C and anthocyanin pigments.",
  "Blueberries contain anthocyanins, which give them their blue-purple color.",
  "Raspberries are high in fiber relative to many other fruits.",
  "Blackberries provide fiber and vitamin C.",
  "Bananas provide potassium and vitamin B6.",
  "Green bananas contain more resistant starch than ripe bananas.",
  "Mango provides vitamin C and beta-carotene.",
  "Papaya contains vitamin C and the enzyme papain, which helps break down proteins.",
  "Pineapple provides vitamin C and bromelain, a group of protein-digesting enzymes.",
  "Guava is especially rich in vitamin C and also provides fiber.",
  "Watermelon contributes fluid and contains lycopene.",
  "Cantaloupe provides beta-carotene and vitamin C.",
  "Cherries contain anthocyanins, the pigments that give many varieties their red color.",
  "Grapes provide fluid and plant compounds in their skins, including resveratrol in some varieties.",
  "Dried fruit is nutritious but more concentrated in natural sugars and calories than fresh fruit by weight.",
  "Prunes provide fiber and sorbitol, which can have a laxative effect for some people.",
  "Dates provide fiber and potassium, but are energy-dense because they are dried fruit.",
  "Raisins are dried grapes and provide concentrated carbohydrates and small amounts of iron.",
  "Citrus zest contains aromatic oils and can add flavor without much added salt or sugar.",
  "Lemons provide vitamin C and their acidity can brighten food flavors.",
  "Cocoa powder contains flavanols, though processing methods affect how much remains.",
  "Dark chocolate contains cocoa flavanols, but it can also be high in added sugar and energy.",
  "Unsweetened tea contributes fluid, and green tea naturally contains caffeine and catechins.",
  "Coffee is a major dietary source of antioxidants for many adults, though caffeine sensitivity varies.",
  "Water is essential for temperature regulation, digestion, and transporting nutrients.",
  "Herbs and spices can add flavor, helping meals taste satisfying with less added salt.",
  "Ginger contains gingerols and can add a warming flavor to meals and drinks.",
  "Turmeric contains curcumin, but the amount absorbed from ordinary meals is limited.",
  "Cinnamon adds sweetness-like aroma without adding sugar.",
  "Chili peppers contain capsaicin, which creates their heat and can temporarily affect appetite or warmth.",
  "Black pepper contains piperine, which contributes to its pungency.",
  "Basil provides aromatic plant compounds and can add freshness to dishes.",
  "Parsley provides vitamin K and can be used as more than a garnish.",
  "Cilantro leaves and coriander seeds come from the same plant but have different flavors.",
  "Mint adds flavor to food and drinks without needing added sugar.",
  "Rosemary's aroma comes from plant compounds also found in other herbs.",
  "Oregano is a flavorful herb that can help reduce reliance on extra salt in some recipes.",
  "Fermented foods can contribute live microbes when they are not pasteurized after fermentation.",
  "Prebiotic fibers in foods such as onions, oats, and beans feed some gut microbes.",
  "Dietary fiber supports regular bowel movements and is found in plant foods, not meat or dairy.",
  "Eating a variety of plant foods helps provide a broader range of fibers and micronutrients.",
  "Pairing plant-based iron sources with vitamin C-rich foods can improve iron absorption.",
  "Calcium supports bones and teeth and is also needed for muscle contraction and nerve signaling.",
  "Vitamin D helps the body absorb calcium, and few foods naturally contain large amounts.",
  "Vitamin B12 is naturally found in animal foods; fortified foods can provide it for plant-based diets.",
  "Folate is important for making DNA and is especially important before and during early pregnancy.",
  "Potassium helps support normal muscle and nerve function and is found in many fruits and vegetables.",
  "Iron is needed to make hemoglobin, the protein that carries oxygen in red blood cells.",
  "Zinc supports immune function and wound healing and is found in seafood, meat, beans, and seeds.",
  "Iodine is needed to make thyroid hormones; iodized salt is a common dietary source.",
  "Sodium is an essential nutrient, but many people consume more than recommended from packaged foods.",
  "Reading nutrition labels can help compare sodium, fiber, and added sugar across similar products.",
  "Frozen vegetables are often frozen soon after harvest and can be as nutritious as fresh vegetables.",
  "Canned beans can be a convenient source of fiber and protein; rinsing them can reduce sodium.",
  "Canned tomatoes are a convenient source of lycopene and can form the base of quick meals.",
  "A balanced meal often combines vegetables or fruit, a protein source, and a grain or starchy food.",
  "Protein needs vary with age, body size, activity, pregnancy, and health status.",
  "Unsaturated fats from foods like nuts, seeds, and olive oil can replace saturated fats in meals.",
  "Whole fruit contains fiber and is generally more filling than the same fruit as juice.",
  "Juice can provide vitamins, but it has less fiber and is easier to drink quickly than whole fruit.",
];

const STORAGE_KEY = "cookify_loading_health_fact_queue_v1";

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getLoadingFacts() {
  let queue = [];
  try {
    const savedQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      Array.isArray(savedQueue) &&
      savedQueue.length >= 2 &&
      savedQueue.every((index) => Number.isInteger(index) && index >= 0 && index < HEALTH_FACTS.length) &&
      new Set(savedQueue).size === savedQueue.length
    ) {
      queue = savedQueue;
    }
  } catch {
    queue = [];
  }

  if (queue.length < 2) queue = shuffle(HEALTH_FACTS.map((_, index) => index));

  const selected = queue.splice(0, 2).map((index) => HEALTH_FACTS[index]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    return selected;
  }
  return selected;
}

export { HEALTH_FACTS };