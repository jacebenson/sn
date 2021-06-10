---
title: "SPMUtilsCoreImpl"
id: "spmutilscoreimpl"
---

API Name: global.SPMUtilsCoreImpl

```js
var SPMUtilsCoreImpl = Class.create();
SPMUtilsCoreImpl.prototype = {
    initialize: function() {
		this.SERVICE_EDITOR = 'service_editor';
		this.currentUserId = gs.getUserID();	
    },

    /* 
	 * Returns a boolean speciying in the current user is owner, delegate of the offering.
	 * Will return true even if the current user is a owner, delegate of parent service or an owner of a node in the hierarchy.
	 * Else returns false.
	 */ 
	checkOfferingAuthorization: function(offeringGR) {
		var isOwner = offeringGR.owned_by.getValue() === this.currentUserId;
		if (gs.hasRole(this.SERVICE_EDITOR) && isOwner)
			return true;
		else
			return this.checkServiceAuthorization(offeringGR.parent);
    },

	/* 
	 * Returns true if the current user is a owner, delegate of a service or an owner of a node in the hierarchy.
	 * Else returns false.
	 */ 
	checkServiceAuthorization: function(serviceGR) {
		var isOwner = serviceGR.owned_by.getValue() === this.currentUserId;
		return (gs.hasRole(this.SERVICE_EDITOR) && isOwner);
    },
	
    type: 'SPMUtilsCoreImpl'
};
```