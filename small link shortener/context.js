chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
        title: 'Shrink it!',
        id: 'menu1', // you'll use this in the handler function to identify this context menu item
        contexts: ['link'],
    });
    chrome.contextMenus.create({
        title: 'Text it! [1 Hour]',
        id: 'menu2', // you'll use this in the handler function to identify this context menu item
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {

   if(info.menuItemId === "menu1") {
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
         }
      };
      xhttp.open("GET", "https://small.ml/api/v1/create?url=" + info.linkUrl, true);
      xhttp.send();
   }

   if(info.menuItemId === "menu2") {
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
         }
      };
      xhttp.open("GET", "https://small.ml/api/v1/text?text=" + JSON.stringify(info.selectionText).replaceAll("\\n", "<br \\>"), true);
      xhttp.send();
   }



});
