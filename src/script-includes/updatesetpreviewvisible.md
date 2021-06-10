---
title: "UpdateSetPreviewVisible"
id: "updatesetpreviewvisible"
---

API Name: global.UpdateSetPreviewVisible

```js
var UpdateSetPreviewVisible = Class.create();
UpdateSetPreviewVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function(gr) {
		var delegatedDevAccess = SNC.UpdateSetAccessUtil.checkDelegatedDeveloperAccessToHierarchy(gr.sys_id);
		return (delegatedDevAccess && (gr.state == 'loaded' || gr.state == 'backedout') &&
			gr.remote_base_update_set.nil() &&
			this._isCurrentDomainSafe() &&
			gr.canWrite());
	},

    type: 'UpdateSetPreviewVisible'
});
```