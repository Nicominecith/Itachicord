/* v10: eigener "Datei auswählen"-Button (statt Browser-Standard) für alle sichtbaren Datei-Felder */
(function(){
function enhance(inp){
 if(inp.dataset.fp||inp.classList.contains("hide")||inp.closest("#in"))return;
 inp.dataset.fp="1";
 var w=document.createElement("div");w.className="fpick";
 var b=document.createElement("button");b.type="button";b.className="fpb";b.textContent="📎 Datei auswählen";
 var n=document.createElement("span");n.className="fpn";n.textContent="Keine Datei ausgewählt";
 var th=document.createElement("img");th.className="fpt";th.alt="";
 inp.parentNode.insertBefore(w,inp);w.appendChild(th);w.appendChild(b);w.appendChild(n);w.appendChild(inp);
 inp.style.display="none";
 b.onclick=function(){inp.click()};
 inp.addEventListener("change",function(){
  var f=inp.files&&inp.files[0];
  if(!f){n.textContent="Keine Datei ausgewählt";w.classList.remove("has");th.removeAttribute("src");return}
  n.textContent=f.name;w.classList.add("has");
  if(/^image\//.test(f.type)){if(th.dataset.u)URL.revokeObjectURL(th.dataset.u);var u=URL.createObjectURL(f);th.dataset.u=u;th.src=u;w.classList.add("img")}
  else{w.classList.remove("img");th.removeAttribute("src")}});
}
function scan(r){(r.querySelectorAll?r.querySelectorAll('input[type=file]'):[]).forEach(enhance)}
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(x){if(x.nodeType==1){if(x.matches&&x.matches('input[type=file]'))enhance(x);else scan(x)}})})})
 .observe(document.documentElement,{childList:true,subtree:true});
scan(document);
})();
