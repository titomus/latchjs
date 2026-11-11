/* GitHub Pages only: deterministic, in-memory HTML fragment API.
   This is a demo adapter, not part of the Latch runtime. */
(function () {
  "use strict";
  var contacts = [
    {id:1,name:"Olivia Chen",company:"Northstar Studio",email:"olivia@northstar.test",status:"active"},
    {id:2,name:"Marco Silva",company:"Waypoint",email:"marco@waypoint.test",status:"lead"},
    {id:3,name:"Nora Laurent",company:"Studio Amble",email:"nora@amble.test",status:"active"},
    {id:4,name:"Jordan Lee",company:"Pixelworks",email:"jordan@pixelworks.test",status:"paused"},
    {id:5,name:"Sofia Khan",company:"Fern & Co.",email:"sofia@fern.test",status:"lead"},
    {id:6,name:"Mateo Rossi",company:"Pioneer",email:"mateo@pioneer.test",status:"active"},
    {id:7,name:"Iris Dubois",company:"Horizon Labs",email:"iris@horizon.test",status:"active"},
    {id:8,name:"Samira Ahmed",company:"Orbit Creative",email:"samira@orbit.test",status:"lead"}
  ];
  var originalFetch = window.fetch.bind(window);
  var nextId = 9;
  function escapeHTML(value) {
    return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function response(body,status,headers) {
    return new Response(body,{status:status||200,headers:Object.assign({"content-type":"text/html;charset=utf-8"},headers||{})});
  }
  function statusTag(value) {
    var klass = value==="active"?"green":value==="lead"?"blue":"amber";
    return '<span class="pill '+klass+'">'+escapeHTML(value)+'</span>';
  }
  function leadRow(item) {
    var id=Number(item.id);
    return '<tr id="contact-'+id+'"><td class="td-name">'+escapeHTML(item.name)+'</td><td>'+escapeHTML(item.company)
      +'</td><td>'+statusTag(item.status)+'</td><td><span class="lead-actions">'
      +'<button class="text-link danger" type="button" lt-delete="./__demo/contacts/'+id+'" lt-target="#contact-'+id
      +'" lt-swap="remove" lt-confirm="Remove '+escapeHTML(item.name)+' from the demo?"'
      +' lt-toast-success="Contact deleted">Delete</button></span></td></tr>';
  }
  function tableMarkup(url) {
    var search=(url.searchParams.get("q")||"").trim().toLowerCase();
    var status=url.searchParams.get("status")||"";
    var sort=url.searchParams.get("sort")||"";
    var order=url.searchParams.get("order")==="desc"?-1:1;
    var filtered=contacts.filter(function(item) {
      return (!status||item.status===status)&&(!search||[item.name,item.company,item.email].some(function(value){return value.toLowerCase().includes(search);}));
    });
    if(["name","company","status"].includes(sort)){
      filtered.sort(function(a,b){return a[sort].localeCompare(b[sort])*order;});
    }
    var page=Math.max(1,Number(url.searchParams.get("page")||1));
    var pages=Math.max(1,Math.ceil(filtered.length/5));
    page=Math.min(page,pages);
    var entries=filtered.slice((page-1)*5,page*5);
    var rows=entries.length?entries.map(leadRow).join(""):'<tr><td colspan="4">No contacts match. Try another filter.</td></tr>';
    var header='<table aria-label="Demo contacts"><thead><tr><th><button class="text-link" type="button" lt-table-sort="name">Name ↕</button></th>'
      +'<th><button class="text-link" type="button" lt-table-sort="company">Company ↕</button></th><th><button class="text-link" type="button" lt-table-sort="status">Status ↕</button></th><th>Action</th></tr></thead>';
    return header+'<tbody>'+rows+'</tbody></table><div class="row" style="justify-content:space-between;padding:12px;background:#fafcff;border-top:1px solid #e8edf2">'
      +'<span class="hint">'+filtered.length+' contacts · page '+page+' of '+pages+'</span><span class="row">'
      +'<button class="btn btn-outline btn-small" type="button" lt-table-page="prev">Previous</button>'
      +'<button class="btn btn-outline btn-small" type="button" lt-table-page="next">Next</button></span></div>';
  }
  var features=[
    ["Forms","Validation, server errors, reset and success toasts."],
    ["Modals","Overlay content with focus management."],
    ["Data tables","Pagination, search, sorting and filters."],
    ["Local state","lt-state, lt-click, lt-model and bindings."],
    ["Requests","GET, POST, PUT, PATCH, DELETE and DOM swaps."],
    ["Events","Lifecycle hooks, custom events and refresh triggers."],
    ["Drawers","Server-sourced content in a slide-over panel."],
    ["Notifications","Accessible built-in toast messages."]
  ];
  function searchMarkup(url) {
    var q=(url.searchParams.get("q")||"").trim().toLowerCase();
    var matches=features.filter(function(x){return x.join(" ").toLowerCase().includes(q);});
    if(!q)return '<span class="hint">Try searching for “modal”, “state” or “forms”.</span>';
    return matches.length?'<strong>'+matches.length+' result(s)</strong><ul class="no-list">'+matches.map(function(x){return '<li><strong>'+escapeHTML(x[0])+'</strong><br><span class="hint">'+escapeHTML(x[1])+'</span></li>';}).join("")+'</ul>':
      '<span class="hint">No matching feature. Try “forms” or “requests”.</span>';
  }
  function payloadFrom(init) {
    if(init&&init.body instanceof FormData)return Object.fromEntries(init.body.entries());
    try { return JSON.parse(init&&init.body||"{}"); }catch(_){return {};}
  }
  async function api(input,init) {
    var url=new URL(input instanceof Request?input.url:String(input),location.href);
    if(!url.pathname.includes("/__demo/"))return originalFetch(input,init);
    var path=url.pathname.split("/__demo/")[1];
    var method=String(init&&init.method||"GET").toUpperCase();
    // Deliberate tiny delay so loading indicators and events can be observed.
    await new Promise(function(done){setTimeout(done,55);});
    if(init&&init.signal&&init.signal.aborted)throw new DOMException("Request cancelled","AbortError");
    if(path==="contacts"&&method==="GET")return response(tableMarkup(url));
    if(path==="contacts"&&method==="POST") {
      var data=payloadFrom(init);
      var name=String(data.name||"").trim();
      var company=String(data.company||"").trim();
      var email=String(data.email||"").trim();
      var errors={};
      if(name.length<2)errors.name="Enter at least two characters.";
      if(!company)errors.company="Company is required.";
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email="Enter a valid email.";
      if(email.endsWith("@taken.test")||contacts.some(function(v){return v.email.toLowerCase()===email.toLowerCase();}))errors.email="This address is already used in the demo.";
      if(Object.keys(errors).length)return new Response(JSON.stringify({errors:errors,message:"Please review the form."}),{status:422,headers:{"content-type":"application/json"}});
      contacts.unshift({id:nextId++,name:name,company:company,email:email,status:["active","lead","paused"].includes(data.status)?data.status:"lead"});
      return response('<span class="pill green">Created '+escapeHTML(name)+' successfully</span>',201,{"X-Latch-Event":"contact:changed"});
    }
    var match=/^contacts\/(\d+)$/.exec(path);
    if(match&&method==="DELETE"){
      contacts=contacts.filter(function(v){return v.id!==Number(match[1]);});
      return response("",200,{"X-Latch-Event":"contact:changed"});
    }
    if(path==="search"&&method==="GET")return response(searchMarkup(url));
    if(path==="preview"&&method==="GET")return response('<div><span class="kicker">Remote fragment</span><h2>Preview drawer</h2><p class="subheading">The content of this drawer arrived as an HTML Response and was enhanced after insertion.</p><div class="callout"><strong>No frontend route or component build.</strong><p>The server remains responsible for the data and markup.</p></div><div class="top-space"><button class="btn btn-outline" type="button" lt-toast="Action received">Test toast</button> <button class="btn" type="button" lt-close="drawer">Close drawer</button></div></div>');
    return response('<p>Demo endpoint not found</p>',404);
  }
  window.LatchDemoApi={contacts:function(){return contacts.slice();},reset:function(){location.reload();}};
  window.fetch=api;
})();