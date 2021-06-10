---
title: "AclBasedChoiceList"
id: "aclbasedchoicelist"
---

API Name: global.AclBasedChoiceList

```js
var AclBasedChoiceList = Class.create();
AclBasedChoiceList.prototype = {
	
	process: function() {
      var tl = new GlideTableChoiceList();
	  tl.setNoRotationTables(true);
	  tl.setNoImportTables(true);
	  tl.setNoIndexTables(true)
      tl.setCanRead(true);
      tl.setShowLabels(true);
	  tl.setSelectedOnly(false);
	  tl.setSelectedField(null);
	  tl.setSelected(null);
	  tl.setForceSelected(false);
	  tl.setNoViews(true);
	  tl.setCurrentTableName(null);
	  tl.generateChoices();
	  
	  var choiceList = this._toArray(tl);
	  return choiceList;
    },

	_toArray : function(tl) {
	  var result = [];
      for (var i =0; i < tl.size(); i++) {
         var c = tl.getChoice(i);
		 var tableName = c.getValue();
		 result.push(tableName);
      }
	  return result;
    },


    type: 'AclBasedChoiceList'
};
```