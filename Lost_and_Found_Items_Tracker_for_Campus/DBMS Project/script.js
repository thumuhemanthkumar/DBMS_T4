/* =========================================================
   Fetch — Campus Lost & Found
   MongoDB-backed client-side app logic
   ========================================================= */

(function(){
"use strict";

/* ---------------------------------------------------------
   Theme toggle
--------------------------------------------------------- */
(function initTheme(){
  const saved = localStorage.getItem("fetch_lf_theme") || "dark";
  applyTheme(saved);

  const toggleBtns = [
    document.getElementById("themeToggleAuth"),
    document.getElementById("themeToggleTop")
  ];

  toggleBtns.forEach(btn=>{
    if(!btn) return;

    btn.addEventListener("click", ()=>{
      const next =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "dark"
          : "light";

      applyTheme(next);
      localStorage.setItem("fetch_lf_theme", next);
    });
  });

  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);

    document.querySelectorAll(".theme-toggle-icon").forEach(el=>{
      el.textContent = mode === "light" ? "☀" : "☾";
    });
  }
})();


/* ---------------------------------------------------------
   Clear authentication fields
--------------------------------------------------------- */
function clearAuthFields(){
  ["authName","authEmail","authPassword"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
}

clearAuthFields();
window.addEventListener("pageshow", clearAuthFields);
setTimeout(clearAuthFields, 50);


/* ---------------------------------------------------------
   Campus locations
--------------------------------------------------------- */
const FLOORS = [
  { n:-1, short:"B1", label:"Basement", name:"Basement (Floor −1)" },
  { n:0,  short:"G",  label:"Ground",   name:"Ground Floor" },
  { n:1,  short:"1",  label:"1st",      name:"First Floor" },
  { n:2,  short:"2",  label:"2nd",      name:"Second Floor" },
  { n:3,  short:"3",  label:"3rd",      name:"Third Floor" },
  { n:4,  short:"4",  label:"4th",      name:"Fourth Floor" },
];

const LOCATIONS = [];

function addSpace(id, name, floor, kind, icon, label){
  LOCATIONS.push({
    id,
    name,
    floor,
    kind,
    icon: icon || "",
    label: label || name
  });
}

function addRooms(floor, from, to){
  for(let n = from; n <= to; n++){
    const num = String(n).padStart(3, "0");

    addSpace(
      "r"+num,
      "Room "+num,
      floor,
      "room",
      "",
      num
    );
  }
}

addSpace("canteen", "Canteen", -1, "special", "🍽");
addSpace("lab14", "Lab 14", -1, "lab", "🧪", "14");
addSpace("lab15", "Lab 15", -1, "lab", "🧪", "15");

addRooms(0, 1, 8);
addRooms(1, 101, 108);

addSpace("library", "Library", 2, "special", "📚");
addRooms(2, 201, 206);

addSpace("auditorium", "Auditorium", 3, "special", "🎭");
addRooms(3, 301, 307);

addRooms(4, 401, 407);

const CATEGORIES = [
  "Electronics",
  "Bags & Backpacks",
  "ID Cards & Documents",
  "Books & Stationery",
  "Keys",
  "Clothing & Accessories",
  "Water Bottles & Flasks",
  "Sports Equipment",
  "Jewelry",
  "Other"
];


/* ---------------------------------------------------------
   Local storage
--------------------------------------------------------- */
const DB = {

  key: "fetch_lf_db_v2",

  read(){

    try{
      return JSON.parse(
        localStorage.getItem(this.key)
      ) || this.seed();

    }catch(e){

      return this.seed();

    }
  },

  write(data){
    localStorage.setItem(
      this.key,
      JSON.stringify(data)
    );
  },

  seed(){

    const now = Date.now();
    const day = 86400000;

    const users = [];

    const items = [
      {
        id:"i1",
        type:"lost",
        name:"Black Wildcraft Backpack",
        category:"Bags & Backpacks",
        description:"Black backpack with a laptop sleeve and a small tear on the front pocket. Had a blue keychain.",
        date:isoDate(now-2*day),
        time:"14:30",
        location:"library",
        image:null,
        reporterId:"",
        status:"open",
        createdAt:now-2*day
      },

      {
        id:"i2",
        type:"found",
        name:"Black Backpack near reading hall",
        category:"Bags & Backpacks",
        description:"Found a black backpack with laptop compartment, blue keychain attached, near the library reading hall.",
        date:isoDate(now-1*day),
        time:"15:10",
        location:"library",
        image:null,
        reporterId:"",
        status:"open",
        createdAt:now-1*day
      },

      {
        id:"i3",
        type:"lost",
        name:"Silver Titan Wristwatch",
        category:"Jewelry",
        description:"Silver analog wristwatch, leather strap, lost somewhere near the canteen during lunch.",
        date:isoDate(now-4*day),
        time:"13:00",
        location:"canteen",
        image:null,
        reporterId:"",
        status:"open",
        createdAt:now-4*day
      },

      {
        id:"i4",
        type:"found",
        name:"Blue Steel Water Bottle",
        category:"Water Bottles & Flasks",
        description:"Blue steel water bottle with a college fest sticker, found on a workbench in Lab 15.",
        date:isoDate(now-3*day),
        time:"18:00",
        location:"lab15",
        image:null,
        reporterId:"",
        status:"open",
        createdAt:now-3*day
      },

      {
        id:"i5",
        type:"lost",
        name:"Student ID Card — Rahul M.",
        category:"ID Cards & Documents",
        description:"Lost my campus ID card, name Rahul Menon, likely near Room 305 or the auditorium.",
        date:isoDate(now-1*day),
        time:"09:15",
        location:"r305",
        image:null,
        reporterId:"",
        status:"open",
        createdAt:now-1*day
      },

      {
        id:"i6",
        type:"found",
        name:"USB-C Charger",
        category:"Electronics",
        description:"White 65W USB-C charger found plugged into a socket in Room 102.",
        date:isoDate(now-5*day),
        time:"11:00",
        location:"r102",
        image:null,
        reporterId:"",
        status:"returned",
        createdAt:now-5*day
      }
    ];

    const claims = [];

    const data = {
      users,
      items,
      claims
    };

    this.write(data);

    return data;
  }
};


/* ---------------------------------------------------------
   MongoDB API
--------------------------------------------------------- */
const API_BASE = "/api";


/* =========================================================
   USER API
========================================================= */

async function registerUser(name, email, password, role){

  const response = await fetch(
    `${API_BASE}/users/register`,
    {
      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({
        name,
        email,
        password,
        role
      })
    }
  );

  const data = await response.json().catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error ||
      data.message ||
      `Registration failed (${response.status})`
    );
  }

  return data;
}


async function loginUser(email, password){

  const response = await fetch(
    `${API_BASE}/users/login`,
    {
      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json().catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error ||
      data.message ||
      `Login failed (${response.status})`
    );
  }

  return data;
}


/* =========================================================
   ITEMS API
========================================================= */

/*
   FIXED VERSION

   Backend response:

   {
     success: true,
     items: [...]
   }

   Older frontend expected the response itself
   to be an array. This function now supports
   both formats.
*/

