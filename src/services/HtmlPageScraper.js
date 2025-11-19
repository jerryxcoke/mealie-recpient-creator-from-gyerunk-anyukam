(function () {
  function extractText(el) {
    return el ? el.textContent.trim() : "";
  }

  const recipes = {
    week: "", // Hét szám, amit a nutrition-headerből kinyerünk
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };

  // Kinyerjük a hét számát a nutrition-header-ből
  const headerElement = document.querySelector("nutrition-header");
  const weekText = headerElement ? extractText(headerElement.querySelector(".current")) : "";
  const weekMatch = weekText.match(/(\d+)\s*\.? hét/);
  recipes.week = weekMatch ? weekMatch[1] : "Ismeretlen hét";

  // A napok lefordítása magyar szövegre
  const dayNames = {
    hétfő: "monday",
    kedd: "tuesday",
    szerda: "wednesday",
    csütörtök: "thursday",
    péntek: "friday",
    szombat: "saturday",
    vasárnap: "sunday"
  };

  function extractRecipesForDay(dayName) {
    const recipesForDay = [];
    document.querySelectorAll("nutrition-recipe").forEach((el) => {
      const title = extractText(el.querySelector(".meal-title"));
      const name = extractText(el.querySelector("h3 > span + span > p"));
      const fullName = name || "Ismeretlen recept";
      const description = title ? `${title}: ${name}` : name;

      const ingredients = Array.from(
        el.querySelectorAll(".nutrition-recipe-ingredients li")
      ).map((li) => li.textContent.trim());

      const nutrition = {};
      el.querySelectorAll(".nutrition-tag").forEach((tag) => {
        const label = extractText(tag.querySelector(".tag-name")).toLowerCase();
        const value = extractText(tag.querySelector(".tag-value")).replace("\xa0", " ");
        if (label.includes("energia")) nutrition.calories = value;
        else if (label.includes("fehérje")) nutrition.proteinContent = value;
        else if (label.includes("zsír")) nutrition.fatContent = value;
        else if (label.includes("szénhidrát")) nutrition.carbohydrateContent = value;
      });

      const image = el.querySelector("img.recipe-preview")?.src || "";

      const instructionParagraphs = el.querySelectorAll(".nutrition-recipe-preparation p");
      const instructions = Array.from(instructionParagraphs).map(p => ({
        "@type": "HowToStep",
        text: extractText(p)
      }));

      const recipe = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: fullName,
        description,
        image: image ? [image] : [],
        recipeYield: "1 adag",
        recipeIngredient: ingredients,
        recipeInstructions: instructions.length > 0 ? instructions : [{
          "@type": "HowToStep",
          text: "Az elkészítési leírás nem található."
        }],
        nutrition: {
          "@type": "NutritionInformation",
          ...nutrition,
        },
        keywords: title?.toLowerCase() || "",
      };

      recipesForDay.push(recipe);
    });
    return recipesForDay;
  }

  // Segédfüggvény a napok kiválasztásához
  function selectDay(dayText) {
    const buttons = document.querySelectorAll(".day .content");
    buttons.forEach((button) => {
      if (button.textContent.trim() === dayText) {
        button.click();
      }
    });
  }

  // Átváltjuk az összes napot és begyűjtjük a receptet minden napra
  const allDayNames = Object.keys(dayNames);

  async function collectRecipes() {
    for (let day of allDayNames) {
      const dayText = day; // magyar napok
      selectDay(dayText);

      // Várunk, hogy a receptlista betöltődjön
      await new Promise(resolve => setTimeout(resolve, 2000)); // Várakozás 2 másodpercig, hogy a receptlista betöltődjön

      const recipesForDay = extractRecipesForDay(day);
      recipes[dayNames[day]] = recipesForDay;
    }

    // A dátum és hét szám generálása
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const datePart = `${year}_${month}_${day}`;

    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    const currentWeek = getWeekNumber(now);

    const filename = `mealie_export_week${currentWeek}_${datePart}.json`;

    const blob = new Blob([JSON.stringify(recipes, null, 2)], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  collectRecipes();
})();