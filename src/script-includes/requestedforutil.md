---
title: "RequestedForUtil"
id: "requestedforutil"
---

API Name: global.RequestedForUtil

```js
var RequestedForUtil = Class.create();
RequestedForUtil.prototype = {
    initialize: function() {
    },
	hasRequestedForOnVariableSet : function(variableSetSysId) {
		if (!GlideStringUtil.isEligibleSysID(variableSetSysId))
			return false;
		var gr = new GlideRecord("item_option_new");
		gr.addQuery("type", "31");
		gr.addQuery("variable_set", variableSetSysId);
		gr.query();
		return gr.hasNext();
	},
	hasRequestedForOnItem : function(itemSysId) {
		if (!GlideStringUtil.isEligibleSysID(itemSysId))
			return false;
		//Check on variables attached to item
		var gr = new GlideRecord("item_option_new");
		gr.addQuery("type", "31");
		gr.addQuery("cat_item", itemSysId);
		gr.query();
		if (gr.hasNext())
			return true;
		//check on variable set's attached to item
		gr = new GlideRecord("io_set_item");
		gr.addQuery("sc_cat_item", itemSysId);
		gr.query();
		while(gr.next()) {
			if (this.hasRequestedForOnVariableSet(gr.variable_set))
				return true;
		}
		return false;
	},
	getDocumentationLink : function() {
		return '<a id="permalink" class="linked" style="color:#666666;" href="itsm_context_help.do?help_resource=CSHelp:Variable_Types" target="_blank">' + new GlideSysMessage.format("More Info.") + '</a>';
	},
    type: 'RequestedForUtil'
};
```