async function loadItemsFromMongo(){

  const response = await fetch(
    `${API_BASE}/items`
  );

  if(!response.ok){

    throw new Error(
      `Failed to load items (${response.status})`
    );
  }

  const data = await response.json();

  const items =
    Array.isArray(data)
      ? data
      : Array.isArray(data.items)
        ? data.items
        : [];

  db.items = items.map(item => {

    let itemId =
      item.id;

    if(!itemId && item._id){

      if(
        typeof item._id === "object" &&
        item._id.$oid
      ){
        itemId = item._id.$oid;
      }else{
        itemId = String(item._id);
      }

    }

    return {

      ...item,

      id:
        itemId ||
        uid("i"),

      createdAt:
        item.createdAt
          ? new Date(item.createdAt).getTime()
          : Date.now()

    };

  });

  DB.write(db);

  console.log(
    "Loaded items from MongoDB:",
    db.items
  );

  return db.items;
}


async function createItemInMongo(item){

  const response = await fetch(
    `${API_BASE}/items`,
    {
      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify(item)
    }
  );

  const data =
    await response.json().catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error ||
      `Failed to create item (${response.status})`
    );
  }

  return data.item || data;
}


async function updateItemInMongo(itemId, updates){

  const response = await fetch(
    `${API_BASE}/items/${encodeURIComponent(itemId)}`,
    {
      method:"PUT",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify(updates)
    }
  );

  const data =
    await response.json().catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error ||
      `Failed to update item (${response.status})`
    );
  }

  return data.item || data;
}


async function deleteItemInMongo(itemId){

  const response = await fetch(
    `${API_BASE}/items/${encodeURIComponent(itemId)}`,
    {
      method:"DELETE"
    }
  );

  const data =
    await response.json().catch(()=>({}));

  if(!response.ok){

    throw new Error(
      data.error ||
      `Failed to delete item (${response.status})`
    );
  }

  return data;
}


async function refreshItemsFromMongo(){

  try{

    await loadItemsFromMongo();

    return true;

  }catch(error){

    console.error(
      "MongoDB API error:",
      error
    );

    toast(
      "Could not load items from MongoDB."
    );

    return false;
  }
}


/* =========================================================
   Utility functions
========================================================= */

function isoDate(ts){
  return new Date(ts)
    .toISOString()
    .slice(0,10);
}


function uid(prefix){
  return prefix +
    "_" +
    Math.random()
      .toString(36)
      .slice(2,9);
}


function locName(id){

  const l =
    LOCATIONS.find(l=>l.id===id);

  return l ? l.name : id;
}


function locFloor(id){

  const l =
    LOCATIONS.find(l=>l.id===id);

  return l
    ? FLOORS.find(f=>f.n===l.floor)
    : null;
}


function locFull(id){

  const f = locFloor(id);

  return locName(id) +
    (
      f
        ? " · " +
          f.label +
          (f.n>0 ? " floor" : "")
        : ""
    );
}


function timeAgo(ts){

  const timestamp =
    typeof ts === "number"
      ? ts
      : new Date(ts).getTime();

  const diff =
    Date.now() - timestamp;

  const mins =
    Math.round(diff/60000);

  if(mins < 60)
    return mins<=1
      ? "just now"
      : mins+"m ago";

  const hrs =
    Math.round(mins/60);

  if(hrs < 24)
    return hrs+"h ago";

  const days =
    Math.round(hrs/24);

  return days+"d ago";
}


/* =========================================================
   Application state
========================================================= */

let db = DB.read();

let currentUser = null;

let reportType = "lost";

let selectedReportLocation = null;

let uploadedImageData = null;

let browseFilter = "all";

let browseCategory = "all";

let adminTab = "claims";


/* =========================================================
   Matching engine
========================================================= */

function stopwords(){

  return new Set([
    "the",
    "a",
    "an",
    "and",
    "with",
    "near",
    "of",
    "in",
    "on",
    "for",
    "to",
    "was",
    "had",
    "has",
    "have",
    "my",
    "found",
    "lost",
    "it",
    "is",
    "at",
    "this",
    "that"
  ]);
}


function keywordSet(text){

  const sw =
    stopwords();

  return new Set(
    (text||"")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g," ")
      .split(/\s+/)
      .filter(
        w =>
          w.length>2 &&
          !sw.has(w)
      )
  );
}


function matchScore(a,b){

  if(a.type === b.type)
    return 0;

  const lost =
    a.type==="lost" ? a : b;

  const found =
    a.type==="lost" ? b : a;

  let score = 0;

  if(lost.category === found.category)
    score += 40;

  if(lost.location === found.location)
    score += 25;

  else{

    const fa =
      locFloor(lost.location);

    const fb =
      locFloor(found.location);

    if(
      fa &&
      fb &&
      fa.n === fb.n
    ){
      score += 10;
    }
  }

  const dayDiff =
    Math.abs(
      new Date(lost.date) -
      new Date(found.date)
    ) / 86400000;

  if(dayDiff <= 1)
    score += 20;

  else if(dayDiff <= 3)
    score += 12;

  else if(dayDiff <= 7)
    score += 5;


  const kwA =
    keywordSet(
      lost.name +
      " " +
      lost.description
    );

  const kwB =
    keywordSet(
      found.name +
      " " +
      found.description
    );

  let overlap = 0;

  kwA.forEach(w=>{
    if(kwB.has(w))
      overlap++;
  });

  score +=
    Math.min(
      overlap * 6,
      15
    );

  return Math.min(
    Math.round(score),
    100
  );
}


function findMatchesFor(item){

  return db.items

    .filter(
      i =>
        i.id !== item.id &&
        i.type !== item.type &&
        i.status === "open"
    )

    .map(
      other => ({
        item:other,
        score:matchScore(
          item,
          other
        )
      })
    )

    .filter(
      m => m.score >= 35
    )

    .sort(
      (a,b) =>
        b.score-a.score
    );
}


function allTopMatches(){

  const openLost =
    db.items.filter(
      i =>
        i.type==="lost" &&
        i.status==="open"
    );

  const results = [];

  openLost.forEach(l=>{

    const m =
      findMatchesFor(l);

    if(m.length)
      results.push({
        lost:l,
        best:m[0]
      });

  });

  return results.sort(
    (a,b) =>
      b.best.score -
      a.best.score
  );
}


/* =========================================================
   AUTHENTICATION
========================================================= */

const authScreen =
  document.getElementById("authScreen");

const appEl =
  document.getElementById("app");

let authMode = "login";

let selectedRole = "student";


/* =========================================================
   Login / Register mode switch
========================================================= */

document
  .getElementById("authSegment")
  .addEventListener(
    "click",
    e=>{

      const btn =
        e.target.closest(".seg-btn");

      if(!btn) return;

      authMode =
        btn.dataset.mode;

      document
        .querySelectorAll(
          "#authSegment .seg-btn"
        )
        .forEach(
          b =>
            b.classList.toggle(
              "active",
              b===btn
            )
        );

      document
        .getElementById("fieldName")
        .style.display =
          authMode==="register"
            ? "block"
            : "none";

      document
        .getElementById("fieldRole")
        .style.display =
          authMode==="register"
            ? "block"
            : "none";

      document
        .getElementById("authSubmit")
        .textContent =
          authMode==="register"
            ? "Create Account"
            : "Sign In";

      document
        .getElementById("authError")
        .textContent = "";

    }
  );


document.getElementById(
  "fieldName"
).style.display = "none";


document.getElementById(
  "fieldRole"
).style.display = "none";


/* =========================================================
   Role selection
========================================================= */

