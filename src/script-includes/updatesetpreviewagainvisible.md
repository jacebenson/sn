---
title: "UpdateSetPreviewAgainVisible"
id: "updatesetpreviewagainvisible"
---

API Name: global.UpdateSetPreviewAgainVisible

```js
var UpdateSetPreviewAgainVisible = Class.create();
UpdateSetPreviewAgainVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function(gr) {
		var delegatedDevAccess = SNC.UpdateSetAccessUtil.checkDelegatedDeveloperAccessToHierarchy(gr.sys_id);
		return (delegatedDevAccess && (gr.state == 'previewed' || gr.state == 'partial') &&
			gr.remote_base_update_set.nil() &&
			this._isCurrentDomainSafe() &&
			gr.canWrite());
	},

    type: 'UpdateSetPreviewAgainVisible'
});
```