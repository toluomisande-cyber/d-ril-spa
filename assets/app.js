/* ===================================================================
   D-Ril Spa — shared frontend layer
   This simulates a backend using localStorage so the full flow
   (auth, protected routes, booking, dashboard data) actually works
   in the browser. Swap DRIL.api's functions for real fetch() calls
   to a real backend later — every call site already awaits a Promise.
=================================================================== */

const DRIL = (() => {

  /* ---------- mock catalogue ---------- */
  const TREATMENTS = [
    { id:"t1", name:"Deep Tissue Massage", category:"Massage", duration:60, price:35000,
      desc:"A therapeutic massage using firm pressure to release chronic tension held deep in muscle and connective tissue.",
      benefits:["Releases chronic muscle tension","Improves circulation","Reduces stress hormones"] },
    { id:"t2", name:"Swedish Relaxation Massage", category:"Massage", duration:60, price:30000,
      desc:"Long, flowing strokes designed to calm the nervous system and ease everyday tension.",
      benefits:["Deep relaxation","Better sleep quality","Eases muscle stiffness"] },
    { id:"t3", name:"Hydra-Glow Facial", category:"Facials", duration:50, price:28000,
      desc:"A hydrating, glow-restoring facial tailored to your skin type using medical-grade actives.",
      benefits:["Instant radiance","Deep hydration","Refines texture"] },
    { id:"t4", name:"Anti-Aging Facial", category:"Facials", duration:60, price:38000,
      desc:"A collagen-boosting facial targeting fine lines and skin elasticity.",
      benefits:["Boosts collagen","Softens fine lines","Firms skin"] },
    { id:"t5", name:"Infrared Sauna & Detox", category:"Sauna", duration:40, price:20000,
      desc:"A cleansing sauna session that eases muscles and supports the body's natural detox process.",
      benefits:["Supports detoxification","Eases muscle soreness","Improves circulation"] },
    { id:"t6", name:"Signature Manicure", category:"Nails", duration:45, price:12000,
      desc:"Precision nail care finished with a hydrating hand massage.",
      benefits:["Neat, healthy nails","Softer hands","Relaxing hand massage"] },
    { id:"t7", name:"Spa Pedicure", category:"Nails", duration:50, price:15000,
      desc:"An indulgent foot ritual with exfoliation, callus care, and polish.",
      benefits:["Smooth, refreshed feet","Improved circulation","Long-lasting polish"] },
    { id:"t8", name:"Acupuncture Session", category:"Wellness", duration:45, price:25000,
      desc:"Traditional acupuncture to relieve tension, ease pain, and restore energy balance.",
      benefits:["Pain relief","Stress reduction","Energy balance"] },
    { id:"t9", name:"Wellness & Weight Management", category:"Wellness", duration:60, price:32000,
      desc:"A guided wellness program combining body treatments and lifestyle coaching.",
      benefits:["Personalised plan","Ongoing support","Sustainable results"] },
    { id:"t10", name:"Body Polish & Wrap", category:"Massage", duration:70, price:36000,
      desc:"Full-body exfoliation followed by a nourishing wrap for silky, renewed skin.",
      benefits:["Smooths & softens skin","Improves tone","Deeply nourishing"] },
  ];

  const TIME_SLOTS = ["9:00 AM","10:00 AM","11:00 AM","12:30 PM","2:00 PM","3:30 PM","5:00 PM","6:00 PM"];

  /* ---------- storage helpers ---------- */
  const read = (k, fallback) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function seedIfEmpty(){
    if(!localStorage.getItem("dril_users")) write("dril_users", []);
    if(!localStorage.getItem("dril_appointments")) write("dril_appointments", []);
    if(!localStorage.getItem("dril_notifications")) write("dril_notifications", []);
  }
  seedIfEmpty();

  /* ---------- auth ---------- */
  function currentUser(){
    const email = read("dril_session", null);
    if(!email) return null;
    const users = read("dril_users", []);
    return users.find(u => u.email === email) || null;
  }

  function register({firstName,lastName,email,phone,password}){
    const users = read("dril_users", []);
    if(users.some(u => u.email === email)) throw new Error("An account with this email already exists.");
    const user = { id:"c_"+Date.now(), firstName, lastName, email, phone, password, createdAt:new Date().toISOString() };
    users.push(user); write("dril_users", users);
    write("dril_session", email);
    seedNotification(user.id, "Welcome to D-Ril Spa", "Your account has been created. Book your first treatment whenever you're ready.", "welcome");
    return user;
  }

  function login(email, password){
    const users = read("dril_users", []);
    const user = users.find(u => u.email === email && u.password === password);
    if(!user) throw new Error("Incorrect email or password.");
    write("dril_session", email);
    return user;
  }

  function logout(){ localStorage.removeItem("dril_session"); }

  function requireAuth(){
    const u = currentUser();
    if(!u){ window.location.href = relativeAuthPath("login.html"); }
    return u;
  }
  function redirectIfAuthed(){
    if(currentUser()){ window.location.href = relativeDashboardPath("index.html"); }
  }
  // paths differ depending on whether current page is at root, /auth/, or /dashboard/
  function relativeAuthPath(file){
    const p = window.location.pathname;
    if(p.includes("/dashboard/")) return "../auth/"+file;
    if(p.includes("/auth/")) return file;
    return "auth/"+file;
  }
  function relativeDashboardPath(file){
    const p = window.location.pathname;
    if(p.includes("/auth/")) return "../dashboard/"+file;
    if(p.includes("/dashboard/")) return file;
    return "dashboard/"+file;
  }
  function relativeRootPath(file){
    const p = window.location.pathname;
    if(p.includes("/dashboard/") || p.includes("/auth/")) return "../"+file;
    return file;
  }

  /* ---------- appointments ---------- */
  function seedNotification(customerId, title, message, type){
    const list = read("dril_notifications", []);
    list.unshift({ id:"n_"+Date.now()+Math.random().toString(16).slice(2), customerId, title, message, type, read:false, createdAt:new Date().toISOString() });
    write("dril_notifications", list);
  }

  function createAppointment({customerId, treatmentId, date, time, notes}){
    const t = TREATMENTS.find(x => x.id === treatmentId);
    const appts = read("dril_appointments", []);
    const appt = {
      id:"a_"+Date.now(), ref:"DRS-"+Math.random().toString(36).slice(2,8).toUpperCase(),
      customerId, treatmentId, treatmentName:t.name, duration:t.duration, price:t.price,
      date, time, notes: notes||"", status:"confirmed", practitioner:"Assigned on arrival",
      createdAt:new Date().toISOString()
    };
    appts.push(appt); write("dril_appointments", appts);
    seedNotification(customerId, "Appointment confirmed", `${t.name} on ${date} at ${time} is booked.`, "confirmation");
    return appt;
  }

  function myAppointments(customerId){
    return read("dril_appointments", []).filter(a => a.customerId === customerId)
      .sort((a,b)=> new Date(a.date+" "+a.time) - new Date(b.date+" "+b.time));
  }
  function getAppointment(id){ return read("dril_appointments", []).find(a=>a.id===id); }
  function updateAppointment(id, patch){
    const appts = read("dril_appointments", []);
    const idx = appts.findIndex(a=>a.id===id);
    if(idx>-1){ appts[idx] = {...appts[idx], ...patch}; write("dril_appointments", appts); }
    return appts[idx];
  }
  function cancelAppointment(id){
    const a = updateAppointment(id, {status:"cancelled"});
    if(a) seedNotification(a.customerId, "Appointment cancelled", `${a.treatmentName} on ${a.date} has been cancelled.`, "cancellation");
    return a;
  }

  function myNotifications(customerId){
    return read("dril_notifications", []).filter(n=>n.customerId===customerId)
      .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  }
  function markAllRead(customerId){
    const list = read("dril_notifications", []).map(n => n.customerId===customerId ? {...n, read:true} : n);
    write("dril_notifications", list);
  }
  function markRead(id){
    const list = read("dril_notifications", []).map(n => n.id===id ? {...n, read:true} : n);
    write("dril_notifications", list);
  }

  function updateProfile(customerId, patch){
    const users = read("dril_users", []);
    const idx = users.findIndex(u=>u.id===customerId);
    if(idx>-1){ users[idx] = {...users[idx], ...patch}; write("dril_users", users);
      if(read("dril_session")===users[idx].email || patch.email===undefined) {} }
    return users[idx];
  }

  /* ---------- UI helpers ---------- */
  function toast(msg){
    let el = document.querySelector(".toast");
    if(!el){ el = document.createElement("div"); el.className="toast"; el.innerHTML = `<span class="dot"></span><span class="msg"></span>`; document.body.appendChild(el); }
    el.querySelector(".msg").textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(()=> el.classList.remove("show"), 2600);
  }

  function money(n){ return "₦" + n.toLocaleString("en-NG"); }

  function initMobileMenu(){
    const btn = document.querySelector(".menu-btn");
    const panel = document.querySelector(".mobile-panel");
    if(!btn || !panel) return;
    btn.addEventListener("click", ()=>{
      const open = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true":"false");
    });
  }

  function initProfileDropdown(){
    const trigger = document.querySelector("[data-dropdown-trigger]");
    const menu = document.querySelector("[data-dropdown-menu]");
    if(!trigger || !menu) return;
    trigger.addEventListener("click", (e)=>{ e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", ()=> menu.classList.remove("open"));
  }

  /* ---------- dashboard shell (sidebar + topbar + mobile bottom nav) ---------- */
  const NAV_ITEMS = [
    { key:"overview", label:"Dashboard", href:"index.html", ic:"◧" },
    { key:"appointments", label:"Appointments", href:"appointments.html", ic:"🗓" },
    { key:"book", label:"Book Appointment", href:"book.html", ic:"＋" },
    { key:"treatments", label:"Treatments", href:"treatments.html", ic:"✦" },
    { key:"history", label:"History", href:"history.html", ic:"⟲" },
    { key:"notifications", label:"Notifications", href:"notifications.html", ic:"◍" },
    { key:"profile", label:"Profile", href:"profile.html", ic:"◐" },
    { key:"settings", label:"Settings", href:"settings.html", ic:"⚙" },
    { key:"support", label:"Support", href:"support.html", ic:"◇" },
  ];
  const BOTTOM_ITEMS = ["overview","appointments","book","history","profile"];

  function initials(user){ return (user.firstName[0]+user.lastName[0]).toUpperCase(); }

  function mountDashboard(active, user, opts){
    opts = opts || {};
    const unread = myNotifications(user.id).filter(n=>!n.read).length;
    const shell = document.getElementById("shell");
    shell.innerHTML = `
      <aside class="dash-sidebar">
        <a class="brand" href="../index.html"><span class="mark">DR</span><span class="name">D-Ril <small style="color:rgba(244,239,228,.4);">SPA</small></span></a>
        <nav class="dash-nav">
          ${NAV_ITEMS.map(i => `<a href="${i.href}" class="${i.key===active?'active':''}"><span class="ic">${i.ic}</span>${i.label}</a>`).join("")}
        </nav>
        <div class="logout"><a href="#" id="sidebarLogout"><span class="ic">⏻</span>Logout</a></div>
      </aside>
      <div class="dash-main">
        <div class="dash-topbar">
          <div class="greet">${opts.title || ("Welcome, "+user.firstName)}</div>
          <div class="right">
            <a class="icon-btn" href="notifications.html" aria-label="Notifications">🔔${unread?'<span class="badge"></span>':''}</a>
            <div class="dropdown">
              <button class="profile-chip" data-dropdown-trigger style="background:none; border:0;">
                <div class="avatar">${initials(user)}</div>
              </button>
              <div class="dropdown-menu" data-dropdown-menu>
                <a href="profile.html">Profile</a>
                <a href="appointments.html">Appointments</a>
                <a href="settings.html">Settings</a>
                <div class="divider"></div>
                <button id="dropdownLogout">Logout</button>
              </div>
            </div>
          </div>
        </div>
        <div class="dash-content" id="dashContent"></div>
      </div>
      <nav class="bottom-nav">
        ${BOTTOM_ITEMS.map(k=>{ const item = NAV_ITEMS.find(i=>i.key===k);
          return `<a href="${item.href}" class="${k===active?'active':''}"><span class="ic">${item.ic}</span>${item.label.split(' ')[0]}</a>`;
        }).join("")}
      </nav>
    `;
    const doLogout = (e)=>{ e.preventDefault(); logout(); window.location.href = "../index.html"; };
    document.getElementById("sidebarLogout").addEventListener("click", doLogout);
    document.getElementById("dropdownLogout").addEventListener("click", doLogout);
    initProfileDropdown();
    return document.getElementById("dashContent");
  }

  return {
    TREATMENTS, TIME_SLOTS, mountDashboard, initials,
    currentUser, register, login, logout, requireAuth, redirectIfAuthed,
    relativeAuthPath, relativeDashboardPath, relativeRootPath,
    createAppointment, myAppointments, getAppointment, updateAppointment, cancelAppointment,
    myNotifications, markAllRead, markRead, updateProfile,
    toast, money, initMobileMenu, initProfileDropdown
  };
})();
