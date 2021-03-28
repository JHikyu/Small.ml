

// on highlight
var t = '';
function gText(e) {
   t = (document.all) ? document.selection.createRange().text : document.getSelection();

   if(t.type = 'Range' && t.focusOffset - t.anchorOffset > 0) {
         xhttp = new XMLHttpRequest();
         xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
               console.log(JSON.parse(this.responseText));
               if(JSON.parse(this.responseText).error) {


               }
               else {
                  var out = JSON.parse(this.responseText).complete_shorten_url
                  const el = document.createElement('textarea');
                  el.value = out;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
               }
            }
         };
         xhttp.open("GET", "https://small.ml/api/v1/create?url=" + String(t), true);
         xhttp.send();
      }
}

document.onmouseup = gText;
if (!document.all) document.captureEvents(Event.MOUSEUP);
