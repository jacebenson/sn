---
title: "MobileDomainUtil"
id: "mobiledomainutil"
---

API Name: global.MobileDomainUtil

```js
var MobileDomainUtil = Class.create();
MobileDomainUtil.prototype = {
    initialize: function() {
    },

	//check that the current user has access to more than one domain
	isMoreThanOneDomainAvailable: function() {
		var id = new GlideSession.get().getCurrentDomainID();
		return new GlideDomainSupport().getVisibleDomainSet(id).size() > 1;
	},
	
	//check that domain separation was activated
	isDomainPluginActive: function() {
		return new GlidePluginManager().isActive('com.glide.domain');
	},
	
    type: 'MobileDomainUtil'
};
```