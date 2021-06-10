---
title: "UpdateSetHierarchyPreviewAgainVisible"
id: "updatesethierarchypreviewagainvisible"
---

API Name: global.UpdateSetHierarchyPreviewAgainVisible

```js
var UpdateSetHierarchyPreviewAgainVisible = Class.create();
UpdateSetHierarchyPreviewAgainVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function(gr) {
		return ((gr.state == 'previewed' || gr.state == 'partial') && 
			gr.remote_base_update_set == gr.sys_id && 
			this._isCurrentDomainSafe() &&
			gr.canWrite() &&
			SNC.UpdateSetAccessUtil.checkDelegatedDeveloperAccessToHierarchy(gr.sys_id));
	},

    type: 'UpdateSetHierarchyPreviewAgainVisible'
});
```