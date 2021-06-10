---
title: "InteractionSecurityUtils"
id: "interactionsecurityutils"
---

API Name: global.InteractionSecurityUtils

```js
var InteractionSecurityUtils = Class.create();
InteractionSecurityUtils.prototype = {
	initialize: function() {
	},

	/*
	 * Attempts to retrieve a scope for an interaction record
	 * @param GlideRecord interactionGr the interaction record to find the scope for
	 * @return sys_id of scope OR null
	 */
	getScopeForInteraction: function(interactionGr) {
		//Check extension point first for any preference from scopes
		var extensionScope = this._getScopeForExtensions(interactionGr);
		if (extensionScope)
			return extensionScope;
		//Check AWA next
		if (GlidePluginManager.isActive('com.glide.awa')) {
			var awaScope = this._getScopeForAwaQueue(interactionGr);
			if (awaScope)
				return awaScope;
		}
	},

	/*
	 * Attempts to retrieve a scope from an extension point
	 */
	_getScopeForExtensions: function(interactionGr) {
		var extensionPoints = new GlideScriptedExtensionPoint().getExtensions('global.InteractionScope');
		for (var i = 0; i < extensionPoints.length; ++i) {
			var point = extensionPoints[i];
			if (point.applies(interactionGr)) {
				var scope = point.getScopeForInteraction(interactionGr);
				if (scope)
					return scope;
			}
		}
	},

	/*
	 * If there is an AWA queue related to the interaction, retrieve the queue's scope
	 */
	_getScopeForAwaQueue: function(interactionGr) {
		var grWorkItem = new GlideRecord('awa_work_item');
		grWorkItem.addQuery('document_id', interactionGr.getUniqueValue());
		grWorkItem.query();
		if (grWorkItem.next() && grWorkItem.getValue('queue'))
			return grWorkItem.queue.sys_scope;
		return null;
	},

	getScopeForWorkspaceUrl: function (url) {
		var workspaceStr = 'now/workspace/';
		var index = url.indexOf(workspaceStr) + workspaceStr.length;
		if (index < 0)
			return null;
		url = url.substring(index);
		url = url.substring(0, url.indexOf('/'));
		var grWorkspace = new GlideRecord('sys_aw_master_config');
		grWorkspace.addQuery('workspace_url', url);
		grWorkspace.query();
		if (grWorkspace.next())
			return grWorkspace.getValue('sys_scope');
		return null;
	},
	
	/**
	 *append to the interaction an internal transcript of the chat
	 */
	appendInternalTranscript: function(interaction_sysid, channelmetadata_document) {

		var conversation = sn_connect.Conversation.get(
			channelmetadata_document.split(':')[0],
			channelmetadata_document.split(':')[1]
		);
		conversation.updateInteractionInternalTranscript(interaction_sysid+'');
	},

	/**
	 * Attempt to retrieve an interaction via GlideRecordSecure
	 * @param String sys_id The id of the interaction to retrieve
	 * @param Boolean secure True if GlideRecordSecure should be used instead of GlideRecord
	 * @return Boolean Whether the interaction can be retrieved retrievable
	 */
	canGetInteraction: function(sys_id, secure) {
		var grInteraction;
		if (secure)
			grInteraction = new GlideRecordSecure('interaction');
		else
			grInteraction = new GlideRecord('interaction');
		return grInteraction.get(sys_id);
	},

	type: 'InteractionSecurityUtils'
};
```