---
title: "getVariablesReferenceQualifier"
id: "getvariablesreferencequalifier"
---

API Name: global.getVariablesReferenceQualifier

```js
var getVariablesReferenceQualifier = Class.create();
getVariablesReferenceQualifier.prototype = {
    initialize: function() {
    },
	getIds: function(item){
        var setIds = [];
		var gr = new GlideRecord("io_set_item");
		gr.addActiveQuery();
		gr.addQuery("sc_cat_item", item);
		gr.addQuery("variable_set.type", "one_to_one");
		gr.query();
		while (gr.next())
			   setIds.push(gr.getValue("variable_set"));
		var typeIds = ['1','2','3','4','5','6','7','8','9','10','13','16','18','21','22','23','25', '26', '27', '28', '29'];
		var result = 'variable_setIN'+setIds+'^typeIN'+typeIds+'^NQcat_item='+item+'^typeIN'+typeIds;
		return result;
    },
    type: 'getVariablesReferenceQualifier'
};
```