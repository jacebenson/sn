---
title: "ConversionRequestUtil"
id: "conversionrequestutil"
---

API Name: global.ConversionRequestUtil

```js
var ConversionRequestUtil = Class.create();
ConversionRequestUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	convertToPDFAsync : function() {
		var sysId = this.getParameter("sysparm_sysid");
		var conversionResp = new sn_docviewer.DocumentConversionOnDemand().convertToPDFAsync(sysId);
		var response = this.newItem('result');
		for(var i in conversionResp) {
			response.setAttribute(i, conversionResp[i]);
		}
	},

	getConversionStatus : function() {
		var reqId = this.getParameter("sysparm_reqId");
		var statusResp = new sn_docviewer.DocumentConversionOnDemand().getConversionStatus(reqId);
		var response = this.newItem('result');
		for(var i in statusResp) {
			response.setAttribute(i, statusResp[i]);
		}
	},

    type: 'ConversionRequestUtil'
});
```