(function(){
  "use strict";
  var CFG = window.ASEBUILDER_CONFIG;
  var INSTALLED_KEY = "asebuilder_installed";
  var REL_CACHE_KEY = "asebuilder_releases_cache";
  var state = { data: null, liveTag: null, releases: [], viewVersion: null };

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

  function getInstalled(){ return localStorage.getItem(INSTALLED_KEY) || ""; }
  function setInstalled(v){
    if(v){ localStorage.setItem(INSTALLED_KEY, v); }
    else { localStorage.removeItem(INSTALLED_KEY); }
    render();
  }

  function fmtDate(iso){
    if(!iso) return "—";
    var d = new Date(iso);
    if(isNaN(d)) return iso;
    var p = function(n){ return n<10?"0"+n:n; };
    return d.getUTCFullYear()+"-"+p(d.getUTCMonth()+1)+"-"+p(d.getUTCDate());
  }

  function statusBadge(s){
    var map = { ready:["badge-ready","READY"], pending:["badge-pending","PENDING"],
      building:["badge-building","BUILDING"], failed:["badge-failed","FAILED"] };
    var m = map[s] || ["badge-idle","—"];
    return '<span class="badge '+m[0]+'">'+m[1]+'</span>';
  }

  function renderMarkdown(md){
    if(!md) return '<p class="dim">no changelog</p>';
    var lines = esc(md).split(/\r?\n/);
    var html = [], inUl = false;
    function closeUl(){ if(inUl){ html.push("</ul>"); inUl=false; } }
    lines.forEach(function(raw){
      var line = raw;
      if(/^\s*##\s+/.test(line)){ closeUl(); html.push("<h2>"+line.replace(/^\s*##\s+/,"")+"</h2>"); return; }
      if(/^\s*#\s+/.test(line)){ closeUl(); html.push("<h3>"+line.replace(/^\s*#\s+/,"")+"</h3>"); return; }
      if(/^\s*[-*]\s+/.test(line)){ if(!inUl){ html.push("<ul>"); inUl=true; } html.push("<li>"+line.replace(/^\s*[-*]\s+/,"")+"</li>"); return; }
      if(line.trim()===""){ closeUl(); return; }
      closeUl(); html.push("<p>"+line+"</p>");
    });
    closeUl();
    var out = html.join("\n");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return out;
  }

  function builtMap(){
    var map = {};
    var d = state.data;
    if(d && d.latest && d.latest.version){
      map[d.latest.version] = { url: d.latest.download_url, status: d.latest.build_status };
    }
    if(d && d.history){
      d.history.forEach(function(h){
        if(h.version) map[h.version] = { url: h.download_url, status: h.build_status };
      });
    }
    return map;
  }

  function allVersions(){
    var list = [];
    if(state.releases.length){
      state.releases.forEach(function(r){ if(r.tag_name) list.push(r.tag_name); });
    }
    var d = state.data;
    if(d && d.latest && d.latest.version) list.push(d.latest.version);
    if(d && d.history) d.history.forEach(function(h){ if(h.version) list.push(h.version); });
    var seen = {}, uniq = [];
    list.forEach(function(v){ if(!seen[v]){ seen[v]=1; uniq.push(v); } });
    return uniq;
  }

  function fillInstalledSelect(){
    var sel = $("setInstalled"); if(!sel) return;
    var cur = getInstalled();
    var opts = '<option value="">— not set —</option>';
    allVersions().forEach(function(v){
      opts += '<option value="'+v+'"'+(v===cur?" selected":"")+">"+v+"</option>";
    });
    sel.innerHTML = opts;
  }

  function renderLatest(){
    var d = state.data; var l = d && d.latest;
    $("latestVer").textContent = l ? l.version : "—";
    $("latestDate").textContent = l ? "released "+fmtDate(l.published_at) : "";
    var cls = l ? ({ready:"badge-ready",pending:"badge-pending",building:"badge-building",failed:"badge-failed"}[l.build_status]||"badge-idle") : "badge-idle";
    var txt = l ? ({ready:"READY",pending:"PENDING",building:"BUILDING",failed:"FAILED"}[l.build_status]||"—") : "—";
    $("latestStatus").className = "badge "+cls;
    $("latestStatus").textContent = txt;

    var dl = $("downloadBtn"), hint = $("downloadHint"), note = $("downloadNote");
    if(l && l.download_url){
      dl.href = l.download_url; dl.classList.remove("hidden");
      dl.setAttribute("data-ver", l.version);
      hint.classList.add("hidden");
      if(l.download_url.indexOf("/actions/runs/") !== -1){
        note.textContent = "private artifact · GitHub login required";
        note.classList.remove("hidden");
      } else {
        note.classList.add("hidden");
      }
    } else {
      dl.removeAttribute("href"); dl.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = l ? "build not ready — run build" : "no build yet";
      note.classList.add("hidden");
    }
  }

  function findChangelog(version){
    var i, r, d = state.data;
    for(i=0; state.releases.length && i<state.releases.length; i++){
      if(state.releases[i].tag_name === version) return state.releases[i].body || "";
    }
    if(d && d.latest && d.latest.version === version) return d.latest.changelog || "";
    if(d && d.history){
      for(i=0; i<d.history.length; i++){ if(d.history[i].version === version) return d.history[i].changelog || ""; }
    }
    return "";
  }

  function renderChangelog(){
    var d = state.data;
    var l = d && d.latest;
    var ver = state.viewVersion;
    var body, label;
    if(ver){
      body = findChangelog(ver);
      label = ver;
      $("clLatest").classList.remove("hidden");
    } else {
      body = l ? l.changelog : "";
      label = l ? l.version + " (latest build)" : "—";
      $("clLatest").classList.add("hidden");
    }
    $("clVer").textContent = label;
    $("changelog").innerHTML = renderMarkdown(body);
  }

  function setViewVersion(v){
    state.viewVersion = v;
    render();
    document.querySelector(".panel.changelog").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function renderHistory(){
    var body = $("historyBody");
    var rows = state.releases.slice();
    var bmap = builtMap();
    if(!rows.length){
      var hist = (state.data && state.data.history) ? state.data.history.slice() : [];
      if(!hist.length){
        body.innerHTML = '<tr><td colspan="4" class="empty">loading releases…</td></tr>';
        return;
      }
      rows = hist;
    }
    body.innerHTML = rows.map(function(r){
      var ver = r.tag_name || r.version || "—";
      var pub = r.published_at;
      var b = bmap[ver];
      var stHtml, act;
      if(b && b.url){
        stHtml = statusBadge(b.status);
        act = '<a class="btn btn-mini btn-go" href="'+b.url+'" target="_blank" rel="noopener" data-ver="'+ver+'">DOWNLOAD</a>';
      } else if(b){
        stHtml = statusBadge(b.status);
        act = '<span class="dim">—</span>';
      } else {
        stHtml = '<span class="dim">not built</span>';
        act = '<span class="dim">—</span>';
      }
      act += '<button class="btn btn-mini" data-set="'+ver+'">SET MINE</button>';
      var pre = r.prerelease ? ' <span class="badge badge-idle">PRE</span>' : '';
      var verBtn = '<button class="ver-btn" data-log="'+ver+'">'+ver+'</button>';
      return '<tr><td class="mono">'+verBtn+pre+'</td>'+
        '<td class="mono dim">'+fmtDate(pub)+'</td>'+
        '<td>'+stHtml+'</td>'+
        '<td><div class="mini">'+act+'</div></td></tr>';
    }).join("");
  }

  function officialVer(){
    if(state.releases.length && state.releases[0].tag_name) return state.releases[0].tag_name;
    if(state.liveTag) return state.liveTag;
    var d = state.data;
    return (d && d.latest && d.latest.version) ? d.latest.version : "";
  }

  function computeMyVersion(){
    var installed = getInstalled();
    var official = officialVer();
    var built = (state.data && state.data.latest && state.data.latest.version) || "";

    $("installedVer").textContent = installed || "—";
    $("upstreamVer").textContent = official || "…";
    $("builtVer").textContent = built || "…";

    var statusEl = $("mvStatus"), noteEl = $("mvNote");
    if(!installed){
      statusEl.className = "badge badge-idle"; statusEl.textContent = "SET VERSION";
      noteEl.textContent = "Pick the version you have installed (or hit DOWNLOAD).";
    } else if(official && installed === official){
      statusEl.className = "badge badge-uptodate"; statusEl.textContent = "UP TO DATE";
      noteEl.textContent = "You're on the latest official release.";
    } else if(official){
      statusEl.className = "badge badge-outdated"; statusEl.textContent = "UPDATE AVAILABLE";
      noteEl.textContent = installed + " → " + official;
    } else {
      statusEl.className = "badge badge-idle"; statusEl.textContent = "—";
      noteEl.textContent = "";
    }
  }

  function render(){
    var d = state.data;
    fillInstalledSelect();
    renderLatest();
    renderChangelog();
    renderHistory();
    computeMyVersion();
    $("trackedRepo").textContent = (d && d.tracked_repo) ? d.tracked_repo : CFG.UPSTREAM;
    $("trackedRepo").href = "https://github.com/"+((d && d.tracked_repo) || CFG.UPSTREAM);
    $("lastChecked").textContent = (d && d.last_checked) ? d.last_checked : "never";
    $("runBuildLink").href = window.ASEBUILDER_LINKS.actions();
    $("upstreamLink").href = window.ASEBUILDER_LINKS.upstreamReleases();
  }

  function alert(kind, msg){
    var el = $("alert");
    el.className = "alert "+kind;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(alert._t);
    alert._t = setTimeout(function(){ el.classList.add("hidden"); }, 7000);
  }

  function readRelCache(){
    try {
      var raw = sessionStorage.getItem(REL_CACHE_KEY);
      if(!raw) return null;
      var o = JSON.parse(raw);
      if(Date.now() - o.t < 3600000) return o.data;
    } catch(e){}
    return null;
  }
  function writeRelCache(data){
    try { sessionStorage.setItem(REL_CACHE_KEY, JSON.stringify({t:Date.now(), data:data})); } catch(e){}
  }

  function fetchReleases(){
    var cached = readRelCache();
    if(cached){ state.releases = cached; render(); return; }
    var url = "https://api.github.com/repos/"+CFG.UPSTREAM+"/releases?per_page=100";
    fetch(url, {headers:{"Accept":"application/vnd.github+json"}})
      .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .then(function(list){
        state.releases = (list || []).filter(function(r){ return r.tag_name; });
        writeRelCache(state.releases);
        render();
      })
      .catch(function(){ render(); });
  }

  function checkNow(){
    var btn = $("checkBtn");
    btn.setAttribute("disabled","disabled"); btn.textContent = "CHECKING…";
    var url = "https://api.github.com/repos/"+CFG.UPSTREAM+"/releases/latest";
    fetch(url, {headers:{"Accept":"application/vnd.github+json"}})
      .then(function(r){
        if(!r.ok) throw new Error("HTTP "+r.status);
        return r.json();
      })
      .then(function(rel){
        state.liveTag = rel.tag_name;
        render();
        var installed = getInstalled();
        var built = (state.data && state.data.latest) ? state.data.latest.version : "";
        var builtReady = (state.data && state.data.latest && state.data.latest.build_status==="ready");
        if(installed && rel.tag_name === installed){
          alert("ok", "UP TO DATE — latest is "+rel.tag_name);
        } else if(installed && rel.tag_name !== installed){
          alert("warn", "UPDATE AVAILABLE — "+installed+" → "+rel.tag_name+(builtReady?" (installer ready)":" (build pending)"));
        } else {
          alert("info", "LATEST "+rel.tag_name+(builtReady?" — installer ready":" — set your installed version"));
        }
      })
      .catch(function(e){
        var built = (state.data && state.data.latest) ? state.data.latest.version : "";
        if(built){ alert("ok", "offline — last built "+built); }
        else { alert("bad", "CHECK FAILED — "+e.message); }
      })
      .finally(function(){
        btn.removeAttribute("disabled"); btn.textContent = "CHECK NOW";
      });
  }

  function markInstalled(version){
    setInstalled(version);
    alert("ok", "INSTALLED = "+version);
  }

  document.addEventListener("click", function(e){
    var t = e.target;
    if(t.id === "checkBtn"){ checkNow(); return; }
    if(t.id === "clearInstalled"){ setInstalled(""); alert("info","installed version cleared"); return; }
    if(t.id === "clLatest"){ state.viewVersion = null; render(); return; }
    var logVer = t.getAttribute && t.getAttribute("data-log");
    if(logVer){ setViewVersion(logVer); return; }
    var setVer = t.getAttribute && t.getAttribute("data-set");
    if(setVer){ markInstalled(setVer); return; }
    if(t.id === "downloadBtn"){
      var ver = t.getAttribute("data-ver");
      if(ver){ localStorage.setItem(INSTALLED_KEY, ver); setTimeout(render,0); }
    }
  });

  $("setInstalled").addEventListener("change", function(e){
    setInstalled(e.target.value);
  });

  function load(){
    fetch("data.json", {cache:"no-store"})
      .then(function(r){ return r.json(); })
      .then(function(d){ state.data = d; render(); fetchReleases(); })
      .catch(function(){
        state.data = { latest:null, history:[] };
        render();
        alert("bad","could not load data.json");
      });
  }

  load();
})();
