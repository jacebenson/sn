---
title: "SearchSourceTableChoiceList"
id: "searchsourcetablechoicelist"
---

API Name: global.SearchSourceTableChoiceList

```js
var SearchSourceTableChoiceList = Class.create();
SearchSourceTableChoiceList.prototype = {
	initialize: function() {
	},

	process: function() {
		var tl = new GlideTableChoiceList();
		tl.setAll(true);
		tl.setCanRead(true);
		tl.setShowLabels(true);
		tl.setSelectedOnly(false);
		tl.setSelectedField(null);
		tl.setSelected(null);
		tl.setForceSelected(false);
		tl.setNoViews(true);
		tl.setNoSystemTables(true);
		tl.setCurrentTableName(null);
		tl.generateChoices();

		var blacklist = new SearchSourceTableBlacklist().get();
		return this.filterAndFormat(tl, blacklist);
	},

	filterAndFormat: function(tl, blacklist) {
		var result = [];
		for (var i = 0; i < tl.size(); i++) {
			// The following String() typecast is needed for the blacklist is an array of strings and .getValue returns an object
			var tableName = String(tl.getChoice(i).getValue());
			if (blacklist.indexOf(tableName) < 0 && tableName.indexOf("ts_") < 0 && tableName.indexOf("syslog")) {
				result.push(tableName);
			}
		}
		return result;
	},

	type: 'SearchSourceTableChoiceList'
};
```