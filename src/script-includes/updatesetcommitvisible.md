---
title: "UpdateSetCommitVisible"
id: "updatesetcommitvisible"
---

API Name: global.UpdateSetCommitVisible

```js
var UpdateSetCommitVisible = Class.create();
UpdateSetCommitVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function(gr) {
		var delegatedDevAccess = SNC.UpdateSetAccessUtil.checkDelegatedDeveloperAccessToHierarchy(gr.sys_id);
		return (delegatedDevAccess && (((gr.state == "previewed" || gr.state == "partial") &&
			gr.remote_base_update_set.nil() &&
			!GlidePreviewProblemHandler.hasUnresolvedProblems(gr.sys_id))) &&
			this._isCurrentDomainSafe());
	},

    type: 'UpdateSetCommitVisible'
});
```