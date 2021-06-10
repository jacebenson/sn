---
title: "ParseURL"
id: "parseurl"
---

API Name: global.ParseURL

```js
var ParseURL = Class.create();
ParseURL.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	parseURL: function() {
		var str=this.getParameter('rowId');
		var tableName = this.getParameter('table');
		gs.log(str);
		if (str != null && str.startsWith("__ENC__")){
			str = GlideStringUtil.base64Decode(str.substring("__ENC__".length));
			gs.log('sw_debug '+ str);
			str = str.substring(0, 32);
			gs.log('sw_debug '+ str);
		}
		//get the ciId
		if(tableName){
			gs.log('sw_debug table name input'+ tableName);
			var value;
			var gr = new GlideRecord(tableName);
			value= 'sys_id';
			
		}
		else{
			gs.log('sw_debug default table name'+ tableName);
			var gr = new GlideRecord('svc_ci_assoc');
			value = 'ci_id';
		}
		gr.addQuery('sys_id', str);
		gr.query();
		while(gr.hasNext()) {
			gr.next();
			if (gr.canRead()) {
				gs.log('sw_debug return val ' + gr.getValue('ci_id'));
				return gr.getValue(value);
			}
		}
	},

	_privateFunction: function() { // this function is not client callable

}

});

```