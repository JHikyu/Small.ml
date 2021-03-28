document.addEventListener('DOMContentLoaded', function() {
   document.querySelector('button').addEventListener('click', onclick, false)


   // chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
   //    chrome.tabs.sendMessage(tabs[0].id, 'test')
   // })


   function onclick() {
      var input = document.querySelector('input')

      var xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
         if (this.readyState == 4 && this.status == 200) {
            var out = JSON.parse(this.responseText).complete_shorten_url


            const el = document.createElement('textarea');
            el.value = out;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            input.value = ''
         }
      };
      xhttp.open("GET", "https://small.ml/api/v1/create?url=" + input.value, true);
      xhttp.send();
   }

}, false)
