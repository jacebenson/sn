---
title: "OnCallCommonDynamicFiltersSNC"
id: "oncallcommondynamicfilterssnc"
---

API Name: global.OnCallCommonDynamicFiltersSNC

```js
var OnCallCommonDynamicFiltersSNC = Class.create();
OnCallCommonDynamicFiltersSNC.prototype = {
    initialize: function() {
        this.onCallCommon = new OnCallCommon();
    },

    getManagedGroups: function() {
        return this.onCallCommon.getManagedGroups();
    },

    getMyGroups: function() {
        return this.onCallCommon.getMyGroups();
	},

	getUserGroups: function () {
		return this.onCallCommon.getUserGroups();
	},

    type: 'OnCallCommonDynamicFiltersSNC'

};
```