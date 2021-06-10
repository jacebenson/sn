---
title: "InteractionChoiceListBuilder"
id: "interactionchoicelistbuilder"
---

API Name: global.InteractionChoiceListBuilder

```js
var InteractionChoiceListBuilder = Class.create();
InteractionChoiceListBuilder.prototype = {
    initialize: function() {
    },

	getStateChoiceList: function() { 
		return GlideChoiceList.getChoiceList('interaction', 'state');
	},

	getTypeChoiceList: function() { 
		return GlideChoiceList.getChoiceList('interaction', 'type');
	},
	
    type: 'InteractionChoiceListBuilder'
};
```