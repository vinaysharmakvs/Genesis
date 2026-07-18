(function () {
  const results = [
    ["Raghav", "98.9 percentile in JEE Main - PEC CSE"],
    ["Arjun", "IIT Bombay - Computer Science"],
    ["Suneeti", "94.2 percentile - PEC CSE"],
    ["Shaurya", "NEET 2025 selection"],
    ["Pari", "Government seat at CCET Chandigarh - CSE"],
    ["Dhruv", "NEET 2025 selection - MBBS"],
    ["Mananpreet", "JEE Main qualifier - top engineering college"],
    ["Harsh Dalal", "BITS Pilani - Engineering"],
    ["Apoorav", "PEC - Engineering"],
    ["Pratibha", "IIT Ropar"],
    ["Yug", "IIT Mandi"],
    ["Ishika & Preeti", "KGK Medical College - NEET 2024"],
    ["Savanyu Panjeta", "NIT Kurukshetra - AI/ML"],
    ["Aman Sood", "PEC - CSE"],
    ["Manya Gupta", "99.2 percentile - MNIT Jaipur and IIT Kanpur story"],
    ["Vansh", "BITS Pilani"],
    ["Garima", "BITS Pilani"],
    ["Mihir", "UIET Chandigarh"],
    ["Gungun", "CCA Chandigarh - Architecture"],
    ["Rashi", "VIT Vellore"],
    ["Oorjit", "DTU selection"],
    ["Divyansh", "Punjab Engineering College"],
    ["Sparsh", "UIET + NDA qualifier"],
    ["Swayam Jain", "Punjab Engineering College"],
    ["Sambhav", "PEC"],
    ["Eshaan Walia", "Thapar Institute of Engineering & Technology"],
    ["Samya", "99.5 percentile - GMCH Chandigarh"],
    ["Jashanpreet", "Punjab Engineering College"],
    ["Adarsh", "97+ percentile in JEE Main"],
    ["Kunal", "IISER Mohali + NEET qualifier"],
    ["Vidul Garg", "93.75 percentile - BITS Pilani"],
    ["Ravinder", "Thapar Institute of Engineering"],
    ["Aryan Goyal", "97.85 percentile - Punjab Engineering College"],
    ["Vibhav", "97.2 percentile in JEE Main"],
    ["Manik Goyal", "94.3 percentile - Punjab Engineering College"],
    ["Archit", "98.77 percentile - PEC Computer Engineering"],
    ["Manik Aggarwal", "IIT Mandi"],
    ["Aayan", "96.2 percentile - Punjab Engineering College"],
  ];

  const answers = {
    courses:
      "Genesis supports Classes 8-12 for CBSE and ICSE, plus Boards, JEE Main & Advanced, NEET, NDA, Olympiads and career clarity guidance.",
    system:
      "The Genesis system includes phones at entry, weekly written tests, oral vivas, syllabus completion by October, mindset workshops, parent workshops, self-study staybacks and weekly updates.",
    seminar:
      "The Student Seminar System gives students a topic, deep preparation time, board presentation practice, and recordings shared with parents. It builds concept clarity, confidence and communication.",
    parent:
      "Saturday Parent Hour is every Saturday from 2:30 PM to 3:30 PM. Parents can visit without appointment and speak to the Academic Head.",
    branches:
      "Genesis branches: SCO-293 & 294, Sector 20 Panchkula; SCO-13, Sector 15 Panchkula; SCO-17, Near Dominos, VIP Road Zirakpur. See the interactive map on contact.html.",
    contact:
      "You can call Genesis at 9041056405 or 7696016405. You can also use the Contact page for map, directions and WhatsApp inquiry.",
    results:
      "Genesis highlights include 100+ selections from small batches, IIT/NIT/BITS/PEC/NEET/GMCH/IISER/DTU/UIET/Thapar/VIT stories, 160+ board champions above 90%, and 250+ students showing 15%+ improvement.",
    videos:
      "The home page has a Genesis video gallery with selected YouTube videos. Click any thumbnail to play the video on the same page.",
    founder:
      "Genesis was started by Sahil Khanna in 2009 with 3 students. The Genesis philosophy is to strengthen students through structure, confidence and personal attention.",
    counselling:
      "For counselling, branch visit, fees and batch availability, call 9041056405 or 7696016405. You can also use the Contact page inquiry form.",
  };

  const knowledgeBase = [
    { keys: ["course", "courses", "class", "classes", "8", "9", "10", "11", "12", "cbse", "icse", "jee", "neet", "nda", "board", "olympiad"], answer: answers.courses },
    { keys: ["system", "phone", "phones", "entry", "weekly", "test", "tests", "viva", "oral", "syllabus", "october", "mindset", "workshop", "self", "study", "updates"], answer: answers.system },
    { keys: ["seminar", "presentation", "present", "teach", "teaches", "confidence", "communication", "recording", "parents"], answer: answers.seminar },
    { keys: ["parent", "parents", "saturday", "ptm", "hour", "academic", "head"], answer: answers.parent },
    { keys: ["branch", "branches", "map", "location", "address", "direction", "directions", "sector", "panchkula", "zirakpur", "vip"], answer: `${answers.branches}<br><br>Open <a href="contact.html">Contact & Map</a>.` },
    { keys: ["call", "contact", "whatsapp", "phone", "number", "mobile", "visit"], answer: `${answers.contact}<br><br><a href="contact.html">Open Contact page</a>` },
    { keys: ["fee", "fees", "admission", "counselling", "counseling", "batch", "availability", "enquiry", "inquiry"], answer: answers.counselling },
    { keys: ["video", "videos", "youtube", "playlist", "thumbnail", "watch"], answer: answers.videos },
    { keys: ["founder", "sahil", "khanna", "started", "history", "since", "2009"], answer: answers.founder },
  ];

  const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");

  const findResult = (query) => {
    const clean = normalize(query);
    return results.filter(([name, outcome]) => {
      const haystack = normalize(`${name} ${outcome}`);
      return clean.split(/\s+/).some((word) => word.length > 2 && haystack.includes(word));
    }).slice(0, 5);
  };

  const findBestWebsiteAnswer = (query) => {
    const words = normalize(query).split(/\s+/).filter((word) => word.length > 1);
    let best = { score: 0, answer: "" };

    knowledgeBase.forEach((item) => {
      const score = item.keys.reduce((total, key) => {
        return total + (words.some((word) => key.includes(word) || word.includes(key)) ? 1 : 0);
      }, 0);
      if (score > best.score) best = { score, answer: item.answer };
    });

    return best.score ? best.answer : "";
  };

  const replyFor = (input) => {
    const q = normalize(input);

    if (q.includes("result") || q.includes("iit") || q.includes("neet") || q.includes("jee") || q.includes("bits") || q.includes("pec") || q.includes("champion")) {
      const matches = findResult(input);
      if (matches.length) {
        return `Here are matching Genesis result stories:<br>${matches.map(([name, result]) => `- <b>${name}</b>: ${result}`).join("<br>")}<br><br>Open <a href="results.html">Results page</a> for full journeys.`;
      }
      return `${answers.results}<br><br>Open <a href="results.html">Results page</a> to search all champions.`;
    }

    const mappedAnswer = findBestWebsiteAnswer(input);
    if (mappedAnswer) return mappedAnswer;

    return "I searched the available Genesis website content but could not find an exact match. I can help with courses, Genesis system, seminars, results, branches, map, videos, counselling and contact details. Try typing: 'show IIT results', 'where is branch', 'fees counselling', or 'what is Genesis system'.";
  };

  const addMessage = (container, text, type) => {
    const msg = document.createElement("div");
    msg.className = `gene-msg ${type}`;
    msg.innerHTML = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  };

  const createChatbot = () => {
    const launcher = document.createElement("button");
    launcher.className = "gene-chat-launcher";
    launcher.type = "button";
    launcher.innerHTML = '<span class="gene-chat-dot">G</span><span>Ask Gen-E</span>';

    const chat = document.createElement("section");
    chat.className = "gene-chat-window";
    chat.setAttribute("aria-label", "Gen-E chatbot");
    chat.innerHTML = `
      <div class="gene-chat-head">
        <div class="gene-chat-title">
          <div class="gene-chat-avatar">G</div>
          <div><strong>Gen-E</strong><span>Genesis guidance assistant</span></div>
        </div>
        <button class="gene-chat-close" type="button" aria-label="Close Gen-E">x</button>
      </div>
      <div class="gene-chat-messages"></div>
      <div>
        <div class="gene-chat-helper">Type any question. Gen-E will map it with website content.</div>
        <div class="gene-chat-quick">
          <button class="gene-chip" type="button">Courses</button>
          <button class="gene-chip" type="button">Results</button>
          <button class="gene-chip" type="button">Branches</button>
          <button class="gene-chip" type="button">Seminars</button>
          <button class="gene-chip" type="button">Videos</button>
          <button class="gene-chip" type="button">Contact</button>
        </div>
        <form class="gene-chat-form">
          <input type="text" placeholder="Type here: fees, IIT results, branch map..." aria-label="Ask Gen-E" />
          <button type="submit">Send</button>
        </form>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(chat);

    const messages = chat.querySelector(".gene-chat-messages");
    const input = chat.querySelector("input");

    launcher.addEventListener("click", () => {
      chat.classList.toggle("open");
      if (chat.classList.contains("open") && !messages.dataset.started) {
        addMessage(messages, "Hi, I am <b>Gen-E</b>. Ask me about Genesis courses, branches, results, seminars, parent hour or counselling.", "bot");
        addMessage(messages, "You can type naturally, for example: <b>show IIT results</b>, <b>where is Sector 20 branch</b>, or <b>what classes do you teach?</b>", "bot");
        messages.dataset.started = "true";
      }
    });

    chat.querySelector(".gene-chat-close").addEventListener("click", () => chat.classList.remove("open"));

    chat.querySelectorAll(".gene-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.textContent;
        addMessage(messages, text, "user");
        addMessage(messages, replyFor(text), "bot");
      });
    });

    chat.querySelector(".gene-chat-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage(messages, text, "user");
      addMessage(messages, replyFor(text), "bot");
      input.value = "";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createChatbot);
  } else {
    createChatbot();
  }
})();
