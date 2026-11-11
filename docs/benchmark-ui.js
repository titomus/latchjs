/* Compare equivalent Latch/Alpine state and Latch/htmx HTML swap workloads.
 * Each runtime executes in its own origin-checked iframe. */
(function(){
  "use strict";
  var names={latch:"Latch.js",alpine:"Alpine.js",htmx:"HTMX"};
  var frames={};
  document.querySelectorAll("iframe[data-engine]").forEach(function(el){frames[el.dataset.engine]=el;});
  var ready=new Set(),failures={},pending=new Map(),sequence=0,report={timestamp:null,environment:navigator.userAgent,tests:{}};
  function get(id){return document.getElementById(id);}
  function escape(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function nextId(){sequence++;return "bench-"+sequence;}
  window.addEventListener("message",function(event){
    if(event.origin!==location.origin)return;
    var data=event.data;
    if(!data||data.source!=="latch-benchmark")return;
    var frame=frames[data.engine];
    if(!frame||event.source!==frame.contentWindow)return;
    if("ready" in data){
      if(data.ready)ready.add(data.engine);else failures[data.engine]=data.error||"Runtime failed to load";
      if(ready.size===3){
        if(get("state-status").textContent.includes("Preparing"))get("state-status").textContent="Ready. Choose a workload and run it.";
        if(get("swap-status").textContent.includes("Preparing"))get("swap-status").textContent="Ready. Compare matching HTML responses.";
      }
      return;
    }
    var task=pending.get(data.id);
    if(!task)return;
    pending.delete(data.id);
    clearTimeout(task.timeout);
    if(data.ok)task.resolve(data.result);else task.reject(new Error(data.error||"Unknown benchmark failure"));
  });
  async function waitReady(engine){
    var started=Date.now();
    while(!ready.has(engine)){
      if(failures[engine])throw new Error(names[engine]+": "+failures[engine]);
      if(Date.now()-started>18000)throw new Error(names[engine]+" did not initialize. Check the bundled vendor assets.");
      await new Promise(function(resolve){setTimeout(resolve,70);});
    }
  }
  async function runOne(engine,task,options){
    await waitReady(engine);
    return new Promise(function(resolve,reject){
      var id=nextId();
      var timeout=setTimeout(function(){pending.delete(id);reject(new Error(names[engine]+" timed out"));},45000);
      pending.set(id,{resolve:resolve,reject:reject,timeout:timeout});
      frames[engine].contentWindow.postMessage(Object.assign({source:"latch-benchmark-host",id:id,task:task},options),location.origin);
    });
  }
  function row(engine,data){
    return '<tr><td><strong>'+escape(names[engine])+'</strong></td><td>'+data.initMs.toFixed(2)+' ms</td><td>'+data.medianMs.toFixed(2)+' ms</td><td>'+data.p95Ms.toFixed(2)+' ms</td></tr>';
  }
  async function runPair(task){
    var isState=task==="state",suffix=isState?"state":"swap";
    var btn=get("run-"+suffix),status=get(suffix+"-status");
    var left="latch",right=isState?"alpine":"htmx";
    var options=isState?{
      rows:Number(get("state-rows").value),
      iterations:Number(get("state-reps").value)
    }:{iterations:Number(get("swap-reps").value)};
    btn.disabled=true;
    status.textContent="Starting "+names[left]+" and "+names[right]+"…";
    try{
      var first=await runOne(left,task,options);
      status.textContent=names[left]+" complete. Measuring "+names[right]+"…";
      var second=await runOne(right,task,options);
      get(suffix+"-result").innerHTML=row(left,first)+row(right,second);
      var ratio=second.medianMs>0?first.medianMs/second.medianMs:0;
      var relation=ratio>0?(ratio<1?"Latch ran "+(1/ratio).toFixed(2)+"× faster":"The comparator ran "+ratio.toFixed(2)+"× faster"):"Both completed";
      status.textContent="Completed "+first.iterations+" measured runs. "+relation+" on this browser, for this workload only.";
      report.timestamp=new Date().toISOString();
      report.tests[task]={options:options,libraries:{latch:first,[right]:second}};
    }catch(error){
      status.textContent="Could not complete: "+String(error.message||error);
    }finally{btn.disabled=false;}
  }
  get("run-state").addEventListener("click",function(){void runPair("state");});
  get("run-swap").addEventListener("click",function(){void runPair("swap");});
  get("download-results").addEventListener("click",function(){
    var blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="latch-comparison-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  });
  get("environment").textContent=navigator.userAgent.replace(/\(.+?\)/g,"").slice(0,90);
  fetch("./benchmark-metadata.json").then(function(r){if(!r.ok)throw Error("missing");return r.json();}).then(function(meta){
    report.versions=meta.versions;
    var container=get("size-metrics");
    container.innerHTML=["latch","htmx","alpine"].map(function(key){
      var bytes=meta.bytes[key]||{},compressed=bytes.gzip||0;
      return '<div class="metric"><strong>'+((compressed/1024)||0).toFixed(1)+' KB</strong><small>'+escape(names[key])+' '+escape(meta.versions[key])+' · gzip</small></div>';
    }).join("");
  }).catch(function(){get("size-metrics").textContent="Size metadata unavailable. Check the Pages build."});
})();