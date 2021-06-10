---
title: "ATFFormHelper"
id: "atfformhelper"
---

API Name: global.ATFFormHelper

```js
var ATFFormHelper = Class.create();
ATFFormHelper.prototype = {
	initialize: function() {
    },

	getFormUIAsChoiceList: function() {
		var formUIChoiceList = new GlideChoiceList();
		formUIChoiceList.add("standard_ui", "Standard UI");

		var gr = new GlideRecord("sys_aw_master_config");
		gr.query();

		while (gr.next())
			formUIChoiceList.add(gr.workspace_url, gr.name);

		return formUIChoiceList;
	},

    type: 'ATFFormHelper'
};
```