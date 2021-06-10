---
title: "OCFormatter"
id: "ocformatter"
---

API Name: global.OCFormatter

```js
var OCFormatter = Class.create();
OCFormatter.DATE_STRIPPER = /[-: ]/g;
OCFormatter.prototype = {
    initialize: function() {
    },

	getId: function(item) {
		var start = item.start+"";
		start = start.replace(OCFormatter.DATE_STRIPPER, '');
		var end = item.end+"";
		end = end.replace(OCFormatter.DATE_STRIPPER, '');
		
		var id = item.order + "_cal_item_" +
			item.table + "_" +
			item.sys_id  + "_" + 
			(JSUtil.nil(item.roster_id) ? "" : "cmn_rota_roster_" + item.roster_id + "_") +
			start + "_" + end;
		return id;
	},

	toString: function(){
			return this.type;
	}, 
	
    type: 'OCFormatter'
};
```