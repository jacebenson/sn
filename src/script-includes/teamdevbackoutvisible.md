---
title: "TeamDevBackoutVisible"
id: "teamdevbackoutvisible"
---

API Name: global.TeamDevBackoutVisible

```js
var TeamDevBackoutVisible = Class.create();
TeamDevBackoutVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function(gr) {
		return (gr.canWrite() && (gr.stage == "complete" && gr.type == "push_commit"));
	},

    type: 'TeamDevBackoutVisible'
});
```