document
  .getElementById("roleSelect")
  .addEventListener(
    "click",
    e=>{

      const btn =
        e.target.closest(".pill");

      if(!btn) return;

      selectedRole =
        btn.dataset.role;

      document
        .querySelectorAll(
          "#roleSelect .pill"
        )
        .forEach(
          b =>
            b.classList.toggle(
              "active",
              b===btn
            )
        );
    }
  );


/* =========================================================
   AUTH FORM
========================================================= */

document
  .getElementById("authForm")
  .addEventListener(
    "submit",
    async e=>{

      e.preventDefault();

      const email =
        document
          .getElementById("authEmail")
          .value
          .trim()
          .toLowerCase();

      const password =
        document
          .getElementById("authPassword")
          .value;

      const errorEl =
        document.getElementById(
          "authError"
        );


      errorEl.textContent = "";


      if(!email){

        errorEl.textContent =
          "Enter your email.";

        return;
      }


      if(!password){

        errorEl.textContent =
          "Enter your password.";

        return;
      }


      const submitBtn =
        document.getElementById(
          "authSubmit"
        );

      submitBtn.disabled = true;


      try{

        if(authMode === "login"){

          const result =
            await loginUser(
              email,
              password
            );

          const user =
            result.user || result;

          if(!user || !user.email){

            throw new Error(
              "Invalid login response from server."
            );
          }

          signIn(user);

        }

        else{

          const name =
            document
              .getElementById("authName")
              .value
              .trim();


          if(!name){

            errorEl.textContent =
              "Enter your full name.";

            return;
          }


          const result =
            await registerUser(
              name,
              email,
              password,
              selectedRole
            );


          const user =
            result.user || result;


          if(!user){

            throw new Error(
              "Invalid registration response."
            );
          }


          signIn(user);

        }


      }catch(error){

        console.error(
          "Authentication error:",
          error
        );


        errorEl.textContent =
          error.message ||
          "Authentication failed.";


      }finally{

        submitBtn.disabled = false;

      }

    }
  );


/* =========================================================
   Demo button
========================================================= */

const demoBtn =
  document.getElementById("demoBtn");

if(demoBtn){

  demoBtn.addEventListener(
    "click",
    async ()=>{

      try{

        const result =
          await loginUser(
            "anita@campus.edu",
            "demo123"
          );

        const user =
          result.user || result;

        if(!user || !user.email){
          throw new Error("Demo user not found.");
        }

        await signIn(user);

      }catch(error){

        console.error(
          "Demo login error:",
          error
        );

        toast(
          "Demo account is not available in MongoDB."
        );
      }

    }
  );

}


/* =========================================================
   Sign in
========================================================= */

async function signIn(user){

  currentUser = user;

  sessionStorage.setItem(
    "fetch_lf_session",
    user.id || user._id
  );

  authScreen.classList.add(
    "hidden"
  );

  document
    .getElementById(
      "themeToggleAuth"
    )
    .classList.add("hidden");

  appEl.classList.remove(
    "hidden"
  );

  document
    .getElementById(
      "tabProfile"
    )
    .classList.toggle(
      "hidden",
      false
    );

  refreshAdminTabVisibility();

  await renderAll();

  showView("home");
}


/* =========================================================
   Admin tab visibility
========================================================= */

function refreshAdminTabVisibility(){

  let adminBtn =
    document.querySelector(
      '.tab-btn[data-view="admin"]'
    );

  const tabbar =
    document.querySelector(".tabbar");


  if(
    currentUser &&
    currentUser.role === "admin"
  ){

    if(!adminBtn){

      adminBtn =
        document.createElement(
          "button"
        );

      adminBtn.className =
        "tab-btn";

      adminBtn.dataset.view =
        "admin";

      adminBtn.innerHTML =
        '<span class="tab-icon">🛡</span><span>Admin</span>';

      adminBtn.addEventListener(
        "click",
        ()=>{
          showView("admin");
        }
      );

      tabbar.appendChild(
        adminBtn
      );
    }

  }

  else if(adminBtn){

    adminBtn.remove();

  }
}


/* =========================================================
   Logout
========================================================= */

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    ()=>{

      sessionStorage.removeItem(
        "fetch_lf_session"
      );

      currentUser = null;

      appEl.classList.add(
        "hidden"
      );

      authScreen.classList.remove(
        "hidden"
      );

      document
        .getElementById(
          "themeToggleAuth"
        )
        .classList.remove(
          "hidden"
        );

      document
        .getElementById(
          "authForm"
        )
        .reset();

      authMode = "login";

      document
        .getElementById(
          "fieldName"
        )
        .style.display = "none";

      document
        .getElementById(
          "fieldRole"
        )
        .style.display = "none";

      document
        .getElementById(
          "authSubmit"
        )
        .textContent = "Sign In";

      document
        .getElementById(
          "authError"
        )
        .textContent = "";

    }
  );


document
  .getElementById("profileBtn")
  .addEventListener(
    "click",
    ()=>showView("profile")
  );


/* =========================================================
   NAVIGATION
========================================================= */

const viewTitles = {

  home:"Home",

  report:"Report Item",

  browse:"Browse Items",

  map:"College Map",

  admin:"Admin Dashboard",

  profile:"Profile"

};


function showView(name){

  document
    .querySelectorAll(".view")
    .forEach(
      v =>
        v.classList.remove(
          "active"
        )
    );


  const el =
    document.getElementById(
      "view-"+name
    );


  if(el)
    el.classList.add(
      "active"
    );


  document
    .getElementById(
      "viewTitle"
    )
    .textContent =
      viewTitles[name] || "";


  document
    .querySelectorAll(
      ".tab-btn"
    )
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.view===name
        )
    );


  window.scrollTo({
    top:0,
    behavior:"instant"
  });


  if(name==="home")
    renderHome();

  if(name==="browse")
    renderBrowse();

  if(name==="map")
    renderMap();

  if(name==="admin")
    renderAdmin();

  if(name==="profile")
    renderProfile();

  if(name==="report")
    renderReportMapPicker();
}


document
  .querySelectorAll(
    ".tab-btn[data-view]"
  )
  .forEach(
    btn=>{
      btn.addEventListener(
        "click",
        ()=>{
          showView(
            btn.dataset.view
          );
        }
      );
    }
  );


document
  .querySelectorAll(
    "[data-nav]"
  )
  .forEach(
    btn=>{
      btn.addEventListener(
        "click",
        ()=>{
          if(btn.dataset.reportType)
            setReportType(
              btn.dataset.reportType
            );

          showView(
            btn.dataset.nav
          );
        }
      );
    }
  );


/* =========================================================
   HOME
========================================================= */

