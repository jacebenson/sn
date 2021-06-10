---
title: "RelatedListChoice"
id: "relatedlistchoice"
---

API Name: global.RelatedListChoice

```js
var RelatedListChoice = Class.create();
RelatedListChoice.prototype = {
    initialize: function(/*sys_id sys_ui_policy*/ policy) {
		var policyGR = new GlideRecord('sys_ui_policy');
		policyGR.addQuery('sys_id',policy);
		policyGR.query();
		policyGR.next();
		
		this.policy = policyGR;
    },
	
	getLists : function() {		
		var SRL = new GlideSysRelatedList(this.policy.getValue('table'));
		if (this.policy.getValue('global') == '0')
			SRL.setView(this.policy.getValue('view'));
		
		return SRL.getRelatedListBucket(false);
		
	},

    type: 'RelatedListChoice'
};
```