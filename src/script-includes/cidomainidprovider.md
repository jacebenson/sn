---
title: "CiDomainIdProvider"
id: "cidomainidprovider"
---

API Name: global.CiDomainIdProvider

```js
var CiDomainIdProvider = Class.create();
CiDomainIdProvider.prototype = {
    initialize: function() {
    },
	
	getDomainId: function(ciId) {
		ciId = String(ciId);
		var domain = "";
		
		if (!ciId || ciId === "-1") {
			var ds = new GlideDomainSupport();
			domain = ds.getCurrentDomainValueOrGlobal();

		} else {
			var bsManager = new SNC.BusinessServiceManager();
			domain = bsManager.getBusinessServiceDomain(ciId);
		}
	
		return String(domain);
	},

    type: 'CiDomainIdProvider'
};
```