function renderHome(){

  const hr =
    new Date().getHours();


  document.getElementById(
    "greeting"
  ).textContent =
    hr<12
      ? "Good morning"
      : hr<17
        ? "Good afternoon"
        : "Good evening";


  document.getElementById(
    "homeName"
  ).textContent =
    "Welcome back, " +
    currentUser.name.split(" ")[0];


  document.getElementById(
    "statLost"
  ).textContent =
    db.items.filter(
      i =>
        i.type==="lost" &&
        i.status==="open"
    ).length;


  document.getElementById(
    "statFound"
  ).textContent =
    db.items.filter(
      i =>
        i.type==="found" &&
        i.status==="open"
    ).length;


  document.getElementById(
    "statReturned"
  ).textContent =
    db.items.filter(
      i =>
        i.status==="returned"
    ).length;


  const matches =
    allTopMatches();


  document.getElementById(
    "statMatches"
  ).textContent =
    matches.length;


  const matchesRow =
    document.getElementById(
      "matchesRow"
    );


  if(!matches.length){

    matchesRow.innerHTML =
      '<p class="empty-hint">No matches yet — report an item to see suggestions here.</p>';

  }else{

    matchesRow.innerHTML =
      matches
        .slice(0,8)
        .map(
          m=>`
            <div class="glass match-card" data-open-item="${m.lost.id}">
              <span class="match-score">${m.best.score}% match</span>

              <div class="item-card-title">
                ${escapeHtml(m.lost.name)}
              </div>

              <div class="item-card-meta">
                ↔ ${escapeHtml(m.best.item.name)}
              </div>

              <div class="item-card-meta">
                📍 ${locName(m.lost.location)}
              </div>
            </div>
          `
        )
        .join("");


    matchesRow
      .querySelectorAll(
        "[data-open-item]"
      )
      .forEach(
        c=>{
          c.addEventListener(
            "click",
            ()=>{
              openItemModal(
                c.dataset.openItem
              );
            }
          );
        }
      );
  }


  const recent =
    [...db.items]
      .sort(
        (a,b)=>
          b.createdAt -
          a.createdAt
      )
      .slice(0,6);


  document.getElementById(
    "recentItems"
  ).innerHTML =
    recent
      .map(renderItemCard)
      .join("");


  bindItemCards(
    document.getElementById(
      "recentItems"
    )
  );
}


/* =========================================================
   ITEM CARD
========================================================= */

function renderItemCard(item){

  const thumb =
    item.image

      ? `<img class="item-thumb" src="${item.image}" alt="">`

      : `<div class="item-thumb placeholder">${categoryEmoji(item.category)}</div>`;


  return `
    <div class="glass item-card" data-item-id="${item.id}">

      ${thumb}

      <div class="badges">
        <span class="badge ${
          item.status==='returned'
            ? 'returned'
            : item.type
        }">
          ${
            item.status==='returned'
              ? 'Returned'
              : item.type
          }
        </span>
      </div>

      <div class="item-card-title">
        ${escapeHtml(item.name)}
      </div>

      <div class="item-card-meta">
        📍 ${locName(item.location)}
      </div>

      <div class="item-card-meta">
        🗓 ${formatDate(item.date)}
      </div>

    </div>
  `;
}


function categoryEmoji(cat){

  const map = {

    "Electronics":"🔌",
    "Bags & Backpacks":"🎒",
    "ID Cards & Documents":"🪪",
    "Books & Stationery":"📘",
    "Keys":"🔑",
    "Clothing & Accessories":"🧥",
    "Water Bottles & Flasks":"🧴",
    "Sports Equipment":"🏸",
    "Jewelry":"💍",
    "Other":"📦"

  };

  return map[cat] || "📦";
}


function formatDate(d){

  return new Date(
    d+"T00:00:00"
  ).toLocaleDateString(
    undefined,
    {
      month:"short",
      day:"numeric"
    }
  );
}


function escapeHtml(s){

  return String(s || "")
    .replace(
      /[&<>"']/g,
      c=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      }[c])
    );
}


function bindItemCards(container){

  container
    .querySelectorAll(
      "[data-item-id]"
    )
    .forEach(
      card=>{
        card.addEventListener(
          "click",
          ()=>{
            openItemModal(
              card.dataset.itemId
            );
          }
        );
      }
    );
}


/* =========================================================
   ITEM MODAL
========================================================= */

function openItemModal(itemId){

  const item =
    db.items.find(
      i=>String(i.id)===String(itemId)
    );

  if(!item) return;


  const reporter =
    db.users.find(
      u=>String(u.id)===String(item.reporterId)
    );


  const matches =
    item.status==="open"
      ? findMatchesFor(item)
      : [];


  const isOwner =
    String(currentUser.id || currentUser._id) ===
    String(item.reporterId);


  const isAdmin =
    currentUser.role ===
    "admin";


  const card =
    document.getElementById(
      "itemModalCard"
    );


  card.innerHTML = `

    ${
      item.image
        ? `
          <img
            class="item-thumb"
            style="aspect-ratio:16/9;margin-bottom:14px;"
            src="${item.image}"
            alt=""
          >
        `
        : ""
    }

    <div class="badges" style="margin-bottom:10px;">

      <span class="badge ${
        item.status==='returned'
          ? 'returned'
          : item.type
      }">
        ${
          item.status==='returned'
            ? 'Returned'
            : item.type
        }
      </span>

      <span class="badge cat">
        ${categoryEmoji(item.category)}
        ${item.category}
      </span>

    </div>

    <h2 style="
      font-size:20px;
      font-weight:750;
      margin-bottom:8px;
    ">
      ${escapeHtml(item.name)}
    </h2>

    <p style="
      color:var(--text-secondary);
      font-size:14px;
      line-height:1.5;
      margin-bottom:14px;
    ">
      ${escapeHtml(item.description)}
    </p>

    <div style="
      display:flex;
      flex-direction:column;
      gap:6px;
      font-size:13.5px;
      color:var(--text-secondary);
      margin-bottom:16px;
    ">

      <div>
        📍 ${locFull(item.location)}
      </div>

      <div>
        🗓 ${formatDate(item.date)}
        ${item.time ? " · "+item.time : ""}
      </div>

      <div>
        👤 Reported by
        ${
          reporter
            ? escapeHtml(reporter.name)
            : "Unknown"
        }
        · ${timeAgo(item.createdAt)}
      </div>

    </div>


    ${
      matches.length
        ? `

          <div
            class="section-head"
            style="margin:14px 0 8px;"
          >
            <h3 style="font-size:14px;">
              Possible ${
                item.type==='lost'
                  ? 'found'
                  : 'lost'
              } matches
            </h3>
          </div>

          <div style="
            display:flex;
            flex-direction:column;
            gap:8px;
            margin-bottom:16px;
          ">

            ${
              matches
                .slice(0,3)
                .map(
                  m=>`

                    <div
                      class="glass"
                      style="
                        padding:10px 12px;
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        cursor:pointer;
                      "
                      data-open-item="${m.item.id}"
                    >

                      <div>

                        <div style="
                          font-weight:700;
                          font-size:13.5px;
                        ">
                          ${escapeHtml(m.item.name)}
                        </div>

                        <div style="
                          font-size:12px;
                          color:var(--text-tertiary);
                        ">
                          ${locFull(m.item.location)}
                        </div>

                      </div>

                      <span class="match-score">
                        ${m.score}%
                      </span>

                    </div>
                  `
                )
                .join("")
            }

          </div>
        `
        : ""
    }


    <div
      id="modalActions"
      style="
        display:flex;
        flex-direction:column;
        gap:10px;
      "
    ></div>

  `;


  const actions =
    card.querySelector(
      "#modalActions"
    );


  if(
    item.status === "open" &&
    !isOwner &&
    item.type === "found"
  ){

    const existingClaim =
      db.claims.find(
        c =>
          String(c.itemId)===String(item.id) &&
          String(c.claimantId)===String(currentUser.id || currentUser._id)
      );


    if(existingClaim){

      actions.innerHTML =
        `
          <span
            class="badge pending"
            style="align-self:flex-start;"
          >
            Claim ${existingClaim.status}
          </span>
        `;

    }else{

      actions.innerHTML = `

        <textarea
          id="claimMsg"
          class="claim-input"
          rows="2"
          placeholder="Describe why this is yours…"
        ></textarea>

        <button
          class="btn-primary full"
          id="claimBtn"
        >
          This is mine — submit claim
        </button>

      `;


      card
        .querySelector(
          "#claimBtn"
        )
        .addEventListener(
          "click",
          ()=>{

            const msg =
              card
                .querySelector(
                  "#claimMsg"
                )
                .value
                .trim();


            if(!msg){

              toast(
                "Add a short note to support your claim."
              );

              return;
            }


            db.claims.push({
              id:uid("c"),
              itemId:item.id,
              claimantId:currentUser.id || currentUser._id,
              message:msg,
              status:"pending",
              createdAt:Date.now()
            });


            DB.write(db);

            toast(
              "Claim submitted for review."
            );

            closeModal();

            renderAll();
          }
        );
    }


  }else if(
    isOwner &&
    item.status === "open"
  ){

    actions.innerHTML = `

      <button
        class="btn-secondary full"
        id="markReturnedBtn"
      >
        Mark as returned
      </button>

    `;


    card
      .querySelector(
        "#markReturnedBtn"
      )
      .addEventListener(
        "click",
        async ()=>{

          try{

            await updateItemInMongo(
              item.id,
              {
                status:"returned"
              }
            );

            item.status =
              "returned";

            DB.write(db);

            toast(
              "Marked as returned. Glad it's back!"
            );

            closeModal();

            await renderAll();

          }catch(error){

            console.error(error);

            toast(
              "Could not update the item in MongoDB."
            );
          }

        }
      );


  }else if(
    isAdmin &&
    item.status === "open"
  ){

    actions.innerHTML = `

      <button
        class="btn-ghost full"
        id="adminReturnBtn"
      >
        Admin: mark returned
      </button>

    `;


    card
      .querySelector(
        "#adminReturnBtn"
      )
      .addEventListener(
        "click",
        async ()=>{

          try{

            await updateItemInMongo(
              item.id,
              {
                status:"returned"
              }
            );

            item.status =
              "returned";

            DB.write(db);

            toast(
              "Item marked returned."
            );

            closeModal();

            await renderAll();

          }catch(error){

            console.error(error);

            toast(
              "Could not update the item in MongoDB."
            );
          }

        }
      );
  }


  card
    .querySelectorAll(
      "[data-open-item]"
    )
    .forEach(
      el=>{
        el.addEventListener(
          "click",
          ()=>{
            openItemModal(
              el.dataset.openItem
            );
          }
        );
      }
    );


  document
    .getElementById(
      "itemModal"
    )
    .classList.remove(
      "hidden"
    );
}


