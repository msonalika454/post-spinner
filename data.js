/*
  POST SPINNER IDEAS
  Edit anything in this file, save it, and refresh the page.

  Rules so nothing breaks:
  - Keep the quotes around every line, and a comma after every line.
  - A hook that contains a double quote needs a backslash before it: \"like this\".
  - If the page shows a red "data.js" message, a quote or comma went missing.
*/

window.POST_SPINNER_DATA = {
  /* The filter chips. "All" is added automatically. */
  niches: ["Outfits", "Behind the scenes", "Educational", "Trends"],

  /* The Format slot. */
  formats: ["Reel", "Carousel", "Story", "Static Post", "Live"],

  /*
    The Topic slot.
    "niches" says which filter chips show this topic. Use the names listed above.
  */
  topics: [
    { name: "GRWM", niches: ["Outfits", "Behind the scenes"] },
    { name: "Outfit repeat challenge", niches: ["Outfits", "Trends"] },
    { name: "Thrift haul", niches: ["Outfits", "Trends"] },
    { name: "Styling one piece 5 ways", niches: ["Outfits", "Educational"] },
    { name: "Fashion myth busting", niches: ["Educational"] },
    { name: "Closet declutter", niches: ["Behind the scenes", "Educational"] },
    { name: "Trend review", niches: ["Trends"] },
    { name: "Budget vs splurge", niches: ["Educational", "Trends"] },
    { name: "Behind the scenes", niches: ["Behind the scenes"] },
    { name: "Q&A", niches: ["Behind the scenes", "Educational"] }
  ],

  /*
    The Hook slot.
    Hooks are grouped so they suit the topic they land on: a topic only pulls
    hooks from its own niches, plus the "Any" group.
    To add a hook, add a line to any group.
  */
  hooks: {
    Any: [
      "Stop wearing this wrong.",
      "Nobody talks about this.",
      "I wish I knew this sooner.",
      "Save this before you go shopping.",
      "Here's what I'd do differently."
    ],
    Outfits: [
      "Your closet already has this outfit.",
      "Three outfits. Zero new clothes.",
      "This whole look cost less than lunch.",
      "I wore this for a week. Here's what happened.",
      "Rate this fit before I leave the house."
    ],
    "Behind the scenes": [
      "What my feed doesn't show you.",
      "This shot took 40 tries. Here's take one.",
      "This is what posting daily really looks like.",
      "Come plan a shoot with me.",
      "You asked. I'm finally answering."
    ],
    Educational: [
      "That fashion rule? It's outdated.",
      "Here's why that outfit feels off.",
      "The cheap version is actually better.",
      "Proportions fix everything. Let me show you.",
      "Nobody taught you this about fit."
    ],
    Trends: [
      "I tried the viral look so you don't have to.",
      "This trend is already over.",
      "Everyone's buying this. Should you?",
      "Give this trend six months.",
      "Is this worth the hype?"
    ]
  }
};
