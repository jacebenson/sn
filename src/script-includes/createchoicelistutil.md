---
title: "CreateChoiceListUtil"
id: "createchoicelistutil"
---

API Name: global.CreateChoiceListUtil

```js
var CreateChoiceListUtil = Class.create();
CreateChoiceListUtil.prototype = {
	initialize: function() {
	},

	isVisibleButton: function(current) {
		if (current.choice != '1' && current.choice != '3')
			return false;

		if ( ['reference', 'glide_list', 'domain_id', 'collection'].indexOf(current.internal_type.toString()) >= 0 )
			return false;

		return !current.instanceOf('var_dictionary');
	},

	type: 'CreateChoiceListUtil'
};
```