function closeModal(){

  document
    .getElementById(
      "itemModal"
    )
    .classList.add(
      "hidden"
    );
}


document
  .getElementById(
    "itemModal"
  )
  .addEventListener(
    "click",
    e=>{
      if(
        e.target.id ===
        "itemModal"
      ){
        closeModal();
      }
    }
  );


/* =========================================================
   REPORT FORM
========================================================= */

const locationSelect =
  document.getElementById(
    "itemLocation"
  );


locationSelect.innerHTML =
  '<option value="">Select location</option>' +

  FLOORS
    .slice()
    .reverse()
    .map(
      f=>`

        <optgroup label="${f.name}">

          ${
            LOCATIONS
              .filter(
                l=>l.floor===f.n
              )
              .map(
                l=>`
                  <option value="${l.id}">
                    ${
                      l.icon
                        ? l.icon+" "
                        : ""
                    }
                    ${l.name}
                  </option>
                `
              )
              .join("")
          }

        </optgroup>

      `
    )
    .join("");


document.getElementById(
  "itemDate"
).max =
  isoDate(Date.now());


document.getElementById(
  "itemDate"
).value =
  isoDate(Date.now());


function setReportType(type){

  reportType =
    type;


  document
    .querySelectorAll(
      "#reportTypeSeg .seg-btn"
    )
    .forEach(
      b =>
        b.classList.toggle(
          "active",
          b.dataset.type===type
        )
    );


  document.getElementById(
    "reportSubmitBtn"
  ).textContent =
    type==="lost"
      ? "Report Lost Item"
      : "Report Found Item";


  document.getElementById(
    "reportSubmitBtn"
  ).className =
    "btn-primary full";
}


document
  .getElementById(
    "reportTypeSeg"
  )
  .addEventListener(
    "click",
    e=>{

      const btn =
        e.target.closest(
          ".seg-btn"
        );

      if(!btn) return;

      setReportType(
        btn.dataset.type
      );

    }
  );


const uploadBox =
  document.getElementById(
    "uploadBox"
  );


uploadBox.addEventListener(
  "click",
  ()=>{
    document
      .getElementById(
        "itemImage"
      )
      .click();
  }
);


document
  .getElementById(
    "itemImage"
  )
  .addEventListener(
    "change",
    e=>{

      const file =
        e.target.files[0];

      if(!file) return;


      const reader =
        new FileReader();


      reader.onload = ()=>{

        uploadedImageData =
          reader.result;


        document
          .getElementById(
            "uploadPreview"
          )
          .src =
          uploadedImageData;


        document
          .getElementById(
            "uploadPreview"
          )
          .classList.remove(
            "hidden"
          );


        document
          .getElementById(
            "uploadPrompt"
          )
          .classList.add(
            "hidden"
          );

      };


      reader.readAsDataURL(file);

    }
  );


function renderReportMapPicker(){

  renderFloorMap(
    document.getElementById(
      "reportMapWrap"
    ),

    reportMapState,

    {
      mode:"report",

      onPick:id=>{

        selectedReportLocation =
          id;

        locationSelect.value =
          id;
      }
    }
  );
}


locationSelect.addEventListener(
  "change",
  ()=>{

    selectedReportLocation =
      locationSelect.value ||
      null;


    reportMapState.selected =
      selectedReportLocation;


    const f =
      selectedReportLocation
        ? locFloor(
            selectedReportLocation
          )
        : null;


    if(f)
      reportMapState.floor =
        f.n;


    renderReportMapPicker();
  }
);


document
  .getElementById(
    "reportForm"
  )
  .addEventListener(
    "submit",
    async e=>{

      e.preventDefault();


      const item = {

        type:reportType,

        name:
          document
            .getElementById(
              "itemName"
            )
            .value
            .trim(),

        category:
          document
            .getElementById(
              "itemCategory"
            )
            .value,

        description:
          document
            .getElementById(
              "itemDescription"
            )
            .value
            .trim(),

        date:
          document
            .getElementById(
              "itemDate"
            )
            .value,

        time:
          document
            .getElementById(
              "itemTime"
            )
            .value,

        location:
          locationSelect.value,

        image:
          uploadedImageData,

        reporterId:
          currentUser.id ||
          currentUser._id,

        status:"open",

        createdAt:
          Date.now()
      };


      const submitBtn =
        document.getElementById(
          "reportSubmitBtn"
        );


      submitBtn.disabled =
        true;


      try{

        const savedItem =
          await createItemInMongo(
            item
          );


        /*
          IMPORTANT:
          Reload from MongoDB after saving.
          This prevents localStorage and MongoDB
          from becoming out of sync.
        */

        await loadItemsFromMongo();


        const actualSavedItem =
          db.items.find(
            i =>
              String(i.id) ===
              String(
                savedItem.id ||
                savedItem._id
              )
          ) || savedItem;


        const matches =
          findMatchesFor(
            actualSavedItem
          );


        document
          .getElementById(
            "reportForm"
          )
          .reset();


        document
          .getElementById(
            "itemDate"
          )
          .value =
          isoDate(Date.now());


        uploadedImageData =
          null;


        document
          .getElementById(
            "uploadPreview"
          )
          .classList.add(
            "hidden"
          );


        document
          .getElementById(
            "uploadPrompt"
          )
          .classList.remove(
            "hidden"
          );


        selectedReportLocation =
          null;


        reportMapState.selected =
          null;


        renderReportMapPicker();


        toast(
          matches.length
            ? `Reported! Found ${matches.length} possible match${matches.length>1?"es":""}.`
            : "Reported! We'll notify you of any matches."
        );


        await renderAll();


        showView("home");


        if(matches.length){

          openItemModal(
            actualSavedItem.id
          );

        }


      }catch(error){

        console.error(
          "Could not save item:",
          error
        );

        toast(
          "Could not save the item to MongoDB."
        );

      }finally{

        submitBtn.disabled =
          false;

      }

    }
  );


