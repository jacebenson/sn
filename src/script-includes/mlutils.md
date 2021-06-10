---
title: "MLUtils"
id: "mlutils"
---

API Name: global.MLUtils

```js
var MLUtils = Class.create();
MLUtils.prototype = {
    initialize: function() {
    },

    getTopDistribution: function(solution,number) {
        var sysIDs = [];
        var gr = new GlideRecord('ml_class');
		gr.addQuery('solution',solution);
		gr.orderByDesc('distribution');  
		gr.setLimit(number);  
		gr.query(); 
		var i = 0;
		while(gr.next()){
			sysIDs.push(gr.sys_id+'');
		}
		return sysIDs;
    },

    type: 'MLUtils'
};
```