---
title: "NoSystemTableChoiceList"
id: "nosystemtablechoicelist"
---

API Name: global.NoSystemTableChoiceList

```js
var NoSystemTableChoiceList = Class.create();
NoSystemTableChoiceList.prototype = {
    initialize: function() {
    },
	
	process: function() {
      var tl = new GlideTableChoiceList();
	  tl.setSelectedOnly(false);
	  tl.setSelectedField(null);
	  tl.setSelected(null);
	  tl.setForceSelected(false);
	  tl.setNoViews(true);
	  tl.setNoSystemTables(true);
	  tl.setCurrentTableName(null);
	  tl.setNoIndexTables(true);

	  return tl;
    },


    type: 'NoSystemTableChoiceList'
};
```