/* =========================================================
   BROWSE
========================================================= */

document
  .getElementById(
    "filterChips"
  )
  .addEventListener(
    "click",
    e=>{

      const chip =
        e.target.closest(
          ".chip"
        );

      if(!chip) return;

      browseFilter =
        chip.dataset.filter;


      document
        .querySelectorAll(
          "#filterChips .chip"
        )
        .forEach(
          c =>
            c.classList.toggle(
              "active",
              c===chip
            )
        );


      renderBrowse();
    }
  );


document
  .getElementById(
    "searchInput"
  )
  .addEventListener(
    "input",
    renderBrowse
  );


function renderCategoryChips(){

  const wrap =
    document.getElementById(
      "categoryChips"
    );


  wrap.innerHTML =
    `<button class="chip active" data-cat="all">
      All categories
    </button>` +

    CATEGORIES
      .map(
        c=>
          `<button class="chip" data-cat="${c}">
            ${categoryEmoji(c)} ${c}
          </button>`
      )
      .join("");


  wrap
    .querySelectorAll(
      ".chip"
    )
    .forEach(
      chip=>{
        chip.addEventListener(
          "click",
          ()=>{

            browseCategory =
              chip.dataset.cat;


            wrap
              .querySelectorAll(
                ".chip"
              )
              .forEach(
                c =>
                  c.classList.toggle(
                    "active",
                    c===chip
                  )
              );


            renderBrowse();
          }
        );
      }
    );
}


function renderBrowse(){

  const q =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .trim()
      .toLowerCase();


  let items =
    [...db.items];


  if(browseFilter !== "all"){

    items =
      items.filter(
        i =>
          browseFilter === "returned"

            ? i.status==="returned"

            : (
                i.type===browseFilter &&
                i.status==="open"
              )
      );
  }


  if(browseCategory !== "all"){

    items =
      items.filter(
        i =>
          i.category ===
          browseCategory
      );
  }


  if(q){

    items =
      items.filter(
        i =>
          (
            i.name +
            " " +
            i.description +
            " " +
            locName(i.location) +
            " " +
            i.category
          )
          .toLowerCase()
          .includes(q)
      );
  }


  items.sort(
    (a,b)=>
      b.createdAt -
      a.createdAt
  );


  const grid =
    document.getElementById(
      "browseItems"
    );


  grid.innerHTML =
    items
      .map(renderItemCard)
      .join("");


  bindItemCards(grid);


  document
    .getElementById(
      "browseEmpty"
    )
    .classList.toggle(
      "hidden",
      items.length>0
    );
}


/* =========================================================
   CAMPUS MAP
========================================================= */

const mapState = {
  floor:0,
  selected:null
};


const reportMapState = {
  floor:0,
  selected:null
};


function openItemsByLocation(){

  const out = {};


  db.items
    .filter(
      i =>
        i.status!=="returned"
    )
    .forEach(
      i=>{

        const o =
          out[i.location] ||
          (
            out[i.location] = {
              lost:0,
              found:0,
              total:0
            }
          );


        o[i.type]++;

        o.total++;
      }
    );


  return out;
}


function renderFloorMap(
  container,
  state,
  opts
){

  const mode =
    opts.mode;


  const counts =
    mode === "map"
      ? openItemsByLocation()
      : {};


  const floor =
    FLOORS.find(
      f=>f.n===state.floor
    ) || FLOORS[1];


  const spaces =
    LOCATIONS.filter(
      l=>l.floor===floor.n
    );


  const specials =
    spaces.filter(
      l=>l.kind==="special"
    );


  const rooms =
    spaces.filter(
      l=>l.kind!=="special"
    );


  const cols =
    Math.ceil(
      rooms.length/2
    );


  const topRow =
    rooms.slice(
      0,
      cols
    );


  const bottomRow =
    rooms.slice(cols);


  const floorTotal =
    n =>
      LOCATIONS
        .filter(
          l=>l.floor===n
        )
        .reduce(
          (sum,l)=>
            sum +
            (
              (counts[l.id]||{})
                .total || 0
            ),
          0
        );


  const tile = l => {

    const c =
      counts[l.id];


    const tone =
      c
        ? (
            c.lost && c.found
              ? "has-both"
              : c.lost
                ? "has-lost"
                : "has-found"
          )
        : "";


    const kicker =
      l.kind==="lab"
        ? "Lab"
        : l.kind==="room"
          ? "Room"
          : "";


    const body =
      l.kind==="special"

        ? `
            <span class="room-icon">
              ${l.icon}
            </span>

            <span class="room-num">
              ${l.name}
            </span>
          `

        : `
            ${
              l.kind==="lab"
                ? `
                    <span class="room-icon sm">
                      ${l.icon}
                    </span>
                  `
                : ""
            }

            <span class="room-kicker">
              ${kicker}
            </span>

            <span class="room-num">
              ${l.label}
            </span>
          `;


    return `
      <button
        type="button"
        class="room ${l.kind} ${tone} ${
          state.selected===l.id
            ? "selected"
            : ""
        }"
        data-loc="${l.id}"
        title="${l.name}${
          c
            ? " — "+c.total+" open"
            : ""
        }"
        aria-label="${l.name}${
          c
            ? ", "+c.total+" open items"
            : ""
        }"
      >

        ${body}

        ${
          c
            ? `
                <span class="room-badge">
                  ${c.total}
                </span>
              `
            : ""
        }

      </button>
    `;
  };


  const switcher =
    FLOORS
      .map(
        f=>{

          const t =
            mode==="map"
              ? floorTotal(f.n)
              : 0;


          return `
            <button
              type="button"
              class="floor-btn ${
                f.n===floor.n
                  ? "active"
                  : ""
              }"
              data-floor="${f.n}"
              aria-label="${f.name}"
            >

              <span class="floor-short">
                ${f.short}
              </span>

              <span class="floor-label">
                ${f.label}
              </span>

              ${
                t
                  ? `
                      <span class="floor-count">
                        ${t}
                      </span>
                    `
                  : ""
              }

            </button>
          `;
        }
      )
      .join("");


  const floorOpen =
    floorTotal(
      floor.n
    );


  container.innerHTML = `

    <div class="fm">

      <div
        class="floor-switch"
        role="tablist"
        aria-label="Floors"
      >
        ${switcher}
      </div>


      <div class="floor-stage">

        <div class="floor-title">

          <strong>
            ${floor.name}
          </strong>

          <span>
            ${spaces.length}
            ${
              spaces.length===1
                ? "space"
                : "spaces"
            }

            ${
              mode==="map"
                ? `
                    · ${floorOpen}
                    open item${
                      floorOpen===1
                        ? ""
                        : "s"
                    }
                  `
                : ""
            }

          </span>

        </div>


        <div class="plan">

          ${
            specials.length
              ? `
                  <div class="plan-special">
                    ${
                      specials
                        .map(tile)
                        .join("")
                    }
                  </div>
                `
              : ""
          }


          <div class="plan-rooms">

            <div
              class="room-row"
              style="--cols:${cols}"
            >
              ${
                topRow
                  .map(tile)
                  .join("")
              }
            </div>


            <div class="corridor">
              <span>
                Corridor
              </span>
            </div>


            <div
              class="room-row"
              style="--cols:${cols}"
            >
              ${
                bottomRow
                  .map(tile)
                  .join("")
              }
            </div>

          </div>

        </div>


        ${
          mode==="map"
            ? `
                <div class="map-legend">

                  <span>
                    <i class="lg lost"></i>
                    Lost
                  </span>

                  <span>
                    <i class="lg found"></i>
                    Found
                  </span>

                  <span>
                    <i class="lg both"></i>
                    Both
                  </span>

                </div>
              `
            : ""
        }

      </div>

    </div>
  `;


  container
    .querySelectorAll(
      ".floor-btn"
    )
    .forEach(
      btn=>{
        btn.addEventListener(
          "click",
          ()=>{

            state.floor =
              Number(
                btn.dataset.floor
              );

            renderFloorMap(
              container,
              state,
              opts
            );
          }
        );
      }
    );


  container
    .querySelectorAll(
      ".room"
    )
    .forEach(
      r=>{
        r.addEventListener(
          "click",
          ()=>{

            state.selected =
              r.dataset.loc;

            opts.onPick(
              r.dataset.loc
            );

            renderFloorMap(
              container,
              state,
              opts
            );


            if(mode==="map"){

              document
                .getElementById(
                  "mapLocationPanel"
                )
                .scrollIntoView({
                  behavior:"smooth",
                  block:"nearest"
                });

            }

          }
        );
      }
    );
}


