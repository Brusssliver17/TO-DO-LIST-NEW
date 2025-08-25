  const inputBox = document.getElementById("input-box");
    const addDate = document.getElementById("add-date");
    const addBtn = document.getElementById("add-btn");
    const listContainer = document.getElementById("list-container");
    const filterDate = document.getElementById("filter-date");
    const clearFilter = document.getElementById("clear-filter");
    const todayFilter = document.getElementById("today-filter");
    const sortDateBtn = document.getElementById("sort-date");
    const modeToggle = document.getElementById("mode-toggle");
    const body = document.body;

    // ---------- State ----------
    let tasks = []; // {id, text, done, date, order}
    let currentFilterDate = ""; // '' means all

    // ---------- Utils ----------
    const uid = () => Math.random().toString(36).slice(2, 9);
    const todayISO = () => new Date().toISOString().slice(0,10);

    function loadState(){
      const saved = localStorage.getItem("tasks_v2");
      tasks = saved ? JSON.parse(saved) : [];
      const theme = localStorage.getItem("theme_v2") || "light";
      body.classList.remove("light","dark","blue");
      body.classList.add(theme);
      updateModeIcon();
      // default add date = today
      addDate.value = todayISO();
    }
    function saveState(){
      localStorage.setItem("tasks_v2", JSON.stringify(tasks));
      localStorage.setItem("theme_v2", getTheme());
    }

    function getTheme(){
      if (body.classList.contains("dark")) return "dark";
      if (body.classList.contains("blue")) return "blue";
      return "light";
    }
    function cycleTheme(){ // light -> dark -> blue -> light
      if (body.classList.contains("light")) { body.classList.replace("light","dark"); }
      else if (body.classList.contains("dark")) { body.classList.replace("dark","blue"); }
      else { body.classList.remove("blue"); body.classList.add("light"); }
      updateModeIcon(); saveState();
    }
    function updateModeIcon(){
      modeToggle.textContent = body.classList.contains("dark") ? "☀️"
        : body.classList.contains("blue") ? "🧿" : "🌙";
    }

    // ---------- CRUD ----------
    function addTask(){
      const text = inputBox.value.trim();
      const date = addDate.value || todayISO();
      if(!text){ inputBox.focus(); return; }
      const maxOrder = tasks.length ? Math.max(...tasks.map(t=>t.order||0)) : 0;
      tasks.push({ id: uid(), text, done:false, date, order:maxOrder+1 });
      inputBox.value = "";
      render(); saveState();
      inputBox.focus();
    }
    function toggleDone(id){
      const t = tasks.find(x=>x.id===id); if(!t) return;
      t.done = !t.done; render(); saveState();
    }
    function delTask(id){
      tasks = tasks.filter(x=>x.id!==id); render(); saveState();
    }
    function updateText(id, newText){
      const t = tasks.find(x=>x.id===id); if(!t) return;
      t.text = newText.trim() || t.text; render(); saveState();
    }
    function updateDate(id, newDate){
      const t = tasks.find(x=>x.id===id); if(!t) return;
      t.date = newDate; render(); saveState();
    }

    // ---------- Render ----------
    function render(){
      // filter
      const items = tasks
        .filter(t => !currentFilterDate || t.date === currentFilterDate)
        .sort((a,b)=> (a.order||0)-(b.order||0) || a.text.localeCompare(b.text));

      listContainer.innerHTML = "";
      for(const t of items){
        const li = document.createElement("li");
        li.className = "item" + (t.done ? " done" : "");
        li.draggable = true;
        li.dataset.id = t.id;

        const handle = document.createElement("span");
        handle.className = "handle";
        handle.title = "Drag to reorder";
        handle.textContent = "⋮⋮";

        const check = document.createElement("input");
        check.type = "checkbox"; check.className = "check"; check.checked = t.done;
        check.addEventListener("change", ()=>toggleDone(t.id));

        const text = document.createElement("div");
        text.className = "text"; text.textContent = t.text;
        text.setAttribute("contenteditable","true");
        text.addEventListener("keydown", (e)=>{
          if(e.key==="Enter"){ e.preventDefault(); text.blur(); }
        });
        text.addEventListener("blur", ()=>updateText(t.id, text.textContent));

        const dateBadge = document.createElement("button");
        dateBadge.className = "date-badge";
        dateBadge.title = "Click to change date";
        dateBadge.textContent = t.date || "No date";
        dateBadge.addEventListener("click", async ()=>{
          const picker = document.createElement("input");
          picker.type = "date";
          picker.value = t.date || todayISO();
          picker.style.position="fixed"; picker.style.opacity="0"; document.body.appendChild(picker);
          picker.addEventListener("change", ()=>{ updateDate(t.id, picker.value); document.body.removeChild(picker); });
          picker.addEventListener("blur", ()=>{ if (picker.parentNode) document.body.removeChild(picker); });
          picker.showPicker ? picker.showPicker() : picker.focus();
        });

        const del = document.createElement("button");
        del.className = "del"; del.innerHTML = "✕";
        del.title = "Delete task";
        del.addEventListener("click", ()=>delTask(t.id));

        li.append(handle, check, text, dateBadge, del);
        listContainer.appendChild(li);
      }
      enableDnD();
    }

    // ---------- Drag & Drop ----------
    function enableDnD(){
      let draggedId = null;
      listContainer.querySelectorAll(".item").forEach(el=>{
        el.addEventListener("dragstart", (e)=>{ draggedId = el.dataset.id; e.dataTransfer.effectAllowed="move"; });
        el.addEventListener("dragover", (e)=>{
          e.preventDefault();
          const target = e.currentTarget;
          if(target.dataset.id === draggedId) return;
          const rect = target.getBoundingClientRect();
          const next = (e.clientY - rect.top) / (rect.height) > 0.5;
          listContainer.insertBefore(document.querySelector(`.item[data-id="${draggedId}"]`), next ? target.nextSibling : target);
        });
        el.addEventListener("drop", ()=>{
          // Read new order from DOM and update tasks.order
          const idsInDom = [...listContainer.querySelectorAll(".item")].map(n=>n.dataset.id);
          let order = 1;
          for(const id of idsInDom){
            const t = tasks.find(x=>x.id===id);
            if(!t) continue;
            t.order = order++;
          }
          saveState();
        });
      });
    }

    // ---------- Filters / Sort ----------
    filterDate.addEventListener("change", ()=>{ currentFilterDate = filterDate.value || ""; render(); });
    clearFilter.addEventListener("click", ()=>{ currentFilterDate=""; filterDate.value=""; render(); });
    todayFilter.addEventListener("click", ()=>{ currentFilterDate = todayISO(); filterDate.value=currentFilterDate; render(); });
    sortDateBtn.addEventListener("click", ()=>{
      // sort globally by date then order
      tasks.sort((a,b)=> (a.date||"").localeCompare(b.date||"") || (a.order||0)-(b.order||0));
      // re-number order to keep stable
      tasks.forEach((t,i)=>t.order=i+1);
      render(); saveState();
    });

    // ---------- Add actions (button + Enter) ----------
    addBtn.addEventListener("click", addTask);
    inputBox.addEventListener("keydown", e=>{ if(e.key==="Enter") addTask(); });
    addDate.addEventListener("keydown", e=>{ if(e.key==="Enter") addTask(); });

    // ---------- Theme ----------
    modeToggle.addEventListener("click", cycleTheme);

    // ---------- Init ----------
    loadState(); render();