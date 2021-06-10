---
title: "GetRelatedLists"
id: "getrelatedlists"
---

API Name: global.GetRelatedLists

```js
var GetRelatedLists = Class.create();
GetRelatedLists.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getRelatedLists: function() {
		var relatedListsScreenId = this.getParameter('sysparm_related_lists_screen');

		var relatedListsScreenGR = new GlideRecord("sys_sg_related_lists_screen");
		relatedListsScreenGR.get(relatedListsScreenId);
		if (!relatedListsScreenGR.isValidRecord()) {
			var errorMessage = gs.getMessage("Invalid sys_sg_related_lists_screen record: {0}", relatedListsScreenId);
			gs.addErrorMessage(errorMessage);
			return;
		}

		var tableName = relatedListsScreenGR.table;
		var gr = new GlideRecord(tableName);
		var rl = gr.getRelatedLists();
		var values = rl.values().toArray();
		var keys = rl.keySet().toArray();
		var result = [];

		for (var i in values) {
			var item = {};
			item.relationship = keys[i];
			item.label = values[i];
			result.push(item);
		}

		return JSON.stringify(result);
	},
    type: 'GetRelatedLists'
});
```