function renderMap(){

  renderFloorMap(
    document.getElementById(
      "campusMap"
    ),

    mapState,

    {
      mode:"map",

      onPick:id =>
        showLocationPanel(id)
    }
  );


  if(mapState.selected)
    showLocationPanel(
      mapState.selected,
      true
    );
}


function showLocationPanel(
  locId,
  quiet
){

  const items =
    db.items.filter(
      i =>
        i.location===locId &&
        i.status!=="returned"
    );


  const panel =
    document.getElementById(
      "mapLocationPanel"
    );


  document.getElementById(
    "mapLocationName"
  ).textContent =
    locFull(locId) +
    ` (${items.length})`;


  const grid =
    document.getElementById(
      "mapLocationItems"
    );


  grid.innerHTML =
    items.length
      ? items
          .map(renderItemCard)
          .join("")
      : `
          <p class="empty-hint">
            No open items reported here.
          </p>
        `;


  bindItemCards(grid);


  panel.classList.remove(
    "hidden"
  );
}


document
  .getElementById(
    "mapPanelClose"
  )
  .addEventListener(
    "click",
    ()=>{

      mapState.selected =
        null;

      document
        .getElementById(
          "mapLocationPanel"
        )
        .classList.add(
          "hidden"
        );

      renderMap();
    }
  );


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

document
  .getElementById(
    "adminSeg"
  )
  .addEventListener(
    "click",
    e=>{

      const btn =
        e.target.closest(
          ".seg-btn"
        );

      if(!btn) return;


      adminTab =
        btn.dataset.tab;


      document
        .querySelectorAll(
          "#adminSeg .seg-btn"
        )
        .forEach(
          b =>
            b.classList.toggle(
              "active",
              b===btn
            )
        );


      document
        .querySelectorAll(
          ".admin-tab"
        )
        .forEach(
          t =>
            t.classList.add(
              "hidden"
            )
        );


      document
        .getElementById(
          "admin"+
          capitalize(adminTab)
        )
        .classList.remove(
          "hidden"
        );


      renderAdmin();

    }
  );


function capitalize(s){

  return s.charAt(0).toUpperCase() +
    s.slice(1);
}


function renderAdmin(){

  if(
    !currentUser ||
    currentUser.role !== "admin"
  )
    return;


  if(adminTab==="claims")
    renderAdminClaims();


  if(adminTab==="items")
    renderAdminItems();


  if(adminTab==="users")
    renderAdminUsers();
}


/* =========================================================
   Admin claims
========================================================= */

function renderAdminClaims(){

  const pending =
    db.claims.filter(
      c =>
        c.status==="pending"
    );


  const list =
    document.getElementById(
      "claimsList"
    );


  document
    .getElementById(
      "claimsEmpty"
    )
    .classList.toggle(
      "hidden",
      pending.length>0
    );


  list.innerHTML =
    pending
      .map(
        c=>{

          const item =
            db.items.find(
              i =>
                String(i.id)===String(c.itemId)
            );


          const claimant =
            db.users.find(
              u =>
                String(u.id)===String(c.claimantId)
            );


          if(!item)
            return "";


          return `

            <div class="claim-card glass">

              <div class="badges">
                <span class="badge found">
                  ${escapeHtml(item.category)}
                </span>
              </div>

              <div class="item-card-title">
                ${escapeHtml(item.name)}
              </div>

              <div class="item-card-meta">
                📍 ${locName(item.location)}
                · 🗓 ${formatDate(item.date)}
              </div>

              <div class="item-card-meta">
                Claimed by
                ${
                  claimant
                    ? escapeHtml(
                        claimant.name
                      )
                    : "Unknown"
                }
              </div>

              <p style="
                font-size:13px;
                color:var(--text-secondary);
                margin-top:4px;
              ">
                "${escapeHtml(c.message)}"
              </p>

              <div class="claim-actions">

                <button
                  class="mini-btn primary"
                  data-approve="${c.id}"
                >
                  Approve
                </button>

                <button
                  class="mini-btn danger"
                  data-reject="${c.id}"
                >
                  Reject
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");


  list
    .querySelectorAll(
      "[data-approve]"
    )
    .forEach(
      b=>{

        b.addEventListener(
          "click",
          async ()=>{

            const claim =
              db.claims.find(
                c =>
                  c.id===b.dataset.approve
              );


            if(!claim)
              return;


            claim.status =
              "approved";


            const item =
              db.items.find(
                i =>
                  String(i.id)===String(claim.itemId)
              );


            if(item){

              try{

                await updateItemInMongo(
                  item.id,
                  {
                    status:"returned"
                  }
                );

                item.status =
                  "returned";

              }catch(error){

                console.error(error);

                toast(
                  "Could not update item in MongoDB."
                );

                return;
              }
            }


            DB.write(db);


            toast(
              "Claim approved — item marked returned."
            );


            await renderAll();

          }
        );
      }
    );


  list
    .querySelectorAll(
      "[data-reject]"
    )
    .forEach(
      b=>{

        b.addEventListener(
          "click",
          ()=>{

            const claim =
              db.claims.find(
                c =>
                  c.id===b.dataset.reject
              );


            if(!claim)
              return;


            claim.status =
              "rejected";


            DB.write(db);


            toast(
              "Claim rejected."
            );


            renderAll();

          }
        );
      }
    );
}


/* =========================================================
   Admin items
========================================================= */

function renderAdminItems(){

  const tbody =
    document.getElementById(
      "itemsTableBody"
    );


  tbody.innerHTML =
    [...db.items]
      .sort(
        (a,b)=>
          b.createdAt -
          a.createdAt
      )
      .map(
        item=>`

          <tr>

            <td>
              ${escapeHtml(item.name)}
            </td>

            <td>
              <span class="badge ${item.type}">
                ${item.type}
              </span>
            </td>

            <td>
              ${escapeHtml(item.category)}
            </td>

            <td>
              ${locName(item.location)}
            </td>

            <td>

              <span class="badge ${
                item.status==='returned'
                  ? 'returned'
                  : 'pending'
              }">
                ${item.status}
              </span>

            </td>

            <td>

              ${
                item.status!=="returned"
                  ? `
                      <button
                        class="mini-btn"
                        data-return="${item.id}"
                      >
                        Mark returned
                      </button>
                    `
                  : ""
              }

              <button
                class="mini-btn danger"
                data-delete="${item.id}"
              >
                Delete
              </button>

            </td>

          </tr>

        `
      )
      .join("");


  tbody
    .querySelectorAll(
      "[data-return]"
    )
    .forEach(
      b=>{

        b.addEventListener(
          "click",
          async ()=>{

            try{

              await updateItemInMongo(
                b.dataset.return,
                {
                  status:"returned"
                }
              );


              const item =
                db.items.find(
                  i =>
                    String(i.id) ===
                    String(b.dataset.return)
                );


              if(item)
                item.status =
                  "returned";


              DB.write(db);


              toast(
                "Item marked returned."
              );


              await renderAll();

            }catch(error){

              console.error(error);

              toast(
                "Could not update the item in MongoDB."
              );

            }

          }
        );
      }
    );


  tbody
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(
      b=>{

        b.addEventListener(
          "click",
          async ()=>{

            try{

              await deleteItemInMongo(
                b.dataset.delete
              );


              db.items =
                db.items.filter(
                  i =>
                    String(i.id) !==
                    String(b.dataset.delete)
                );


              DB.write(db);


              toast(
                "Item deleted."
              );


              await renderAll();

            }catch(error){

              console.error(error);

              toast(
                "Could not delete the item from MongoDB."
              );

            }

          }
        );
      }
    );
}


/* =========================================================
   Admin users
========================================================= */

function renderAdminUsers(){

  const tbody =
    document.getElementById(
      "usersTableBody"
    );


  tbody.innerHTML =
    db.users
      .map(
        u=>`

          <tr>

            <td>
              ${escapeHtml(u.name)}
            </td>

            <td>
              ${escapeHtml(u.email)}
            </td>

            <td>
              <span
                class="role-badge"
                style="margin:0;"
              >
                ${u.role || "student"}
              </span>
            </td>

            <td>
              ${
                db.items.filter(
                  i =>
                    String(i.reporterId) ===
                    String(u.id || u._id)
                ).length
              }
            </td>

          </tr>

        `
      )
      .join("");
}


/* =========================================================
   PROFILE
========================================================= */

function renderProfile(){

  document.getElementById(
    "profileAvatarBig"
  ).textContent =
    initials(
      currentUser.name
    );


  document.getElementById(
    "avatarInitial"
  ).textContent =
    initials(
      currentUser.name
    );


  document.getElementById(
    "profileName"
  ).textContent =
    currentUser.name;


  document.getElementById(
    "profileEmail"
  ).textContent =
    currentUser.email;


  document.getElementById(
    "profileRole"
  ).textContent =
    currentUser.role === "admin"
      ? "Admin"
      : "Student / Staff";


  const userId =
    currentUser.id ||
    currentUser._id;


  const mine =
    db.items
      .filter(
        i =>
          String(i.reporterId) ===
          String(userId)
      )
      .sort(
        (a,b)=>
          b.createdAt -
          a.createdAt
      );


  document.getElementById(
    "myItems"
  ).innerHTML =
    mine
      .map(renderItemCard)
      .join("");


  bindItemCards(
    document.getElementById(
      "myItems"
    )
  );


  document
    .getElementById(
      "myItemsEmpty"
    )
    .classList.toggle(
      "hidden",
      mine.length>0
    );


  const claims =
    db.claims.filter(
      c =>
        String(c.claimantId) ===
        String(userId)
    );


  const claimsGrid =
    document.getElementById(
      "myClaims"
    );


  claimsGrid.innerHTML =
    claims
      .map(
        c=>{

          const item =
            db.items.find(
              i =>
                String(i.id)===String(c.itemId)
            );


          if(!item)
            return "";


          return `

            <div
              class="glass item-card"
              data-item-id="${item.id}"
            >

              <div class="badges">

                <span class="badge ${
                  c.status==="pending"
                    ? "pending"
                    : c.status==="approved"
                      ? "returned"
                      : "lost"
                }">
                  ${c.status}
                </span>

              </div>

              <div class="item-card-title">
                ${escapeHtml(item.name)}
              </div>

              <div class="item-card-meta">
                📍 ${locName(item.location)}
              </div>

            </div>
          `;
        }
      )
      .join("");


  bindItemCards(
    claimsGrid
  );


  document
    .getElementById(
      "myClaimsEmpty"
    )
    .classList.toggle(
      "hidden",
      claims.length>0
    );
}


function initials(name){

  return name
    .split(" ")
    .map(
      p=>p[0]
    )
    .slice(0,2)
    .join("")
    .toUpperCase();
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function toast(msg){

  const el =
    document.getElementById(
      "toast"
    );


  el.textContent =
    msg;


  el.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      ()=>{
        el.classList.remove(
          "show"
        );
      },
      2600
    );
}


/* =========================================================
   GLOBAL RENDER
========================================================= */

async function renderAll(
  options={}
){

  if(!options.skipMongo){

    const ok =
      await refreshItemsFromMongo();


    if(!ok)
      db = DB.read();

  }else{

    db = DB.read();

  }


  const active =
    document.querySelector(
      ".view.active"
    );


  const activeName =
    active
      ? active.id.replace(
          "view-",
          ""
        )
      : "home";


  renderHome();


  if(activeName==="browse")
    renderBrowse();


  if(activeName==="map")
    renderMap();


  if(activeName==="admin")
    renderAdmin();


  if(activeName==="profile")
    renderProfile();
}


/* =========================================================
   Category chips
========================================================= */

renderCategoryChips();


/* =========================================================
   SESSION RESTORE
========================================================= */

(async function restore(){

  const savedId =
    sessionStorage.getItem(
      "fetch_lf_session"
    );


  if(!savedId)
    return;


  try{

    const response =
      await fetch(
        `${API_BASE}/users/${encodeURIComponent(savedId)}`
      );


    if(!response.ok){

      sessionStorage.removeItem(
        "fetch_lf_session"
      );

      return;
    }


    const data =
      await response.json();


    const user =
      data.user || data;


    if(user){

      currentUser =
        user;

      await signIn(
        user
      );
    }


  }catch(error){

    console.error(
      "Session restore failed:",
      error
    );

  }

})();


})();